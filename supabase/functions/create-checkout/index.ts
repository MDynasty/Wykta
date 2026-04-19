// Wykta – create-checkout Supabase Edge Function
// Creates a Stripe Checkout Session and returns the hosted checkout URL.
//
// Required Supabase secrets:
//   STRIPE_SECRET_KEY       – your Stripe secret key (sk_live_... or sk_test_...)
//   SITE_URL                – your deployed site URL, e.g. https://wykta.app
//
// Enable via GitHub Actions secret:   STRIPE_SECRET_KEY=sk_...
//
// Stripe payment methods enabled automatically by Stripe based on currency/region.
// For zh/CNY, Alipay & WeChat Pay appear automatically when enabled in your
// Stripe Dashboard → Settings → Payment methods.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

// Industry-benchmarked pricing (amounts in smallest currency unit):
// Verified against 2025 public App Store listings:
//   Yuka:        $15/yr (US), ~€14/yr (EU) — basic barcode scanner
//   Think Dirty: $27.99–$29.99/yr Premium (US) — cosmetic scanner, ingredient DB
//   INCI Beauty: €1.50/mo = €18/yr (EU) — ingredient-only, no AI
//   CN market:   ¥15–38/月, ¥88–258/年 (mainstream ¥18–28/月, ¥100–188/年)
// Wykta = AI-powered multi-source analysis + camera OCR → matches Think Dirty Premium tier.
// EN/USD: $3.99/mo, $27.99/yr — matches Think Dirty Premium; above Yuka ($15/yr)
// FR/DE/EUR: €2.99/mo, €21.99/yr — above INCI Beauty (€18/yr), just below Think Dirty
// ZH/CNY: ¥18/mo, ¥128/yr — mid-market of CN beauty-app range
const PLANS: Record<string, Record<string, { currency: string; unitAmount: number; interval: "month" | "year" | null; name: string }>> = {
  en: {
    "pro-monthly": { currency: "usd", unitAmount: 399, interval: "month", name: "Wykta Pro Monthly" },
    "pro-annual":  { currency: "usd", unitAmount: 2799, interval: "year",  name: "Wykta Pro Annual"  },
  },
  fr: {
    "pro-monthly": { currency: "eur", unitAmount: 299, interval: "month", name: "Wykta Pro Mensuel" },
    "pro-annual":  { currency: "eur", unitAmount: 2199, interval: "year",  name: "Wykta Pro Annuel"  },
  },
  de: {
    "pro-monthly": { currency: "eur", unitAmount: 299, interval: "month", name: "Wykta Pro Monatlich" },
    "pro-annual":  { currency: "eur", unitAmount: 2199, interval: "year",  name: "Wykta Pro Jährlich"  },
  },
  zh: {
    // For zh/CNY, Alipay & WeChat Pay support one-time checkout mode.
    // Monthly uses card (Stripe subscription), annual uses one-time payment (Alipay/WeChat).
    "pro-monthly": { currency: "cny", unitAmount: 1800, interval: "month", name: "Wykta 专业版 月付" },
    "pro-annual":  { currency: "cny", unitAmount: 12800, interval: null,   name: "Wykta 专业版 年付" },
  },
}

function normalizeLocale(lang: string): keyof typeof PLANS {
  const l = (lang || "en").slice(0, 2).toLowerCase()
  if (l === "fr") return "fr"
  if (l === "de") return "de"
  if (l === "zh") return "zh"
  return "en"
}

function normalizeSiteUrl(rawUrl?: string | null): string | null {
  if (!rawUrl) return null
  try {
    const u = new URL(rawUrl)
    if (!/^https?:$/.test(u.protocol)) return null
    const normalizedPath = u.pathname.replace(/\/+$/, "")
    return `${u.origin}${normalizedPath}`
  } catch {
    return null
  }
}

function inferSiteUrlFromHeaders(req: Request): string | null {
  const referer = req.headers.get("referer")
  if (referer) {
    try {
      const u = new URL(referer)
      const basePath = u.pathname.replace(/\/[^/]*$/, "").replace(/\/+$/, "")
      return `${u.origin}${basePath}`
    } catch {
      // no-op: fallback to Origin below
    }
  }
  const origin = req.headers.get("origin")
  return normalizeSiteUrl(origin)
}

function isAllowedSiteUrlForRequest(siteUrl: string, req: Request): boolean {
  const candidate = normalizeSiteUrl(siteUrl)
  if (!candidate) return false
  const candidateOrigin = new URL(candidate).origin
  const originHeader = req.headers.get("origin")
  if (originHeader) {
    const origin = normalizeSiteUrl(originHeader)
    if (!origin || new URL(origin).origin !== candidateOrigin) return false
  }
  const referer = req.headers.get("referer")
  if (referer) {
    try {
      const refererOrigin = new URL(referer).origin
      if (refererOrigin !== candidateOrigin) return false
    } catch {
      return false
    }
  }
  return true
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY")
    if (!stripeKey) {
      return new Response(
        JSON.stringify({ error: "Stripe not configured. Set the STRIPE_SECRET_KEY secret." }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      )
    }

    const defaultSiteUrl = normalizeSiteUrl(Deno.env.get("SITE_URL")) || "https://wykta.app"
    const body = await req.json()
    const { plan, lang, email, site_url } = body as { plan: string; lang: string; email?: string; site_url?: string }

    const locale = normalizeLocale(lang)
    const localeMap = PLANS[locale]
    const planConfig = localeMap?.[plan]
    const requestedSiteUrl = normalizeSiteUrl(site_url)
    const siteUrl =
      (requestedSiteUrl && isAllowedSiteUrlForRequest(requestedSiteUrl, req) ? requestedSiteUrl : null) ||
      inferSiteUrlFromHeaders(req) ||
      defaultSiteUrl

    if (!planConfig) {
      return new Response(
        JSON.stringify({ error: `Unknown plan: ${plan}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      )
    }

    // For annual zh plan, use one-time payment mode so Alipay/WeChat Pay are available.
    const isSubscription = planConfig.interval !== null
    const mode = isSubscription ? "subscription" : "payment"

    const lineItem = {
      price_data: {
        currency: planConfig.currency,
        unit_amount: planConfig.unitAmount,
        product_data: { name: planConfig.name },
        ...(isSubscription ? { recurring: { interval: planConfig.interval } } : {}),
      },
      quantity: 1,
    }

    // Build Stripe Checkout Session payload
    const sessionPayload: Record<string, unknown> = {
      mode,
      line_items: [lineItem],
      success_url: `${siteUrl}/payment-success.html?session_id={CHECKOUT_SESSION_ID}&plan=${encodeURIComponent(plan)}&lang=${encodeURIComponent(locale)}`,
      cancel_url: `${siteUrl}/checkout.html?plan=${encodeURIComponent(plan)}&lang=${encodeURIComponent(locale)}&cancelled=1`,
      // Stripe automatically displays the best payment methods per region.
      // To also show Alipay/WeChat Pay, enable them in the Stripe Dashboard.
      automatic_payment_methods: { enabled: true },
      metadata: {
        wykta_plan: plan,
        wykta_lang: locale,
      },
    }

    if (email) {
      sessionPayload.customer_email = email
    }

    // Call Stripe API
    const stripeRes = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${stripeKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: encodeStripeForm(sessionPayload),
    })

    if (!stripeRes.ok) {
      const errBody = await stripeRes.text()
      console.error("Stripe error:", errBody)
      return new Response(
        JSON.stringify({ error: "Stripe session creation failed.", detail: errBody }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      )
    }

    const session = await stripeRes.json()
    return new Response(
      JSON.stringify({ url: session.url }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    )
  } catch (err) {
    console.error("create-checkout error:", err)
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    )
  }
})

// Stripe's API uses application/x-www-form-urlencoded with nested dot-notation keys.
function encodeStripeForm(obj: Record<string, unknown>, prefix = ""): string {
  const parts: string[] = []
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}[${k}]` : k
    if (v === null || v === undefined) continue
    if (typeof v === "object" && !Array.isArray(v)) {
      parts.push(encodeStripeForm(v as Record<string, unknown>, key))
    } else if (Array.isArray(v)) {
      v.forEach((item, i) => {
        if (typeof item === "object") {
          parts.push(encodeStripeForm(item as Record<string, unknown>, `${key}[${i}]`))
        } else {
          parts.push(`${encodeURIComponent(`${key}[${i}]`)}=${encodeURIComponent(String(item))}`)
        }
      })
    } else {
      parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(v))}`)
    }
  }
  return parts.join("&")
}
