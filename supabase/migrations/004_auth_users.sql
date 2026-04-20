-- Wykta – migration 004: auth-linked users + webhook idempotency
-- Run in Supabase Dashboard → SQL Editor, or via `supabase db push`

-- ---------------------------------------------------------------------------
-- users: maps Supabase Auth identities to Stripe customer IDs and plan state.
--
-- Populated by the stripe-webhook edge function on checkout.session.completed.
-- The stripe-webhook uses service-role key and upserts by email, so a row is
-- created/updated independently of whether the user has ever logged in.
--
-- Once a user signs up via magic-link or OAuth, their auth.uid is linked here.
-- This lets the frontend call auth.getUser() → look up plan in this table.
-- ---------------------------------------------------------------------------
create table if not exists users (
  id                  uuid        primary key references auth.users(id) on delete cascade,
  email               text        not null unique,
  stripe_customer_id  text        unique,
  plan                text        not null default 'free',    -- 'free' | 'pro-monthly' | 'pro-annual' | 'enterprise'
  plan_status         text        not null default 'active',  -- 'active' | 'cancelled' | 'expired'
  plan_expires_at     timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists users_email_idx             on users (email);
create index if not exists users_stripe_customer_idx   on users (stripe_customer_id);

alter table users enable row level security;

-- Authenticated users may read and update only their own profile row
create policy "Users can read own profile" on users
  for select using (auth.uid() = id);

create policy "Users can update own profile" on users
  for update using (auth.uid() = id);

-- Trigger: keep updated_at current on every row change
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger users_set_updated_at
  before update on users
  for each row execute procedure set_updated_at();

-- ---------------------------------------------------------------------------
-- processed_stripe_events: idempotency log for Stripe webhook events.
--
-- Stripe may deliver the same event more than once during retries.
-- Before processing any event, the webhook handler inserts a row here.
-- If the insert fails (duplicate primary key), the event is skipped.
--
-- Rows older than 30 days are safe to delete; Stripe retries within ~3 days.
-- ---------------------------------------------------------------------------
create table if not exists processed_stripe_events (
  stripe_event_id  text        primary key,
  event_type       text        not null,
  processed_at     timestamptz not null default now()
);

create index if not exists processed_events_at_idx on processed_stripe_events (processed_at);

alter table processed_stripe_events enable row level security;
-- No anon access — written exclusively by stripe-webhook (service-role)
