const { generateUUIDFromURL } = require("../functions/functions");
const { query, getClient } = require("./db_service");
const { embed } = require("./embedding_service");
const { uploadPoints } = require("./qdrant_service");

const BATCH_SIZE = 500; // batch size
const PARALLEL_BATCHES = 2; // parallel batches
const PROCESS_CHUNK_SIZE = 2000; // Process pages in smaller chunks

async function getPagesBatch(offset, limit) {
  console.log(`Fetching pages ${offset} - ${offset + limit - 1}`);

  const result = await query(`
    SELECT 
      p.id, 
      p.qdrant_id,
      p.url, 
      p.title, 
      p.status_code,
      COALESCE(outlinks.out_links, 0) as out_links,
      COALESCE(inlinks.in_links, 0) as in_links
    FROM pages p
    LEFT JOIN (
      SELECT 
        from_page_id, 
        COUNT(*) as out_links 
      FROM links 
      GROUP BY from_page_id
    ) outlinks ON p.id = outlinks.from_page_id
    LEFT JOIN (
      SELECT 
        to_url, 
        COUNT(*) as in_links 
      FROM links 
      GROUP BY to_url
    ) inlinks ON p.url = inlinks.to_url
    WHERE p.status_code = 200
    ORDER BY p.id 
    LIMIT $1 OFFSET $2
  `, [limit, offset]);

  console.log(`Fetched ${result.rows.length} pages`);
  
  // Check and update any pages with null qdrant_id
  await ensureQdrantIdsForBatch(result.rows);
  
  return result.rows;
}

// Check and update qdrant_id for pages in a batch that have null values
async function ensureQdrantIdsForBatch(pages) {
  const pagesToUpdate = pages.filter(page => !page.qdrant_id);
  
  if (pagesToUpdate.length === 0) {
    return;
  }
  
  console.log(`Updating qdrant_id for ${pagesToUpdate.length} pages in batch...`);
  
  const client = await getClient();
  
  try {
    await client.query("BEGIN");
    
    for (const page of pagesToUpdate) {
      const qdrantId = generateUUIDFromURL(page.url);
      await client.query(
        "UPDATE pages SET qdrant_id = $1 WHERE id = $2",
        [qdrantId, page.id]
      );
      // Update the page object with the new qdrant_id
      page.qdrant_id = qdrantId;
    }
    
    await client.query("COMMIT");
    console.log(`Updated qdrant_id for ${pagesToUpdate.length} pages in batch`);
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Failed to update qdrant_ids for batch:", error);
    throw error;
  } finally {
    client.release();
  }
}

// Function to get page content from the database
async function getPageContent(pageId) {
  // Since content is now stored in Qdrant, we need to fetch it from there
  // or if you have content stored elsewhere, adjust this query
  const result = await query(`
    SELECT content, meta_description 
    FROM page_content 
    WHERE page_id = $1
  `, [pageId]);
  
  if (result.rows.length > 0) {
    return {
      content: result.rows[0].content || '',
      meta_description: result.rows[0].meta_description || ''
    };
  }
  
  return { content: '', meta_description: '' };
}

async function processEmbeddingsForBatch(pages) {
  const embeddings = [];

  for (const page of pages) {
    try {
      // Get content for this page (adjust based on where you store content)
      const { content, meta_description } = await getPageContent(page.id);
      
      const textToEmbed = `${page.title || ""} ${meta_description || ""} ${content || ""}`.trim();

      if (textToEmbed) {
        const embedding = await embed(textToEmbed);
        
        embeddings.push({
          id: page.qdrant_id, // This will now always be set
          vector: embedding,
          payload: {
            page_id: page.id,
            url: page.url,
            title: page.title || '',
            content: content || '',
            description: meta_description || '',
            status: page.status_code,
            out_links: page.out_links,
            in_links: page.in_links,
          },
        });
      }
    } catch (error) {
      console.error(`Failed to generate embedding for page ${page.id}:`, error);
    }
  }

  return embeddings;
}

async function indexPagesToQdrant() {
  console.log("Starting Qdrant indexing from PostgreSQL...");

  const countResult = await query("SELECT COUNT(*) as count FROM pages WHERE status_code = 200");
  const totalPages = parseInt(countResult.rows[0].count);

  console.log(`Total pages to index: ${totalPages}`);
  console.log(`Using ${PARALLEL_BATCHES} parallel batch(es)`);
  console.log(`Processing in chunks of ${PROCESS_CHUNK_SIZE} pages to manage memory`);

  let totalIndexedCount = 0;

  // Process pages in chunks to avoid memory issues
  for (let chunkStart = 0; chunkStart < totalPages; chunkStart += PROCESS_CHUNK_SIZE) {
    const chunkEnd = Math.min(chunkStart + PROCESS_CHUNK_SIZE, totalPages);
    console.log(`\nProcessing chunk: pages ${chunkStart} - ${chunkEnd - 1}`);

    // Process batches within this chunk
    for (let offset = chunkStart; offset < chunkEnd; offset += BATCH_SIZE * PARALLEL_BATCHES) {
      const currentBatchPromises = [];

      // Create parallel batch promises
      for (let i = 0; i < PARALLEL_BATCHES && offset + i * BATCH_SIZE < chunkEnd; i++) {
        const batchOffset = offset + i * BATCH_SIZE;
        const batchLimit = Math.min(BATCH_SIZE, chunkEnd - batchOffset);

        currentBatchPromises.push(
          getPagesBatch(batchOffset, batchLimit).then(processEmbeddingsForBatch)
        );
      }

      // Wait for all batches to complete
      const embeddingResults = await Promise.all(currentBatchPromises);

      // Flatten and upload embeddings to Qdrant
      const allEmbeddings = embeddingResults.flat();
      if (allEmbeddings.length > 0) {
        await uploadPoints(allEmbeddings);
        totalIndexedCount += allEmbeddings.length;
        console.log(`Indexed ${totalIndexedCount}/${totalPages} pages to Qdrant...`);
      }
    }

    // Force garbage collection if available
    if (global.gc) {
      global.gc();
      console.log("Garbage collection triggered");
    }
  }

  console.log(`\nQdrant indexing complete! Total indexed pages: ${totalIndexedCount}`);
}

// Utility function to update qdrant_id for existing pages
async function updateQdrantIds() {
  console.log("Updating qdrant_id for existing pages...");
  
  const result = await query("SELECT id, url FROM pages WHERE qdrant_id IS NULL");
  const pages = result.rows;
  
  console.log(`Found ${pages.length} pages without qdrant_id`);
  
  const client = await getClient();
  
  try {
    await client.query("BEGIN");
    
    for (const page of pages) {
      const qdrantId = generateUUIDFromURL(page.url);
      await client.query(
        "UPDATE pages SET qdrant_id = $1 WHERE id = $2",
        [qdrantId, page.id]
      );
    }
    
    await client.query("COMMIT");
    console.log(`Updated qdrant_id for ${pages.length} pages`);
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Failed to update qdrant_ids:", error);
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  generateUUIDFromURL,
  indexPagesToQdrant,
  updateQdrantIds,
  ensureQdrantIdsForBatch,
};

// Run if called directly
if (require.main === module) {
  // Start indexing directly - qdrant_ids will be created on-the-fly as needed
  indexPagesToQdrant()
    .then(() => {
      console.log("Qdrant indexing completed successfully");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Qdrant indexing failed:", error);
      process.exit(1);
    });
}