import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get("q")

    if (!query) {
      return NextResponse.json({ error: "Query parameter is required" }, { status: 400 })
    }

    const apiUrl = process.env.API_URL
    const apiKey = process.env.API_KEY

    if (!apiKey) {
      console.error("API key not found in environment variables")
      return NextResponse.json({ error: "API configuration error" }, { status: 500 })
    }

    const response = await fetch(`${apiUrl}/search?q=${encodeURIComponent(query)}`, {
      headers: {
        "x-api-key": apiKey,
      },
    })

    if (!response.ok) {
      throw new Error(`External API error: ${response.status}`)
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error("Search API error:", error)
    return NextResponse.json({ error: "Failed to fetch search results" }, { status: 500 })
  }
}
