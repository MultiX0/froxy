"use client"

import Link from "next/link"
import { ArrowLeft, Shield, Eye, Lock, Database, Clock, UserCheck } from "lucide-react"

const privacyItems = [
  {
    icon: Database,
    title: "Data Collection",
    content:
      "We collect minimal data: search queries for improving results, basic usage analytics, and optional account information. No personal data is collected without explicit consent.",
  },
  {
    icon: Eye,
    title: "Data Usage",
    content:
      "Your data enhances search algorithms and user experience. We never sell, rent, or share personal information with third parties for marketing purposes.",
  },
  {
    icon: Lock,
    title: "Security & Storage",
    content:
      "All data is encrypted in transit and at rest using industry-standard AES-256 encryption. Our servers are hosted in secure, SOC 2 compliant data centers.",
  },
  {
    icon: Clock,
    title: "Data Retention",
    content:
      "Search queries are anonymized after 30 days. Account data is retained until deletion is requested. Inactive accounts are automatically purged after 24 months.",
  },
  {
    icon: UserCheck,
    title: "Your Rights",
    content:
      "You have full control over your data: access, modify, export, or delete at any time. Contact our privacy team for immediate assistance with data requests.",
  },
  {
    icon: Shield,
    title: "Third-Party Services",
    content:
      "We use select partners for hosting and analytics, all bound by strict privacy agreements. No data is shared without your explicit consent and our oversight.",
  },
]

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-black relative overflow-hidden py-8 px-4">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-green-500/10 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-1/3 right-1/4 w-80 h-80 bg-blue-400/8 rounded-full blur-[120px] animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 right-1/3 w-72 h-72 bg-cyan-500/8 rounded-full blur-[120px] animate-pulse delay-2000"></div>
      </div>

      <div className="relative z-10 max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <Link
            href="/"
            className="inline-flex items-center px-6 py-3 text-sm text-gray-300 bg-white/5 backdrop-blur-xl border border-white/10 rounded-full hover:bg-white/10 hover:text-white transition-all duration-300 font-mono mb-12 group"
          >
            <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
            Back to Search
          </Link>

          <div className="space-y-6">
            <div className="flex items-center justify-center mb-6">
              <Shield className="w-12 h-12 text-green-400 mr-4" />
              <h1 className="text-6xl md:text-8xl font-bold">
                <span className="bg-gradient-to-r from-green-400 via-blue-500 to-cyan-400 bg-clip-text text-transparent animate-gradient-x bg-[length:200%_200%]">
                  Privacy
                </span>
              </h1>
            </div>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed">
              Your privacy is our priority. Here's how we protect and handle your data.
            </p>
          </div>
        </div>

        {/* Privacy Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-16">
          {privacyItems.map((item, index) => {
            const IconComponent = item.icon
            return (
              <div
                key={index}
                className="group p-8 bg-gradient-to-br from-white/5 to-white/10 backdrop-blur-xl border border-white/10 rounded-3xl hover:border-green-500/30 transition-all duration-500 hover:scale-[1.02]"
              >
                <div className="flex items-start space-x-4">
                  <div className="p-3 bg-green-500/20 rounded-2xl group-hover:scale-110 transition-transform flex-shrink-0">
                    <IconComponent className="w-6 h-6 text-green-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-white mb-3">{item.title}</h3>
                    <p className="text-gray-300 leading-relaxed text-sm">{item.content}</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Contact Section */}
        <div className="text-center p-12 bg-gradient-to-br from-green-500/10 to-blue-500/10 backdrop-blur-xl border border-white/10 rounded-3xl">
          <h2 className="text-3xl font-bold text-white mb-4">Questions About Privacy?</h2>
          <p className="text-gray-300 mb-6 max-w-2xl mx-auto">
            Our privacy team is here to help. Contact us anytime for questions about your data or privacy rights.
          </p>
          <div className="inline-flex items-center px-6 py-3 bg-green-500/20 border border-green-500/30 rounded-full text-green-400 font-mono text-sm">
            privacy@froxy.com
          </div>
        </div>

        {/* Last Updated */}
        <div className="text-center mt-12">
          <div className="inline-flex items-center px-6 py-3 text-sm text-gray-400 bg-white/5 backdrop-blur-xl border border-white/10 rounded-full font-mono">
            Last updated: January 2025
          </div>
        </div>
      </div>
    </div>
  )
}
