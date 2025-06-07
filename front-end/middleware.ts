import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Check if user is trying to access protected routes
  const protectedRoutes = ["/ai-search"]
  const isProtectedRoute = protectedRoutes.some((route) => pathname.startsWith(route))

  if (isProtectedRoute) {
    // Check for authentication token
    const authToken = request.cookies.get("auth_token")?.value
    const isAuthenticated = request.cookies.get("user_authenticated")?.value

    if (!authToken || !isAuthenticated) {
      // Redirect to sign in with the current path as redirect parameter
      const signInUrl = new URL("/signin", request.url)
      signInUrl.searchParams.set("redirect", pathname + request.nextUrl.search)
      return NextResponse.redirect(signInUrl)
    }

    // Verify the auth token is valid (you can add more validation here)
    try {
      // Basic validation - in production, you'd verify JWT or session
      if (authToken !== process.env.AUTH_SECRET_TOKEN) {
        // Invalid token, clear cookies and redirect
        const response = NextResponse.redirect(new URL("/signin", request.url))
        response.cookies.delete("auth_token")
        response.cookies.delete("user_authenticated")
        return response
      }
    } catch (error) {
      // Token validation failed
      const response = NextResponse.redirect(new URL("/signin", request.url))
      response.cookies.delete("auth_token")
      response.cookies.delete("user_authenticated")
      return response
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!api|_next/static|_next/image|favicon.ico|public).*)",
  ],
}
