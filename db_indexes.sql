CREATE UNIQUE INDEX idx_terms_term ON terms(term);

CREATE INDEX idx_term_page_index_term_id ON term_page_index(term_id);
CREATE INDEX idx_term_page_index_page_id ON term_page_index(page_id);
CREATE INDEX idx_term_page_index_term_id_page_id ON term_page_index(term_id, page_id);

CREATE INDEX idx_term_page_index_field ON term_page_index(field);
CREATE INDEX idx_term_page_index_tf_idf ON term_page_index(tf_idf);

CREATE UNIQUE INDEX idx_pages_url ON pages(url);

CREATE INDEX idx_pages_language ON pages(language);
CREATE INDEX idx_pages_crawl_date ON pages(crawl_date);
CREATE INDEX idx_pages_status_code ON pages(status_code);
CREATE INDEX idx_pages_response_time ON pages(response_time);
CREATE INDEX idx_pages_last_modified ON pages(last_modified);

CREATE INDEX idx_links_from_page_id ON links(from_page_id);
CREATE INDEX idx_links_to_url ON links(to_url);
CREATE INDEX idx_links_type ON links(link_type);
CREATE INDEX idx_links_anchor_text ON links(anchor_text);

CREATE INDEX idx_page_headings_page_id ON page_headings(page_id);
CREATE INDEX idx_page_headings_type ON page_headings(heading_type);
CREATE INDEX idx_page_headings_position ON page_headings(position);


CREATE INDEX idx_term_page_term_field ON term_page_index(term_id, field);
CREATE INDEX idx_term_page_term_tf_idf ON term_page_index(term_id, tf_idf DESC);

CREATE INDEX idx_pages_language_time ON pages(language, crawl_date DESC);

CREATE INDEX idx_term_page_index_composite ON term_page_index(term_id, tf_idf DESC);
