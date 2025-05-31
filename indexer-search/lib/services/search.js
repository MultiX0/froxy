const { smartTokenize } = require("../functions/functions");
const { query } = require("./db_service");

const termCache = new Map();
const CACHE_TTL = 5 * 60 * 1000;

/**
 * search function with aggregated TF-IDF scoring
 * @param {string} query - The search query
 * @param {Object} options - Search options
 * @param {number} options.limit - Maximum number of results to return (default: 10)
 * @param {number} options.minScore - Minimum TF-IDF score threshold (default: 0)
 * @param {boolean} options.fuzzyMatch - Enable fuzzy matching for terms (default: false)
 * @param {string[]} options.fields - Fields to search in (default: ['content'])
 * @returns {Promise<Object>} Search results with metadata
 */

/**
 * Cached version for repeated queries
 */
async function cachedSearchUseQuery(searchQuery, options = {}) {
  const cacheKey = `search:${searchQuery}:${JSON.stringify(options)}`;

  if (termCache.has(cacheKey)) {
    const cached = termCache.get(cacheKey);
    if (Date.now() - cached.timestamp < CACHE_TTL) {
      console.log("💾 Returning cached results");
      return cached.data;
    }
    termCache.delete(cacheKey);
  }

  const results = await searchUseQuery(searchQuery, options);

  termCache.set(cacheKey, {
    data: results,
    timestamp: Date.now(),
  });

  return results;
}

async function searchUseQuery(searchQuery, options = {}) {
  const {
    limit = 10,
    minScore = 0,
    fuzzyMatch = false,
    fields = ["content"],
    includeSnippets = true,
    boost = {},
  } = options;

  try {
    console.log(`Searching for: "${searchQuery}"`);
    const startTime = Date.now();

    const queryTerms = smartTokenize(searchQuery);
    console.log(`Query terms: [${queryTerms.join(", ")}]`);

    if (queryTerms.length === 0) {
      return {
        results: [],
        metadata: {
          query: searchQuery,
          totalResults: 0,
          searchTime: 0,
          terms: [],
        },
      };
    }

    // Find matching terms
    let termQuery;
    let termParams;

    if (fuzzyMatch) {
      // Use ILIKE for fuzzy matching
      const fuzzyConditions = queryTerms.map(
        (_, index) => `term ILIKE $${index + 1}`
      );
      termQuery = `SELECT id, term FROM terms WHERE ${fuzzyConditions.join(
        " OR "
      )}`;
      termParams = queryTerms.map((term) => `%${term}%`);
    } else {
      // Exact matching using ANY
      termQuery = "SELECT id, term FROM terms WHERE term = ANY($1)";
      termParams = [queryTerms];
    }

    const matchingTermsResult = await query(termQuery, termParams);
    const matchingTerms = matchingTermsResult.rows;

    if (!matchingTerms || matchingTerms.length === 0) {
      console.log("No matching terms found");
      return {
        results: [],
        metadata: {
          query: searchQuery,
          totalResults: 0,
          searchTime: Date.now() - startTime,
          terms: [],
          message: "No matching terms found",
        },
      };
    }

    console.log(`Found ${matchingTerms.length} matching terms`);

    // Get term-page index data
    const termIds = matchingTerms.map((t) => t.id);
    const fieldFilter = fields.length > 0 ? fields : ["content"];

    const termPageResult = await query(
      `
      SELECT term_id, page_id, term_frequency, tf_idf, field 
      FROM term_page_index 
      WHERE term_id = ANY($1) AND field = ANY($2)
    `,
      [termIds, fieldFilter]
    );

    const termPageData = termPageResult.rows;

    if (!termPageData || termPageData.length === 0) {
      console.log("No indexed pages found for terms");
      return {
        results: [],
        metadata: {
          query: searchQuery,
          totalResults: 0,
          searchTime: Date.now() - startTime,
          terms: matchingTerms.map((t) => t.term),
          message: "No indexed pages found",
        },
      };
    }

    // Calculate page scores
    const pageScores = new Map();
    const pageTermMatches = new Map();
    const termLookup = new Map(matchingTerms.map((t) => [t.id, t.term]));

    for (const entry of termPageData) {
      const { page_id, term_id, tf_idf, field, term_frequency } = entry;
      const pageId = parseInt(page_id);
      const termName = termLookup.get(parseInt(term_id));

      // Apply field boosting
      const fieldBoost = boost[field] || 1.0;
      const boostedScore = parseFloat(tf_idf) * fieldBoost;

      // Initialize page data if needed
      if (!pageScores.has(pageId)) {
        pageScores.set(pageId, {
          totalScore: 0,
          termCount: 0,
          termDetails: new Map(),
          maxScore: 0,
        });
      }

      const pageData = pageScores.get(pageId);
      pageData.totalScore += boostedScore;
      pageData.termCount += 1;
      pageData.maxScore = Math.max(pageData.maxScore, boostedScore);

      // Track term details
      if (!pageData.termDetails.has(termName)) {
        pageData.termDetails.set(termName, {
          frequency: 0,
          score: 0,
          fields: [],
        });
      }

      const termDetail = pageData.termDetails.get(termName);
      termDetail.frequency += parseInt(term_frequency);
      termDetail.score += boostedScore;
      termDetail.fields.push(field);

      // Track matched terms per page
      if (!pageTermMatches.has(pageId)) {
        pageTermMatches.set(pageId, new Set());
      }
      pageTermMatches.get(pageId).add(termName);
    }

    // Score and rank pages
    const scoredPages = [];

    for (const [pageId, scoreData] of pageScores) {
      const matchedTerms = pageTermMatches.get(pageId);
      const termCoverage = matchedTerms.size / queryTerms.length;

      // Calculate final score with coverage bonus
      const avgScore = scoreData.totalScore / scoreData.termCount;
      const coverageBonus = termCoverage * 0.5;
      const finalScore = avgScore + coverageBonus;

      if (finalScore >= minScore) {
        scoredPages.push({
          pageId,
          score: finalScore,
          rawScore: scoreData.totalScore,
          avgScore,
          maxScore: scoreData.maxScore,
          termCount: scoreData.termCount,
          termCoverage,
          matchedTerms: Array.from(matchedTerms),
          termDetails: Object.fromEntries(
            Array.from(scoreData.termDetails.entries()).map(
              ([term, details]) => [
                term,
                {
                  ...details,
                  fields: [...new Set(details.fields)],
                },
              ]
            )
          ),
        });
      }
    }

    // Sort by score and limit results
    scoredPages.sort((a, b) => b.score - a.score);
    const topPages = scoredPages.slice(0, limit);

    if (topPages.length === 0) {
      console.log("No pages meet the minimum score threshold");
      return {
        results: [],
        metadata: {
          query: searchQuery,
          totalResults: 0,
          searchTime: Date.now() - startTime,
          terms: matchingTerms.map((t) => t.term),
          message: "No pages meet minimum score threshold",
        },
      };
    }

    // Get page details
    const pageIds = topPages.map((p) => p.pageId);
    const selectFields = includeSnippets
      ? "id, url, title, meta_description, main_content as content"
      : "id, url, title, meta_description";

    const pageDetailsResult = await query(
      `
      SELECT ${selectFields} FROM pages WHERE id = ANY($1)
    `,
      [pageIds]
    );

    const pageDetails = pageDetailsResult.rows;

    // Build final results
    const pageDetailsMap = new Map(pageDetails.map((p) => [p.id, p]));
    const searchResults = [];

    for (const scoredPage of topPages) {
      const pageDetail = pageDetailsMap.get(scoredPage.pageId);
      if (!pageDetail) continue;

      const result = {
        id: pageDetail.id,
        title: pageDetail.title || "Untitled",
        description: pageDetail.meta_description || "",
        url: pageDetail.url || "",
        score: Math.round(scoredPage.score * 10000) / 10000,
        matchedTerms: scoredPage.matchedTerms,
        termCoverage: Math.round(scoredPage.termCoverage * 100),
        debugging: {
          rawScore: scoredPage.rawScore,
          avgScore: scoredPage.avgScore,
          maxScore: scoredPage.maxScore,
          termCount: scoredPage.termCount,
          termDetails: scoredPage.termDetails,
        },
      };

      // Add snippet if requested
      if (includeSnippets && pageDetail.content) {
        result.snippet = generateSnippet(
          pageDetail.content,
          scoredPage.matchedTerms
        );
      }

      searchResults.push(result);
    }

    const searchTime = Date.now() - startTime;
    console.log(
      `Search completed in ${searchTime}ms - ${searchResults.length} results`
    );

    return {
      results: searchResults,
      metadata: {
        query: searchQuery,
        totalResults: searchResults.length,
        totalMatches: scoredPages.length,
        searchTime,
        terms: matchingTerms.map((t) => t.term),
        queryTerms,
        options: {
          limit,
          minScore,
          fuzzyMatch,
          fields,
        },
      },
    };
  } catch (error) {
    console.error("Search error:", error);
    throw new Error(`Search failed: ${error.message}`);
  }
}

/**
 * Generate a snippet from content highlighting matched terms
 * @param {string} content - The full content
 * @param {string[]} matchedTerms - Terms to highlight
 * @param {number} maxLength - Maximum snippet length
 * @returns {string} Generated snippet with highlights
 */
function generateSnippet(content, matchedTerms, maxLength = 200) {
  if (!content || matchedTerms.length === 0) return "";

  const lowerContent = content.toLowerCase();
  const lowerTerms = matchedTerms.map((t) => t.toLowerCase());

  // Find the best position to start the snippet
  let bestIndex = -1;
  let bestTerm = "";

  for (const term of lowerTerms) {
    const index = lowerContent.indexOf(term);
    if (index !== -1 && (bestIndex === -1 || index < bestIndex)) {
      bestIndex = index;
      bestTerm = term;
    }
  }

  if (bestIndex === -1) {
    // No terms found, return beginning of content
    return (
      content.substring(0, maxLength) +
      (content.length > maxLength ? "..." : "")
    );
  }

  // Create snippet around the found term
  const start = Math.max(0, bestIndex - 50);
  const end = Math.min(content.length, start + maxLength);
  let snippet = content.substring(start, end);

  // Add ellipsis if truncated
  if (start > 0) snippet = "..." + snippet;
  if (end < content.length) snippet = snippet + "...";

  // Highlight matched terms
  for (const term of lowerTerms) {
    const regex = new RegExp(`(${term})`, "gi");
    snippet = snippet.replace(regex, "**$1**");
  }

  return snippet;
}

/**
 * Wrapper function for easy API integration
 */
async function searchAPI(req, res) {
  try {
    const {
      q: searchQuery,
      limit = 10,
      page = 1,
      min_score = 0,
      fuzzy = false,
      fields,
      snippets = true,
    } = req.query;

    if (!searchQuery || searchQuery.trim().length === 0) {
      return res.status(400).json({
        error: "Query parameter 'q' is required",
      });
    }

    const searchFields = fields ? fields.split(",") : ["content"];

    const results = await cachedSearchUseQuery(searchQuery.trim(), {
      limit: parseInt(limit),
      minScore: parseFloat(min_score),
      fuzzyMatch: fuzzy === "true",
      fields: searchFields,
      page: page,
      includeSnippets: snippets === "true",
    });

    res.json(results);
  } catch (error) {
    console.error("API Search error:", error);
    res.status(500).json({
      error: "Search failed",
      message: error.message,
    });
  }
}

module.exports = {
  searchUseQuery,
  searchAPI,
};
