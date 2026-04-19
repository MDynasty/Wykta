# Wykta – Backend & Payment Setup Guide

## Architecture Overview

```
User browser
  └─ checkout.html
       └─ POST /functions/v1/create-checkout  (Supabase Edge Function)
            └─ Stripe Checkout Session API
                 └─ Stripe hosted payment page (card / Alipay / WeChat Pay)
                      ├─ Success → payment-success.html?session_id=…
                      │     └─ GET /functions/v1/verify-session  → show real receipt
                      └─ Stripe Webhook → /functions/v1/stripe-webhook
                            └─ Inserts/updates `subscriptions` table in Supabase DB
```

---

## Step 1 – Supabase project

1. Create a project at https://supabase.com
2. Copy **Project URL** and **anon public key** into `config.js`:
   ```js
   const supabaseUrl = "https://<project-ref>.supabase.co"
   const supabaseKey = "<anon-public-key>"
   ```
3. Run the database migration in **SQL Editor**:
   - Open `supabase/migrations/001_subscriptions.sql` and execute it.
   - This creates `subscriptions`, `sales_leads`, and `community_members` tables.

---

## Step 2 – Stripe account

1. Sign up at https://stripe.com (use Stripe Connect for multi-currency payouts).
2. Activate payment methods you need in **Dashboard → Settings → Payment methods**:
   - Cards (enabled by default)
   - Alipay (required for zh/CNY market)
   - WeChat Pay (required for zh/CNY market)
3. Get your **Secret key** from **Developers → API keys** (`sk_live_…` or `sk_test_…`).
4. Create a **Webhook endpoint**:
   - URL: `https://<project-ref>.supabase.co/functions/v1/stripe-webhook`
   - Events to listen for:
     - `checkout.session.completed`
     - `customer.subscription.deleted`
5. Copy the **Signing secret** (`whsec_…`) for the webhook.

> **Payout:** Funds settle to your Stripe balance and are automatically swept to your
> connected bank account on your configured payout schedule (daily or weekly).
> Stripe supports USD, EUR, CNY (via Alipay/WeChat) → converted to your payout currency.

---

## Step 3 – GitHub Secrets (CI/CD)

Go to **Repository → Settings → Secrets and variables → Actions** and add:

| Secret name             | Value                             | Required |
|-------------------------|-----------------------------------|----------|
| `SUPABASE_ACCESS_TOKEN` | Supabase personal access token    | ✅        |
| `OPENAI_API_KEY`        | OpenAI API key (`sk-…`)           | Optional |
| `OPENAI_MODEL`          | e.g. `gpt-4o-mini`                | Optional |
| `STRIPE_SECRET_KEY`     | Stripe secret key (`sk_live_…`)   | ✅        |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret     | ✅        |
| `SITE_URL`              | Your deployed site URL (no slash) | ✅        |

Push any change to `supabase/functions/**` to trigger the deploy workflow,
which deploys all four edge functions and syncs all secrets to the Supabase runtime.

---

## Step 4 – Manual deploy (Supabase CLI)

```bash
npm install -g supabase
supabase login
PROJECT=rryuicpnjxxzsmkotgrj

# Deploy all edge functions
supabase functions deploy wykta-backend     --project-ref $PROJECT --no-verify-jwt
supabase functions deploy create-checkout  --project-ref $PROJECT --no-verify-jwt
supabase functions deploy stripe-webhook   --project-ref $PROJECT --no-verify-jwt
supabase functions deploy verify-session   --project-ref $PROJECT --no-verify-jwt

# Sync secrets
supabase secrets set STRIPE_SECRET_KEY=sk_live_...     --project-ref $PROJECT
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...   --project-ref $PROJECT
supabase secrets set SITE_URL=https://wykta.app        --project-ref $PROJECT
supabase secrets set OPENAI_API_KEY=sk-...             --project-ref $PROJECT
```

---

## Industry-Benchmarked Pricing

| Market  | Currency | Monthly | Annual  | Competitor reference                                    |
|---------|----------|---------|---------|--------------------------------------------------------|
| EN (US) | USD      | $2.99   | $24.99  | Yuka $13.99/yr · Think Dirty $39.99/yr                 |
| FR (EU) | EUR      | €2.49   | €19.99  | Yuka ~€14/yr · INCI Beauty €1.50/mo · Think Dirty ~€37/yr |
| DE (EU) | EUR      | €2.49   | €19.99  | Same EU range as FR                                     |
| ZH (CN) | CNY      | ¥9.90   | ¥68     | CN beauty-app market: ¥9.9–29.9/mo mainstream range     |

Wykta is AI-powered (camera OCR + multi-source ingredient analysis) which justifies
positioning above Yuka and INCI Beauty while staying accessible vs Think Dirty.

---

## Payment Flow Summary

1. User opens `checkout.html`, selects plan + enters email.
2. Browser calls `create-checkout` Edge Function (POST).
3. Edge function creates a Stripe Checkout Session (using `price_data` inline pricing).
4. User is redirected to **Stripe's hosted page** — Stripe handles all PCI compliance.
5. After payment:
   - Stripe redirects user to `payment-success.html?session_id=…`
   - `payment-success.html` calls `verify-session` to confirm payment and show receipt.
   - Stripe fires `checkout.session.completed` webhook → `stripe-webhook` edge function
     → inserts record into `subscriptions` table.
6. **Money lands in:** Stripe balance → automatically swept to your bank account.

---

## Troubleshooting

- **"Stripe not configured"** on checkout → `STRIPE_SECRET_KEY` secret is missing.
- **Webhook signature invalid** → `STRIPE_WEBHOOK_SECRET` doesn't match the endpoint's signing secret in Stripe Dashboard.
- **Payment verified but no DB record** → Check `stripe-webhook` function logs in Supabase Dashboard → Edge Functions.
- **Alipay / WeChat Pay not showing** → Enable them in Stripe Dashboard → Settings → Payment methods.
