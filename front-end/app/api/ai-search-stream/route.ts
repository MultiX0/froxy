import type { NextRequest } from "next/server"

// WebSocket message types matching Go backend
type MessageType =
  | "analyzing_query"
  | "query_enhanced"
  | "searching_db"
  | "db_results_found"
  | "processing_chunks"
  | "analyzing_results"
  | "final_response"
  | "error"

interface WSMessage {
  type: MessageType
  message: string
  data?: any
  progress?: number
  timestamp: string
}

export async function POST(request: NextRequest) {
  try {
    const { query } = await request.json()

    if (!query) {
      return new Response(JSON.stringify({ error: "Query is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }

    // Get environment variables
    const wsUrl = process.env.WEBSOCKET_URL || "ws://localhost:8080/ws/search";
    const apiKey = process.env.FROXY_APEX_API_KEY || 'apikey';

    // Create a readable stream for Server Sent Events
    const encoder = new TextEncoder()

    const stream = new ReadableStream({
      start(controller) {
        let isControllerClosed = false
        let ws: WebSocket | null = null

        const closeController = () => {
          if (!isControllerClosed) {
            isControllerClosed = true
            try {
              controller.close()
            } catch (error) {
              console.log("Controller already closed:", error)
            }
          }
        }

        const sendSSE = (data: any) => {
          if (!isControllerClosed) {
            try {
              const sseData = `data: ${JSON.stringify(data)}\n\n`
              controller.enqueue(encoder.encode(sseData))
            } catch (error) {
              console.error("Error sending SSE data:", error)
              closeController()
            }
          }
        }

        // Set timeout for the entire operation
        const timeout = setTimeout(() => {
          if (ws && ws.readyState === WebSocket.OPEN) {
            ws.close(1000, "Operation timeout")
          }
          sendSSE({
            type: "error",
            message: "Search operation timed out",
            progress: 0,
            timestamp: new Date().toISOString(),
          })
          closeController()
        }, 60000) // 60 second timeout

        try {
          // Connect to the Go backend WebSocket without any auth headers
          ws = new WebSocket(`${wsUrl}?apiKey=${encodeURIComponent(apiKey)}`, []);

          ws.onopen = () => {
            console.log("Connected to Go WebSocket backend")

            // Send connection status
            sendSSE({
              type: "analyzing_query",
              message: "Connected! Sending query...",
              progress: 0,
              timestamp: new Date().toISOString(),
            })

            // Send the search query
            if (ws && ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ query }))
            }
          }

          ws.onmessage = (event) => {
            try {
              const message: WSMessage = JSON.parse(event.data)
              console.log(`[${message.type}] ${message.message} - Progress: ${message.progress || 0}%`)

              // Forward the message as SSE
              sendSSE(message)

              // Close stream when final response is received
              if (message.type === "final_response") {
                clearTimeout(timeout)

                // Send a completion signal
                sendSSE({
                  type: "complete",
                  message: "Stream completed",
                  progress: 100,
                  timestamp: new Date().toISOString(),
                })

                // Close the stream after a short delay
                setTimeout(() => {
                  closeController()
                  if (ws && ws.readyState === WebSocket.OPEN) {
                    ws.close(1000, "Search completed successfully")
                  }
                }, 500) // Give more time for the final message to be sent
              } else if (message.type === "error") {
                clearTimeout(timeout)

                // Just forward the error message as is
                sendSSE(message)

                setTimeout(() => {
                  closeController()
                  if (ws && ws.readyState === WebSocket.OPEN) {
                    ws.close()
                  }
                }, 100)
              }
            } catch (error) {
              console.error("Error parsing WebSocket message:", error)
              sendSSE({
                type: "error",
                message: "Failed to parse server response",
                progress: 0,
                timestamp: new Date().toISOString(),
              })
              setTimeout(() => closeController(), 100)
            }
          }

          ws.onerror = (error) => {
            console.error("WebSocket error:", error)
            clearTimeout(timeout)

            sendSSE({
              type: "error",
              message: "Connection error occurred. Please check your backend configuration.",
              progress: 0,
              timestamp: new Date().toISOString(),
            })

            setTimeout(() => closeController(), 100)
          }

          ws.onclose = (event) => {
            console.log("WebSocket connection closed:", event.code, event.reason)
            clearTimeout(timeout)

            // Only send error for unexpected closures and if controller is still open
            if (event.code !== 1000 && event.code !== 1001 && !isControllerClosed) {
              let errorMessage = "Connection lost unexpectedly"

              // Handle specific error codes
              if (event.code === 1006) {
                errorMessage = "Connection closed abnormally. Please check your backend server."
              } else if (event.code === 1002) {
                errorMessage = "Protocol error. Please check your WebSocket configuration."
              }

              sendSSE({
                type: "error",
                message: errorMessage,
                progress: 0,
                timestamp: new Date().toISOString(),
              })
            }

            // Always try to close controller, but don't throw if already closed
            setTimeout(() => closeController(), 100)
          }
        } catch (error) {
          console.error("Error creating WebSocket:", error)
          clearTimeout(timeout)
          sendSSE({
            type: "error",
            message: "Failed to establish connection to search backend",
            progress: 0,
            timestamp: new Date().toISOString(),
          })
          closeController()
        }
      },

      cancel() {
        console.log("Stream cancelled by client")
      },
    })

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    })
  } catch (error) {
    console.error("AI Search Stream API error:", error)
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Failed to start streaming search",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    )
  }
}

// Handle preflight requests
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  })
}
