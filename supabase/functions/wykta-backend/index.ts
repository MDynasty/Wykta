import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "npm:@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const FALLBACK_OPENAI_MODEL = "gpt-4o"
const FALLBACK_GEMINI_MODEL = "gemini-1.5-flash"
const FALLBACK_GROQ_MODEL = "llama-3.3-70b-versatile"
const FALLBACK_OPENROUTER_MODEL = "mistralai/mistral-7b-instruct:free"

// ---------------------------------------------------------------------------
// Free-tier daily AI analysis limit
// Free users (no active Pro subscription) are limited to FREE_DAILY_AI_LIMIT
// AI analyses per day per anonymous session_id.  This is enforced server-side
// to prevent client-side bypasses.
// ---------------------------------------------------------------------------
const FREE_DAILY_AI_LIMIT = 5

async function checkAndRecordAiUsage(sessionId: string): Promise<{ allowed: boolean; remaining: number }> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
  if (!supabaseUrl || !supabaseServiceKey || !sessionId || sessionId === "unknown") {
    // If we can't check (missing secrets or no session), allow the call.
    // Log missing secrets as a warning so operators are alerted.
    if (!supabaseUrl || !supabaseServiceKey) {
      console.warn("rate-limit: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set — limit check skipped")
    }
    return { allowed: true, remaining: FREE_DAILY_AI_LIMIT }
  }

  const db = createClient(supabaseUrl, supabaseServiceKey)

  // Count today's successful AI analyses for this session_id.
  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)

  const { count, error } = await db
    .from("scan_events")
    .select("id", { count: "exact", head: true })
    .eq("session_id", sessionId)
    .eq("analysis_source", "ai")
    .gte("created_at", today.toISOString())

  if (error) {
    // On DB error, fail open to avoid breaking the UX.
    console.warn("rate-limit check error:", error.message)
    return { allowed: true, remaining: FREE_DAILY_AI_LIMIT }
  }

  const usedToday = count ?? 0
  const remaining = Math.max(0, FREE_DAILY_AI_LIMIT - usedToday)
  return { allowed: usedToday < FREE_DAILY_AI_LIMIT, remaining }
}

// ---------------------------------------------------------------------------
// OpenAI Vision OCR
// Uses the same OPENAI_API_KEY as analysis. Accepts a base64-encoded JPEG and
// returns the raw ingredients text extracted from the product label image.
// Not rate-limited — the subsequent analyzeIngredients call is.
// ---------------------------------------------------------------------------

// System prompt for the Vision OCR call.
// Step 1 – find the ingredients section by its heading and return only those names.
// Step 2 – if no clear heading is present, return all visible label text so the
//          client-side parser can still attempt ingredient extraction.
const OCR_SYSTEM_PROMPT =
  "You are a product label OCR assistant. " +
  "Step 1: look for the ingredients / components section on the label. " +
  "It may be headed by keywords such as 'INGREDIENTS', 'INCI', 'Ingrédients', 'Zutaten', " +
  "'成分', '配料', '原料', '成份', '组成', '配方', or any equivalent term in any language. " +
  "If you find that section, output ONLY the ingredient names exactly as printed, " +
  "preserving all original separators (commas, slashes, semicolons, asterisks, etc.) — " +
  "no headers, no explanations, no extra formatting. " +
  "Step 2: if you cannot identify a clearly labelled ingredients section " +
  "(e.g. because the heading is cropped, absent, or ambiguous), output ALL the text " +
  "that is visible on the label exactly as printed, preserving line breaks as spaces. " +
  "Never output an empty response — always return whatever text is legible on the label."

// Sentinel returned when the OpenAI API key is not configured in Supabase secrets.
// Distinguishes "engine not available" from "model returned no text".
const OCR_NO_API_KEY = "__NO_API_KEY__"

async function extractTextFromImage(imageBase64: string): Promise<string | null> {
  const apiKey = Deno.env.get("OPENAI_API_KEY")
  const model = Deno.env.get("OPENAI_MODEL") || FALLBACK_OPENAI_MODEL
  if (!apiKey) return OCR_NO_API_KEY

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{
        role: "user",
        content: [
          {
            type: "text",
            text: OCR_SYSTEM_PROMPT,
          },
          {
            type: "image_url",
            image_url: {
              url: `data:image/jpeg;base64,${imageBase64}`,
              detail: "high",
            },
          },
        ],
      }],
      max_tokens: 2048,
      temperature: 0.1,
    }),
  })

  if (!response.ok) {
    const errText = await response.text()
    console.error(`OpenAI Vision API error ${response.status}:`, errText)
    throw new Error(`OpenAI Vision API error ${response.status}: ${errText}`)
  }

  const json = await response.json()
  const text = json?.choices?.[0]?.message?.content?.trim() || null
  if (!text) {
    console.warn("Vision OCR: model returned empty content; finish_reason:", json?.choices?.[0]?.finish_reason)
  }
  return text
}

// ---------------------------------------------------------------------------
// Gemini Vision OCR fallback
// Used when OPENAI_API_KEY is absent. Accepts a base64-encoded JPEG.
// ---------------------------------------------------------------------------

async function extractTextFromImageGemini(imageBase64: string): Promise<string | null> {
  const apiKey = Deno.env.get("GEMINI_API_KEY")
  const model = Deno.env.get("GEMINI_MODEL") || FALLBACK_GEMINI_MODEL
  if (!apiKey) return null

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: OCR_SYSTEM_PROMPT },
            { inline_data: { mime_type: "image/jpeg", data: imageBase64 } },
          ],
        }],
        generationConfig: { maxOutputTokens: 2048, temperature: 0.1 },
      }),
    },
  )

  if (!response.ok) {
    const errText = await response.text()
    console.error(`Gemini Vision API error ${response.status}:`, errText)
    throw new Error(`Gemini Vision API error ${response.status}: ${errText}`)
  }

  const json = await response.json()
  return json?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || null
}

// ---------------------------------------------------------------------------
// OpenAI AI analysis
// Set the OPENAI_API_KEY Supabase secret to enable AI-powered analysis:
//   supabase secrets set OPENAI_API_KEY=sk-...
// When the secret is absent the function returns empty analysis and the
// frontend's open-data fallback chain (Open Food Facts, Open Beauty Facts,
// Wikidata) handles lookup for any ingredient.
// ---------------------------------------------------------------------------

async function analyzeWithOpenAI(
  ingredients: string[],
  targetLanguage: string,
): Promise<string | null> {
  const apiKey = Deno.env.get("OPENAI_API_KEY")
  const model = Deno.env.get("OPENAI_MODEL") || FALLBACK_OPENAI_MODEL
  if (!apiKey) return null

  const ingredientList = ingredients.join(", ")
  const prompt =
    `You are an expert ingredient analyst for food and skincare products. ` +
    `Analyze each of the following ingredients and provide a concise description ` +
    `covering its purpose, category (Food / Skincare / General), and any notable ` +
    `safety or health considerations. ` +
    `Include one reliable source reference per ingredient. ` +
    `IMPORTANT: For each ingredient, respond in the same language in which the ingredient name is written. ` +
    `For example, if the ingredient is written in Chinese (e.g. "芦荟"), respond in Chinese for that ingredient. ` +
    `If the ingredient is written in English or another Latin-script language, respond in that language. ` +
    `Do not translate ingredient names — use the exact name as given. ` +
    `Format your answer as a plain list, one ingredient per line, like:\n` +
    `<ingredient name>: [<Category>] <description> | Source: <source>\n\n` +
    `Ingredients: ${ingredientList}`

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      max_tokens: 4096,
      temperature: 0.3,
    }),
  })

  if (!response.ok) {
    const errText = await response.text()
    throw new Error(`OpenAI API error ${response.status}: ${errText}`)
  }

  const json = await response.json()
  const content: string | undefined = json?.choices?.[0]?.message?.content
  if (!content) return null

  const ensureSourceAttribution = (line: string) =>
    /source\s*:/i.test(line) ? line : `${line} | Source: AI model synthesis`

  const normalizedLines = content
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => ensureSourceAttribution(line))

  return normalizedLines.join("\n")
}

// ---------------------------------------------------------------------------
// Gemini AI analysis (Google)
// Set GEMINI_API_KEY and optionally GEMINI_MODEL in Supabase secrets.
// ---------------------------------------------------------------------------

async function analyzeWithGemini(
  ingredients: string[],
  _targetLanguage: string,
): Promise<string | null> {
  const apiKey = Deno.env.get("GEMINI_API_KEY")
  const model = Deno.env.get("GEMINI_MODEL") || FALLBACK_GEMINI_MODEL
  if (!apiKey) return null

  const ingredientList = ingredients.join(", ")
  const prompt =
    `You are an expert ingredient analyst for food and skincare products. ` +
    `Analyze each of the following ingredients and provide a concise description ` +
    `covering its purpose, category (Food / Skincare / General), and any notable ` +
    `safety or health considerations. ` +
    `Include one reliable source reference per ingredient. ` +
    `IMPORTANT: For each ingredient, respond in the same language in which the ingredient name is written. ` +
    `Do not translate ingredient names — use the exact name as given. ` +
    `Format your answer as a plain list, one ingredient per line, like:\n` +
    `<ingredient name>: [<Category>] <description> | Source: <source>\n\n` +
    `Ingredients: ${ingredientList}`

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 4096, temperature: 0.3 },
      }),
    },
  )

  if (!response.ok) {
    const errText = await response.text()
    throw new Error(`Gemini API error ${response.status}: ${errText}`)
  }

  const json = await response.json()
  const content: string | undefined =
    json?.candidates?.[0]?.content?.parts?.[0]?.text
  if (!content) return null

  const ensureSourceAttribution = (line: string) =>
    /source\s*:/i.test(line) ? line : `${line} | Source: AI model synthesis`

  return content
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => ensureSourceAttribution(line))
    .join("\n")
}

// ---------------------------------------------------------------------------
// OpenAI-compatible analysis helper (used for Groq and OpenRouter)
// ---------------------------------------------------------------------------

async function analyzeWithOpenAICompat(
  ingredients: string[],
  _targetLanguage: string,
  baseUrl: string,
  apiKey: string,
  model: string,
  providerName: string,
): Promise<string | null> {
  const ingredientList = ingredients.join(", ")
  const prompt =
    `You are an expert ingredient analyst for food and skincare products. ` +
    `Analyze each of the following ingredients and provide a concise description ` +
    `covering its purpose, category (Food / Skincare / General), and any notable ` +
    `safety or health considerations. ` +
    `Include one reliable source reference per ingredient. ` +
    `IMPORTANT: For each ingredient, respond in the same language in which the ingredient name is written. ` +
    `Do not translate ingredient names — use the exact name as given. ` +
    `Format your answer as a plain list, one ingredient per line, like:\n` +
    `<ingredient name>: [<Category>] <description> | Source: <source>\n\n` +
    `Ingredients: ${ingredientList}`

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      max_tokens: 4096,
      temperature: 0.3,
    }),
  })

  if (!response.ok) {
    const errText = await response.text()
    throw new Error(`${providerName} API error ${response.status}: ${errText}`)
  }

  const json = await response.json()
  const content: string | undefined = json?.choices?.[0]?.message?.content
  if (!content) return null

  const ensureSourceAttribution = (line: string) =>
    /source\s*:/i.test(line) ? line : `${line} | Source: AI model synthesis`

  return content
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => ensureSourceAttribution(line))
    .join("\n")
}

// ---------------------------------------------------------------------------
// Groq analysis (OpenAI-compatible, fast free tier)
// Set GROQ_API_KEY and optionally GROQ_MODEL in Supabase secrets.
// ---------------------------------------------------------------------------

async function analyzeWithGroq(
  ingredients: string[],
  targetLanguage: string,
): Promise<string | null> {
  const apiKey = Deno.env.get("GROQ_API_KEY")
  const model = Deno.env.get("GROQ_MODEL") || FALLBACK_GROQ_MODEL
  if (!apiKey) return null
  return analyzeWithOpenAICompat(
    ingredients,
    targetLanguage,
    "https://api.groq.com/openai/v1",
    apiKey,
    model,
    "Groq",
  )
}

// ---------------------------------------------------------------------------
// OpenRouter analysis (aggregator, free models available)
// Set OPENROUTER_API_KEY and optionally OPENROUTER_MODEL in Supabase secrets.
// ---------------------------------------------------------------------------

async function analyzeWithOpenRouter(
  ingredients: string[],
  targetLanguage: string,
): Promise<string | null> {
  const apiKey = Deno.env.get("OPENROUTER_API_KEY")
  const model = Deno.env.get("OPENROUTER_MODEL") || FALLBACK_OPENROUTER_MODEL
  if (!apiKey) return null
  return analyzeWithOpenAICompat(
    ingredients,
    targetLanguage,
    "https://openrouter.ai/api/v1",
    apiKey,
    model,
    "OpenRouter",
  )
}

const languageContent = {
  en: {
    title: "Ingredient Analysis",
    aiLanguage: "English",
    unknown: "No exact local-db hit in sourced references.",
    categories: {
      skincare: "Skincare",
      food: "Food",
      general: "General"
    }
  },
  fr: {
    title: "Analyse des ingrédients",
    aiLanguage: "French",
    unknown: "Aucune correspondance exacte dans les références sourcées.",
    categories: {
      skincare: "Soin de la peau",
      food: "Alimentaire",
      general: "Général"
    }
  },
  de: {
    title: "Inhaltsstoffanalyse",
    aiLanguage: "German",
    unknown: "Kein exakter Treffer in den quellenbasierten Referenzen.",
    categories: {
      skincare: "Hautpflege",
      food: "Lebensmittel",
      general: "Allgemein"
    }
  },
  zh: {
    title: "成分分析",
    aiLanguage: "Chinese",
    unknown: "在已标注来源的参考数据中未命中精确条目。",
    categories: {
      skincare: "护肤",
      food: "食品",
      general: "通用"
    }
  }
}

function normalizeLanguage(lang) {
  if (!lang) return 'en'
  if (lang.startsWith('fr')) return 'fr'
  if (lang.startsWith('de')) return 'de'
  if (lang.startsWith('zh')) return 'zh'
  return 'en'
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const { ingredients, lang, targetLanguage, sessionId, action, imageBase64 } = body

    // ---------------------------------------------------------------------------
    // AI Vision OCR: extract ingredient text from a product label image.
    // Not rate-limited — the subsequent analyzeIngredients call is.
    // ---------------------------------------------------------------------------
    if (action === "ocrImage") {
      if (!imageBase64) {
        return new Response(
          JSON.stringify({ extractedText: null }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
        )
      }
      try {
        let extractedText = await extractTextFromImage(imageBase64)
        // If OpenAI key absent, try Gemini Vision as fallback.
        if (extractedText === OCR_NO_API_KEY) {
          console.log("Vision OCR: OpenAI key absent, trying Gemini Vision...")
          try {
            extractedText = await extractTextFromImageGemini(imageBase64)
          } catch (geminiErr) {
            console.warn("Gemini Vision OCR error:", geminiErr)
            extractedText = null
          }
          if (!extractedText) {
            console.warn("Vision OCR: all providers unavailable")
            return new Response(
              JSON.stringify({ extractedText: null, ocrUnavailable: true }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
            )
          }
        }
        console.log("Vision OCR extracted text length:", extractedText?.length ?? 0)
        return new Response(
          JSON.stringify({ extractedText: extractedText || null }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
        )
      } catch (visionErr) {
        console.warn('Vision OCR error:', visionErr)
        return new Response(
          JSON.stringify({ extractedText: null }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
        )
      }
    }

    const normalizedLanguage = normalizeLanguage(lang)
    const languagePack = languageContent[normalizedLanguage] || languageContent.en
    const aiLanguage = targetLanguage || languagePack.aiLanguage || 'English'

    console.log('Request:', { ingredients, lang, targetLanguage, sessionId })

    const inputIngredients: string[] = Array.isArray(ingredients)
      ? ingredients.map((i) => String(i || '').trim()).filter(Boolean)
      : []

    if (!inputIngredients.length) {
      return new Response(
        JSON.stringify({ analysis: '' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
      )
    }

    // 1. Enforce daily free-tier AI limit (server-side, per session_id).
    //    Pro subscribers bypass this check — they are identified by having an
    //    active subscription in the DB (future: pass a verified token instead).
    //    For now, every session is subject to the free limit; upgrading to Pro
    //    is handled by the frontend redirecting to checkout.
    const { allowed, remaining } = await checkAndRecordAiUsage(sessionId || "unknown")
    if (!allowed) {
      console.log(`Daily AI limit reached for session: ${sessionId}`)
      return new Response(
        JSON.stringify({ analysis: '', limitReached: true, remaining: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
      )
    }

    // 2. Try AI analysis — provider fallback chain:
    //    OpenAI → Gemini → Groq → OpenRouter
    const providers: Array<{ name: string; fn: () => Promise<string | null> }> = [
      { name: "OpenAI",      fn: () => analyzeWithOpenAI(inputIngredients, aiLanguage) },
      { name: "Gemini",      fn: () => analyzeWithGemini(inputIngredients, aiLanguage) },
      { name: "Groq",        fn: () => analyzeWithGroq(inputIngredients, aiLanguage) },
      { name: "OpenRouter",  fn: () => analyzeWithOpenRouter(inputIngredients, aiLanguage) },
    ]

    for (const provider of providers) {
      try {
        const aiAnalysis = await provider.fn()
        if (aiAnalysis) {
          console.log(`Using ${provider.name} analysis`)
          return new Response(
            JSON.stringify({
              analysis: `${languagePack.title}:\n${aiAnalysis}`,
              remaining: Math.max(0, remaining - 1),
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
          )
        }
        console.log(`${provider.name}: key not configured, skipping`)
      } catch (err) {
        console.warn(`${provider.name} analysis failed:`, err)
      }
    }

    // 3. No AI provider configured — return empty analysis so the frontend falls through
    // to its own rich open-data fallback chain (Open Food Facts, Open Beauty Facts,
    // Wikidata) which can resolve virtually any ingredient.
    console.log("No AI provider key configured; deferring to frontend open-data fallback.")
    return new Response(
      JSON.stringify({ analysis: '', remaining }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    console.error(error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
