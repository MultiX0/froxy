"use client"

import { useState, useEffect } from "react"
import { ArrowLeft, Github, Database, Search, Zap, Globe, Users } from "lucide-react"
import Link from "next/link"

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

export default function AboutPage() {
  const [resultsCount, setResultsCount] = useState(0)
  const [isLoadingCount, setIsLoadingCount] = useState(true)

  // Fetch results count from our backend API
  useEffect(() => {
    const fetchResultsCount = async () => {
      try {
        setIsLoadingCount(true)
        const response = await fetch("/api/results-count")

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const data = await response.json()
        setResultsCount(data.count || 0)
      } catch (error) {
        console.error("Failed to fetch results count:", error)
        setResultsCount(64000) // fallback
      } finally {
        setIsLoadingCount(false)
      }
    }

    fetchResultsCount()
  }, [])

  return (
    <div className="min-h-screen bg-black relative overflow-hidden transition-colors duration-500">
      {/* Beautiful Gradient Background */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-blue-500/8 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-1/3 right-1/4 w-[600px] h-[400px] bg-cyan-400/6 rounded-full blur-[140px] animate-pulse"></div>
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-gray-800/50 bg-black/20 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-0">
          <Link
            href="/"
            className="flex items-center text-gray-300 hover:text-white transition-colors duration-200 font-mono text-sm sm:text-base"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            BACK_TO_SEARCH
          </Link>

          <Link href="/" className="text-xl sm:text-2xl font-bold text-blue-400 font-mono">
            FROXY
          </Link>

          <a
            href="https://github.com/MultiX0/froxy"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center px-4 py-2 text-sm text-gray-300 bg-gray-800/30 backdrop-blur-sm border border-gray-700/30 rounded-full hover:bg-gray-700/40 hover:border-gray-600/50 hover:text-white transition-all duration-200 font-mono"
          >
            <Github className="w-4 h-4 mr-2" />
            SOURCE_CODE
          </a>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 py-12">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-4xl sm:text-6xl font-bold text-white mb-6 tracking-tight">
            <span className="bg-gradient-to-r from-blue-400 via-blue-500 to-cyan-400 bg-clip-text text-transparent">
              About FROXY
            </span>
          </h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto leading-relaxed font-mono">
            A powerful search engine designed to help developers find exactly what they're looking for.
          </p>
        </div>

        {/* Stats Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          <div className="bg-gray-900/20 backdrop-blur-sm border border-gray-800/30 rounded-xl p-6 text-center hover:border-gray-700/40 transition-all duration-300">
            <Database className="w-8 h-8 text-blue-400 mx-auto mb-4" />
            <div className="text-2xl font-bold text-white mb-2 font-mono">
              {isLoadingCount ? (
                <div className="flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin"></div>
                </div>
              ) : (
                formatNumber(resultsCount)
              )}
            </div>
            <p className="text-gray-400 text-sm font-mono">INDEXED_RESULTS</p>
          </div>

          <div className="bg-gray-900/20 backdrop-blur-sm border border-gray-800/30 rounded-xl p-6 text-center hover:border-gray-700/40 transition-all duration-300">
            <Zap className="w-8 h-8 text-cyan-400 mx-auto mb-4" />
            <div className="text-2xl font-bold text-white mb-2 font-mono">{"<50ms"}</div>
            <p className="text-gray-400 text-sm font-mono">SEARCH_SPEED</p>
          </div>

          <div className="bg-gray-900/20 backdrop-blur-sm border border-gray-800/30 rounded-xl p-6 text-center hover:border-gray-700/40 transition-all duration-300">
            <Globe className="w-8 h-8 text-green-400 mx-auto mb-4" />
            <div className="text-2xl font-bold text-white mb-2 font-mono">24/7</div>
            <p className="text-gray-400 text-sm font-mono">AVAILABILITY</p>
          </div>
        </div>

        {/* Features Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
          <div className="bg-gray-900/20 backdrop-blur-sm border border-gray-800/30 rounded-xl p-8 hover:border-gray-700/40 transition-all duration-300">
            <Search className="w-10 h-10 text-blue-400 mb-6" />
            <h3 className="text-xl font-bold text-white mb-4 font-mono">BASIC_SEARCH</h3>
            <p className="text-gray-300 leading-relaxed font-mono text-sm">
              Basic searching algorithm that Google used to use in the back days (and you can add more stuff)
            </p>
          </div>

          <div className="bg-gray-900/20 backdrop-blur-sm border border-gray-800/30 rounded-xl p-8 hover:border-gray-700/40 transition-all duration-300">
            <Zap className="w-10 h-10 text-cyan-400 mb-6" />
            <h3 className="text-xl font-bold text-white mb-4 font-mono">MODERATE_SPEED</h3>
            <p className="text-gray-300 leading-relaxed font-mono text-sm">
              Not that fast, I used Node.js in the backend and in the future I will switch it to Golang for faster results
            </p>
          </div>

          <div className="bg-gray-900/20 backdrop-blur-sm border border-gray-800/30 rounded-xl p-8 hover:border-gray-700/40 transition-all duration-300">
            <Database className="w-10 h-10 text-green-400 mb-6" />
            <h3 className="text-xl font-bold text-white mb-4 font-mono">WEB_RESOURCES</h3>
            <p className="text-gray-300 leading-relaxed font-mono text-sm">
              Resources from all the web (we don't collect specific results)
            </p>
          </div>

          <div className="bg-gray-900/20 backdrop-blur-sm border border-gray-800/30 rounded-xl p-8 hover:border-gray-700/40 transition-all duration-300">
            <Users className="w-10 h-10 text-purple-400 mb-6" />
            <h3 className="text-xl font-bold text-white mb-4 font-mono">DEVELOPER_FOCUSED</h3>
            <p className="text-gray-300 leading-relaxed font-mono text-sm">
              Built by developers, for developers. Understanding the unique needs of the programming community and
              delivering targeted results.
            </p>
          </div>
        </div>

        {/* Mission Section */}
        <div className="bg-gray-900/20 backdrop-blur-sm border border-gray-800/30 rounded-xl p-8 mb-16">
          <h2 className="text-2xl font-bold text-white mb-6 text-center font-mono">OUR_MISSION</h2>
          <p className="text-gray-300 leading-relaxed text-center max-w-3xl mx-auto font-mono">
            Create something fun and large scale in the future with your help since it is an open source project. I made it in 3 days just for fun and learning how search engines work
          </p>
        </div>

        {/* Technology Section */}
        <div className="bg-gray-900/20 backdrop-blur-sm border border-gray-800/30 rounded-xl p-8">
          <h2 className="text-2xl font-bold text-white mb-6 text-center font-mono">TECHNOLOGY_STACK</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div className="p-4">
              <div className="text-blue-400 font-mono font-bold">NEXT.JS</div>
              <div className="text-gray-400 text-sm font-mono">Frontend</div>
            </div>
            <div className="p-4">
              <div className="text-green-400 font-mono font-bold">NODE.JS</div>
              <div className="text-gray-400 text-sm font-mono">Indexer/Search</div>
            </div>
            <div className="p-4">
              <div className="text-purple-400 font-mono font-bold">GO</div>
              <div className="text-gray-400 text-sm font-mono">Spider</div>
            </div>
            <div className="p-4">
              <div className="text-cyan-400 font-mono font-bold">POSTGRESQL</div>
              <div className="text-gray-400 text-sm font-mono">Database</div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-gray-800/50 py-8 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="text-gray-400 text-sm font-mono">© {new Date().getFullYear()} FROXY. Built with ❤️ for developers.</div>
            <div className="flex space-x-6 text-xs text-gray-500 font-mono">
              <Link href="/privacy" className="hover:text-blue-400 transition-colors duration-200">
                PRIVACY
              </Link>
              <Link href="/terms" className="hover:text-blue-400 transition-colors duration-200">
                TERMS
              </Link>
              <a
                href="https://github.com/MultiX0/froxy"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-blue-400 transition-colors duration-200"
              >
                GITHUB
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}