"use client"
import { useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Brain, ArrowLeft, Sparkles, Shield, Zap, Star, CheckCircle } from "lucide-react"
import Link from "next/link"

export default function SignInPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const redirect = searchParams.get("redirect") || "/ai-search"
  const [isLoading, setIsLoading] = useState(false)

  const handleGoogleSignIn = async () => {
    setIsLoading(true)
    // Simulate Google sign-in process
    await new Promise((resolve) => setTimeout(resolve, 2000))

    // For demo purposes, we'll just redirect after the loading
    // In a real app, you'd integrate with Google OAuth
    localStorage.setItem("user_authenticated", "true")
    router.push(redirect)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 relative overflow-hidden">
      {/* Modern Background Effects */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-900/20 via-transparent to-transparent"></div>
        <div className="absolute bottom-0 right-0 w-full h-full bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-blue-900/20 via-transparent to-transparent"></div>
      </div>

      {/* Floating Orbs */}
      <div className="absolute top-20 left-10 w-32 h-32 bg-purple-500/10 rounded-full blur-xl animate-pulse"></div>
      <div className="absolute bottom-32 right-16 w-24 h-24 bg-blue-500/10 rounded-full blur-xl animate-pulse delay-1000"></div>
      <div className="absolute top-1/2 left-1/4 w-16 h-16 bg-pink-500/10 rounded-full blur-xl animate-pulse delay-500"></div>

      {/* Header */}
      <header className="relative z-10 p-4 sm:p-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="text-xl sm:text-2xl font-bold text-white font-mono">
            <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">FROXY</span>
          </Link>
          <Link
            href="/"
            className="flex items-center text-gray-400 hover:text-white transition-colors duration-200 text-sm font-mono group"
          >
            <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform duration-200" />
            Back to Search
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex items-center justify-center min-h-[calc(100vh-100px)] px-4 sm:px-6">
        <div className="w-full max-w-md mx-auto">
          {/* Main Card */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 sm:p-10 shadow-2xl">
            {/* Logo and Title */}
            <div className="text-center mb-8">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-r from-purple-500 to-blue-500 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-purple-500/25">
                <Brain className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white mb-3">
                Welcome to{" "}
                <span className="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                  FROXY AI
                </span>
              </h1>
              <p className="text-gray-400 font-mono text-sm sm:text-base">Sign in to unlock intelligent search</p>
            </div>

            {/* Features Preview */}
            <div className="mb-8 space-y-3">
              <div className="flex items-center gap-3 text-sm text-gray-300">
                <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                <span>AI-powered search responses</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-300">
                <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                <span>Real-time source citations</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-300">
                <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                <span>Personalized search history</span>
              </div>
            </div>

            {/* Sign In Button */}
            <button
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-50 text-black font-medium py-4 px-6 rounded-2xl transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 group"
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-gray-400 border-t-black rounded-full animate-spin"></div>
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 group-hover:scale-110 transition-transform duration-200" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  <span>Continue with Google</span>
                </>
              )}
            </button>

            {/* Trust Indicators */}
            <div className="mt-6 flex items-center justify-center gap-4 text-xs text-gray-500">
              <div className="flex items-center gap-1">
                <Shield className="w-3 h-3" />
                <span>Secure</span>
              </div>
              <div className="w-1 h-1 bg-gray-600 rounded-full"></div>
              <div className="flex items-center gap-1">
                <Zap className="w-3 h-3" />
                <span>Fast</span>
              </div>
              <div className="w-1 h-1 bg-gray-600 rounded-full"></div>
              <div className="flex items-center gap-1">
                <Star className="w-3 h-3" />
                <span>Trusted</span>
              </div>
            </div>

            {/* Legal Links */}
            <p className="text-xs text-gray-500 mt-6 text-center leading-relaxed">
              By continuing, you agree to our{" "}
              <Link href="/terms" className="text-purple-400 hover:text-purple-300 underline underline-offset-2">
                Terms
              </Link>{" "}
              and{" "}
              <Link href="/privacy" className="text-purple-400 hover:text-purple-300 underline underline-offset-2">
                Privacy Policy
              </Link>
            </p>
          </div>

       
        </div>
      </main>

      {/* Floating Elements */}
      <div className="absolute top-1/4 right-8 opacity-20 animate-float">
        <Sparkles className="w-6 h-6 text-purple-400" />
      </div>
      <div className="absolute bottom-1/4 left-8 opacity-20 animate-float delay-1000">
        <Brain className="w-5 h-5 text-blue-400" />
      </div>

      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  )
}
