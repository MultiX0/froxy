"use client"

import Link from "next/link"
import { ArrowLeft, FileText, Scale, Users, AlertTriangle, Gavel, BookOpen } from "lucide-react"

const termsItems = [
  {
    icon: BookOpen,
    title: "Acceptance of Terms",
    content:
      "By accessing FROXY, you agree to these terms. If you disagree with any part, please discontinue use immediately.",
  },
  {
    icon: Scale,
    title: "License to Use",
    content:
      "We grant you a limited, non-exclusive license to use FROXY for personal and commercial purposes, subject to these terms.",
  },
  {
    icon: Users,
    title: "User Responsibilities",
    content:
      "Users must not misuse the service, violate laws, or infringe on others' rights. Respect the community and use FROXY responsibly.",
  },
  {
    icon: AlertTriangle,
    title: "Service Availability",
    content:
      "We strive for 99.9% uptime but cannot guarantee uninterrupted service. Maintenance and updates may cause temporary downtime.",
  },
  {
    icon: Gavel,
    title: "Intellectual Property",
    content:
      "FROXY's content, features, and technology are protected by intellectual property laws. Users retain rights to their submitted content.",
  },
  {
    icon: FileText,
    title: "Limitation of Liability",
    content:
      "FROXY is provided 'as-is'. We're not liable for damages arising from use, though we work hard to provide reliable service.",
  },
]

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-black relative overflow-hidden py-8 px-4">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-1/3 right-1/4 w-80 h-80 bg-pink-400/8 rounded-full blur-[120px] animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 right-1/3 w-72 h-72 bg-blue-500/8 rounded-full blur-[120px] animate-pulse delay-2000"></div>
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
              <FileText className="w-12 h-12 text-purple-400 mr-4" />
              <h1 className="text-6xl md:text-8xl font-bold">
                <span className="bg-gradient-to-r from-purple-400 via-pink-500 to-blue-400 bg-clip-text text-transparent animate-gradient-x bg-[length:200%_200%]">
                  Terms
                </span>
              </h1>
            </div>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed">
              Clear, fair terms that protect both you and our service.
            </p>
          </div>
        </div>

        {/* Terms Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-16">
          {termsItems.map((item, index) => {
            const IconComponent = item.icon
            return (
              <div
                key={index}
                className="group p-8 bg-gradient-to-br from-white/5 to-white/10 backdrop-blur-xl border border-white/10 rounded-3xl hover:border-purple-500/30 transition-all duration-500 hover:scale-[1.02]"
              >
                <div className="flex items-start space-x-4">
                  <div className="p-3 bg-purple-500/20 rounded-2xl group-hover:scale-110 transition-transform flex-shrink-0">
                    <IconComponent className="w-6 h-6 text-purple-400" />
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

        {/* Additional Terms */}
        <div className="space-y-6 mb-16">
          <div className="p-8 bg-gradient-to-br from-white/5 to-white/10 backdrop-blur-xl border border-white/10 rounded-3xl">
            <h3 className="text-2xl font-bold text-white mb-4">Modifications & Updates</h3>
            <p className="text-gray-300 leading-relaxed">
              We may update these terms occasionally to reflect service changes or legal requirements. Significant
              changes will be communicated via email or website notification at least 30 days in advance.
            </p>
          </div>

          <div className="p-8 bg-gradient-to-br from-white/5 to-white/10 backdrop-blur-xl border border-white/10 rounded-3xl">
            <h3 className="text-2xl font-bold text-white mb-4">Governing Law</h3>
            <p className="text-gray-300 leading-relaxed">
              These terms are governed by applicable laws. Any disputes will be resolved through binding arbitration or
              in courts of competent jurisdiction, depending on the nature and scope of the dispute.
            </p>
          </div>
        </div>

        {/* Contact Section */}
        <div className="text-center p-12 bg-gradient-to-br from-purple-500/10 to-pink-500/10 backdrop-blur-xl border border-white/10 rounded-3xl">
          <h2 className="text-3xl font-bold text-white mb-4">Questions About Terms?</h2>
          <p className="text-gray-300 mb-6 max-w-2xl mx-auto">
            Our legal team is available to clarify any terms or answer questions about your rights and obligations.
          </p>
          <div className="inline-flex items-center px-6 py-3 bg-purple-500/20 border border-purple-500/30 rounded-full text-purple-400 font-mono text-sm">
            legal@froxy.com
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
