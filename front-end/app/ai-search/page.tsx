"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import {
  ArrowRight,
  Brain,
  Search,
  Copy,
  Check,
  Loader2,
  Globe,
  BookOpen,
  Sparkles,
  Zap,
  LogOut,
  Menu,
  X,
  Clock,
  Database,
  Cpu,
  MessageSquare,
  AlertCircle,
  RefreshCw,
  Github,
  ChevronDown,
} from "lucide-react"
import Link from "next/link"
import ReactMarkdown from "react-markdown"
import { cn } from "@/lib/utils"

// AI search suggestions
const aiSearchSuggestions = [
  "How to learn React hooks?",
  "Best practices for Python web development",
  "Machine learning algorithms explained",
  "JavaScript async/await vs promises",
  "How to optimize database queries?",
  "CSS Grid vs Flexbox when to use?",
  "Docker containerization guide",
  "API design best practices",
  "Git workflow strategies",
  "TypeScript benefits over JavaScript",
]

// Message types matching the backend
type MessageType =
  | "analyzing_query"
  | "query_enhanced"
  | "searching_db"
  | "db_results_found"
  | "processing_chunks"
  | "analyzing_results"
  | "final_response"
  | "error"
  | "complete"

interface SSEMessage {
  type: MessageType
  message: string
  data?: any
  progress?: number
  timestamp: string
}

interface SearchStep {
  type: MessageType
  message: string
  progress: number
  timestamp: string
  completed: boolean
  isActive: boolean
}

// Update the Source interface to include favicon
interface Source {
  title: string
  url: string
  domain: string
  id: number
  favicon?: string
}

export default function AISearchPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const query = searchParams.get("q") || ""
  const [searchQuery, setSearchQuery] = useState(query)
  const [isFocused, setIsFocused] = useState(false)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [selectedSuggestion, setSelectedSuggestion] = useState(-1)
  const [aiResponse, setAiResponse] = useState("")
  const [sources, setSources] = useState<Source[]>([])
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [feedbackGiven, setFeedbackGiven] = useState<"up" | "down" | null>(null)
  const [activeTab, setActiveTab] = useState<"answer" | "images" | "sources" | "tasks">("answer")
  const [sourcesExpanded, setSourcesExpanded] = useState(true)

  // Real-time SSE state
  const [searchSteps, setSearchSteps] = useState<SearchStep[]>([])
  const [currentStep, setCurrentStep] = useState<string>("")
  const [searchStartTime, setSearchStartTime] = useState<number>(0)
  const [searchMetadata, setSearchMetadata] = useState<any>(null)
  const [connectionError, setConnectionError] = useState<string | null>(null)
  const [aiModel, setAiModel] = useState("meta-llama/llama-4-scout-17b-16e-instruct")

  const searchInputRef = useRef<HTMLInputElement>(null)
  const responseRef = useRef<HTMLDivElement>(null)
  const eventSourceRef = useRef<EventSource | null>(null)

  // Check authentication
  useEffect(() => {
    const auth = localStorage.getItem("user_authenticated")
    if (!auth) {
      router.push(`/signin?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`)
    } else {
      setIsAuthenticated(true)
    }
  }, [router])

  // Smooth auto-scroll function
  const smoothScrollToBottom = () => {
    if (responseRef.current) {
      const element = responseRef.current
      const targetScrollTop = element.scrollHeight
      const startScrollTop = window.pageYOffset
      const distance = targetScrollTop - startScrollTop
      const duration = 300 // ms
      let start: number | null = null

      function animation(currentTime: number) {
        if (start === null) start = currentTime
        const timeElapsed = currentTime - start
        const run = ease(timeElapsed, startScrollTop, distance, duration)
        window.scrollTo(0, run)
        if (timeElapsed < duration) requestAnimationFrame(animation)
      }

      function ease(t: number, b: number, c: number, d: number) {
        t /= d / 2
        if (t < 1) return (c / 2) * t * t + b
        t--
        return (-c / 2) * (t * (t - 2) - 1) + b
      }

      requestAnimationFrame(animation)
    }
  }

  // Real-time AI search with Server-Sent Events
  const fetchAIResponseRealTime = async (query: string) => {
    setLoading(true)
    setIsTyping(false)
    setAiResponse("")
    setSources([])
    setError(null)
    setConnectionError(null)
    setSearchSteps([])
    setCurrentStep("Connecting to search engine...")
    setSearchStartTime(Date.now())
    setFeedbackGiven(null)

    // Close any existing EventSource
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
    }

    try {
      // Start the SSE connection to our backend
      const response = await fetch("/api/ai-search-stream", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) {
        throw new Error("No response body reader available")
      }

      // Set timeout for the entire operation
      const timeout = setTimeout(() => {
        reader.cancel()
        setError("Search operation timed out")
        setLoading(false)
      }, 60000) // 60 second timeout

      try {
        while (true) {
          const { done, value } = await reader.read()

          if (done) {
            clearTimeout(timeout)
            break
          }

          const chunk = decoder.decode(value, { stream: true })
          const lines = chunk.split("\n")

          for (const line of lines) {
            if (line.startsWith("data: ") && line.trim() !== "data: ") {
              try {
                const jsonStr = line.slice(6).trim() // Remove 'data: ' prefix and trim
                if (jsonStr) {
                  // Only parse if there's actual content
                  const message: SSEMessage = JSON.parse(jsonStr)

                  console.log(`[${message.type}] ${message.message} - Progress: ${message.progress || 0}%`)

                  // Update current step
                  setCurrentStep(message.message)

                  // Add or update step in the steps array
                  setSearchSteps((prevSteps) => {
                    const existingStepIndex = prevSteps.findIndex((step) => step.type === message.type)

                    const newStep: SearchStep = {
                      type: message.type,
                      message: message.message,
                      progress: message.progress || 0,
                      timestamp: message.timestamp,
                      completed: message.type === "final_response" || message.progress === 100,
                      isActive:
                        message.type !== "final_response" && message.progress !== 100 && message.type !== "complete",
                    }

                    if (existingStepIndex >= 0) {
                      // Update existing step
                      const updatedSteps = [...prevSteps]
                      updatedSteps[existingStepIndex] = newStep
                      return updatedSteps
                    } else {
                      // Add new step
                      return [...prevSteps, newStep]
                    }
                  })

                  if (message.type === "final_response") {
                    clearTimeout(timeout)
                    const finalResult = message.data

                    // Process the final result
                    const formattedResponse = formatResponse(finalResult, query)

                    // Set sources
                    setSources(formattedResponse.sources)
                    setSearchMetadata(formattedResponse.metadata)
                    setAiModel(formattedResponse.metadata.model || "meta-llama/llama-4-scout-17b-16e-instruct")

                    // Start typing effect
                    setIsTyping(true)
                    setCurrentStep("Generating response...")

                    // Lightning fast typing effect with smooth scrolling
                    const fullResponse = formattedResponse.answer
                    let currentText = ""

                    const typeResponse = async () => {
                      for (let i = 0; i < fullResponse.length; i++) {
                        currentText += fullResponse[i]
                        setAiResponse(currentText)

                        // Smooth scroll every few characters
                        if (i % 10 === 0) {
                          smoothScrollToBottom()
                        }

                        // Lightning fast typing speed - 0.5ms
                        await new Promise((resolve) => setTimeout(resolve, 0.5))
                      }

                      // Final scroll to ensure we're at the bottom
                      smoothScrollToBottom()

                      setIsTyping(false)
                      setCurrentStep("Complete")
                      setLoading(false)
                    }

                    typeResponse()
                  } else if (message.type === "error") {
                    clearTimeout(timeout)
                    setError(message.message)
                    setLoading(false)
                  } else if (message.type === "complete") {
                    clearTimeout(timeout)
                    // Stream completed successfully
                  }
                }
              } catch (parseError) {
                console.error("Error parsing SSE message:", parseError, "Raw line:", line)
              }
            }
          }
        }
      } finally {
        reader.releaseLock()
        clearTimeout(timeout)
      }
    } catch (error) {
      console.error("AI Search SSE error:", error)
      setError(error instanceof Error ? error.message : "Failed to start search")
      setLoading(false)
    }
  }

  // Format response function with citation numbers
  const formatResponse = (searchResult: any, query: string) => {
    try {
      console.log("Raw search result:", searchResult) // Debug log

      // The response structure from your Go backend
      const response = searchResult.response

      if (!response || !response.choices || !response.choices[0] || !response.choices[0].message) {
        throw new Error("Invalid response format from AI API")
      }

      const messageContent = response.choices[0].message.content
      console.log("Message content:", messageContent) // Debug log

      let parsedContent: any

      try {
        // Parse the JSON response from the AI
        parsedContent = JSON.parse(messageContent)
        console.log("Parsed content:", parsedContent) // Debug log
      } catch (error) {
        console.error("Failed to parse AI response content:", error)
        // Fallback: treat the entire content as summary
        parsedContent = {
          summary: messageContent,
          results: [],
        }
      }

      // Extract the summary/answer from the parsed content
      const summary = parsedContent.summary || parsedContent.answer || messageContent || ""
      const results = parsedContent.results || []

      console.log("Extracted summary:", summary) // Debug log
      console.log("Extracted results:", results) // Debug log

      // Process sources with citation numbers
      const sourcesWithIds = results
        .map((result: any, index: number) => {
          const url = result.reference || result.url || result.source || ""
          // Only use favicon if it exists and is not empty
          const favicon =
            result.reference_favicon && result.reference_favicon.trim() !== "" ? result.reference_favicon : ""

          let domain = "Unknown"
          try {
            if (url) {
              const urlObj = new URL(url)
              domain = urlObj.hostname
            }
          } catch (error) {
            console.error("Invalid URL:", url)
          }

          // Clean title from Markdown symbols
          let title = result.title || result.point?.substring(0, 50) + "..." || `Source ${index + 1}`
          // Remove Markdown symbols like **, __, [], (), etc.
          title = title.replace(/(\*\*|\*|__|_|\[|\]|$$|$$|`|#|>)/g, "")

          return {
            id: index + 1,
            title: title,
            url: url,
            domain: domain,
            favicon: favicon,
          }
        })
        .filter((source: { url: any }) => source.url)

      // Build the full answer from summary and results
      let fullAnswer = summary

      // If we have detailed results, append them to the summary
      if (results.length > 0) {
        const detailedContent = results
          .map((result: any, index: number) => {
            const point = result.point || result.content || ""
            return `\n\n**Source ${index + 1}:**\n${point}`
          })
          .join("")

        fullAnswer = summary + detailedContent
      }

      // Add citation numbers to the response text
      let processedAnswer = fullAnswer
      sourcesWithIds.forEach((source: { id: any; title: string }) => {
        const citationRegex = new RegExp(`\\[${source.id}\\]`, "g")
        if (!citationRegex.test(processedAnswer)) {
          // Add citation at the end of relevant content sections
          const sourcePattern = new RegExp(`(\\*\\*Source ${source.id}:?\\*\\*[^*]+)`, "gi")
          processedAnswer = processedAnswer.replace(sourcePattern, `$1 [${source.id}]`)
        }
      })

      console.log("Final processed answer:", processedAnswer) // Debug log

      return {
        answer: processedAnswer,
        content: results.map((result: any) => result.point || result.content || result).join("\n\n"),
        sources: sourcesWithIds,
        metadata: {
          query: query,
          searchTime: Date.now() - searchStartTime,
          totalTime: searchResult.total_time,
          chunksUsed: searchResult.chunks_used,
          sourcesCount: searchResult.sources_count,
          model: response.model || "meta-llama/llama-4-scout-17b-16e-instruct",
          usage: response.usage || {},
        },
      }
    } catch (error) {
      console.error("Error formatting response:", error)

      return {
        answer: "An error occurred while processing the search results.",
        content: "",
        sources: [],
        metadata: {
          query: query,
          searchTime: Date.now() - searchStartTime,
          error: error instanceof Error ? error.message : "Unknown error",
        },
      }
    }
  }

  useEffect(() => {
    if (query && isAuthenticated) {
      setSearchQuery(query)
      fetchAIResponseRealTime(query)
    }
  }, [query, isAuthenticated])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
      }
    }
  }, [])

  useEffect(() => {
    if (searchQuery.length > 0) {
      const filtered = aiSearchSuggestions
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
      router.push(`/ai-search?q=${encodeURIComponent(finalQuery.trim())}`)
      setSuggestions([])
      setIsFocused(false)
      setIsMenuOpen(false)
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
      router.push(`/ai-search?q=${encodeURIComponent(suggestions[selectedSuggestion].trim())}`)
      setSuggestions([])
      setIsFocused(false)
      setIsMenuOpen(false)
    } else if (e.key === "Escape") {
      setIsFocused(false)
      setSuggestions([])
      setIsMenuOpen(false)
    }
  }

  const selectSuggestion = (suggestion: string) => {
    setSearchQuery(suggestion)
    setSuggestions([])
    setIsFocused(false)
    setIsMenuOpen(false)
    router.push(`/ai-search?q=${encodeURIComponent(suggestion.trim())}`)
  }

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(aiResponse)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error("Failed to copy text: ", err)
    }
  }

  const handleSignOut = () => {
    localStorage.removeItem("user_authenticated")
    // Clear server-side cookies
    document.cookie = "auth_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;"
    document.cookie = "user_authenticated=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;"
    router.push("/")
    setIsMenuOpen(false)
  }

  const toggleMenu = () => {
    setIsMenuOpen((prev) => !prev)
  }

  const handleFeedback = (type: "up" | "down") => {
    setFeedbackGiven(type)
    console.log(`User gave ${type} feedback`)
  }

  const showSuggestions = suggestions.length > 0 && isFocused

  const getStepIcon = (type: MessageType, isActive: boolean, completed: boolean) => {
    if (completed) {
      return <Check className="w-3 h-3 text-emerald-400" />
    }

    if (isActive) {
      return <Loader2 className="w-3 h-3 animate-spin text-blue-400" />
    }

    switch (type) {
      case "analyzing_query":
        return <Brain className="w-3 h-3 text-gray-500" />
      case "query_enhanced":
        return <Sparkles className="w-3 h-3 text-gray-500" />
      case "searching_db":
        return <Database className="w-3 h-3 text-gray-500" />
      case "db_results_found":
        return <BookOpen className="w-3 h-3 text-gray-500" />
      case "processing_chunks":
        return <Cpu className="w-3 h-3 text-gray-500" />
      case "analyzing_results":
        return <Zap className="w-3 h-3 text-gray-500" />
      case "final_response":
        return <MessageSquare className="w-3 h-3 text-gray-500" />
      default:
        return <Clock className="w-3 h-3 text-gray-500" />
    }
  }

  // Function to render markdown with citation numbers
  const renderMarkdownWithCitations = (text: string) => {
    // Replace citation numbers with styled spans
    const parts = text.split(/(\[\d+\])/)

    return (
      <div className="prose prose-invert max-w-none">
        {parts.map((part, index) => {
          const citationMatch = part.match(/\[(\d+)\]/)
          if (citationMatch) {
            const num = citationMatch[1]
            return (
              <sup key={index}>
                <a
                  href={`#source-${num}`}
                  className="inline-flex items-center justify-center w-4 h-4 text-xs font-medium bg-blue-500/20 text-blue-400 rounded border border-blue-500/30 hover:bg-blue-500/30 transition-colors no-underline ml-0.5"
                >
                  {num}
                </a>
              </sup>
            )
          }
          return (
            <ReactMarkdown
              key={index}
              components={{
                h1: ({ node, ...props }) => <h1 className="text-xl font-semibold text-white mt-0 mb-4" {...props} />,
                h2: ({ node, ...props }) => <h2 className="text-lg font-medium text-white mt-6 mb-3" {...props} />,
                h3: ({ node, ...props }) => <h3 className="text-base font-medium text-white mt-4 mb-2" {...props} />,
                p: ({ node, ...props }) => <p className="mb-3 text-gray-200 leading-relaxed" {...props} />,
                ul: ({ node, ...props }) => <ul className="mb-3 pl-4 list-disc space-y-1" {...props} />,
                ol: ({ node, ...props }) => <ol className="mb-3 pl-4 list-decimal space-y-1" {...props} />,
                li: ({ node, ...props }) => <li className="text-gray-200" {...props} />,
                a: ({ node, ...props }) => (
                  <a
                    className="text-blue-400 hover:text-blue-300 underline"
                    target="_blank"
                    rel="noopener noreferrer"
                    {...props}
                  />
                ),
                code: ({ node, inline, ...props }: any) =>
                  inline ? (
                    <code className="bg-gray-800/60 px-1.5 py-0.5 rounded text-sm text-blue-300 font-mono" {...props} />
                  ) : (
                    <code {...props} />
                  ),
                pre: ({ node, ...props }) => (
                  <pre
                    className="bg-gray-900/50 border border-gray-800 rounded-lg p-4 overflow-x-auto mb-4 text-sm font-mono"
                    {...props}
                  />
                ),
                strong: ({ node, ...props }) => <strong className="font-medium text-white" {...props} />,
                em: ({ node, ...props }) => <em className="text-gray-200 italic" {...props} />,
                blockquote: ({ node, ...props }) => (
                  <blockquote className="border-l-2 border-gray-600 pl-4 italic text-gray-300 my-4" {...props} />
                ),
                hr: ({ node, ...props }) => <hr className="border-gray-700 my-6" {...props} />,
              }}
            >
              {part}
            </ReactMarkdown>
          )
        })}
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0F0F0F] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-6 h-6 animate-spin text-blue-400 mx-auto mb-4" />
          <p className="text-gray-400 text-sm">Checking authentication...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0F0F0F] text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#0F0F0F]/80 backdrop-blur-xl border-b border-gray-800/50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link href="/" className="text-lg font-semibold text-white">
              <span className="text-blue-400 font-mono">FROXY</span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-4">
              <Link
                href="/search"
                className="flex items-center text-gray-400 hover:text-white transition-colors text-sm px-3 py-1.5 rounded-lg hover:bg-gray-800/50"
              >
                <Search className="w-4 h-4 mr-2" />
                Search
              </Link>
              <button
                onClick={handleSignOut}
                className="flex items-center text-gray-400 hover:text-white transition-colors text-sm px-3 py-1.5 rounded-lg hover:bg-gray-800/50"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </button>
              <a
                href="https://github.com/MultiX0/froxy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-gray-800/50"
              >
                <Github className="w-4 h-4" />
              </a>
            </div>

            {/* Mobile Menu Button */}
            <button onClick={toggleMenu} className="md:hidden text-gray-400 hover:text-white transition-colors p-1.5">
              {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            {/* Mobile Menu */}
            {isMenuOpen && (
              <div className="absolute right-4 top-full mt-2 bg-gray-900/95 backdrop-blur-xl border border-gray-800 rounded-xl shadow-2xl overflow-hidden z-60 min-w-[180px] md:hidden">
                <div className="flex flex-col p-2">
                  <Link
                    href="/search"
                    className="flex items-center text-gray-400 hover:text-white transition-colors text-sm px-3 py-2 rounded-lg hover:bg-gray-800/50"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <Search className="w-4 h-4 mr-2" />
                    Search
                  </Link>
                  <button
                    onClick={handleSignOut}
                    className="flex items-center text-gray-400 hover:text-white transition-colors text-sm px-3 py-2 rounded-lg hover:bg-gray-800/50"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign Out
                  </button>
                  <a
                    href="https://github.com/MultiX0/froxy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center text-gray-400 hover:text-white transition-colors text-sm px-3 py-2 rounded-lg hover:bg-gray-800/50"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <Github className="w-4 h-4 mr-2" />
                    GitHub
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content with bottom padding for fixed search bar */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 pb-32">
        {query ? (
          <div className="space-y-6">
            {/* Query Display */}
            <div>
              <h1 className="text-2xl font-medium text-white mb-6 leading-tight">{query}</h1>
            </div>

            {/* Real-time Search Progress */}
            {(loading || searchSteps.length > 0) && (
              <div className="bg-gray-900/30 border border-gray-800/50 rounded-xl p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium text-white">Searching</span>
                  {searchStartTime > 0 && (
                    <span className="text-xs text-gray-400 ml-auto">
                      {Math.round((Date.now() - searchStartTime) / 1000)}s
                    </span>
                  )}
                </div>

                {/* Connection Error */}
                {connectionError && (
                  <div className="mb-3 p-3 bg-red-900/20 border border-red-800/30 rounded-lg flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-400" />
                    <span className="text-sm text-red-400">{connectionError}</span>
                  </div>
                )}

                <div className="space-y-2">
                  {searchSteps.map((step, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <div className="flex-shrink-0">{getStepIcon(step.type, step.isActive, step.completed)}</div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span
                            className={cn(
                              "text-xs",
                              step.completed ? "text-gray-400" : step.isActive ? "text-white" : "text-gray-500",
                            )}
                          >
                            {step.message}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}

                  {loading && currentStep && (
                    <div className="flex items-center gap-3 pt-2 border-t border-gray-800/50">
                      <Loader2 className="w-3 h-3 animate-spin text-blue-400" />
                      <span className="text-xs text-white">{currentStep}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Error Display */}
            {error && (
              <div className="bg-red-900/20 border border-red-800/30 rounded-xl p-4">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400" />
                  <div className="text-red-400 text-sm">
                    <strong>Error:</strong> {error}
                  </div>
                </div>
              </div>
            )}

            {/* Sources Section */}
            {sources.length > 0 && (
              <div className="space-y-3">
                <button
                  onClick={() => setSourcesExpanded(!sourcesExpanded)}
                  className="flex items-center gap-2 text-sm font-medium text-gray-300 hover:text-white transition-colors"
                >
                  <ChevronDown className={cn("w-4 h-4 transition-transform", sourcesExpanded && "rotate-180")} />
                  Sources
                </button>

                {/* Update the source cards rendering to use favicon and make title bold */}
                {sourcesExpanded && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {sources.map((source) => (
                      <a
                        key={source.id}
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group block p-3 bg-gray-900/30 border border-gray-800/50 rounded-lg hover:bg-gray-900/50 hover:border-gray-700/50 transition-all duration-200"
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-lg bg-gray-800/50 flex items-center justify-center flex-shrink-0 group-hover:bg-gray-700/50 transition-colors">
                            {source.favicon ? (
                              <img
                                src={source.favicon || "/placeholder.svg"}
                                alt={`${source.domain} favicon`}
                                className="w-4 h-4"
                                onError={(e) => {
                                  // If favicon fails to load, show Globe icon
                                  e.currentTarget.style.display = "none"
                                  const parent = e.currentTarget.parentElement
                                  if (parent) {
                                    const globe = document.createElement("span")
                                    globe.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" class="w-3 h-3 text-gray-400"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>`
                                    parent.appendChild(globe)
                                  }
                                }}
                              />
                            ) : (
                              <Globe className="w-3 h-3 text-gray-400" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-medium bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded">
                                {source.id}
                              </span>
                              <span className="text-xs text-gray-500 truncate">{source.domain}</span>
                            </div>
                            <h4 className="text-white text-sm font-bold group-hover:text-blue-300 transition-colors leading-tight">
                              {source.title}
                            </h4>
                          </div>
                        </div>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Answer Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-gray-400" />
                <span className="text-sm font-medium text-gray-300">Answer</span>
              </div>

              {/* AI Response */}
              {(aiResponse || loading) && (
                <div>
                  {aiResponse ? (
                    <div>
                      <div className="text-gray-200 leading-relaxed" ref={responseRef}>
                        {renderMarkdownWithCitations(aiResponse)}
                        {isTyping && <span className="animate-pulse text-blue-400 ml-1">|</span>}
                      </div>

                      {/* Response Actions */}
                      <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-800/50">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={copyToClipboard}
                            className="p-2 rounded-lg text-gray-400 hover:bg-gray-800/50 hover:text-white transition-colors"
                            title="Copy response"
                          >
                            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={() => fetchAIResponseRealTime(query)}
                            className="p-2 rounded-lg text-gray-400 hover:bg-gray-800/50 hover:text-white transition-colors"
                            title="Regenerate"
                          >
                            <RefreshCw className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-blue-500/20">
              <Brain className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-medium text-white mb-4">What can I help you with?</h1>
            <p className="text-gray-400 text-lg mb-12">Ask me anything about programming, technology, or development</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
              {[
                "How to learn React hooks?",
                "Python web development guide",
                "Machine learning basics",
                "JavaScript best practices",
              ].map((example) => (
                <button
                  key={example}
                  onClick={() => {
                    setSearchQuery(example)
                    router.push(`/ai-search?q=${encodeURIComponent(example)}`)
                  }}
                  className="p-4 bg-gray-900/30 border border-gray-800/50 rounded-xl hover:border-gray-700/50 hover:bg-gray-900/50 transition-all duration-300 text-left group"
                >
                  <div className="flex items-center gap-3">
                    <Brain className="w-4 h-4 text-blue-400 group-hover:text-blue-300 transition-colors" />
                    <span className="text-gray-300 group-hover:text-white transition-colors text-sm">{example}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Bottom Search Bar */}
      <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 w-full max-w-2xl px-4 z-40">
        <form onSubmit={handleSearch} className="relative">
          <div
            className={cn(
              "relative bg-gray-900/80 backdrop-blur-xl border rounded-2xl transition-all duration-300 shadow-2xl",
              isFocused ? "border-blue-500/50 ring-1 ring-blue-500/20" : "border-gray-700/50 hover:border-gray-600/50",
            )}
          >
            <div className="flex items-center">
              <Search
                className={cn(
                  "absolute left-4 w-4 h-4 transition-colors duration-300",
                  isFocused ? "text-blue-400" : "text-gray-400",
                )}
              />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setTimeout(() => setIsFocused(false), 150)}
                onKeyDown={handleKeyDown}
                placeholder="Ask anything..."
                className="w-full py-3 pl-12 pr-12 bg-transparent text-white text-sm focus:outline-none placeholder-gray-400"
              />
              <button
                type="submit"
                disabled={loading}
                className={cn(
                  "absolute right-2 p-2 rounded-xl transition-all duration-300",
                  searchQuery.length > 0 ? "bg-blue-500 hover:bg-blue-600 text-white" : "bg-gray-700/50 text-gray-400",
                )}
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Suggestions */}
          {showSuggestions && (
            <div className="absolute bottom-full left-0 right-0 mb-2 bg-gray-900/95 backdrop-blur-xl border border-gray-700/50 rounded-xl shadow-2xl overflow-hidden">
              {suggestions.map((suggestion, index) => (
                <button
                  key={suggestion}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault()
                    selectSuggestion(suggestion)
                  }}
                  className={cn(
                    "w-full text-left px-4 py-3 text-sm transition-colors duration-150",
                    index === selectedSuggestion
                      ? "bg-blue-500/20 text-blue-300"
                      : "text-gray-300 hover:bg-gray-800/50",
                  )}
                >
                  <Brain className="inline w-4 h-4 mr-3 text-gray-400" />
                  {suggestion}
                </button>
              ))}
            </div>
          )}
        </form>
      </div>
    </div>
  )
}
