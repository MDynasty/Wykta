// Wykta – verify-session Supabase Edge Function
// Called by payment-success.html after Stripe redirects back.
// Fetches the Stripe Checkout Session to confirm payment status and return receipt data.
//
// Required Supabase secrets:
//   STRIPE_SECRET_KEY  – your Stripe secret key

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY")
    if (!stripeKey) {
      return new Response(
        JSON.stringify({ error: "Stripe not configured." }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      )
    }

    const url = new URL(req.url)
    const sessionId = url.searchParams.get("session_id")
    if (!sessionId) {
      return new Response(
        JSON.stringify({ error: "Missing session_id parameter." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      )
    }

    const stripeRes = await fetch(
      `https://api.stripe.com/v1/checkout/sessions/${sessionId}?expand[]=line_items&expand[]=customer`,
      {
        headers: { Authorization: `Bearer ${stripeKey}` },
      },
    )

    if (!stripeRes.ok) {
      const errText = await stripeRes.text()
      console.error("Stripe retrieve error:", errText)
      return new Response(
        JSON.stringify({ error: "Could not retrieve session from Stripe." }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      )
    }

    const session = await stripeRes.json()

    // Only expose safe subset of session data to the client
    const receipt = {
      id: session.id,
      paymentStatus: session.payment_status,
      status: session.status,
      customerEmail: session.customer_email ?? session.customer_details?.email ?? "",
      amountTotal: session.amount_total,
      currency: session.currency,
      plan: session.metadata?.wykta_plan ?? "",
      lang: session.metadata?.wykta_lang ?? "en",
      productName: session.line_items?.data?.[0]?.description ?? session.metadata?.wykta_plan ?? "",
      createdAt: new Date(session.created * 1000).toISOString(),
      mode: session.mode,
    }

    return new Response(
      JSON.stringify(receipt),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    )
  } catch (err) {
    console.error("verify-session error:", err)
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    )
  }
})
