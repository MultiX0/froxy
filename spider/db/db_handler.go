package db

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"os"
	"strings"
	"time"

	"github.com/froxy/models"
	"github.com/lib/pq"
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

	// Test the connection with timeout
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	log.Println("Pinging database to verify connection...")
	if err := db.PingContext(ctx); err != nil {
		db.Close()
		return fmt.Errorf("failed to ping database: %v", err)
	}
	log.Println("Successfully connected to PostgreSQL database.")

	db.SetMaxOpenConns(50)                 // Increased for concurrent workers
	db.SetMaxIdleConns(10)                 // Increased idle connections
	db.SetConnMaxLifetime(5 * time.Minute) // Connection lifetime
	db.SetConnMaxIdleTime(2 * time.Minute) // Idle connection timeout

	pgHandler = &PostgresHandler{db: db}

	if err := pgHandler.createTables(); err != nil {
		return fmt.Errorf("failed to create tables: %v", err)
	}
	log.Println("Database tables and indexes creation check completed.")

	return nil
}

func GetPostgresHandler() *PostgresHandler {
	return pgHandler
}

// Enhanced transaction wrapper with better error handling
func (p *PostgresHandler) withTransaction(ctx context.Context, fn func(*sql.Tx) error) error {
	// Validate connection before starting transaction
	if err := p.HealthCheck(); err != nil {
		return fmt.Errorf("database health check failed before transaction: %w", err)
	}

	tx, err := p.db.BeginTx(ctx, &sql.TxOptions{
		Isolation: sql.LevelReadCommitted,
	})
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}

	var committed bool
	defer func() {
		if !committed {
			if rbErr := tx.Rollback(); rbErr != nil {
				// Only log rollback errors if they're not due to already closed transaction
				if !strings.Contains(rbErr.Error(), "already been committed or rolled back") {
					log.Printf("ERROR: Failed to rollback transaction: %v", rbErr)
				}
			}
		}
	}()

	if err := fn(tx); err != nil {
		return err
	}

	if err := tx.Commit(); err != nil {
		return fmt.Errorf("failed to commit transaction: %w", err)
	}
	committed = true

	return nil
}

func (p *PostgresHandler) createTables() error {
	// Use context with timeout for table creation
	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()

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

	// Create tables with context
	for _, query := range tables {
		if _, err := p.db.ExecContext(ctx, query); err != nil {
			return fmt.Errorf("failed to create table: %v", err)
		}
	}

	// Create indexes with context
	for _, query := range createIndexes {
		if _, err := p.db.ExecContext(ctx, query); err != nil {
			return fmt.Errorf("failed to create index: %v", err)
		}
	}

	log.Println("Database tables and indexes created successfully.")
	return nil
}

// Batch insert for headings
func (p *PostgresHandler) batchInsertHeadings(ctx context.Context, tx *sql.Tx, pageID int, headings map[string][]string) error {
	if len(headings) == 0 {
		return nil
	}

	// Prepare batch insert statement
	stmt, err := tx.PrepareContext(ctx, "INSERT INTO page_headings (page_id, heading_type, text) VALUES ($1, $2, $3)")
	if err != nil {
		return fmt.Errorf("failed to prepare heading insert statement: %w", err)
	}
	defer stmt.Close()

	for tag, texts := range headings {
		if len(tag) > 10 {
			log.Printf("WARNING: Heading type '%s' exceeds 10 characters, skipping", tag)
			continue
		}
		for _, text := range texts {
			if _, err := stmt.ExecContext(ctx, pageID, tag, text); err != nil {
				return fmt.Errorf("failed to insert heading: %w", err)
			}
		}
	}
	return nil
}

// Batch insert for links
func (p *PostgresHandler) batchInsertLinks(ctx context.Context, tx *sql.Tx, pageID int, links []models.Link) error {
	if len(links) == 0 {
		return nil
	}

	// Use batch insert with prepared statement for better performance
	stmt, err := tx.PrepareContext(ctx, "INSERT INTO links (from_page_id, to_url, anchor_text, link_type) VALUES ($1, $2, $3, $4)")
	if err != nil {
		return fmt.Errorf("failed to prepare link insert statement: %w", err)
	}
	defer stmt.Close()

	// Process links in batches to avoid memory issues
	batchSize := 100
	for i := 0; i < len(links); i += batchSize {
		end := i + batchSize
		if end > len(links) {
			end = len(links)
		}

		for j := i; j < end; j++ {
			link := links[j]
			if _, err := stmt.ExecContext(ctx, pageID, link.URL, link.Text, "external"); err != nil {
				// Check if it's a connection error
				if pqErr, ok := err.(*pq.Error); ok {
					log.Printf("PostgreSQL error inserting link: %v (Code: %s)", err, pqErr.Code)
				}
				return fmt.Errorf("failed to insert link batch at index %d: %w", j, err)
			}
		}

		// Check context between batches
		select {
		case <-ctx.Done():
			return ctx.Err()
		default:
		}
	}

	return nil
}

func (p *PostgresHandler) UpsertPageData(pageData models.PageData) error {

	timeout := 60 * time.Second
	if len(pageData.OutboundLinks) > 100 {
		timeout = 120 * time.Second
	}

	ctx, cancel := context.WithTimeout(context.Background(), timeout)
	defer cancel()

	return p.withTransaction(ctx, func(tx *sql.Tx) error {
		// Prepare nullable last_modified for DB insertion
		var lastModified sql.NullTime
		if !pageData.LastModified.IsZero() {
			lastModified = sql.NullTime{Time: pageData.LastModified, Valid: true}
		}

		// Convert response time to milliseconds for storage
		responseTimeMs := int(pageData.ResponseTime.Milliseconds())

		// Upsert page data with context
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

		err := tx.QueryRowContext(ctx, upsertPageQuery,
			pageData.URL,
			pageData.Title,
			pageData.MetaDescription,
			pageData.MetaKeywords,
			pageData.Language,
			pageData.Canonical,
			pageData.MainContent,
			pageData.WordCount,
			pageData.StatusCode,
			responseTimeMs,
			pageData.ContentType,
			lastModified,
			pageData.CrawlDate,
		).Scan(&pageID)

		if err != nil {
			log.Printf("ERROR: Failed to upsert page data for URL %s: %v", pageData.URL, err)
			return fmt.Errorf("failed to upsert page data: %w", err)
		}

		// Delete existing related data before re-inserting
		deleteQueries := []string{
			"DELETE FROM page_headings WHERE page_id = $1",
			"DELETE FROM links WHERE from_page_id = $1",
		}

		for _, query := range deleteQueries {
			if _, err := tx.ExecContext(ctx, query, pageID); err != nil {
				log.Printf("ERROR: Failed to delete existing data for page ID %d: %v", pageID, err)
				return fmt.Errorf("failed to delete existing data: %w", err)
			}
		}

		// Use batch insert for headings
		if err := p.batchInsertHeadings(ctx, tx, pageID, pageData.Headings); err != nil {
			log.Printf("ERROR: Failed to batch insert headings for page ID %d: %v", pageID, err)
			return fmt.Errorf("failed to insert headings: %w", err)
		}

		// Use batch insert for links
		if err := p.batchInsertLinks(ctx, tx, pageID, pageData.OutboundLinks); err != nil {
			log.Printf("ERROR: Failed to batch insert links for page ID %d: %v", pageID, err)
			return fmt.Errorf("failed to insert links: %w", err)
		}

		log.Printf("Successfully stored page data for %s (ID: %d, Links: %d)", pageData.URL, pageID, len(pageData.OutboundLinks))
		return nil
	})
}

func (p *PostgresHandler) GetPageByURL(url string) (*models.PageData, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	pageData := &models.PageData{
		Headings:      make(map[string][]string),
		OutboundLinks: make([]models.Link, 0),
	}

	var pageID int
	var lastModified sql.NullTime
	var responseTimeMs int
	query := `
        SELECT id, url, title, meta_description, meta_keywords, language, canonical,
               content, word_count, status_code, response_time, content_type,
               last_modified, crawl_date, created_at, updated_at
        FROM pages WHERE url = $1`

	err := p.db.QueryRowContext(ctx, query, url).Scan(
		&pageID, &pageData.URL, &pageData.Title, &pageData.MetaDescription,
		&pageData.MetaKeywords, &pageData.Language, &pageData.Canonical,
		&pageData.MainContent, &pageData.WordCount, &pageData.StatusCode,
		&responseTimeMs, &pageData.ContentType, &lastModified, &pageData.CrawlDate,
		&pageData.CrawlDate, &pageData.LastModified,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("failed to get page data: %w", err)
	}

	if lastModified.Valid {
		pageData.LastModified = lastModified.Time
	} else {
		pageData.LastModified = time.Time{}
	}

	pageData.ResponseTime = time.Duration(responseTimeMs) * time.Millisecond

	// Get headings with context
	headingsQuery := "SELECT heading_type, text FROM page_headings WHERE page_id = $1 ORDER BY id"
	rows, err := p.db.QueryContext(ctx, headingsQuery, pageID)
	if err != nil {
		return nil, fmt.Errorf("failed to get headings: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		var tag, text string
		if err := rows.Scan(&tag, &text); err != nil {
			return nil, fmt.Errorf("failed to scan heading: %w", err)
		}
		pageData.Headings[tag] = append(pageData.Headings[tag], text)
	}
	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating headings: %w", err)
	}

	// Get outbound links with context
	linksQuery := "SELECT to_url, anchor_text FROM links WHERE from_page_id = $1 ORDER BY id"
	rows, err = p.db.QueryContext(ctx, linksQuery, pageID)
	if err != nil {
		return nil, fmt.Errorf("failed to get links: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		var link models.Link
		if err := rows.Scan(&link.URL, &link.Text); err != nil {
			return nil, fmt.Errorf("failed to scan link: %w", err)
		}
		pageData.OutboundLinks = append(pageData.OutboundLinks, link)
	}
	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating links: %w", err)
	}

	return pageData, nil
}

func (p *PostgresHandler) GetPageCount() (int, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var count int
	err := p.db.QueryRowContext(ctx, "SELECT COUNT(*) FROM pages").Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("failed to get page count: %w", err)
	}
	return count, nil
}

// health check method
func (p *PostgresHandler) HealthCheck() error {
	if p == nil || p.db == nil {
		return fmt.Errorf("database handler or connection is nil")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// Test both connectivity and basic query execution
	if err := p.db.PingContext(ctx); err != nil {
		return fmt.Errorf("database ping failed: %w", err)
	}

	// Test with a simple query to ensure the connection is truly functional
	var result int
	if err := p.db.QueryRowContext(ctx, "SELECT 1").Scan(&result); err != nil {
		return fmt.Errorf("database query test failed: %w", err)
	}

	return nil
}

func (p *PostgresHandler) Close() error {
	if p.db != nil {
		log.Println("Closing database connection...")
		return p.db.Close()
	}
	return nil
}

// shutdown helper
func (p *PostgresHandler) GracefulShutdown(timeout time.Duration) error {
	if p.db == nil {
		return nil
	}

	// Create a context with timeout for shutdown
	ctx, cancel := context.WithTimeout(context.Background(), timeout)
	defer cancel()

	// Channel to signal completion
	done := make(chan error, 1)

	go func() {
		log.Println("Initiating database shutdown...")
		done <- p.db.Close()
	}()

	select {
	case err := <-done:
		if err != nil {
			log.Printf("Error during database shutdown: %v", err)
		} else {
			log.Println("Database connection closed successfully")
		}
		return err
	case <-ctx.Done():
		log.Println("Database shutdown timeout reached, forcing close")
		return fmt.Errorf("database shutdown timeout")
	}
}
