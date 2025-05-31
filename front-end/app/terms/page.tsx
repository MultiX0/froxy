"use client"

import { ArrowLeft, Github, FileText, Scale, AlertTriangle, Users } from "lucide-react"
import Link from "next/link"

export default function TermsPage() {
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
              Terms of Service
            </span>
          </h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto leading-relaxed font-mono">
            Please read these terms carefully before using our search engine service.
          </p>
          <p className="text-sm text-gray-400 mt-4 font-mono">Last updated: December 2024</p>
        </div>

        {/* Terms Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
          <div className="bg-gray-900/20 backdrop-blur-sm border border-gray-800/30 rounded-xl p-6 text-center hover:border-gray-700/40 transition-all duration-300">
            <FileText className="w-8 h-8 text-blue-400 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-white mb-2 font-mono">FAIR_USE</h3>
            <p className="text-gray-400 text-sm font-mono">Use our service responsibly and within reasonable limits</p>
          </div>

          <div className="bg-gray-900/20 backdrop-blur-sm border border-gray-800/30 rounded-xl p-6 text-center hover:border-gray-700/40 transition-all duration-300">
            <Scale className="w-8 h-8 text-green-400 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-white mb-2 font-mono">OPEN_SOURCE</h3>
            <p className="text-gray-400 text-sm font-mono">Our code is open source and available on GitHub</p>
          </div>

          <div className="bg-gray-900/20 backdrop-blur-sm border border-gray-800/30 rounded-xl p-6 text-center hover:border-gray-700/40 transition-all duration-300">
            <AlertTriangle className="w-8 h-8 text-yellow-400 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-white mb-2 font-mono">NO_WARRANTY</h3>
            <p className="text-gray-400 text-sm font-mono">Service provided as-is without warranties</p>
          </div>

          <div className="bg-gray-900/20 backdrop-blur-sm border border-gray-800/30 rounded-xl p-6 text-center hover:border-gray-700/40 transition-all duration-300">
            <Users className="w-8 h-8 text-purple-400 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-white mb-2 font-mono">COMMUNITY</h3>
            <p className="text-gray-400 text-sm font-mono">Built for and by the developer community</p>
          </div>
        </div>

        {/* Terms Sections */}
        <div className="space-y-8">
          <div className="bg-gray-900/20 backdrop-blur-sm border border-gray-800/30 rounded-xl p-8">
            <h2 className="text-2xl font-bold text-white mb-6 font-mono">ACCEPTANCE_OF_TERMS</h2>
            <div className="text-gray-300 font-mono text-sm space-y-4">
              <p>
                By accessing and using FROXY, you accept and agree to be bound by the terms and provision of this
                agreement.
              </p>
              <p>If you do not agree to abide by the above, please do not use this service.</p>
            </div>
          </div>

          <div className="bg-gray-900/20 backdrop-blur-sm border border-gray-800/30 rounded-xl p-8">
            <h2 className="text-2xl font-bold text-white mb-6 font-mono">USE_LICENSE</h2>
            <div className="text-gray-300 font-mono text-sm space-y-4">
              <p>
                Permission is granted to temporarily use FROXY for personal, non-commercial transitory viewing only.
                This is the grant of a license, not a transfer of title, and under this license you may not:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Modify or copy the materials</li>
                <li>Use the materials for any commercial purpose or for any public display</li>
                <li>Attempt to reverse engineer any software contained on the website</li>
                <li>Remove any copyright or other proprietary notations from the materials</li>
              </ul>
            </div>
          </div>

          <div className="bg-gray-900/20 backdrop-blur-sm border border-gray-800/30 rounded-xl p-8">
            <h2 className="text-2xl font-bold text-white mb-6 font-mono">ACCEPTABLE_USE</h2>
            <div className="text-gray-300 font-mono text-sm space-y-4">
              <p>
                You agree to use FROXY only for lawful purposes and in a way that does not infringe the rights of others
                or restrict their use and enjoyment of the service.
              </p>
              <p>Prohibited uses include:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Automated scraping or data mining</li>
                <li>Attempting to overwhelm our servers</li>
                <li>Using the service for illegal activities</li>
                <li>Attempting to gain unauthorized access to our systems</li>
              </ul>
            </div>
          </div>

          <div className="bg-gray-900/20 backdrop-blur-sm border border-gray-800/30 rounded-xl p-8">
            <h2 className="text-2xl font-bold text-white mb-6 font-mono">DISCLAIMER</h2>
            <div className="text-gray-300 font-mono text-sm space-y-4">
              <p>
                The materials on FROXY are provided on an 'as is' basis. FROXY makes no warranties, expressed or
                implied, and hereby disclaims and negates all other warranties including without limitation, implied
                warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of
                intellectual property or other violation of rights.
              </p>
              <p>
                Further, FROXY does not warrant or make any representations concerning the accuracy, likely results, or
                reliability of the use of the materials on its website or otherwise relating to such materials or on any
                sites linked to this site.
              </p>
            </div>
          </div>

          <div className="bg-gray-900/20 backdrop-blur-sm border border-gray-800/30 rounded-xl p-8">
            <h2 className="text-2xl font-bold text-white mb-6 font-mono">LIMITATIONS</h2>
            <div className="text-gray-300 font-mono text-sm space-y-4">
              <p>
                In no event shall FROXY or its suppliers be liable for any damages (including, without limitation,
                damages for loss of data or profit, or due to business interruption) arising out of the use or inability
                to use the materials on FROXY, even if FROXY or an authorized representative has been notified orally or
                in writing of the possibility of such damage.
              </p>
              <p>
                Because some jurisdictions do not allow limitations on implied warranties, or limitations of liability
                for consequential or incidental damages, these limitations may not apply to you.
              </p>
            </div>
          </div>

          <div className="bg-gray-900/20 backdrop-blur-sm border border-gray-800/30 rounded-xl p-8">
            <h2 className="text-2xl font-bold text-white mb-6 font-mono">REVISIONS</h2>
            <div className="text-gray-300 font-mono text-sm space-y-4">
              <p>
                The materials appearing on FROXY could include technical, typographical, or photographic errors. FROXY
                does not warrant that any of the materials on its website are accurate, complete, or current.
              </p>
              <p>
                FROXY may make changes to the materials contained on its website at any time without notice. However,
                FROXY does not make any commitment to update the materials.
              </p>
            </div>
          </div>

          <div className="bg-gray-900/20 backdrop-blur-sm border border-gray-800/30 rounded-xl p-8">
            <h2 className="text-2xl font-bold text-white mb-6 font-mono">CONTACT_INFORMATION</h2>
            <div className="text-gray-300 font-mono text-sm">
              <p className="mb-4">If you have questions about these terms of service:</p>
              <div className="space-y-2">
                <p>Email: legal@@froxy.atlasapp.app</p>
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
              <Link href="/privacy" className="hover:text-blue-400 transition-colors duration-200">
                PRIVACY
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
