CREATE TABLE IF NOT EXISTS pages (
		id SERIAL PRIMARY KEY,
		qdrant_id UUID NOT NULL UNIQUE,
		url TEXT NOT NULL UNIQUE,
		title TEXT,
		status_code INTEGER,
		favicon TEXT,
		crawl_date TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
		updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
	);


CREATE TABLE IF NOT EXISTS links (
		id SERIAL PRIMARY KEY,
		from_page_id INTEGER REFERENCES pages(id) ON DELETE CASCADE,
		to_url TEXT NOT NULL,
		anchor_text TEXT,
		link_type CHARACTER VARYING(20) DEFAULT 'external',
		created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
	);
