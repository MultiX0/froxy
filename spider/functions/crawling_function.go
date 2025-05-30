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
	"time"

	"github.com/froxy/db"
	"github.com/froxy/models"
	"github.com/froxy/utils"
	"github.com/temoto/robotstxt"
	"golang.org/x/net/html"
)

type Crawler struct {
	LinksQueue  *[]models.Link
	VisitedUrls map[string]struct{}
	QueuedUrls  map[string]bool
	BaseDomain  string
}

var robotsCache = make(map[string]*robotstxt.RobotsData)

var (
	timesleep    = time.Second * 2
	userAgent    = "FroxyBot/1.0"
	pagesCrawled = 0
)

func (c *Crawler) Start(_url string) {
	c.LinksQueue = &[]models.Link{{URL: _url}}
	c.QueuedUrls = make(map[string]bool)
	c.VisitedUrls = make(map[string]struct{})

	// Set base domain for filtering
	if parsedURL, err := url.Parse(_url); err == nil {
		c.BaseDomain = parsedURL.Host
	}

	for len(*c.LinksQueue) > 0 {
		next, newQueue, err := utils.Dequeue(*c.LinksQueue)
		if err != nil {
			break
		}
		*c.LinksQueue = newQueue

		if next.URL == "" {
			break
		}
		c.CrawlPage(next.URL)

		// Rate limiting
		time.Sleep(timesleep)
	}
}

func (c *Crawler) CrawlPage(websiteUrl string) {
	appendLog("Crawling: " + websiteUrl)
	pagesCrawled++
	defer c.addToSeen(websiteUrl)

	if _, visited := c.VisitedUrls[websiteUrl]; visited {
		fmt.Println(websiteUrl + " visited before...")
		return
	}

	parsedURL, err := url.Parse(websiteUrl)
	if err != nil {
		return
	}

	protocol := parsedURL.Scheme + "://"
	domain := parsedURL.Host
	targetPath := parsedURL.Path

	// Check robots.txt
	err = c.CheckingRobotsRules((protocol + domain), targetPath)
	if err != nil {
		log.Println(err.Error())
		return
	}

	// Measure response time
	startTime := time.Now()

	timeout := time.Duration(10 * time.Second)
	client := http.Client{
		Timeout: timeout,
	}

	request, err := http.NewRequest("GET", websiteUrl, nil)
	if err != nil {
		log.Println(err)
		return
	}

	request.Header.Set("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8")
	request.Header.Set("User-Agent", userAgent)
	request.Header.Set("Accept-Language", "en-US,en;q=0.5")

	resp, err := client.Do(request)
	responseTime := time.Since(startTime)

	if err != nil {
		log.Println(err)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		log.Printf("Skipped %s, status: %d", websiteUrl, resp.StatusCode)
		return
	}

	bodyData, err := io.ReadAll(resp.Body)
	if err != nil {
		log.Println(err)
		return
	}

	// Extract comprehensive page data
	pageData, err := c.extractPageData(string(bodyData), websiteUrl, domain, protocol, resp, responseTime)
	if err != nil {
		log.Println(err)
		return
	}

	// Store in database (you'll need to implement this)
	c.storePageData(pageData)
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

	// Parse Last-Modified header
	if lastMod := resp.Header.Get("Last-Modified"); lastMod != "" {
		if parsed, err := time.Parse(time.RFC1123, lastMod); err == nil {
			pageData.LastModified = parsed
		}
	}

	// Extract data from HTML
	c.extractHTMLData(doc, pageData, domain, protocol)

	// Calculate word count
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

	// Extract main content (skip navigation, footer, etc.)
	if n.Type == html.TextNode && !c.isInIgnoredElement(n) {
		text := strings.TrimSpace(n.Data)
		if text != "" && len(text) > 3 {
			pageData.MainContent += " " + text
		}
	}

	// Recursively process child nodes
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
	// Skip nofollow links
	if rel := c.getAttributeValue(linkNode, "rel"); strings.Contains(rel, "nofollow") {
		return
	}

	href := c.getAttributeValue(linkNode, "href")
	if href == "" || strings.HasPrefix(href, "#") || strings.HasPrefix(href, "mailto:") || strings.HasPrefix(href, "tel:") {
		return
	}

	// Extract link text
	linkText := c.extractTextContent(linkNode)
	if linkText != "" {
		pageData.LinkText = append(pageData.LinkText, linkText)
	}

	// Construct full URL
	fullURL := c.constructFullURL(href, domain, protocol)
	if fullURL == "" {
		return
	}

	cleanURL, err := utils.CanonicalizeURL(fullURL)
	if err != nil {
		return
	}

	// Check if it's the same domain (for crawling queue)
	if parsedURL, err := url.Parse(cleanURL); err == nil && parsedURL.Host == c.BaseDomain {
		// Skip if already visited or queued
		if _, visited := c.VisitedUrls[cleanURL]; !visited && !c.QueuedUrls[cleanURL] {
			c.QueuedUrls[cleanURL] = true
			link := models.Link{Text: linkText, URL: cleanURL}
			*c.LinksQueue = utils.Enqueue(*c.LinksQueue, link)
		}
	}

	// Store all outbound links for analysis
	pageData.OutboundLinks = append(pageData.OutboundLinks, models.Link{
		Text: linkText,
		URL:  cleanURL,
	})
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

	// Store in your database
	// You'll need to implement this based on your database schema
	fmt.Printf("Storing page data for: %s (Title: %s, Words: %d)\n",
		pageData.URL, pageData.Title, pageData.WordCount)

	db.GetSupabaseHandler().UpsertPageData(*pageData)
}

func (c *Crawler) cleanContent(content string) string {
	// Remove extra whitespace
	re := regexp.MustCompile(`\s+`)
	content = re.ReplaceAllString(content, " ")

	// Remove common noise
	content = strings.ReplaceAll(content, "JavaScript", "")
	content = strings.ReplaceAll(content, "document.write", "")

	return strings.TrimSpace(content)
}

// Keep existing helper functions
func (c *Crawler) CheckingRobotsRules(domain string, targetPath string) error {
	if robotsData, ok := robotsCache[domain]; ok {
		group := robotsData.FindGroup("*")
		if !group.Test(targetPath) {
			return fmt.Errorf("Blocked by robots.txt: %s", targetPath)
		}
		return nil
	}

	resp, err := http.Get(domain + "/robots.txt")
	if err != nil {
		return fmt.Errorf("Failed to fetch robots.txt: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusNotFound {
		return nil
	}

	robotsData, err := robotstxt.FromResponse(resp)
	if err != nil {
		return fmt.Errorf("Failed to parse robots.txt: %v", err)
	}

	group := robotsData.FindGroup("*")
	canFetch := group.Test(targetPath)

	if !canFetch {
		return fmt.Errorf("Not allowed to fetch %s (blocked by robots.txt)", targetPath)
	}

	robotsCache[domain] = robotsData
	return nil
}

func (c *Crawler) addToSeen(url string) {
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
