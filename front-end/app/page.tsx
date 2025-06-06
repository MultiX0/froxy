"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { Search, Github, ArrowRight, Zap, Brain } from "lucide-react"
import { useRouter } from "next/navigation"
import Link from "next/link"

const searchSuggestions = [
  "JavaScript frameworks",
  "React best practices",
  "Node.js tutorials",
  "Python machine learning",
  "CSS animations",
  "TypeScript guide",
  "Web development",
  "API design patterns",
  "Database optimization",
  "Cloud computing",
  "Docker containers",
  "Git workflows",
  "Algorithm challenges",
  "System design",
  "Frontend performance",
  "Golang concurrency",
  "JavaScript promises",
  "Golang web server",
  "JavaScript async/await",
  "Golang microservices",
]

const formatNumber = (num: number): string => {
  if (num >= 1000000000) {
    return (num / 1000000000).toFixed(1).replace(/\.0$/, "") + "B"
  }
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1).replace(/\.0$/, "") + "M"
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1).replace(/\.0$/, "") + "k"
  }
  return num.toString()
}

export default function FroxySearch() {
  const [searchQuery, setSearchQuery] = useState("")
  const [isFocused, setIsFocused] = useState(false)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [selectedSuggestion, setSelectedSuggestion] = useState(-1)
  const [searchMode, setSearchMode] = useState<"search" | "ai">("search")
  const [resultsCount, setResultsCount] = useState(0)
  const [isLoadingCount, setIsLoadingCount] = useState(true)
  const router = useRouter()
  const searchInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (searchQuery.length > 0) {
      const filtered = searchSuggestions
        .filter((suggestion) => suggestion.toLowerCase().includes(searchQuery.toLowerCase()))
        .slice(0, 5)
      setSuggestions(filtered)
    } else {
      setSuggestions([])
    }
    setSelectedSuggestion(-1)
  }, [searchQuery])

  // Fetch results count
  useEffect(() => {
    const fetchResultsCount = async () => {
      try {
        setIsLoadingCount(true)
        const response = await fetch("/api/results-count")
        if (response.ok) {
          const data = await response.json()
          setResultsCount(data.count || 0)
        }
      } catch (error) {
        console.error("Failed to fetch results count:", error)
        setResultsCount(64000)
      } finally {
        setIsLoadingCount(false)
      }
    }
    fetchResultsCount()
  }, [])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const query = selectedSuggestion >= 0 ? suggestions[selectedSuggestion] : searchQuery
    if (query.trim()) {
      if (searchMode === "ai") {
        router.push(`/signin?redirect=${encodeURIComponent(`/ai-search?q=${encodeURIComponent(query.trim())}`)}`)
      } else {
        router.push(`/search?q=${encodeURIComponent(query.trim())}`)
      }
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setSelectedSuggestion((prev) => (prev < suggestions.length - 1 ? prev + 1 : prev))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setSelectedSuggestion((prev) => (prev > 0 ? prev - 1 : -1))
    } else if (e.key === "Enter" && selectedSuggestion >= 0) {
      e.preventDefault()
      const suggestion = suggestions[selectedSuggestion]
      setSearchQuery(suggestion)
      if (searchMode === "ai") {
        router.push(`/signin?redirect=${encodeURIComponent(`/ai-search?q=${encodeURIComponent(suggestion.trim())}`)}`)
      } else {
        router.push(`/search?q=${encodeURIComponent(suggestion.trim())}`)
      }
    }
  }

  const selectSuggestion = (suggestion: string) => {
    setSearchQuery(suggestion)
    setSuggestions([])
    setIsFocused(false)
    if (searchMode === "ai") {
      router.push(`/signin?redirect=${encodeURIComponent(`/ai-search?q=${encodeURIComponent(suggestion.trim())}`)}`)
    } else {
      router.push(`/search?q=${encodeURIComponent(suggestion.trim())}`)
    }
  }

  type HealthStatus = "connecting" | "online" | "offline"
  const [healthStatus, setHealthStatus] = useState<HealthStatus>("connecting")

  // Health check function
  const checkHealth = async () => {
    try {
      setHealthStatus("connecting")
      const response = await fetch("/api/health", {
        method: "GET",
        cache: "no-cache",
      })

      if (response.ok) {
        const data = await response.json()
        if (data.status === "healthy") {
          setHealthStatus("online")
        } else {
          setHealthStatus("offline")
        }
      } else {
        setHealthStatus("offline")
      }
    } catch (error) {
      console.error("Health check failed:", error)
      setHealthStatus("offline")
    }
  }

  useEffect(() => {
    checkHealth()
    const healthInterval = setInterval(() => {
      checkHealth()
    }, 60000) // Check every one minute
    return () => clearInterval(healthInterval)
  }, [])

  return (
    <div className="min-h-screen bg-black dark:bg-black relative overflow-hidden flex flex-col items-center justify-center px-4 transition-colors duration-500">
      {/* Animated Background Spheres - Theme changes based on search mode */}
      <div className="absolute inset-0 overflow-hidden">
        {searchMode === "ai" ? (
          // Purple theme for AI mode
          <>
            <div className="absolute top-1/4 left-1/4 w-64 sm:w-[400px] h-64 sm:h-[400px] bg-purple-500/15 dark:bg-purple-500/15 rounded-full blur-[140px] animate-breathe-dramatic transition-colors duration-700"></div>
            <div className="absolute bottom-1/3 right-1/4 w-52 sm:w-[350px] h-52 sm:h-[350px] bg-violet-400/12 dark:bg-violet-400/12 rounded-full blur-[140px] animate-breathe-intense transition-colors duration-700"></div>
            <div className="absolute top-1/2 right-1/3 w-48 sm:w-[380px] h-48 sm:h-[380px] bg-purple-600/14 dark:bg-purple-600/14 rounded-full blur-[140px] animate-breathe-powerful transition-colors duration-700"></div>
            <div className="absolute bottom-1/4 left-1/3 w-40 sm:w-[320px] h-40 sm:h-[320px] bg-indigo-400/11 dark:bg-indigo-400/11 rounded-full blur-[140px] animate-breathe-strong transition-colors duration-700"></div>
            <div className="absolute top-3/4 right-1/2 w-52 sm:w-[360px] h-52 sm:h-[360px] bg-purple-700/13 dark:bg-purple-700/13 rounded-full blur-[140px] animate-breathe-mega transition-colors duration-700"></div>
          </>
        ) : (
          // Blue theme for search mode
          <>
            <div className="absolute top-1/4 left-1/4 w-64 sm:w-[400px] h-64 sm:h-[400px] bg-blue-500/15 dark:bg-blue-500/15 rounded-full blur-[140px] animate-breathe-dramatic transition-colors duration-700"></div>
            <div className="absolute bottom-1/3 right-1/4 w-52 sm:w-[350px] h-52 sm:h-[350px] bg-cyan-400/12 dark:bg-cyan-400/12 rounded-full blur-[140px] animate-breathe-intense transition-colors duration-700"></div>
            <div className="absolute top-1/2 right-1/3 w-48 sm:w-[380px] h-48 sm:h-[380px] bg-blue-600/14 dark:bg-blue-600/14 rounded-full blur-[140px] animate-breathe-powerful transition-colors duration-700"></div>
            <div className="absolute bottom-1/4 left-1/3 w-40 sm:w-[320px] h-40 sm:h-[320px] bg-indigo-400/11 dark:bg-indigo-400/11 rounded-full blur-[140px] animate-breathe-strong transition-colors duration-700"></div>
            <div className="absolute top-3/4 right-1/2 w-52 sm:w-[360px] h-52 sm:h-[360px] bg-blue-700/13 dark:bg-blue-700/13 rounded-full blur-[140px] animate-breathe-mega transition-colors duration-700"></div>
          </>
        )}
      </div>

      {/* Main Content */}
      <div className="relative z-10 w-full max-w-xl mx-auto text-center">
        {/* Header Section */}
        <div className="mb-10 sm:mb-12">
          <h2 className="text-lg sm:text-xl md:text-2xl font-light text-gray-300 mb-6 tracking-wide opacity-90">
            Ask Real Questions
          </h2>
          <h1 className="text-7xl font-bold text-white dark:text-white tracking-tight transition-colors duration-500">
            <span
              className={`bg-clip-text text-transparent drop-shadow-2xl transition-all duration-700 ${
                searchMode === "ai"
                  ? "bg-gradient-to-r from-purple-400 via-purple-500 to-violet-400 dark:from-purple-400 dark:via-purple-500 dark:to-violet-400"
                  : "bg-gradient-to-r from-blue-400 via-blue-500 to-cyan-400 dark:from-blue-400 dark:via-blue-500 dark:to-cyan-400"
              }`}
              style={{
                textShadow:
                  searchMode === "ai" ? "0 0 20px rgba(147, 51, 234, 0.5)" : "0 0 20px rgba(59, 130, 246, 0.5)",
              }}
            >
              FROXY
            </span>
          </h1>
        </div>

        {/* Search Bar with Suggestions */}
        <form onSubmit={handleSearch} className="mb-8 relative">
          <div className="relative">
            <div
              className={`relative bg-gray-900/40 dark:bg-gray-900/40 backdrop-blur-xl border rounded-2xl sm:rounded-full transition-all duration-300 ${
                isFocused
                  ? searchMode === "ai"
                    ? "border-purple-500/50 shadow-lg shadow-purple-500/20"
                    : "border-blue-500/50 shadow-lg shadow-blue-500/20"
                  : "border-gray-700/30 dark:border-gray-700/30 hover:border-gray-600/50 dark:hover:border-gray-600/50"
              }`}
              style={{
                boxShadow: isFocused
                  ? searchMode === "ai"
                    ? "0 0 20px rgba(147, 51, 234, 0.3)"
                    : "0 0 20px rgba(59, 130, 246, 0.3)"
                  : undefined,
              }}
            >
              {/* Scanning line effect when focused */}
              {isFocused && (
                <div className="absolute inset-0 rounded-2xl sm:rounded-full overflow-hidden">
                  <div
                    className={`absolute top-0 left-0 w-full h-0.5 ${
                      searchMode === "ai"
                        ? "bg-gradient-to-r from-transparent via-purple-400 to-transparent"
                        : "bg-gradient-to-r from-transparent via-blue-400 to-transparent"
                    } animate-pulse`}
                  ></div>
                </div>
              )}

              <div className="flex items-center">
                <div className="absolute left-4 sm:left-6 flex items-center space-x-2">
                  {searchMode === "ai" ? (
                    <Brain
                      className={`w-5 h-5 transition-colors duration-300 ${
                        isFocused ? "text-purple-400" : "text-gray-500 dark:text-gray-500"
                      }`}
                    />
                  ) : (
                    <Search
                      className={`w-5 h-5 transition-colors duration-300 ${
                        isFocused ? "text-blue-400" : "text-gray-500 dark:text-gray-500"
                      }`}
                    />
                  )}
                  {isFocused && (
                    <Zap
                      className={`w-3 h-3 ${searchMode === "ai" ? "text-purple-400" : "text-blue-400"} animate-pulse`}
                    />
                  )}
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => {
                    setIsFocused(true)
                    // Handle mobile keyboard covering search field
                    if (typeof window !== "undefined" && window.innerWidth <= 768) {
                      setTimeout(() => {
                        if (searchInputRef.current) {
                          searchInputRef.current.scrollIntoView({
                            behavior: "smooth",
                            block: "center",
                            inline: "nearest",
                          })
                        }
                      }, 300) // Delay to allow keyboard to appear
                    }
                  }}
                  onBlur={() => setTimeout(() => setIsFocused(false), 200)}
                  onKeyDown={handleKeyDown}
                  placeholder={searchMode === "ai" ? "Ask me anything..." : "Search Anything"}
                  className="w-full py-4 sm:py-5 pl-16 sm:pl-20 pr-32 sm:pr-36 bg-transparent text-white dark:text-white placeholder-gray-400 dark:placeholder-gray-400 text-base sm:text-lg focus:outline-none transition-colors duration-500 font-mono"
                  ref={searchInputRef}
                />

                {/* AI Toggle inside search bar */}
                <div className="absolute right-16 sm:right-20 flex items-center">
                  <button
                    type="button"
                    onClick={() => setSearchMode(searchMode === "search" ? "ai" : "search")}
                    className={`flex items-center px-2 sm:px-3 py-1 sm:py-1.5 text-xs backdrop-blur-sm border rounded-full transition-all duration-200 font-mono ${
                      searchMode === "ai"
                        ? "text-purple-400/90 bg-purple-500/20 border-purple-500/30 hover:bg-purple-500/30"
                        : "text-gray-400 bg-gray-800/40 border-gray-700/40 hover:bg-gray-700/50 hover:text-white"
                    }`}
                  >
                    <Brain className="w-3 h-3 mr-1" />
                    AI
                  </button>
                </div>

                <button
                  type="submit"
                  className={`absolute right-2 sm:right-3 p-2 sm:p-2.5 rounded-full transition-all duration-300 ${
                    searchQuery.length > 0
                      ? searchMode === "ai"
                        ? "bg-purple-500 hover:bg-purple-600 text-white shadow-lg shadow-purple-500/25"
                        : "bg-blue-500 hover:bg-blue-600 text-white shadow-lg shadow-blue-500/25"
                      : "bg-gray-700/50 dark:bg-gray-700/50 text-gray-400 dark:text-gray-400"
                  }`}
                  style={{
                    boxShadow:
                      searchQuery.length > 0
                        ? searchMode === "ai"
                          ? "0 0 20px rgba(147, 51, 234, 0.3)"
                          : "0 0 20px rgba(59, 130, 246, 0.3)"
                        : undefined,
                  }}
                >
                  <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>
            </div>

            {/* Suggestions Dropdown */}
            {suggestions.length > 0 && isFocused && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-gray-900/95 dark:bg-gray-900/95 backdrop-blur-xl border border-gray-700/50 dark:border-gray-700/50 rounded-xl shadow-2xl overflow-hidden z-50">
                {suggestions.map((suggestion, index) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => selectSuggestion(suggestion)}
                    className={`w-full text-left px-4 sm:px-6 py-3 sm:py-4 text-sm sm:text-base transition-colors duration-150 font-mono ${
                      index === selectedSuggestion
                        ? searchMode === "ai"
                          ? "bg-purple-500/20 text-purple-300 dark:bg-purple-500/20 dark:text-purple-300"
                          : "bg-blue-500/20 text-blue-300 dark:bg-blue-500/20 dark:text-blue-300"
                        : "text-gray-300 dark:text-gray-300 hover:bg-gray-800/50 dark:hover:bg-gray-800/50 hover:text-white dark:hover:text-white"
                    }`}
                  >
                    {searchMode === "ai" ? (
                      <Brain className="inline w-4 h-4 mr-3 text-gray-500 dark:text-gray-500" />
                    ) : (
                      <Search className="inline w-4 h-4 mr-3 text-gray-500 dark:text-gray-500" />
                    )}
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
          </div>
        </form>

        {/* Enhanced Quick Actions */}
        <div className="flex flex-col items-center gap-6 mb-12 sm:mb-16">
          {/* First row: GitHub and Status */}
          <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
            <a
              href="https://github.com/MultiX0/froxy"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center px-4 sm:px-6 py-2 sm:py-2.5 text-sm text-gray-300 dark:text-gray-300 bg-gray-800/30 dark:bg-gray-800/30 backdrop-blur-sm border border-gray-700/30 dark:border-gray-700/30 rounded-full hover:bg-gray-700/40 dark:hover:bg-gray-700/40 hover:border-gray-600/50 dark:hover:border-gray-600/50 hover:text-white dark:hover:text-white transition-all duration-200 font-mono"
            >
              <Github className="w-4 h-4 mr-2" />
              SOURCE_CODE
            </a>

            {/* Status display with proper conditional classes */}
            {healthStatus === "connecting" && (
              <div className="flex items-center px-4 sm:px-6 py-2 sm:py-2.5 text-sm text-orange-400/70 bg-orange-500/10 backdrop-blur-sm border border-orange-500/20 rounded-full font-mono">
                <div className="w-2 h-2 bg-orange-400 rounded-full mr-2 animate-pulse"></div>
                CONNECTING
              </div>
            )}

            {healthStatus === "online" && (
              <div
                className={`flex items-center px-4 sm:px-6 py-2 sm:py-2.5 text-sm backdrop-blur-sm border rounded-full font-mono transition-all duration-700 ${
                  searchMode === "ai"
                    ? "text-purple-400/70 bg-purple-500/10 border-purple-500/20"
                    : "text-blue-400/70 bg-blue-500/10 border-blue-500/20"
                }`}
              >
                <div className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></div>
                ONLINE
              </div>
            )}

            {healthStatus === "offline" && (
              <div className="flex items-center px-4 sm:px-6 py-2 sm:py-2.5 text-sm text-red-400/70 bg-red-500/10 backdrop-blur-sm border border-red-500/20 rounded-full font-mono">
                <div className="w-2 h-2 bg-red-400 rounded-full mr-2"></div>
                OFFLINE
              </div>
            )}
          </div>

          {/* Second row: Results counter */}
          <div className="flex items-center px-4 sm:px-6 py-2 sm:py-2.5 text-sm text-gray-300 dark:text-gray-300 bg-gray-800/20 dark:bg-gray-800/20 backdrop-blur-sm border border-gray-700/20 dark:border-gray-700/20 rounded-full transition-all duration-200 font-mono">
            {isLoadingCount ? (
              <>
                <div
                  className={`w-4 h-4 border-2 rounded-full animate-spin mr-2 transition-colors duration-700 ${
                    searchMode === "ai"
                      ? "border-purple-400/30 border-t-purple-400"
                      : "border-blue-400/30 border-t-blue-400"
                  }`}
                ></div>
                <span className="text-gray-400">Loading...</span>
              </>
            ) : (
              <>
                <span
                  className={`transition-colors duration-700 ${
                    searchMode === "ai" ? "text-purple-400/80" : "text-blue-400/80"
                  }`}
                >
                  ~{formatNumber(resultsCount)}
                </span>
                <span className="mx-1">results</span>
                <span className="text-gray-500 text-xs">(and growing)</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Enhanced Footer */}
      <div className="absolute bottom-4 sm:bottom-8 left-0 right-0">
        <div className="flex justify-center space-x-4 sm:space-x-8 text-xs sm:text-sm text-gray-500 dark:text-gray-500 px-4 font-mono">
          <Link
            href="/about"
            className={`transition-colors duration-200 ${
              searchMode === "ai" ? "hover:text-purple-400" : "hover:text-blue-400"
            }`}
          >
            ABOUT
          </Link>
          <Link
            href="/privacy"
            className={`transition-colors duration-200 ${
              searchMode === "ai" ? "hover:text-purple-400" : "hover:text-blue-400"
            }`}
          >
            PRIVACY
          </Link>
          <Link
            href="/terms"
            className={`transition-colors duration-200 ${
              searchMode === "ai" ? "hover:text-purple-400" : "hover:text-blue-400"
            }`}
          >
            TERMS
          </Link>
        </div>
      </div>
    </div>
  )
}
