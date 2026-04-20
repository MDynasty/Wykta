// Wykta – stripe-webhook Supabase Edge Function
// Receives Stripe webhook events and persists subscription records to Supabase DB.
//
// Required Supabase secrets:
//   STRIPE_WEBHOOK_SECRET  – signing secret from your Stripe webhook endpoint
//                            (Stripe Dashboard → Developers → Webhooks → your endpoint → Signing secret)
//   SUPABASE_URL           – injected automatically by Supabase runtime
//   SUPABASE_SERVICE_ROLE_KEY – service-role key (required to write to DB)
//
// Stripe Dashboard webhook setup:
//   URL:    https://<project-ref>.supabase.co/functions/v1/stripe-webhook
//   Events: checkout.session.completed, customer.subscription.deleted
//
// Idempotency: each Stripe event ID is recorded in processed_stripe_events.
// If Stripe retries delivery, the duplicate event is detected and safely skipped.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

// Minimal Stripe signature verification (HMAC-SHA256 over raw body)
async function verifyStripeSignature(
  payload: string,
  sigHeader: string,
  secret: string,
): Promise<boolean> {
  try {
    const parts = Object.fromEntries(sigHeader.split(",").map((p) => p.split("=")))
    const timestamp = parts["t"]
    const sig = parts["v1"]
    if (!timestamp || !sig) return false

    const signed = `${timestamp}.${payload}`
    const encoder = new TextEncoder()
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    )
    const signatureBuffer = await crypto.subtle.sign("HMAC", key, encoder.encode(signed))
    const computed = Array.from(new Uint8Array(signatureBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
    return computed === sig
  } catch {
    return false
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET")
  const supabaseUrl = Deno.env.get("SUPABASE_URL")
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")

  if (!webhookSecret || !supabaseUrl || !supabaseServiceKey) {
    console.error("Missing required secrets")
    return new Response("Server configuration error", { status: 500 })
  }

  const rawBody = await req.text()
  const sigHeader = req.headers.get("stripe-signature") ?? ""

  const valid = await verifyStripeSignature(rawBody, sigHeader, webhookSecret)
  if (!valid) {
    console.error("Invalid Stripe signature")
    return new Response("Invalid signature", { status: 400 })
  }

  let event: { id: string; type: string; data: { object: Record<string, unknown> } }
  try {
    event = JSON.parse(rawBody)
  } catch {
    return new Response("Invalid JSON", { status: 400 })
  }

  const db = createClient(supabaseUrl, supabaseServiceKey)

  // ── Idempotency check ───────────────────────────────────────────────────
  // Insert a row for this event ID. If the row already exists the insert
  // will fail with a unique-key violation, meaning we already processed it.
  const { error: dedupError } = await db
    .from("processed_stripe_events")
    .insert({ stripe_event_id: event.id, event_type: event.type })

  if (dedupError) {
    if (dedupError.code === "23505") {
      // Duplicate — Stripe is retrying an already-processed event; ack it.
      console.log(`Duplicate event skipped: ${event.id}`)
      return new Response(JSON.stringify({ received: true, skipped: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }
    console.error("Idempotency insert error:", dedupError)
    return new Response("DB error", { status: 500 })
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object
    const customerEmail = (session.customer_email ?? session.customer_details?.email ?? "") as string
    const plan = (session.metadata?.wykta_plan ?? "") as string
    const lang = (session.metadata?.wykta_lang ?? "en") as string
    const amountTotal = (session.amount_total ?? 0) as number
    const currency = (session.currency ?? "usd") as string
    const stripeSessionId = (session.id ?? "") as string
    const stripeCustomerId = (session.customer ?? "") as string
    const stripeSubscriptionId = (session.subscription ?? "") as string
    const mode = (session.mode ?? "payment") as string

    // Upsert subscription record
    const { error } = await db.from("subscriptions").upsert({
      stripe_session_id: stripeSessionId,
      stripe_customer_id: stripeCustomerId || null,
      stripe_subscription_id: stripeSubscriptionId || null,
      email: customerEmail,
      plan,
      lang,
      amount_cents: amountTotal,
      currency,
      mode,
      status: "active",
      activated_at: new Date().toISOString(),
    }, { onConflict: "stripe_session_id" })

    if (error) {
      console.error("DB upsert error:", error)
      return new Response("DB error", { status: 500 })
    }

    console.log(`Subscription activated: ${customerEmail} → ${plan}`)
  }

  if (event.type === "customer.subscription.deleted") {
    const sub = event.data.object
    const stripeSubscriptionId = (sub.id ?? "") as string

    const { error } = await db
      .from("subscriptions")
      .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
      .eq("stripe_subscription_id", stripeSubscriptionId)

    if (error) {
      console.error("DB update error:", error)
    }

    console.log(`Subscription cancelled: ${stripeSubscriptionId}`)
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })
})
