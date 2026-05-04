// Copy this file to config.js and fill in your Supabase values.
// Do not commit config.js to GitHub.

const supabaseUrl = "https://rryuicpnjxxzsmkotgrj.supabase.co"
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJyeXVpY3Buanh4enNta290Z3JqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwNTY1NzYsImV4cCI6MjA4ODYzMjU3Nn0.283wfb_yVscOYWHigTbIFjm6GIeVmSiVuM-XwyinNBc"

// Canonical site URL — used for OG tags and Stripe redirect URLs.
// Must match the SITE_URL Supabase secret set in deploy-edge-function.yml.
// After binding a custom domain on Cloudflare Pages, update this value
// and set the matching SITE_URL secret in your Supabase project.
const siteUrl = "https://wykta.pages.dev"

// Pages that support the ?lang= URL parameter for language propagation.
const APP_LOCAL_PAGES = ["index.html","checkout.html","contact-sales.html","community.html","payment-success.html","account.html","privacy.html","terms.html"];

// Analytics (optional — leave empty to disable)
// gaId:            Google Analytics 4 Measurement ID, e.g. "G-XXXXXXXXXX"
// plausibleDomain: your site domain registered with plausible.io, e.g. "wykta.app"
const gaId = ""
const plausibleDomain = ""

// Optional: Direct Gemini API key for Vision OCR.
// When set, the app calls the Gemini Vision API directly from the browser,
// providing AI-quality image recognition without requiring a configured
// Supabase backend.  Get a free key at https://aistudio.google.com/apikey
//
// SECURITY: this key is visible in client-side code and network requests.
// ALWAYS restrict the key to your domain at:
//   https://console.cloud.google.com/apis/credentials
// Unrestricted keys can be extracted and abused by third parties.
const geminiApiKey = ""
