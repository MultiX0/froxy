package db

import (
	"encoding/json"
	"fmt"
	"net/url"
	"strings"
	"sync"
	"time"

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

	sem := make(chan struct{}, h.maxWorkers)
	var wg sync.WaitGroup
	errChan := make(chan error, len(links))

	for _, link := range links {
		wg.Add(1)
		go func(link models.Link) {
			defer wg.Done()

			sem <- struct{}{}
			defer func() { <-sem }()

			if err := h.InsertSingleLink(link); err != nil {
				errChan <- fmt.Errorf("failed to insert link %s: %w", link.URL[0], err)
			}
		}(link)
	}

	wg.Wait()
	close(errChan)

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

func (h *SupabaseHandler) InsertPageLinks(pageID int, fromURL string, links []models.Link) error {
	if len(links) == 0 {
		return nil
	}

	var linksData []map[string]interface{}

	fromParsedURL, err := url.Parse(fromURL)
	if err != nil {
		return fmt.Errorf("failed to parse source URL: %v", err)
	}
	fromDomain := fromParsedURL.Host

	for _, link := range links {
		linkType := "external"
		if toParsedURL, err := url.Parse(link.URL); err == nil {
			if toParsedURL.Host == fromDomain {
				linkType = "internal"
			}
		}
		linkData := map[string]interface{}{
			"from_page_id": pageID,
			"to_url":       link.URL,
			"anchor_text":  link.Text,
			"link_type":    linkType,
			"created_at":   time.Now().UTC(),
		}
		linksData = append(linksData, linkData)
	}

	result := supabaseClient.From("links").Insert(linksData, false, "", "", "")
	_, _, err = result.Execute()

	if err != nil {
		return fmt.Errorf("failed to insert links batch: %v", err)
	}

	fmt.Printf("Successfully inserted %d links for page ID %d\n", len(links), pageID)
	return nil
}

func (h *SupabaseHandler) InsertPageHeadings(pageID int, headings map[string][]string) error {
	if len(headings) == 0 {
		return nil
	}

	headingsData := make([]map[string]any, 0)

	for headingType, texts := range headings {
		for i, text := range texts {
			if strings.TrimSpace(text) != "" {
				headingsData = append(headingsData, map[string]any{
					"page_id":      pageID,
					"heading_type": headingType,
					"text":         text,
					"position":     i + 1,
				})
			}
		}
	}

	if len(headingsData) > 0 {
		result := supabaseClient.From("page_headings").Insert(headingsData, false, "", "", "exact")
		_, _, err := result.Execute()
		if err != nil {
			return fmt.Errorf("failed to insert headings: %v", err)
		}
	}

	return nil
}

func (h *SupabaseHandler) InsertPageData(page models.PageData) error {

	result := supabaseClient.From("pages").Insert(map[string]any{
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
	}, false, "", "", "exact")

	data, _, err := result.Execute()

	if err != nil {
		return fmt.Errorf("failed to insert page: %v", err)
	}

	var insertedPage []map[string]interface{}
	if err := json.Unmarshal(data, &insertedPage); err != nil {
		return fmt.Errorf("failed to unmarshal page result: %v", err)
	}

	if len(insertedPage) == 0 {
		return fmt.Errorf("no page data returned after insert")
	}

	pageID, ok := insertedPage[0]["id"].(float64)
	if !ok {
		return fmt.Errorf("failed to get page ID")
	}

	if len(page.OutboundLinks) > 0 {
		err := h.InsertPageLinks(int(pageID), page.URL, page.OutboundLinks)
		if err != nil {
			fmt.Printf("Warning: Failed to insert links for page %s: %v\n", page.URL, err)

		}
	}

	if len(page.Headings) > 0 {
		err := h.InsertPageHeadings(int(pageID), page.Headings)
		if err != nil {
			fmt.Printf("Warning: Failed to insert headings for page %s: %v\n", page.URL, err)
		}
	}

	fmt.Printf("PageData: %s inserted with ID %d\n", page.Title, int(pageID))
	return nil
}

func (h *SupabaseHandler) UpsertPageData(page models.PageData) error {

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
	}, "url", "", "exact")

	data, _, err := result.Execute()
	if err != nil {
		return fmt.Errorf("failed to upsert page: %v", err)
	}

	var upsertedPage []map[string]interface{}
	if err := json.Unmarshal(data, &upsertedPage); err != nil {
		return fmt.Errorf("failed to unmarshal page result: %v", err)
	}

	if len(upsertedPage) == 0 {
		return fmt.Errorf("no page data returned after upsert")
	}

	pageID, ok := upsertedPage[0]["id"].(float64)
	if !ok {
		return fmt.Errorf("failed to get page ID")
	}

	fmt.Printf("Deleting existing links for page ID: %d\n", int(pageID))
	deleteLinksResult := supabaseClient.From("links").Delete("", "").Eq("from_page_id", fmt.Sprintf("%.0f", pageID))
	_, _, err = deleteLinksResult.Execute()
	if err != nil {
		fmt.Printf("Warning: Failed to delete existing links for page %d: %v\n", int(pageID), err)

	}

	fmt.Printf("Deleting existing headings for page ID: %d\n", int(pageID))
	deleteHeadingsResult := supabaseClient.From("headings").Delete("", "").Eq("page_id", fmt.Sprintf("%.0f", pageID))
	_, _, err = deleteHeadingsResult.Execute()
	if err != nil {
		fmt.Printf("Warning: Failed to delete existing headings for page %d: %v\n", int(pageID), err)

	}

	if len(page.OutboundLinks) > 0 {
		err := h.InsertPageLinks(int(pageID), page.URL, page.OutboundLinks)
		if err != nil {
			fmt.Printf("Warning: Failed to insert links for page %s: %v\n", page.URL, err)

		}
	}

	if len(page.Headings) > 0 {
		err := h.InsertPageHeadings(int(pageID), page.Headings)
		if err != nil {
			fmt.Printf("Warning: Failed to insert headings for page %s: %v\n", page.URL, err)
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
		handlerInstance = NewSupabaseHandler(10)
	})
	return handlerInstance
}
