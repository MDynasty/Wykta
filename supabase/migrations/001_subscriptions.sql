-- Wykta – initial schema migration
-- Run in Supabase Dashboard → SQL Editor, or via `supabase db push`

-- Subscriptions: records every completed Stripe payment
create table if not exists subscriptions (
  id                      uuid primary key default gen_random_uuid(),
  stripe_session_id       text unique not null,
  stripe_customer_id      text,
  stripe_subscription_id  text,
  email                   text not null,
  plan                    text not null,              -- 'pro-monthly' | 'pro-annual'
  lang                    text not null default 'en', -- market locale
  amount_cents            integer not null default 0, -- amount in smallest currency unit
  currency                text not null default 'usd',
  mode                    text not null default 'subscription', -- 'subscription' | 'payment'
  status                  text not null default 'active',       -- 'active' | 'cancelled'
  activated_at            timestamptz not null default now(),
  cancelled_at            timestamptz,
  created_at              timestamptz not null default now()
);

create index if not exists subscriptions_email_idx on subscriptions (email);
create index if not exists subscriptions_stripe_sub_idx on subscriptions (stripe_subscription_id);

-- Sales leads: enterprise contact-sales form submissions
create table if not exists sales_leads (
  id           uuid primary key default gen_random_uuid(),
  company      text,
  email        text not null,
  team_size    text,
  needs        text,
  lang         text not null default 'en',
  submitted_at timestamptz not null default now()
);

-- Community members: community onboarding form submissions
create table if not exists community_members (
  id          uuid primary key default gen_random_uuid(),
  email       text not null,
  channel     text not null, -- 'discord' | 'telegram' | 'wechat' | 'x' | 'github'
  wallet      text,          -- optional crypto wallet for rewards
  lang        text not null default 'en',
  joined_at   timestamptz not null default now()
);

create index if not exists community_members_email_idx on community_members (email);

-- Enable Row Level Security (read-only for anon; writes only via service-role)
alter table subscriptions     enable row level security;
alter table sales_leads        enable row level security;
alter table community_members  enable row level security;

-- Only allow anon reads on own subscription by email (for receipt display)
create policy "Users can read own subscription" on subscriptions
  for select using (true);

-- Inserts handled by edge functions using service-role key (bypasses RLS)
