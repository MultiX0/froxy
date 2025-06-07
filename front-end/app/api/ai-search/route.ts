import { type NextRequest, NextResponse } from "next/server"

const socket_url = process.env.WEBSOCKET_URL;
const fallback_url = process.env.FALLBACK_URL || "http://localhost:8080/api/search";
const apiKey = process.env.FROXY_APEX_API_KEY || "api-key"

// The main functionality uses direct WebSocket connection from frontend
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get("q")

    if (!query) {
      return NextResponse.json({ error: "Query parameter is required" }, { status: 400 })
    }

    // For environments that don't support WebSocket, redirect to HTTP endpoint
    return NextResponse.json({
      message: "Please use WebSocket connection for real-time search",
      websocket_url: socket_url,
      fallback_url: fallback_url,
      query: query,
    })
  } catch (error) {
    console.error("AI Search API error:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to process search request",
      },
      { status: 500 },
    )
  }
}

// Server Sent Events endpoint for environments that don't support WebSocket
export async function POST(request: NextRequest) {
  try {
    const { query } = await request.json()

    if (!query) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 })
    }

    // Create a readable stream for Server Sent Events
    const encoder = new TextEncoder()

    const stream = new ReadableStream({
      start(controller) {
        // Try to connect to the Go backend HTTP endpoint as fallback
        fetch(fallback_url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`,
          },
          body: JSON.stringify({ query }),
        })
          .then((response) => {
            if (!response.ok) {
              throw new Error(`HTTP ${response.status}`)
            }
            return response.text()
          })
          .then((data) => {
            // Send the response as SSE
            const sseData = `data: ${JSON.stringify({
              type: "final_response",
              message: "Search completed",
              data: JSON.parse(data),
              progress: 100,
              timestamp: new Date().toISOString(),
            })}\n\n`

            controller.enqueue(encoder.encode(sseData))
            controller.close()
          })
          .catch((error) => {
            const errorData = `data: ${JSON.stringify({
              type: "error",
              message: error.message,
              progress: 0,
              timestamp: new Date().toISOString(),
            })}\n\n`

            controller.enqueue(encoder.encode(errorData))
            controller.close()
          })
      },
    })

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "Access-Control-Allow-Origin": "*",
      },
    })
  } catch (error) {
    console.error("Streaming API error:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to start streaming search",
      },
      { status: 500 },
    )
  }
}
