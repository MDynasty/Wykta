// Wykta – verify-otp Supabase Edge Function
// Validates a 6-digit OTP against the email_tokens table.
//
// Required Supabase secrets:
//   SUPABASE_URL              – injected automatically by Supabase runtime
//   SUPABASE_SERVICE_ROLE_KEY – service-role key (reads/updates email_tokens table)
//
// Request:  POST /functions/v1/verify-otp
//           Content-Type: application/json
//           Body: { "email": "user@example.com", "token": "123456", "purpose": "verify" | "community" }
//
// Response (success): { "valid": true }
// Response (fail):    { "valid": false, "error": "..." }

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

    const db = createClient(supabaseUrl, supabaseServiceKey)

    const { data: row, error: fetchError } = await db
      .from("email_tokens")
      .select("id, used, expires_at")
      .eq("email", email)
      .eq("token", token)
      .eq("purpose", purpose)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (fetchError) {
      console.error("verify-otp DB error:", fetchError)
      return new Response(JSON.stringify({ valid: false, error: "Could not verify code." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } })
    }

    if (!row) {
      return new Response(JSON.stringify({ valid: false, error: "Invalid or expired code." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } })
    }

    if (row.used) {
      return new Response(JSON.stringify({ valid: false, error: "This code has already been used." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } })
    }

    if (new Date(row.expires_at) < new Date()) {
      return new Response(JSON.stringify({ valid: false, error: "This code has expired. Please request a new one." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } })
    }

    // Mark the token as used
    await db.from("email_tokens").update({ used: true }).eq("id", row.id)

    // If purpose is 'community', mark the community member as confirmed
    if (purpose === "community") {
      await db
        .from("community_members")
        .update({ confirmed: true })
        .eq("email", email)
        .eq("confirmed", false)
    }

    return new Response(JSON.stringify({ valid: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } })
  } catch (err) {
    console.error("verify-otp error:", err)
    return new Response(JSON.stringify({ valid: false, error: "An internal error occurred." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } })
  }
})
