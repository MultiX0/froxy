const { smartTokenize } = require("../functions/functions");
const { query } = require("./db_service");

const resultCache = new Map(); 
const CACHE_TTL = 60 * 60 * 1000; // 1 hour
const MAX_CACHE_SIZE = 10000;

/**
 *  (Edited) Skip all the fancy scoring, just get results FAST
 */
async function searchUseQueryFast(searchQuery, options = {}) {
  const {
    limit = 10,
    minScore = 0,
    fuzzyMatch = false,
    fields = ["content"],
    includeSnippets = false, // DEFAULT OFF for speed
    boost = {},
  } = options;

  try {
    const startTime = Date.now();
    const queryTerms = smartTokenize(searchQuery);

    if (queryTerms.length === 0) {
      return { results: [], metadata: { query: searchQuery, totalResults: 0, searchTime: 0, terms: [] } };
    }

    // Go with Single query that does EVERYTHING
    const fieldFilter = fields.length > 0 ? fields : ["content"];
    let fastQuery, fastParams;

    if (fuzzyMatch) {
      const fuzzyConditions = queryTerms.map((_, index) => `t.term ILIKE $${index + 3}`);
      fastQuery = `
        WITH ranked_pages AS (
          SELECT 
            p.id, p.url, p.title, p.meta_description,
            ${includeSnippets ? 'p.main_content,' : ''}
            SUM(tpi.tf_idf * COALESCE($2::jsonb ->> tpi.field, '1')::float) as total_score,
            COUNT(DISTINCT t.term) as term_matches,
            array_agg(DISTINCT t.term) as matched_terms
          FROM terms t
          JOIN term_page_index tpi ON t.id = tpi.term_id
          JOIN pages p ON tpi.page_id = p.id
          WHERE (${fuzzyConditions.join(" OR ")}) 
            AND tpi.field = ANY($1)
            AND tpi.tf_idf > 0.001
          GROUP BY p.id, p.url, p.title, p.meta_description ${includeSnippets ? ', p.main_content' : ''}
          ORDER BY total_score DESC, term_matches DESC
          LIMIT $${queryTerms.length + 3}
        )
        SELECT * FROM ranked_pages WHERE total_score >= $${queryTerms.length + 4}
      `;
      fastParams = [
        fieldFilter, 
        JSON.stringify(boost),
        ...queryTerms.map(term => `%${term}%`),
        limit * 3,
        minScore
      ];
    } else {
      fastQuery = `
        WITH ranked_pages AS (
          SELECT 
            p.id, p.url, p.title, p.meta_description,
            ${includeSnippets ? 'p.main_content,' : ''}
            SUM(tpi.tf_idf * COALESCE($3::jsonb ->> tpi.field, '1')::float) as total_score,
            COUNT(DISTINCT t.term) as term_matches,
            array_agg(DISTINCT t.term) as matched_terms
          FROM terms t
          JOIN term_page_index tpi ON t.id = tpi.term_id
          JOIN pages p ON tpi.page_id = p.id
          WHERE t.term = ANY($1) 
            AND tpi.field = ANY($2)
            AND tpi.tf_idf > 0.001
          GROUP BY p.id, p.url, p.title, p.meta_description ${includeSnippets ? ', p.main_content' : ''}
          ORDER BY total_score DESC, term_matches DESC
          LIMIT $4
        )
        SELECT * FROM ranked_pages WHERE total_score >= $5
      `;
      fastParams = [
        queryTerms,
        fieldFilter,
        JSON.stringify(boost),
        limit * 2,
        minScore
      ];
    }

    const result = await query(fastQuery, fastParams);
    const dbTime = Date.now() - startTime;

    // Minimal post-processing
    const searchResults = result.rows.slice(0, limit).map(row => ({
      id: row.id,
      title: row.title || "Untitled",
      description: row.meta_description || "",
      url: row.url || "",
      score: Math.round(row.total_score * 10000) / 10000,
      matchedTerms: row.matched_terms || [],
      termCoverage: Math.round((row.term_matches / queryTerms.length) * 100),
      ...(includeSnippets && row.main_content ? {
        snippet: generateSnippetUltraFast(row.main_content, row.matched_terms)
      } : {})
    }));

    const searchTime = Date.now() - startTime;
    console.log(`FAST search completed in ${searchTime}ms (DB: ${dbTime}ms) - ${searchResults.length} results`);

    return {
      results: searchResults,
      metadata: {
        query: searchQuery,
        totalResults: searchResults.length,
        searchTime,
        terms: [...new Set(result.rows.flatMap(r => r.matched_terms || []))],
        queryTerms,
        dbTime,
      },
    };
  } catch (error) {
    console.error("Fast search error:", error);
    throw new Error(`Search failed: ${error.message}`);
  }
}

/**
 * no highlighting, just extract
 */
function generateSnippetUltraFast(content, matchedTerms, maxLength = 150) {
  if (!content) return "";
  
  // Find first term occurrence
  const lowerContent = content.toLowerCase();
  let bestIndex = 0;
  
  for (const term of matchedTerms || []) {
    const index = lowerContent.indexOf(term.toLowerCase());
    if (index !== -1) {
      bestIndex = Math.max(0, index - 30);
      break;
    }
  }
  
  let snippet = content.substring(bestIndex, bestIndex + maxLength);
  if (bestIndex > 0) snippet = "..." + snippet;
  if (bestIndex + maxLength < content.length) snippet += "...";
  
  return snippet;
}

/**
 * CACHE: Cache entire search results
 */
async function ultraFastSearch(searchQuery, options = {}) {
  // Generate simple cache key
  const cacheKey = `${searchQuery}:${options.limit || 10}:${options.fuzzyMatch || false}:${(options.fields || ["content"]).join(",")}`;
  
  // Check cache first
  if (resultCache.has(cacheKey)) {
    const cached = resultCache.get(cacheKey);
    if (Date.now() - cached.timestamp < CACHE_TTL) {
      console.log("CACHED result");
      return cached.data;
    }
  }
  
  // Execute search
  const results = await searchUseQueryFast(searchQuery, options);
  
  // Cache management - keep only recent results
  if (resultCache.size >= MAX_CACHE_SIZE) {
    const oldestKeys = Array.from(resultCache.keys()).slice(0, 1000);
    oldestKeys.forEach(key => resultCache.delete(key));
  }
  
  // Cache the result
  resultCache.set(cacheKey, {
    data: results,
    timestamp: Date.now(),
  });
  
  return results;
}


async function searchAPI(req, res) {
  try {
    const {
      q: searchQuery,
      limit = 10,
      min_score = 0,
      fuzzy = false,
      fields,
      snippets = false, // DEFAULT OFF
    } = req.query;

    if (!searchQuery?.trim()) {
      return res.status(400).json({ error: "Query required" });
    }

    const results = await ultraFastSearch(searchQuery.trim(), {
      limit: Math.min(parseInt(limit), 50),
      minScore: parseFloat(min_score),
      fuzzyMatch: fuzzy === "true",
      fields: fields ? fields.split(",") : ["content"],
      includeSnippets: snippets === "true",
    });

    res.json(results);
  } catch (error) {
    console.error("API error:", error);
    res.status(500).json({ error: "Search failed" });
  }
}

const searchUseQuery = ultraFastSearch;

module.exports = {
  searchUseQuery,
  searchAPI,
  ultraFastSearch,
};