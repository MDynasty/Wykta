-- Wykta – migration 002: fix subscriptions RLS + add scan_events table
-- Run in Supabase Dashboard → SQL Editor, or via `supabase db push`

-- ---------------------------------------------------------------------------
-- Fix overly-permissive subscriptions RLS policy.
-- Subscriptions are read by service-role via the verify-session edge function,
-- so anonymous reads via the anon key are not needed and should be blocked.
-- ---------------------------------------------------------------------------
drop policy if exists "Users can read own subscription" on subscriptions;

create policy "No anon subscription reads" on subscriptions
  for select using (false);

-- ---------------------------------------------------------------------------
-- scan_events: anonymous per-scan telemetry
-- No PII is stored — only aggregate signals (counts, language, source).
-- The session_id is a random UUID stored in localStorage; it carries no
-- identity and is never joined to email or any other identifier.
-- ---------------------------------------------------------------------------
create table if not exists scan_events (
  id               uuid        primary key default gen_random_uuid(),
  session_id       text        not null,          -- anonymous localStorage UUID
  ingredient_count integer     not null,          -- number of ingredients parsed
  input_lang       text        not null,          -- language detected from ingredient text
  analysis_source  text        not null,          -- 'ai' | 'local'
  warning_count    integer     not null default 0, -- ingredient-interaction warnings
  allergen_count   integer     not null default 0, -- danger-flagged ingredient cards
  lang             text        not null default 'en', -- UI display language
  created_at       timestamptz not null default now()
);

create index if not exists scan_events_session_idx on scan_events (session_id);
create index if not exists scan_events_created_idx on scan_events (created_at);
create index if not exists scan_events_lang_idx    on scan_events (lang);

alter table scan_events enable row level security;

-- Anon users may insert (no PII present); no anon select is granted.
create policy "Anon can record scan events" on scan_events
  for insert with check (true);
