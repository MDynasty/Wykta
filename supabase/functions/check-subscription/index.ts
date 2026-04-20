// Wykta – check-subscription Supabase Edge Function
// Returns the active subscription status for a given email address.
// Used by account.html to show plan details without requiring Stripe portal.
//
// Required Supabase secrets:
//   SUPABASE_URL              – injected automatically by Supabase runtime
//   SUPABASE_SERVICE_ROLE_KEY – service-role key (reads subscriptions table)
//
// Request:  GET /functions/v1/check-subscription?email=<email>
// Response: { found: bool, plan, status, currency, amount_cents, activated_at, cancelled_at }

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
}

// Simple in-request rate limiter: reject suspiciously frequent calls in the
// same invocation context (edge functions share no state between requests, so
// this guards against burst abuse within a single per-isolate cold-start window).
// Deno edge function isolates are single-threaded, so mutation of callLog is safe.
const RATE_WINDOW_MS = 60_000
const MAX_CALLS_PER_WINDOW = 10
const callLog: number[] = []

function isRateLimited(): boolean {
  const now = Date.now()
  // Drop entries outside the window
  while (callLog.length && callLog[0] < now - RATE_WINDOW_MS) callLog.shift()
  callLog.push(now)
  return callLog.length > MAX_CALLS_PER_WINDOW
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  if (isRateLimited()) {
    return new Response(
      JSON.stringify({ error: "Too many requests. Please wait a moment and try again." }),
      { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    )
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: "Server configuration error." }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      )
    }

    const url = new URL(req.url)
    const email = (url.searchParams.get("email") ?? "").trim().toLowerCase()

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return new Response(
        JSON.stringify({ error: "A valid email address is required." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      )
    }

    const db = createClient(supabaseUrl, supabaseServiceKey)

    // Return only safe, non-sensitive fields (no Stripe IDs, no raw keys)
    const { data: sub, error: dbError } = await db
      .from("subscriptions")
      .select("plan, status, currency, amount_cents, activated_at, cancelled_at, mode")
      .eq("email", email)
      .order("activated_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (dbError) {
      console.error("DB error:", dbError)
      return new Response(
        JSON.stringify({ error: "Could not look up subscription." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      )
    }

    if (!sub) {
      return new Response(
        JSON.stringify({ found: false }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      )
    }

    return new Response(
      JSON.stringify({
        found: true,
        plan: sub.plan,
        status: sub.status,
        currency: sub.currency,
        amount_cents: sub.amount_cents,
        activated_at: sub.activated_at,
        cancelled_at: sub.cancelled_at ?? null,
        mode: sub.mode,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    )
  } catch (err) {
    console.error("check-subscription error:", err)
    return new Response(
      JSON.stringify({ error: "An internal error occurred. Please try again." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    )
  }
})
