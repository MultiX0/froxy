import { NextResponse } from "next/server"

export async function GET() {
  try {
    const apiUrl = process.env.API_URL
    const apiKey = process.env.API_KEY

    if (!apiKey) {
      console.error("API key not found in environment variables")
      return NextResponse.json(
        { count: 64000 }, // Fallback count
        { status: 200 },
      )
    }

    const response = await fetch(`${apiUrl}/results-count`, {
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
    console.error("Results count API error:", error)
    return NextResponse.json(
      { count: 64000 }, // Fallback count in case of error
      { status: 200 },
    )
  }
}
