const { QdrantClient } = require("@qdrant/js-client-rest");

const qdrantUrl = 'http://qdrant:6333'
const QDRANT_API_KEY = process.env.QDRANT_API_KEY;

const qdrant = new QdrantClient({
  url: qdrantUrl,
  apiKey: QDRANT_API_KEY,
  checkCompatibility: false,
});

const COLLECTION_NAME = "page_content_embeddings";
const VECTOR_SIZE = 384;

async function qdrantInit() {
  try {
    // Check if collection exists
    const collections = await qdrant.getCollections();
    const exists = collections.collections.some(
      (c) => c.name === COLLECTION_NAME
    );

    if (!exists) {
      await qdrant.createCollection(COLLECTION_NAME, {
        vectors: {
          size: VECTOR_SIZE,
          distance: "Cosine",
          on_disk: false,
        },
      });
      console.log(`✅ Created collection "${COLLECTION_NAME}"`);
    } else {
      console.log(`ℹ️ Collection "${COLLECTION_NAME}" already exists`);
    }
  } catch (err) {
    console.error("❌ Error initializing Qdrant collection:", err);
    throw err;
  }
}

async function uploadPoints(points = []) {
  try {
    const payload = {
      points, // array of { id, vector, payload? }
    };

    await qdrant.upsert(COLLECTION_NAME, payload);
    console.log(
      `✅ Uploaded ${points.length} point(s) to "${COLLECTION_NAME}"`
    );
  } catch (err) {
    console.error("❌ Failed to upload points:", err);
    throw err;
  }
}

async function searchPoints(vector, score_threshold = 0.2, limit = 100) {
  try {
    // more results to have sorting options
    const searchLimit = Math.min(limit * 2, 500);

    const results = await qdrant.search(COLLECTION_NAME, {
      vector: vector,
      with_payload: true,
      limit: searchLimit,
      score_threshold: score_threshold,
      offset: 0,
      filter: {
        must: [{ key: "status", match: { value: 200 } }],
      },
    });

    // only sort if scores are close (within 2% difference)
    const sorted = results.sort((a, b) => {
      const scoreDiff = Math.abs(a.score - b.score);
      const maxScore = Math.max(a.score, b.score);

      // if scores are very close, use link authority as tiebreaker
      if (scoreDiff / maxScore < 0.02) {
        const aLinks =
          (a.payload?.in_links || 0) * 2 + (a.payload?.out_links || 0);
        const bLinks =
          (b.payload?.in_links || 0) * 2 + (b.payload?.out_links || 0);
        return bLinks - aLinks;
      }

      return b.score - a.score;
    });

    return sorted.slice(0, limit);
  } catch (error) {
    console.log(error);
    throw error;
  }
}
qdrantInit();

module.exports = {
  qdrantInit,
  uploadPoints,
  searchPoints,
};
