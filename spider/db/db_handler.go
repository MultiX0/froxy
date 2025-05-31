// db/postgres.go
package db

import (
	"database/sql"
	"fmt"
	"log"
	"os"
	"time"

	"github.com/froxy/models"
	_ "github.com/lib/pq"
)

type PostgresHandler struct {
	db *sql.DB
}

var pgHandler *PostgresHandler

func InitPostgres() error {
	dbHost := os.Getenv("DB_HOST")
	dbPort := os.Getenv("DB_PORT")
	dbUser := os.Getenv("DB_USER")
	dbPassword := os.Getenv("DB_PASSWORD")
	dbName := os.Getenv("DB_NAME")
	dbSSLMode := os.Getenv("DB_SSLMODE")

	if dbSSLMode == "" {
		dbSSLMode = "disable"
	}

	if dbPort == "" {
		dbPort = "5432"
	}

	connStr := fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=%s",
		dbHost, dbPort, dbUser, dbPassword, dbName, dbSSLMode)

	log.Println("Attempting to open database connection...")
	db, err := sql.Open("postgres", connStr)
	if err != nil {
		return fmt.Errorf("failed to open database: %v", err)
	}

	// Test the connection
	log.Println("Pinging database to verify connection...")
	if err := db.Ping(); err != nil {
		db.Close() // Close connection if ping fails
		return fmt.Errorf("failed to ping database: %v", err)
	}
	log.Println("Successfully connected to PostgreSQL database.")

	// Set connection pool settings
	db.SetMaxOpenConns(25)
	db.SetMaxIdleConns(25)
	db.SetConnMaxLifetime(5 * time.Minute)

	pgHandler = &PostgresHandler{db: db}

	// Create tables if they don't exist
	if err := pgHandler.createTables(); err != nil {
		return fmt.Errorf("failed to create tables: %v", err)
	}
	log.Println("Database tables and indexes creation check completed.")

	return nil
}

func GetPostgresHandler() *PostgresHandler {
	return pgHandler
}

func (p *PostgresHandler) createTables() error {
	// Match the exact schema provided
	createPagesTable := `
    CREATE TABLE IF NOT EXISTS pages (
        id SERIAL PRIMARY KEY,
        url TEXT NOT NULL,
        title TEXT,
        meta_description TEXT,
        meta_keywords TEXT,
        language TEXT,
        canonical TEXT,
        content TEXT,
        word_count INTEGER DEFAULT 0,
        status_code INTEGER,
        response_time INTEGER,
        content_type TEXT,
        last_modified TIMESTAMP WITHOUT TIME ZONE,
        crawl_date TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT pages_url_key UNIQUE (url)
    );`

	createPageHeadingsTable := `
    CREATE TABLE IF NOT EXISTS page_headings (
        id SERIAL NOT NULL,
        page_id INTEGER,
        heading_type CHARACTER VARYING(10) NOT NULL,
        text TEXT NOT NULL,
        position INTEGER DEFAULT 1,
        created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT page_headings_pkey PRIMARY KEY (id),
        CONSTRAINT page_headings_page_id_fkey FOREIGN KEY (page_id) REFERENCES pages (id) ON DELETE CASCADE
    );`

	createLinksTable := `
    CREATE TABLE IF NOT EXISTS links (
        id SERIAL PRIMARY KEY,
        from_page_id INTEGER REFERENCES pages(id) ON DELETE CASCADE,
        to_url TEXT NOT NULL,
        anchor_text TEXT,
        link_type CHARACTER VARYING(20) DEFAULT 'external',
        created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );`

	createTermsTable := `
    CREATE TABLE IF NOT EXISTS terms (
        id SERIAL PRIMARY KEY,
        term TEXT,
        CONSTRAINT terms_term_key UNIQUE (term)
    );`

	createIndexes := []string{
		"CREATE INDEX IF NOT EXISTS idx_pages_url ON pages USING btree (url);",
		"CREATE INDEX IF NOT EXISTS idx_pages_crawl_date ON pages USING btree (crawl_date);",
		"CREATE INDEX IF NOT EXISTS idx_pages_language ON pages USING btree (language);",
		"CREATE INDEX IF NOT EXISTS idx_pages_status_code ON pages USING btree (status_code);",
		"CREATE INDEX IF NOT EXISTS idx_pages_response_time ON pages USING btree (response_time);",
		"CREATE INDEX IF NOT EXISTS idx_pages_last_modified ON pages USING btree (last_modified);",
		"CREATE INDEX IF NOT EXISTS idx_pages_language_time ON pages USING btree (language, crawl_date DESC);",
		"CREATE INDEX IF NOT EXISTS idx_page_headings_page_id ON page_headings USING btree (page_id);",
		"CREATE INDEX IF NOT EXISTS idx_page_headings_type ON page_headings USING btree (heading_type);",
		"CREATE INDEX IF NOT EXISTS idx_page_headings_position ON page_headings USING btree (position);",
		"CREATE INDEX IF NOT EXISTS idx_links_from_page_id ON links USING btree (from_page_id);",
		"CREATE INDEX IF NOT EXISTS idx_links_to_url ON links USING btree (to_url);",
		"CREATE INDEX IF NOT EXISTS idx_links_type ON links USING btree (link_type);",
		"CREATE INDEX IF NOT EXISTS idx_links_anchor_text ON links USING btree (anchor_text);",
		"CREATE UNIQUE INDEX IF NOT EXISTS idx_terms_term ON terms USING btree (term);",
	}

	tables := []string{
		createPagesTable,
		createPageHeadingsTable,
		createLinksTable,
		createTermsTable,
	}

	// Create tables
	for _, query := range tables {
		if _, err := p.db.Exec(query); err != nil {
			return fmt.Errorf("failed to create table: %v", err)
		}
	}

	// Create indexes
	for _, query := range createIndexes {
		if _, err := p.db.Exec(query); err != nil {
			return fmt.Errorf("failed to create index: %v", err)
		}
	}

	log.Println("Database tables and indexes created successfully by Go app (if not existing).")
	return nil
}

func (p *PostgresHandler) UpsertPageData(pageData models.PageData) error {
	tx, err := p.db.Begin()
	if err != nil {
		log.Printf("DEBUG: Failed to begin transaction for URL %s: %v", pageData.URL, err)
		return fmt.Errorf("failed to begin transaction: %v", err)
	}

	// Flag to track if commit happened, so rollback is conditionally executed.
	committed := false
	defer func() {
		if !committed {
			log.Printf("DEBUG: Rolling back transaction for URL %s due to error or panic.", pageData.URL)
			if rbErr := tx.Rollback(); rbErr != nil {
				log.Printf("ERROR: Failed to rollback transaction for URL %s: %v", pageData.URL, rbErr)
			}
		}
	}()

	// Prepare nullable last_modified for DB insertion
	var lastModified sql.NullTime
	if !pageData.LastModified.IsZero() {
		lastModified = sql.NullTime{Time: pageData.LastModified, Valid: true}
	}

	// Convert response time to milliseconds for storage
	responseTimeMs := int(pageData.ResponseTime.Milliseconds())

	// Upsert page data - using correct column names
	var pageID int
	upsertPageQuery := `
        INSERT INTO pages (
            url, title, meta_description, meta_keywords, language, canonical,
            content, word_count, status_code, response_time, content_type,
            last_modified, crawl_date, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, CURRENT_TIMESTAMP)
        ON CONFLICT (url) DO UPDATE SET
            title = EXCLUDED.title,
            meta_description = EXCLUDED.meta_description,
            meta_keywords = EXCLUDED.meta_keywords,
            language = EXCLUDED.language,
            canonical = EXCLUDED.canonical,
            content = EXCLUDED.content,
            word_count = EXCLUDED.word_count,
            status_code = EXCLUDED.status_code,
            response_time = EXCLUDED.response_time,
            content_type = EXCLUDED.content_type,
            last_modified = EXCLUDED.last_modified,
            crawl_date = EXCLUDED.crawl_date,
            updated_at = CURRENT_TIMESTAMP
        RETURNING id;`

	err = tx.QueryRow(upsertPageQuery,
		pageData.URL,
		pageData.Title,
		pageData.MetaDescription,
		pageData.MetaKeywords,
		pageData.Language,
		pageData.Canonical,
		pageData.MainContent, // Maps to 'content' in DB
		pageData.WordCount,
		pageData.StatusCode,
		responseTimeMs, // Stored as INTEGER milliseconds
		pageData.ContentType,
		lastModified, // sql.NullTime
		pageData.CrawlDate,
	).Scan(&pageID)

	if err != nil {
		log.Printf("ERROR: Failed to upsert page data for URL %s (main pages table): %v", pageData.URL, err)
		return fmt.Errorf("failed to upsert page data: %w", err)
	}

	// Delete existing related data before re-inserting
	deleteQueries := []string{
		"DELETE FROM page_headings WHERE page_id = $1",
		"DELETE FROM links WHERE from_page_id = $1",
	}

	for _, query := range deleteQueries {
		if _, err := tx.Exec(query, pageID); err != nil {
			log.Printf("ERROR: Failed to delete existing data for page ID %d, query: %s: %v", pageID, query, err)
			return fmt.Errorf("failed to delete existing data: %w", err)
		}
	}

	// Insert headings - using correct table and column names
	if len(pageData.Headings) > 0 {
		for tag, texts := range pageData.Headings {
			for _, text := range texts {
				// Check for heading_type length
				if len(tag) > 10 {
					log.Printf("WARNING: Heading type '%s' exceeds 10 characters. It will be truncated or fail insertion. Skipping.", tag)
					continue
				}
				_, err := tx.Exec("INSERT INTO page_headings (page_id, heading_type, text) VALUES ($1, $2, $3)",
					pageID, tag, text)
				if err != nil {
					log.Printf("ERROR: Failed to insert heading for page ID %d (tag: %s, text: %s): %v", pageID, tag, text, err)
					return fmt.Errorf("failed to insert heading: %w", err)
				}
			}
		}
	}

	// Insert outbound links - using correct column names
	if len(pageData.OutboundLinks) > 0 {
		for _, link := range pageData.OutboundLinks {
			_, err := tx.Exec("INSERT INTO links (from_page_id, to_url, anchor_text, link_type) VALUES ($1, $2, $3, $4)",
				pageID, link.URL, link.Text, "external")
			if err != nil {
				log.Printf("ERROR: Failed to insert link for page ID %d (URL: %s): %v", pageID, link.URL, err)
				return fmt.Errorf("failed to insert link: %w", err)
			}
		}
	}

	// ONLY COMMIT IF ALL ABOVE OPERATIONS SUCCEEDED
	if err := tx.Commit(); err != nil {
		log.Printf("ERROR: Failed to commit transaction for URL %s: %v", pageData.URL, err)
		return fmt.Errorf("failed to commit transaction: %v", err)
	}
	committed = true // Mark as committed so deferred rollback doesn't run

	log.Printf("Successfully stored page data for %s (ID: %d)", pageData.URL, pageID)
	return nil
}

func (p *PostgresHandler) GetPageByURL(url string) (*models.PageData, error) {
	pageData := &models.PageData{
		Headings:      make(map[string][]string),
		OutboundLinks: make([]models.Link, 0),
	}

	// Get page data from the 'pages' table - using correct column names
	var pageID int
	var lastModified sql.NullTime
	var responseTimeMs int
	query := `
        SELECT id, url, title, meta_description, meta_keywords, language, canonical,
               content, word_count, status_code, response_time, content_type,
               last_modified, crawl_date, created_at, updated_at
        FROM pages WHERE url = $1`

	err := p.db.QueryRow(query, url).Scan(
		&pageID, &pageData.URL, &pageData.Title, &pageData.MetaDescription,
		&pageData.MetaKeywords, &pageData.Language, &pageData.Canonical,
		&pageData.MainContent, // Maps to 'content' in DB
		&pageData.WordCount, &pageData.StatusCode,
		&responseTimeMs, // Stored as INTEGER milliseconds
		&pageData.ContentType, &lastModified, &pageData.CrawlDate,
		&pageData.CrawlDate, &pageData.LastModified,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil // No page found
		}
		return nil, fmt.Errorf("failed to get page data from pages table for URL %s: %w", url, err)
	}

	if lastModified.Valid {
		pageData.LastModified = lastModified.Time
	} else {
		pageData.LastModified = time.Time{} // Ensure zero time if NULL
	}

	// Convert response time from milliseconds to duration
	pageData.ResponseTime = time.Duration(responseTimeMs) * time.Millisecond

	// Get headings from the 'page_headings' table - using correct column names
	headingsQuery := "SELECT heading_type, text FROM page_headings WHERE page_id = $1 ORDER BY id"
	rows, err := p.db.Query(headingsQuery, pageID)
	if err != nil {
		return nil, fmt.Errorf("failed to get headings for page ID %d: %w", pageID, err)
	}
	defer rows.Close()

	for rows.Next() {
		var tag, text string
		if err := rows.Scan(&tag, &text); err != nil {
			return nil, fmt.Errorf("failed to scan heading row for page ID %d: %w", pageID, err)
		}
		pageData.Headings[tag] = append(pageData.Headings[tag], text)
	}
	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating heading rows for page ID %d: %w", pageID, err)
	}

	// Get outbound links from the 'links' table - using correct column names
	linksQuery := "SELECT to_url, anchor_text FROM links WHERE from_page_id = $1 ORDER BY id"
	rows, err = p.db.Query(linksQuery, pageID)
	if err != nil {
		return nil, fmt.Errorf("failed to get links for page ID %d: %w", pageID, err)
	}
	defer rows.Close()

	for rows.Next() {
		var link models.Link
		if err := rows.Scan(&link.URL, &link.Text); err != nil {
			return nil, fmt.Errorf("failed to scan link row for page ID %d: %w", pageID, err)
		}
		pageData.OutboundLinks = append(pageData.OutboundLinks, link)
	}
	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating link rows for page ID %d: %w", pageID, err)
	}

	return pageData, nil
}

func (p *PostgresHandler) GetPageCount() (int, error) {
	var count int
	err := p.db.QueryRow("SELECT COUNT(*) FROM pages").Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("failed to get page count: %w", err)
	}
	return count, nil
}

func (p *PostgresHandler) Close() error {
	if p.db != nil {
		log.Println("Closing database connection from db.Close()...")
		return p.db.Close()
	}
	return nil
}
