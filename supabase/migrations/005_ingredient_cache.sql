-- Wykta – migration 005: ingredient lookup cache
-- Run in Supabase Dashboard → SQL Editor, or via `supabase db push`

-- ---------------------------------------------------------------------------
-- ingredient_cache: write-through cache for OFF / OBF / Wikidata API responses.
--
-- Under high traffic the frontend makes per-ingredient live HTTP calls to
-- Open Food Facts, Open Beauty Facts, and Wikidata.  These third-party APIs
-- apply rate limits that become a bottleneck at scale.
--
-- The cache_key format mirrors the in-memory sessionStorage key already used
-- by the frontend:  '<source>|<ingredient>|<lang>'
-- e.g. 'wikidata|retinol|en',  'off|water|fr',  'obf|niacinamide|zh'
--
-- TTL strategy:
--   • wikidata / off / obf entries expire after 30 days (stable data)
--   • Local fallback entries ('local' source) do not need caching here
--
-- Eviction: a weekly scheduled edge function (cleanup-scan-events) also
-- deletes ingredient_cache rows past their expires_at.
-- ---------------------------------------------------------------------------
create table if not exists ingredient_cache (
  cache_key       text        primary key,           -- '<source>|<ingredient>|<lang>'
  ingredient_name text        not null,
  lang            text        not null default 'en',
  source          text        not null,              -- 'wikidata' | 'off' | 'obf'
  data            jsonb       not null,              -- raw API response subset
  hit_count       integer     not null default 1,
  cached_at       timestamptz not null default now(),
  expires_at      timestamptz not null generated always as
                    (cached_at + interval '30 days') stored
);

create index if not exists ingredient_cache_lang_idx    on ingredient_cache (lang);
create index if not exists ingredient_cache_expires_idx on ingredient_cache (expires_at);
create index if not exists ingredient_cache_source_idx  on ingredient_cache (source);

alter table ingredient_cache enable row level security;

-- Anon users may read cached ingredient data (no PII present)
create policy "Anon can read ingredient cache" on ingredient_cache
  for select using (true);

-- Writes are performed by the wykta-backend edge function (service-role key)
