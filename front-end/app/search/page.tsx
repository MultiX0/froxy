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
  Calendar,
  Users,
  FileText,
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

// Expanded mock search results data for pagination testing
const generateSearchResults = (query: string) => {
  const baseResults = [
    // JavaScript Results (20 results)
    {
      title: "Understanding Modern JavaScript Features",
      url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript",
      description:
        "Learn about the latest JavaScript features including async/await, destructuring, spread operators, and more. Comprehensive guide for developers.",
      tags: ["JavaScript", "Web Development", "Programming"],
      fetchData: {
        lastUpdated: "2023-11-15",
        readTime: "12 min read",
        contentType: "Documentation",
        popularity: "4.9/5",
      },
    },
    {
      title: "React.js - A JavaScript library for building user interfaces",
      url: "https://reactjs.org",
      description:
        "React makes it painless to create interactive UIs. Design simple views for each state in your application, and React will efficiently update and render just the right components when your data changes.",
      tags: ["React", "JavaScript", "Frontend"],
      fetchData: {
        lastUpdated: "2023-12-01",
        readTime: "8 min read",
        contentType: "Documentation",
        popularity: "4.8/5",
      },
    },
    {
      title: "Node.js - JavaScript runtime built on Chrome's V8 engine",
      url: "https://nodejs.org",
      description:
        "Node.js is a JavaScript runtime built on Chrome's V8 JavaScript engine. Node.js uses an event-driven, non-blocking I/O model that makes it lightweight and efficient.",
      tags: ["Node.js", "JavaScript", "Backend"],
      fetchData: {
        lastUpdated: "2023-10-28",
        readTime: "10 min read",
        contentType: "Documentation",
        popularity: "4.7/5",
      },
    },
    {
      title: "TypeScript - JavaScript with syntax for types",
      url: "https://www.typescriptlang.org",
      description:
        "TypeScript is a strongly typed programming language that builds on JavaScript, giving you better tooling at any scale. Add TypeScript to your project for enhanced developer experience.",
      tags: ["TypeScript", "JavaScript", "Programming"],
      fetchData: {
        lastUpdated: "2023-11-05",
        readTime: "15 min read",
        contentType: "Documentation",
        popularity: "4.6/5",
      },
    },
    {
      title: "Next.js - The React Framework for Production",
      url: "https://nextjs.org",
      description:
        "Next.js gives you the best developer experience with all the features you need for production: hybrid static & server rendering, TypeScript support, smart bundling, route pre-fetching, and more.",
      tags: ["Next.js", "React", "Framework"],
      fetchData: {
        lastUpdated: "2023-12-10",
        readTime: "11 min read",
        contentType: "Documentation",
        popularity: "4.9/5",
      },
    },
    {
      title: "JavaScript Promises: An Introduction",
      url: "https://web.dev/articles/promises",
      description:
        "Promises simplify deferred and asynchronous computations. A promise represents an operation that hasn't completed yet. This guide explains how to use promises effectively in your JavaScript code.",
      tags: ["JavaScript", "Promises", "Async"],
      fetchData: { lastUpdated: "2023-09-18", readTime: "14 min read", contentType: "Tutorial", popularity: "4.5/5" },
    },
    {
      title: "Understanding JavaScript Closures",
      url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Closures",
      description:
        "A closure is the combination of a function bundled together with references to its surrounding state. Learn how closures work and how to use them effectively in your JavaScript applications.",
      tags: ["JavaScript", "Closures", "Functions"],
      fetchData: {
        lastUpdated: "2023-08-22",
        readTime: "9 min read",
        contentType: "Documentation",
        popularity: "4.7/5",
      },
    },
    {
      title: "JavaScript Event Loop Explained",
      url: "https://nodejs.org/en/docs/guides/event-loop-timers-and-nexttick",
      description:
        "The event loop is what allows Node.js to perform non-blocking I/O operations despite JavaScript being single-threaded. This guide explains how the event loop works in detail.",
      tags: ["JavaScript", "Event Loop", "Asynchronous"],
      fetchData: { lastUpdated: "2023-07-14", readTime: "16 min read", contentType: "Guide", popularity: "4.8/5" },
    },
    {
      title: "Modern JavaScript Tutorial",
      url: "https://javascript.info",
      description:
        "From the basics to advanced topics with simple, but detailed explanations. Main course contains 2 parts which cover JavaScript as a programming language and working with a browser.",
      tags: ["JavaScript", "Tutorial", "Web Development"],
      fetchData: { lastUpdated: "2023-11-30", readTime: "25 min read", contentType: "Tutorial", popularity: "4.9/5" },
    },
    {
      title: "JavaScript Design Patterns",
      url: "https://www.patterns.dev",
      description:
        "Learn JavaScript design patterns including module pattern, singleton, factory, observer, and more. Implement these patterns to write maintainable and reusable code.",
      tags: ["JavaScript", "Design Patterns", "Architecture"],
      fetchData: { lastUpdated: "2023-10-05", readTime: "18 min read", contentType: "Guide", popularity: "4.6/5" },
    },
    {
      title: "JavaScript ES6+ Features Guide",
      url: "https://es6-features.org",
      description:
        "Comprehensive overview of ECMAScript 6 and later features including arrow functions, template literals, destructuring, modules, and more modern JavaScript syntax.",
      tags: ["JavaScript", "ES6", "Modern Syntax"],
      fetchData: { lastUpdated: "2023-09-12", readTime: "22 min read", contentType: "Guide", popularity: "4.7/5" },
    },
    {
      title: "JavaScript Testing Best Practices",
      url: "https://github.com/goldbergyoni/javascript-testing-best-practices",
      description:
        "Comprehensive and exhaustive JavaScript & Node.js testing best practices including 40+ best practices, style guide, and examples.",
      tags: ["JavaScript", "Testing", "Best Practices"],
      fetchData: { lastUpdated: "2023-08-30", readTime: "35 min read", contentType: "Guide", popularity: "4.8/5" },
    },
    {
      title: "JavaScript Performance Optimization",
      url: "https://web.dev/fast/",
      description:
        "Learn how to make your JavaScript applications faster with performance optimization techniques, lazy loading, code splitting, and efficient algorithms.",
      tags: ["JavaScript", "Performance", "Optimization"],
      fetchData: { lastUpdated: "2023-10-18", readTime: "28 min read", contentType: "Tutorial", popularity: "4.6/5" },
    },
    {
      title: "JavaScript Security Best Practices",
      url: "https://cheatsheetseries.owasp.org/cheatsheets/JavaScript_Security_Cheat_Sheet.html",
      description:
        "Essential security practices for JavaScript development including XSS prevention, CSRF protection, and secure coding guidelines.",
      tags: ["JavaScript", "Security", "Best Practices"],
      fetchData: {
        lastUpdated: "2023-09-25",
        readTime: "20 min read",
        contentType: "Security Guide",
        popularity: "4.7/5",
      },
    },
    {
      title: "JavaScript Functional Programming",
      url: "https://mostly-adequate.gitbooks.io/mostly-adequate-guide/",
      description:
        "A comprehensive guide to functional programming in JavaScript covering pure functions, currying, composition, and functional design patterns.",
      tags: ["JavaScript", "Functional Programming", "Advanced"],
      fetchData: { lastUpdated: "2023-07-08", readTime: "45 min read", contentType: "Book", popularity: "4.8/5" },
    },
    {
      title: "JavaScript Memory Management",
      url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Memory_Management",
      description:
        "Understanding how JavaScript manages memory, garbage collection, memory leaks, and optimization techniques for better performance.",
      tags: ["JavaScript", "Memory", "Performance"],
      fetchData: {
        lastUpdated: "2023-08-15",
        readTime: "18 min read",
        contentType: "Documentation",
        popularity: "4.5/5",
      },
    },
    {
      title: "JavaScript Modules and Import/Export",
      url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules",
      description:
        "Complete guide to JavaScript modules, ES6 import/export syntax, dynamic imports, and module bundling strategies.",
      tags: ["JavaScript", "Modules", "ES6"],
      fetchData: {
        lastUpdated: "2023-09-03",
        readTime: "16 min read",
        contentType: "Documentation",
        popularity: "4.6/5",
      },
    },
    {
      title: "JavaScript Regular Expressions",
      url: "https://regexr.com/",
      description:
        "Master JavaScript regular expressions with interactive examples, pattern matching, and real-world use cases for text processing.",
      tags: ["JavaScript", "RegEx", "Text Processing"],
      fetchData: {
        lastUpdated: "2023-10-12",
        readTime: "24 min read",
        contentType: "Interactive Tool",
        popularity: "4.4/5",
      },
    },
    {
      title: "JavaScript Web APIs",
      url: "https://developer.mozilla.org/en-US/docs/Web/API",
      description:
        "Comprehensive reference for Web APIs available in JavaScript including DOM manipulation, fetch API, geolocation, and more.",
      tags: ["JavaScript", "Web APIs", "Browser"],
      fetchData: { lastUpdated: "2023-11-20", readTime: "30 min read", contentType: "Reference", popularity: "4.7/5" },
    },
    {
      title: "JavaScript Debugging Techniques",
      url: "https://developers.google.com/web/tools/chrome-devtools/javascript",
      description:
        "Advanced debugging techniques for JavaScript using Chrome DevTools, breakpoints, profiling, and performance analysis.",
      tags: ["JavaScript", "Debugging", "DevTools"],
      fetchData: { lastUpdated: "2023-08-28", readTime: "26 min read", contentType: "Tutorial", popularity: "4.5/5" },
    },

    // Python Results (15 results)
    {
      title: "Python.org - Official Python Website",
      url: "https://www.python.org",
      description:
        "The official home of the Python Programming Language. Download Python, access documentation, and find community resources.",
      tags: ["Python", "Programming", "Official"],
      fetchData: {
        lastUpdated: "2023-12-05",
        readTime: "5 min read",
        contentType: "Official Site",
        popularity: "4.9/5",
      },
    },
    {
      title: "Python Machine Learning with Scikit-Learn",
      url: "https://scikit-learn.org/stable/",
      description:
        "Simple and efficient tools for predictive data analysis. Built on NumPy, SciPy, and matplotlib. Open source, commercially usable - BSD license.",
      tags: ["Python", "Machine Learning", "Data Science"],
      fetchData: {
        lastUpdated: "2023-11-28",
        readTime: "40 min read",
        contentType: "Documentation",
        popularity: "4.8/5",
      },
    },
    {
      title: "Django Web Framework",
      url: "https://www.djangoproject.com",
      description:
        "Django is a high-level Python Web framework that encourages rapid development and clean, pragmatic design. Built by experienced developers.",
      tags: ["Python", "Django", "Web Framework"],
      fetchData: {
        lastUpdated: "2023-10-15",
        readTime: "32 min read",
        contentType: "Documentation",
        popularity: "4.7/5",
      },
    },
    {
      title: "Flask Micro Web Framework",
      url: "https://flask.palletsprojects.com",
      description:
        "Flask is a lightweight WSGI web application framework. It is designed to make getting started quick and easy, with the ability to scale up to complex applications.",
      tags: ["Python", "Flask", "Micro Framework"],
      fetchData: {
        lastUpdated: "2023-09-20",
        readTime: "25 min read",
        contentType: "Documentation",
        popularity: "4.6/5",
      },
    },
    {
      title: "NumPy - Fundamental Package for Scientific Computing",
      url: "https://numpy.org",
      description:
        "NumPy is the fundamental package for scientific computing with Python. It contains a powerful N-dimensional array object and useful linear algebra capabilities.",
      tags: ["Python", "NumPy", "Scientific Computing"],
      fetchData: {
        lastUpdated: "2023-11-10",
        readTime: "28 min read",
        contentType: "Documentation",
        popularity: "4.8/5",
      },
    },
    {
      title: "Pandas Data Analysis Library",
      url: "https://pandas.pydata.org",
      description:
        "pandas is a fast, powerful, flexible and easy to use open source data analysis and manipulation tool, built on top of the Python programming language.",
      tags: ["Python", "Pandas", "Data Analysis"],
      fetchData: {
        lastUpdated: "2023-10-22",
        readTime: "35 min read",
        contentType: "Documentation",
        popularity: "4.7/5",
      },
    },
    {
      title: "Python Asyncio Programming",
      url: "https://docs.python.org/3/library/asyncio.html",
      description:
        "asyncio is a library to write concurrent code using the async/await syntax. Learn asynchronous programming patterns in Python.",
      tags: ["Python", "Asyncio", "Concurrency"],
      fetchData: {
        lastUpdated: "2023-09-14",
        readTime: "22 min read",
        contentType: "Documentation",
        popularity: "4.5/5",
      },
    },
    {
      title: "Python Testing with Pytest",
      url: "https://docs.pytest.org",
      description:
        "pytest framework makes it easy to write small tests, yet scales to support complex functional testing for applications and libraries.",
      tags: ["Python", "Testing", "Pytest"],
      fetchData: {
        lastUpdated: "2023-08-18",
        readTime: "30 min read",
        contentType: "Documentation",
        popularity: "4.6/5",
      },
    },
    {
      title: "Python Virtual Environments",
      url: "https://docs.python.org/3/tutorial/venv.html",
      description:
        "Learn how to create and manage virtual environments in Python to isolate project dependencies and avoid conflicts.",
      tags: ["Python", "Virtual Environments", "Package Management"],
      fetchData: { lastUpdated: "2023-07-25", readTime: "15 min read", contentType: "Tutorial", popularity: "4.4/5" },
    },
    {
      title: "Python Decorators Explained",
      url: "https://realpython.com/primer-on-python-decorators/",
      description:
        "A comprehensive guide to Python decorators, including function decorators, class decorators, and advanced decorator patterns.",
      tags: ["Python", "Decorators", "Advanced"],
      fetchData: { lastUpdated: "2023-09-08", readTime: "26 min read", contentType: "Tutorial", popularity: "4.7/5" },
    },
    {
      title: "Python Data Structures and Algorithms",
      url: "https://github.com/TheAlgorithms/Python",
      description:
        "All Algorithms implemented in Python - for education. These implementations are for learning purposes and may be less efficient than library implementations.",
      tags: ["Python", "Algorithms", "Data Structures"],
      fetchData: { lastUpdated: "2023-11-02", readTime: "50 min read", contentType: "Repository", popularity: "4.8/5" },
    },
    {
      title: "Python Web Scraping with BeautifulSoup",
      url: "https://www.crummy.com/software/BeautifulSoup/bs4/doc/",
      description:
        "Beautiful Soup is a Python library for pulling data out of HTML and XML files. Learn web scraping techniques and best practices.",
      tags: ["Python", "Web Scraping", "BeautifulSoup"],
      fetchData: {
        lastUpdated: "2023-08-12",
        readTime: "24 min read",
        contentType: "Documentation",
        popularity: "4.5/5",
      },
    },
    {
      title: "Python REST API with FastAPI",
      url: "https://fastapi.tiangolo.com",
      description:
        "FastAPI is a modern, fast (high-performance), web framework for building APIs with Python 3.6+ based on standard Python type hints.",
      tags: ["Python", "FastAPI", "REST API"],
      fetchData: {
        lastUpdated: "2023-10-30",
        readTime: "38 min read",
        contentType: "Documentation",
        popularity: "4.8/5",
      },
    },
    {
      title: "Python GUI Development with Tkinter",
      url: "https://docs.python.org/3/library/tkinter.html",
      description:
        "Tkinter is Python's de-facto standard GUI (Graphical User Interface) package. Learn to create desktop applications with Python.",
      tags: ["Python", "GUI", "Tkinter"],
      fetchData: {
        lastUpdated: "2023-07-18",
        readTime: "32 min read",
        contentType: "Documentation",
        popularity: "4.3/5",
      },
    },
    {
      title: "Python Package Management with pip",
      url: "https://pip.pypa.io/en/stable/",
      description:
        "pip is the package installer for Python. You can use pip to install packages from the Python Package Index and other indexes.",
      tags: ["Python", "Package Management", "pip"],
      fetchData: {
        lastUpdated: "2023-09-28",
        readTime: "18 min read",
        contentType: "Documentation",
        popularity: "4.6/5",
      },
    },

    // Go/Golang Results (15 results)
    {
      title: "The Go Programming Language",
      url: "https://golang.org",
      description:
        "Go is an open source programming language that makes it easy to build simple, reliable, and efficient software. Learn about Go's features, syntax, and standard library.",
      tags: ["Golang", "Programming", "Backend"],
      fetchData: {
        lastUpdated: "2023-11-18",
        readTime: "15 min read",
        contentType: "Documentation",
        popularity: "4.8/5",
      },
    },
    {
      title: "Effective Go - Official Documentation",
      url: "https://golang.org/doc/effective_go",
      description:
        "Effective Go gives tips for writing clear, idiomatic Go code. It augments the language specification and the Go tour, which are both prerequisites to reading this document.",
      tags: ["Golang", "Best Practices", "Documentation"],
      fetchData: {
        lastUpdated: "2023-10-22",
        readTime: "45 min read",
        contentType: "Documentation",
        popularity: "4.9/5",
      },
    },
    {
      title: "Go by Example",
      url: "https://gobyexample.com",
      description:
        "Go by Example is a hands-on introduction to Go using annotated example programs. Check out the first example or browse the full list below.",
      tags: ["Golang", "Examples", "Tutorial"],
      fetchData: { lastUpdated: "2023-09-30", readTime: "30 min read", contentType: "Tutorial", popularity: "4.7/5" },
    },
    {
      title: "Concurrency in Go",
      url: "https://golang.org/doc/effective_go#concurrency",
      description:
        "Go provides concurrency features as part of the core language. This guide explains goroutines, channels, and patterns for building concurrent applications in Go.",
      tags: ["Golang", "Concurrency", "Goroutines"],
      fetchData: {
        lastUpdated: "2023-08-15",
        readTime: "20 min read",
        contentType: "Documentation",
        popularity: "4.8/5",
      },
    },
    {
      title: "Building Web Applications with Go",
      url: "https://golang.org/doc/articles/wiki/",
      description:
        "This tutorial provides a basic introduction to building web applications using Go. Learn how to create handlers, serve static files, and use templates.",
      tags: ["Golang", "Web Development", "Tutorial"],
      fetchData: { lastUpdated: "2023-07-20", readTime: "25 min read", contentType: "Tutorial", popularity: "4.6/5" },
    },
    {
      title: "Go Modules and Dependency Management",
      url: "https://golang.org/doc/modules/",
      description:
        "Go modules are the official dependency management solution for Go. Learn how to create, use, and manage modules in your Go projects.",
      tags: ["Golang", "Modules", "Dependencies"],
      fetchData: {
        lastUpdated: "2023-09-12",
        readTime: "22 min read",
        contentType: "Documentation",
        popularity: "4.5/5",
      },
    },
    {
      title: "Go Testing and Benchmarking",
      url: "https://golang.org/doc/tutorial/add-a-test",
      description:
        "Learn how to write tests and benchmarks in Go using the built-in testing package. Includes examples of unit tests, table-driven tests, and performance benchmarks.",
      tags: ["Golang", "Testing", "Benchmarking"],
      fetchData: { lastUpdated: "2023-08-28", readTime: "28 min read", contentType: "Tutorial", popularity: "4.6/5" },
    },
    {
      title: "Go REST API with Gin Framework",
      url: "https://gin-gonic.com",
      description:
        "Gin is a HTTP web framework written in Go. It features a Martini-like API with much better performance. Learn to build REST APIs with Gin.",
      tags: ["Golang", "Gin", "REST API"],
      fetchData: {
        lastUpdated: "2023-10-08",
        readTime: "35 min read",
        contentType: "Documentation",
        popularity: "4.7/5",
      },
    },
    {
      title: "Go Database Programming with GORM",
      url: "https://gorm.io",
      description:
        "The fantastic ORM library for Golang aims to be developer friendly. Learn database operations, migrations, and relationships with GORM.",
      tags: ["Golang", "Database", "ORM"],
      fetchData: {
        lastUpdated: "2023-09-18",
        readTime: "32 min read",
        contentType: "Documentation",
        popularity: "4.6/5",
      },
    },
    {
      title: "Go Microservices Architecture",
      url: "https://microservices.io/patterns/microservices.html",
      description:
        "Learn how to build microservices architecture using Go. Covers service discovery, API gateways, and distributed systems patterns.",
      tags: ["Golang", "Microservices", "Architecture"],
      fetchData: { lastUpdated: "2023-08-05", readTime: "42 min read", contentType: "Guide", popularity: "4.7/5" },
    },
    {
      title: "Go Error Handling Best Practices",
      url: "https://blog.golang.org/error-handling-and-go",
      description:
        "Understanding Go's approach to error handling and best practices for writing robust, error-resistant Go code.",
      tags: ["Golang", "Error Handling", "Best Practices"],
      fetchData: { lastUpdated: "2023-07-30", readTime: "18 min read", contentType: "Blog Post", popularity: "4.5/5" },
    },
    {
      title: "Go Performance Optimization",
      url: "https://golang.org/doc/diagnostics.html",
      description:
        "Learn how to profile and optimize Go applications for better performance. Covers CPU profiling, memory profiling, and benchmarking techniques.",
      tags: ["Golang", "Performance", "Optimization"],
      fetchData: {
        lastUpdated: "2023-09-25",
        readTime: "38 min read",
        contentType: "Documentation",
        popularity: "4.6/5",
      },
    },
    {
      title: "Go Context Package",
      url: "https://golang.org/pkg/context/",
      description:
        "The context package defines the Context type, which carries deadlines, cancellation signals, and other request-scoped values across API boundaries.",
      tags: ["Golang", "Context", "Concurrency"],
      fetchData: {
        lastUpdated: "2023-08-22",
        readTime: "24 min read",
        contentType: "Documentation",
        popularity: "4.4/5",
      },
    },
    {
      title: "Go Docker and Containerization",
      url: "https://docs.docker.com/language/golang/",
      description:
        "Learn how to containerize Go applications with Docker. Includes multi-stage builds, optimization techniques, and deployment strategies.",
      tags: ["Golang", "Docker", "Containerization"],
      fetchData: { lastUpdated: "2023-10-14", readTime: "30 min read", contentType: "Tutorial", popularity: "4.7/5" },
    },
    {
      title: "Go gRPC and Protocol Buffers",
      url: "https://grpc.io/docs/languages/go/",
      description:
        "gRPC is a modern open source high performance Remote Procedure Call (RPC) framework. Learn to build gRPC services in Go.",
      tags: ["Golang", "gRPC", "Protocol Buffers"],
      fetchData: {
        lastUpdated: "2023-09-06",
        readTime: "40 min read",
        contentType: "Documentation",
        popularity: "4.8/5",
      },
    },

    // Web Development Results (10 results)
    {
      title: "MDN Web Docs",
      url: "https://developer.mozilla.org",
      description:
        "MDN Web Docs is an open-source, collaborative project documenting Web platform technologies, including CSS, HTML, JavaScript, and Web APIs.",
      tags: ["Documentation", "Web", "Reference"],
      fetchData: { lastUpdated: "2023-12-08", readTime: "Varies", contentType: "Documentation", popularity: "4.9/5" },
    },
    {
      title: "CSS Grid Complete Guide",
      url: "https://css-tricks.com/snippets/css/complete-guide-grid/",
      description:
        "A comprehensive guide to CSS Grid Layout. Learn how to create complex layouts with CSS Grid including grid containers, grid items, and responsive design.",
      tags: ["CSS", "Grid", "Layout"],
      fetchData: { lastUpdated: "2023-10-12", readTime: "35 min read", contentType: "Guide", popularity: "4.8/5" },
    },
    {
      title: "Flexbox Complete Guide",
      url: "https://css-tricks.com/snippets/css/a-guide-to-flexbox/",
      description:
        "A complete guide to Flexbox layout. Learn how to use Flexbox for creating flexible and responsive layouts with practical examples.",
      tags: ["CSS", "Flexbox", "Layout"],
      fetchData: { lastUpdated: "2023-09-28", readTime: "28 min read", contentType: "Guide", popularity: "4.7/5" },
    },
    {
      title: "HTML5 Semantic Elements",
      url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element",
      description:
        "Complete reference for HTML5 semantic elements. Learn about proper HTML structure, accessibility, and semantic markup best practices.",
      tags: ["HTML", "Semantic", "Accessibility"],
      fetchData: { lastUpdated: "2023-11-15", readTime: "22 min read", contentType: "Reference", popularity: "4.6/5" },
    },
    {
      title: "Web Performance Optimization",
      url: "https://web.dev/performance/",
      description:
        "Learn how to make your websites faster with performance optimization techniques, lazy loading, image optimization, and Core Web Vitals.",
      tags: ["Performance", "Optimization", "Web Vitals"],
      fetchData: { lastUpdated: "2023-10-25", readTime: "45 min read", contentType: "Guide", popularity: "4.8/5" },
    },
    {
      title: "Progressive Web Apps (PWA)",
      url: "https://web.dev/progressive-web-apps/",
      description:
        "Build Progressive Web Apps that provide native app-like experiences. Learn about service workers, app manifests, and offline functionality.",
      tags: ["PWA", "Service Workers", "Mobile"],
      fetchData: { lastUpdated: "2023-09-15", readTime: "38 min read", contentType: "Tutorial", popularity: "4.7/5" },
    },
    {
      title: "Web Accessibility Guidelines",
      url: "https://www.w3.org/WAI/WCAG21/quickref/",
      description:
        "Web Content Accessibility Guidelines (WCAG) 2.1 quick reference. Learn how to make your websites accessible to all users.",
      tags: ["Accessibility", "WCAG", "Inclusive Design"],
      fetchData: { lastUpdated: "2023-08-20", readTime: "30 min read", contentType: "Guidelines", popularity: "4.5/5" },
    },
    {
      title: "CSS Animations and Transitions",
      url: "https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Animations",
      description:
        "Master CSS animations and transitions. Learn keyframes, timing functions, and how to create smooth, performant animations.",
      tags: ["CSS", "Animations", "Transitions"],
      fetchData: {
        lastUpdated: "2023-09-08",
        readTime: "26 min read",
        contentType: "Documentation",
        popularity: "4.6/5",
      },
    },
    {
      title: "Responsive Web Design",
      url: "https://web.dev/responsive-web-design-basics/",
      description:
        "Learn the fundamentals of responsive web design including flexible grids, media queries, and mobile-first design principles.",
      tags: ["Responsive", "Mobile", "Design"],
      fetchData: { lastUpdated: "2023-10-03", readTime: "32 min read", contentType: "Tutorial", popularity: "4.7/5" },
    },
    {
      title: "Web Security Best Practices",
      url: "https://web.dev/secure/",
      description:
        "Essential web security practices including HTTPS, Content Security Policy, secure authentication, and protection against common vulnerabilities.",
      tags: ["Security", "HTTPS", "Best Practices"],
      fetchData: {
        lastUpdated: "2023-11-08",
        readTime: "40 min read",
        contentType: "Security Guide",
        popularity: "4.8/5",
      },
    },

    // Additional General Results (10 results)
    {
      title: "GitHub: Where the world builds software",
      url: "https://github.com",
      description:
        "GitHub is where over 65 million developers shape the future of software, together. Contribute to the open source community, manage your Git repositories, review code, and more.",
      tags: ["GitHub", "Git", "Open Source"],
      fetchData: { lastUpdated: "2023-12-10", readTime: "5 min read", contentType: "Platform", popularity: "4.9/5" },
    },
    {
      title: "Stack Overflow - Where Developers Learn & Share",
      url: "https://stackoverflow.com",
      description:
        "Stack Overflow is the largest, most trusted online community for developers to learn, share their programming knowledge, and build their careers.",
      tags: ["Community", "Programming", "Q&A"],
      fetchData: { lastUpdated: "2023-12-12", readTime: "Varies", contentType: "Q&A Platform", popularity: "4.8/5" },
    },
    {
      title: "Docker Documentation",
      url: "https://docs.docker.com",
      description:
        "Docker helps developers build, share, and run applications anywhere. Learn containerization, Docker Compose, and deployment strategies.",
      tags: ["Docker", "Containerization", "DevOps"],
      fetchData: {
        lastUpdated: "2023-11-22",
        readTime: "50 min read",
        contentType: "Documentation",
        popularity: "4.7/5",
      },
    },
    {
      title: "Kubernetes Documentation",
      url: "https://kubernetes.io/docs/",
      description:
        "Kubernetes is an open-source system for automating deployment, scaling, and management of containerized applications.",
      tags: ["Kubernetes", "Container Orchestration", "DevOps"],
      fetchData: {
        lastUpdated: "2023-10-28",
        readTime: "60 min read",
        contentType: "Documentation",
        popularity: "4.6/5",
      },
    },
    {
      title: "AWS Documentation",
      url: "https://docs.aws.amazon.com",
      description:
        "Amazon Web Services documentation covering cloud computing services, serverless architecture, and scalable infrastructure solutions.",
      tags: ["AWS", "Cloud Computing", "Infrastructure"],
      fetchData: { lastUpdated: "2023-12-01", readTime: "Varies", contentType: "Documentation", popularity: "4.8/5" },
    },
    {
      title: "Redis Documentation",
      url: "https://redis.io/documentation",
      description:
        "Redis is an open source, in-memory data structure store, used as a database, cache, and message broker.",
      tags: ["Redis", "Database", "Caching"],
      fetchData: {
        lastUpdated: "2023-09-18",
        readTime: "35 min read",
        contentType: "Documentation",
        popularity: "4.7/5",
      },
    },
    {
      title: "PostgreSQL Documentation",
      url: "https://www.postgresql.org/docs/",
      description:
        "PostgreSQL is a powerful, open source object-relational database system with over 30 years of active development.",
      tags: ["PostgreSQL", "Database", "SQL"],
      fetchData: {
        lastUpdated: "2023-10-15",
        readTime: "45 min read",
        contentType: "Documentation",
        popularity: "4.8/5",
      },
    },
    {
      title: "MongoDB Documentation",
      url: "https://docs.mongodb.com",
      description:
        "MongoDB is a document database with the scalability and flexibility that you want with the querying and indexing that you need.",
      tags: ["MongoDB", "NoSQL", "Database"],
      fetchData: {
        lastUpdated: "2023-11-05",
        readTime: "40 min read",
        contentType: "Documentation",
        popularity: "4.6/5",
      },
    },
    {
      title: "GraphQL Documentation",
      url: "https://graphql.org/learn/",
      description:
        "GraphQL is a query language for APIs and a runtime for fulfilling those queries with your existing data.",
      tags: ["GraphQL", "API", "Query Language"],
      fetchData: {
        lastUpdated: "2023-09-22",
        readTime: "30 min read",
        contentType: "Documentation",
        popularity: "4.5/5",
      },
    },
    {
      title: "Terraform Documentation",
      url: "https://www.terraform.io/docs",
      description:
        "Terraform enables you to safely and predictably create, change, and improve infrastructure using Infrastructure as Code.",
      tags: ["Terraform", "Infrastructure as Code", "DevOps"],
      fetchData: {
        lastUpdated: "2023-10-08",
        readTime: "55 min read",
        contentType: "Documentation",
        popularity: "4.7/5",
      },
    },
  ]

  // Filter results based on query
  return baseResults.filter(
    (result) =>
      result.title.toLowerCase().includes(query.toLowerCase()) ||
      result.description.toLowerCase().includes(query.toLowerCase()) ||
      result.tags.some((tag) => tag.toLowerCase().includes(query.toLowerCase())),
  )
}

export default function SearchResults() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const query = searchParams.get("q") || ""
  const [searchQuery, setSearchQuery] = useState(query)
  const [isFocused, setIsFocused] = useState(false)
  const [results, setResults] = useState<any[]>([])
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [selectedSuggestion, setSelectedSuggestion] = useState(-1)
  const [currentPage, setCurrentPage] = useState(1)
  const resultsPerPage = 10 // Reduced to better test pagination

  // Add this at the beginning of the component to track header height
  const [headerHeight, setHeaderHeight] = useState(0)
  const headerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (query) {
      setSearchQuery(query)
      const searchResults = generateSearchResults(query)
      setResults(searchResults)
      setCurrentPage(1)
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
      <div className="absolute inset-0 gradient-bg-search"></div>

      {/* Animated Background Spheres - More Subtle and Elegant */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-blue-500/8 rounded-full blur-[120px] animate-pulse-energy"></div>
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
            <span className="text-hologram glow-text-sm font-mono">FROXY</span>
          </Link>

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="flex-1 w-full relative">
            <div className="relative">
              <div
                className={`relative bg-gray-900/40 backdrop-blur-xl border rounded-full transition-all duration-300 ${
                  isFocused
                    ? "border-blue-500/50 shadow-lg shadow-blue-500/20 glow-border"
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
                    className={`absolute right-2 p-1.5 rounded-full transition-all duration-300 ${
                      searchQuery.length > 0
                        ? "bg-blue-500 hover:bg-blue-600 text-white shadow-lg shadow-blue-500/25"
                        : "bg-gray-700/50 text-gray-400"
                    }`}
                  >
                    <ArrowRight className="w-3.5 h-3.5" />
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
        <div className="mb-6 text-gray-400 text-sm font-mono">
          <p>
            Found {results.length} results for <span className="text-blue-400 font-medium">"{query}"</span>
            {results.length > resultsPerPage && (
              <span className="ml-2">
                (Showing {(currentPage - 1) * resultsPerPage + 1}-
                {Math.min(currentPage * resultsPerPage, results.length)} of {results.length})
              </span>
            )}
          </p>
        </div>

        {/* Search Results */}
        <div className="space-y-6">
          {paginatedResults.length > 0 ? (
            paginatedResults.map((result, index) => (
              <div
                key={index}
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

                  {/* Tags */}
                  <div className="flex flex-wrap gap-2 mt-3">
                    {result.tags.map((tag: string) => (
                      <span
                        key={tag}
                        className="text-xs px-2 py-1 bg-blue-500/10 text-blue-300 rounded-full border border-blue-500/20 font-mono"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  {/* Fetch Data */}
                  <div className="flex flex-wrap gap-x-4 gap-y-2 mt-4 text-xs text-gray-400 font-mono">
                    <div className="flex items-center">
                      <Calendar className="w-3.5 h-3.5 mr-1.5 text-gray-500" />
                      <span>Updated: {result.fetchData.lastUpdated}</span>
                    </div>
                    <div className="flex items-center">
                      <Clock className="w-3.5 h-3.5 mr-1.5 text-gray-500" />
                      <span>{result.fetchData.readTime}</span>
                    </div>
                    <div className="flex items-center">
                      <FileText className="w-3.5 h-3.5 mr-1.5 text-gray-500" />
                      <span>{result.fetchData.contentType}</span>
                    </div>
                    <div className="flex items-center">
                      <Users className="w-3.5 h-3.5 mr-1.5 text-gray-500" />
                      <span>{result.fetchData.popularity}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-400 text-lg font-mono">No results found for "{query}"</p>
              <p className="text-gray-500 mt-2 font-mono">Try different keywords or check your spelling</p>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
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
            <a href="#" className="hover:text-blue-400 transition-colors duration-200">
              ABOUT
            </a>
            <a href="#" className="hover:text-blue-400 transition-colors duration-200">
              PRIVACY
            </a>
            <a href="#" className="hover:text-blue-400 transition-colors duration-200">
              TERMS
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}
