const { smartTokenize } = require("../functions/functions");
const { supabase } = require("./supabase_service");



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
async function cachedSearchUseQuery(query, options = {}) {
    const cacheKey = `search:${query}:${JSON.stringify(options)}`;
    
    
    if (termCache.has(cacheKey)) {
      const cached = termCache.get(cacheKey);
      if (Date.now() - cached.timestamp < CACHE_TTL) {
        console.log('💾 Returning cached results');
        return cached.data;
      }
      termCache.delete(cacheKey);
    }
    
    
    const results = await searchUseQuery(query, options);
    
    
    termCache.set(cacheKey, {
      data: results,
      timestamp: Date.now()
    });
    
    return results;
  }
  
async function searchUseQuery(query, options = {}) {
  const {
    limit = 10,
    minScore = 0,
    fuzzyMatch = false,
    fields = ['content'],
    includeSnippets = true,
    boost = {}  
  } = options;

  try {
    console.log(`Searching for: "${query}"`);
    const startTime = Date.now();


    
    const queryTerms = smartTokenize(query);
    console.log(`Query terms: [${queryTerms.join(', ')}]`);

    if (queryTerms.length === 0) {
      return {
        results: [],
        metadata: {
          query,
          totalResults: 0,
          searchTime: 0,
          terms: []
        }
      };
    }

    
    let termQuery = supabase.from("terms").select("id, term");
    
    if (fuzzyMatch) {
      
      const fuzzyConditions = queryTerms.map(term => `term.ilike.%${term}%`);
      termQuery = termQuery.or(fuzzyConditions.join(','));
    } else {
      
      termQuery = termQuery.in("term", queryTerms);
    }

    const { data: matchingTerms, error: termsError } = await termQuery;
    
    if (termsError) throw termsError;

    if (!matchingTerms || matchingTerms.length === 0) {
      console.log("No matching terms found");
      return {
        results: [],
        metadata: {
          query,
          totalResults: 0,
          searchTime: Date.now() - startTime,
          terms: [],
          message: "No matching terms found"
        }
      };
    }

    console.log(`Found ${matchingTerms.length} matching terms`);

    
    const termIds = matchingTerms.map(t => t.id);
    const fieldFilter = fields.length > 0 ? fields : ['content'];

    const { data: termPageData, error: indexError } = await supabase
      .from("term_page_index")
      .select("term_id, page_id, frequency, tf_idf, field")
      .in("term_id", termIds)
      .in("field", fieldFilter);

    if (indexError) throw indexError;

    if (!termPageData || termPageData.length === 0) {
      console.log("No indexed pages found for terms");
      return {
        results: [],
        metadata: {
          query,
          totalResults: 0,
          searchTime: Date.now() - startTime,
          terms: matchingTerms.map(t => t.term),
          message: "No indexed pages found"
        }
      };
    }

    
    const pageScores = new Map();
    const pageTermMatches = new Map(); 
    const termLookup = new Map(matchingTerms.map(t => [t.id, t.term]));

    for (const entry of termPageData) {
      const { page_id, term_id, tf_idf, field, frequency } = entry;
      const pageId = parseInt(page_id);
      const termName = termLookup.get(term_id);
      
      
      const fieldBoost = boost[field] || 1.0;
      const boostedScore = tf_idf * fieldBoost;
      
      
      if (!pageScores.has(pageId)) {
        pageScores.set(pageId, {
          totalScore: 0,
          termCount: 0,
          termDetails: new Map(),
          maxScore: 0
        });
      }
      
      const pageData = pageScores.get(pageId);
      pageData.totalScore += boostedScore;
      pageData.termCount += 1;
      pageData.maxScore = Math.max(pageData.maxScore, boostedScore);
      
      
      if (!pageData.termDetails.has(termName)) {
        pageData.termDetails.set(termName, {
          frequency: 0,
          score: 0,
          fields: []
        });
      }
      
      const termDetail = pageData.termDetails.get(termName);
      termDetail.frequency += frequency;
      termDetail.score += boostedScore;
      termDetail.fields.push(field);
      
      
      if (!pageTermMatches.has(pageId)) {
        pageTermMatches.set(pageId, new Set());
      }
      pageTermMatches.get(pageId).add(termName);
    }

    
    const scoredPages = [];
    
    for (const [pageId, scoreData] of pageScores) {
      const matchedTerms = pageTermMatches.get(pageId);
      const termCoverage = matchedTerms.size / queryTerms.length;
      
      
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
            Array.from(scoreData.termDetails.entries()).map(([term, details]) => [
              term, 
              {
                ...details,
                fields: [...new Set(details.fields)] 
              }
            ])
          )
        });
      }
    }

    
    scoredPages.sort((a, b) => b.score - a.score);
    const topPages = scoredPages.slice(0, limit);
    
    if (topPages.length === 0) {
      console.log("No pages meet the minimum score threshold");
      return {
        results: [],
        metadata: {
          query,
          totalResults: 0,
          searchTime: Date.now() - startTime,
          terms: matchingTerms.map(t => t.term),
          message: "No pages meet minimum score threshold"
        }
      };
    }

    
    const pageIds = topPages.map(p => p.pageId);
    const selectFields = includeSnippets ? 
      "id, url, title, meta_description, content" : 
      "id, url, title, meta_description";

    const { data: pageDetails, error: pagesError } = await supabase
      .from("pages")
      .select(selectFields)
      .in('id', pageIds);

    if (pagesError) throw pagesError;

    
    const pageDetailsMap = new Map(pageDetails.map(p => [p.id, p]));
    const searchResults = [];

    for (const scoredPage of topPages) {
      const pageDetail = pageDetailsMap.get(scoredPage.pageId);
      if (!pageDetail) continue;

      const result = {
        id: pageDetail.id,
        title: pageDetail.title || 'Untitled',
        description: pageDetail.meta_description || '',
        url: pageDetail.url || '',
        score: Math.round(scoredPage.score * 10000) / 10000, 
        matchedTerms: scoredPage.matchedTerms,
        termCoverage: Math.round(scoredPage.termCoverage * 100), 
        debugging: {
          rawScore: scoredPage.rawScore,
          avgScore: scoredPage.avgScore,
          maxScore: scoredPage.maxScore,
          termCount: scoredPage.termCount,
          termDetails: scoredPage.termDetails
        }
      };

      
      if (includeSnippets && pageDetail.content) {
        result.snippet = generateSnippet(pageDetail.content, scoredPage.matchedTerms);
      }

      searchResults.push(result);
    }

    const searchTime = Date.now() - startTime;
    console.log(`Search completed in ${searchTime}ms - ${searchResults.length} results`);

    return {
      results: searchResults,
      metadata: {
        query,
        totalResults: searchResults.length,
        totalMatches: scoredPages.length,
        searchTime,
        terms: matchingTerms.map(t => t.term),
        queryTerms,
        options: {
          limit,
          minScore,
          fuzzyMatch,
          fields
        }
      }
    };

  } catch (error) {
    console.error('Search error:', error);
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
  if (!content || matchedTerms.length === 0) return '';
  
  const lowerContent = content.toLowerCase();
  const lowerTerms = matchedTerms.map(t => t.toLowerCase());
  
  
  let bestIndex = -1;
  let bestTerm = '';
  
  for (const term of lowerTerms) {
    const index = lowerContent.indexOf(term);
    if (index !== -1 && (bestIndex === -1 || index < bestIndex)) {
      bestIndex = index;
      bestTerm = term;
    }
  }
  
  if (bestIndex === -1) {
    
    return content.substring(0, maxLength) + (content.length > maxLength ? '...' : '');
  }
  
  
  const start = Math.max(0, bestIndex - 50);
  const end = Math.min(content.length, start + maxLength);
  let snippet = content.substring(start, end);
  
  
  if (start > 0) snippet = '...' + snippet;
  if (end < content.length) snippet = snippet + '...';
  
  
  for (const term of lowerTerms) {
    const regex = new RegExp(`(${term})`, 'gi');
    snippet = snippet.replace(regex, '**$1**');
  }
  
  return snippet;
}

/**
 * Wrapper function for easy API integration
 */
async function searchAPI(req, res) {
  try {
    const { 
      q: query, 
      limit = 10,
      page = 1,
      min_score = 0, 
      fuzzy = false,
      fields,
      snippets = true
    } = req.query;

    if (!query || query.trim().length === 0) {
      return res.status(400).json({
        error: "Query parameter 'q' is required"
      });
    }

    const searchFields = fields ? fields.split(',') : ['content'];
    
    const results = await cachedSearchUseQuery(query.trim(), {
      limit: parseInt(limit),
      minScore: parseFloat(min_score),
      fuzzyMatch: fuzzy === 'true',
      fields: searchFields,
      page: page,
      includeSnippets: snippets === 'true'
    });

    res.json(results);
    
  } catch (error) {
    console.error('API Search error:', error);
    res.status(500).json({
      error: "Search failed",
      message: error.message
    });
  }
}

module.exports = {
  searchUseQuery,
  searchAPI
};