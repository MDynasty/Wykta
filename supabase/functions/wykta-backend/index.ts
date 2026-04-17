import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const FALLBACK_OPENAI_MODEL = "gpt-4o-mini"

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
    `Respond in ${targetLanguage}. ` +
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
      max_tokens: 1024,
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
    const { ingredients, lang, targetLanguage } = await req.json()
    const normalizedLanguage = normalizeLanguage(lang)
    const languagePack = languageContent[normalizedLanguage] || languageContent.en
    const aiLanguage = targetLanguage || languagePack.aiLanguage || 'English'

    console.log('Request:', { ingredients, lang, targetLanguage })

    const inputIngredients: string[] = Array.isArray(ingredients)
      ? ingredients.map((i) => String(i || '').trim()).filter(Boolean)
      : []

    if (!inputIngredients.length) {
      return new Response(
        JSON.stringify({ analysis: '' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
      )
    }

    // 1. Try AI analysis (requires OPENAI_API_KEY secret)
    try {
      const aiAnalysis = await analyzeWithOpenAI(inputIngredients, aiLanguage)
      if (aiAnalysis) {
        console.log('Using AI analysis')
        return new Response(
          JSON.stringify({ analysis: `${languagePack.title}:\n${aiAnalysis}` }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
        )
      }
    } catch (aiErr) {
      console.warn('AI analysis failed:', aiErr)
    }

    // 2. No AI key configured — return empty analysis so the frontend falls through
    // to its own rich open-data fallback chain (Open Food Facts, Open Beauty Facts,
    // Wikidata) which can resolve virtually any ingredient.
    console.log('OPENAI_API_KEY not set; deferring to frontend open-data fallback.')
    return new Response(
      JSON.stringify({ analysis: '' }),
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
