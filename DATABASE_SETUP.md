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

## Step 0 – Cloudflare Pages deployment

The site is a fully static frontend deployed to **Cloudflare Pages**.

### Project settings

| Setting           | Value                         |
|-------------------|-------------------------------|
| Production branch | `main`                        |
| Build command     | *(none – static site)*        |
| Output directory  | *(repository root)*           |

### Production domain

Use the Cloudflare Pages default production domain:
- `https://wykta.pages.dev`

### After setting the production domain

1. Update `SITE_URL` in GitHub Secrets to `https://wykta.pages.dev` (no trailing slash).
2. Run the **Sync Supabase Secrets** workflow (`Actions → Sync Supabase Secrets → Run workflow`).
   This pushes `SITE_URL`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `OPENAI_API_KEY`,
   and `OPENAI_MODEL` to the live Supabase project in a single step.
3. Verify the Stripe webhook endpoint URL in Stripe Dashboard → Webhooks still points to:
   `https://<project-ref>.supabase.co/functions/v1/stripe-webhook`
4. Run one end-to-end test payment in Stripe test mode to confirm success/cancel redirects
   land on `https://wykta.pages.dev/payment-success.html` and `https://wykta.pages.dev/checkout.html`.

### Cloudflare-specific files

| File        | Purpose                                              |
|-------------|------------------------------------------------------|
| `_headers`  | Cache-Control, CSP, and security response headers    |
| `_redirects`| Legacy `/Wykta/*` path redirects to root (301)       |

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
supabase secrets set SITE_URL=https://wykta.pages.dev  --project-ref $PROJECT
supabase secrets set OPENAI_API_KEY=sk-...             --project-ref $PROJECT
```

---

## Industry-Benchmarked Pricing

Verified against 2025 public App Store listings:

| Competitor | Price | Notes |
|---|---|---|
| Yuka | $15/yr (US) · ~€14/yr (EU) | Basic barcode scanner, no AI |
| Think Dirty Premium | $27.99–$29.99/yr (US) | Cosmetic ingredients, no AI |
| Think Dirty All Access | $48.99/yr (US) | Full feature set |
| INCI Beauty | €1.50/mo = €18/yr (EU) | Official 2025 confirmed |
| CN 美妆成分App | ¥15–38/月 · ¥88–258/年 | Mainstream range ¥18–28/月, ¥100–188/年 |

Wykta pricing (AI-powered web + camera OCR → positioned at Think Dirty Premium tier):

| Market  | Currency | Monthly | Annual  | Positioning                                      |
|---------|----------|---------|---------|--------------------------------------------------|
| EN (US) | USD      | $3.99   | $27.99  | = Think Dirty Premium; above Yuka ($15/yr)        |
| FR (EU) | EUR      | €2.99   | €21.99  | Above INCI Beauty (€18/yr); below Think Dirty    |
| DE (EU) | EUR      | €2.99   | €21.99  | Same EU range as FR                              |
| ZH (CN) | CNY      | ¥18     | ¥128    | Mid-market of CN range (¥15–38/月, ¥88–188/年)    |

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
