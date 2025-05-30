create table pages (
  id serial not null,
  url text not null,
  title text null,
  meta_description text null,
  meta_keywords text null,
  language text null,
  canonical text null,
  content text null,
  word_count integer null default 0,
  status_code integer null,
  response_time integer null,
  content_type text null,
  crawl_date timestamp without time zone null default now(),
  last_modified timestamp without time zone null,
  created_at timestamp without time zone null default now(),
  updated_at timestamp without time zone null default now(),
  constraint pages_pkey primary key (id),
  constraint pages_url_key unique (url)
) TABLESPACE pg_default;

create table page_headings (
  id serial not null,
  page_id integer null,
  heading_type character varying(10) not null,
  text text not null,
  position integer null default 1,
  created_at timestamp without time zone null default now(),
  constraint page_headings_pkey primary key (id),
  constraint page_headings_page_id_fkey foreign KEY (page_id) references pages (id) on delete CASCADE
) TABLESPACE pg_default;

create table links (
  id serial not null,
  from_page_id integer null,
  to_url text not null,
  anchor_text text null,
  link_type character varying(20) null default 'external'::character varying,
  created_at timestamp without time zone null default now(),
  constraint links_pkey primary key (id),
  constraint links_from_page_id_fkey foreign KEY (from_page_id) references pages (id) on delete CASCADE
) TABLESPACE pg_default;

create table terms (
  id serial not null,
  term text null,
  constraint terms_pkey primary key (id),
  constraint terms_term_key unique (term)
) TABLESPACE pg_default;

create table term_page_index (
  id serial not null,
  term_id integer null,
  page_id integer null,
  frequency integer null default 1,
  field text null,
  created_at timestamp without time zone null default now(),
  tf_idf double precision null default 0,
  constraint term_page_index_pkey primary key (id),
  constraint term_page_unique unique (term_id, page_id),
  constraint term_page_index_page_id_fkey foreign KEY (page_id) references pages (id) on delete CASCADE,
  constraint term_page_index_term_id_fkey foreign KEY (term_id) references terms (id) on delete CASCADE
) TABLESPACE pg_default;



