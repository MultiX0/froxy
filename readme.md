# Froxy

A modular, open-source web engine that crawls, indexes, and searches web content using semantic embeddings.

## What is Froxy?

Froxy is a full-stack web engine designed to crawl web pages, extract content, and index it using semantic embeddings for intelligent search. It includes:

- A Go-based crawler with real-time indexing
- FastEmbed service for generating semantic embeddings
- Qdrant vector database for semantic search
- Froxy Apex, an AI-powered intelligent search component (Perplexity-style)
- A PostgreSQL database for structured data storage
- A Next.js frontend fully integrated with the backend APIs

This project is built for learning, experimenting, and extending. It is a solid starting point for developers who want to understand how modern semantic search engines work from scratch.

> Built in 3 days. It may not be perfect, but it works, and we will keep improving it together.

> The architecture favors simplicity over complexity. It is clean, straightforward, and intentionally free of over-engineering. Scaling and additional complexity can be introduced later as needed.

## Platform Support

Froxy is built and tested on Linux. The setup process relies on a shell script (`froxy.sh`) that automatically initializes environment files, creates the Docker network, and configures all required services. This automation is essential for getting everything running correctly.

**Windows users should be aware** that the shell-based setup does not work as expected on Windows. Since the environment initialization and service configuration happen through the shell script and CLI tools, running Froxy on Windows may require manual intervention to replicate what the script handles automatically. Until a Windows-compatible setup path is added, Linux or WSL2 is strongly recommended.

## Features

- Crawl websites with real-time indexing (Go)
- Semantic search using embeddings (FastEmbed + Qdrant)
- AI-powered intelligent search with LLM integration (Froxy Apex)
- Vector similarity search for context-aware results
- Chunk-based relevance scoring with cosine similarity
- Structured data storage in PostgreSQL
- Modern UI built with Next.js and Tailwind CSS
- Fully containerized with Docker

## Folder Structure

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
│   ├── functions/      # Crawl + indexing logic + proxy support
│   ├── models/         # Data models
│   └── utils/          # Misc helpers
├── fastembed/          # FastEmbed embedding service
│   ├── models/         # Cached embedding models
│   └── docker-compose.yml
├── qdrant/             # Qdrant vector database
│   └── docker-compose.yml
├── db/                 # PostgreSQL database
│   ├── scripts/        # Shell backup scripts
│   └── docker-compose.yml
├── froxy.sh            # Automated setup and runner script
├── LICENSE             # MIT License
└── readme.md           # This file
```

## Getting Started

### Requirements

- Node.js 18 or higher
- pnpm or npm
- Go 1.23 or higher
- Docker and Docker Compose
- At least 2 GB of available RAM (for the embedding service)
- Linux (see Platform Support above)

### Quick Setup (Recommended)

For the fastest crawler setup without manual configuration:

```bash
chmod +x froxy.sh
./froxy.sh
```

The script will automatically:

- Set up all environment variables with default values
- Create the Docker network
- Start all required services (PostgreSQL, Qdrant, FastEmbed)
- Run health checks on all containers
- Guide you through the crawling process

**Note:** `froxy.sh` only handles crawler setup. The `froxy-apex` AI service and frontend must be started manually after crawling.

### Manual Setup

```bash
# 1. Create Docker network
docker network create froxy-network

# 2. Start Qdrant vector database
cd qdrant
docker-compose up -d --build

# 3. Start PostgreSQL database
cd ../db
sudo chown -R 999:999 postgres_data/
docker-compose up -d --build

# 4. Start FastEmbed service
cd ../fastembed
docker-compose up -d --build

# 5. Run the crawler once all services are healthy
cd ../spider
go run main.go

# 6. Start the search backend
cd ../indexer-search
npm install
npm start

# 7. Configure and start Froxy Apex
# Ensure froxy-apex/.env is configured before running
cd ../froxy-apex
go run main.go

# 8. Start the frontend
cd ../front-end
npm i --legacy-peer-deps
npm run dev
```

## Environment Variables

### Default Configuration

All services use the following environment variables, which are automatically set by `froxy.sh`:

```env
# Database Configuration (spider and indexer-search)
DB_HOST=localhost
DB_PORT=5432
DB_USER=froxy_user
DB_PASSWORD=froxy_password
DB_NAME=froxy_db
DB_SSLMODE=disable

# Vector Database
QDRANT_API_KEY=froxy-secret-key
QDRANT_HOST=http://localhost:6333

# FastEmbed Service
EMBEDDING_HOST=http://localhost:5050

# AI Service (froxy-apex)
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

#### `spider/.env` and `indexer-search/.env`
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

> `froxy.sh` automatically creates `.env` files with working defaults for the crawler and database services. `froxy-apex/.env` and `front-end/.env` must be configured manually.

## How It Works

### Traditional Search

1. The crawler pulls website content from provided URLs.
2. Real-time indexing generates semantic embeddings using FastEmbed.
3. Qdrant stores vector embeddings for semantic similarity search.
4. PostgreSQL stores structured metadata.
5. The frontend provides an intelligent semantic search interface.

### AI-Powered Search (Froxy Apex)

1. User query is received and processed.
2. Query enhancement is performed using Llama 3.1 8B via the Groq API.
3. Embeddings are generated for the enhanced query using FastEmbed.
4. Vector search in Qdrant retrieves the most relevant pages.
5. Relevant pages are chunked for detailed analysis.
6. Cosine similarity is calculated for each chunk against the query.
7. An LLM generates a structured response including a summary, results with sources, relevance scores, reference links, and confidence ratings.

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

When the spider is run, you will be prompted to:

- Enter the URLs to crawl
- Set the number of concurrent workers (default: 5)

The crawler will extract content, generate embeddings in real time, store vectors in Qdrant, and store metadata in PostgreSQL.

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Next.js UI    │───▶│  Search Backend  │───▶│   PostgreSQL    │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │
         │                       ▼
         │              ┌──────────────────┐    ┌─────────────────┐
         │              │     Qdrant       │◀───│   FastEmbed     │
         │              │ (Vector Search)  │    │  (Embeddings)   │
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
│  (AI Search)    │    │ (Llama 3.1 8B)   │◀───│  (Cosine Sim)   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## Tech Stack

- **Go (Golang)** - web crawler with real-time indexing
- **FastEmbed** - embedding generation service
- **Qdrant** - vector database for semantic search
- **Froxy Apex** - AI-powered search with LLM integration
- **Llama 3.1 8B** - language model via Groq API
- **Node.js** - search backend API
- **PostgreSQL** - structured data storage
- **Next.js** - frontend interface
- **TailwindCSS + shadcn/ui** - UI components
- **Docker** - containerized services
- **Docker Network** - inter-service communication

## Contributing

Contributions are welcome. Feel free to fork the repository, open a pull request, or share ideas for improvement.

## License

MIT - free to fork, remix, and learn from.
