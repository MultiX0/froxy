"use client";

import type React from "react";
import { useState, useEffect, useRef } from "react";
import { Search, Github, ArrowRight, Brain, Sparkles, Zap } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";

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
];

const placeholderTexts = ["Search anything...", "Ask me anything..."];

const taglineTexts = [
  "Where curiosity meets answers",
  "Discover the world of knowledge",
  "Your gateway to infinite possibilities",
  "Explore, learn, and grow",
  "Knowledge at your fingertips",
  "Unleash the power of search",
  "Find what you're looking for",
  "Your intelligent search companion",
];

const formatNumber = (num: number): string => {
  if (num >= 1000000000) {
    return (num / 1000000000).toFixed(1).replace(/\.0$/, "") + "B";
  }
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1).replace(/\.0$/, "") + "M";
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1).replace(/\.0$/, "") + "k";
  }
  return num.toString();
};

export default function FroxySearch() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [selectedSuggestion, setSelectedSuggestion] = useState(-1);
  const [currentPlaceholder, setCurrentPlaceholder] = useState("");
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [currentTagline, setCurrentTagline] = useState("");
  const [taglineIndex, setTaglineIndex] = useState(0);
  const [isTaglineTransitioning, setIsTaglineTransitioning] = useState(false);
  const [searchMode, setSearchMode] = useState<"search" | "ai">("search");
  const router = useRouter();
  const [resultsCount, setResultsCount] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [isLoadingCount, setIsLoadingCount] = useState(true);
  const [fuzzySearch, setFuzzySearch] = useState(false);

  // Initialize with random placeholder and tagline
  useEffect(() => {
    const randomPlaceholderIndex = Math.floor(
      Math.random() * placeholderTexts.length
    );
    const randomTaglineIndex = Math.floor(Math.random() * taglineTexts.length);
    setPlaceholderIndex(randomPlaceholderIndex);
    setCurrentPlaceholder(placeholderTexts[randomPlaceholderIndex]);
    setTaglineIndex(randomTaglineIndex);
    setCurrentTagline(taglineTexts[randomTaglineIndex]);
  }, []);

  // Cycle through placeholders
  useEffect(() => {
    const interval = setInterval(() => {
      setIsTransitioning(true);
      setTimeout(() => {
        setPlaceholderIndex((prev) => (prev + 1) % placeholderTexts.length);
        setIsTransitioning(false);
      }, 200);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  // Cycle through taglines
  useEffect(() => {
    const interval = setInterval(() => {
      setIsTaglineTransitioning(true);
      setTimeout(() => {
        setTaglineIndex((prev) => (prev + 1) % taglineTexts.length);
        setIsTaglineTransitioning(false);
      }, 300);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!isTransitioning) {
      setCurrentPlaceholder(placeholderTexts[placeholderIndex]);
    }
  }, [placeholderIndex, isTransitioning]);

  useEffect(() => {
    if (!isTaglineTransitioning) {
      setCurrentTagline(taglineTexts[taglineIndex]);
    }
  }, [taglineIndex, isTaglineTransitioning]);

  useEffect(() => {
    if (searchQuery.length > 0) {
      const filtered = searchSuggestions
        .filter((suggestion) =>
          suggestion.toLowerCase().includes(searchQuery.toLowerCase())
        )
        .slice(0, 5);
      setSuggestions(filtered);
    } else {
      setSuggestions([]);
    }
    setSelectedSuggestion(-1);
  }, [searchQuery]);

  // Fetch results count
  useEffect(() => {
    const fetchResultsCount = async () => {
      try {
        setIsLoadingCount(true);
        const response = await fetch("/api/results-count");
        if (response.ok) {
          const data = await response.json();
          setResultsCount(data.count || 0);
        }
      } catch (error) {
        console.error("Failed to fetch results count:", error);
        setResultsCount(64000);
      } finally {
        setIsLoadingCount(false);
      }
    };
    fetchResultsCount();
  }, []);

  const toggleFuzzySearch = () => {
    setFuzzySearch(!fuzzySearch);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const query =
      selectedSuggestion >= 0 ? suggestions[selectedSuggestion] : searchQuery;
    if (query.trim()) {
      if (searchMode === "ai") {
        router.push(
          `/signin?redirect=${encodeURIComponent(
            `/ai-search?q=${encodeURIComponent(query.trim())}`
          )}`
        );
      } else {
        router.push(
          `/search?q=${encodeURIComponent(query.trim())}&fuzzy=${fuzzySearch}`
        );
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedSuggestion((prev) =>
        prev < suggestions.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedSuggestion((prev) => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === "Enter" && selectedSuggestion >= 0) {
      e.preventDefault();
      const suggestion = suggestions[selectedSuggestion];
      setSearchQuery(suggestion);
      if (searchMode === "ai") {
        router.push(
          `/signin?redirect=${encodeURIComponent(
            `/ai-search?q=${encodeURIComponent(suggestion.trim())}`
          )}`
        );
      } else {
        router.push(
          `/search?q=${encodeURIComponent(
            suggestion.trim()
          )}&fuzzy=${fuzzySearch}`
        );
      }
    }
  };

  const selectSuggestion = (suggestion: string) => {
    setSearchQuery(suggestion);
    setSuggestions([]);
    setIsFocused(false);
    if (searchMode === "ai") {
      router.push(
        `/signin?redirect=${encodeURIComponent(
          `/ai-search?q=${encodeURIComponent(suggestion.trim())}`
        )}`
      );
    } else {
      router.push(
        `/search?q=${encodeURIComponent(
          suggestion.trim()
        )}&fuzzy=${fuzzySearch}`
      );
    }
  };

  type HealthStatus = "connecting" | "online" | "offline";
  const [healthStatus, setHealthStatus] = useState<HealthStatus>("connecting");
  // Health check function
  const checkHealth = async () => {
    try {
      setHealthStatus("connecting");
      const response = await fetch("/api/health", {
        method: "GET",
        cache: "no-cache",
      });

      if (response.ok) {
        const data = await response.json();
        if (data.status === "healthy") {
          setHealthStatus("online");
        } else {
          setHealthStatus("offline");
        }
      } else {
        setHealthStatus("offline");
      }
    } catch (error) {
      console.error("Health check failed:", error);
      setHealthStatus("offline");
    }
  };
  useEffect(() => {
    checkHealth();

    const healthInterval = setInterval(() => {
      checkHealth();
    }, 60000); // Check every one minute

    return () => clearInterval(healthInterval);
  }, []);

  return (
    <div className="min-h-screen bg-black relative overflow-hidden flex flex-col items-center justify-center px-4">
      {/* Enhanced Background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/8 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-1/3 right-1/4 w-80 h-80 bg-purple-500/6 rounded-full blur-[140px] animate-pulse"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-gradient-to-r from-blue-500/4 to-purple-500/4 rounded-full blur-[160px]"></div>
      </div>

{/* Search Mode Toggle */}
<div className="mb-6">
  <div className="inline-flex items-center bg-gray-900/40 backdrop-blur-xl border border-gray-700/30 rounded-full p-1">
    <button
      onClick={() => setSearchMode("search")}
      className={`flex items-center px-5 py-3 rounded-full text-l font-mono transition-all duration-200 ${
        searchMode === "search"
          ? "bg-blue-500 text-white shadow-lg"
          : "text-gray-400 hover:text-white"
      }`}
    >
      <Search className="w-4 h-4 mr-1.5" />
      Search
    </button>
    <button
      onClick={() => setSearchMode("ai")}
      className={`flex items-center px-5 py-3 rounded-full text-l font-mono transition-all duration-200 ${
        searchMode === "ai"
          ? "bg-purple-500 text-white shadow-lg"
          : "text-gray-400 hover:text-white"
      }`}
    >
      <Brain className="w-4 h-4 mr-1.5" />
      Ask AI
    </button>
  </div>
</div>      {/* Main Content */}
      <div className="relative z-10 w-full max-w-2xl mx-auto text-center">
        {/* Logo */}
        <div className="mb-10">
          <h1 className="text-7xl font-bold text-white dark:text-white tracking-tight transition-colors duration-500 mb-2">
            <span className="text-7xl bg-gradient-to-r from-blue-400 via-blue-500 to-cyan-400 dark:from-blue-400 dark:via-blue-500 dark:to-cyan-400 bg-clip-text text-transparent drop-shadow-2xl">
              FROXY
            </span>
          </h1>
          <p
            className={`text-gray-400 text-xl font-mono transition-all duration-500 ${
              isTaglineTransitioning
                ? "opacity-0 transform translate-y-2"
                : "opacity-100 transform translate-y-0"
            }`}
          >
            {currentTagline}
          </p>
        </div>

        {/* Search Bar with Suggestions */}
        <form
          onSubmit={handleSearch}
          className="mb-8 relative max-w-xl mx-auto"
        >
          <div className="relative">
            <div
              className={`relative bg-gray-900/40 backdrop-blur-xl border rounded-2xl sm:rounded-full transition-all duration-300 ${
                isFocused
                  ? searchMode === "ai"
                    ? "border-purple-500/50 shadow-lg shadow-purple-500/20"
                    : "border-blue-500/50 shadow-lg shadow-blue-500/20"
                  : "border-gray-700/30 hover:border-gray-600/50"
              }`}
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
                        isFocused ? "text-purple-400" : "text-gray-500"
                      }`}
                    />
                  ) : (
                    <Search
                      className={`w-5 h-5 transition-colors duration-300 ${
                        isFocused ? "text-blue-400" : "text-gray-500"
                      }`}
                    />
                  )}
                  {isFocused && (
                    <Zap
                      className={`w-3 h-3 ${
                        searchMode === "ai"
                          ? "text-purple-400"
                          : "text-blue-400"
                      } animate-pulse`}
                    />
                  )}
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
                  className={`w-full py-4 sm:py-5 pl-16 sm:pl-20 pr-12 sm:pr-16 bg-transparent text-white text-base sm:text-lg outline-none focus:outline-none focus:ring-0 focus:border-transparent active:outline-none transition-all duration-500 font-mono placeholder:transition-all placeholder:duration-400 placeholder:ease-in-out ${
                    isTransitioning
                      ? "placeholder:opacity-0 placeholder:transform placeholder:translate-y-2"
                      : "placeholder:opacity-100 placeholder:transform placeholder:translate-y-0 placeholder-gray-400"
                  }`}
                  style={{
                    outline: "none",
                    boxShadow: "none",
                    WebkitAppearance: "none",
                    MozAppearance: "none",
                    appearance: "none",
                  }}
                />

                {/* Fuzzy Search Toggle - only show for normal search */}
                {searchMode === "search" && (
                  <div
                    className="absolute right-14 sm:right-16 flex items-center cursor-pointer"
                    onClick={toggleFuzzySearch}
                  >
                    <div
                      className={`w-8 h-4 rounded-full transition-colors duration-300 flex items-center ${
                        fuzzySearch ? "bg-blue-500" : "bg-gray-700"
                      }`}
                    >
                      <div
                        className={`w-3 h-3 rounded-full bg-white transform transition-transform duration-300 ${
                          fuzzySearch ? "translate-x-4" : "translate-x-1"
                        }`}
                      ></div>
                    </div>
                    <Sparkles
                      className={`ml-1.5 w-3.5 h-3.5 ${
                        fuzzySearch ? "text-blue-400" : "text-gray-500"
                      }`}
                    />
                  </div>
                )}

                <button
                  type="submit"
                  className={`absolute right-2 sm:right-3 p-2 sm:p-2.5 rounded-full transition-all duration-300 outline-none focus:outline-none focus:ring-0 ${
                    searchQuery.length > 0
                      ? searchMode === "ai"
                        ? "bg-purple-500 hover:bg-purple-600 text-white shadow-lg shadow-purple-500/25"
                        : "bg-blue-500 hover:bg-blue-600 text-white shadow-lg shadow-blue-500/25"
                      : "bg-gray-700/50 text-gray-400"
                  }`}
                  style={{ outline: "none", boxShadow: "none" }}
                >
                  <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>
            </div>

            {/* Suggestions */}
            {suggestions.length > 0 && isFocused && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-gray-900/95 backdrop-blur-xl border border-gray-700/50 rounded-xl shadow-2xl overflow-hidden z-50">
                {suggestions.map((suggestion, index) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => selectSuggestion(suggestion)}
                    className={`w-full text-left px-6 py-4 text-base transition-colors duration-150 font-mono ${
                      index === selectedSuggestion
                        ? searchMode === "ai"
                          ? "bg-purple-500/20 text-purple-300"
                          : "bg-blue-500/20 text-blue-300"
                        : "text-gray-300 hover:bg-gray-800/50 hover:text-white"
                    }`}
                  >
                    {searchMode === "ai" ? (
                      <Brain className="inline w-4 h-4 mr-3 text-gray-500" />
                    ) : (
                      <Search className="inline w-4 h-4 mr-3 text-gray-500" />
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

            {/* Status display with proper conditional classes */}
            {healthStatus === "connecting" && (
              <div className="flex items-center px-4 sm:px-6 py-2 sm:py-2.5 text-sm text-orange-400/70 bg-orange-500/10 backdrop-blur-sm border border-orange-500/20 rounded-full font-mono">
                <div className="w-2 h-2 bg-orange-400 rounded-full mr-2 animate-pulse"></div>
                CONNECTING
              </div>
            )}

            {healthStatus === "online" && (
              <div className="flex items-center px-4 sm:px-6 py-2 sm:py-2.5 text-sm text-blue-400/70 bg-blue-500/10 backdrop-blur-sm border border-blue-500/20 rounded-full font-mono">
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

            {/* Fuzzy Search Status */}
            {fuzzySearch && (
              <div className="flex items-center px-4 sm:px-6 py-2 sm:py-2.5 text-sm text-purple-400/70 bg-purple-500/10 backdrop-blur-sm border border-purple-500/20 rounded-full font-mono">
                <Sparkles className="w-3.5 h-3.5 mr-2 text-purple-400" />
                FUZZY SEARCH
              </div>
            )}
          </div>

          {/* Second row: Results counter */}
          <div className="flex items-center px-4 sm:px-6 py-2 sm:py-2.5 text-sm text-gray-300 dark:text-gray-300 bg-gray-800/20 dark:bg-gray-800/20 backdrop-blur-sm border border-gray-700/20 dark:border-gray-700/20 rounded-full transition-all duration-200 font-mono">
            {isLoadingCount ? (
              <>
                <div className="w-4 h-4 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin mr-2"></div>
                <span className="text-gray-400">Loading...</span>
              </>
            ) : (
              <>
                <span className="text-blue-400/80">
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
  );
}
