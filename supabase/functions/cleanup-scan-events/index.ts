// Wykta – cleanup-scan-events Supabase Edge Function
// Prunes old rows from scan_events and processed_stripe_events tables.
// Designed to run on a schedule (e.g. weekly via GitHub Actions cron).
//
// Required Supabase secrets:
//   SUPABASE_URL              – injected automatically by Supabase runtime
//   SUPABASE_SERVICE_ROLE_KEY – service-role key (deletes from tables)
//   CLEANUP_SECRET            – shared secret to authorise scheduled calls
//                               (set in GitHub Actions as CLEANUP_SECRET)
//
// Retention windows:
//   scan_events:              90 days  (telemetry; short window for privacy)
//   processed_stripe_events:  30 days  (Stripe retry window is ~3 days)
//   ingredient_cache:         expired rows (per expires_at column)
//
// To trigger via GitHub Actions (add to .github/workflows/cleanup.yml):
//   curl -X POST \
//     -H "Authorization: Bearer $CLEANUP_SECRET" \
//     "$SUPABASE_URL/functions/v1/cleanup-scan-events"
//
// Alternatively, enable pg_cron in Supabase Dashboard → Extensions and use
// the cron.schedule() calls documented in migration 003_constraints.sql.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  // Only accept POST
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 })
  }

  // Validate shared secret to prevent unauthorised invocations
  const cleanupSecret = Deno.env.get("CLEANUP_SECRET")
  if (cleanupSecret) {
    const auth = req.headers.get("Authorization") ?? ""
    const token = auth.replace(/^Bearer\s+/i, "")
    if (token !== cleanupSecret) {
      return new Response("Unauthorized", { status: 401 })
    }
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")

  if (!supabaseUrl || !supabaseServiceKey) {
    return new Response(
      JSON.stringify({ error: "Server configuration error." }),
      { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    )
  }

  const db = createClient(supabaseUrl, supabaseServiceKey)
  const results: Record<string, unknown> = {}

  // 1. Prune scan_events older than 90 days
  const scanCutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
  const { error: scanError, count: scanDeleted } = await db
    .from("scan_events")
    .delete({ count: "exact" })
    .lt("created_at", scanCutoff)

  if (scanError) {
    console.error("scan_events cleanup error:", scanError)
    results.scan_events = { error: scanError.message }
  } else {
    console.log(`Deleted ${scanDeleted ?? 0} scan_events rows older than 90 days`)
    results.scan_events = { deleted: scanDeleted ?? 0 }
  }

  // 2. Prune processed_stripe_events older than 30 days
  const eventsCutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const { error: eventsError, count: eventsDeleted } = await db
    .from("processed_stripe_events")
    .delete({ count: "exact" })
    .lt("processed_at", eventsCutoff)

  if (eventsError) {
    console.error("processed_stripe_events cleanup error:", eventsError)
    results.processed_stripe_events = { error: eventsError.message }
  } else {
    console.log(`Deleted ${eventsDeleted ?? 0} processed_stripe_events rows older than 30 days`)
    results.processed_stripe_events = { deleted: eventsDeleted ?? 0 }
  }

  // 3. Prune expired ingredient_cache rows
  const now = new Date().toISOString()
  const { error: cacheError, count: cacheDeleted } = await db
    .from("ingredient_cache")
    .delete({ count: "exact" })
    .lt("expires_at", now)

  if (cacheError) {
    console.error("ingredient_cache cleanup error:", cacheError)
    results.ingredient_cache = { error: cacheError.message }
  } else {
    console.log(`Deleted ${cacheDeleted ?? 0} expired ingredient_cache rows`)
    results.ingredient_cache = { deleted: cacheDeleted ?? 0 }
  }

  return new Response(
    JSON.stringify({ ok: true, cleaned: results }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  )
})
