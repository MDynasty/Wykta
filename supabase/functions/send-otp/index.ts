// Wykta – send-otp Supabase Edge Function
// Triggers Supabase Auth's built-in email OTP (6-digit code) for the supplied
// email address.  The code is delivered by Supabase's own SMTP relay so no
// third-party email service is required.
//
// Required Supabase secrets:
//   SUPABASE_URL              – injected automatically by Supabase runtime
//   SUPABASE_SERVICE_ROLE_KEY – service-role key
//
// Supabase project setup (one-time, Supabase Dashboard):
//   Authentication → Providers → Email → enable "Email OTP"
//   Authentication → Email Templates → customise the "Magic Link" or "OTP" template.
//
// Request:  POST /functions/v1/send-otp
//           Content-Type: application/json
//           Body: { "email": "user@example.com", "purpose": "verify" | "community", "lang": "en" }
//
// Response: { "sent": true }
//
// Rate limit: 3 requests per email address per 10 minutes (anti-spam).
// Note: the in-memory rate-limit map guards against burst abuse within a single
// isolate cold-start window.  For stricter rate-limiting across scale-out isolates
// consider using the email_tokens table to count recent requests (see comments below).

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "npm:@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

const RATE_WINDOW_MS  = 10 * 60 * 1000 // 10 minutes
const MAX_PER_WINDOW  = 3

// In-isolate rate-limit map: email → timestamps[]
// Note: edge function isolates are ephemeral and may scale independently.
// This guards against burst abuse within a single isolate's lifetime.
// For stricter cross-isolate rate limiting, query the email_tokens table:
//   SELECT count(*) FROM email_tokens
//   WHERE email = $1 AND created_at > now() - interval '10 minutes'
const rateLimitMap = new Map<string, number[]>()

function isRateLimited(email: string): boolean {
  const now  = Date.now()
  const list = (rateLimitMap.get(email) ?? []).filter(t => t > now - RATE_WINDOW_MS)
  list.push(now)
  rateLimitMap.set(email, list)
  return list.length > MAX_PER_WINDOW
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed." }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } })
  }

  try {
    const supabaseUrl        = Deno.env.get("SUPABASE_URL")
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(JSON.stringify({ error: "Server configuration error." }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } })
    }

    const body    = await req.json()
    const email   = (body.email   ?? "").trim().toLowerCase()
    const purpose = (body.purpose ?? "verify") as string

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return new Response(JSON.stringify({ error: "A valid email address is required." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } })
    }

    if (!["verify", "community"].includes(purpose)) {
      return new Response(JSON.stringify({ error: "Invalid purpose." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } })
    }

    if (isRateLimited(email)) {
      return new Response(JSON.stringify({ error: "Too many requests. Please wait a few minutes and try again." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } })
    }

    // Record that a verification was requested for tracking purposes (community only).
    // For community members: this marks a pending confirmation without storing an OTP
    // (the actual code is generated and sent by Supabase Auth).
    // Note: the community_members insert happens before OTP verification to preserve
    // channel/language preferences. Unconfirmed rows (confirmed=false) should be
    // cleaned up periodically — see the cleanup cron in 006_email_tokens.sql.
    if (purpose === "community") {
      const db = createClient(supabaseUrl, supabaseServiceKey)
      // Invalidate any previous community tracking entry
      await db
        .from("email_tokens")
        .update({ used: true })
        .eq("email", email)
        .eq("purpose", "community")
        .eq("used", false)

      // Generate a cryptographically secure token as a nonce for tracking
      // (this token is not sent to the user — Supabase Auth sends its own OTP)
      const array = new Uint32Array(4)
      crypto.getRandomValues(array)
      const nonce = Array.from(array, v => v.toString(36)).join("")
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString()

      await db.from("email_tokens").insert({
        email,
        token: nonce,
        purpose,
        expires_at: expiresAt,
      })
    }

    // Trigger Supabase Auth's built-in email OTP — Supabase sends the 6-digit
    // code to the user via the project's configured SMTP / email provider.
    // shouldCreateUser: false means only existing auth users get the code;
    // set to true if you want Wykta to auto-create Auth accounts.
    const authRes = await fetch(`${supabaseUrl}/auth/v1/otp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": supabaseServiceKey,
        "Authorization": `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({ email, create_user: true }),
    })

    if (!authRes.ok) {
      const errText = await authRes.text()
      console.warn("Supabase auth OTP returned", authRes.status, errText)
      // Return success anyway to avoid email enumeration attacks
    }

    // Always return success to avoid leaking whether an email exists
    return new Response(JSON.stringify({ sent: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } })
  } catch (err) {
    console.error("send-otp error:", err)
    return new Response(JSON.stringify({ error: "An internal error occurred." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } })
  }
})
