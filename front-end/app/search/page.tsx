"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import {
  Search,
  ArrowRight,
  ArrowLeft,
  ExternalLink,
  Github,
  ChevronRight,
  Clock,
  Users,
  FileText,
  Loader2,
} from "lucide-react"
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

interface SearchResult {
  id: number
  title: string
  description: string
  url: string
  score: number
  matchedTerms: string[]
  termCoverage: number
  debugging: {
    rawScore: number
    avgScore: number
    maxScore: number
    termCount: number
    termDetails: Record<
      string,
      {
        frequency: number
        score: number
        fields: string[]
      }
    >
  }
}

interface SearchResponse {
  results: SearchResult[]
  metadata: {
    query: string
    totalResults: number
    totalMatches: number
    searchTime: number
    terms: string[]
    queryTerms: string[]
    options: {
      limit: number
      minScore: number
      fuzzyMatch: boolean
      fields: string[]
    }
  }
}

export default function SearchResults() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const query = searchParams.get("q") || ""
  const [searchQuery, setSearchQuery] = useState(query)
  const [isFocused, setIsFocused] = useState(false)
  const [results, setResults] = useState<SearchResult[]>([])
  const [metadata, setMetadata] = useState<SearchResponse["metadata"] | null>(null)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [selectedSuggestion, setSelectedSuggestion] = useState(-1)
  const [currentPage, setCurrentPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const resultsPerPage = 10

  // Add this at the beginning of the component to track header height
  const [headerHeight, setHeaderHeight] = useState(0)
  const headerRef = useRef<HTMLDivElement>(null)

  // Function to fetch search results from our backend API
  const fetchSearchResults = async (searchQuery: string) => {
    if (!searchQuery.trim()) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`)

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data: SearchResponse = await response.json()
      setResults(data.results || [])
      setMetadata(data.metadata || null)
      setCurrentPage(1)
    } catch (err) {
      console.error("Search API error:", err)
      setError("Failed to fetch search results. Please try again.")
      setResults([])
      setMetadata(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (query) {
      setSearchQuery(query)
      fetchSearchResults(query)
    }
  }, [query])

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

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const finalQuery = selectedSuggestion >= 0 ? suggestions[selectedSuggestion] : searchQuery
    if (finalQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(finalQuery.trim())}`)
      setSuggestions([])
      setIsFocused(false)
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
      setSuggestions([])
      setIsFocused(false)
    } else if (e.key === "Escape") {
      setIsFocused(false)
      setSuggestions([])
    }
  }

  const selectSuggestion = (suggestion: string) => {
    setSearchQuery(suggestion)
    setSuggestions([])
    setIsFocused(false)
    router.push(`/search?q=${encodeURIComponent(suggestion.trim())}`)
  }

  // Pagination
  const totalPages = Math.ceil(results.length / resultsPerPage)
  const paginatedResults = results.slice((currentPage - 1) * resultsPerPage, currentPage * resultsPerPage)

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page)
      window.scrollTo(0, 0)
    }
  }

  // Add this effect to measure header height
  useEffect(() => {
    if (headerRef.current) {
      setHeaderHeight(headerRef.current.offsetHeight)
      document.documentElement.style.setProperty("--header-height", `${headerRef.current.offsetHeight}px`)
    }
  }, [])

  // Check if suggestions should be shown
  const showSuggestions = suggestions.length > 0 && isFocused

  return (
    <div className="min-h-screen bg-black relative overflow-hidden transition-colors duration-500 flex flex-col">
      {/* Beautiful Gradient Background for Search Page */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-blue-500/8 rounded-full blur-[120px] animate-pulse"></div>
      </div>

      {/* Full-screen overlay when suggestions are visible */}
      {showSuggestions && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[9998]"
          onClick={() => {
            setIsFocused(false)
            setSuggestions([])
          }}
        />
      )}

      {/* Header with Search */}
      <header
        ref={headerRef}
        className="relative z-10 border-b border-gray-800/50 bg-black/20 backdrop-blur-md sticky top-0"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center gap-4">
          {/* Logo */}
          <Link href="/" className="text-2xl font-bold text-white mr-0 sm:mr-6">
            <span className="text-blue-400 font-mono">FROXY</span>
          </Link>

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="flex-1 w-full relative">
            <div className="relative">
              <div
                className={`relative bg-gray-900/40 backdrop-blur-xl border rounded-full transition-all duration-300 ${
                  isFocused
                    ? "border-blue-500/50 shadow-lg shadow-blue-500/20"
                    : "border-gray-700/30 hover:border-gray-600/50"
                }`}
              >
                <div className="flex items-center">
                  <Search
                    className={`absolute left-4 w-4 h-4 transition-colors duration-300 ${
                      isFocused ? "text-blue-400" : "text-gray-500"
                    }`}
                  />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => {
                      // Delay hiding to allow for suggestion clicks
                      setTimeout(() => {
                        setIsFocused(false)
                        setSuggestions([])
                      }, 150)
                    }}
                    onKeyDown={handleKeyDown}
                    placeholder="Search anything..."
                    className="w-full py-2.5 pl-10 pr-10 bg-transparent text-white placeholder-gray-400 text-sm focus:outline-none transition-colors duration-500 font-mono"
                  />
                  <button
                    type="submit"
                    disabled={loading}
                    className={`absolute right-2 p-1.5 rounded-full transition-all duration-300 ${
                      searchQuery.length > 0
                        ? "bg-blue-500 hover:bg-blue-600 text-white shadow-lg shadow-blue-500/25"
                        : "bg-gray-700/50 text-gray-400"
                    }`}
                  >
                    {loading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <ArrowRight className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </form>

          {/* GitHub Link */}
          <a
            href="https://github.com/MultiX0/froxy"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:flex items-center px-4 py-2 text-sm text-gray-300 bg-gray-800/30 backdrop-blur-sm border border-gray-700/30 rounded-full hover:bg-gray-700/40 hover:border-gray-600/50 hover:text-white transition-all duration-200 font-mono"
          >
            <Github className="w-4 h-4 mr-2" />
            SOURCE_CODE
          </a>
        </div>
      </header>

      {/* Suggestions Dropdown - Positioned absolutely with highest z-index */}
      {showSuggestions && (
        <div className="fixed inset-x-0 z-[9999]" style={{ top: `calc(var(--header-height) + 0.5rem)` }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="flex flex-col sm:flex-row items-center gap-4">
              {/* Logo spacer */}
              <div className="text-2xl font-bold mr-0 sm:mr-6 opacity-0 pointer-events-none">
                <span>FROXY</span>
              </div>

              {/* Suggestions dropdown aligned with search bar */}
              <div className="flex-1 w-full relative">
                <div className="bg-gray-900/95 backdrop-blur-xl border border-gray-700/50 rounded-xl shadow-2xl overflow-hidden">
                  {suggestions.map((suggestion, index) => (
                    <button
                      key={suggestion}
                      type="button"
                      onMouseDown={(e) => {
                        // Use onMouseDown instead of onClick to prevent blur from firing first
                        e.preventDefault()
                        selectSuggestion(suggestion)
                      }}
                      className={`w-full text-left px-4 py-3 text-sm transition-colors duration-150 font-mono ${
                        index === selectedSuggestion
                          ? "bg-blue-500/20 text-blue-300"
                          : "text-gray-300 hover:bg-gray-800/50 hover:text-white"
                      }`}
                    >
                      <Search className="inline w-4 h-4 mr-3 text-gray-500" />
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>

              {/* GitHub Link spacer */}
              <div className="hidden sm:flex items-center px-4 py-2 opacity-0 pointer-events-none">
                <Github className="w-4 h-4 mr-2" />
                SOURCE_CODE
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main
        className={`relative z-10 max-w-5xl mx-auto px-4 sm:px-6 py-6 flex-1 ${showSuggestions ? "pointer-events-none" : ""}`}
      >
        {/* Search Info */}
        {metadata && (
          <div className="mb-6 text-gray-400 text-sm font-mono">
            <p>
              Found {metadata.totalResults} results for{" "}
              <span className="text-blue-400 font-medium">"{metadata.query}"</span>
              <span className="ml-2 text-gray-500">({metadata.searchTime}ms)</span>
              {results.length > resultsPerPage && (
                <span className="ml-2">
                  (Showing {(currentPage - 1) * resultsPerPage + 1}-
                  {Math.min(currentPage * resultsPerPage, results.length)} of {results.length})
                </span>
              )}
            </p>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
            <span className="ml-3 text-gray-400 font-mono">Searching...</span>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="text-center py-12">
            <p className="text-red-400 text-lg font-mono">{error}</p>
            <button
              onClick={() => fetchSearchResults(query)}
              className="mt-4 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors duration-200 font-mono"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Search Results */}
        {!loading && !error && (
          <div className="space-y-6">
            {paginatedResults.length > 0
              ? paginatedResults.map((result, index) => (
                  <div
                    key={result.id}
                    className="bg-gray-900/20 backdrop-blur-sm border border-gray-800/30 rounded-xl p-4 sm:p-6 hover:border-gray-700/40 hover:bg-gray-900/30 transition-all duration-300"
                  >
                    <div className="flex flex-col">
                      <div className="flex items-start justify-between">
                        <a
                          href={result.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-lg sm:text-xl font-medium text-blue-400 hover:text-blue-300 hover:underline mb-2 flex items-center"
                        >
                          {result.title}
                          <ExternalLink className="ml-2 w-4 h-4 opacity-70" />
                        </a>
                      </div>
                      <p className="text-gray-400 text-sm mb-1 font-mono">{result.url}</p>
                      <p className="text-gray-300 text-sm sm:text-base mt-2">{result.description}</p>

                      {/* Matched Terms */}
                      <div className="flex flex-wrap gap-2 mt-3">
                        {result.matchedTerms.map((term: string) => (
                          <span
                            key={term}
                            className="text-xs px-2 py-1 bg-blue-500/10 text-blue-300 rounded-full border border-blue-500/20 font-mono"
                          >
                            {term}
                          </span>
                        ))}
                      </div>

                      {/* Search Metadata */}
                      <div className="flex flex-wrap gap-x-4 gap-y-2 mt-4 text-xs text-gray-400 font-mono">
                        <div className="flex items-center">
                          <FileText className="w-3.5 h-3.5 mr-1.5 text-gray-500" />
                          <span>Score: {result.score.toFixed(1)}</span>
                        </div>
                        <div className="flex items-center">
                          <Users className="w-3.5 h-3.5 mr-1.5 text-gray-500" />
                          <span>Coverage: {result.termCoverage}%</span>
                        </div>
                        {Object.entries(result.debugging.termDetails).map(([term, details]) => (
                          <div key={term} className="flex items-center">
                            <Clock className="w-3.5 h-3.5 mr-1.5 text-gray-500" />
                            <span>
                              {term}: {details.frequency} matches
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))
              : !loading &&
                query && (
                  <div className="text-center py-12">
                    <p className="text-gray-400 text-lg font-mono">No results found for "{query}"</p>
                    <p className="text-gray-500 mt-2 font-mono">Try different keywords or check your spelling</p>
                  </div>
                )}
          </div>
        )}

        {/* Pagination */}
        {!loading && !error && totalPages > 1 && (
          <div className="mt-10 flex justify-center">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
                className={`p-2 rounded-lg border border-gray-700/50 font-mono ${
                  currentPage === 1
                    ? "bg-gray-800/10 text-gray-600 cursor-not-allowed"
                    : "bg-gray-800/30 text-gray-400 hover:bg-gray-700/50 hover:text-white"
                } transition-all duration-200`}
              >
                <ArrowLeft className="w-5 h-5" />
              </button>

              {[...Array(totalPages)].map((_, i) => {
                const pageNum = i + 1
                // Show current page, first, last, and pages around current
                if (
                  pageNum === 1 ||
                  pageNum === totalPages ||
                  (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)
                ) {
                  return (
                    <button
                      key={i}
                      onClick={() => goToPage(pageNum)}
                      className={`px-4 py-2 rounded-lg border font-mono ${
                        pageNum === currentPage
                          ? "border-blue-500/30 bg-blue-500/10 text-blue-400 font-medium"
                          : "border-gray-700/50 bg-gray-800/30 text-gray-400 hover:bg-gray-700/50 hover:text-white"
                      } transition-all duration-200`}
                    >
                      {pageNum}
                    </button>
                  )
                } else if (
                  (pageNum === currentPage - 2 && currentPage > 3) ||
                  (pageNum === currentPage + 2 && currentPage < totalPages - 2)
                ) {
                  return (
                    <span key={i} className="text-gray-500 font-mono">
                      ...
                    </span>
                  )
                }
                return null
              })}

              <button
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className={`p-2 rounded-lg border border-gray-700/50 font-mono ${
                  currentPage === totalPages
                    ? "bg-gray-800/10 text-gray-600 cursor-not-allowed"
                    : "bg-gray-800/30 text-gray-400 hover:bg-gray-700/50 hover:text-white"
                } transition-all duration-200`}
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer
        className={`relative z-10 border-t border-gray-800/50 py-4 mt-10 ${showSuggestions ? "pointer-events-none" : ""}`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex justify-center space-x-4 sm:space-x-8 text-xs text-gray-500 font-mono">
            <Link href="/about" className="hover:text-blue-400 transition-colors duration-200">
              ABOUT
            </Link>
            <Link href="/privacy" className="hover:text-blue-400 transition-colors duration-200">
              PRIVACY
            </Link>
            <Link href="/terms" className="hover:text-blue-400 transition-colors duration-200">
              TERMS
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
