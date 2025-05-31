"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { Search, Github, ArrowRight, Zap } from "lucide-react"
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

const placeholderTexts = [
  "Search anything...",
  "Find code snippets...",
  "Discover tutorials...",
  "Explore frameworks...",
  "Search documentation...",
  "Find best practices...",
  "Discover algorithms...",
  "Search repositories...",
  "Find solutions...",
  "Explore libraries...",
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
  const [currentPlaceholder, setCurrentPlaceholder] = useState("")
  const [placeholderIndex, setPlaceholderIndex] = useState(0)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const router = useRouter()
  const [resultsCount, setResultsCount] = useState(64000)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Initialize with random placeholder
  useEffect(() => {
    const randomIndex = Math.floor(Math.random() * placeholderTexts.length)
    setPlaceholderIndex(randomIndex)
    setCurrentPlaceholder(placeholderTexts[randomIndex])
  }, [])

  // Cycle through placeholders with smooth transition
  useEffect(() => {
    const interval = setInterval(() => {
      setIsTransitioning(true)

      setTimeout(() => {
        setPlaceholderIndex((prev) => (prev + 1) % placeholderTexts.length)
        setIsTransitioning(false)
      }, 200) // Half of transition duration
    }, 4000) // Change every 4 seconds

    return () => clearInterval(interval)
  }, [])

  // Update placeholder with smooth transition
  useEffect(() => {
    if (!isTransitioning) {
      setCurrentPlaceholder(placeholderTexts[placeholderIndex])
    }
  }, [placeholderIndex, isTransitioning])

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

  // Remove outline on focus
  useEffect(() => {
    const handleFocus = () => {
      if (searchInputRef.current) {
        searchInputRef.current.style.outline = "none"
        searchInputRef.current.style.boxShadow = "none"
        searchInputRef.current.style.borderColor = "transparent"
      }
    }

    const input = searchInputRef.current
    if (input) {
      input.addEventListener("focus", handleFocus)
      return () => {
        input.removeEventListener("focus", handleFocus)
      }
    }
  }, [])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const query = selectedSuggestion >= 0 ? suggestions[selectedSuggestion] : searchQuery
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`)
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
      setSearchQuery(suggestions[selectedSuggestion])
      router.push(`/search?q=${encodeURIComponent(suggestions[selectedSuggestion].trim())}`)
    }
  }

  const selectSuggestion = (suggestion: string) => {
    setSearchQuery(suggestion)
    setSuggestions([])
    setIsFocused(false)
    router.push(`/search?q=${encodeURIComponent(suggestion.trim())}`)
  }

  return (
    <div className="min-h-screen bg-black dark:bg-black relative overflow-hidden flex flex-col items-center justify-center px-4 transition-colors duration-500">
      {/* Animated Background Spheres */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-64 sm:w-[400px] h-64 sm:h-[400px] bg-blue-500/15 dark:bg-blue-500/15 rounded-full blur-[140px] animate-breathe-dramatic"></div>
        <div className="absolute bottom-1/3 right-1/4 w-52 sm:w-[350px] h-52 sm:h-[350px] bg-cyan-400/12 dark:bg-cyan-400/12 rounded-full blur-[140px] animate-breathe-intense"></div>
        <div className="absolute top-1/2 right-1/3 w-48 sm:w-[380px] h-48 sm:h-[380px] bg-blue-600/14 dark:bg-blue-600/14 rounded-full blur-[140px] animate-breathe-powerful"></div>
        <div className="absolute bottom-1/4 left-1/3 w-40 sm:w-[320px] h-40 sm:h-[320px] bg-indigo-400/11 dark:bg-indigo-400/11 rounded-full blur-[140px] animate-breathe-strong"></div>
        <div className="absolute top-3/4 right-1/2 w-52 sm:w-[360px] h-52 sm:h-[360px] bg-blue-700/13 dark:bg-blue-700/13 rounded-full blur-[140px] animate-breathe-mega"></div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 w-full max-w-xl mx-auto text-center">
        {/* Header Section */}
        <div className="mb-10 sm:mb-12">
          <h2 className="text-lg sm:text-xl md:text-2xl font-light text-gray-300 mb-6 tracking-wide opacity-90">
            Ask Real Questions
          </h2>
          <h1 className="text-4xl sm:text-6xl md:text-7xl font-bold text-white dark:text-white tracking-tight transition-colors duration-500">
            <span className="bg-gradient-to-r from-blue-400 via-blue-500 to-cyan-400 dark:from-blue-400 dark:via-blue-500 dark:to-cyan-400 bg-clip-text text-transparent drop-shadow-2xl animate-gradient-x bg-[length:200%_200%] glow-text">
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
                  ? "border-blue-500/50 shadow-lg shadow-blue-500/20 glow-border"
                  : "border-gray-700/30 dark:border-gray-700/30 hover:border-gray-600/50 dark:hover:border-gray-600/50"
              }`}
            >
              {/* Scanning line effect when focused */}
              {isFocused && (
                <div className="absolute inset-0 rounded-2xl sm:rounded-full overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-blue-400 to-transparent animate-pulse"></div>
                </div>
              )}

              <div className="flex items-center">
                <div className="absolute left-4 sm:left-6 flex items-center space-x-2">
                  <Search
                    className={`w-5 h-5 transition-colors duration-300 ${
                      isFocused ? "text-blue-400" : "text-gray-500 dark:text-gray-500"
                    }`}
                  />
                  {isFocused && <Zap className="w-3 h-3 text-blue-400 animate-pulse" />}
                </div>
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setTimeout(() => setIsFocused(false), 200)}
                  onKeyDown={handleKeyDown}
                  placeholder={currentPlaceholder}
                  className={`w-full py-4 sm:py-5 pl-16 sm:pl-20 pr-12 sm:pr-16 bg-transparent text-white dark:text-white text-base sm:text-lg outline-none focus:outline-none focus:ring-0 focus:border-transparent active:outline-none transition-all duration-500 font-mono placeholder:transition-all placeholder:duration-400 placeholder:ease-in-out ${
                    isTransitioning
                      ? "placeholder:opacity-0 placeholder:transform placeholder:translate-y-2"
                      : "placeholder:opacity-100 placeholder:transform placeholder:translate-y-0 placeholder-gray-400 dark:placeholder-gray-400"
                  }`}
                  style={{
                    outline: "none",
                    boxShadow: "none",
                    WebkitAppearance: "none",
                    MozAppearance: "none",
                    appearance: "none",
                  }}
                />
                <button
                  type="submit"
                  className={`absolute right-2 sm:right-3 p-2 sm:p-2.5 rounded-full transition-all duration-300 outline-none focus:outline-none focus:ring-0 ${
                    searchQuery.length > 0
                      ? "bg-blue-500 hover:bg-blue-600 text-white shadow-lg shadow-blue-500/25 glow-border"
                      : "bg-gray-700/50 dark:bg-gray-700/50 text-gray-400 dark:text-gray-400"
                  }`}
                  style={{ outline: "none", boxShadow: "none" }}
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
                    className={`w-full text-left px-4 sm:px-6 py-3 sm:py-4 text-sm sm:text-base transition-colors duration-150 font-mono outline-none focus:outline-none focus:ring-0 ${
                      index === selectedSuggestion
                        ? "bg-blue-500/20 text-blue-300 dark:bg-blue-500/20 dark:text-blue-300"
                        : "text-gray-300 dark:text-gray-300 hover:bg-gray-800/50 dark:hover:bg-gray-800/50 hover:text-white dark:hover:text-white"
                    }`}
                    style={{ outline: "none", boxShadow: "none" }}
                  >
                    <Search className="inline w-4 h-4 mr-3 text-gray-500 dark:text-gray-500" />
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
          </div>
        </form>

        {/* Enhanced Quick Actions */}
        <div className="flex flex-col items-center gap-6 mb-12 sm:mb-16">
          {/* First row: GitHub and Online */}
          <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
            <a
              href="https://github.com/MultiX0/froxy"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center px-4 sm:px-6 py-2 sm:py-2.5 text-sm text-gray-300 dark:text-gray-300 bg-gray-800/30 dark:bg-gray-800/30 backdrop-blur-sm border border-gray-700/30 dark:border-gray-700/30 rounded-full hover:bg-gray-700/40 dark:hover:bg-gray-700/40 hover:border-gray-600/50 dark:hover:border-gray-600/50 hover:text-white dark:hover:text-white transition-all duration-200 font-mono outline-none focus:outline-none focus:ring-0"
              style={{ outline: "none", boxShadow: "none" }}
            >
              <Github className="w-4 h-4 mr-2" />
              SOURCE_CODE
            </a>
            <div className="flex items-center px-4 sm:px-6 py-2 sm:py-2.5 text-sm text-blue-400/70 bg-blue-500/10 backdrop-blur-sm border border-blue-500/20 rounded-full font-mono">
              <div className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></div>
              ONLINE
            </div>
          </div>

          {/* Second row: Results counter */}
          <div className="flex items-center px-4 sm:px-6 py-2 sm:py-2.5 text-sm text-gray-300 dark:text-gray-300 bg-gray-800/20 dark:bg-gray-800/20 backdrop-blur-sm border border-gray-700/20 dark:border-gray-700/20 rounded-full transition-all duration-200 font-mono">
            <span className="text-blue-400/80">~{formatNumber(resultsCount)}</span>
            <span className="mx-1">results</span>
            <span className="text-gray-500 text-xs">(soon to be much bigger)</span>
          </div>
        </div>
      </div>

      {/* Enhanced Footer */}
      <div className="absolute bottom-4 sm:bottom-8 left-0 right-0">
        <div className="flex justify-center space-x-4 sm:space-x-8 text-xs sm:text-sm text-gray-500 dark:text-gray-500 px-4 font-mono">
          <Link
            href="/about"
            className="hover:text-blue-400 transition-colors duration-200 outline-none focus:outline-none focus:ring-0"
            style={{ outline: "none", boxShadow: "none" }}
          >
            ABOUT
          </Link>
          <Link
            href="/privacy"
            className="hover:text-blue-400 transition-colors duration-200 outline-none focus:outline-none focus:ring-0"
            style={{ outline: "none", boxShadow: "none" }}
          >
            PRIVACY
          </Link>
          <Link
            href="/terms"
            className="hover:text-blue-400 transition-colors duration-200 outline-none focus:outline-none focus:ring-0"
            style={{ outline: "none", boxShadow: "none" }}
          >
            TERMS
          </Link>
        </div>
      </div>
    </div>
  )
}
