import { NextResponse } from "next/server"

export async function GET() {
  try {
    const apiUrl = process.env.API_URL
    const apiKey = process.env.API_KEY

    if (!apiKey || !apiUrl) {
      console.error("API key not found in environment variables")
      return NextResponse.json(
        {
          status: "unhealthy",
          timestamp: new Date().toISOString(),
          error: "Health check failed",
        },
        { status: 503 },
      )
    }

    const response = await fetch(`${apiUrl}/health`, {
      headers: {
        "x-api-key": apiKey,
      },
    })

    if (!response.ok) {
      throw new Error(`External API error: ${response.status}`)
    }

    return NextResponse.json(
      {
        status: "healthy",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        message: "Server is running normally",
      },
      { status: 200 },
    )
  } catch (error) {
    console.error("Health check failed:", error)
    return NextResponse.json(
      {
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        error: "Health check failed",
      },
      { status: 503 },
    )
  }
}