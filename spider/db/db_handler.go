package db

import (
	"encoding/json"
	"fmt"
	"net/url"
	"strings"
	"sync"

	"github.com/froxy/models"
)

var (
	handlerInstance *SupabaseHandler
	handlerOnce     sync.Once
)

var wg = &sync.WaitGroup{}

type SupabaseHandler struct {
	mu         sync.RWMutex
	maxWorkers int
}

func (h *SupabaseHandler) InsertLinksSimple(links []models.Link) error {
	if len(links) == 0 {
		return nil
	}

	// Semaphore to limit concurrent goroutines
	sem := make(chan struct{}, h.maxWorkers)
	var wg sync.WaitGroup
	errChan := make(chan error, len(links))

	for _, link := range links {
		wg.Add(1)
		go func(link models.Link) {
			defer wg.Done()

			// Acquire semaphore
			sem <- struct{}{}
			defer func() { <-sem }()

			if err := h.InsertSingleLink(link); err != nil {
				errChan <- fmt.Errorf("failed to insert link %s: %w", link.URL[0], err)
			}
		}(link)
	}

	wg.Wait()
	close(errChan)

	// Collect errors
	var errors []error
	for err := range errChan {
		errors = append(errors, err)
	}

	if len(errors) > 0 {
		return fmt.Errorf("insertion errors: %v", errors)
	}

	return nil
}

func (h *SupabaseHandler) InsertSingleLink(link models.Link) error {
	supabaseClient.From("links").Insert(link, true, "", "", "exact").Execute()

	fmt.Printf("Link: %s inserted.\n", link.URL)
	return nil
}

func (h *SupabaseHandler) InsertPageLinks(fromPageID int, fromURL string, outboundLinks []models.Link) error {
	if len(outboundLinks) == 0 {
		return nil
	}

	// Parse the source domain for link type classification
	fromParsedURL, err := url.Parse(fromURL)
	if err != nil {
		return fmt.Errorf("failed to parse source URL: %v", err)
	}
	fromDomain := fromParsedURL.Host

	// Prepare batch insert data
	linksData := make([]map[string]any, 0, len(outboundLinks))

	for _, link := range outboundLinks {
		// Skip empty links
		if link.URL == "" {
			continue
		}

		// Determine link type (internal vs external)
		linkType := "external"
		if toParsedURL, err := url.Parse(link.URL); err == nil {
			if toParsedURL.Host == fromDomain {
				linkType = "internal"
			}
		}

		linksData = append(linksData, map[string]any{
			"from_page_id": fromPageID,
			"to_url":       link.URL,
			"anchor_text":  link.Text,
			"link_type":    linkType,
		})
	}

	// Batch insert links
	if len(linksData) > 0 {
		result := supabaseClient.From("links").Insert(linksData, false, "", "", "exact")
		_, _, err := result.Execute()
		if err != nil {
			return fmt.Errorf("failed to insert links: %v", err)
		}
	}

	return nil
}

func (h *SupabaseHandler) InsertPageHeadings(pageID int, headings map[string][]string) error {
	if len(headings) == 0 {
		return nil
	}

	// Prepare headings data
	headingsData := make([]map[string]any, 0)

	for headingType, texts := range headings {
		for i, text := range texts {
			if strings.TrimSpace(text) != "" {
				headingsData = append(headingsData, map[string]any{
					"page_id":      pageID,
					"heading_type": headingType, // h1, h2, h3, etc.
					"text":         text,
					"position":     i + 1, // Order of appearance
				})
			}
		}
	}

	// Insert headings
	if len(headingsData) > 0 {
		result := supabaseClient.From("page_headings").Insert(headingsData, false, "", "", "exact")
		_, _, err := result.Execute()
		if err != nil {
			return fmt.Errorf("failed to insert headings: %v", err)
		}
	}

	return nil
}

// // Alternative method: Insert page and get ID in one go using upsert
func (h *SupabaseHandler) UpsertPageData(page models.PageData) error {
	// Use upsert to handle existing URLs
	result := supabaseClient.From("pages").Upsert(map[string]any{
		"url":              page.URL,
		"title":            page.Title,
		"meta_description": page.MetaDescription,
		"meta_keywords":    page.MetaKeywords,
		"language":         page.Language,
		"canonical":        page.Canonical,
		"content":          page.MainContent,
		"word_count":       page.WordCount,
		"status_code":      page.StatusCode,
		"response_time":    page.ResponseTime.Milliseconds(),
		"content_type":     page.ContentType,
		"crawl_date":       page.CrawlDate.UTC(),
		"last_modified":    page.LastModified.UTC(),
	}, "url", "", "")

	_, _, err := result.Execute()

	if err != nil {
		return fmt.Errorf("failed to upsert page: %v", err)
	}

	// Get the page ID by querying with URL
	pageResult := supabaseClient.From("pages").
		Select("id", "", false).
		Eq("url", page.URL)

	pageResultData, _, err := pageResult.Execute()

	if err != nil {
		return fmt.Errorf("failed to get page ID: %v", err)
	}

	var pages []map[string]interface{}
	if err := json.Unmarshal(pageResultData, &pages); err != nil {
		return fmt.Errorf("failed to unmarshal page query: %v", err)
	}

	if len(pages) == 0 {
		return fmt.Errorf("page not found after upsert")
	}

	pageID, ok := pages[0]["id"].(int64)
	if !ok {
		return fmt.Errorf("failed to get page ID from query")
	}

	// Delete existing links for this page (for updates)
	supabaseClient.From("links").Delete("", "").Eq("from_page_id", string(pageID)).Execute()

	// Insert new links
	if len(page.OutboundLinks) > 0 {
		err := h.InsertPageLinks(int(pageID), page.URL, page.OutboundLinks)
		if err != nil {
			fmt.Printf("Warning: Failed to insert links: %v\n", err)
		}
	}

	fmt.Printf("PageData: %s upserted with ID %d\n", page.Title, int(pageID))
	return nil
}

func NewSupabaseHandler(maxWorkers int) *SupabaseHandler {
	if maxWorkers <= 0 {
		maxWorkers = 10
	}
	return &SupabaseHandler{
		maxWorkers: maxWorkers,
	}
}

func GetSupabaseHandler() *SupabaseHandler {
	handlerOnce.Do(func() {
		handlerInstance = NewSupabaseHandler(10) // 10 concurrent workers
	})
	return handlerInstance
}
