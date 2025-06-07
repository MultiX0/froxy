import { type NextRequest, NextResponse } from "next/server"

// Rate limiting store (in production for the future we will use Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

// Clean up old entries every hour
setInterval(() => {
  const now = Date.now()
  for (const [key, value] of rateLimitStore.entries()) {
    if (now > value.resetTime) {
      rateLimitStore.delete(key)
    }
  }
}, 3600000) // 1 hour

function getRateLimitKey(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for")
  const ip = forwarded ? forwarded.split(",")[0] : request.headers.get("x-real-ip") || "unknown"
  return `verify_code_${ip}`
}

function checkRateLimit(key: string): { allowed: boolean; remaining: number } {
  const now = Date.now()
  const windowMs = 15 * 60 * 1000 // 15 minutes
  const maxAttempts = 5 // Max 5 attempts per 15 minutes

  const current = rateLimitStore.get(key)

  if (!current || now > current.resetTime) {
    // Reset or initialize
    rateLimitStore.set(key, { count: 1, resetTime: now + windowMs })
    return { allowed: true, remaining: maxAttempts - 1 }
  }

  if (current.count >= maxAttempts) {
    return { allowed: false, remaining: 0 }
  }

  current.count++
  rateLimitStore.set(key, current)
  return { allowed: true, remaining: maxAttempts - current.count }
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const rateLimitKey = getRateLimitKey(request)
    const rateLimit = checkRateLimit(rateLimitKey)

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          valid: false,
          message: "Too many attempts. Please try again in 15 minutes.",
        },
        { status: 429 },
      )
    }

    // Parse request body
    const body = await request.json()
    const { code } = body

    // Input validation
    if (!code || typeof code !== "string") {
      return NextResponse.json({ valid: false, message: "Access code is required." }, { status: 400 })
    }

    // Sanitize input
    const sanitizedCode = code.trim()

    if (sanitizedCode.length === 0) {
      return NextResponse.json({ valid: false, message: "Access code cannot be empty." }, { status: 400 })
    }

    if (sanitizedCode.length > 100) {
      return NextResponse.json({ valid: false, message: "Access code is too long." }, { status: 400 })
    }

    // Get the valid access code from environment variables
    const validCode = process.env.ACCESS_CODE

    if (!validCode) {
      console.error("ACCESS_CODE environment variable is not set")
      return NextResponse.json({ valid: false, message: "Server configuration error." }, { status: 500 })
    }

    // Secure comparison to prevent timing attacks
    const isValid = sanitizedCode === validCode

    if (isValid) {
      // Log successful authentication
      console.log(`Successful authentication from IP: ${getRateLimitKey(request).replace("verify_code_", "")}`)

      return NextResponse.json({ valid: true, message: "Access code verified successfully." }, { status: 200 })
    } else {
      // Log failed attempt
      console.log(`Failed authentication attempt from IP: ${getRateLimitKey(request).replace("verify_code_", "")}`)

      return NextResponse.json(
        {
          valid: false,
          message: "Invalid access code. Please try again.",
          remaining: rateLimit.remaining,
        },
        { status: 401 },
      )
    }
  } catch (error) {
    console.error("Error in code verification:", error)
    return NextResponse.json({ valid: false, message: "An error occurred. Please try again." }, { status: 500 })
  }
}

// Prevent other HTTP methods
export async function GET() {
  return NextResponse.json({ message: "Method not allowed" }, { status: 405 })
}

export async function PUT() {
  return NextResponse.json({ message: "Method not allowed" }, { status: 405 })
}

export async function DELETE() {
  return NextResponse.json({ message: "Method not allowed" }, { status: 405 })
}
