# **# 🕷️ Froxy**

> A chill, open-source web engine that crawls, indexes, and vibes with web content.

![froxy banner](https://github.com/MultiX0/froxy/blob/main/banner.png?raw=true)


---

## 💡 What is Froxy?

Froxy is a modular full-stack web engine designed to crawl web pages, extract content, index it using TF-IDF, and make it searchable — all powered by modern tools. It includes:

* A **Go**-based crawler (aka the spider 🕷️)
* A **Node.js** indexer & search engine
* A **PostgreSQL** database
* A **Next.js** front-end UI (fully integrated with real APIs)

This project is built for learning, experimenting, and extending — great for developers who want to understand how search engines work from scratch.

> Fun fact: I made this project in just **3 days** — so it might not be perfect, but you know what?
> **It works!**
>
> *(We’ll keep evolving this codebase together ❤️)*

---

## 🔍 Features

* 🌐 Crawl websites (Go)
* 🤔 Index & search content (TF-IDF, Node.js)
* 🕺 Store in PostgreSQL
* 🎨 Modern UI in Next.js + Tailwind

> The frontend is fully connected to the backend and only uses mock data for suggestions.

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
├── indexer-search/     # Node.js indexer/search backend
│   └── lib/
│       ├── functions/  # TF-IDF, parser
│       ├── services/   # DB + search service
│       └── utils/      # Helper utilities
├── spider/             # Web crawler in Go
│   ├── db/             # DB handling
│   ├── functions/      # Crawl logic
│   ├── models/         # Data models
│   └── utils/          # Misc helpers
├── db/                 # PostgreSQL schema & backup scripts
│   └── scripts/        # Shell backups
├── froxy.sh            # Setup & runner script
├── LICENSE             # MIT License
└── readme.md           # This file
```

---

## ⚙️ Getting Started

### Requirements

* Node.js (18+)
* pnpm or npm
* Go (1.18+)
* Docker
* PostgreSQL instance

### Run it locally

```bash
# 1. Start the database
cd db
docker-compose up -d

# 2. Run the crawler first (this collects website content from the URLs you provide)
cd ../spider
go run main.go

# 3. Once you've crawled enough, start the indexer
cd ../indexer-search
npm install
npm start

# 4. Launch the front-end
cd ../front-end
npm i --legacy-peer-deps
npm run dev
```

💡 **Pro tip**: If you don’t want to mess with each service manually, just run:

```bash
./froxy.sh
```

This script handles crawling and indexing in one go, so you can just focus on exploring the results.

---

## 🔐 Environment Variables

Each folder has its own `.env` file. Here's what you need to set up:

### For `indexer-search/`

```env
DB_HOST=localhost
DB_PORT=5432
DB_USER=your_user
DB_PASSWORD=your_password
DB_NAME=your_database
DB_SSLMODE=disable  # or prefer, require, etc.
API_KEY=your_api_key
PORT=8080
```

### For `front-end/`

```env
API_URL=http://localhost:8080
API_KEY=your_api_key
```

### For `db/`

```env
POSTGRES_DB=your_database
POSTGRES_USER=your_user
POSTGRES_PASSWORD=your_password
DB_NAME=your_database
DB_SSLMODE=require # or prefer, require, etc.
```

### For `spider/`

```env
DB_HOST=localhost
DB_PORT=5432
DB_USER=your_user
DB_PASSWORD=your_password
DB_NAME=your_database
DB_SSLMODE=disable # or prefer, require, etc.
```

> 💡 You can use `DB_SSLMODE=disable` if you don’t want to use SSL.

---

## 🤔 How it works

1. **Crawler** pulls website content and metadata from your provided URLs
2. **Indexer** parses and weights using TF-IDF
3. **PostgreSQL** stores the indexed records
4. **Frontend** serves the search UI + suggestions

To customize crawling sources, edit this section in `spider/main.go`:

```go
var crawlableSites = []string{
    "https://en.wikipedia.org/wiki/Main_Page",
}
```

Or just run `./froxy.sh` to keep things simple.

---

## 📙 Tech Stack

* 🕷️ Go (Golang) – crawler
* 💪 Node.js – indexer, TF-IDF
* 📀 PostgreSQL – database
* ⚛️ Next.js – frontend
* 🎨 TailwindCSS + shadcn/ui – UI components
* 🐳 Docker – database container

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

> "Not all who wander are lost — some are just crawling the web."
