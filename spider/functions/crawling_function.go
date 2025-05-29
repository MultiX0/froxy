package functions

import (
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"os"
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
}

var robotsCache = make(map[string]*robotstxt.RobotsData)

var (
	timesleep    = time.Second * 2
	userAgent    = "FroxyBot/1.0"
	pagesCrawled = 0
)

func (c *Crawler) Start(url string) {
	c.LinksQueue = &[]models.Link{{URL: url}}
	c.QueuedUrls = make(map[string]bool)
	c.VisitedUrls = make(map[string]struct{})

	for len(*c.LinksQueue) > 0 {
		// FIX: Properly update the queue after dequeuing
		next, newQueue, err := utils.Dequeue(*c.LinksQueue)
		if err != nil {
			break
		}
		*c.LinksQueue = newQueue

		if next.URL == "" {
			break
		}
		c.Crawling(next.URL)
	}
}

func (c *Crawler) CheckingRobotsRules(domain string, targetPath string) error {
	if robotsData, ok := robotsCache[domain]; ok {
		group := robotsData.FindGroup("*")
		if !group.Test(targetPath) {
			return fmt.Errorf("Blocked by robots.txt: %s", targetPath)
		}
		return nil
	}

	// 1. Fetch robots.txt
	resp, err := http.Get(domain + "/robots.txt")
	if err != nil {
		return fmt.Errorf("Failed to fetch robots.txt: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusNotFound {
		return nil
	}

	// 2. Parse robots.txt
	robotsData, err := robotstxt.FromResponse(resp)
	if err != nil {
		return fmt.Errorf("Failed to parse robots.txt: %v", err)
	}

	// 3. Check permissions for our user-agent
	group := robotsData.FindGroup("*")
	canFetch := group.Test(targetPath)

	// 4. Output result
	if canFetch {
		fmt.Printf("Allowed to fetch %s\n", targetPath)
	} else {
		return fmt.Errorf("Not allowed to fetch %s (blocked by robots.txt)\n", targetPath)
	}

	// FIX: Store the actual parsed robots data, not a new empty one
	robotsCache[domain] = robotsData

	return nil
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

func (c *Crawler) Crawling(websiteUrl string) {

	time.Sleep(timesleep)

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

	err = c.CheckingRobotsRules((protocol + domain), targetPath)
	if err != nil {
		log.Println(err.Error())
		return
	}

	timeout := time.Duration(5 * time.Second)
	client := http.Client{
		Timeout: timeout,
	}

	request, err := http.NewRequest("GET", websiteUrl, nil)
	if err != nil {
		log.Println(err)
		return
	}

	request.Header.Set("Accept", "text/html")
	request.Header.Set("User-agent", userAgent)

	resp, err := client.Do(request)
	if err != nil {
		log.Println(err)
		return
	}

	if resp.StatusCode != http.StatusOK {
		log.Printf("Skipped %s, status: %d", websiteUrl, resp.StatusCode)
		return
	}

	defer resp.Body.Close()

	bodyData, err := io.ReadAll(resp.Body)
	if err != nil {
		log.Println(err)
		return
	}

	_, err = c.extractBodyContent(string(bodyData), domain, protocol)
	if err != nil {
		log.Println(err)
		return
	}
}

func (c *Crawler) addToSeen(url string) {
	c.VisitedUrls[url] = struct{}{}
}

func (c *Crawler) extractBodyContent(htmlContent string, domain string, protocol string) (string, error) {
	doc, err := html.Parse(strings.NewReader(htmlContent))
	if err != nil {
		return "", err
	}

	var bodyContent strings.Builder

	var findBody func(*html.Node) *html.Node
	findBody = func(n *html.Node) *html.Node {
		if n.Type == html.ElementNode && n.Data == "body" {
			return n
		}
		for c := n.FirstChild; c != nil; c = c.NextSibling {
			if body := findBody(c); body != nil {
				return body
			}
		}
		return nil
	}

	bodyNode := findBody(doc)
	if bodyNode != nil {
		c.extractAllContent(bodyNode, &bodyContent, domain, protocol)
	}

	return strings.TrimSpace(bodyContent.String()), nil
}

func (crawler *Crawler) extractAllContent(n *html.Node, builder *strings.Builder, domain string, protocol string) {
	if n.Type == html.ElementNode && (n.Data == "nav" || n.Data == "footer" || n.Data == "aside" || n.Data == "script") {
		return
	}

	if n.Type == html.TextNode {
		text := strings.TrimSpace(n.Data)
		if text != "" {
			if builder.Len() > 0 {
				lastChar := builder.String()[builder.Len()-1]
				if lastChar != ' ' && lastChar != '\n' {
					builder.WriteString(" ")
				}
			}
			builder.WriteString(text)
		}
	} else if n.Type == html.ElementNode {
		if n.Data == "a" {
			crawler.extractLinkInfo(n, domain, protocol)
		}

		if isBlockElement(n.Data) && builder.Len() > 0 {
			content := builder.String()
			if !strings.HasSuffix(content, "\n") && !strings.HasSuffix(content, " ") {
				builder.WriteString("\n")
			}
		}
	}

	for c := n.FirstChild; c != nil; c = c.NextSibling {
		crawler.extractAllContent(c, builder, domain, protocol)
	}

	if n.Type == html.ElementNode && isBlockElement(n.Data) {
		content := builder.String()
		if !strings.HasSuffix(content, "\n") {
			builder.WriteString("\n")
		}
	}
}

func (c *Crawler) extractLinkInfo(linkNode *html.Node, domain string, protocol string) {
	if linkNode.Parent.Type == html.ElementNode {
		for _, att := range linkNode.Parent.Attr {
			if att.Val == "reference" {
				return
			}
		}
	}

	for _, attr := range linkNode.Attr {
		if attr.Key == "rel" && strings.Contains(attr.Val, "nofollow") {
			return
		}
	}

	var href string
	for _, attr := range linkNode.Attr {
		if attr.Key == "href" {
			href = attr.Val
			break
		}
	}

	var linkText strings.Builder
	extractTextOnly(linkNode, &linkText)
	text := strings.TrimSpace(linkText.String())

	if text == "" || href == "" || strings.HasPrefix(href, "#") {
		return
	}

	var _href string

	// FIX: Better URL construction logic
	if strings.HasPrefix(href, "http://") || strings.HasPrefix(href, "https://") {
		_href = href // Absolute URL
	} else if strings.HasPrefix(href, "/") {
		_href = protocol + domain + href // Root-relative
	} else {
		_href = protocol + domain + "/" + href // Relative
	}

	cleanURL, err := utils.CanonicalizeURL(_href)
	if err != nil {
		fmt.Println("Invalid URL:", _href)
		return
	}

	// Skip if already visited
	if _, alreadyVisited := c.VisitedUrls[cleanURL]; alreadyVisited {
		return
	}

	// Skip if already queued
	if c.QueuedUrls[cleanURL] {
		return
	}

	// Mark as queued and enqueue
	c.QueuedUrls[cleanURL] = true
	link := models.Link{Text: text, URL: cleanURL}

	// FIX: Properly update the queue
	*c.LinksQueue = utils.Enqueue(*c.LinksQueue, link)

	db.GetSupabaseHandler().InsertSingleLink(link)
}

func extractTextOnly(n *html.Node, builder *strings.Builder) {
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
		extractTextOnly(c, builder)
	}
}

func isBlockElement(tagName string) bool {
	blockElements := map[string]bool{
		"p": true, "div": true, "h1": true, "h2": true, "h3": true,
		"h4": true, "h5": true, "h6": true, "ul": true, "ol": true,
		"li": true, "blockquote": true, "pre": true, "hr": true,
		"table": true, "tr": true, "td": true, "th": true,
		"thead": true, "tbody": true, "tfoot": true,
	}
	return blockElements[tagName]
}
