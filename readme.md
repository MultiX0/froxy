# **🕷️ Froxy**

> A chill, open-source web engine that crawls, indexes, and vibes with web content using semantic search.

![froxy banner](https://github.com/MultiX0/froxy/blob/main/banner.png?raw=true)

---

## 💡 What is Froxy?

Froxy is a modular full-stack web engine designed to crawl web pages, extract content, and index it using **semantic embeddings** for intelligent search — all powered by modern tools. It includes:

* A **Go**-based crawler (aka the spider 🕷️) with real-time indexing
* **FastEmbed** service for generating semantic embeddings
* **Qdrant** vector database for semantic search
* **Froxy Apex** - AI-powered intelligent search (Perplexity-style)
* A **PostgreSQL** database for structured data
* A **Next.js** front-end UI (fully integrated with real APIs)

This project is built for learning, experimenting, and extending — great for developers who want to understand how modern semantic search engines work from scratch.

> Fun fact: I made this project in just **3 days** — so it might not be perfect, but you know what?
> **It works!**
>
> *(We'll keep evolving this codebase together ❤️)*

> Note: I prefer simplicity over unnecessary complexity. We might make the architecture more advanced in the future, but for now, it's simple, clean, and straightforward—no fancy stuff, no over-engineering. It's just a chill project for now. If needed, we can scale and make it more complex later. After all, it started as a fun project—nothing more. <3

---

## 🔍 Features

* 🌐 Crawl websites with real-time indexing (Go)
* 🧠 Semantic search using embeddings (FastEmbed + Qdrant)
* 🤖 AI-powered intelligent search with LLM integration (Froxy Apex)
* 🚀 Vector similarity search for intelligent results
* 📊 Chunk-based relevance scoring with cosine similarity
* 🕺 Store structured data in PostgreSQL
* 🎨 Modern UI in Next.js + Tailwind
* 🐳 Fully containerized with Docker

> The frontend is fully connected to the backend and provides semantic search capabilities.

---

## 📂 Folder Structure

```
froxy/
├── front-end/          # Next.js frontend
│   ├── app/            # App routes (search, terms, about, etc.)
│   ├── components/     # UI components (shadcn-style)
│   ├── hooks/          # React hooks
│   ├── lib/            # Utility logic
│   ├── public/         # Static assets
│   └── styles/         # TailwindCSS setup
├── indexer-search/     # Node.js search backend
│   └── lib/
│       ├── functions/ 
│       ├── services/   # DB + search service
│       └── utils/      # Helper utilities
├── froxy-apex/         # AI-powered intelligent search service
│   ├── api/            # API endpoints
│   ├── db/             # Database connections
│   ├── functions/      # AI processing logic
│   ├── llama/          # LLM integration
│   ├── models/         # Data models
│   └── utils/          # Helper utilities
├── spider/             # Web crawler in Go with real-time indexing
│   ├── db/             # DB handling (PostgreSQL + Qdrant)
│   ├── functions/      # Crawl + indexing logic + Proxies (if-need it)
│   ├── models/         # Data models
│   └── utils/          # Misc helpers
├── fastembed/          # FastEmbed embedding service
│   ├── models/         # Cached embedding models
│   └── docker-compose.yml
├── qdrant/             # Qdrant vector database
│   └── docker-compose.yml
├── db/                 # PostgreSQL database
│   ├── scripts/        # Shell backups
│   └── docker-compose.yml
├── froxy.sh            # Automated setup & runner script
├── LICENSE             # MIT License
└── readme.md           # This file
```

---

## ⚙️ Getting Started

### Requirements

* Node.js (18+)
* pnpm or npm
* Go (1.23+)
* Docker & Docker Compose
* At least 2GB RAM (for embedding service)

### Quick Setup (Recommended for Crawler)

For the fastest crawler setup without dealing with configuration details:

```bash
# Make the script executable and run it
chmod +x froxy.sh
./froxy.sh
```

The script will automatically:
- Set up all environment variables with default values
- Create the Docker network
- Start all required services (PostgreSQL, Qdrant, FastEmbed)
- Health check all containers
- Guide you through the crawling process

**Note**: The `froxy.sh` script only handles the crawler setup. You'll need to manually start the `froxy-apex` AI service and `front-end` after crawling.

### Manual Setup

If you prefer to set things up manually:

```bash
# 1. Create Docker network
docker network create froxy-network

# 2. Start Qdrant vector database
cd qdrant
docker-compose up -d --build

# 3. Start PostgreSQL database
cd ../db
# Set proper permissions for PostgreSQL data directory
sudo chown -R 999:999 postgres_data/
docker-compose up -d --build

# 4. Start FastEmbed service
cd ../fastembed
docker-compose up -d --build

# 5. Wait for all services to be healthy, then run the crawler
cd ../spider
go run main.go

# 6. After crawling, start the search backend
cd ../indexer-search
npm install
npm start

# 7. Start the AI-powered search service (Froxy Apex)
# Make sure to configure froxy-apex/.env first
cd ../froxy-apex
go run main.go

# 8. Launch the front-end
cd ../front-end
npm i --legacy-peer-deps
npm run dev
```

---

## 🔐 Environment Variables

### Default Configuration

All services use these environment variables (automatically set by `froxy.sh`):

```env
# Database Configuration (for spider & indexer-search)
DB_HOST=localhost
DB_PORT=5432
DB_USER=froxy_user
DB_PASSWORD=froxy_password
DB_NAME=froxy_db
DB_SSLMODE=disable

# Vector Database Configuration
QDRANT_API_KEY=froxy-secret-key
QDRANT_HOST=http://localhost:6333

# FastEmbed Service
EMBEDDING_HOST=http://localhost:5050

# AI Service (for froxy-apex)
LLM_API_KEY=your_groq_api_key
API_KEY=your_froxy_apex_api_key
```

### Service-Specific Variables

#### `db/.env`
```env
POSTGRES_DB=froxy_db
POSTGRES_USER=froxy_user
POSTGRES_PASSWORD=froxy_password
DB_NAME=froxy_db
DB_SSLMODE=disable
```

#### `qdrant/.env`
```env
QDRANT_API_KEY=froxy-secret-key
```

#### `spider/.env` & `indexer-search/.env`
```env
DB_HOST=localhost
DB_PORT=5432
DB_USER=froxy_user
DB_PASSWORD=froxy_password
DB_NAME=froxy_db
DB_SSLMODE=disable
QDRANT_API_KEY=froxy-secret-key
EMBEDDING_HOST=http://localhost:5050
```

#### `froxy-apex/.env`
```env
LLM_API_KEY=your_groq_api_key
QDRANT_HOST=http://localhost:6333
EMBEDDING_HOST=http://localhost:5050
API_KEY=your_froxy_apex_api_key
QDRANT_API_KEY=froxy-secret-key
```

#### `front-end/.env`
```env
API_URL=http://localhost:8080
API_KEY=your_api_key
WEBSOCKET_URL=ws://localhost:8080/ws/search
FROXY_APEX_API_KEY=your_froxy_apex_api_key
ACCESS_CODE=auth_access_for_froxy_apex_ui
AUTH_SECRET_TOKEN=jwt_token_for_apex_ui_to_calc_the_usage
```

> 💡 The `froxy.sh` script automatically creates `.env` files with working default values for the crawler and database services. You'll need to manually configure `froxy-apex/.env` and `front-end/.env` for the AI search and UI components.

---

## 🤔 How it works

### Traditional Search
1. **Crawler** pulls website content from your provided URLs
2. **Real-time indexing** generates semantic embeddings using FastEmbed
3. **Qdrant** stores vector embeddings for semantic similarity search
4. **PostgreSQL** stores structured metadata
5. **Frontend** provides intelligent semantic search interface

### AI-Powered Search (Froxy Apex)
1. **User query** is received and processed
2. **Query enhancement** using Llama 3.1 8B via Groq API
3. **Embedding generation** for the enhanced query using FastEmbed
4. **Vector search** in Qdrant to find relevant pages
5. **Content chunking** of relevant pages for detailed analysis
6. **Cosine similarity** calculation for each chunk against the query
7. **LLM processing** to generate structured response with:
   - Concise summary
   - Detailed results with sources
   - Relevance scores
   - Reference links and favicons
   - Confidence ratings

### Response Format
```json
{
  "summary": "Concise overview addressing the query directly",
  "results": [
    {
      "point": "Detailed information in markdown format",
      "reference": "https://exact-source-url.com",
      "reference_favicon": "https://exact-source-url.com/favicon.ico",
      "relevance_score": 0.95,
      "timestamp": "when this info was published/updated"
    }
  ],
  "language": "detected_language_code",
  "last_updated": "timestamp",
  "confidence": 0.90
}
```

### Crawling Process

When you run the spider, you'll be prompted to:
- Enter URLs you want to crawl
- Set the number of workers (default: 5)

The crawler will:
- Extract content from each page
- Generate embeddings in real-time
- Store vectors in Qdrant
- Store metadata in PostgreSQL

### Manual Service Configuration

Since `froxy.sh` only handles the crawler, you'll need to manually configure:

- **Froxy Apex**: Set up your Groq API key and other environment variables
- **Frontend**: Configure API endpoints and keys
- **Service startup**: Start each service individually after crawler completes

---

## 🏗️ Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Next.js UI   │───▶│  Search Backend  │───▶│   PostgreSQL    │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │
         │                       ▼
         │              ┌──────────────────┐    ┌─────────────────┐
         │              │     Qdrant       │◀───│   FastEmbed     │
         │              │ (Vector Search)  │    │   (Embeddings)  │
         │              └──────────────────┘    └─────────────────┘
         │                       ▲                       ▲
         │                       │                       │
         │              ┌──────────────────┐              │
         │              │   Go Crawler     │──────────────┘
         │              │  (Real-time      │
         │              │   Indexing)      │
         │              └──────────────────┘
         │
         ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Froxy Apex    │───▶│   Groq LLM API   │    │  Chunk Analysis │
│ (AI Search)     │    │ (Llama 3.1 8B)   │◀───│ (Cosine Sim)    │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

---

## 📙 Tech Stack

* 🕷️ **Go (Golang)** – crawler with real-time indexing
* 🧠 **FastEmbed** – embedding generation service
* 🚀 **Qdrant** – vector database for semantic search
* 🤖 **Froxy Apex** – AI-powered search with LLM integration
* 🦙 **Llama 3.1 8B** – language model via Groq API
* 💪 **Node.js** – search backend API
* 📀 **PostgreSQL** – structured data storage
* ⚛️ **Next.js** – frontend interface
* 🎨 **TailwindCSS + shadcn/ui** – UI components
* 🐳 **Docker** – containerized services
* 🌐 **Docker Network** – service communication

---

## 🚀 Key Improvements

* **AI-Powered Search**: Perplexity-style intelligent search with LLM integration
* **Semantic Search**: Find content by meaning, not just keywords
* **Real-time Indexing**: Content is indexed as it's crawled
* **Vector Similarity**: Intelligent search results based on context
* **Chunk Analysis**: Deep content analysis with cosine similarity
* **Structured Responses**: Rich JSON responses with sources and confidence scores
* **Query Enhancement**: AI-powered query understanding and improvement
* **Scalable Architecture**: Microservices with Docker containers
* **Automated Setup**: One-command deployment with `froxy.sh`

---

## 📬 Want to contribute?

* Fork it 🌛
* Open a PR 🚰
* Share your ideas 💡

---

## 📜 License

**MIT** — feel free to fork, remix, and learn from it.

---

Made with ❤️ for the curious minds of the internet.

Stay weird. Stay building.

> "Not all who wander are lost — some are just crawling the web with semantic understanding."