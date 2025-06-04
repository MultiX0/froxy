package models

import "time"

type Link struct {
	Text string `json:"text"`
	URL  string `json:"url"`
}
type PageData struct {
	URL             string              `json:"url"`
	Title           string              `json:"title"`
	MetaDescription string              `json:"description"`
	MetaKeywords    string              `json:"meta_keywords"`
	Language        string              `json:"language"`
	Canonical       string              `json:"canonical"`
	Headings        map[string][]string `json:"headings"`
	MainContent     string              `json:"main_content"`
	ImageAlt        []string            `json:"image_alt"`
	LinkText        []string            `json:"link_text"`
	WordCount       int                 `json:"word_count"`
	StatusCode      int                 `json:"status_code"`
	ResponseTime    time.Duration       `json:"response_time"`
	ContentType     string              `json:"content_type"`
	CrawlDate       time.Time           `json:"crawl_date"`
	LastModified    time.Time           `json:"last_modified"`
	OutboundLinks   []Link              `json:"out_links"`
	InCommingLinks  []Link              `json:"in_links"`
}

type EmbeddingModel struct {
	Embedding  []float32 `json:"embedding"`
	Dims       int32     `json:"dims"`
	ELAPSED_MS float32   `json:"elapsed_ms"`
}
