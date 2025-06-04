const { embed } = require("./embedding_service");
const { searchPoints } = require("./qdrant_service");

async function searchAPI(req, res) {
  try {
    const {
      q: searchQuery,
      limit = 100,
      min_score = 0.3,
    } = req.query;

    if (!searchQuery?.trim()) {
      return res.status(400).json({ error: "Query required" });
    }

    const embeddedVector = await embed(searchQuery);
    const startTime = Date.now();
    const results = await searchPoints(embeddedVector,min_score,limit);
    const resultsMap = results.map((res)=>{
      return {
        id: res.id,
        title: res.payload.title,
        description: res.payload.description,
        url: res.payload.url,
        score: (res.score * results.length * 100),
      };
    });

    res.json({
      results: resultsMap, 
      metadata: { 
        query: searchQuery, 
        totalResults: results.length, 
        searchTime: Date.now() - startTime, 
        terms: [],
        termLookupTime: null, 
      } 
    });
  } catch (error) {
    console.error("API error:", error);
    res.status(500).json({ error: "Search failed" });
  }
}



module.exports = {
  searchAPI,
};