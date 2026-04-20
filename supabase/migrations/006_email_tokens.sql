-- Wykta – migration 006: email verification tokens
-- Supports double opt-in for community.html and OTP for account.html
-- Run in Supabase Dashboard → SQL Editor, or via `supabase db push`

-- ---------------------------------------------------------------------------
-- email_tokens: short-lived one-time verification codes
-- ---------------------------------------------------------------------------
create table if not exists email_tokens (
  id          uuid primary key default gen_random_uuid(),
  email       text not null,
  token       text not null,              -- 6-digit numeric OTP
  purpose     text not null default 'verify', -- 'verify' | 'community'
  used        boolean not null default false,
  expires_at  timestamptz not null,
  created_at  timestamptz not null default now()
);

create index if not exists email_tokens_email_idx     on email_tokens (email);
create index if not exists email_tokens_token_idx     on email_tokens (token);
create index if not exists email_tokens_expires_idx   on email_tokens (expires_at);

-- Enable Row Level Security — all access via service-role edge functions only
alter table email_tokens enable row level security;

-- No anon reads or writes; service-role key bypasses RLS
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- community_members: add confirmed flag for double opt-in
-- ---------------------------------------------------------------------------
alter table community_members
  add column if not exists confirmed boolean not null default false;

-- Mark existing rows as confirmed (they were added before this feature)
update community_members set confirmed = true where confirmed = false;

-- ---------------------------------------------------------------------------
-- Scheduled cleanup (optional – same pattern as scan_events):
-- Enable pg_cron and run:
--   select cron.schedule(
--     'cleanup-email-tokens',
--     '0 4 * * *',   -- every day at 04:00 UTC
--     $$
--       delete from email_tokens
--        where expires_at < now() - interval '1 day';
--     $$
--   );
-- ---------------------------------------------------------------------------
