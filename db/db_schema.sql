-- Creating pages table
CREATE TABLE IF NOT EXISTS pages (
    id SERIAL PRIMARY KEY,
    url TEXT NOT NULL,
    title TEXT,
    meta_description TEXT,
    meta_keywords TEXT,
    language TEXT,
    canonical TEXT,
    content TEXT,
    word_count INTEGER DEFAULT 0,
    status_code INTEGER,
    response_time INTEGER,
    content_type TEXT,
    last_modified TIMESTAMP WITHOUT TIME ZONE,
    crawl_date TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pages_url_key UNIQUE (url)
) TABLESPACE pg_default;

-- Creating page_headings table
CREATE TABLE IF NOT EXISTS page_headings (
    id SERIAL NOT NULL,
    page_id INTEGER,
    heading_type CHARACTER VARYING(10) NOT NULL,
    text TEXT NOT NULL,
    position INTEGER DEFAULT 1,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT page_headings_pkey PRIMARY KEY (id),
    CONSTRAINT page_headings_page_id_fkey FOREIGN KEY (page_id) REFERENCES pages (id) ON DELETE CASCADE
) TABLESPACE pg_default;

-- Creating links table
CREATE TABLE IF NOT EXISTS links (
    id SERIAL PRIMARY KEY,
    from_page_id INTEGER REFERENCES pages(id) ON DELETE CASCADE,
    to_url TEXT NOT NULL,
    anchor_text TEXT,
    link_type CHARACTER VARYING(20) DEFAULT 'external',
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
) TABLESPACE pg_default;

-- Creating terms table
CREATE TABLE IF NOT EXISTS terms (
    id SERIAL PRIMARY KEY,
    term TEXT,
    CONSTRAINT terms_term_key UNIQUE (term)
) TABLESPACE pg_default;
