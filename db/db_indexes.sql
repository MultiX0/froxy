CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE UNIQUE INDEX IF NOT EXISTS idx_terms_term ON terms USING btree (term) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_pages_url ON pages USING btree (url) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_pages_crawl_date ON pages USING btree (crawl_date) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_pages_language ON pages USING btree (language) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_pages_status_code ON pages USING btree (status_code) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_pages_response_time ON pages USING btree (response_time) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_pages_last_modified ON pages USING btree (last_modified) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_pages_language_time ON pages USING btree (language, crawl_date DESC) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_page_headings_page_id ON page_headings USING btree (page_id) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_page_headings_type ON page_headings USING btree (heading_type) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_page_headings_position ON page_headings USING btree (position) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_links_from_page_id ON links USING btree (from_page_id) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_links_to_url ON links USING btree (to_url) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_links_type ON links USING btree (link_type) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_links_anchor_text ON links USING btree (anchor_text) TABLESPACE pg_default;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_terms_fuzzy_search ON terms USING gin (term gin_trgm_ops) TABLESPACE pg_default;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_terms_fuzzy_short ON terms USING gin (term gin_trgm_ops) WHERE length(term) < 20 TABLESPACE pg_default;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_term_page_search_optimized ON term_page_index (term_id, field, tf_idf DESC, page_id) TABLESPACE pg_default;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_term_page_field_score ON term_page_index (field, term_id, tf_idf DESC) TABLESPACE pg_default;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_term_page_term_id_page_id ON term_page_index (term_id, page_id) TABLESPACE pg_default;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_term_page_frequency ON term_page_index (term_frequency DESC) WHERE term_frequency > 1 TABLESPACE pg_default;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_term_page_term_stats ON term_page_index (term_id, term_frequency, tf_idf) TABLESPACE pg_default;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_term_page_cross_field ON term_page_index (page_id, field, tf_idf DESC) TABLESPACE pg_default;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pages_search_lookup ON pages (id) INCLUDE (url, title, meta_description, main_content) TABLESPACE pg_default;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pages_active_search ON pages (id) WHERE status_code = 200 TABLESPACE pg_default;
