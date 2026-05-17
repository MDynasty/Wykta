import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SAFE_INGREDIENTS = new Set([
  'water', 'sugar', 'salt', 'wheat', 'wheat flour', 'rice', 'corn', 'oat', 'barley',
  'potato', 'tomato', 'onion', 'garlic', 'pepper', 'paprika', 'cinnamon', 'ginger',
  'turmeric', 'vanilla', 'vanilla extract', 'cocoa', 'coffee', 'tea', 'vinegar',
  'citric acid', 'lemon juice', 'lime juice', 'sodium benzoate', 'potassium sorbate',
  'ascorbic acid', 'vitamin c', 'vitamin e', 'milk', 'milk powder', 'whey', 'casein',
  'egg', 'eggs', 'palm oil', 'olive oil', 'canola oil', 'sunflower oil', 'soybean oil',
  'coconut oil', 'peanut oil', 'sesame oil', 'butter', 'ghee', 'yeast', 'baking soda',
  'baking powder', 'xanthan gum', 'guar gum', 'pectin', 'lecithin', 'soy lecithin',
  'monosodium glutamate', 'msg', 'stevia', 'monk fruit', 'honey'
])

const WARNING_INGREDIENTS = {
  'high fructose corn syrup': 'Associated with metabolic issues when consumed frequently.',
  'trans fat': 'Can increase cardiovascular risk.',
  'red 40': 'May affect sensitive children.',
  'yellow 5': 'Can trigger allergies in sensitive individuals.',
  'sulfites': 'May trigger asthma-like reactions in sensitive people.',
  'fragrance': 'May irritate sensitive skin.',
  'sodium lauryl sulfate': 'Can be irritating or drying for sensitive skin.',
  'retinol': 'Powerful active ingredient; may irritate sensitive skin.'
}

const ALIASES = {
  // French
  'eau': 'water',
  'sucre': 'sugar',
  'sel': 'salt',
  'farine de ble': 'wheat flour',
  'ble': 'wheat',
  'huile de palme': 'palm oil',
  'huile d olive': 'olive oil',
  'huile de colza': 'canola oil',
  'huile de tournesol': 'sunflower oil',
  'lait': 'milk',
  'lait en poudre': 'milk powder',
  'oeuf': 'egg',
  'oeufs': 'eggs',
  'arome vanille': 'vanilla extract',
  'acide citrique': 'citric acid',
  'sirop de glucose fructose': 'high fructose corn syrup',
  'gras trans': 'trans fat',
  // German
  'wasser': 'water',
  'zucker': 'sugar',
  'salz': 'salt',
  'weizen': 'wheat',
  'weizenmehl': 'wheat flour',
  'palmol': 'palm oil',
  'olivenol': 'olive oil',
  'rapsol': 'canola oil',
  'sonnenblumenol': 'sunflower oil',
  'milch': 'milk',
  'milchpulver': 'milk powder',
  'ei': 'egg',
  'eier': 'eggs',
  'vanilleextrakt': 'vanilla extract',
  'zitronensaure': 'citric acid',
  'fruktosesirup': 'high fructose corn syrup',
  'transfett': 'trans fat',
  // Chinese
  '水': 'water',
  '糖': 'sugar',
  '盐': 'salt',
  '小麦': 'wheat',
  '小麦粉': 'wheat flour',
  '棕榈油': 'palm oil',
  '橄榄油': 'olive oil',
  '菜籽油': 'canola oil',
  '葵花籽油': 'sunflower oil',
  '牛奶': 'milk',
  '奶粉': 'milk powder',
  '鸡蛋': 'eggs',
  '香草提取物': 'vanilla extract',
  '柠檬酸': 'citric acid',
  '高果糖玉米糖浆': 'high fructose corn syrup',
  '反式脂肪': 'trans fat',
  // English variants
  'hfcs': 'high fructose corn syrup',
  'trans fats': 'trans fat',
  'artificial sweetener': 'artificial sweeteners',
  // Skincare multilingual variants
  'glycerine': 'glycerin',
  'glycerol': 'glycerin',
  'vitamin b3': 'niacinamide',
  'acide hyaluronique': 'hyaluronic acid',
  'hyaluronsaure': 'hyaluronic acid',
  'hyaluronate de sodium': 'sodium hyaluronate',
  'natriumhyaluronat': 'sodium hyaluronate',
  'provitamin b5': 'panthenol',
  'beurre de karite': 'shea butter',
  'huile d argan': 'argan oil',
  'huile de jojoba': 'jojoba oil',
  'parfum fragrance': 'fragrance',
  '甘油': 'glycerin',
  '烟酰胺': 'niacinamide',
  '透明质酸': 'hyaluronic acid',
  '透明质酸钠': 'sodium hyaluronate',
  '泛醇': 'panthenol',
  '尿囊素': 'allantoin',
  '二甲基硅油': 'dimethicone',
  '矿油': 'mineral oil',
  '苯氧乙醇': 'phenoxyethanol',
  '香精': 'fragrance',
  '香料': 'fragrance',
  '视黄醇': 'retinol',
  '水杨酸': 'salicylic acid',
  '乳酸': 'lactic acid',
  '氧化锌': 'zinc oxide'
}

[
  'glycerin', 'niacinamide', 'hyaluronic acid', 'sodium hyaluronate', 'panthenol',
  'allantoin', 'ceramide np', 'ceramide ap', 'ceramide eop', 'cholesterol',
  'dimethicone', 'cyclopentasiloxane', 'petrolatum', 'mineral oil', 'paraffinum liquidum',
  'butylene glycol', 'propylene glycol', 'pentylene glycol', 'caprylyl glycol',
  'phenoxyethanol', 'ethylhexylglycerin', 'chlorphenesin', 'carbomer', 'disodium edta',
  'trisodium edta', 'cetearyl alcohol', 'cetyl alcohol', 'stearyl alcohol', 'behenyl alcohol',
  'cetearyl glucoside', 'glyceryl stearate', 'peg 100 stearate', 'squalane', 'squalene',
  'argan oil', 'jojoba oil', 'helianthus annuus seed oil', 'butyrospermum parkii butter',
  'shea butter', 'aloe barbadensis leaf juice', 'centella asiatica extract',
  'camellia sinensis leaf extract', 'chamomilla recutita flower extract', 'retinol',
  'retinyl palmitate', 'salicylic acid', 'lactic acid', 'mandelic acid', 'tocopherol',
  'tocopheryl acetate', 'ascorbyl glucoside', 'fragrance', 'parfum', 'limonene', 'linalool',
  'citral', 'geraniol', 'benzyl alcohol', 'sodium laureth sulfate', 'sodium lauryl sulfate',
  'cocamidopropyl betaine', 'zinc oxide', 'mica', 'iron oxides'
].forEach((item) => SAFE_INGREDIENTS.add(item))

const I18N = {
  en: {
    title: 'Ingredient Analysis',
    summary: (s, w, u) => `Summary: ${s} safe | ${w} warnings | ${u} unknown`,
    safeTitle: 'Safe ingredients:',
    warnTitle: 'Ingredients with warnings:',
    unknownTitle: (u) => `Unknown ingredients (${u}):`,
    interactionsTitle: 'Potential interactions:',
    none: 'No obvious interaction issues detected.'
  },
  fr: {
    title: 'Analyse des ingredients',
    summary: (s, w, u) => `Resume: ${s} surs | ${w} alertes | ${u} inconnus`,
    safeTitle: 'Ingredients surs :',
    warnTitle: 'Ingredients avec alertes :',
    unknownTitle: (u) => `Ingredients inconnus (${u}) :`,
    interactionsTitle: 'Interactions potentielles :',
    none: 'Aucune interaction evidente detectee.'
  },
  de: {
    title: 'Zutatenanalyse',
    summary: (s, w, u) => `Zusammenfassung: ${s} sicher | ${w} Warnungen | ${u} unbekannt`,
    safeTitle: 'Sichere Zutaten:',
    warnTitle: 'Zutaten mit Warnungen:',
    unknownTitle: (u) => `Unbekannte Zutaten (${u}):`,
    interactionsTitle: 'Mogliche Wechselwirkungen:',
    none: 'Keine offensichtlichen Wechselwirkungen erkannt.'
  },
  zh: {
    title: '成分分析',
    summary: (s, w, u) => `摘要：安全 ${s} | 警告 ${w} | 未知 ${u}`,
    safeTitle: '安全成分：',
    warnTitle: '警告成分：',
    unknownTitle: (u) => `未知成分（${u}）：`,
    interactionsTitle: '潜在相互作用：',
    none: '未发现明显的相互作用问题。'
  }
}

function localeKey(lang = 'en') {
  if (lang.startsWith('fr')) return 'fr'
  if (lang.startsWith('de')) return 'de'
  if (lang.startsWith('zh')) return 'zh'
  return 'en'
}

function normalize(text = '') {
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[()\[\]{}]/g, ' ')
    .replace(/[^\p{L}\p{N}\s\-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function canonicalizeIngredient(raw) {
  const n = normalize(raw)
  if (!n) return ''

  if (ALIASES[n]) return ALIASES[n]
  if (SAFE_INGREDIENTS.has(n) || WARNING_INGREDIENTS[n]) return n

  for (const [alias, canonical] of Object.entries(ALIASES)) {
    if (n.includes(alias) || alias.includes(n)) return canonical
  }

  for (const safe of SAFE_INGREDIENTS) {
    if (n.includes(safe) || safe.includes(n)) return safe
  }

  for (const warn of Object.keys(WARNING_INGREDIENTS)) {
    if (n.includes(warn) || warn.includes(n)) return warn
  }

  return n
}

function detectInteractions(set) {
  const warnings = []
  if (set.has('sugar') && set.has('artificial sweeteners')) {
    warnings.push('Sugar + artificial sweeteners may cause digestive discomfort in sensitive people.')
  }
  if (set.has('caffeine') && set.has('alcohol')) {
    warnings.push('Caffeine + alcohol may increase dehydration and heart-rate strain.')
  }
  if (set.has('high fructose corn syrup') && set.has('trans fat')) {
    warnings.push('High fructose corn syrup + trans fat may increase cardiovascular risk.')
  }
  return warnings
}

function asIngredientArray(ingredients) {
  if (Array.isArray(ingredients)) return ingredients
  if (typeof ingredients === 'string') {
    return ingredients
      .replace(/\b(?:ingredients?|contains|with|and|et|avec|und|mit)\b/giu, ', ')
      .replace(/(?:配料|成分|含有|以及|和)/gu, ', ')
      .split(/[,.;•\n，；、]/)
      .map((x) => x.trim())
      .filter(Boolean)
  }
  return []
}

function buildAnalysis(rawIngredients, lang) {
  const loc = I18N[localeKey(lang)]

  const canonical = rawIngredients
    .map(canonicalizeIngredient)
    .filter(Boolean)

  const unique = [...new Set(canonical)]
  const safe = []
  const warn = []
  const unknown = []

  for (const item of unique) {
    if (WARNING_INGREDIENTS[item]) {
      warn.push(item)
      continue
    }
    if (SAFE_INGREDIENTS.has(item)) {
      safe.push(item)
      continue
    }
    unknown.push(item)
  }

  const interactionWarnings = detectInteractions(new Set(unique))

  const lines = []
  lines.push(`${loc.title}`)
  lines.push(loc.summary(safe.length, warn.length, unknown.length))

  if (safe.length) {
    lines.push('')
    lines.push(loc.safeTitle)
    safe.slice(0, 20).forEach((item) => lines.push(`- ${item}`))
  }

  if (warn.length) {
    lines.push('')
    lines.push(loc.warnTitle)
    warn.forEach((item) => lines.push(`- ${item}: ${WARNING_INGREDIENTS[item]}`))
  }

  if (unknown.length) {
    lines.push('')
    lines.push(loc.unknownTitle(unknown.length))
    unknown.slice(0, 10).forEach((item) => lines.push(`- ${item}`))
  }

  lines.push('')
  lines.push(loc.interactionsTitle)
  if (interactionWarnings.length) {
    interactionWarnings.forEach((w) => lines.push(`- ${w}`))
  } else {
    lines.push(`- ${loc.none}`)
  }

  return lines.join('\n')
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { ingredients, lang = 'en', targetLanguage, promptLanguage } = await req.json()

    console.log('Request:', { ingredients, lang, targetLanguage, promptLanguage })

    const list = asIngredientArray(ingredients)
    const analysis = buildAnalysis(list, lang)

    return new Response(
      JSON.stringify({ analysis }),
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