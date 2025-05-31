# 🕷️ Froxy

> A kinda chill open-source web engine that crawls, indexes, and vibes with content.

![froxy banner](https://aoxixugclqbvbuzttexn.supabase.co/storage/v1/object/public/dummy//Screenshot%20from%202025-05-30%2003-55-57.png)

## 🚧 What is Froxy?

Froxy is a little playground project that turned into a modular web engine. It crawls pages, indexes their content, and stores all that delicious data into a neat Supabase database. Frontend? Yup, that too (Next.js UI is in the game, but running on mock data for now).

It's early. It's rough. But it's fun.

---

## 🧠 What does it do?

* Crawls websites and grabs all the juicy bits (Golang 🕷️)
* Indexes text and calculates TF-IDF (Node.js 🧠)
* Stores everything in Supabase (our cozy little DB ☁️)
* UI in Next.js (mock data for now, real data soon!)

---

## 🗂️ Folder Structure

```bash
froxy/
├── front-end/          # Next.js UI (currently running on mock data)
├── indexer/            # Node.js app for text indexing & TF-IDF
└── spider/             # Go crawler that collects and dumps data into Supabase
```

---

## ⚙️ Tech Stack

### 🕷️ Spider (Go)

* Crawls the web
* Extracts content, headings, metadata
* Pushes everything to Supabase

**Structure:**

```bash
spider/
├── db/                 # DB connection stuff
├── functions/          # Crawling logic
├── models/             # Structs & data models
├── utils/              # Helpers
└── main.go             # Entry point
```

### 🧠 Indexer (Node.js)

* Processes content
* Calculates TF-IDF scores
* Keeps track of what's running, errors, etc.

**Uses:**

* `@nlpjs/lang-ar`
* `natural`
* `stopword`
* `express`, `dotenv`, and Supabase SDK

**Endpoints:**

* `GET /health` → sanity check
* `GET /indexing-tracked` → kicks off TF-IDF indexing (with status tracking)
* `GET /indexing-status` → see how it's going

### 🎨 Frontend (Next.js)

* Visualizes the indexed data (with mocked JSON for now)
* Testing UI/UX before plugging into real backend

> It's more of a designer's sandbox right now 🛝

---

## 🛢️ Database Schema (Supabase)

* `terms` → unique terms
* `term_page_index` → TF-IDF data with metadata
* `pages` → all crawled pages
* `links` → internal + external links
* `page_headings` → headings for SEO analysis

Indexes in place so it doesn't crawl like a snail 🐌

---

## 🧪 Local Dev Tips

### Spider (Go)

```bash
cd spider
go run main.go
```

### Indexer (Node.js)

```bash
cd indexer
npm i
node app.js
```

Then hit:

```
curl http://localhost:PORT/indexing-tracked
```

### Frontend (Next.js)

```bash
cd front-end
npm i
npm run dev
```

---

## 🪪 License

MIT — so you can fork it, break it, remix it, deploy it, or just look at it and say "cool."

---

## 🌱 What's next?

* Plug frontend into real Supabase data
* Better crawler filters & depth control
* Web UI for managing crawls & indexing
* Maybe some cool visualizations (network graph, anyone?)

---

## ✨ Stay weird

Froxy is an experiment. It's not production-ready. It doesn't want to be. But it's got potential.

Made with 🖤 by someone who just likes building stuff.

> PRs welcome. Bugs inevitable. Fun guaranteed.
