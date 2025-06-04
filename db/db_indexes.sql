CREATE INDEX IF NOT EXISTS idx_pages_url ON pages(url);
CREATE INDEX IF NOT EXISTS idx_pages_qdrant_id ON pages(qdrant_id);
CREATE INDEX IF NOT EXISTS idx_links_from_page_id ON links(from_page_id);
CREATE INDEX IF NOT EXISTS idx_links_to_url ON links(to_url);