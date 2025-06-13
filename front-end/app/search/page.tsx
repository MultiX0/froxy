"use client"

import React from "react"

import type { ReactElement } from "react"
import { useState, useEffect, useRef, useMemo } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import {
  Search,
  ArrowRight,
  ArrowLeft,
  ExternalLink,
  Github,
  ChevronRight,
  Globe,
  Loader2,
  MoreVertical,
  Copy,
  Check,
} from "lucide-react"
import Link from "next/link"
import Image from "next/image"

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
  favicon?: string
  score: number
}

interface SearchResponse {
  results: SearchResult[]
  metadata: {
    query: string
    totalResults: number
    searchTime: number
    terms: string[]
    termLookupTime: number | null
  }
}

interface SummaryResponse {
  msg: string
  url?: string
}

// Function to detect if text contains Arabic characters
const containsArabic = (text: string): boolean => {
  const arabicRegex = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/
  return arabicRegex.test(text)
}

// Function to get domain from URL for favicon fallback
const getDomainFromUrl = (url: string): string => {
  try {
    return new URL(url).hostname
  } catch {
    return ""
  }
}

// Magic text animation component - Memoized to prevent re-renders
const MagicText = React.memo(({ text }: { text: string }) => {
  const [animated, setAnimated] = useState(false)
  const animationRef = useRef(false)

  useEffect(() => {
    // Only animate once when the component first mounts
    if (!animationRef.current) {
      setAnimated(true)
      animationRef.current = true
    }
  }, [])

  return (
    <div className="magic-text-container">
      <p className="text-gray-200 text-sm leading-relaxed">
        {text.split("").map((char, index) => (
          <span
            key={index}
            className={`magic-text-char ${animated ? "animated" : ""}`}
            style={{
              animationDelay: `${index * 10}ms`,
              opacity: animated ? 1 : 0,
            }}
          >
            {char === " " ? "\u00A0" : char}
          </span>
        ))}
        {!text.endsWith("...") && "..."}
      </p>
    </div>
  )
})

MagicText.displayName = "MagicText"

export default function SearchResults(): ReactElement {
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
  const [faviconErrors, setFaviconErrors] = useState<Set<string>>(new Set())
  const resultsPerPage = 10

  const [headerHeight, setHeaderHeight] = useState(0)
  const headerRef = useRef<HTMLDivElement>(null)

  const [openDropdown, setOpenDropdown] = useState<number | null>(null)
  const [copySuccess, setCopySuccess] = useState<number | null>(null)

  const [summary, setSummary] = useState<string | null>(null)
  const [summaryUrl, setSummaryUrl] = useState<string | null>(null)
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [summaryError, setSummaryError] = useState<string | null>(null)
  const [summaryId, setSummaryId] = useState<string | null>(null)

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
      setFaviconErrors(new Set()) // Reset favicon errors for new search
    } catch (err) {
      console.error("Search API error:", err)
      setError("Failed to fetch search results. Please try again.")
      setResults([])
      setMetadata(null)
    } finally {
      setLoading(false)
    }
  }

  // Updated to use our internal API route instead of the external API directly
  const fetchSearchSummary = async (searchQuery: string) => {
    if (!searchQuery.trim()) return

    setSummaryLoading(true)
    setSummaryError(null)

    try {
      const response = await fetch(`/api/summary?q=${encodeURIComponent(searchQuery)}`)

      if (!response.ok) {
        // Just set error state but don't display it
        setSummaryError("Failed to fetch summary")
        setSummary(null)
        setSummaryUrl(null)
        return
      }

      const data: SummaryResponse = await response.json()
      setSummary(data.msg || null)
      setSummaryUrl(data.url || null)

      // Generate a unique ID for this summary to prevent re-animations
      setSummaryId(`summary-${Date.now()}`)

      // Debug log to check what we're getting from the backend
      console.log("Summary response:", data)
    } catch (err) {
      console.error("Summary API error:", err)
      setSummaryError("Failed to fetch summary")
      setSummary(null)
      setSummaryUrl(null)
    } finally {
      setSummaryLoading(false)
    }
  }

  useEffect(() => {
    if (query) {
      setSearchQuery(query)
      fetchSearchResults(query)
      fetchSearchSummary(query)
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

      // This will trigger the useEffect that calls fetchSearchResults and fetchSearchSummary
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

  const handleFaviconError = (resultId: number) => {
    setFaviconErrors((prev) => new Set(prev).add(resultId.toString()))
  }

  const copyToClipboard = async (url: string, resultId: number) => {
    try {
      // First try the modern Clipboard API
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(url)
        setCopySuccess(resultId)
        setOpenDropdown(null)
        setTimeout(() => setCopySuccess(null), 2000)
      } else {
        // Fallback method for older browsers or non-HTTPS
        const textArea = document.createElement("textarea")
        textArea.value = url
        textArea.style.position = "fixed"
        textArea.style.left = "-999999px"
        textArea.style.top = "-999999px"
        document.body.appendChild(textArea)
        textArea.focus()
        textArea.select()

        try {
          document.execCommand("copy")
          setCopySuccess(resultId)
          setOpenDropdown(null)
          setTimeout(() => setCopySuccess(null), 2000)
        } catch (fallbackError) {
          console.error("Fallback copy failed: ", fallbackError)
          // Show error state or alert
          alert("Copy failed. Please copy manually: " + url)
        } finally {
          document.body.removeChild(textArea)
        }
      }
    } catch (err) {
      console.error("Failed to copy: ", err)
      // Fallback to showing the URL in an alert or prompt
      alert("Copy failed. Please copy manually: " + url)
    }
  }

  // Pagination
  const totalPages = Math.ceil(results.length / resultsPerPage)
  const paginatedResults = results.slice((currentPage - 1) * resultsPerPage, currentPage * resultsPerPage)

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page)
      window.scrollTo({ top: 0, behavior: "smooth" })
    }
  }

  useEffect(() => {
    if (headerRef.current) {
      setHeaderHeight(headerRef.current.offsetHeight)
      document.documentElement.style.setProperty("--header-height", `${headerRef.current.offsetHeight}px`)
    }
  }, [])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openDropdown !== null) {
        const dropdownElement = document.querySelector(`[data-dropdown-id="${openDropdown}"]`)
        if (dropdownElement && !dropdownElement.contains(event.target as Node)) {
          setOpenDropdown(null)
        }
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [openDropdown])

  const showSuggestions = suggestions.length > 0 && isFocused

  // Shimmer loading component for summary
  const SummaryShimmer = () => {
    return (
      <div className="bg-gray-900/30 border border-gray-800/30 rounded-xl p-4 mb-4 overflow-hidden">
        <div className="space-y-3">
          <div className="h-4 bg-gray-700/30 rounded animate-pulse w-3/4"></div>
          <div className="h-4 bg-gray-700/30 rounded animate-pulse w-full"></div>
          <div className="h-4 bg-gray-700/30 rounded animate-pulse w-5/6"></div>
          <div className="h-4 bg-gray-700/30 rounded animate-pulse w-2/3"></div>
        </div>
      </div>
    )
  }

  // Memoize the summary component to prevent re-renders
  const memoizedSummary = useMemo(() => {
    if (!summary) return null

    return (
      <div className="bg-gray-900/30 border border-gray-800/30 rounded-xl p-4 mb-4">
        <MagicText key={summaryId} text={summary} />

        {summaryUrl && (
          <div className="mt-3">
            <a
              href={summaryUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center text-sm text-blue-400 hover:text-blue-300 transition-colors duration-200"
            >
              Read more
              <ExternalLink className="ml-1 w-3 h-3" />
            </a>
          </div>
        )}
      </div>
    )
  }, [summary, summaryUrl, summaryId])

  return (
    <div className="min-h-screen bg-black relative overflow-hidden transition-colors duration-500 flex flex-col">
      {/* Modern Gradient Background */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-blue-500/5 rounded-full blur-[100px] animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[300px] bg-purple-500/3 rounded-full blur-[80px] animate-pulse"></div>
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

      {/* Modern Header with Search */}
      <header
        ref={headerRef}
        className="relative z-10 border-b border-gray-800/30 bg-black/40 backdrop-blur-xl sticky top-0"
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center gap-4">
          {/* Logo */}
          <Link
            href="/"
            className="text-2xl font-bold text-white mr-0 sm:mr-6 hover:scale-105 transition-transform duration-200"
          >
            <span className="text-blue-400 font-mono">FROXY</span>
          </Link>

          {/* Modern Search Bar */}
          <form onSubmit={handleSearch} className="flex-1 w-full relative">
            <div className="relative">
              <div
                className={`relative bg-gray-900/50 backdrop-blur-xl border rounded-2xl transition-all duration-300 ${
                  isFocused
                    ? "border-blue-500/50 shadow-lg shadow-blue-500/10"
                    : "border-gray-700/20 hover:border-gray-600/30"
                }`}
              >
                <div className="flex items-center">
                  <Search
                    className={`absolute left-4 w-5 h-5 transition-colors duration-300 ${
                      isFocused ? "text-blue-400" : "text-gray-500"
                    }`}
                  />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => {
                      setTimeout(() => {
                        setIsFocused(false)
                        setSuggestions([])
                      }, 150)
                    }}
                    onKeyDown={handleKeyDown}
                    placeholder="Search anything..."
                    className="w-full py-3 pl-12 pr-14 bg-transparent text-white placeholder-gray-400 text-base focus:outline-none transition-colors duration-500 font-mono"
                  />

                  <button
                    type="submit"
                    disabled={loading}
                    className={`absolute right-2 p-2 rounded-xl transition-all duration-300 ${
                      searchQuery.length > 0
                        ? "bg-blue-500 hover:bg-blue-600 text-white shadow-lg shadow-blue-500/20"
                        : "bg-gray-700/50 text-gray-400"
                    }`}
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
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
            className="hidden sm:flex items-center px-4 py-2 text-sm text-gray-300 bg-gray-800/20 backdrop-blur-sm border border-gray-700/20 rounded-xl hover:bg-gray-700/30 hover:border-gray-600/30 hover:text-white transition-all duration-200 font-mono"
          >
            <Github className="w-4 h-4 mr-2" />
            SOURCE_CODE
          </a>
        </div>
      </header>

      {/* Suggestions Dropdown */}
      {showSuggestions && (
        <div className="fixed inset-x-0 z-[9999]" style={{ top: `calc(var(--header-height) + 0.5rem)` }}>
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="text-2xl font-bold mr-0 sm:mr-6 opacity-0 pointer-events-none">
                <span>FROXY</span>
              </div>

              <div className="flex-1 w-full relative">
                <div className="bg-gray-900/95 backdrop-blur-xl border border-gray-700/30 rounded-2xl shadow-2xl overflow-hidden">
                  {suggestions.map((suggestion, index) => (
                    <button
                      key={suggestion}
                      type="button"
                      onMouseDown={(e) => {
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
        className={`relative z-10 w-full px-4 sm:px-6 py-6 flex-1 flex justify-center ${showSuggestions ? "pointer-events-none" : ""}`}
      >
        <div className="w-full max-w-none lg:max-w-[70%] xl:max-w-[70%]">
          {/* Search Info */}
          {metadata && (
            <div className="mb-6 text-gray-400 text-sm font-mono">
              <p>
                Found {metadata.totalResults} results for{" "}
                <span className="text-blue-400 font-medium">"{metadata.query}"</span>
                <span className="ml-2 text-gray-500">({metadata.searchTime / 1000}s)</span>
                {results.length > resultsPerPage && (
                  <span className="ml-2">
                    (Showing {(currentPage - 1) * resultsPerPage + 1}-
                    {Math.min(currentPage * resultsPerPage, results.length)} of {results.length})
                  </span>
                )}
              </p>
            </div>
          )}

          {/* Summary Section - Only show on first page */}
          {query && currentPage === 1 && (
            <div className="mb-6">{summaryLoading ? <SummaryShimmer /> : memoizedSummary}</div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-16">
              <div className="flex flex-col items-center space-y-4">
                <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
                <span className="text-gray-400 font-mono">Searching...</span>
              </div>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="text-center py-16">
              <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6 max-w-md mx-auto">
                <p className="text-red-400 text-lg font-mono mb-4">{error}</p>
                <button
                  onClick={() => fetchSearchResults(query)}
                  className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl transition-colors duration-200 font-mono"
                >
                  Try Again
                </button>
              </div>
            </div>
          )}

          {/* Fixed Search Results */}
          {!loading && !error && (
            <div className="space-y-4">
              {paginatedResults.length > 0
                ? paginatedResults.map((result) => {
                    const isArabic = containsArabic(result.title)
                    const domain = getDomainFromUrl(result.url)
                    const showFavicon = result.favicon && !faviconErrors.has(result.id.toString())

                    return (
                      <div
                        key={result.id}
                        className="group bg-gray-900/20 backdrop-blur-sm border border-gray-800/20 rounded-2xl p-6 hover:border-gray-700/30 hover:bg-gray-900/30 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/5"
                      >
                        {/* Mobile Layout (stacked) */}
                        <div className="block sm:hidden">
                          {/* Top row: Favicon + Domain + Menu */}
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center space-x-2">
                              {showFavicon ? (
                                <Image
                                  src={result.favicon || "/placeholder.svg"}
                                  alt={`${domain} favicon`}
                                  width={20}
                                  height={20}
                                  className="rounded-sm flex-shrink-0"
                                  onError={() => handleFaviconError(result.id)}
                                />
                              ) : (
                                <Globe className="w-5 h-5 text-gray-500 flex-shrink-0" />
                              )}
                              <p className="text-gray-500 text-sm font-mono truncate">{domain}</p>
                            </div>

                            {/* Menu Button */}
                            <div className="relative flex-shrink-0" data-dropdown-id={result.id}>
                              <button
                                onClick={() => setOpenDropdown(openDropdown === result.id ? null : result.id)}
                                className="p-1.5 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-gray-800/50 transition-all duration-200"
                              >
                                <MoreVertical className="w-4 h-4" />
                              </button>

                              {/* Dropdown Menu */}
                              {openDropdown === result.id && (
                                <div className="absolute right-0 top-8 bg-gray-900/95 backdrop-blur-xl border border-gray-700/50 rounded-xl shadow-2xl overflow-hidden z-50 min-w-[160px]">
                                  <button
                                    onClick={(e) => {
                                      e.preventDefault()
                                      e.stopPropagation()
                                      copyToClipboard(result.url, result.id)
                                    }}
                                    className="w-full text-left px-4 py-3 text-sm text-gray-300 hover:bg-gray-800/50 hover:text-white transition-colors duration-150 font-mono flex items-center"
                                  >
                                    {copySuccess === result.id ? (
                                      <>
                                        <Check className="w-4 h-4 mr-3 text-green-400" />
                                        Copied!
                                      </>
                                    ) : (
                                      <>
                                        <Copy className="w-4 h-4 mr-3 text-gray-500" />
                                        Copy Link
                                      </>
                                    )}
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Title */}
                          <a
                            href={result.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`block text-lg font-medium text-blue-400 hover:text-blue-300 hover:underline mb-3 group-hover:text-blue-300 transition-colors duration-200 ${
                              isArabic ? "text-right" : "text-left"
                            }`}
                            dir={isArabic ? "rtl" : "ltr"}
                          >
                            <span className="flex items-center">
                              <span className="line-clamp-2 flex-1">{result.title}</span>
                              <ExternalLink className="ml-2 w-4 h-4 opacity-0 group-hover:opacity-70 transition-opacity duration-200 flex-shrink-0" />
                            </span>
                          </a>

                          {/* Description */}
                          <p
                            className={`text-gray-300 text-sm leading-relaxed mb-3 line-clamp-3 ${
                              containsArabic(result.description) ? "text-right" : "text-left"
                            }`}
                            dir={containsArabic(result.description) ? "rtl" : "ltr"}
                          >
                            {result.description}
                          </p>

                          {/* Score */}
                          <div className="text-xs text-gray-500 font-mono">
                            <span>Relevance: {result.score.toFixed(1)}</span>
                          </div>
                        </div>

                        {/* Desktop Layout (side by side) */}
                        <div className="hidden sm:flex items-start space-x-4">
                          {/* Favicon */}
                          <div className="flex-shrink-0 mt-1">
                            {showFavicon ? (
                              <Image
                                src={result.favicon || "/placeholder.svg"}
                                alt={`${domain} favicon`}
                                width={20}
                                height={20}
                                className="rounded-sm"
                                onError={() => handleFaviconError(result.id)}
                              />
                            ) : (
                              <Globe className="w-5 h-5 text-gray-500" />
                            )}
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            {/* URL */}
                            <p className="text-gray-500 text-sm mb-1 font-mono truncate">{domain}</p>

                            {/* Title with RTL support and Menu */}
                            <div className="flex items-start justify-between gap-3">
                              <a
                                href={result.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`flex-1 min-w-0 text-xl font-medium text-blue-400 hover:text-blue-300 hover:underline mb-2 group-hover:text-blue-300 transition-colors duration-200 ${
                                  isArabic ? "text-right" : "text-left"
                                }`}
                                dir={isArabic ? "rtl" : "ltr"}
                              >
                                <span className="flex items-center">
                                  <span className="truncate pr-2">{result.title}</span>
                                  <ExternalLink className="w-4 h-4 opacity-0 group-hover:opacity-70 transition-opacity duration-200 flex-shrink-0" />
                                </span>
                              </a>

                              {/* Menu Button */}
                              <div className="relative flex-shrink-0" data-dropdown-id={result.id}>
                                <button
                                  onClick={() => setOpenDropdown(openDropdown === result.id ? null : result.id)}
                                  className="p-1.5 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-gray-800/50 transition-all duration-200"
                                >
                                  <MoreVertical className="w-4 h-4" />
                                </button>

                                {/* Dropdown Menu */}
                                {openDropdown === result.id && (
                                  <div className="absolute right-0 top-8 bg-gray-900/95 backdrop-blur-xl border border-gray-700/50 rounded-xl shadow-2xl overflow-hidden z-50 min-w-[160px]">
                                    <button
                                      onClick={(e) => {
                                        e.preventDefault()
                                        e.stopPropagation()
                                        copyToClipboard(result.url, result.id)
                                      }}
                                      className="w-full text-left px-4 py-3 text-sm text-gray-300 hover:bg-gray-800/50 hover:text-white transition-colors duration-150 font-mono flex items-center"
                                    >
                                      {copySuccess === result.id ? (
                                        <>
                                          <Check className="w-4 h-4 mr-3 text-green-400" />
                                          Copied!
                                        </>
                                      ) : (
                                        <>
                                          <Copy className="w-4 h-4 mr-3 text-gray-500" />
                                          Copy Link
                                        </>
                                      )}
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Description with RTL support */}
                            <p
                              className={`text-gray-300 text-base leading-relaxed mb-3 ${
                                containsArabic(result.description) ? "text-right" : "text-left"
                              }`}
                              dir={containsArabic(result.description) ? "rtl" : "ltr"}
                            >
                              {result.description}
                            </p>

                            {/* Score */}
                            <div className="flex items-center text-xs text-gray-500 font-mono">
                              <span>Relevance: {result.score.toFixed(1)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })
                : !loading &&
                  query && (
                    <div className="text-center py-16">
                      <div className="bg-gray-900/20 border border-gray-800/20 rounded-2xl p-8 max-w-md mx-auto">
                        <p className="text-gray-400 text-lg font-mono mb-2">No results found for "{query}"</p>
                        <p className="text-gray-500 font-mono">Try different keywords or check your spelling</p>
                      </div>
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
        </div>
      </main>

      {/* Modern Footer */}
      <footer
        className={`relative z-10 border-t border-gray-800/20 py-6 mt-12 ${showSuggestions ? "pointer-events-none" : ""}`}
      >
        <div className="w-full px-4 sm:px-6">
          <div className="flex justify-center space-x-6 text-sm text-gray-500 font-mono">
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
