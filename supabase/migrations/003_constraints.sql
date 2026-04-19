-- Wykta – migration 003: DB hardening for scale
-- Run in Supabase Dashboard → SQL Editor, or via `supabase db push`

-- ---------------------------------------------------------------------------
-- Prevent duplicate community member registrations per email.
-- A second join attempt with the same email is a no-op upsert in the edge
-- function (community-members endpoint), so uniqueness is safe to add.
-- ---------------------------------------------------------------------------
alter table community_members
  add constraint community_members_email_unique unique (email);

-- ---------------------------------------------------------------------------
-- scan_events automatic cleanup via pg_cron (Supabase Pro / pg_cron extension).
--
-- To activate: enable pg_cron in Supabase Dashboard → Database → Extensions,
-- then run the statement below once:
--
--   select cron.schedule(
--     'cleanup-scan-events',
--     '0 3 * * 0',   -- every Sunday at 03:00 UTC
--     $$
--       delete from scan_events
--        where created_at < now() - interval '1 year';
--     $$
--   );
--
-- On Supabase free tier (no pg_cron), use a Supabase Edge Function triggered
-- by a GitHub Actions scheduled workflow instead.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- RLS: ensure only service-role can read scan_events (anon insert remains OK).
-- Anon select policy was never created (only insert), so this is a safety
-- reminder comment — no DDL change required here.
-- ---------------------------------------------------------------------------
