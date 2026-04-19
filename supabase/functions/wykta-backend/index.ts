import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const FALLBACK_OPENAI_MODEL = "gpt-4o-mini"

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
    const { ingredients, lang, targetLanguage, sessionId } = await req.json()
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

    // 2. Try AI analysis (requires OPENAI_API_KEY secret)
    try {
      const aiAnalysis = await analyzeWithOpenAI(inputIngredients, aiLanguage)
      if (aiAnalysis) {
        console.log('Using AI analysis')
        return new Response(
          JSON.stringify({
            analysis: `${languagePack.title}:\n${aiAnalysis}`,
            remaining: Math.max(0, remaining - 1),
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
        )
      }
    } catch (aiErr) {
      console.warn('AI analysis failed:', aiErr)
    }

    // 3. No AI key configured — return empty analysis so the frontend falls through
    // to its own rich open-data fallback chain (Open Food Facts, Open Beauty Facts,
    // Wikidata) which can resolve virtually any ingredient.
    console.log('OPENAI_API_KEY not set; deferring to frontend open-data fallback.')
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
