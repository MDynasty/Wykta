// Wykta – customer-portal Supabase Edge Function
// Creates a Stripe Customer Portal session so subscribers can self-manage
// (cancel, update payment method, download invoices) without contacting support.
//
// Required Supabase secrets:
//   STRIPE_SECRET_KEY         – your Stripe secret key
//   SUPABASE_URL              – injected automatically by Supabase runtime
//   SUPABASE_SERVICE_ROLE_KEY – service-role key (reads subscriptions table)
//
// Stripe Dashboard setup (one-time):
//   Stripe Dashboard → Settings → Customer portal → Activate
//   Set your return URL to https://wykta.pages.dev/ (or your custom domain)

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

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY")
    const supabaseUrl = Deno.env.get("SUPABASE_URL")
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")

    if (!stripeKey || !supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: "Server configuration error." }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      )
    }

    const body = await req.json()
    const { email, return_url } = body as { email: string; return_url?: string }

    if (!email) {
      return new Response(
        JSON.stringify({ error: "Missing email parameter." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      )
    }

    // Look up the Stripe customer ID from the subscriptions table
    const db = createClient(supabaseUrl, supabaseServiceKey)
    const { data: sub, error: dbError } = await db
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("email", email)
      .eq("status", "active")
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

    if (!sub?.stripe_customer_id) {
      return new Response(
        JSON.stringify({ error: "No active subscription found for this email." }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      )
    }

    // Create a Stripe Customer Portal session
    const portalBody = new URLSearchParams({
      customer: sub.stripe_customer_id,
      return_url: return_url || "https://wykta.pages.dev/",
    })

    const portalRes = await fetch(
      "https://api.stripe.com/v1/billing_portal/sessions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${stripeKey}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: portalBody.toString(),
      },
    )

    if (!portalRes.ok) {
      const errText = await portalRes.text()
      console.error("Stripe portal error:", errText)
      return new Response(
        JSON.stringify({ error: "Could not create portal session.", detail: errText }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      )
    }

    const portal = await portalRes.json()
    return new Response(
      JSON.stringify({ url: portal.url }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    )
  } catch (err) {
    console.error("customer-portal error:", err)
    return new Response(
      JSON.stringify({ error: "An internal error occurred. Please try again." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    )
  }
})
