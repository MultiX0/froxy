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
	"github.com/froxy/utils"
	"github.com/lib/pq"
	_ "github.com/lib/pq"
	"github.com/qdrant/go-client/qdrant"
)

type PostgresHandler struct {
	db           *sql.DB
	qdrantClient *qdrant.Client
}

var pgHandler *PostgresHandler

func InitPostgres(qdrantClient *qdrant.Client) error {
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

	db.SetMaxOpenConns(50)
	db.SetMaxIdleConns(10)
	db.SetConnMaxLifetime(5 * time.Minute)
	db.SetConnMaxIdleTime(2 * time.Minute)

	pgHandler = &PostgresHandler{
		db:           db,
		qdrantClient: qdrantClient,
	}

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
	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()

	// Simplified pages table with UUID for Qdrant sync
	createPagesTable := `
	CREATE TABLE IF NOT EXISTS pages (
		id SERIAL PRIMARY KEY,
		qdrant_id UUID NOT NULL UNIQUE,
		url TEXT NOT NULL UNIQUE,
		title TEXT,
		status_code INTEGER,
		crawl_date TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
		updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
	);`

	// Links table for relationship tracking
	createLinksTable := `
	CREATE TABLE IF NOT EXISTS links (
		id SERIAL PRIMARY KEY,
		from_page_id INTEGER REFERENCES pages(id) ON DELETE CASCADE,
		to_url TEXT NOT NULL,
		anchor_text TEXT,
		link_type CHARACTER VARYING(20) DEFAULT 'external',
		created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
	);`

	// Create indexes
	createIndexes := []string{
		"CREATE INDEX IF NOT EXISTS idx_pages_url ON pages(url);",
		"CREATE INDEX IF NOT EXISTS idx_pages_qdrant_id ON pages(qdrant_id);",
		"CREATE INDEX IF NOT EXISTS idx_links_from_page_id ON links(from_page_id);",
		"CREATE INDEX IF NOT EXISTS idx_links_to_url ON links(to_url);",
	}

	tables := []string{
		createPagesTable,
		createLinksTable,
	}

	// Create tables
	for _, query := range tables {
		if _, err := p.db.ExecContext(ctx, query); err != nil {
			return fmt.Errorf("failed to create table: %v", err)
		}
	}

	// Create indexes
	for _, query := range createIndexes {
		if _, err := p.db.ExecContext(ctx, query); err != nil {
			return fmt.Errorf("failed to create index: %v", err)
		}
	}

	log.Println("Database tables and indexes created successfully.")
	return nil
}

// Batch insert for links
func (p *PostgresHandler) batchInsertLinks(ctx context.Context, tx *sql.Tx, pageID int, links []models.Link) error {
	if len(links) == 0 {
		return nil
	}

	stmt, err := tx.PrepareContext(ctx, "INSERT INTO links (from_page_id, to_url, anchor_text, link_type) VALUES ($1, $2, $3, $4)")
	if err != nil {
		return fmt.Errorf("failed to prepare link insert statement: %w", err)
	}
	defer stmt.Close()

	batchSize := 100
	for i := 0; i < len(links); i += batchSize {
		end := i + batchSize
		if end > len(links) {
			end = len(links)
		}

		for j := i; j < end; j++ {
			link := links[j]
			if _, err := stmt.ExecContext(ctx, pageID, link.URL, link.Text, "external"); err != nil {
				if pqErr, ok := err.(*pq.Error); ok {
					log.Printf("PostgreSQL error inserting link: %v (Code: %s)", err, pqErr.Code)
				}
				return fmt.Errorf("failed to insert link batch at index %d: %w", j, err)
			}
		}

		select {
		case <-ctx.Done():
			return ctx.Err()
		default:
		}
	}

	return nil
}

// UpsertPageData - Simplified with integrated Qdrant upsert
func (p *PostgresHandler) UpsertPageData(pageData models.PageData) error {
	timeout := 120 * time.Second // Increased for embedding generation
	if len(pageData.OutboundLinks) > 100 {
		timeout = 180 * time.Second
	}

	ctx, cancel := context.WithTimeout(context.Background(), timeout)
	defer cancel()

	// Generate deterministic UUID for Qdrant
	qdrantID := utils.GenerateUUIDFromURL(pageData.URL)

	var pageID int
	err := p.withTransaction(ctx, func(tx *sql.Tx) error {
		// Upsert page data
		upsertPageQuery := `
			INSERT INTO pages (
				qdrant_id, url, title, status_code, crawl_date, updated_at
			) VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
			ON CONFLICT (url) DO UPDATE SET
				title = EXCLUDED.title,
				status_code = EXCLUDED.status_code,
				crawl_date = EXCLUDED.crawl_date,
				updated_at = CURRENT_TIMESTAMP
			RETURNING id;`

		err := tx.QueryRowContext(ctx, upsertPageQuery,
			qdrantID,
			pageData.URL,
			pageData.Title,
			pageData.StatusCode,
			pageData.CrawlDate,
		).Scan(&pageID)

		if err != nil {
			log.Printf("ERROR: Failed to upsert page data for URL %s: %v", pageData.URL, err)
			return fmt.Errorf("failed to upsert page data: %w", err)
		}

		// Delete existing links before re-inserting
		if _, err := tx.ExecContext(ctx, "DELETE FROM links WHERE from_page_id = $1", pageID); err != nil {
			log.Printf("ERROR: Failed to delete existing links for page ID %d: %v", pageID, err)
			return fmt.Errorf("failed to delete existing links: %w", err)
		}

		// Batch insert links
		if err := p.batchInsertLinks(ctx, tx, pageID, pageData.OutboundLinks); err != nil {
			log.Printf("ERROR: Failed to batch insert links for page ID %d: %v", pageID, err)
			return fmt.Errorf("failed to insert links: %w", err)
		}

		return nil
	})

	if err != nil {
		return fmt.Errorf("failed to upsert page to PostgreSQL: %w", err)
	}

	// upsert to Qdrant
	if err := UpsertPageToQdrant(p.qdrantClient, pageData); err != nil {
		log.Printf("ERROR: Failed to upsert page to Qdrant for URL %s: %v", pageData.URL, err)
		return fmt.Errorf("failed to upsert page to Qdrant: %w", err)
	}

	log.Printf("Successfully stored page data for %s (PostgreSQL ID: %d, Qdrant ID: %s, Links: %d)",
		pageData.URL, pageID, qdrantID, len(pageData.OutboundLinks))

	return nil
}

// GetPageByURL - Simplified
// func (p *PostgresHandler) GetPageByURL(url string) (*models.PageData, error) {
// 	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
// 	defer cancel()

// 	pageData := &models.PageData{
// 		OutboundLinks: make([]models.Link, 0),
// 	}

// 	var pageID int
// 	var qdrantID string
// 	query := `
// 		SELECT id, qdrant_id, url, title, status_code, crawl_date, updated_at
// 		FROM pages WHERE url = $1`

// 	err := p.db.QueryRowContext(ctx, query, url).Scan(
// 		&pageID, &qdrantID, &pageData.URL, &pageData.Title,
// 		&pageData.StatusCode, &pageData.CrawlDate, &pageData.LastModified,
// 	)

// 	if err != nil {
// 		if err == sql.ErrNoRows {
// 			return nil, nil
// 		}
// 		return nil, fmt.Errorf("failed to get page data: %w", err)
// 	}

// 	// Get outbound links
// 	linksQuery := "SELECT to_url, anchor_text FROM links WHERE from_page_id = $1 ORDER BY id"
// 	rows, err := p.db.QueryContext(ctx, linksQuery, pageID)
// 	if err != nil {
// 		return nil, fmt.Errorf("failed to get links: %w", err)
// 	}
// 	defer rows.Close()

// 	for rows.Next() {
// 		var link models.Link
// 		if err := rows.Scan(&link.URL, &link.Text); err != nil {
// 			return nil, fmt.Errorf("failed to scan link: %w", err)
// 		}
// 		pageData.OutboundLinks = append(pageData.OutboundLinks, link)
// 	}
// 	if err = rows.Err(); err != nil {
// 		return nil, fmt.Errorf("error iterating links: %w", err)
// 	}

// 	return pageData, nil
// }

// func (p *PostgresHandler) GetPageCount() (int, error) {
// 	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
// 	defer cancel()

// 	var count int
// 	err := p.db.QueryRowContext(ctx, "SELECT COUNT(*) FROM pages").Scan(&count)
// 	if err != nil {
// 		return 0, fmt.Errorf("failed to get page count: %w", err)
// 	}
// 	return count, nil
// }

func (p *PostgresHandler) HealthCheck() error {
	if p == nil || p.db == nil {
		return fmt.Errorf("database handler or connection is nil")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := p.db.PingContext(ctx); err != nil {
		return fmt.Errorf("database ping failed: %w", err)
	}

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

func (p *PostgresHandler) GracefulShutdown(timeout time.Duration) error {
	if p.db == nil {
		return nil
	}

	ctx, cancel := context.WithTimeout(context.Background(), timeout)
	defer cancel()

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
