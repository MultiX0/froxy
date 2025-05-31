package functions

import (
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"os"
	"regexp"
	"strings"
	"sync"
	"time"

	"github.com/froxy/db"
	"github.com/froxy/models"
	"github.com/froxy/utils"
	"github.com/temoto/robotstxt"
	"golang.org/x/net/html"
)

type Crawler struct {
	BaseDomain  string
	LinksQueue  *[]models.Link
	VisitedUrls map[string]struct{}
	QueuedUrls  map[string]bool
	Mu          *sync.Mutex
}

var robotsCache = make(map[string]*robotstxt.RobotsData)

var (
	timesleep    = time.Second
	userAgent    = "FroxyBot/1.0"
	pagesCrawled = 0
)

func (c *Crawler) Start(seedUrls ...string) {
	if len(seedUrls) == 0 {
		log.Println("No seed URLs provided.")
		return
	}

	c.QueuedUrls = make(map[string]bool)
	c.VisitedUrls = make(map[string]struct{})

	c.Mu = &sync.Mutex{}
	c.LinksQueue = &[]models.Link{}

	if parsedURL, err := url.Parse(seedUrls[0]); err == nil {
		c.BaseDomain = parsedURL.Host
		log.Printf("Set BaseDomain to: %s", c.BaseDomain)
	}

	for _, url := range seedUrls {
		c.safeEnqueue(models.Link{URL: url})
	}

	var wg sync.WaitGroup
	workerCount := 5

	for i := 0; i < workerCount; i++ {
		wg.Add(1)
		go func(id int) {
			defer wg.Done()
			defer func() {
				log.Printf("Worker %d exiting", id)
			}()

			consecutiveEmptyAttempts := 0
			maxEmptyAttempts := 10

			for {
				link, ok := c.safeDequeue()
				if !ok {
					consecutiveEmptyAttempts++
					if consecutiveEmptyAttempts >= maxEmptyAttempts {
						log.Printf("Worker %d: No work for %d attempts, exiting", id, maxEmptyAttempts)
						return
					}

					log.Printf("Worker %d: No work, waiting... (attempt %d/%d)", id, consecutiveEmptyAttempts, maxEmptyAttempts)
					time.Sleep(5 * time.Second)
					continue
				}

				consecutiveEmptyAttempts = 0

				log.Printf("Worker %d: Processing %s", id, link.URL)
				c.CrawlPage(link.URL)
				time.Sleep(timesleep)
			}
		}(i)
	}

	wg.Wait()
	log.Printf("All workers finished. Total pages crawled: %d", pagesCrawled)
}

func (c *Crawler) safeDequeue() (models.Link, bool) {
	c.Mu.Lock()
	defer c.Mu.Unlock()

	if len(*c.LinksQueue) == 0 {
		return models.Link{}, false
	}

	link, newQueue, err := utils.Dequeue(*c.LinksQueue)
	if err != nil {
		return models.Link{}, false
	}

	*c.LinksQueue = newQueue

	delete(c.QueuedUrls, link.URL)

	log.Printf("Dequeued: %s, Queue size: %d", link.URL, len(*c.LinksQueue))
	return link, true
}

func (c *Crawler) safeEnqueue(link models.Link) {
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

func (c *Crawler) CrawlPage(websiteUrl string) {
	log.Printf("Crawling: %s", websiteUrl)
	pagesCrawled++
	defer c.addToSeen(websiteUrl)

	if _, visited := c.VisitedUrls[websiteUrl]; visited {
		log.Printf("%s already visited, skipping", websiteUrl)
		return
	}

	parsedURL, err := url.Parse(websiteUrl)
	if err != nil {
		log.Printf("Failed to parse URL %s: %v", websiteUrl, err)
		return
	}

	protocol := parsedURL.Scheme + "://"
	domain := parsedURL.Host
	targetPath := parsedURL.Path

	// Check robots.txt
	err = c.CheckingRobotsRules((protocol + domain), targetPath)
	if err != nil {
		log.Printf("Robots.txt blocked %s: %v", websiteUrl, err)
		return
	}

	startTime := time.Now()

	timeout := time.Duration(10 * time.Second)
	client := http.Client{
		Timeout: timeout,
	}

	request, err := http.NewRequest("GET", websiteUrl, nil)
	if err != nil {
		log.Printf("Failed to create request for %s: %v", websiteUrl, err)
		return
	}

	request.Header.Set("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8")
	request.Header.Set("User-Agent", userAgent)
	request.Header.Set("Accept-Language", "en-US,en;q=0.5")

	resp, err := client.Do(request)
	responseTime := time.Since(startTime)

	if err != nil {
		log.Printf("Failed to fetch %s: %v", websiteUrl, err)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		log.Printf("Skipped %s, status: %d", websiteUrl, resp.StatusCode)
		return
	}

	bodyData, err := io.ReadAll(resp.Body)
	if err != nil {
		log.Printf("Failed to read body for %s: %v", websiteUrl, err)
		return
	}

	pageData, err := c.extractPageData(string(bodyData), websiteUrl, domain, protocol, resp, responseTime)
	if err != nil {
		log.Printf("Failed to extract page data for %s: %v", websiteUrl, err)
		return
	}

	c.storePageData(pageData)

	log.Printf("Successfully processed %s, found %d outbound links", websiteUrl, len(pageData.OutboundLinks))
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

	if parsedURL, err := url.Parse(cleanURL); err == nil {
		if parsedURL.Host == c.BaseDomain {
			log.Printf("Found same-domain link: %s", cleanURL)
			link := models.Link{Text: linkText, URL: cleanURL}
			c.safeEnqueue(link)
		} else {
			log.Printf("Skipping external link: %s (host: %s, base: %s)", cleanURL, parsedURL.Host, c.BaseDomain)
		}
	}
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

func (c *Crawler) extractTextContent(n *html.Node) string {
	var text strings.Builder
	c.extractTextOnly(n, &text)
	return strings.TrimSpace(text.String())
}

func (crawler *Crawler) extractTextOnly(n *html.Node, builder *strings.Builder) {
	if n.Type == html.TextNode {
		text := strings.TrimSpace(n.Data)
		if text != "" {
			if builder.Len() > 0 {
				builder.WriteString(" ")
			}
			builder.WriteString(text)
		}
	}

	for c := n.FirstChild; c != nil; c = c.NextSibling {
		crawler.extractTextOnly(c, builder)
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

func (c *Crawler) storePageData(pageData *models.PageData) {
	// Clean the main content
	pageData.MainContent = c.cleanContent(pageData.MainContent)

	log.Printf("Storing page data for: %s (Title: %s, Words: %d, Links: %d)",
		pageData.URL, pageData.Title, pageData.WordCount, len(pageData.OutboundLinks))

	db.GetPostgresHandler().UpsertPageData(*pageData)
}

func (c *Crawler) cleanContent(content string) string {

	re := regexp.MustCompile(`\s+`)
	content = re.ReplaceAllString(content, " ")

	content = strings.ReplaceAll(content, "JavaScript", "")
	content = strings.ReplaceAll(content, "document.write", "")

	return strings.TrimSpace(content)
}

func (c *Crawler) CheckingRobotsRules(domain string, targetPath string) error {
	if robotsData, ok := robotsCache[domain]; ok {
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

	robotsData, err := robotstxt.FromResponse(resp)
	if err != nil {
		return fmt.Errorf("failed to parse robots.txt: %v", err)
	}

	group := robotsData.FindGroup("*")
	canFetch := group.Test(targetPath)

	if !canFetch {
		return fmt.Errorf("not allowed to fetch %s (blocked by robots.txt)", targetPath)
	}

	robotsCache[domain] = robotsData
	return nil
}

func (c *Crawler) addToSeen(url string) {
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
