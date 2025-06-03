"use client"
import { useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Brain, ArrowLeft, Sparkles, Shield, Zap, Users } from "lucide-react"
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
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Enhanced Background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/8 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-1/3 right-1/4 w-80 h-80 bg-blue-500/6 rounded-full blur-[140px] animate-pulse"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] bg-gradient-to-r from-purple-500/4 to-blue-500/4 rounded-full blur-[200px]"></div>
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-gray-800/50 bg-black/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="text-xl font-bold text-white font-mono">
              <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">FROXY</span>
            </Link>
            <Link
              href="/"
              className="flex items-center text-gray-400 hover:text-white transition-colors duration-200 text-sm font-mono"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Search
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex items-center justify-center min-h-[calc(100vh-80px)] px-6">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left Side - Sign In Form */}
            <div className="text-center lg:text-left">
              <div className="mb-8">
                <div className="w-20 h-20 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 flex items-center justify-center mx-auto lg:mx-0 mb-6">
                  <Brain className="w-10 h-10 text-white" />
                </div>
                <h1 className="text-4xl font-bold text-white mb-4">
                  Welcome to{" "}
                  <span className="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                    FROXY AI
                  </span>
                </h1>
                <p className="text-xl text-gray-400 font-mono">Sign in to unlock the power of intelligent search</p>
              </div>

              {/* Sign In Button */}
              <button
                onClick={handleGoogleSignIn}
                disabled={isLoading}
                className="w-full max-w-sm mx-auto lg:mx-0 flex items-center justify-center gap-4 bg-white hover:bg-gray-100 text-black font-medium py-4 px-8 rounded-full transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-gray-400 border-t-black rounded-full animate-spin"></div>
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
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

              <p className="text-sm text-gray-500 mt-6 font-mono">
                By signing in, you agree to our{" "}
                <Link href="/terms" className="text-purple-400 hover:text-purple-300 underline">
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link href="/privacy" className="text-purple-400 hover:text-purple-300 underline">
                  Privacy Policy
                </Link>
              </p>
            </div>

            {/* Right Side - Features */}
            <div className="space-y-8">
              <div className="text-center lg:text-left mb-8">
                <h2 className="text-2xl font-bold text-white mb-4">Why sign in?</h2>
                <p className="text-gray-400 font-mono">Unlock advanced AI features and personalized experiences</p>
              </div>

              <div className="space-y-6">
                <div className="flex items-start gap-4 p-6 bg-gray-900/30 border border-gray-800/30 rounded-xl">
                  <div className="w-12 h-12 rounded-lg bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                    <Brain className="w-6 h-6 text-purple-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-2">Intelligent Responses</h3>
                    <p className="text-gray-400 text-sm font-mono">
                      Get detailed, contextual answers powered by advanced AI models
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-6 bg-gray-900/30 border border-gray-800/30 rounded-xl">
                  <div className="w-12 h-12 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                    <Zap className="w-6 h-6 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-2">Lightning Fast</h3>
                    <p className="text-gray-400 text-sm font-mono">
                      Experience blazing-fast search results with real-time AI processing
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-6 bg-gray-900/30 border border-gray-800/30 rounded-xl">
                  <div className="w-12 h-12 rounded-lg bg-green-500/20 flex items-center justify-center flex-shrink-0">
                    <Shield className="w-6 h-6 text-green-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-2">Secure & Private</h3>
                    <p className="text-gray-400 text-sm font-mono">
                      Your data is protected with enterprise-grade security and privacy
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-6 bg-gray-900/30 border border-gray-800/30 rounded-xl">
                  <div className="w-12 h-12 rounded-lg bg-orange-500/20 flex items-center justify-center flex-shrink-0">
                    <Users className="w-6 h-6 text-orange-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-2">Personalized Experience</h3>
                    <p className="text-gray-400 text-sm font-mono">
                      Save your search history and get personalized recommendations
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Floating Elements */}
      <div className="absolute top-20 right-20 opacity-20">
        <Sparkles className="w-8 h-8 text-purple-400 animate-pulse" />
      </div>
      <div className="absolute bottom-32 left-20 opacity-20">
        <Brain className="w-6 h-6 text-blue-400 animate-bounce" />
      </div>
    </div>
  )
}
