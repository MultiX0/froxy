const { smartTokenize } = require("../functions/functions");
const { query } = require("./db_service");

const BATCH_SIZE = 1000;
const PARALLEL_BATCHES = 4; // Number of page batches to process in parallel
const PARALLEL_UPSERTS = 250; // Number of concurrent database upserts

async function getPagesBatch(offset, limit) {
  console.log(`Fetching pages ${offset} - ${offset + limit - 1}`);

  const result = await query(
    "SELECT id, title, meta_description, main_content as content FROM pages ORDER BY id LIMIT $1 OFFSET $2",
    [limit, offset]
  );

  console.log(`Fetched ${result.rows.length} pages`);
  return result.rows;
}

async function getOrCreateTermId(term, termCache) {
  if (termCache.has(term)) return termCache.get(term);

  try {
    // Try to get existing term
    const existingResult = await query("SELECT id FROM terms WHERE term = $1", [
      term,
    ]);

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
      const retryResult = await query("SELECT id FROM terms WHERE term = $1", [
        term,
      ]);
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
async function processUpsertsInParallel(
  upsertTasks,
  concurrency = PARALLEL_UPSERTS
) {
  let indexedCount = 0;

  for (let i = 0; i < upsertTasks.length; i += concurrency) {
    const batch = upsertTasks.slice(i, i + concurrency);

    const results = await Promise.allSettled(
      batch.map(async (task) => {
        const { term, pageId, termFreq, tfIdf, termCache } = task;

        const termId = await getOrCreateTermId(term, termCache);
        if (!termId) return { success: false, term, pageId };

        try {
          await query(
            `
          INSERT INTO term_page_index (term_id, page_id, term_frequency, field, tf_idf)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (term_id, page_id, field) 
          DO UPDATE SET 
            term_frequency = EXCLUDED.term_frequency,
            tf_idf = EXCLUDED.tf_idf
        `,
            [termId, parseInt(pageId), termFreq, "content", tfIdf]
          );

          return { success: true, term, pageId };
        } catch (error) {
          console.error(
            `Error upserting term "${term}" for page ${pageId}:`,
            error
          );
          return { success: false, term, pageId, error };
        }
      })
    );

    const successful = results.filter(
      (r) => r.status === "fulfilled" && r.value.success
    ).length;
    indexedCount += successful;

    if (indexedCount % 1000 === 0 || i + concurrency >= upsertTasks.length) {
      console.log(`Indexed ${indexedCount} term-page combinations...`);
    }
  }

  return indexedCount;
}

async function calculateTfIdfInBatches() {
  console.log("Starting parallelized TF-IDF calculation...");

  const countResult = await query("SELECT COUNT(*) as count FROM pages");
  const totalPages = parseInt(countResult.rows[0].count);

  console.log(`Total pages to index: ${totalPages}`);
  console.log(
    `⚡ Using ${PARALLEL_BATCHES} parallel batch(es) and ${PARALLEL_UPSERTS} concurrent upserts`
  );

  const termCache = new Map();
  const globalDocumentFrequency = new Map();
  const globalTermFrequencies = new Map();

  // Step 1: Fetch and tokenize pages in parallel batches
  console.log("Phase 1: Tokenizing pages in parallel...");

  for (
    let offset = 0;
    offset < totalPages;
    offset += BATCH_SIZE * PARALLEL_BATCHES
  ) {
    const currentBatchPromises = [];

    for (
      let i = 0;
      i < PARALLEL_BATCHES && offset + i * BATCH_SIZE < totalPages;
      i++
    ) {
      const batchOffset = offset + i * BATCH_SIZE;
      const batchLimit = Math.min(BATCH_SIZE, totalPages - batchOffset);

      currentBatchPromises.push(
        getPagesBatch(batchOffset, batchLimit).then(processPagesTokenization)
      );
    }

    const batchResults = await Promise.all(currentBatchPromises);

    // Merge results from parallel batches
    for (const {
      batchTermFrequencies,
      batchDocumentFrequency,
    } of batchResults) {
      // Merge term frequencies
      for (const [pageId, tf] of batchTermFrequencies) {
        globalTermFrequencies.set(pageId, tf);
      }

      // Merge document frequencies
      mergeDocumentFrequencies(globalDocumentFrequency, batchDocumentFrequency);
    }
  }

  // Step 2: Calculate TF-IDF and prepare upsert tasks
  console.log("Phase 2: Calculating TF-IDF scores...");
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
        termCache,
      });
    }
  }

  console.log(`Prepared ${upsertTasks.length} upsert tasks`);

  // Step 3: Process upserts in parallel
  console.log("Phase 3: Upserting to database in parallel...");
  const indexedCount = await processUpsertsInParallel(upsertTasks);

  console.log(
    `Parallelized TF-IDF indexing complete! Total indexed entries: ${indexedCount}`
  );
}

module.exports = {
  calculateTfIdfInBatches,
};
