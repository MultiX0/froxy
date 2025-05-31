"use client"

import { ArrowLeft, Github, Shield, Eye, Lock, Database } from "lucide-react"
import Link from "next/link"

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-black relative overflow-hidden transition-colors duration-500">
      {/* Beautiful Gradient Background */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-blue-500/8 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-1/3 right-1/4 w-[600px] h-[400px] bg-cyan-400/6 rounded-full blur-[140px] animate-pulse"></div>
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-gray-800/50 bg-black/20 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center text-gray-300 hover:text-white transition-colors duration-200 font-mono"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            BACK_TO_SEARCH
          </Link>

          <Link href="/" className="text-2xl font-bold text-blue-400 font-mono">
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
              Privacy Policy
            </span>
          </h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto leading-relaxed font-mono">
            Your privacy is important to us. This policy explains how we collect, use, and protect your information.
          </p>
          <p className="text-sm text-gray-400 mt-4 font-mono">Last updated: December 2024</p>
        </div>

        {/* Privacy Principles */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
          <div className="bg-gray-900/20 backdrop-blur-sm border border-gray-800/30 rounded-xl p-6 text-center hover:border-gray-700/40 transition-all duration-300">
            <Shield className="w-8 h-8 text-green-400 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-white mb-2 font-mono">DATA_PROTECTION</h3>
            <p className="text-gray-400 text-sm font-mono">
              We protect your data with industry-standard security measures
            </p>
          </div>

          <div className="bg-gray-900/20 backdrop-blur-sm border border-gray-800/30 rounded-xl p-6 text-center hover:border-gray-700/40 transition-all duration-300">
            <Eye className="w-8 h-8 text-blue-400 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-white mb-2 font-mono">TRANSPARENCY</h3>
            <p className="text-gray-400 text-sm font-mono">Clear information about what data we collect and why</p>
          </div>

          <div className="bg-gray-900/20 backdrop-blur-sm border border-gray-800/30 rounded-xl p-6 text-center hover:border-gray-700/40 transition-all duration-300">
            <Lock className="w-8 h-8 text-purple-400 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-white mb-2 font-mono">MINIMAL_DATA</h3>
            <p className="text-gray-400 text-sm font-mono">We only collect data necessary for service functionality</p>
          </div>

          <div className="bg-gray-900/20 backdrop-blur-sm border border-gray-800/30 rounded-xl p-6 text-center hover:border-gray-700/40 transition-all duration-300">
            <Database className="w-8 h-8 text-cyan-400 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-white mb-2 font-mono">NO_TRACKING</h3>
            <p className="text-gray-400 text-sm font-mono">We don't track users across websites or sell data (Because we dont know how)</p>
          </div>
        </div>

        {/* Privacy Sections */}
        <div className="space-y-8">
          <div className="bg-gray-900/20 backdrop-blur-sm border border-gray-800/30 rounded-xl p-8">
            <h2 className="text-2xl font-bold text-white mb-6 font-mono">INFORMATION_WE_COLLECT</h2>
            <div className="space-y-4 text-gray-300 font-mono text-sm">
              <div>
                <h4 className="text-white font-bold mb-2">Search Queries</h4>
                <p>
                  We temporarily store search queries to provide results and improve our search algorithms. Queries are
                  not linked to personal identifiers.
                </p>
              </div>
              <div>
                <h4 className="text-white font-bold mb-2">Usage Analytics</h4>
                <p>
                  We collect anonymous usage statistics to understand how our service is used and to improve
                  performance.
                </p>
              </div>
              <div>
                <h4 className="text-white font-bold mb-2">Technical Information</h4>
                <p>
                  Basic technical information like IP addresses and browser types for security and optimization
                  purposes.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gray-900/20 backdrop-blur-sm border border-gray-800/30 rounded-xl p-8">
            <h2 className="text-2xl font-bold text-white mb-6 font-mono">HOW_WE_USE_INFORMATION</h2>
            <div className="space-y-4 text-gray-300 font-mono text-sm">
              <div>
                <h4 className="text-white font-bold mb-2">Service Provision</h4>
                <p>To provide search results and maintain the functionality of our search engine.</p>
              </div>
              <div>
                <h4 className="text-white font-bold mb-2">Service Improvement</h4>
                <p>To analyze usage patterns and improve our search algorithms and user experience.</p>
              </div>
              <div>
                <h4 className="text-white font-bold mb-2">Security</h4>
                <p>To protect our service from abuse, spam, and security threats.</p>
              </div>
            </div>
          </div>

          <div className="bg-gray-900/20 backdrop-blur-sm border border-gray-800/30 rounded-xl p-8">
            <h2 className="text-2xl font-bold text-white mb-6 font-mono">DATA_RETENTION</h2>
            <div className="space-y-4 text-gray-300 font-mono text-sm">
              <p>We retain data only as long as necessary to provide our services:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Search queries: Anonymized after 30 days</li>
                <li>Usage analytics: Aggregated data retained for service improvement</li>
                <li>Technical logs: Automatically deleted after 90 days</li>
              </ul>
            </div>
          </div>

          <div className="bg-gray-900/20 backdrop-blur-sm border border-gray-800/30 rounded-xl p-8">
            <h2 className="text-2xl font-bold text-white mb-6 font-mono">THIRD_PARTY_SERVICES</h2>
            <div className="space-y-4 text-gray-300 font-mono text-sm">
              <p>We use minimal third-party services:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Vercel for hosting and deployment</li>
                <li>No advertising networks or tracking services</li>
                <li>No social media integrations that track users</li>
              </ul>
            </div>
          </div>

          <div className="bg-gray-900/20 backdrop-blur-sm border border-gray-800/30 rounded-xl p-8">
            <h2 className="text-2xl font-bold text-white mb-6 font-mono">YOUR_RIGHTS</h2>
            <div className="space-y-4 text-gray-300 font-mono text-sm">
              <p>You have the right to:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Request information about data we collect</li>
                <li>Request deletion of your data</li>
                <li>Opt out of analytics collection</li>
                <li>Contact us with privacy concerns</li>
              </ul>
            </div>
          </div>

          <div className="bg-gray-900/20 backdrop-blur-sm border border-gray-800/30 rounded-xl p-8">
            <h2 className="text-2xl font-bold text-white mb-6 font-mono">CONTACT_US</h2>
            <div className="text-gray-300 font-mono text-sm">
              <p className="mb-4">If you have questions about this privacy policy or our data practices:</p>
              <div className="space-y-2">
                <p>Email: privacy@froxy.atlasapp.app</p>
                <p>
                  GitHub:{" "}
                  <a href="https://github.com/MultiX0/froxy" className="text-blue-400 hover:text-blue-300">
                    github.com/MultiX0/froxy
                  </a>
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-gray-800/50 py-8 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="text-gray-400 text-sm font-mono">© 2024 FROXY. Built with ❤️ for developers.</div>
            <div className="flex space-x-6 text-xs text-gray-500 font-mono">
              <Link href="/about" className="hover:text-blue-400 transition-colors duration-200">
                ABOUT
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
