const { smartTokenize } = require("../functions/functions");
const { query, getClient } = require("./db_service");

const BATCH_SIZE = 500; // batch size
const PARALLEL_BATCHES = 2; // parallel batches
const PARALLEL_UPSERTS = 100; // concurrent upserts
const PROCESS_CHUNK_SIZE = 2000; // Process pages in smaller chunks

// Create the term_page_index table
async function createTermPageIndexTable() {
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS term_page_index (
      id SERIAL PRIMARY KEY,
      term_id INTEGER NOT NULL REFERENCES terms(id) ON DELETE CASCADE,
      page_id INTEGER NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
      term_frequency INTEGER NOT NULL DEFAULT 0,
      tf_idf DECIMAL(10,6) NOT NULL DEFAULT 0,
      field VARCHAR(50) NOT NULL DEFAULT 'content',
      created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT term_page_index_unique UNIQUE (term_id, page_id, field)
    );
    
    -- Create indexes for better performance
    CREATE INDEX IF NOT EXISTS idx_term_page_index_term_id ON term_page_index(term_id);
    CREATE INDEX IF NOT EXISTS idx_term_page_index_page_id ON term_page_index(page_id);
    CREATE INDEX IF NOT EXISTS idx_term_page_index_tf_idf ON term_page_index(tf_idf DESC);
  `;
  
  await query(createTableQuery);
  console.log("term_page_index table created/verified");
}

async function getPagesBatch(offset, limit) {
  console.log(`Fetching pages ${offset} - ${offset + limit - 1}`);

  const result = await query(
    "SELECT id, title, meta_description, content FROM pages ORDER BY id LIMIT $1 OFFSET $2",
    [limit, offset]
  );

  console.log(`Fetched ${result.rows.length} pages`);
  return result.rows;
}

async function getOrCreateTermId(term, termCache) {
  if (termCache.has(term)) return termCache.get(term);

  try {
    // Try to get existing term
    const existingResult = await query("SELECT id FROM terms WHERE term = $1", [term]);

    if (existingResult.rows.length > 0) {
      const termId = existingResult.rows[0].id;
      termCache.set(term, termId);
      return termId;
    }

    // Insert new term
    const insertResult = await query(
      "INSERT INTO terms (term) VALUES ($1) RETURNING id",
      [term]
    );

    const termId = insertResult.rows[0].id;
    termCache.set(term, termId);
    return termId;
  } catch (error) {
    // Handle potential race condition with UPSERT
    if (error.code === "23505") {
      // unique_violation
      const retryResult = await query("SELECT id FROM terms WHERE term = $1", [term]);
      if (retryResult.rows.length > 0) {
        const termId = retryResult.rows[0].id;
        termCache.set(term, termId);
        return termId;
      }
    }

    console.error(`Failed to insert term "${term}":`, error);
    return null;
  }
}

// Process a batch of pages and return their term frequencies
async function processPagesTokenization(pages) {
  const batchTermFrequencies = new Map();
  const batchDocumentFrequency = new Map();

  for (const page of pages) {
    const tokens = smartTokenize(
      `${page.title || ""} ${page.meta_description || ""} ${page.content || ""}`
    );
    const tf = new Map();

    // Count term frequencies
    for (const term of tokens) {
      tf.set(term, (tf.get(term) || 0) + 1);
    }

    batchTermFrequencies.set(page.id, tf);

    // Track document frequency
    for (const [term] of tf) {
      if (!batchDocumentFrequency.has(term)) {
        batchDocumentFrequency.set(term, new Set());
      }
      batchDocumentFrequency.get(term).add(page.id);
    }
  }

  return { batchTermFrequencies, batchDocumentFrequency };
}

// Get global document frequencies for terms
async function getGlobalDocumentFrequencies(terms, totalPages) {
  const globalDF = new Map();
  
  // Process terms in batches to avoid large IN clauses
  const termBatchSize = 1000;
  for (let i = 0; i < terms.length; i += termBatchSize) {
    const termBatch = terms.slice(i, i + termBatchSize);
    const placeholders = termBatch.map((_, idx) => `$${idx + 1}`).join(',');
    
    const result = await query(`
      SELECT t.term, COUNT(DISTINCT tpi.page_id) as doc_count
      FROM terms t 
      LEFT JOIN term_page_index tpi ON t.id = tpi.term_id
      WHERE t.term IN (${placeholders})
      GROUP BY t.term
    `, termBatch);
    
    for (const row of result.rows) {
      globalDF.set(row.term, parseInt(row.doc_count) || 0);
    }
  }
  
  return globalDF;
}

// Process database upserts with transaction batching
async function processUpsertsInParallel(upsertTasks, concurrency = PARALLEL_UPSERTS) {
  let indexedCount = 0;
  const client = await getClient();
  
  try {
    for (let i = 0; i < upsertTasks.length; i += concurrency) {
      const batch = upsertTasks.slice(i, i + concurrency);

      await client.query('BEGIN');
      
      try {
        const results = await Promise.allSettled(
          batch.map(async (task) => {
            const { term, pageId, termFreq, tfIdf, termCache } = task;

            const termId = await getOrCreateTermId(term, termCache);
            if (!termId) return { success: false, term, pageId };

            await client.query(
              `INSERT INTO term_page_index (term_id, page_id, term_frequency, field, tf_idf)
               VALUES ($1, $2, $3, $4, $5)
               ON CONFLICT (term_id, page_id, field) 
               DO UPDATE SET 
                 term_frequency = EXCLUDED.term_frequency,
                 tf_idf = EXCLUDED.tf_idf`,
              [termId, parseInt(pageId), termFreq, "content", tfIdf]
            );

            return { success: true, term, pageId };
          })
        );

        await client.query('COMMIT');

        const successful = results.filter(
          (r) => r.status === "fulfilled" && r.value.success
        ).length;
        indexedCount += successful;

        if (indexedCount % 1000 === 0 || i + concurrency >= upsertTasks.length) {
          console.log(`Indexed ${indexedCount} term-page combinations...`);
        }
      } catch (error) {
        await client.query('ROLLBACK');
        console.error('Batch upsert failed:', error);
      }
    }
  } finally {
    client.release();
  }

  return indexedCount;
}

async function calculateTfIdfInBatches() {
  console.log("Starting memory-optimized TF-IDF calculation...");

  // Create the table first
  await createTermPageIndexTable();

  const countResult = await query("SELECT COUNT(*) as count FROM pages");
  const totalPages = parseInt(countResult.rows[0].count);

  console.log(`Total pages to index: ${totalPages}`);
  console.log(`Using ${PARALLEL_BATCHES} parallel batch(es) and ${PARALLEL_UPSERTS} concurrent upserts`);
  console.log(`Processing in chunks of ${PROCESS_CHUNK_SIZE} pages to manage memory`);

  const termCache = new Map();
  let totalIndexedCount = 0;

  // Process pages in chunks to avoid memory issues
  for (let chunkStart = 0; chunkStart < totalPages; chunkStart += PROCESS_CHUNK_SIZE) {
    const chunkEnd = Math.min(chunkStart + PROCESS_CHUNK_SIZE, totalPages);
    console.log(`\nProcessing chunk: pages ${chunkStart} - ${chunkEnd - 1}`);

    const chunkTermFrequencies = new Map();
    const chunkDocumentFrequency = new Map();

    // Step 1: Fetch and tokenize pages in this chunk
    console.log("Phase 1: Tokenizing chunk pages...");
    
    for (let offset = chunkStart; offset < chunkEnd; offset += BATCH_SIZE * PARALLEL_BATCHES) {
      const currentBatchPromises = [];

      for (let i = 0; i < PARALLEL_BATCHES && offset + i * BATCH_SIZE < chunkEnd; i++) {
        const batchOffset = offset + i * BATCH_SIZE;
        const batchLimit = Math.min(BATCH_SIZE, chunkEnd - batchOffset);

        currentBatchPromises.push(
          getPagesBatch(batchOffset, batchLimit).then(processPagesTokenization)
        );
      }

      const batchResults = await Promise.all(currentBatchPromises);

      // Merge results from parallel batches
      for (const { batchTermFrequencies, batchDocumentFrequency } of batchResults) {
        // Merge term frequencies
        for (const [pageId, tf] of batchTermFrequencies) {
          chunkTermFrequencies.set(pageId, tf);
        }

        // Merge document frequencies
        for (const [term, pageSet] of batchDocumentFrequency) {
          if (!chunkDocumentFrequency.has(term)) {
            chunkDocumentFrequency.set(term, new Set());
          }
          for (const pageId of pageSet) {
            chunkDocumentFrequency.get(term).add(pageId);
          }
        }
      }
    }

    // Step 2: Get all unique terms from this chunk
    const chunkTerms = Array.from(chunkDocumentFrequency.keys());
    console.log(`Phase 2: Getting global document frequencies for ${chunkTerms.length} unique terms...`);
    
    // Get global document frequencies (considering all pages processed so far)
    const globalDF = await getGlobalDocumentFrequencies(chunkTerms, totalPages);

    // Step 3: Calculate TF-IDF and prepare upsert tasks for this chunk
    console.log("Phase 3: Calculating TF-IDF scores for chunk...");
    const upsertTasks = [];

    for (const [pageId, tf] of chunkTermFrequencies) {
      for (const [term, termFreq] of tf) {
        // Use global document frequency if available, else use chunk frequency
        const df = globalDF.get(term) || chunkDocumentFrequency.get(term)?.size || 1;
        const idf = Math.log(totalPages / Math.max(df, 1));
        const tfIdf = termFreq * idf;

        upsertTasks.push({ term, pageId, termFreq, tfIdf, termCache });
      }
    }

    console.log(`Prepared ${upsertTasks.length} upsert tasks for this chunk`);

    // Step 4: Process upserts for this chunk
    console.log("Phase 4: Upserting chunk to database...");
    const chunkIndexedCount = await processUpsertsInParallel(upsertTasks);
    totalIndexedCount += chunkIndexedCount;

    console.log(`Chunk complete! Indexed ${chunkIndexedCount} entries (Total: ${totalIndexedCount})`);
    
    // Clear chunk data to free memory
    chunkTermFrequencies.clear();
    chunkDocumentFrequency.clear();
    
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
      console.log("Garbage collection triggered");
    }
  }

  console.log(`\n Memory-optimized TF-IDF indexing complete! Total indexed entries: ${totalIndexedCount}`);
}

module.exports = {
  calculateTfIdfInBatches,
  createTermPageIndexTable
};

// Run if called directly
if (require.main === module) {
  calculateTfIdfInBatches()
    .then(() => {
      console.log("TF-IDF calculation completed successfully");
      process.exit(0);
    })
    .catch((error) => {
      console.error("TF-IDF calculation failed:", error);
      process.exit(1);
    });
}
