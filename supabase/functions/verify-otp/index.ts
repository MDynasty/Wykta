// Wykta – verify-otp Supabase Edge Function
// Validates the 6-digit OTP delivered by Supabase Auth's built-in email OTP.
// For community double-opt-in it also verifies against the email_tokens table
// (used to track which community members have confirmed their email).
//
// Required Supabase secrets:
//   SUPABASE_URL              – injected automatically by Supabase runtime
//   SUPABASE_SERVICE_ROLE_KEY – service-role key
//
// Request:  POST /functions/v1/verify-otp
//           Content-Type: application/json
//           Body: { "email": "user@example.com", "token": "123456", "purpose": "verify" | "community" }
//
// Response (success): { "valid": true }
// Response (fail):    { "valid": false, "error": "..." }

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "npm:@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
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
    const token   = (body.token   ?? "").trim()
    const purpose = (body.purpose ?? "verify") as string

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return new Response(JSON.stringify({ valid: false, error: "A valid email address is required." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } })
    }

    if (!token || !/^\d{6}$/.test(token)) {
      return new Response(JSON.stringify({ valid: false, error: "A 6-digit verification code is required." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } })
    }

    // Verify the OTP via Supabase Auth's built-in verify endpoint.
    // This validates the code that Supabase sent to the user's email.
    const authVerifyRes = await fetch(`${supabaseUrl}/auth/v1/verify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": supabaseServiceKey,
        "Authorization": `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({ type: "email", email, token }),
    })

    const authVerifyData = await authVerifyRes.json()
    const authValid = authVerifyRes.ok && (authVerifyData.access_token || authVerifyData.user)

    // For community purpose, mark the community member as confirmed.
    // Note: community_members rows are inserted (confirmed=false) before OTP in the
    // frontend to preserve email/channel/lang preferences during the OTP step.
    // verify-otp promotes those rows to confirmed=true upon successful Auth verify.
    if (authValid && purpose === "community") {
      const db = createClient(supabaseUrl, supabaseServiceKey)

      // Mark any pending community tracking entry as used
      await db
        .from("email_tokens")
        .update({ used: true })
        .eq("email", email)
        .eq("purpose", "community")
        .eq("used", false)

      // Mark the community member as confirmed
      await db
        .from("community_members")
        .update({ confirmed: true })
        .eq("email", email)
        .eq("confirmed", false)
    }

    if (authValid) {
      return new Response(JSON.stringify({ valid: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } })
    }

    // Auth verification failed — return a safe generic message
    const errMsg = authVerifyData?.error_description || authVerifyData?.msg || "Invalid or expired code."
    return new Response(JSON.stringify({ valid: false, error: errMsg }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } })
  } catch (err) {
    console.error("verify-otp error:", err)
    return new Response(JSON.stringify({ valid: false, error: "An internal error occurred." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } })
  }
})
