package functions

import (
	"context"
	"encoding/xml"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"os"
	"os/signal"
	"regexp"
	"strings"
	"sync"
	"syscall"
	"time"

	"github.com/froxy/db"
	"github.com/froxy/models"
	"github.com/froxy/utils"
	"github.com/temoto/robotstxt"
	"golang.org/x/net/html"
)

// Sitemap structures for XML parsing
type Sitemap struct {
	XMLName xml.Name     `xml:"urlset"`
	URLs    []SitemapURL `xml:"url"`
}

type SitemapIndex struct {
	XMLName  xml.Name           `xml:"sitemapindex"`
	Sitemaps []SitemapReference `xml:"sitemap"`
}

type SitemapURL struct {
	Loc        string `xml:"loc"`
	LastMod    string `xml:"lastmod"`
	ChangeFreq string `xml:"changefreq"`
	Priority   string `xml:"priority"`
}

type SitemapReference struct {
	Loc     string `xml:"loc"`
	LastMod string `xml:"lastmod"`
}

type Crawler struct {
	BaseDomain   string
	LinksQueue   *[]models.Link
	VisitedUrls  map[string]struct{}
	QueuedUrls   map[string]bool
	Mu           *sync.Mutex
	Ctx          context.Context
	cancel       context.CancelFunc
	shutdownChan chan os.Signal
	httpClient   *http.Client
}

var robotsCache = make(map[string]*robotstxt.RobotsData)
var robotsCacheMu sync.RWMutex
var transport = ProxyTransport()

var (
	timesleep    = 2 * time.Second
	userAgent    = "FroxyBot/1.0"
	pagesCrawled = 0
	// Because we use semantic search now, we need a proper amount of content to embedded for a good results
	// so for this i added the minimum content length to avoid the pages that are empty or with less content so no meaning with embedding this pages it will just broke the search
	minContentLength = 1500 // Minimum content length requirement
)

// NewCrawler creates a new crawler instance with proper initialization
func NewCrawler() *Crawler {
	ctx, cancel := context.WithCancel(context.Background())
	shutdownChan := make(chan os.Signal, 1)
	signal.Notify(shutdownChan, syscall.SIGINT, syscall.SIGTERM)

	linksQueue := make([]models.Link, 0)

	// HTTP client with better settings

	httpClient := &http.Client{
		Timeout:   30 * time.Second,
		Transport: transport,
	}

	crawler := &Crawler{
		QueuedUrls:   make(map[string]bool),
		VisitedUrls:  make(map[string]struct{}),
		Mu:           &sync.Mutex{},
		LinksQueue:   &linksQueue,
		Ctx:          ctx,
		cancel:       cancel,
		shutdownChan: shutdownChan,
		httpClient:   httpClient,
	}

	if crawler.Mu == nil {
		log.Fatal("Failed to initialize mutex")
	}
	if crawler.LinksQueue == nil {
		log.Fatal("Failed to initialize LinksQueue")
	}

	return crawler
}

func (c *Crawler) Start(workerCount int, seedUrls ...string) {
	if c == nil {
		log.Fatal("Crawler instance is nil")
		return
	}
	if c.Mu == nil {
		log.Fatal("Crawler mutex is nil")
		return
	}

	if len(seedUrls) == 0 {
		logText := "No seed URLs provided."
		log.Println(logText)
		appendLog(logText)
		return
	}

	if parsedURL, err := url.Parse(seedUrls[0]); err == nil {
		c.BaseDomain = parsedURL.Host
		log.Printf("Set BaseDomain to: %s", c.BaseDomain)
		appendLog(fmt.Sprintf("Set BaseDomain to: %s", c.BaseDomain))
	}

	// First, try to crawl from sitemap
	baseURL := fmt.Sprintf("https://%s", c.BaseDomain)
	if err := c.crawlFromSitemap(baseURL); err != nil {
		log.Printf("Failed to crawl from sitemap: %v, falling back to seed URLs", err)
		appendLog(fmt.Sprintf("Failed to crawl from sitemap: %v, falling back to seed URLs", err))

		// Fall back to seed URLs if sitemap fails
		for _, url := range seedUrls {
			c.safeEnqueue(models.Link{URL: url})
		}
	}

	var wg sync.WaitGroup

	// Start shutdown monitor
	go c.monitorShutdown()

	// Start workers
	for i := 0; i < workerCount; i++ {
		wg.Add(1)
		go func(id int) {
			defer wg.Done()
			defer log.Printf("Worker %d exiting", id)

			consecutiveEmptyAttempts := 0
			maxEmptyAttempts := 10

			for {
				select {
				case <-c.Ctx.Done():
					log.Printf("Worker %d: Shutdown signal received", id)
					appendLog(fmt.Sprintf("Worker %d: Shutdown signal received", id))
					return
				default:
				}

				link, ok := c.safeDequeue()
				if !ok {
					consecutiveEmptyAttempts++
					if consecutiveEmptyAttempts >= maxEmptyAttempts {
						log.Printf("Worker %d: No work for %d attempts, exiting", id, maxEmptyAttempts)
						return
					}

					log.Printf("Worker %d: No work, waiting... (attempt %d/%d)", id, consecutiveEmptyAttempts, maxEmptyAttempts)

					select {
					case <-c.Ctx.Done():
						return
					case <-time.After(5 * time.Second):
						continue
					}
				}

				consecutiveEmptyAttempts = 0

				log.Printf("Worker %d: Processing %s", id, link.URL)
				if err := c.CrawlPage(link.URL); err != nil {
					log.Printf("Worker %d: Error crawling %s: %v", id, link.URL, err)
				}

				select {
				case <-c.Ctx.Done():
					return
				case <-time.After(timesleep):
					// Continue to next iteration
				}
			}
		}(i)
	}

	wg.Wait()
	log.Printf("All workers finished. Total pages crawled: %d", pagesCrawled)
}

// crawlFromSitemap attempts to populate the queue from sitemap.xml
func (c *Crawler) crawlFromSitemap(baseURL string) error {
	sitemapURLs := []string{
		baseURL + "/sitemap.xml",
		baseURL + "/sitemap_index.xml",
		baseURL + "/sitemaps.xml",
	}

	for _, sitemapURL := range sitemapURLs {
		log.Printf("Trying to fetch sitemap from: %s", sitemapURL)

		resp, err := c.httpClient.Get(sitemapURL)
		if err != nil {
			log.Printf("Failed to fetch sitemap from %s: %v", sitemapURL, err)
			continue
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusOK {
			log.Printf("Sitemap not found at %s, status: %d", sitemapURL, resp.StatusCode)
			continue
		}

		body, err := io.ReadAll(resp.Body)
		if err != nil {
			log.Printf("Failed to read sitemap body from %s: %v", sitemapURL, err)
			continue
		}

		// Try to parse as regular sitemap first
		var sitemap Sitemap
		if err := xml.Unmarshal(body, &sitemap); err == nil && len(sitemap.URLs) > 0 {
			log.Printf("Found sitemap with %d URLs", len(sitemap.URLs))
			for _, url := range sitemap.URLs {
				c.safeEnqueue(models.Link{URL: url.Loc})
			}
			return nil
		}

		// Try to parse as sitemap index
		var sitemapIndex SitemapIndex
		if err := xml.Unmarshal(body, &sitemapIndex); err == nil && len(sitemapIndex.Sitemaps) > 0 {
			log.Printf("Found sitemap index with %d sitemaps", len(sitemapIndex.Sitemaps))
			for _, sitemapRef := range sitemapIndex.Sitemaps {
				if err := c.crawlFromSitemap(sitemapRef.Loc); err != nil {
					log.Printf("Failed to crawl nested sitemap %s: %v", sitemapRef.Loc, err)
				}
			}
			return nil
		}

		log.Printf("Failed to parse sitemap from %s", sitemapURL)
	}

	return fmt.Errorf("no valid sitemap found")
}

func (c *Crawler) monitorShutdown() {
	<-c.shutdownChan
	log.Println("Shutdown signal received. Initiating graceful shutdown...")
	c.cancel()

	// Give workers time to finish current operations
	go func() {
		time.Sleep(10 * time.Second)
		log.Println("Graceful shutdown timeout reached, forcing exit")
		os.Exit(1)
	}()
}

func (c *Crawler) safeDequeue() (models.Link, bool) {
	if c == nil || c.Mu == nil || c.LinksQueue == nil || c.QueuedUrls == nil {
		log.Printf("ERROR: Crawler or its components are nil in safeDequeue")
		return models.Link{}, false
	}

	c.Mu.Lock()
	defer c.Mu.Unlock()

	if len(*c.LinksQueue) == 0 {
		return models.Link{}, false
	}

	link, newQueue, err := utils.Dequeue(*c.LinksQueue)
	if err != nil {
		log.Printf("ERROR: Failed to dequeue: %v", err)
		return models.Link{}, false
	}

	*c.LinksQueue = newQueue
	delete(c.QueuedUrls, link.URL)

	log.Printf("Dequeued: %s, Queue size: %d", link.URL, len(*c.LinksQueue))
	return link, true
}

func (c *Crawler) safeEnqueue(link models.Link) {
	if c == nil || c.Mu == nil || c.LinksQueue == nil || c.QueuedUrls == nil || c.VisitedUrls == nil {
		log.Printf("ERROR: Crawler components are nil")
		return
	}

	c.Mu.Lock()
	defer c.Mu.Unlock()

	if _, exists := c.QueuedUrls[link.URL]; exists {
		return
	}

	if _, visited := c.VisitedUrls[link.URL]; visited {
		return
	}

	*c.LinksQueue = utils.Enqueue(*c.LinksQueue, link)
	c.QueuedUrls[link.URL] = true

	log.Printf("Enqueued: %s, Queue size: %d", link.URL, len(*c.LinksQueue))
	appendLog(fmt.Sprintf("Enqueued: %s, Queue size: %d", link.URL, len(*c.LinksQueue)))
}

func (c *Crawler) CrawlPage(websiteUrl string) error {
	log.Printf("Crawling: %s", websiteUrl)
	pagesCrawled++
	c.httpClient.Transport = ProxyTransport()
	defer c.addToSeen(websiteUrl)

	if _, visited := c.VisitedUrls[websiteUrl]; visited {
		log.Printf("%s already visited, skipping", websiteUrl)
		appendLog(fmt.Sprintf("%s already visited, skipping", websiteUrl))
		return nil
	}

	// Skip non-HTML content based on URL patterns
	if c.shouldSkipURL(websiteUrl) {
		log.Printf("Skipping non-HTML content: %s", websiteUrl)
		return nil
	}

	parsedURL, err := url.Parse(websiteUrl)
	if err != nil {
		log.Printf("Failed to parse URL %s: %v", websiteUrl, err)
		return fmt.Errorf("failed to parse URL: %w", err)
	}

	protocol := parsedURL.Scheme + "://"
	domain := parsedURL.Host
	targetPath := parsedURL.Path

	if err := c.CheckingRobotsRules((protocol + domain), targetPath); err != nil {
		log.Printf("Robots.txt blocked %s: %v", websiteUrl, err)
		appendLog(fmt.Sprintf("Robots.txt blocked %s: %v", websiteUrl, err))
		return fmt.Errorf("robots.txt blocked: %w", err)
	}

	// Create context with timeout for this request
	ctx, cancel := context.WithTimeout(c.Ctx, 30*time.Second)
	defer cancel()

	startTime := time.Now()

	request, err := http.NewRequestWithContext(ctx, "GET", websiteUrl, nil)
	if err != nil {
		log.Printf("Failed to create request for %s: %v", websiteUrl, err)
		return fmt.Errorf("failed to create request: %w", err)
	}

	request.Header.Set("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8")
	request.Header.Set("User-Agent", userAgent)
	// request.Header.Set("Accept-Language", "en-US,en;q=0.5")

	resp, err := c.httpClient.Do(request)
	responseTime := time.Since(startTime)

	if err != nil {
		log.Printf("Failed to fetch %s: %v", websiteUrl, err)
		return fmt.Errorf("failed to fetch page: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		log.Printf("Skipped %s, status: %d", websiteUrl, resp.StatusCode)
		return fmt.Errorf("non-200 status code: %d", resp.StatusCode)
	}

	// Validate content type
	contentType := resp.Header.Get("Content-Type")
	if !c.isHTMLContent(contentType) {
		log.Printf("Skipping non-HTML content: %s (Content-Type: %s)", websiteUrl, contentType)
		return nil
	}

	// Limit body size to prevent memory issues
	limitedReader := io.LimitReader(resp.Body, 10*1024*1024) // 10MB limit
	bodyData, err := io.ReadAll(limitedReader)
	if err != nil {
		log.Printf("Failed to read body for %s: %v", websiteUrl, err)
		return fmt.Errorf("failed to read body: %w", err)
	}

	pageData, err := c.extractPageData(string(bodyData), websiteUrl, domain, protocol, resp, responseTime)
	if err != nil {
		log.Printf("Failed to extract page data for %s: %v", websiteUrl, err)
		return fmt.Errorf("failed to extract page data: %w", err)
	}

	// Check content length requirement
	if len(pageData.MainContent) < minContentLength {
		log.Printf("Skipping %s: content too short (%d characters, minimum %d)", websiteUrl, len(pageData.MainContent), minContentLength)
		return nil
	}

	// Store data with retry logic and exponential backoff
	if err := c.storePageDataWithRetry(pageData, 3); err != nil {
		log.Printf("Failed to store page data after retries for %s: %v", websiteUrl, err)
		return fmt.Errorf("failed to store page data: %w", err)
	}

	log.Printf("Successfully processed %s, found %d outbound links", websiteUrl, len(pageData.OutboundLinks))
	return nil
}

func (c *Crawler) storePageDataWithRetry(pageData *models.PageData, maxRetries int) error {
	pageData.MainContent = c.cleanContent(pageData.MainContent)

	log.Printf("Storing page data for: %s (Title: %s, Words: %d, Links: %d)",
		pageData.URL, pageData.Title, pageData.WordCount, len(pageData.OutboundLinks))

	var lastErr error
	for attempt := 1; attempt <= maxRetries; attempt++ {
		select {
		case <-c.Ctx.Done():
			return fmt.Errorf("operation cancelled")
		default:
		}

		if err := db.GetPostgresHandler().HealthCheck(); err != nil {
			log.Printf("Database health check failed before storing %s (attempt %d): %v", pageData.URL, attempt, err)
			lastErr = err

			if attempt < maxRetries {
				backoffTime := time.Duration(attempt*attempt) * time.Second
				log.Printf("Retrying in %v...", backoffTime)

				select {
				case <-c.Ctx.Done():
					return fmt.Errorf("operation cancelled during backoff")
				case <-time.After(backoffTime):
					continue
				}
			}
			continue
		}

		err := db.GetPostgresHandler().UpsertPageData(*pageData)
		if err == nil {
			log.Printf("Successfully stored page data for: %s", pageData.URL)
			appendLog(fmt.Sprintf("Successfully stored page data for: %s", pageData.URL))
			return nil
		}

		lastErr = err
		log.Printf("Attempt %d/%d failed to store page data for %s: %v", attempt, maxRetries, pageData.URL, err)

		if attempt < maxRetries {
			backoffTime := time.Duration(attempt*attempt) * time.Second
			select {
			case <-c.Ctx.Done():
				return fmt.Errorf("operation cancelled during backoff")
			case <-time.After(backoffTime):
				continue
			}
		}
	}

	return fmt.Errorf("failed to store page data after %d attempts: %w", maxRetries, lastErr)
}

func (c *Crawler) extractPageData(htmlContent, url, domain, protocol string, resp *http.Response, responseTime time.Duration) (*models.PageData, error) {
	doc, err := html.Parse(strings.NewReader(htmlContent))
	if err != nil {
		return nil, err
	}

	pageData := &models.PageData{
		URL:           url,
		Headings:      make(map[string][]string),
		ImageAlt:      make([]string, 0),
		LinkText:      make([]string, 0),
		OutboundLinks: make([]models.Link, 0),
		StatusCode:    resp.StatusCode,
		ResponseTime:  responseTime,
		ContentType:   resp.Header.Get("Content-Type"),
		CrawlDate:     time.Now(),
	}

	if lastMod := resp.Header.Get("Last-Modified"); lastMod != "" {
		if parsed, err := time.Parse(time.RFC1123, lastMod); err == nil {
			pageData.LastModified = parsed
		}
	}

	c.extractHTMLData(doc, pageData, domain, protocol)

	pageData.WordCount = len(strings.Fields(pageData.MainContent))

	return pageData, nil
}

func (c *Crawler) extractHTMLData(n *html.Node, pageData *models.PageData, domain, protocol string) {
	if n.Type == html.ElementNode {
		switch n.Data {
		case "title":
			// Extract the actual page title from the <title> tag
			titleText := c.extractTextContent(n)
			if titleText != "" && pageData.Title == "" { // Only set if not already set
				pageData.Title = titleText
			}

		case "meta":
			c.extractMetaData(n, pageData)

		case "h1", "h2", "h3", "h4", "h5", "h6":
			text := c.extractTextContent(n)
			if text != "" {
				pageData.Headings[n.Data] = append(pageData.Headings[n.Data], text)
			}

		case "img":
			if alt := c.getAttributeValue(n, "alt"); alt != "" {
				pageData.ImageAlt = append(pageData.ImageAlt, alt)
			}

		case "a":
			c.extractLinkData(n, pageData, domain, protocol)

		case "link":
			rel := c.getAttributeValue(n, "rel")
			href := c.getAttributeValue(n, "href")

			if rel == "canonical" {
				pageData.Canonical = href
			} else if rel == "icon" || rel == "shortcut icon" || strings.Contains(rel, "icon") {
				// Extract favicon URL
				if href != "" && pageData.Favicon == "" { // Only set if not already set
					faviconURL := c.constructFullURL(href, domain, protocol)
					pageData.Favicon = faviconURL
					log.Printf("Found favicon for %s: %s", pageData.URL, faviconURL)
				}
			}
		}
	}

	if n.Type == html.TextNode && !c.isInIgnoredElement(n) {
		text := strings.TrimSpace(n.Data)
		if text != "" && len(text) > 3 {
			pageData.MainContent += " " + text
		}
	}

	for child := n.FirstChild; child != nil; child = child.NextSibling {
		c.extractHTMLData(child, pageData, domain, protocol)
	}
}

func (c *Crawler) extractMetaData(n *html.Node, pageData *models.PageData) {
	name := c.getAttributeValue(n, "name")
	property := c.getAttributeValue(n, "property")
	content := c.getAttributeValue(n, "content")

	switch {
	case name == "description" || property == "og:description":
		if pageData.MetaDescription == "" {
			pageData.MetaDescription = content
		}
	case name == "keywords":
		pageData.MetaKeywords = content
	case name == "language" || property == "og:locale":
		pageData.Language = content
	case property == "og:title":
		// Use og:title as fallback if no title tag found
		if pageData.Title == "" {
			pageData.Title = content
		}
	}
}

func (c *Crawler) isInIgnoredElement(n *html.Node) bool {
	current := n.Parent
	for current != nil {
		if current.Type == html.ElementNode {
			switch current.Data {
			case "nav", "footer", "aside", "script", "style", "noscript", "header":
				return true
			}
		}
		current = current.Parent
	}
	return false
}

func (c *Crawler) extractLinkData(linkNode *html.Node, pageData *models.PageData, domain, protocol string) {
	if rel := c.getAttributeValue(linkNode, "rel"); strings.Contains(rel, "nofollow") {
		return
	}

	href := c.getAttributeValue(linkNode, "href")
	if href == "" || strings.HasPrefix(href, "#") || strings.HasPrefix(href, "mailto:") || strings.HasPrefix(href, "tel:") {
		return
	}

	linkText := c.extractTextContent(linkNode)
	if linkText != "" {
		pageData.LinkText = append(pageData.LinkText, linkText)
	}

	fullURL := c.constructFullURL(href, domain, protocol)
	if fullURL == "" {
		return
	}

	cleanURL, err := utils.CanonicalizeURL(fullURL)
	if err != nil {
		log.Printf("Failed to canonicalize URL %s: %v", fullURL, err)
		return
	}

	// Store the link with its text (NOT as the page title)
	pageData.OutboundLinks = append(pageData.OutboundLinks, models.Link{
		Text: linkText,
		URL:  cleanURL,
	})

	// Only enqueue links from the same domain
	if parsedURL, err := url.Parse(cleanURL); err == nil {
		if parsedURL.Host == domain || parsedURL.Host == c.BaseDomain {
			link := models.Link{Text: linkText, URL: cleanURL}
			c.safeEnqueue(link)
		}
	}
}

func (c *Crawler) getAttributeValue(n *html.Node, attrName string) string {
	for _, attr := range n.Attr {
		if attr.Key == attrName {
			return attr.Val
		}
	}
	return ""
}

func (c *Crawler) extractTextContent(n *html.Node) string {
	var text strings.Builder
	c.extractTextOnly(n, &text)
	return strings.TrimSpace(text.String())
}

func (c *Crawler) constructFullURL(href, domain, protocol string) string {
	if strings.HasPrefix(href, "http://") || strings.HasPrefix(href, "https://") {
		return href
	} else if strings.HasPrefix(href, "//") {
		return "https:" + href
	} else if strings.HasPrefix(href, "/") {
		return protocol + domain + href
	} else {
		return protocol + domain + "/" + href
	}
}

func (c *Crawler) extractTextOnly(n *html.Node, builder *strings.Builder) {
	if n.Type == html.TextNode {
		text := strings.TrimSpace(n.Data)
		if text != "" {
			if builder.Len() > 0 {
				builder.WriteString(" ")
			}
			builder.WriteString(text)
		}
	}

	for child := n.FirstChild; child != nil; child = child.NextSibling {
		c.extractTextOnly(child, builder)
	}
}

func (c *Crawler) cleanContent(content string) string {
	// Remove invalid UTF-8 sequences
	content = strings.ToValidUTF8(content, "")

	// Replace multiple whitespace with single space
	re := regexp.MustCompile(`\s+`)
	content = re.ReplaceAllString(content, " ")

	// Remove problematic content
	content = strings.ReplaceAll(content, "JavaScript", "")
	content = strings.ReplaceAll(content, "document.write", "")

	// Remove null bytes and other control characters
	content = strings.ReplaceAll(content, "\x00", "")
	content = regexp.MustCompile(`[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]`).ReplaceAllString(content, "")

	return strings.TrimSpace(content)
}

func (c *Crawler) CheckingRobotsRules(domain string, targetPath string) error {
	robotsCacheMu.RLock()
	robotsData, exists := robotsCache[domain]
	robotsCacheMu.RUnlock()

	if exists {
		group := robotsData.FindGroup("*")
		if !group.Test(targetPath) {
			return fmt.Errorf("blocked by robots.txt: %s", targetPath)
		}
		return nil
	}

	resp, err := http.Get(domain + "/robots.txt")
	if err != nil {
		return fmt.Errorf("failed to fetch robots.txt: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusNotFound {
		return nil
	}

	robotsData, err = robotstxt.FromResponse(resp)
	if err != nil {
		return fmt.Errorf("failed to parse robots.txt: %v", err)
	}

	group := robotsData.FindGroup("*")
	canFetch := group.Test(targetPath)

	if !canFetch {
		return fmt.Errorf("not allowed to fetch %s (blocked by robots.txt)", targetPath)
	}

	robotsCacheMu.Lock()
	robotsCache[domain] = robotsData
	robotsCacheMu.Unlock()

	return nil
}

func (c *Crawler) shouldSkipURL(url string) bool {
	// Skip common binary file extensions
	binaryExtensions := []string{
		".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp", ".svg",
		".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx",
		".zip", ".rar", ".tar", ".gz", ".7z",
		".mp3", ".mp4", ".wav", ".avi", ".mov", ".wmv",
		".css", ".js", ".ico", ".xml", ".json", ".php",
	}

	lowerURL := strings.ToLower(url)
	for _, ext := range binaryExtensions {
		if strings.HasSuffix(lowerURL, ext) {
			return true
		}
	}

	// Skip URLs with query parameters that suggest binary content
	if strings.Contains(lowerURL, "download=") ||
		strings.Contains(lowerURL, "attachment=") ||
		strings.Contains(lowerURL, "export=") {
		return true
	}

	return false
}

func (c *Crawler) isHTMLContent(contentType string) bool {
	if contentType == "" {
		return true // Assume HTML if no content type
	}

	lowerType := strings.ToLower(contentType)
	htmlTypes := []string{
		"text/html",
		"application/xhtml+xml",
		"text/plain",
	}

	for _, htmlType := range htmlTypes {
		if strings.Contains(lowerType, htmlType) {
			return true
		}
	}

	return false
}

func (c *Crawler) addToSeen(url string) {
	if c == nil || c.Mu == nil || c.VisitedUrls == nil {
		log.Printf("ERROR: Cannot add to seen - crawler components are nil")
		return
	}

	c.Mu.Lock()
	defer c.Mu.Unlock()
	c.VisitedUrls[url] = struct{}{}
}

func appendLog(logLine string) {
	f, err := os.OpenFile("crawler.log", os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
	if err != nil {
		fmt.Println("Failed to open log file:", err)
		return
	}
	defer f.Close()

	timestamp := time.Now().Format("2006-01-02 15:04:05")
	if _, err := f.WriteString(timestamp + " " + logLine + "\n"); err != nil {
		fmt.Println("Failed to write log:", err)
	}
}
