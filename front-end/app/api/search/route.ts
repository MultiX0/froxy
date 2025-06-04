import { type NextRequest, NextResponse } from "next/server"
import rateLimit from "express-rate-limit"

// Create a rate limiter (100 requests per 60 seconds per IP)
const limiter = rateLimit({
  windowMs: 60 * 1000, // 60 seconds
  max: 100, // Max 100 requests per window
  keyGenerator: (req: NextRequest) => {
    return req.headers.get("x-forwarded-for")?.split(",")[0] || "anonymous"
  },
  handler: (req, res, next) => {
    // Return a 429 JSON response for Next.js
    return NextResponse.json({ error: "Too many requests" }, { status: 429 })
  },
  skipFailedRequests: true, // Don't count failed requests toward the limit
})

// Middleware to adapt express-rate-limit for Next.js
async function applyRateLimit(req: NextRequest): Promise<NextResponse | null> {
  return new Promise((resolve) => {
    limiter(req as any, {} as any, (result: any) => {
      if (result instanceof NextResponse) {
        resolve(result)
      } else {
        resolve(null)
      }
    })
  })
}

export async function GET(request: NextRequest) {
  const startTime = Date.now()

  try {
    // Apply rate limiting
    const rateLimitResponse = await applyRateLimit(request)
    if (rateLimitResponse) {
      return rateLimitResponse
    }

    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get("q")

    if (!query) {
      return NextResponse.json({ error: "Query parameter is required" }, { status: 400 })
    }

    const apiUrl = process.env.API_URL
    const apiKey = process.env.API_KEY

    if (!apiUrl || !apiKey) {
      console.error("API configuration missing", { apiUrl: !!apiUrl, apiKey: !!apiKey })
      return NextResponse.json({ error: "API configuration error" }, { status: 500 })
    }

    // Removed fuzzy parameter from the API call
    const response = await fetch(`${apiUrl}/search?q=${encodeURIComponent(query)}`, {
      headers: {
        "x-api-key": apiKey,
      },
    })

    if (!response.ok) {
      console.error(`External API error: ${response.status} - ${response.statusText}`)
      return NextResponse.json({ error: `External API error: ${response.statusText}` }, { status: response.status })
    }

    const data = await response.json()

    // Transform the response to match the new structure
    return NextResponse.json({
      results: data.results, // Assuming this is the resultsMap
      metadata: {
        query: query,
        totalResults: data.results?.length || 0,
        searchTime: Date.now() - startTime,
        terms: [],
        termLookupTime: null,
      },
    })
  } catch (error) {
    console.error("Search API error:", error)
    return NextResponse.json({ error: "Failed to fetch search results" }, { status: 500 })
  }
}
