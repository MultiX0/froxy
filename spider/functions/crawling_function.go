package functions

import (
	"context"
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

type Crawler struct {
	BaseDomain   string
	LinksQueue   *[]models.Link
	VisitedUrls  map[string]struct{}
	QueuedUrls   map[string]bool
	Mu           *sync.Mutex
	Ctx          context.Context
	cancel       context.CancelFunc
	shutdownChan chan os.Signal
}

var robotsCache = make(map[string]*robotstxt.RobotsData)
var robotsCacheMu sync.RWMutex

var (
	timesleep    = time.Second
	userAgent    = "FroxyBot/1.0"
	pagesCrawled = 0
)

// NewCrawler creates a new crawler instance with proper initialization
func NewCrawler() *Crawler {
	ctx, cancel := context.WithCancel(context.Background())
	shutdownChan := make(chan os.Signal, 1)
	signal.Notify(shutdownChan, syscall.SIGINT, syscall.SIGTERM)

	// Pre-initialize the LinksQueue slice
	linksQueue := make([]models.Link, 0)

	crawler := &Crawler{
		QueuedUrls:   make(map[string]bool),
		VisitedUrls:  make(map[string]struct{}),
		Mu:           &sync.Mutex{},
		LinksQueue:   &linksQueue,
		Ctx:          ctx,
		cancel:       cancel,
		shutdownChan: shutdownChan,
	}

	// Validate initialization
	if crawler.Mu == nil {
		log.Fatal("Failed to initialize mutex")
	}
	if crawler.LinksQueue == nil {
		log.Fatal("Failed to initialize LinksQueue")
	}

	return crawler
}

func (c *Crawler) Start(workerCount int, seedUrls ...string) {
	// Validate crawler state
	if c == nil {
		log.Fatal("Crawler instance is nil")
		return
	}
	if c.Mu == nil {
		log.Fatal("Crawler mutex is nil")
		return
	}

	if len(seedUrls) == 0 {
		log.Println("No seed URLs provided.")
		return
	}

	if parsedURL, err := url.Parse(seedUrls[0]); err == nil {
		c.BaseDomain = parsedURL.Host
		log.Printf("Set BaseDomain to: %s", c.BaseDomain)
	}

	for _, url := range seedUrls {
		c.safeEnqueue(models.Link{URL: url})
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
	// Add nil checks for safety
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
	// Add comprehensive nil checks
	if c == nil {
		log.Printf("ERROR: Crawler instance is nil")
		return
	}
	if c.Mu == nil {
		log.Printf("ERROR: Crawler mutex is nil")
		return
	}
	if c.LinksQueue == nil {
		log.Printf("ERROR: Crawler LinksQueue is nil")
		return
	}
	if c.QueuedUrls == nil {
		log.Printf("ERROR: Crawler QueuedUrls is nil")
		return
	}
	if c.VisitedUrls == nil {
		log.Printf("ERROR: Crawler VisitedUrls is nil")
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
}

func (c *Crawler) CrawlPage(websiteUrl string) error {
	log.Printf("Crawling: %s", websiteUrl)
	pagesCrawled++
	defer c.addToSeen(websiteUrl)

	if _, visited := c.VisitedUrls[websiteUrl]; visited {
		log.Printf("%s already visited, skipping", websiteUrl)
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
		return fmt.Errorf("robots.txt blocked: %w", err)
	}

	// Create context with timeout for this request
	ctx, cancel := context.WithTimeout(c.Ctx, 30*time.Second)
	defer cancel()

	startTime := time.Now()

	client := &http.Client{
		Timeout: 15 * time.Second,
	}

	request, err := http.NewRequestWithContext(ctx, "GET", websiteUrl, nil)
	if err != nil {
		log.Printf("Failed to create request for %s: %v", websiteUrl, err)
		return fmt.Errorf("failed to create request: %w", err)
	}

	request.Header.Set("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8")
	request.Header.Set("User-Agent", userAgent)
	request.Header.Set("Accept-Language", "en-US,en;q=0.5")

	resp, err := client.Do(request)
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
		// Check if context is cancelled before each attempt
		select {
		case <-c.Ctx.Done():
			return fmt.Errorf("operation cancelled")
		default:
		}

		// Check database health before attempting to store
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
			pageData.Title = c.extractTextContent(n)

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
			if rel := c.getAttributeValue(n, "rel"); rel == "canonical" {
				pageData.Canonical = c.getAttributeValue(n, "href")
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

	pageData.OutboundLinks = append(pageData.OutboundLinks, models.Link{
		Text: linkText,
		URL:  cleanURL,
	})

	if _, err := url.Parse(cleanURL); err == nil {
		link := models.Link{Text: linkText, URL: cleanURL}
		c.safeEnqueue(link)
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
	re := regexp.MustCompile(`\s+`)
	content = re.ReplaceAllString(content, " ")

	content = strings.ReplaceAll(content, "JavaScript", "")
	content = strings.ReplaceAll(content, "document.write", "")

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
