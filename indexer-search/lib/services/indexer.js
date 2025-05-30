const { smartTokenize } = require('../functions/functions');
const { supabase } = require('./supabase_service');

const BATCH_SIZE = 1000;
const PARALLEL_BATCHES = 4; // Number of page batches to process in parallel
const PARALLEL_UPSERTS = 100; // Number of concurrent database upserts

async function getPagesBatch(offset, limit) {
  console.log(`Fetching pages ${offset} - ${offset + limit - 1}`);
  const { data, error } = await supabase
    .from('pages')
    .select('id, title, meta_description, content')
    .range(offset, offset + limit - 1);

  if (error) {
    console.error(`Error fetching pages at offset ${offset}:`, error);
    throw error;
  }

  console.log(`Fetched ${data.length} pages`);
  return data;
}

async function getOrCreateTermId(term, termCache) {
  if (termCache.has(term)) return termCache.get(term);

  const { data: existing, error } = await supabase
    .from('terms')
    .select('id')
    .eq('term', term)
    .single();

  if (existing) {
    termCache.set(term, existing.id);
    return existing.id;
  }

  const { data: inserted, error: insertError } = await supabase
    .from('terms')
    .insert({ term })
    .select('id')
    .single();

  if (insertError) {
    console.error(`Failed to insert term "${term}":`, insertError);
    return null;
  }

  termCache.set(term, inserted.id);
  return inserted.id;
}

// Process a batch of pages and return their term frequencies
async function processPagesTokenization(pages) {
  const batchTermFrequencies = new Map();
  const batchDocumentFrequency = new Map();

  for (const page of pages) {
    const tokens = smartTokenize(`${page.title || ''} ${page.meta_description || ''} ${page.content || ''}`);
    const tf = new Map();

    for (const term of tokens) {
      tf.set(term, (tf.get(term) || 0) + 1);
    }

    batchTermFrequencies.set(page.id, tf);

    for (const [term] of tf) {
      if (!batchDocumentFrequency.has(term)) {
        batchDocumentFrequency.set(term, new Set());
      }
      batchDocumentFrequency.get(term).add(page.id);
    }
  }

  return { batchTermFrequencies, batchDocumentFrequency };
}

// Merge document frequencies from multiple batches
function mergeDocumentFrequencies(globalDF, batchDF) {
  for (const [term, pageSet] of batchDF) {
    if (!globalDF.has(term)) {
      globalDF.set(term, new Set());
    }
    for (const pageId of pageSet) {
      globalDF.get(term).add(pageId);
    }
  }
}

// Process database upserts in parallel with concurrency limit
async function processUpsertsInParallel(upsertTasks, concurrency = PARALLEL_UPSERTS) {
  let indexedCount = 0;
  
  for (let i = 0; i < upsertTasks.length; i += concurrency) {
    const batch = upsertTasks.slice(i, i + concurrency);
    
    const results = await Promise.allSettled(batch.map(async (task) => {
      const { term, pageId, termFreq, tfIdf, termCache } = task;
      
      const termId = await getOrCreateTermId(term, termCache);
      if (!termId) return { success: false, term, pageId };

      const { error } = await supabase
        .from('term_page_index')
        .upsert({
          term_id: termId,
          page_id: parseInt(pageId),
          frequency: termFreq,
          field: 'content',
          tf_idf: tfIdf,
        }, {
          onConflict: 'term_id,page_id',
        });

      if (error) {
        console.error(`Error upserting term "${term}" for page ${pageId}:`, error);
        return { success: false, term, pageId, error };
      }
      
      return { success: true, term, pageId };
    }));

    const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
    indexedCount += successful;
    
    if (indexedCount % 1000 === 0 || i + concurrency >= upsertTasks.length) {
      console.log(`Indexed ${indexedCount} term-page combinations...`);
    }
  }
  
  return indexedCount;
}

async function calculateTfIdfInBatches() {
  console.log('Starting parallelized TF-IDF calculation...');

  const { count, error: countError } = await supabase
    .from('pages')
    .select('*', { count: 'exact', head: true });

  if (countError) {
    console.error('Error counting pages:', countError);
    return;
  }

  const totalPages = count;
  console.log(`Total pages to index: ${totalPages}`);
  console.log(`⚡ Using ${PARALLEL_BATCHES} parallel batch(es) and ${PARALLEL_UPSERTS} concurrent upserts`);

  const termCache = new Map();
  const globalDocumentFrequency = new Map();
  const globalTermFrequencies = new Map();

  // Step 1: Fetch and tokenize pages in parallel batches
  console.log('Phase 1: Tokenizing pages in parallel...');
  const batchPromises = [];
  
  for (let offset = 0; offset < totalPages; offset += BATCH_SIZE * PARALLEL_BATCHES) {
    const currentBatchPromises = [];
    
    for (let i = 0; i < PARALLEL_BATCHES && offset + (i * BATCH_SIZE) < totalPages; i++) {
      const batchOffset = offset + (i * BATCH_SIZE);
      const batchLimit = Math.min(BATCH_SIZE, totalPages - batchOffset);
      
      currentBatchPromises.push(
        getPagesBatch(batchOffset, batchLimit).then(processPagesTokenization)
      );
    }
    
    const batchResults = await Promise.all(currentBatchPromises);
    
    // Merge results from parallel batches
    for (const { batchTermFrequencies, batchDocumentFrequency } of batchResults) {
      // Merge term frequencies
      for (const [pageId, tf] of batchTermFrequencies) {
        globalTermFrequencies.set(pageId, tf);
      }
      
      // Merge document frequencies
      mergeDocumentFrequencies(globalDocumentFrequency, batchDocumentFrequency);
    }
  }

  // Step 2: Calculate TF-IDF and prepare upsert tasks
  console.log('Phase 2: Calculating TF-IDF scores...');
  const upsertTasks = [];

  for (const [pageId, tf] of globalTermFrequencies) {
    for (const [term, termFreq] of tf) {
      const df = globalDocumentFrequency.get(term).size;
      const idf = Math.log(totalPages / df);
      const tfIdf = termFreq * idf;

      upsertTasks.push({
        term,
        pageId,
        termFreq,
        tfIdf,
        termCache
      });
    }
  }

  console.log(`Prepared ${upsertTasks.length} upsert tasks`);

  // Step 3: Process upserts in parallel
  console.log('Phase 3: Upserting to database in parallel...');
  const indexedCount = await processUpsertsInParallel(upsertTasks);

  console.log(`Parallelized TF-IDF indexing complete! Total indexed entries: ${indexedCount}`);
}


module.exports = {
    calculateTfIdfInBatches
}