"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import {
  ArrowRight,
  Github,
  Brain,
  Search,
  Copy,
  Check,
  Loader2,
  ExternalLink,
  Globe,
  BookOpen,
  ArrowLeft,
  Sparkles,
  Zap,
  LogOut,
} from "lucide-react"
import Link from "next/link"
import ReactMarkdown from "react-markdown"

// Mock AI responses with sources
const mockAIResponses: Record<
  string,
  { answer: string; sources: Array<{ title: string; url: string; domain: string }> }
> = {
  javascript: {
    answer: `# JavaScript Overview

JavaScript is a versatile, high-level programming language that's essential for modern web development.

## Core Features
- Dynamic typing and interpreted execution
- Event-driven programming model  
- First-class functions and closures
- Prototype-based object orientation

## Primary Use Cases
- Frontend web development (DOM manipulation, user interactions)
- Backend development with Node.js
- Mobile app development with React Native
- Desktop applications with Electron

## Popular Frameworks & Libraries
- **Frontend:** React, Vue.js, Angular, Svelte
- **Backend:** Express.js, Fastify, Koa
- **Testing:** Jest, Mocha, Cypress

## Modern Best Practices
- Use ES6+ syntax (arrow functions, destructuring, modules)
- Implement proper error handling with try/catch
- Follow consistent code formatting (Prettier, ESLint)
- Write comprehensive tests and documentation

## Code Example
\`\`\`javascript
// Example of modern JavaScript
const fetchData = async (url) => {
  try {
    const response = await fetch(url);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching data:", error);
    throw error;
  }
};
\`\`\`

## Getting Started
Start with the fundamentals: variables, functions, and DOM manipulation. Then progress to modern frameworks and build projects to solidify your understanding.`,
    sources: [
      {
        title: "JavaScript Guide - MDN Web Docs",
        url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide",
        domain: "developer.mozilla.org",
      },
      {
        title: "JavaScript.info - The Modern JavaScript Tutorial",
        url: "https://javascript.info/",
        domain: "javascript.info",
      },
      { title: "Eloquent JavaScript Book", url: "https://eloquentjavascript.net/", domain: "eloquentjavascript.net" },
    ],
  },
  react: {
    answer: `# React.js

React is a powerful JavaScript library for building user interfaces, developed by Meta (Facebook). It's become the most popular frontend framework due to its component-based architecture and excellent developer experience.

## Core Concepts
- **Components:** Reusable UI building blocks
- **Virtual DOM:** Efficient rendering through virtual representation
- **JSX:** JavaScript syntax extension for writing HTML-like code
- **Unidirectional Data Flow:** Predictable state management

## Modern React Features
- **Hooks:** useState, useEffect, useContext for state and lifecycle
- **Suspense:** Code splitting and lazy loading
- **Concurrent Features:** Better user experience with concurrent rendering
- **Server Components:** Server-side rendering improvements

## Essential Ecosystem
- **Next.js:** Full-stack React framework with SSR/SSG
- **React Router:** Client-side routing
- **Redux Toolkit/Zustand:** State management
- **React Query:** Data fetching and caching

## Code Example
\`\`\`jsx
// Modern React component with hooks
import { useState, useEffect } from 'react';

function UserProfile({ userId }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    async function fetchUser() {
      try {
        const response = await fetch(\`/api/users/\${userId}\`);
        const data = await response.json();
        setUser(data);
      } catch (error) {
        console.error("Failed to fetch user:", error);
      } finally {
        setLoading(false);
      }
    }
    
    fetchUser();
  }, [userId]);
  
  if (loading) return <div>Loading...</div>;
  if (!user) return <div>User not found</div>;
  
  return (
    <div className="user-profile">
      <h1>{user.name}</h1>
      <p>{user.email}</p>
    </div>
  );
}
\`\`\`

## Best Practices
- Use functional components with hooks
- Keep components small and focused
- Implement proper error boundaries
- Optimize with React.memo and useMemo when needed

## Learning Path
1. Master JavaScript fundamentals first
2. Learn React basics (components, props, state)
3. Understand hooks and modern patterns
4. Build projects and explore the ecosystem`,
    sources: [
      { title: "React Documentation", url: "https://react.dev/", domain: "react.dev" },
      { title: "React Tutorial - Official", url: "https://react.dev/learn", domain: "react.dev" },
      { title: "Next.js Documentation", url: "https://nextjs.org/docs", domain: "nextjs.org" },
    ],
  },
  python: {
    answer: `# Python Programming Language

Python is a high-level, interpreted programming language known for its simplicity, readability, and versatility. It's an excellent choice for beginners and professionals alike.

## Key Characteristics
- **Readable Syntax:** Clean, English-like code structure
- **Dynamically Typed:** No need to declare variable types
- **Extensive Libraries:** Huge standard library and third-party packages
- **Cross-Platform:** Runs on Windows, macOS, Linux, and more

## Popular Applications
- **Web Development:** Django, Flask, FastAPI for robust web applications
- **Data Science:** NumPy, Pandas, Matplotlib for data analysis
- **Machine Learning:** Scikit-learn, TensorFlow, PyTorch for AI
- **Automation:** Scripting and task automation
- **Scientific Computing:** Research and computational work

## Code Example
\`\`\`python
# Simple data analysis with Python
import pandas as pd
import matplotlib.pyplot as plt

# Load and analyze data
def analyze_sales_data(file_path):
    # Read data
    df = pd.read_csv(file_path)
    
    # Basic statistics
    total_sales = df['sales'].sum()
    avg_sales = df['sales'].mean()
    
    # Group by category
    category_sales = df.groupby('category')['sales'].sum()
    
    # Create visualization
    plt.figure(figsize=(10, 6))
    category_sales.plot(kind='bar')
    plt.title('Sales by Category')
    plt.ylabel('Total Sales ($)')
    plt.tight_layout()
    plt.savefig('sales_analysis.png')
    
    return {
        'total': total_sales,
        'average': avg_sales,
        'by_category': category_sales.to_dict()
    }
\`\`\`

## Essential Libraries
- **Web:** Django (full-featured), Flask (lightweight), FastAPI (modern)
- **Data:** NumPy (numerical), Pandas (data manipulation), Matplotlib (visualization)
- **ML:** Scikit-learn (traditional ML), TensorFlow/PyTorch (deep learning)

## Best Practices
- Follow PEP 8 style guide for consistent code
- Use virtual environments (venv, conda) for project isolation
- Write docstrings and comprehensive tests
- Leverage list comprehensions and built-in functions

## Getting Started
Python's gentle learning curve makes it perfect for beginners. Start with basic syntax, then explore libraries relevant to your interests (web, data, automation).`,
    sources: [
      { title: "Python.org Official Documentation", url: "https://docs.python.org/3/", domain: "python.org" },
      { title: "Real Python Tutorials", url: "https://realpython.com/", domain: "realpython.com" },
      { title: "Python Package Index (PyPI)", url: "https://pypi.org/", domain: "pypi.org" },
    ],
  },
  default: {
    answer: `# How Can I Help You?

I'm an AI assistant specialized in programming, technology, and development topics. I can help you understand concepts, provide code examples, explain best practices, and guide your learning journey.

## What I Can Help With
- Programming languages (JavaScript, Python, Java, Go, etc.)
- Web development frameworks and tools
- Data science and machine learning concepts
- Software engineering best practices
- Technology explanations and tutorials
- Code debugging and optimization tips

## How to Get Better Results
- Be specific about your question or problem
- Mention your experience level (beginner, intermediate, advanced)
- Include relevant context or code snippets if applicable
- Ask follow-up questions for deeper understanding

## Popular Topics to Explore
- "How to learn React hooks"
- "Python web development best practices"  
- "Machine learning algorithms explained"
- "JavaScript async/await vs promises"
- "Database optimization techniques"

Feel free to ask me anything about programming or technology!`,
    sources: [
      { title: "Stack Overflow", url: "https://stackoverflow.com/", domain: "stackoverflow.com" },
      { title: "GitHub", url: "https://github.com/", domain: "github.com" },
      { title: "MDN Web Docs", url: "https://developer.mozilla.org/", domain: "developer.mozilla.org" },
    ],
  },
}

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

export default function AISearchPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const query = searchParams.get("q") || ""
  const [searchQuery, setSearchQuery] = useState(query)
  const [isFocused, setIsFocused] = useState(false)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [selectedSuggestion, setSelectedSuggestion] = useState(-1)
  const [aiResponse, setAiResponse] = useState("")
  const [sources, setSources] = useState<Array<{ title: string; url: string; domain: string }>>([])
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const responseRef = useRef<HTMLDivElement>(null)

  // Check authentication
  useEffect(() => {
    const auth = localStorage.getItem("user_authenticated")
    if (!auth) {
      router.push(`/signin?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`)
    } else {
      setIsAuthenticated(true)
    }
  }, [router])

  // Simulate AI response with typing effect
  const simulateAIResponse = async (query: string) => {
    setLoading(true)
    setIsTyping(true)
    setAiResponse("")
    setSources([])

    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 1500))

    const responseData = mockAIResponses[query.toLowerCase()] || mockAIResponses.default
    const response = responseData.answer
    const responseSources = responseData.sources

    // Set sources immediately
    setSources(responseSources)

    // Typing effect
    let currentText = ""
    for (let i = 0; i < response.length; i++) {
      currentText += response[i]
      setAiResponse(currentText)
      // Faster typing speed
      await new Promise((resolve) => setTimeout(resolve, 5))
    }

    setIsTyping(false)
    setLoading(false)
  }

  useEffect(() => {
    if (query && isAuthenticated) {
      setSearchQuery(query)
      simulateAIResponse(query)
    }
  }, [query, isAuthenticated])

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
    } else if (e.key === "Escape") {
      setIsFocused(false)
      setSuggestions([])
    }
  }

  const selectSuggestion = (suggestion: string) => {
    setSearchQuery(suggestion)
    setSuggestions([])
    setIsFocused(false)
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
    router.push("/")
  }

  const showSuggestions = suggestions.length > 0 && isFocused

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-purple-400 mx-auto mb-4" />
          <p className="text-gray-400 font-mono">Checking authentication...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Enhanced Background */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-purple-500/6 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-[600px] h-[400px] bg-blue-500/4 rounded-full blur-[140px] animate-pulse"></div>
        <div className="absolute top-1/2 left-1/4 w-[400px] h-[300px] bg-gradient-to-r from-purple-500/3 to-blue-500/3 rounded-full blur-[100px]"></div>
      </div>

      {/* Floating Elements */}
      <div className="absolute top-20 right-20 opacity-10">
        <Sparkles className="w-8 h-8 text-purple-400 animate-pulse" />
      </div>
      <div className="absolute bottom-32 left-20 opacity-10">
        <Zap className="w-6 h-6 text-blue-400 animate-bounce" />
      </div>
      <div className="absolute top-1/3 right-1/4 opacity-10">
        <Brain className="w-10 h-10 text-purple-400 animate-pulse" />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-gray-800/50 bg-black/80 backdrop-blur-md sticky top-0">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3">
          <div className="flex items-center gap-4">
            {/* Logo */}
            <Link href="/" className="text-xl font-bold text-white font-mono">
              <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">FROXY</span>
            </Link>

            {/* Search Bar */}
            <form onSubmit={handleSearch} className="flex-1 max-w-2xl relative">
              <div className="relative">
                <div
                  className={`relative bg-gray-900/40 backdrop-blur-xl border rounded-full transition-all duration-300 ${
                    isFocused
                      ? "border-purple-500/50 shadow-lg shadow-purple-500/10"
                      : "border-gray-700/30 hover:border-gray-600/50"
                  }`}
                >
                  <div className="flex items-center">
                    <Brain
                      className={`absolute left-3 w-4 h-4 transition-colors duration-300 ${
                        isFocused ? "text-purple-400" : "text-gray-500"
                      }`}
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
                      className="w-full py-2.5 pl-10 pr-10 bg-transparent text-white text-sm focus:outline-none font-mono placeholder-gray-400"
                    />
                    <button
                      type="submit"
                      disabled={loading}
                      className={`absolute right-2 p-1.5 rounded-full transition-all duration-300 ${
                        searchQuery.length > 0
                          ? "bg-purple-500 hover:bg-purple-600 text-white"
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

                {/* Suggestions */}
                {showSuggestions && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-gray-900/95 backdrop-blur-xl border border-gray-700/50 rounded-xl shadow-2xl overflow-hidden z-50">
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
                            ? "bg-purple-500/20 text-purple-300"
                            : "text-gray-300 hover:bg-gray-800/50 hover:text-white"
                        }`}
                      >
                        <Brain className="inline w-4 h-4 mr-3 text-gray-500" />
                        {suggestion}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </form>

            {/* Navigation */}
            <div className="flex items-center gap-4">
              <Link
                href="/search"
                className="flex items-center text-gray-400 hover:text-white transition-colors duration-200 text-sm font-mono"
              >
                <Search className="w-4 h-4 mr-2" />
                Search
              </Link>
              <button
                onClick={handleSignOut}
                className="flex items-center text-gray-400 hover:text-white transition-colors duration-200 text-sm font-mono"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </button>
              <a
                href="https://github.com/MultiX0/froxy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-white transition-colors duration-200"
              >
                <Github className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* AI Response */}
          <div className="lg:col-span-2">
            {query && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <Link href="/" className="mr-3 text-gray-400 hover:text-white transition-colors">
                      <ArrowLeft className="w-4 h-4" />
                    </Link>
                    <h1 className="text-xl font-medium text-white">{query}</h1>
                  </div>
                  {aiResponse && (
                    <button
                      onClick={copyToClipboard}
                      className="p-2 rounded-lg bg-gray-800/50 hover:bg-gray-700/50 text-gray-400 hover:text-white transition-all duration-200"
                      title="Copy response"
                    >
                      {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  )}
                </div>

                {loading && !aiResponse ? (
                  <div className="flex items-center gap-3 py-8">
                    <Loader2 className="w-5 h-5 animate-spin text-purple-400" />
                    <span className="text-gray-400 font-mono">Searching and analyzing...</span>
                  </div>
                ) : (
                  <div className="prose prose-invert max-w-none" ref={responseRef}>
                    <div className="text-gray-300 leading-relaxed">
                      <ReactMarkdown
                        components={{
                          h1: ({ node, ...props }) => (
                            <h1 className="text-2xl font-bold text-white mt-0 mb-4" {...props} />
                          ),
                          h2: ({ node, ...props }) => (
                            <h2 className="text-xl font-semibold text-white mt-6 mb-3" {...props} />
                          ),
                          h3: ({ node, ...props }) => (
                            <h3 className="text-lg font-medium text-white mt-5 mb-2" {...props} />
                          ),
                          p: ({ node, ...props }) => <p className="mb-4 text-gray-300" {...props} />,
                          ul: ({ node, ...props }) => <ul className="mb-4 pl-6 list-disc" {...props} />,
                          ol: ({ node, ...props }) => <ol className="mb-4 pl-6 list-decimal" {...props} />,
                          li: ({ node, ...props }) => <li className="mb-1 text-gray-300" {...props} />,
                          a: ({ node, ...props }) => (
                            <a
                              className="text-purple-400 hover:text-purple-300 underline"
                              target="_blank"
                              rel="noopener noreferrer"
                              {...props}
                            />
                          ),
                          code: ({ node, inline, ...props }: any) =>
                            inline ? (
                              <code
                                className="bg-gray-800 px-1 py-0.5 rounded text-sm text-purple-300 font-mono"
                                {...props}
                              />
                            ) : (
                              <code {...props} />
                            ),
                          pre: ({ node, ...props }) => (
                            <pre
                              className="bg-gray-900/50 border border-gray-800 rounded-lg p-4 overflow-x-auto mb-4 text-sm font-mono"
                              {...props}
                            />
                          ),
                          strong: ({ node, ...props }) => <strong className="font-semibold text-white" {...props} />,
                          em: ({ node, ...props }) => <em className="text-gray-300 italic" {...props} />,
                          blockquote: ({ node, ...props }) => (
                            <blockquote
                              className="border-l-4 border-purple-500/50 pl-4 italic text-gray-400"
                              {...props}
                            />
                          ),
                          hr: ({ node, ...props }) => <hr className="border-gray-800 my-6" {...props} />,
                        }}
                      >
                        {aiResponse}
                      </ReactMarkdown>
                      {isTyping && <span className="animate-pulse text-purple-400">|</span>}
                    </div>
                  </div>
                )}
              </div>
            )}

            {!query && (
              <div className="text-center py-16">
                <div className="w-20 h-20 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 flex items-center justify-center mx-auto mb-8 shadow-lg shadow-purple-500/20">
                  <Brain className="w-10 h-10 text-white" />
                </div>
                <h1 className="text-4xl font-bold text-white mb-6">What can I help you with?</h1>
                <p className="text-gray-400 text-xl mb-12">
                  Ask me anything about programming, technology, or development
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
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
                      className="p-6 bg-gray-900/30 border border-gray-800/30 rounded-xl hover:border-gray-700/40 hover:bg-gray-900/40 transition-all duration-300 text-left group"
                    >
                      <div className="flex items-center gap-4">
                        <Brain className="w-5 h-5 text-purple-400 group-hover:text-purple-300 transition-colors" />
                        <span className="text-gray-300 group-hover:text-white transition-colors">{example}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sources Sidebar */}
          {sources.length > 0 && (
            <div className="lg:col-span-1">
              <div className="sticky top-24">
                <h3 className="text-base font-medium text-white mb-4 flex items-center">
                  <BookOpen className="w-4 h-4 mr-2 text-purple-400" />
                  Sources
                </h3>
                <div className="space-y-3">
                  {sources.map((source, index) => (
                    <a
                      key={index}
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block p-3 bg-gray-900/30 border border-gray-800/30 rounded-lg hover:border-gray-700/40 hover:bg-gray-900/40 transition-all duration-300 group"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gray-800/50 flex items-center justify-center flex-shrink-0 group-hover:bg-gray-700/50 transition-colors">
                          <Globe className="w-4 h-4 text-gray-400 group-hover:text-gray-300 transition-colors" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-white text-sm font-medium truncate group-hover:text-purple-300 transition-colors">
                            {source.title}
                          </h4>
                          <p className="text-gray-400 text-xs mt-1">{source.domain}</p>
                        </div>
                        <ExternalLink className="w-3.5 h-3.5 text-gray-500 flex-shrink-0 group-hover:text-gray-400 transition-colors" />
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
