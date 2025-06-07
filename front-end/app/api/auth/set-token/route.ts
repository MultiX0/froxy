import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { code } = body

    // Verify the code again for security
    const validCode = process.env.ACCESS_CODE

    if (!validCode || code !== validCode) {
      return NextResponse.json({ success: false, message: "Invalid access code." }, { status: 401 })
    }

    // Create response
    const response = NextResponse.json(
      { success: true, message: "Authentication token set successfully." },
      { status: 200 },
    )

    // Set secure HTTP-only cookies
    const authToken = process.env.AUTH_SECRET_TOKEN || "default-secret-token"

    response.cookies.set("auth_token", authToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    })

    response.cookies.set("user_authenticated", "true", {
      httpOnly: false, // This one can be read by client-side JS
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    })

    return response
  } catch (error) {
    console.error("Error setting auth token:", error)
    return NextResponse.json({ success: false, message: "An error occurred." }, { status: 500 })
  }
}
