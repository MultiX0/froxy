const { smartTokenize } = require("../functions/functions");
const { query } = require("./db_service");
const natural = require('natural');
const pluralize = require('pluralize');


// this cache is temp soultion , we may implement redis in the future

const resultCache = new Map(); 
const termCache = new Map(); // Cache for term lookups
const fuzzyTermCache = new Map(); // Cache for fuzzy term variations

const CACHE_TTL = 60 * 60 * 1000; // 1 hour
const TERM_CACHE_TTL = 6 * 60 * 60 * 1000; // 6 hours (terms change less frequently)
const MAX_CACHE_SIZE = 10000;
const MAX_TERM_CACHE_SIZE = 50000;

/**
 * Generate fuzzy term variations more efficiently
 */
function generateFuzzyTerms(term) {
  // Check cache first
  if (fuzzyTermCache.has(term)) {
    const cached = fuzzyTermCache.get(term);
    if (Date.now() - cached.timestamp < TERM_CACHE_TTL) {
      return cached.variations;
    }
  }

  
  const variations = new Set([term.toLowerCase()]);
  
  // Stemming for different word forms
  variations.add(natural.PorterStemmer.stem(term));
  
  // Handle plurals/singulars
  variations.add(pluralize.singular(term));
  variations.add(pluralize.plural(term));
  
  const uniqueVariations = [...new Set(variations)];
  
  // Cache the result
  if (fuzzyTermCache.size >= MAX_TERM_CACHE_SIZE) {
    // Clear oldest 1000 entries
    const oldestKeys = Array.from(fuzzyTermCache.keys()).slice(0, 1000);
    oldestKeys.forEach(key => fuzzyTermCache.delete(key));
  }
  
  fuzzyTermCache.set(term, {
    variations: uniqueVariations,
    timestamp: Date.now()
  });
  
  return uniqueVariations;
}

/**
 * Cache and resolve term IDs efficiently
 */
async function getTermIds(terms, fuzzyMatch = false) {
  const termCacheKey = `${terms.join('|')}:${fuzzyMatch}`;
  
  // Check cache first
  if (termCache.has(termCacheKey)) {
    const cached = termCache.get(termCacheKey);
    if (Date.now() - cached.timestamp < TERM_CACHE_TTL) {
      return cached.data;
    }
  }
  
  let finalTerms = terms;
  
  if (fuzzyMatch) {
    // Generate fuzzy variations for all terms
    const allFuzzyTerms = [];
    for (const term of terms) {
      const variations = generateFuzzyTerms(term);
      allFuzzyTerms.push(...variations);
    }
    finalTerms = [...new Set(allFuzzyTerms)];
  }
  
  // Query database for term IDs
  const termQuery = `
    SELECT id, term FROM terms 
    WHERE term = ANY($1)
  `;
  
  const termResult = await query(termQuery, [finalTerms]);
  const termData = {
    termIds: termResult.rows.map(r => r.id),
    foundTerms: termResult.rows.map(r => r.term),
    searchedTerms: finalTerms
  };
  
  // Cache the result
  if (termCache.size >= MAX_TERM_CACHE_SIZE) {
    const oldestKeys = Array.from(termCache.keys()).slice(0, 1000);
    oldestKeys.forEach(key => termCache.delete(key));
  }
  
  termCache.set(termCacheKey, {
    data: termData,
    timestamp: Date.now()
  });
  
  return termData;
}

/**
 *  Skip all the fancy scoring, just get results FAST with cached terms
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

    // Get term IDs from cache or database
    const termData = await getTermIds(queryTerms, fuzzyMatch);
    const termLookupTime = Date.now() - startTime;
    
    if (termData.termIds.length === 0) {
      return { 
        results: [], 
        metadata: { 
          query: searchQuery, 
          totalResults: 0, 
          searchTime: Date.now() - startTime, 
          terms: [],
          termLookupTime 
        } 
      };
    }

    // Build query using term IDs instead of term matching
    const fieldFilter = fields.length > 0 ? fields : ["content"];
    
    const fastQuery = `
      WITH ranked_pages AS (
        SELECT 
          p.id, p.url, p.title, p.meta_description,
          ${includeSnippets ? 'p.main_content,' : ''}
          SUM(tpi.tf_idf * COALESCE($3::jsonb ->> tpi.field, '1')::float) as total_score,
          COUNT(DISTINCT tpi.term_id) as term_matches,
          array_agg(DISTINCT t.term) as matched_terms
        FROM term_page_index tpi
        JOIN pages p ON tpi.page_id = p.id
        JOIN terms t ON tpi.term_id = t.id
        WHERE tpi.term_id = ANY($1) 
          AND tpi.field = ANY($2)
          AND tpi.tf_idf > 0.001
        GROUP BY p.id, p.url, p.title, p.meta_description ${includeSnippets ? ', p.main_content' : ''}
        ORDER BY total_score DESC, term_matches DESC
        LIMIT $4
      )
      SELECT * FROM ranked_pages WHERE total_score >= $5
    `;
    
    const fastParams = [
      termData.termIds,
      fieldFilter,
      JSON.stringify(boost),
      limit * 2,
      minScore
    ];

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
    console.log(`FAST search completed in ${searchTime}ms (DB: ${dbTime}ms, Terms: ${termLookupTime}ms) - ${searchResults.length} results`);

    return {
      results: searchResults,
      metadata: {
        query: searchQuery,
        totalResults: searchResults.length,
        searchTime,
        terms: [...new Set(result.rows.flatMap(r => r.matched_terms || []))],
        queryTerms,
        dbTime,
        termLookupTime,
        cachedTerms: termData.foundTerms.length,
      },
    };
  } catch (error) {
    console.error("Fast search error:", error);
    throw new Error(`Search failed: ${error.message}`);
  }
}

/**
 * faster fuzzy using cached term lookup + PostgreSQL's built-in text search
 */
async function searchUseQueryFastFTS(searchQuery, options = {}) {
  const {
    limit = 10,
    minScore = 0,
    fuzzyMatch = false,
    fields = ["content"],
    includeSnippets = false,
    boost = {},
  } = options;

  try {
    const startTime = Date.now();
    const queryTerms = smartTokenize(searchQuery);

    if (queryTerms.length === 0) {
      return { results: [], metadata: { query: searchQuery, totalResults: 0, searchTime: 0, terms: [] } };
    }

    const fieldFilter = fields.length > 0 ? fields : ["content"];
    let fastQuery, fastParams;

    if (fuzzyMatch) {
      // Use cached term lookup with similarity for better performance
      const termData = await getTermIds(queryTerms, true);
      const termLookupTime = Date.now() - startTime;
      
      if (termData.termIds.length === 0) {
        return { 
          results: [], 
          metadata: { 
            query: searchQuery, 
            totalResults: 0, 
            searchTime: Date.now() - startTime, 
            terms: [],
            termLookupTime 
          } 
        };
      }

      // Use term IDs directly instead of similarity matching
      fastQuery = `
        WITH ranked_pages AS (
          SELECT 
            p.id, p.url, p.title, p.meta_description,
            ${includeSnippets ? 'p.main_content,' : ''}
            SUM(tpi.tf_idf * COALESCE($3::jsonb ->> tpi.field, '1')::float) as total_score,
            COUNT(DISTINCT tpi.term_id) as term_matches,
            array_agg(DISTINCT t.term) as matched_terms
          FROM term_page_index tpi
          JOIN pages p ON tpi.page_id = p.id
          JOIN terms t ON tpi.term_id = t.id
          WHERE tpi.term_id = ANY($1)
            AND tpi.field = ANY($2)
            AND tpi.tf_idf > 0.001
          GROUP BY p.id, p.url, p.title, p.meta_description ${includeSnippets ? ', p.main_content' : ''}
          ORDER BY total_score DESC, term_matches DESC
          LIMIT $4
        )
        SELECT * FROM ranked_pages WHERE total_score >= $5
      `;
      fastParams = [
        termData.termIds,
        fieldFilter,
        JSON.stringify(boost),
        limit * 2,
        minScore
      ];
    } else {
      // Regular exact search with cached terms
      const termData = await getTermIds(queryTerms, false);
      const termLookupTime = Date.now() - startTime;
      
      if (termData.termIds.length === 0) {
        return { 
          results: [], 
          metadata: { 
            query: searchQuery, 
            totalResults: 0, 
            searchTime: Date.now() - startTime, 
            terms: [],
            termLookupTime 
          } 
        };
      }

      fastQuery = `
        WITH ranked_pages AS (
          SELECT 
            p.id, p.url, p.title, p.meta_description,
            ${includeSnippets ? 'p.main_content,' : ''}
            SUM(tpi.tf_idf * COALESCE($3::jsonb ->> tpi.field, '1')::float) as total_score,
            COUNT(DISTINCT tpi.term_id) as term_matches,
            array_agg(DISTINCT t.term) as matched_terms
          FROM term_page_index tpi
          JOIN pages p ON tpi.page_id = p.id
          JOIN terms t ON tpi.term_id = t.id
          WHERE tpi.term_id = ANY($1) 
            AND tpi.field = ANY($2)
            AND tpi.tf_idf > 0.001
          GROUP BY p.id, p.url, p.title, p.meta_description ${includeSnippets ? ', p.main_content' : ''}
          ORDER BY total_score DESC, term_matches DESC
          LIMIT $4
        )
        SELECT * FROM ranked_pages WHERE total_score >= $5
      `;
      fastParams = [
        termData.termIds,
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
    console.log(`FAST-FTS search completed in ${searchTime}ms (DB: ${dbTime}ms) - ${searchResults.length} results`);

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
    console.error("Fast-FTS search error:", error);
    // Fallback to regular search if FTS fails
    return searchUseQueryFast(searchQuery, options);
  }
}

/**
 * no highlighting
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
 * CACHE: Cache entire search results with better cache key including term variations
 */
async function ultraFastSearch(searchQuery, options = {}) {
  // Generate cache key that includes fuzzy term variations for better hit rate
  const baseKey = `${searchQuery}:${options.limit || 10}:${options.fuzzyMatch || false}:${(options.fields || ["content"]).join(",")}`;
  let cacheKey = baseKey;
  
  // For fuzzy searches, include the actual resolved terms in cache key for better accuracy
  if (options.fuzzyMatch) {
    const queryTerms = smartTokenize(searchQuery);
    const fuzzyVariations = queryTerms.flatMap(term => generateFuzzyTerms(term));
    cacheKey = `${baseKey}:${fuzzyVariations.join(',')}`;
  }
  
  // Check cache first
  if (resultCache.has(cacheKey)) {
    const cached = resultCache.get(cacheKey);
    if (Date.now() - cached.timestamp < CACHE_TTL) {
      console.log("CACHED result");
      return cached.data;
    }
  }
  
  // Execute search with cached terms
  const results = options.fuzzyMatch 
    ? await searchUseQueryFastFTS(searchQuery, options)
    : await searchUseQueryFast(searchQuery, options);
  
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

/**
 * Clear caches when needed
 */
function clearCaches(cacheType = 'all') {
  switch(cacheType) {
    case 'results':
      resultCache.clear();
      console.log('Result cache cleared');
      break;
    case 'terms':
      termCache.clear();
      fuzzyTermCache.clear();
      console.log('Term caches cleared');
      break;
    case 'all':
    default:
      resultCache.clear();
      termCache.clear();
      fuzzyTermCache.clear();
      console.log('All caches cleared');
      break;
  }
}

/**
 * Get cache stats for monitoring
 */
function getCacheStats() {
  return {
    resultCache: {
      size: resultCache.size,
      maxSize: MAX_CACHE_SIZE,
      usage: Math.round((resultCache.size / MAX_CACHE_SIZE) * 100)
    },
    termCache: {
      size: termCache.size,
      maxSize: MAX_TERM_CACHE_SIZE,
      usage: Math.round((termCache.size / MAX_TERM_CACHE_SIZE) * 100)
    },
    fuzzyTermCache: {
      size: fuzzyTermCache.size,
      maxSize: MAX_TERM_CACHE_SIZE,
      usage: Math.round((fuzzyTermCache.size / MAX_TERM_CACHE_SIZE) * 100)
    }
  };
}

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
  
  // Choose search method: Try FTS first for fuzzy, fallback to regular
  const results = options.fuzzyMatch 
    ? await searchUseQueryFastFTS(searchQuery, options)
    : await searchUseQueryFast(searchQuery, options);
  
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
  clearCaches,
  getCacheStats,
  getTermIds,
};