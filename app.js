console.log("Wykta app started")

function trackEvent(category, action, label) {
  try {
    if (window.gtag) window.gtag('event', action, { event_category: category, event_label: label })
    if (window.dataLayer) window.dataLayer.push({ event: 'wykta_event', event_category: category, event_action: action, event_label: label })
  } catch(e) {}
}

/* -----------------------
SUPABASE CONNECTION
----------------------- */

const hasSupabaseConfig =
  typeof supabaseUrl !== "undefined" &&
  typeof supabaseKey !== "undefined" &&
  supabaseKey.trim().length > 0

const createClient =
  typeof supabase !== "undefined" && typeof supabase.createClient === "function"
    ? supabase.createClient
    : null

const supabaseClient = hasSupabaseConfig && createClient
  ? createClient(supabaseUrl, supabaseKey)
  : null

if (supabaseClient) {
  console.log("Supabase connected")
} else {
  if (!createClient) {
    console.warn("Supabase SDK failed to load. Falling back to open-data analysis.")
  } else {
    console.warn("Supabase client is not configured. Create config.js from config.example.js to enable AI and saving.")
  }
}

const knownIngredients = [
  "water", "aqua", "glycerin", "niacinamide", "hyaluronic acid", "sodium hyaluronate",
  "retinol", "glycolic acid", "salicylic acid", "benzoyl peroxide", "vitamin c",
  "ascorbic acid", "ceramide", "panthenol", "shea butter", "cetearyl alcohol",
  "fragrance", "parfum", "phenoxyethanol", "tocopherol", "zinc oxide", "titanium dioxide",
  "petrolatum", "mineral oil", "dimethicone", "aloe vera", "green tea extract",
  "rice", "wheat", "milk", "egg", "soy", "peanut", "tree nuts", "almond", "cashew",
  "hazelnut", "fish", "shellfish", "shrimp", "sesame", "salt", "sugar", "palm oil",
  "coconut oil", "olive oil", "citric acid", "sodium benzoate", "potassium sorbate",
  "monosodium glutamate", "msg", "artificial flavor"
]

const ingredientAliases = {
  "水": "water",
  "纯净水": "water",
  "矿泉水": "water",
  "甘油": "glycerin",
  "丙三醇": "glycerin",
  "丙二醇": "propylene glycol",
  "丁二醇": "butylene glycol",
  "烟酰胺": "niacinamide",
  "透明质酸": "hyaluronic acid",
  "透明质酸钠": "sodium hyaluronate",
  "玻尿酸": "hyaluronic acid",
  "库拉索芦荟": "aloe vera",
  "芦荟": "aloe vera",
  "视黄醇": "retinol",
  "乙醇酸": "glycolic acid",
  "水杨酸": "salicylic acid",
  "神经酰胺": "ceramide",
  "泛醇": "panthenol",
  "过氧化苯甲酰": "benzoyl peroxide",
  "香精": "fragrance",
  "香料": "fragrance",
  "苯氧乙醇": "phenoxyethanol",
  "抗坏血酸": "ascorbic acid",
  "维生素c": "vitamin c",
  "柠檬酸": "citric acid",
  "苯甲酸钠": "sodium benzoate",
  "山梨酸钾": "potassium sorbate",
  "味精": "monosodium glutamate",
  "食盐": "salt",
  "盐": "salt",
  "白砂糖": "sugar",
  "糖": "sugar",
  "小麦": "wheat",
  "牛奶": "milk",
  "鸡蛋": "egg",
  "大豆": "soy",
  "花生": "peanut",
  "芝麻": "sesame",
  "鱼": "fish",
  "虾": "shrimp",
  "酵母提取物": "yeast extract",
  "棕榈油": "palm oil",
  "椰子油": "coconut oil",
  "橄榄油": "olive oil",
  "向日葵籽油": "sunflower oil",
  "小苏打": "sodium bicarbonate",
  "食用香精": "artificial flavor",
  "eau": "water",
  "eau purifiée": "water",
  "agua": "water",
  "acqua": "water",
  "glycérine": "glycerin",
  "beurre de karité": "shea butter",
  "parfum (fragrance)": "fragrance",
  "acide ascorbique": "ascorbic acid",
  "acide hyaluronique": "hyaluronic acid",
  "acide glycolique": "glycolic acid",
  "acide salicylique": "salicylic acid",
  "rétinol": "retinol",
  "acide citrique": "citric acid",
  "wasser": "water",
  "sheabutter": "shea butter",
  "glyzerin": "glycerin",
  "hyaluronsäure": "hyaluronic acid",
  "glykolsäure": "glycolic acid",
  "salicylsäure": "salicylic acid",
  "niacinamid": "niacinamide",
  "aloe": "aloe vera",
  "aloe barbadensis leaf juice": "aloe vera",
  "aloe barbadensis": "aloe vera",
  "sonnenblumenöl": "sunflower oil",
  "zitronensäure": "citric acid",
  "duftstoff": "fragrance"
}

// 135 keeps high-contrast label text readable while reducing colorful package noise.
const OCR_BINARIZATION_THRESHOLD = 135
// Keep slightly lower than fetchJsonWithTimeout default (7000ms) so this fallback cannot block overall analysis.
const WIKIDATA_TIMEOUT_MS = 6500
// Split on Latin/CJK punctuation, quotes, brackets, operators, and OCR noise separators.
const ingredientSplitPunctuationPattern = /[,\.;:•·\n\r\t，；。、“”"''`´|/\\!！?？+＋&＆()（）\[\]【】]+/gu
const supportedLanguages = ["en", "fr", "de", "zh"]
const languageSignalLexicon = {
  en: ["ingredients", "water", "fragrance", "contains", "and"],
  fr: ["ingrédients", "eau", "parfum", "acide", "et"],
  de: ["inhaltsstoffe", "wasser", "duftstoff", "säure", "und"],
  zh: ["成分", "配料", "水", "香精", "以及"]
}
const LANGUAGE_SCORE_WEIGHTS = {
  chineseChar: 2,
  diacriticBonus: 5,
  longTokenMatch: 2,
  shortTokenMatch: 1,
  aliasMatch: 2,
  // Per-token script vote: each ingredient token that is predominantly one script
  // casts a vote of this weight.  Gives Latin-script tokens a fighting chance
  // against per-character Chinese scoring in mixed-language inputs
  // (e.g. "aqua, 芦荟, acid, retinol, peptide" → 4 Latin tokens vs 1 CJK token → English wins).
  tokenScript: 2
}
const ingredientAliasLanguageHints = Object.keys(ingredientAliases).reduce((acc, alias) => {
  if(/[\u4e00-\u9fa5]/.test(alias)) acc.zh.add(alias)
  else if(/[äöüß]/i.test(alias)) acc.de.add(alias)
  else if(/[àâçéèêëîïôûùüÿœæ]/i.test(alias)) acc.fr.add(alias)
  return acc
}, { fr: new Set(), de: new Set(), zh: new Set() })

/* -----------------------
INGREDIENT LOOKUP CACHE
5-minute TTL; keyed by "<function>|<ingredient>|<lang>"
to avoid redundant OFF / OBF / Wikidata network round-trips.
----------------------- */
const INGREDIENT_CACHE_TTL_MS = 5 * 60 * 1000
const ingredientLookupCache = new Map()

function getCachedLookup(key) {
  const entry = ingredientLookupCache.get(key)
  if (!entry) return undefined
  if (Date.now() - entry.timestamp > INGREDIENT_CACHE_TTL_MS) {
    ingredientLookupCache.delete(key)
    return undefined
  }
  return entry.value
}

function setCachedLookup(key, value) {
  ingredientLookupCache.set(key, { value, timestamp: Date.now() })
}

/* -----------------------
DATA-I18N DOM NODE CACHE
Populated once on DOMContentLoaded; avoids repeated querySelectorAll
on every language switch.
----------------------- */
let cachedI18nNodes = null
let cachedI18nPlaceholderNodes = null

/* -----------------------
LOCAL INGREDIENT DATABASE
Sources: CosIng (EU Cosmetic Ingredients Database), EU food-additive list,
         FDA GRAS list, Open Food Facts ingredient taxonomy,
         Open Beauty Facts ingredient taxonomy
----------------------- */

const localIngredientDb = {
  // ── Universal ──────────────────────────────────────────────────────────
  "water":                        { category: "general",  fn: "Solvent",                     note: "Universal solvent in food and cosmetics. Source: Open Food Facts taxonomy / CosIng." },
  "aqua":                         { category: "skincare", fn: "Solvent",                     note: "INCI term for water in cosmetics. Source: CosIng (EU)." },
  "glycerin":                     { category: "general",  fn: "Humectant",                   note: "Draws moisture to skin and improves texture in food. Source: CosIng (EU) / FDA GRAS." },
  "ascorbic acid":                { category: "general",  fn: "Antioxidant / Vitamin C",     note: "Preserves freshness in food (E300); brightens skin in cosmetics. Source: EU additive list / CosIng." },
  "citric acid":                  { category: "general",  fn: "Acidulant / Preservative",    note: "pH regulator and antioxidant (E330); also used in skincare. Source: EU additive list." },
  "tocopherol":                   { category: "general",  fn: "Antioxidant / Vitamin E",     note: "Prevents rancidity in food (E306-309); protects skin from oxidative damage. Source: EU additive list / CosIng." },
  "xanthan gum":                  { category: "general",  fn: "Thickener / Stabiliser",      note: "Natural polysaccharide (E415); used in food and cosmetics to improve texture. Source: EU additive list." },
  "lactic acid":                  { category: "general",  fn: "Acidulant / Exfoliant (AHA)", note: "Fermentation-derived acid; pH adjuster in food and gentle AHA exfoliant in skincare. Source: CosIng / EU additive list." },
  "sodium benzoate":              { category: "general",  fn: "Preservative",                note: "E211; inhibits mould and yeast in food; also used in some cosmetics. Source: EU additive list / CosIng." },
  "propylene glycol":             { category: "general",  fn: "Humectant / Solvent",         note: "E1520 in food; solvent and humectant in cosmetics; generally safe. Source: EU additive list / CosIng." },
  // ── Skincare ──────────────────────────────────────────────────────────
  "niacinamide":                  { category: "skincare", fn: "Skin conditioning",           note: "Vitamin B3; improves skin tone, pore appearance, and barrier function. Source: CosIng (EU)." },
  "hyaluronic acid":              { category: "skincare", fn: "Humectant",                   note: "Holds up to 1000× its weight in water; deep skin hydration. Source: CosIng (EU)." },
  "sodium hyaluronate":           { category: "skincare", fn: "Humectant",                   note: "Salt form of hyaluronic acid; penetrates more easily into skin. Source: CosIng (EU)." },
  "retinol":                      { category: "skincare", fn: "Skin conditioning",           note: "Vitamin A; promotes cell turnover and collagen synthesis. Source: CosIng (EU)." },
  "retinyl palmitate":            { category: "skincare", fn: "Skin conditioning",           note: "Ester form of vitamin A; gentler than retinol. Source: CosIng (EU)." },
  "glycolic acid":                { category: "skincare", fn: "Exfoliant (AHA)",             note: "Alpha hydroxy acid; removes dead skin cells and improves texture. Source: CosIng (EU)." },
  "salicylic acid":               { category: "skincare", fn: "Exfoliant (BHA)",             note: "Beta hydroxy acid; unclogs pores; suited to oily or acne-prone skin. Source: CosIng (EU)." },
  "mandelic acid":                { category: "skincare", fn: "Exfoliant (AHA)",             note: "Large-molecule AHA; gentle enough for sensitive skin. Source: CosIng (EU)." },
  "benzoyl peroxide":             { category: "skincare", fn: "Antimicrobial",               note: "Kills acne-causing bacteria; may bleach fabric. Use with caution. Source: CosIng (EU)." },
  "vitamin c":                    { category: "skincare", fn: "Antioxidant",                 note: "Brightens skin and boosts collagen synthesis. Source: CosIng (EU)." },
  "ceramide":                     { category: "skincare", fn: "Skin barrier lipid",          note: "Replenishes and strengthens the skin barrier. Source: CosIng (EU)." },
  "panthenol":                    { category: "skincare", fn: "Humectant / Emollient",       note: "Pro-vitamin B5; soothes, moisturises, and aids wound healing. Source: CosIng (EU)." },
  "shea butter":                  { category: "skincare", fn: "Emollient",                   note: "Rich in fatty acids; deeply nourishing and softening. Source: CosIng (EU)." },
  "cetearyl alcohol":             { category: "skincare", fn: "Emulsifier / Emollient",      note: "Fatty alcohol; thickens formulas and softens skin. Source: CosIng (EU)." },
  "fragrance":                    { category: "skincare", fn: "Fragrance",                   note: "May contain undisclosed allergens; caution for sensitive skin. Source: CosIng (EU)." },
  "parfum":                       { category: "skincare", fn: "Fragrance",                   note: "EU term for fragrance blend; potential sensitiser. Source: CosIng (EU)." },
  "phenoxyethanol":               { category: "skincare", fn: "Preservative",                note: "Broad-spectrum preservative; well tolerated at ≤1%. Source: CosIng (EU)." },
  "methylparaben":                { category: "skincare", fn: "Preservative",                note: "Paraben preservative; debated endocrine concerns at high doses. Source: CosIng (EU)." },
  "ethylparaben":                 { category: "skincare", fn: "Preservative",                note: "Paraben preservative; low concentration considered safe. Source: CosIng (EU)." },
  "butylparaben":                 { category: "skincare", fn: "Preservative",                note: "Paraben with higher lipophilicity; restricted in some regions. Source: CosIng (EU)." },
  "zinc oxide":                   { category: "skincare", fn: "UV filter / Mineral",         note: "Broad-spectrum physical sunscreen; also soothing on skin. Source: CosIng (EU)." },
  "titanium dioxide":             { category: "skincare", fn: "UV filter / Colourant",       note: "Physical sunscreen and whitening pigment. Source: CosIng (EU)." },
  "petrolatum":                   { category: "skincare", fn: "Occlusive",                   note: "Forms a barrier to seal in moisture; non-comedogenic. Source: CosIng (EU)." },
  "mineral oil":                  { category: "skincare", fn: "Emollient / Occlusive",       note: "Locks in moisture; highly refined cosmetic grades considered safe. Source: CosIng (EU)." },
  "dimethicone":                  { category: "skincare", fn: "Emollient / Silicone",        note: "Smooths skin texture and forms a protective layer. Source: CosIng (EU)." },
  "aloe vera":                    { category: "skincare", fn: "Soothing / Humectant",        note: "Anti-inflammatory; soothes irritation and provides moisture. Source: CosIng (EU)." },
  "green tea extract":            { category: "skincare", fn: "Antioxidant",                 note: "Rich in EGCG polyphenols; reduces oxidative stress on skin. Source: CosIng (EU)." },
  "kojic acid":                   { category: "skincare", fn: "Skin brightening",            note: "Inhibits melanin production; used for hyperpigmentation. Source: CosIng (EU)." },
  "azelaic acid":                 { category: "skincare", fn: "Keratolytic / Antimicrobial", note: "Targets acne and rosacea; evens skin tone. Source: CosIng (EU)." },
  "caffeine":                     { category: "skincare", fn: "Skin conditioning",           note: "Reduces puffiness and dark circles; antioxidant properties. Source: CosIng (EU)." },
  "squalane":                     { category: "skincare", fn: "Emollient",                   note: "Lightweight, non-comedogenic oil; excellent skin feel. Source: CosIng (EU)." },
  "jojoba oil":                   { category: "skincare", fn: "Emollient",                   note: "Liquid wax; closely mimics the skin's natural sebum. Source: CosIng (EU)." },
  "rosehip oil":                  { category: "skincare", fn: "Emollient",                   note: "Rich in vitamins A and C; supports skin renewal. Source: Open Beauty Facts taxonomy." },
  "argan oil":                    { category: "skincare", fn: "Emollient",                   note: "Vitamin E rich; nourishing and softening. Source: CosIng (EU)." },
  "sodium lauryl sulfate":        { category: "skincare", fn: "Surfactant / Cleansing",      note: "Foaming cleansing agent; can strip natural oils and irritate. Source: CosIng (EU)." },
  "sodium laureth sulfate":       { category: "skincare", fn: "Surfactant / Cleansing",      note: "Milder than SLS; common in shampoos and body washes. Source: CosIng (EU)." },
  "cocamidopropyl betaine":       { category: "skincare", fn: "Surfactant",                  note: "Mild amphoteric surfactant used in gentle cleansers. Source: CosIng (EU)." },
  "butylene glycol":              { category: "skincare", fn: "Humectant / Solvent",         note: "Draws moisture and aids penetration of other ingredients. Source: CosIng (EU)." },
  "carbomer":                     { category: "skincare", fn: "Viscosity agent",             note: "Thickens and stabilises gels; considered safe. Source: CosIng (EU)." },
  "allantoin":                    { category: "skincare", fn: "Soothing",                    note: "Promotes cell regeneration; calms irritation. Source: CosIng (EU)." },
  "urea":                         { category: "skincare", fn: "Humectant / Keratolytic",     note: "High concentration exfoliates; low concentration hydrates. Source: CosIng (EU)." },
  "alpha-arbutin":                { category: "skincare", fn: "Skin brightening",            note: "Inhibits tyrosinase; reduces dark spots safely. Source: CosIng (EU)." },
  "tranexamic acid":              { category: "skincare", fn: "Skin brightening",            note: "Reduces hyperpigmentation; effective alongside vitamin C. Source: CosIng (EU)." },
  "resveratrol":                  { category: "skincare", fn: "Antioxidant",                 note: "Polyphenol antioxidant; anti-ageing properties. Source: CosIng (EU)." },
  "centella asiatica":            { category: "skincare", fn: "Soothing / Healing",          note: "Supports collagen synthesis; calms stressed skin. Source: CosIng (EU)." },
  "bakuchiol":                    { category: "skincare", fn: "Skin conditioning",           note: "Plant-based retinol alternative; gentler on sensitive skin. Source: CosIng (EU)." },
  "adenosine":                    { category: "skincare", fn: "Anti-wrinkle",                note: "EU-approved anti-ageing ingredient; stimulates collagen. Source: CosIng (EU)." },
  "polyglutamic acid":            { category: "skincare", fn: "Humectant",                   note: "Up to 4× more moisturising than hyaluronic acid. Source: Open Beauty Facts taxonomy." },
  "ferulic acid":                 { category: "skincare", fn: "Antioxidant",                 note: "Boosts stability and efficacy of vitamins C and E. Source: CosIng (EU)." },
  "licorice root extract":        { category: "skincare", fn: "Skin brightening",            note: "Glabridin inhibits melanin synthesis; anti-inflammatory. Source: CosIng (EU)." },
  "bisabolol":                    { category: "skincare", fn: "Soothing / Anti-inflammatory", note: "Chamomile-derived ingredient; calms redness and promotes healing. Source: CosIng (EU)." },
  "tea tree oil":                 { category: "skincare", fn: "Antimicrobial",               note: "Potent natural antiseptic; effective against acne but can irritate. Source: CosIng (EU)." },
  "witch hazel":                  { category: "skincare", fn: "Astringent / Antioxidant",    note: "Tightens pores; can be drying in high-alcohol forms. Source: Open Beauty Facts taxonomy." },
  "neem oil":                     { category: "skincare", fn: "Antimicrobial",               note: "Antifungal and antibacterial; used for acne and eczema. Source: Open Beauty Facts taxonomy." },
  "collagen":                     { category: "skincare", fn: "Skin conditioning",           note: "Structural protein for elasticity; topical absorption limited. Source: CosIng (EU)." },
  "beta-glucan":                  { category: "skincare", fn: "Skin conditioning",           note: "Oat-derived; soothes irritation and stimulates collagen production. Source: CosIng (EU)." },
  "peptides":                     { category: "skincare", fn: "Skin conditioning",           note: "Signal peptides stimulate collagen and elastin production. Source: CosIng (EU)." },
  // ── Food ──────────────────────────────────────────────────────────────
  "sugar":                        { category: "food",     fn: "Sweetener",                   note: "Sucrose; high intake linked to obesity and dental caries. Source: FDA GRAS." },
  "salt":                         { category: "food",     fn: "Seasoning / Preservative",    note: "Sodium chloride; excess intake raises blood pressure. Source: FDA GRAS." },
  "wheat":                        { category: "food",     fn: "Grain",                       note: "Contains gluten; avoid if coeliac or gluten-sensitive. Top allergen (EU/US)." },
  "milk":                         { category: "food",     fn: "Dairy",                       note: "Common allergen (EU top 14 / US top 9); source of calcium." },
  "egg":                          { category: "food",     fn: "Binder / Emulsifier",         note: "Common allergen (EU top 14 / US top 9); provides structure in baking." },
  "soy":                          { category: "food",     fn: "Protein / Emulsifier",        note: "Common allergen; source of plant protein and isoflavones." },
  "peanut":                       { category: "food",     fn: "Legume",                      note: "Major allergen; can cause anaphylaxis. Strict avoidance required. Source: FDA." },
  "tree nuts":                    { category: "food",     fn: "Nut",                         note: "Allergen category (almonds, cashews, etc.); risk of cross-contamination. Source: FDA." },
  "fish":                         { category: "food",     fn: "Seafood",                     note: "Common allergen; source of omega-3 fatty acids. Source: EU allergen list." },
  "shellfish":                    { category: "food",     fn: "Seafood",                     note: "Allergen category (shrimp, crab, lobster). Source: EU/FDA allergen list." },
  "sesame":                       { category: "food",     fn: "Seed",                        note: "Major allergen in US (since 2023) and EU; also a source of healthy fats." },
  "palm oil":                     { category: "food",     fn: "Fat / Oil",                   note: "High in saturated fat; significant environmental concerns over deforestation." },
  "coconut oil":                  { category: "food",     fn: "Fat / Oil",                   note: "High in saturated fat; stable for high-heat cooking. Source: OFF taxonomy." },
  "olive oil":                    { category: "food",     fn: "Fat / Oil",                   note: "Rich in monounsaturated fats; heart-healthy (Mediterranean diet). Source: OFF taxonomy." },
  "sunflower oil":                { category: "food",     fn: "Fat / Oil",                   note: "High in vitamin E; good for high-heat cooking. Source: OFF taxonomy." },
  "canola oil":                   { category: "food",     fn: "Fat / Oil",                   note: "Low in saturated fat; high smoke point. Source: OFF taxonomy." },
  "potassium sorbate":            { category: "food",     fn: "Preservative",                note: "E202; extends shelf life in beverages and dairy. Source: EU additive list." },
  "monosodium glutamate":         { category: "food",     fn: "Flavour enhancer",            note: "MSG (E621); umami flavour; safe for the general population. Source: FDA GRAS." },
  "artificial flavor":            { category: "food",     fn: "Flavouring",                  note: "Synthetic flavour compounds; exact composition often undisclosed. Source: FDA." },
  "natural flavors":              { category: "food",     fn: "Flavouring",                  note: "Derived from natural sources; exact compounds often undisclosed. Source: FDA." },
  "high fructose corn syrup":     { category: "food",     fn: "Sweetener",                   note: "Liquid sweetener; linked to metabolic concerns at high intake. Source: FDA GRAS." },
  "maltodextrin":                 { category: "food",     fn: "Thickener / Filler",          note: "Derived from starch; rapidly digested and raises blood sugar. Source: FDA GRAS." },
  "guar gum":                     { category: "food",     fn: "Thickener",                   note: "E412; plant-based thickener; high fibre content. Source: EU additive list." },
  "carrageenan":                  { category: "food",     fn: "Thickener / Emulsifier",      note: "E407; seaweed extract; some evidence of gut inflammation at high doses. Source: EU additive list." },
  "lecithin":                     { category: "food",     fn: "Emulsifier",                  note: "E322; often from soy or sunflower; keeps oil and water blended. Source: EU additive list." },
  "mono- and diglycerides":       { category: "food",     fn: "Emulsifier",                  note: "E471; derived from fats; used in baked goods and margarines. Source: EU additive list." },
  "baking powder":                { category: "food",     fn: "Leavening agent",             note: "Mixture of sodium bicarbonate and acid; raises baked goods. Source: FDA GRAS." },
  "sodium bicarbonate":           { category: "food",     fn: "Leavening agent",             note: "Baking soda (E500); reacts with acid to produce CO₂. Source: EU additive list." },
  "cornstarch":                   { category: "food",     fn: "Thickener",                   note: "Derived from corn; thickens sauces and soups. Source: FDA GRAS." },
  "yeast extract":                { category: "food",     fn: "Flavour enhancer",            note: "Contains free glutamates; natural umami flavour. Source: OFF taxonomy." },
  "caramel color":                { category: "food",     fn: "Colourant",                   note: "E150; made from heated sugar; Class IV linked to 4-MEI concerns. Source: EU additive list." },
  "annatto":                      { category: "food",     fn: "Colourant",                   note: "E160b; natural yellow-orange colour from achiote seeds. Source: EU additive list." },
  "beta-carotene":                { category: "food",     fn: "Colourant / Nutrient",        note: "E160a; provitamin A; natural orange pigment. Source: EU additive list." },
  "sodium nitrite":               { category: "food",     fn: "Preservative / Curing agent", note: "E250; used in cured meats; potential carcinogen at high doses. Source: EU additive list." },
  "red 40":                       { category: "food",     fn: "Artificial colourant",        note: "FD&C Red No. 40; may cause hyperactivity in sensitive children. Source: FDA." },
  "yellow 5":                     { category: "food",     fn: "Artificial colourant",        note: "Tartrazine (E102); rare allergy risk; EU warning label required. Source: EU additive list." },
  "yellow 6":                     { category: "food",     fn: "Artificial colourant",        note: "Sunset Yellow (E110); EU warning label required. Source: EU additive list." },
  "stevia":                       { category: "food",     fn: "Sweetener",                   note: "Plant-based zero-calorie sweetener; considered safe (E960). Source: EU additive list." },
  "erythritol":                   { category: "food",     fn: "Sweetener (sugar alcohol)",   note: "Low glycaemic; well tolerated; minimally absorbed (E968). Source: EU additive list." },
  "sorbitol":                     { category: "food",     fn: "Sweetener (sugar alcohol)",   note: "E420; laxative effect in amounts above 50 g/day. Source: EU additive list." },
  "aspartame":                    { category: "food",     fn: "Artificial sweetener",        note: "E951; avoid with PKU (contains phenylalanine). Source: EU additive list." },
  "sucralose":                    { category: "food",     fn: "Artificial sweetener",        note: "E955; 600× sweeter than sugar; heat-stable. Source: EU additive list." },
  "acesulfame potassium":         { category: "food",     fn: "Artificial sweetener",        note: "Acesulfame K (E950); often combined with sucralose or aspartame. Source: EU additive list." },
  "rice":                         { category: "food",     fn: "Grain / Starch",              note: "Gluten-free grain; common wheat substitute. Source: OFF taxonomy." },
  "oat":                          { category: "food",     fn: "Grain / Fibre",               note: "Rich in beta-glucan fibre; may be cross-contaminated with gluten. Source: OFF taxonomy." },
  "corn":                         { category: "food",     fn: "Grain / Starch",              note: "Gluten-free; common in processed food as starch or syrup. Source: OFF taxonomy." },
  "almond":                       { category: "food",     fn: "Tree nut",                    note: "Major tree-nut allergen; source of vitamin E and healthy fats." },
  "almonds":                      { category: "food",     fn: "Tree nut",                    note: "Major tree-nut allergen; source of vitamin E and healthy fats." },
  "cashew":                       { category: "food",     fn: "Tree nut",                    note: "Common tree-nut allergen; rich in magnesium." },
  "hazelnut":                     { category: "food",     fn: "Tree nut",                    note: "Tree-nut allergen; also contains vitamin E." },
  "shrimp":                       { category: "food",     fn: "Shellfish",                   note: "Common shellfish allergen; high in protein and iodine." },
  "vinegar":                      { category: "food",     fn: "Acidulant / Preservative",    note: "Acetic acid solution; used for flavour and natural preservation. Source: OFF taxonomy." },
  "msg":                          { category: "food",     fn: "Flavour enhancer",            note: "Monosodium glutamate (E621); umami flavour; safe for the general population. Source: FDA GRAS." },
  "artificial color":             { category: "food",     fn: "Colourant",                   note: "Synthetic dye category; specific dyes vary in safety profile. Source: FDA." },
  "sodium phosphate":             { category: "food",     fn: "Emulsifier / pH regulator",   note: "E339; used in processed cheese and meats. Source: EU additive list." },
  "calcium propionate":           { category: "food",     fn: "Preservative",                note: "E282; prevents mould in bread; generally recognised as safe. Source: EU additive list." },
  "sorbic acid":                  { category: "food",     fn: "Preservative",                note: "E200; natural preservative; inhibits yeast and mould. Source: EU additive list." }
}

let cachedKnownIngredientMatchers = null
// Common ingredient conjunctions seen across supported UI languages.
const multilingualIngredientJoiners = ["and", "und", "et", "和", "及", "与", "以及"]
const multilingualIngredientJoinerPattern = new RegExp(`\\s(?:${multilingualIngredientJoiners.join("|")})\\s`, "iu")

function getKnownIngredientMatchers(){
  if(cachedKnownIngredientMatchers) return cachedKnownIngredientMatchers

  const searchableVocabulary = [
    ...knownIngredients,
    ...Object.keys(localIngredientDb),
    ...Object.keys(ingredientAliases)
  ]

  cachedKnownIngredientMatchers = [...new Set(searchableVocabulary)]
    .map((value) => sanitizeIngredientTerm(value))
    .filter(Boolean)
  // Second deduplication is intentional: different raw variants can sanitize to the same token.
  cachedKnownIngredientMatchers = [...new Set(cachedKnownIngredientMatchers)]
    .sort((a, b) => b.length - a.length)
    .map(ingredient => {
      const escapedIngredient = ingredient.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
      const usesWordBoundary = /[a-z0-9\u00C0-\u024F]/i.test(ingredient)
      return {
        ingredient: ingredientAliases[ingredient] || ingredient,
        regex: usesWordBoundary
          ? new RegExp(`(^|[^\\p{L}\\p{N}])${escapedIngredient}($|[^\\p{L}\\p{N}])`, "iu")
          : new RegExp(escapedIngredient, "iu")
      }
    })

  return cachedKnownIngredientMatchers
}

function normalizeIngredientName(value = ""){
  if(!value) return ""

  const withoutHeader = String(value).replace(/^(ingredients?|ingrédients?|inhaltsstoffe?|成分|配料)[:：\s-]*/i, "")
  const normalized = sanitizeIngredientTerm(withoutHeader)
    .replace(/\b\d+(?:\.\d+)?\s*%?\b/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()

  if(!normalized) return ""
  return ingredientAliases[normalized] || normalized
}

function extractVocabularyMatches(text = ""){
  const normalizedText = sanitizeIngredientTerm(text)
  if(!normalizedText) return []

  const matches = getKnownIngredientMatchers()
    .filter(({ regex }) => regex.test(normalizedText))
    .map(({ ingredient }) => normalizeIngredientName(ingredient))
    .filter(Boolean)

  return [...new Set(matches)]
}

function isLikelyIngredientToken(token = ""){
  const normalized = sanitizeIngredientTerm(token)
  if(!normalized || normalized.length < 2) return false
  if(/^\d+([.,]\d+)?$/.test(normalized)) return false
  if(normalized.split(" ").length > 8) return false
  return true
}


function extractIngredients(text){
  const normalizedText = (text || "").toLowerCase().trim()
  if(!normalizedText) return []

  // Insert delimiters between CJK and Latin/number runs so mixed-script OCR like "水retinol" can split correctly.
  const scriptBoundarySplitText = normalizedText
    // \u4e00-\u9fa5: CJK ideographs, \u00C0-\u024F: Latin extended letters.
    .replace(/([\u4e00-\u9fa5])([a-z\u00C0-\u024F0-9])/giu, "$1, $2")
    .replace(/([a-z\u00C0-\u024F0-9])([\u4e00-\u9fa5])/giu, "$1, $2")

  const foundByVocabulary = extractVocabularyMatches(normalizedText)

  const splitByPunctuation = scriptBoundarySplitText
    .split(ingredientSplitPunctuationPattern)
    .flatMap((segment) => segment.split(multilingualIngredientJoinerPattern))
    .map(i => i.trim())
    .filter(i => i.length > 0)

  const fallbackSplit = splitByPunctuation.length > 1
    ? splitByPunctuation
    : foundByVocabulary.length
      ? []
      : normalizedText
        .split(/\s+(?:and|und|et|和|及|与)\s+|\s{2,}/i)
        .map(i => i.trim())
        .filter(i => i.length > 0)

  const normalizedFallbackMatches = fallbackSplit
    .map(normalizeIngredientName)
    .filter(isLikelyIngredientToken)
    .filter(Boolean)

  const granularVocabularyMatches = splitByPunctuation
    .flatMap(extractVocabularyMatches)
    .filter(Boolean)

  return [...new Set([...foundByVocabulary, ...granularVocabularyMatches, ...normalizedFallbackMatches])]
}


/* -----------------------
INTERACTION CHECKER
----------------------- */

function checkInteractions(ingredients, lang = currentLanguage()){

let warnings = []

if(
ingredients.includes("retinol") &&
ingredients.includes("glycolic acid")
){
warnings.push(
 t("retinolGlycolic", lang)
)
}

if(
ingredients.includes("benzoyl peroxide") &&
ingredients.includes("retinol")
){
warnings.push(
 t("peroxideRetinol", lang)
)
}

return warnings

}

/* -----------------------
DISPLAY WARNINGS
----------------------- */

function displayInteractions(warnings, lang = currentLanguage()){

  const el = document.getElementById("interactionWarnings")
  if(!el) return

  if(!warnings.length){
    el.innerHTML = `<div class="no-conflict"><span>${escapeHtml(t("noConflicts", lang))}</span></div>`
    return
  }

  el.innerHTML = warnings
    .map(w => `<div class="warning-card"><span class="warning-icon">${escapeHtml(t("alertTag", lang))}</span><span>${escapeHtml(w)}</span></div>`)
    .join("")

}

/* -----------------------
SAVE TO DATABASE
----------------------- */

async function saveResult(input, result){
  if (!supabaseClient) {
    console.warn("Skipping save: Supabase client not configured.")
    return
  }

  try{
    const { data, error } =
      await supabaseClient
        .from("ingredient_checks")
        .insert([{ input, result }])
        .select()

    if(error) throw error

    console.log("Saved:", data)
  } catch(err) {
    console.error("Database save error:", err)
  }
}

/* -----------------------
ANONYMOUS SESSION ID
Returns a stable anonymous UUID stored in localStorage.
No PII is attached; used only for grouping scan_events from the same session.
----------------------- */

function getOrCreateSessionId() {
  try {
    let id = localStorage.getItem("wykta_session_id")
    if (!id) {
      if (typeof crypto !== "undefined" && crypto.randomUUID) {
        id = crypto.randomUUID()
      } else {
        // Fallback: build a v4 UUID using crypto.getRandomValues (available since IE11)
        const b = new Uint8Array(16)
        if (typeof crypto !== "undefined" && crypto.getRandomValues) {
          crypto.getRandomValues(b)
        }
        b[6] = (b[6] & 0x0f) | 0x40  // version 4
        b[8] = (b[8] & 0x3f) | 0x80  // variant bits
        id = [b.slice(0, 4), b.slice(4, 6), b.slice(6, 8), b.slice(8, 10), b.slice(10)]
          .map(seg => Array.from(seg).map(x => x.toString(16).padStart(2, "0")).join(""))
          .join("-")
      }
      localStorage.setItem("wykta_session_id", id)
    }
    return id
  } catch (e) {
    return "unknown"
  }
}

/* -----------------------
SCAN EVENT TELEMETRY
Records an anonymous analysis signal to scan_events.
No ingredient text or user identity is stored.
----------------------- */

async function recordScanEvent({ ingredientCount, inputLang, analysisSource, warningCount, allergenCount, lang }) {
  if (!supabaseClient) return
  try {
    const sessionId = getOrCreateSessionId()
    const { error } = await supabaseClient
      .from("scan_events")
      .insert([{
        session_id:       sessionId,
        ingredient_count: ingredientCount,
        input_lang:       inputLang,
        analysis_source:  analysisSource,
        warning_count:    warningCount,
        allergen_count:   allergenCount,
        lang:             lang
      }])
    if (error) throw error
  } catch (err) {
    // Telemetry errors are non-fatal; swallow silently
    console.debug("scan_event record failed:", err)
  }
}

const languageNames = {
  en: "English",
  fr: "Français",
  de: "Deutsch",
  zh: "中文"
}

const languageLocales = {
  en: "en",
  fr: "fr-FR",
  de: "de-DE",
  zh: "zh-CN"
}

// Industry-benchmarked pricing – verified against 2025 public App Store listings:
// Yuka:        $15/yr (US App Store 2025), ~€14/yr (EU)
// Think Dirty: $27.99–$29.99/yr Premium; $48.99/yr All Access (US App Store 2025)
// INCI Beauty: €1.50/mo = €18/yr (official 2025)
// CN market (成分扫描App): ¥15–38/月, ¥88–258/年 (主流 ¥18–28/月, ¥100–188/年)
//
// Wykta is AI-powered (web + camera OCR) — positioned above INCI/Yuka, matching Think Dirty Premium.
// EN/USD: $3.99/mo, $27.99/yr  — matches Think Dirty Premium; above Yuka ($15/yr)
// FR/DE/EUR: €2.99/mo, €21.99/yr — above INCI Beauty (€18/yr), below Think Dirty
// ZH/CNY: ¥18/mo, ¥128/yr — mid-market of CN beauty-app range (¥15–38/月, ¥88–188/年)
const marketPricing = {
  en: { currency: "USD", monthly: 3.99, annual: 27.99, monthlySuffix: "/mo", annualSuffix: "/yr" },
  fr: { currency: "EUR", monthly: 2.99, annual: 21.99, monthlySuffix: "/mois", annualSuffix: "/an" },
  de: { currency: "EUR", monthly: 2.99, annual: 21.99, monthlySuffix: "/Monat", annualSuffix: "/Jahr" },
  zh: { currency: "CNY", monthly: 18, annual: 128, monthlySuffix: "/月", annualSuffix: "/年" }
}

const ocrLanguageCodes = {
  en: "eng",
  fr: "fra",
  de: "deu",
  zh: "chi_sim"
}
const ocrPrimaryLanguagePack = {
  en: "eng",
  fr: "fra+eng",
  de: "deu+eng",
  zh: "chi_sim+eng"
}
const ocrBackupLanguagePack = {
  en: "eng+chi_sim+fra+deu",
  fr: "eng+chi_sim+deu",
  de: "eng+chi_sim+fra",
  zh: "eng+fra+deu"
}

const uiMessages = {
  en: {
    heroBadge: "AI-Powered Ingredient Intelligence",
    heroTitlePrefix: "Know exactly what's",
    heroTitleHighlight: "in your products",
    heroSubtitle: "Scan food or skincare labels instantly, detect hidden allergens, and make confident choices about what goes in and on your body.",
    heroCta: "Check your ingredients free →",
    chipCoverage: "Food + Skincare Coverage",
    chipLanguage: "4-Language Support",
    chipSpeed: "OCR-to-Analysis in Seconds",
    chipUpgrade: "Allergen & Safety Alerts",
    workflowNav: "How It Works",
    communityNav: "Community",
    proofData: "Data Sources",
    proofDataValue: "2.8M+ ingredients indexed",
    proofTrust: "Trust Signal",
    proofTrustValue: "Community-maintained open databases",
    proofSpeed: "Speed",
    proofSpeedValue: "Live lookup + instant warnings",
    analysisSubtitle: "Now enriched with free food and skincare databases for broader ingredient coverage.",
    scanSubtitle: "Use your camera to pull ingredients from labels in seconds.",
    ctaTitle: "Ready to know what's really in your products?",
    ctaBody: "Join the community of conscious shoppers. Wykta delivers instant, science-backed ingredient insight — for free.",
    ctaGetPro: "Get Pro Annual",
    ctaContactSales: "Contact Sales",
    ctaJoinCommunity: "Join Community",
    workflowTitle: "How Wykta works",
    workflowSubtitle: "From scan to safety decision in seconds — completely free to start.",
    workflowStep1Title: "Start",
    workflowStep1Body: "Paste ingredients or open the camera to begin your check immediately.",
    workflowStep2Title: "Scan & analyze",
    workflowStep2Body: "Open camera, point at any food or skincare label. AI reads it in seconds.",
    workflowStep3Title: "Get insights",
    workflowStep3Body: "See ingredient safety ratings, allergen flags, and interaction warnings instantly.",
    workflowStep4Title: "Stay informed",
    workflowStep4Body: "Upgrade to Pro for unlimited scans, PDF exports, and join our community.",
    analysisLanguage: "Analysis Language",
    ingredientList: "Ingredient List",
    ingredientsPlaceholder: "Paste ingredients from food or skincare labels",
    analyzeButton: "Analyze Ingredients",
    openCameraButton: "Open Camera",
    captureButton: "Capture Label",
    valueTitle: "Why users pay for Wykta",
    valueSubtitle: "Simple pricing that grows with you. Start free, upgrade when you're ready.",
    billingMonthly: "Monthly",
    billingAnnual: "Annual",
    billingDiscount: "Save 20%",
    billingAnnualPeriod: "billed annually",
    starterTitle: "Starter (Free)",
    starterBody: "Quick scans, basic warnings, multilingual output.",
    proTitle: "Pro (Recommended)",
    proBody: "Monthly or annual plans with priority analysis, richer ingredient insights, and premium trust reports.",
    proCtaButton: "Get Pro",
    enterpriseCtaButton: "Contact Sales",
    footerTagline: "Know what goes in and on your body.",
    aiDisclaimer: "For reference only — not medical or dietary advice. AI results may be inaccurate.",
    warningTitle: "Interaction Warnings",
    scanTitle: "Scan Ingredient Label",
    detectedTitle: "Detected Text",
    cameraTag: "Camera",
    cameraHint: "Click \"Open Camera\" to start scanning",
    analysisPlaceholder: "AI analysis will appear here",
    warningPlaceholder: "Ingredient conflicts will appear here",
    noConflicts: "No obvious ingredient conflicts detected.",
    retinolGlycolic: "Retinol combined with glycolic acid may increase skin irritation.",
    peroxideRetinol: "Benzoyl peroxide may deactivate retinol.",
    analyzing: "Analyzing ingredients...",
    ocrProcessing: "Processing image and running OCR...",
    cameraAccessFailed: "Unable to access camera. Please allow camera permission and try again.",
    aiUnavailable: "AI analysis unavailable. Please check your Supabase configuration.",
    noAnalysisFor: (langName) => `AI returned no analysis for ${langName}. Please try again or check the backend function.`,
    failed: "AI analysis failed. Please check your internet connection and Supabase setup.",
    ocrFailed: "OCR failed. Try again.",
    fallbackHeader: "Open-data ingredient analysis",
    foodCategory: "Food",
    skincareCategory: "Skincare",
    generalCategory: "General",
    noPublicData: "No clear match was found in public ingredient databases.",
    wikidataNoDescription: "No description available from Wikidata.",
    starterPeriod: "forever free",
    starterFeatureInput: "Paste or camera input",
    starterFeatureLang: "4-language support",
    starterFeaturePriority: "Priority analysis",
    starterFeatureExport: "Export reports",
    planMostPopular: "Most Popular",
    proPeriod: "billed monthly",
    proFeatureStarter: "Everything in Starter",
    proFeatureUnlimited: "Unlimited scans",
    proFeaturePdf: "Export PDF reports",
    enterpriseTitle: "Enterprise",
    enterprisePrice: "Custom",
    enterprisePeriod: "custom scope & quote",
    enterpriseFeaturePro: "Everything in Pro",
    enterpriseFeatureApi: "REST API and integration support",
    enterpriseFeatureWhiteLabel: "White-label and workflow customization",
    enterpriseFeatureSla: "SLA guarantee",
    enterpriseFeatureSupport: "Dedicated support",
    exportBtn: "Export PDF",
    shareBtn: "Share",
    resultsSummaryIngredients: (n) => `${n} ingredient${n === 1 ? "" : "s"} analyzed`,
    resultsSummaryCaution: (n) => `${n} require${n === 1 ? "s" : ""} caution`,
    resultsSummaryAllergens: (n) => `${n} allergen${n === 1 ? "" : "s"} detected`,
    alertTag: "Alert",
    sourceLabel: "Source",
    seenInLabel: "Seen in",
    allergenIndicatorsLabel: "Allergen indicators",
    ingredientAnalysisTagLabel: "Ingredient analysis tag",
    productTypeLabel: "Product type",
    ingredientTagLabel: "Ingredient tag",
    ingredientLabel: "Ingredient",
    entityLabel: "Entity",
    descriptionLabel: "Description",
    wikidataLabel: "Wikidata",
    publicDbSourceNote: "Sources: Open Food Facts ingredient taxonomy / Open Food Facts / Open Beauty Facts",
    languageDetectedLabel: "Detected analysis language",
    metaDescription: "Scan food or skincare labels instantly. AI-powered ingredient analysis, allergen alerts, and interaction warnings.",
    exportEmptyError: "Run an analysis before exporting or sharing.",
    shareSuccess: "Result copied to clipboard.",
    shareUnsupported: "Share is not available on this device.",
    scanBarcodeButton: "Scan Barcode",
    stopBarcodeButton: "Stop",
    barcodeScanning: "Point camera at a barcode…",
    barcodeNotFound: "Product not found in the database.",
    barcodeProductFound: "Product found",
    barcodeIngredientsLoaded: "Ingredients loaded — analyzing…",
    barcodeNoIngredients: "No ingredients found for this product.",
    nutriScoreLabel: "Nutri-Score",
    safetyScoreLabel: "Safety",
    pwaInstallTitle: "Add Wykta to your home screen",
    pwaInstallBody: "Install the app for quick access — no App Store needed.",
    pwaInstallBtn: "Add to Home Screen",
    pwaInstallDismiss: "Not now"
  },
  fr: {
    heroBadge: "Intelligence ingrédients pilotée par l'IA",
    heroTitlePrefix: "Sachez exactement ce qu'il y a",
    heroTitleHighlight: "dans vos produits",
    heroSubtitle: "Scannez les étiquettes alimentaires ou skincare instantanément, détectez les allergènes cachés et faites des choix éclairés sur ce que vous consommez.",
    heroCta: "Vérifiez vos ingrédients gratuitement →",
    chipCoverage: "Couverture alimentaire + skincare",
    chipLanguage: "Support 4 langues",
    chipSpeed: "OCR vers analyse en quelques secondes",
    chipUpgrade: "Alertes allergènes & sécurité",
    workflowNav: "Fonctionnement",
    communityNav: "Communauté",
    proofData: "Sources de données",
    proofDataValue: "2,8 M+ ingrédients indexés",
    proofTrust: "Signal de confiance",
    proofTrustValue: "Bases ouvertes maintenues par la communauté",
    proofSpeed: "Vitesse",
    proofSpeedValue: "Recherche en direct + alertes instantanées",
    analysisSubtitle: "Désormais enrichi avec des bases alimentaires et skincare gratuites pour élargir la couverture.",
    scanSubtitle: "Utilisez votre caméra pour extraire les ingrédients en quelques secondes.",
    ctaTitle: "Prêt à savoir ce qui se cache vraiment dans vos produits ?",
    ctaBody: "Rejoignez la communauté des consommateurs avertis. Wykta vous offre une analyse instantanée et scientifique des ingrédients — gratuitement.",
    ctaGetPro: "Passer Pro Annuel",
    ctaContactSales: "Contacter l'équipe commerciale",
    ctaJoinCommunity: "Rejoindre la communauté",
    workflowTitle: "Comment fonctionne Wykta",
    workflowSubtitle: "Du scan à la décision de sécurité en secondes — gratuit pour commencer.",
    workflowStep1Title: "Démarrer",
    workflowStep1Body: "Collez vos ingrédients ou ouvrez la caméra pour commencer immédiatement.",
    workflowStep2Title: "Scanner & analyser",
    workflowStep2Body: "Ouvrez la caméra, pointez sur une étiquette alimentaire ou skincare. L'IA la lit en secondes.",
    workflowStep3Title: "Obtenir des insights",
    workflowStep3Body: "Voyez les notes de sécurité, alertes allergènes et avertissements d'interaction instantanément.",
    workflowStep4Title: "Rester informé",
    workflowStep4Body: "Passez Pro pour les scans illimités, exports PDF et rejoignez notre communauté.",
    analysisLanguage: "Langue d'analyse",
    ingredientList: "Liste d'ingrédients",
    ingredientsPlaceholder: "Collez les ingrédients d'étiquettes alimentaires ou skincare",
    analyzeButton: "Analyser les ingrédients",
    openCameraButton: "Ouvrir la caméra",
    captureButton: "Capturer l'étiquette",
    valueTitle: "Pourquoi les utilisateurs paient Wykta",
    valueSubtitle: "Des tarifs simples qui évoluent avec vous. Commencez gratuitement, passez Pro quand vous êtes prêt.",
    billingMonthly: "Mensuel",
    billingAnnual: "Annuel",
    billingDiscount: "Économisez 20 %",
    billingAnnualPeriod: "facturé annuellement",
    starterTitle: "Starter (Gratuit)",
    starterBody: "Scans rapides, alertes de base, sortie multilingue.",
    proTitle: "Pro (Recommandé)",
    proBody: "Abonnements mensuel ou annuel avec analyse prioritaire, insights plus riches et rapports premium.",
    proCtaButton: "Passer Pro",
    enterpriseCtaButton: "Contacter l'équipe commerciale",
    footerTagline: "Sachez ce que vous consommez et appliquez sur votre peau.",
    aiDisclaimer: "À titre indicatif uniquement — pas de conseil médical ni diététique. Les résultats IA peuvent être inexacts.",
    warningTitle: "Avertissements d'interaction",
    scanTitle: "Scanner l'étiquette d'ingrédients",
    detectedTitle: "Texte détecté",
    cameraTag: "Caméra",
    cameraHint: "Cliquez sur \"Ouvrir la caméra\" pour commencer le scan",
    analysisPlaceholder: "L'analyse IA apparaîtra ici",
    warningPlaceholder: "Les conflits d'ingrédients apparaîtront ici",
    noConflicts: "Aucun conflit évident entre ingrédients détecté.",
    retinolGlycolic: "Le rétinol combiné à l'acide glycolique peut augmenter l'irritation cutanée.",
    peroxideRetinol: "Le peroxyde de benzoyle peut désactiver le rétinol.",
    analyzing: "Analyse des ingrédients...",
    ocrProcessing: "Traitement de l'image et OCR en cours...",
    cameraAccessFailed: "Impossible d'accéder à la caméra. Autorisez l'accès puis réessayez.",
    aiUnavailable: "Analyse IA indisponible. Vérifiez la configuration Supabase.",
    noAnalysisFor: (langName) => `L'IA n'a renvoyé aucune analyse pour ${langName}. Veuillez réessayer ou vérifier la fonction backend.`,
    failed: "Échec de l'analyse IA. Vérifiez votre connexion et Supabase.",
    ocrFailed: "Échec de l'OCR. Réessayez.",
    fallbackHeader: "Analyse d'ingrédients via données ouvertes",
    foodCategory: "Alimentaire",
    skincareCategory: "Soin de la peau",
    generalCategory: "Général",
    noPublicData: "Aucune correspondance claire trouvée dans les bases publiques.",
    wikidataNoDescription: "Aucune description disponible depuis Wikidata.",
    starterPeriod: "gratuit à vie",
    starterFeatureInput: "Saisie par collage ou caméra",
    starterFeatureLang: "Support de 4 langues",
    starterFeaturePriority: "Analyse prioritaire",
    starterFeatureExport: "Export de rapports",
    planMostPopular: "Le plus populaire",
    proPeriod: "facturé mensuellement",
    proFeatureStarter: "Tout le contenu de Starter",
    proFeatureUnlimited: "Scans illimités",
    proFeaturePdf: "Export PDF des rapports",
    enterpriseTitle: "Entreprise",
    enterprisePrice: "Sur mesure",
    enterprisePeriod: "périmètre et devis sur mesure",
    enterpriseFeaturePro: "Tout le contenu de Pro",
    enterpriseFeatureApi: "Accès API REST et support d'intégration",
    enterpriseFeatureWhiteLabel: "Marque blanche et adaptation du workflow",
    enterpriseFeatureSla: "Garantie SLA",
    enterpriseFeatureSupport: "Support dédié",
    exportBtn: "Exporter PDF",
    shareBtn: "Partager",
    resultsSummaryIngredients: (n) => `${n} ingrédient${n !== 1 ? "s" : ""} analysé${n !== 1 ? "s" : ""}`,
    resultsSummaryCaution: (n) => `${n} nécessite${n !== 1 ? "nt" : ""} attention`,
    resultsSummaryAllergens: (n) => `${n} allergène${n !== 1 ? "s" : ""} détecté${n !== 1 ? "s" : ""}`,
    alertTag: "Alerte",
    sourceLabel: "Source",
    seenInLabel: "Présent dans",
    allergenIndicatorsLabel: "Indicateurs d'allergènes",
    ingredientAnalysisTagLabel: "Tag d'analyse d'ingrédient",
    productTypeLabel: "Type de produit",
    ingredientTagLabel: "Tag d'ingrédient",
    ingredientLabel: "Ingrédient",
    entityLabel: "Entité",
    descriptionLabel: "Description",
    wikidataLabel: "Wikidata",
    publicDbSourceNote: "Sources : taxonomie ingrédients Open Food Facts / Open Food Facts / Open Beauty Facts",
    languageDetectedLabel: "Langue d'analyse détectée",
    metaDescription: "Scannez les étiquettes alimentaires ou skincare instantanément. Analyse IA des ingrédients, alertes allergènes et avertissements d'interaction.",
    exportEmptyError: "Lancez une analyse avant d'exporter ou partager.",
    shareSuccess: "Résultat copié dans le presse-papiers.",
    shareUnsupported: "Le partage n'est pas disponible sur cet appareil.",
    scanBarcodeButton: "Scanner le code-barres",
    stopBarcodeButton: "Arrêter",
    barcodeScanning: "Pointez la caméra sur un code-barres…",
    barcodeNotFound: "Produit non trouvé dans la base de données.",
    barcodeProductFound: "Produit trouvé",
    barcodeIngredientsLoaded: "Ingrédients chargés — analyse en cours…",
    barcodeNoIngredients: "Aucun ingrédient trouvé pour ce produit.",
    nutriScoreLabel: "Nutri-Score",
    safetyScoreLabel: "Sécurité",
    pwaInstallTitle: "Ajoutez Wykta à votre écran d'accueil",
    pwaInstallBody: "Installez l'app pour un accès rapide — sans App Store.",
    pwaInstallBtn: "Ajouter à l'écran d'accueil",
    pwaInstallDismiss: "Plus tard"
  },
  de: {
    heroBadge: "KI-gestützte Inhaltsstoff-Intelligenz",
    heroTitlePrefix: "Wissen Sie genau, was",
    heroTitleHighlight: "in Ihren Produkten steckt",
    heroSubtitle: "Scannen Sie Lebensmittel- oder Hautpflegeetiketten sofort, entdecken Sie versteckte Allergene und treffen Sie sichere Entscheidungen für Körper und Haut.",
    heroCta: "Jetzt kostenlos prüfen →",
    chipCoverage: "Lebensmittel + Hautpflege",
    chipLanguage: "Unterstützung für 4 Sprachen",
    chipSpeed: "OCR-zu-Analyse in Sekunden",
    chipUpgrade: "Allergen- & Sicherheitsalarme",
    workflowNav: "Funktionsweise",
    communityNav: "Community",
    proofData: "Datenquellen",
    proofDataValue: "2,8 Mio.+ Inhaltsstoffe indexiert",
    proofTrust: "Vertrauenssignal",
    proofTrustValue: "Community-gepflegte offene Datenbanken",
    proofSpeed: "Geschwindigkeit",
    proofSpeedValue: "Live-Abfrage + sofortige Warnungen",
    analysisSubtitle: "Jetzt mit kostenlosen Lebensmittel- und Hautpflege-Datenbanken für breitere Abdeckung.",
    scanSubtitle: "Nutzen Sie Ihre Kamera, um Inhaltsstoffe in Sekunden zu erfassen.",
    ctaTitle: "Bereit zu wissen, was wirklich in Ihren Produkten steckt?",
    ctaBody: "Schließen Sie sich bewussten Verbrauchern an. Wykta liefert sofortige, wissenschaftlich fundierte Inhaltsstoff-Einblicke — kostenlos.",
    ctaGetPro: "Pro jährlich holen",
    ctaContactSales: "Vertrieb kontaktieren",
    ctaJoinCommunity: "Community beitreten",
    workflowTitle: "Wie Wykta funktioniert",
    workflowSubtitle: "Vom Scan zur Sicherheitsentscheidung in Sekunden — kostenlos starten.",
    workflowStep1Title: "Starten",
    workflowStep1Body: "Inhaltsstoffe einfügen oder Kamera öffnen und sofort prüfen.",
    workflowStep2Title: "Scannen & Analysieren",
    workflowStep2Body: "Kamera öffnen, auf ein Lebensmittel- oder Pflege-Etikett richten. KI liest es in Sekunden.",
    workflowStep3Title: "Einblicke erhalten",
    workflowStep3Body: "Sicherheitsbewertungen, Allergen-Warnungen und Wechselwirkungshinweise sofort sehen.",
    workflowStep4Title: "Informiert bleiben",
    workflowStep4Body: "Pro upgraden für unbegrenzte Scans, PDF-Exporte und Community-Zugang.",
    analysisLanguage: "Analysesprache",
    ingredientList: "Inhaltsstoffliste",
    ingredientsPlaceholder: "Inhaltsstoffe von Lebensmittel- oder Hautpflegeetiketten einfügen",
    analyzeButton: "Inhaltsstoffe analysieren",
    openCameraButton: "Kamera öffnen",
    captureButton: "Etikett erfassen",
    valueTitle: "Warum Nutzer für Wykta zahlen",
    valueSubtitle: "Einfache Preisgestaltung, die mit Ihnen wächst. Kostenlos starten, jederzeit upgraden.",
    billingMonthly: "Monatlich",
    billingAnnual: "Jährlich",
    billingDiscount: "20 % sparen",
    billingAnnualPeriod: "jährliche Abrechnung",
    starterTitle: "Starter (Kostenlos)",
    starterBody: "Schnelle Scans, Basiswarnungen, mehrsprachige Ausgabe.",
    proTitle: "Pro (Empfohlen)",
    proBody: "Monatlicher oder jährlicher Tarif mit priorisierter Analyse, tieferen Insights und Premium-Reports.",
    proCtaButton: "Pro holen",
    enterpriseCtaButton: "Vertrieb kontaktieren",
    footerTagline: "Wissen, was in und auf Ihren Körper gelangt.",
    aiDisclaimer: "Nur zur Information — keine medizinische oder diätetische Beratung. KI-Ergebnisse können ungenau sein.",
    warningTitle: "Interaktionswarnungen",
    scanTitle: "Inhaltsstoffetikett scannen",
    detectedTitle: "Erkannter Text",
    cameraTag: "Kamera",
    cameraHint: "Klicken Sie auf \"Kamera öffnen\", um den Scan zu starten",
    analysisPlaceholder: "KI-Analyse erscheint hier",
    warningPlaceholder: "Inhaltsstoffkonflikte erscheinen hier",
    noConflicts: "Keine offensichtlichen Inhaltsstoffkonflikte erkannt.",
    retinolGlycolic: "Retinol in Kombination mit Glykolsäure kann Hautreizungen verstärken.",
    peroxideRetinol: "Benzoylperoxid kann Retinol deaktivieren.",
    analyzing: "Inhaltsstoffe werden analysiert...",
    ocrProcessing: "Bild wird verarbeitet und OCR läuft...",
    cameraAccessFailed: "Kein Kamerazugriff möglich. Bitte Berechtigung erteilen und erneut versuchen.",
    aiUnavailable: "KI-Analyse nicht verfügbar. Bitte Supabase-Konfiguration prüfen.",
    noAnalysisFor: (langName) => `Die KI hat keine Analyse für ${langName} geliefert. Bitte erneut versuchen oder die Backend-Funktion prüfen.`,
    failed: "KI-Analyse fehlgeschlagen. Bitte Internetverbindung und Supabase prüfen.",
    ocrFailed: "OCR fehlgeschlagen. Bitte erneut versuchen.",
    fallbackHeader: "Inhaltsstoffanalyse mit Open-Data",
    foodCategory: "Lebensmittel",
    skincareCategory: "Hautpflege",
    generalCategory: "Allgemein",
    noPublicData: "Keine klare Übereinstimmung in öffentlichen Datenbanken gefunden.",
    wikidataNoDescription: "Keine Beschreibung von Wikidata verfügbar.",
    starterPeriod: "dauerhaft kostenlos",
    starterFeatureInput: "Eingabe per Einfügen oder Kamera",
    starterFeatureLang: "Unterstützung für 4 Sprachen",
    starterFeaturePriority: "Priorisierte Analyse",
    starterFeatureExport: "Berichte exportieren",
    planMostPopular: "Am beliebtesten",
    proPeriod: "monatliche Abrechnung",
    proFeatureStarter: "Alles aus Starter",
    proFeatureUnlimited: "Unbegrenzte Scans",
    proFeaturePdf: "PDF-Berichte exportieren",
    enterpriseTitle: "Enterprise",
    enterprisePrice: "Individuell",
    enterprisePeriod: "individueller Umfang & Angebot",
    enterpriseFeaturePro: "Alles aus Pro",
    enterpriseFeatureApi: "REST-API-Zugang und Integrationssupport",
    enterpriseFeatureWhiteLabel: "White-Label- und Workflow-Anpassung",
    enterpriseFeatureSla: "SLA-Garantie",
    enterpriseFeatureSupport: "Dedizierter Support",
    exportBtn: "PDF exportieren",
    shareBtn: "Teilen",
    resultsSummaryIngredients: (n) => `${n} Inhaltsstoff${n !== 1 ? "e" : ""} analysiert`,
    resultsSummaryCaution: (n) => `${n} erfordern Achtsamkeit`,
    resultsSummaryAllergens: (n) => `${n} Allergen${n !== 1 ? "e" : ""} erkannt`,
    alertTag: "Warnung",
    sourceLabel: "Quelle",
    seenInLabel: "Gefunden in",
    allergenIndicatorsLabel: "Allergenhinweise",
    ingredientAnalysisTagLabel: "Inhaltsstoff-Analysetag",
    productTypeLabel: "Produkttyp",
    ingredientTagLabel: "Inhaltsstoff-Tag",
    ingredientLabel: "Inhaltsstoff",
    entityLabel: "Entität",
    descriptionLabel: "Beschreibung",
    wikidataLabel: "Wikidata",
    publicDbSourceNote: "Quellen: Open Food Facts Inhaltsstoff-Taxonomie / Open Food Facts / Open Beauty Facts",
    languageDetectedLabel: "Erkannte Analysesprache",
    metaDescription: "Scannen Sie Lebensmittel- oder Hautpflegeetiketten sofort. KI-gestützte Inhaltsstoffanalyse, Allergenalarme und Interaktionswarnungen.",
    exportEmptyError: "Bitte zuerst analysieren, dann exportieren oder teilen.",
    shareSuccess: "Ergebnis in die Zwischenablage kopiert.",
    shareUnsupported: "Teilen ist auf diesem Gerät nicht verfügbar.",
    scanBarcodeButton: "Barcode scannen",
    stopBarcodeButton: "Stopp",
    barcodeScanning: "Kamera auf Barcode richten…",
    barcodeNotFound: "Produkt nicht in der Datenbank gefunden.",
    barcodeProductFound: "Produkt gefunden",
    barcodeIngredientsLoaded: "Inhaltsstoffe geladen — Analyse läuft…",
    barcodeNoIngredients: "Keine Inhaltsstoffe für dieses Produkt gefunden.",
    nutriScoreLabel: "Nutri-Score",
    safetyScoreLabel: "Sicherheit",
    pwaInstallTitle: "Wykta zum Home-Screen hinzufügen",
    pwaInstallBody: "App installieren für schnellen Zugriff — kein App Store nötig.",
    pwaInstallBtn: "Zum Home-Screen hinzufügen",
    pwaInstallDismiss: "Nicht jetzt"
  },
  zh: {
    heroBadge: "AI 驱动的成分智能",
    heroTitlePrefix: "精确了解",
    heroTitleHighlight: "您产品的成分",
    heroSubtitle: "即时扫描食品或护肤标签，发现隐藏过敏原，对进入和涂抹在身体上的每种成分做出明智选择。",
    heroCta: "免费检查成分 →",
    chipCoverage: "食品 + 护肤双场景覆盖",
    chipLanguage: "支持 4 种语言",
    chipSpeed: "OCR 到分析仅需数秒",
    chipUpgrade: "过敏原与安全预警",
    workflowNav: "使用方法",
    communityNav: "社区",
    proofData: "数据来源",
    proofDataValue: "280 万+ 成分已索引",
    proofTrust: "信任信号",
    proofTrustValue: "社区维护的开放数据库",
    proofSpeed: "速度",
    proofSpeedValue: "实时查询 + 即时预警",
    analysisSubtitle: "现已接入免费的食品与护肤数据库，成分覆盖更广。",
    scanSubtitle: "使用相机可在数秒内提取标签成分。",
    ctaTitle: "准备好了解您产品里真正含有什么了吗？",
    ctaBody: "加入注重健康的消费者社区。Wykta 提供即时、有科学依据的成分洞察——完全免费。",
    ctaGetPro: "开通年度专业版",
    ctaContactSales: "联系销售",
    ctaJoinCommunity: "加入社区",
    workflowTitle: "Wykta 怎么用",
    workflowSubtitle: "从扫描到安全判断，只需几秒钟 — 免费开始使用。",
    workflowStep1Title: "开始使用",
    workflowStep1Body: "直接粘贴成分或打开相机，马上开始检测。",
    workflowStep2Title: "扫描 & 分析",
    workflowStep2Body: "打开相机，对准任何食品或护肤品标签，AI 几秒内完成识别。",
    workflowStep3Title: "获取洞察",
    workflowStep3Body: "即时查看成分安全评级、过敏原标记和成分冲突警告。",
    workflowStep4Title: "持续关注",
    workflowStep4Body: "升级 Pro 解锁无限次扫描、PDF 导出，并加入我们的社区。",
    analysisLanguage: "分析语言",
    ingredientList: "成分列表",
    ingredientsPlaceholder: "粘贴食品或护肤品标签中的成分",
    analyzeButton: "分析成分",
    openCameraButton: "打开相机",
    captureButton: "拍摄标签",
    valueTitle: "用户愿意为 Wykta 付费的原因",
    valueSubtitle: "清晰透明的定价，随您需求成长。免费开始，随时升级。",
    billingMonthly: "按月",
    billingAnnual: "按年",
    billingDiscount: "节省 20%",
    billingAnnualPeriod: "按年计费",
    starterTitle: "基础版（免费）",
    starterBody: "快速扫描、基础预警、多语言输出。",
    proTitle: "专业版（推荐）",
    proBody: "提供月付与年付两种专业版，含优先分析、更丰富洞察和高级可信报告。",
    proCtaButton: "升级专业版",
    enterpriseCtaButton: "联系销售团队",
    footerTagline: "了解进入和涂抹在身体上的每一种成分。",
    aiDisclaimer: "仅供参考，不构成医疗或饮食建议。AI分析结果可能存在误差。",
    warningTitle: "成分相互作用预警",
    scanTitle: "扫描成分标签",
    detectedTitle: "识别文本",
    cameraTag: "相机",
    cameraHint: "点击“打开相机”开始扫描",
    analysisPlaceholder: "AI 分析结果将显示在这里",
    warningPlaceholder: "成分冲突将显示在这里",
    noConflicts: "未检测到明显成分冲突。",
    retinolGlycolic: "视黄醇与乙醇酸同时使用可能增加皮肤刺激。",
    peroxideRetinol: "过氧化苯甲酰可能使视黄醇失活。",
    analyzing: "正在分析成分...",
    ocrProcessing: "正在处理图像并执行 OCR...",
    cameraAccessFailed: "无法访问相机。请允许相机权限后重试。",
    aiUnavailable: "AI 分析不可用。请检查 Supabase 配置。",
    noAnalysisFor: (langName) => `AI 未返回 ${langName} 的分析结果。请重试或检查后端函数。`,
    failed: "AI 分析失败。请检查网络连接和 Supabase 设置。",
    ocrFailed: "OCR 失败，请重试。",
    fallbackHeader: "开放数据成分分析",
    foodCategory: "食品",
    skincareCategory: "护肤",
    generalCategory: "通用",
    noPublicData: "在公共数据库中未找到明确匹配。",
    wikidataNoDescription: "Wikidata 未提供可用描述。",
    starterPeriod: "永久免费",
    starterFeatureInput: "支持粘贴或相机输入",
    starterFeatureLang: "支持 4 种语言",
    starterFeaturePriority: "优先分析",
    starterFeatureExport: "导出报告",
    planMostPopular: "最受欢迎",
    proPeriod: "按月计费",
    proFeatureStarter: "包含基础版全部功能",
    proFeatureUnlimited: "不限扫描次数",
    proFeaturePdf: "导出 PDF 报告",
    enterpriseTitle: "企业版",
    enterprisePrice: "定制",
    enterprisePeriod: "按需求定制报价",
    enterpriseFeaturePro: "包含专业版全部功能",
    enterpriseFeatureApi: "REST API 接入与集成支持",
    enterpriseFeatureWhiteLabel: "白标与业务流程定制",
    enterpriseFeatureSla: "SLA 服务保障",
    enterpriseFeatureSupport: "专属支持",
    exportBtn: "导出 PDF",
    shareBtn: "分享",
    resultsSummaryIngredients: (n) => `共分析 ${n} 个成分`,
    resultsSummaryCaution: (n) => `${n} 个需注意`,
    resultsSummaryAllergens: (n) => `${n} 个过敏原`,
    alertTag: "警示",
    sourceLabel: "来源",
    seenInLabel: "出现于",
    allergenIndicatorsLabel: "过敏原提示",
    ingredientAnalysisTagLabel: "成分分析标签",
    productTypeLabel: "产品类型",
    ingredientTagLabel: "成分标签",
    ingredientLabel: "成分",
    entityLabel: "实体",
    descriptionLabel: "描述",
    wikidataLabel: "Wikidata",
    publicDbSourceNote: "来源：Open Food Facts 成分分类 / Open Food Facts / Open Beauty Facts",
    languageDetectedLabel: "识别到的分析语言",
    metaDescription: "即时扫描食品或护肤标签。AI 驱动的成分分析、过敏原警报和成分相互作用预警。",
    exportEmptyError: "请先完成一次分析，再导出或分享。",
    shareSuccess: "结果已复制到剪贴板。",
    shareUnsupported: "当前设备不支持分享。",
    scanBarcodeButton: "扫描条形码",
    stopBarcodeButton: "停止",
    barcodeScanning: "将相机对准条形码…",
    barcodeNotFound: "数据库中未找到该产品。",
    barcodeProductFound: "已找到产品",
    barcodeIngredientsLoaded: "成分已加载 — 正在分析…",
    barcodeNoIngredients: "该产品暂无成分信息。",
    nutriScoreLabel: "营养评级",
    safetyScoreLabel: "安全",
    pwaInstallTitle: "将 Wykta 添加到主屏幕",
    pwaInstallBody: "安装应用快速访问 — 无需应用商店。",
    pwaInstallBtn: "添加到主屏幕",
    pwaInstallDismiss: "暂不"
  }
}

function currentLanguage(){
  const languageSelect = document.getElementById("language")
  return languageSelect ? languageSelect.value : "en"
}

function normalizeSupportedLanguage(lang){
  // We intentionally collapse locale variants (e.g. fr-CA, zh-TW) to base languages
  // because Wykta currently ships UI/analysis packs for en/fr/de/zh only.
  const normalized = String(lang || "").toLowerCase().slice(0, 2)
  return supportedLanguages.includes(normalized) ? normalized : "en"
}

function t(key, langOverride){
  const lang = normalizeSupportedLanguage(langOverride || currentLanguage())
  return (uiMessages[lang] && uiMessages[lang][key]) || uiMessages.en[key] || key
}

function tf(key, ...args){
  const maybeLang = args.length > 1 ? args[args.length - 1] : undefined
  const lang = typeof maybeLang === "string" && supportedLanguages.includes(maybeLang)
    ? args.pop()
    : undefined
  const template = t(key, lang)
  return typeof template === "function" ? template(...args) : template
}

function detectInputLanguage(text = "", ingredients = []){
  const rawSample = `${String(text || "")}\n${Array.isArray(ingredients) ? ingredients.join(" ") : ""}`
  const sample = rawSample.toLowerCase()
  if(!sample.trim()) return currentLanguage()

  const scores = { en: 0, fr: 0, de: 0, zh: 0 }
  const chineseCharCount = (sample.match(/[\u4e00-\u9fa5]/g) || []).length
  const latinCharCount = (sample.match(/[a-z\u00C0-\u024F]/g) || []).length
  if(chineseCharCount) scores.zh += chineseCharCount * LANGUAGE_SCORE_WEIGHTS.chineseChar
  if(/[äöüß]/i.test(sample)) scores.de += LANGUAGE_SCORE_WEIGHTS.diacriticBonus
  if(/[àâçéèêëîïôûùüÿœæ]/i.test(sample)) scores.fr += LANGUAGE_SCORE_WEIGHTS.diacriticBonus

  // Token-script voting: split into individual ingredient tokens and count how many
  // are predominantly Latin-script vs CJK.  This gives Latin tokens a fair weight
  // against per-character Chinese scoring in mixed inputs
  // (e.g. "aqua, 芦荟, acid, retinol, peptide" → 4 Latin tokens vs 1 CJK → English wins).
  // Reuse ingredientSplitPunctuationPattern plus whitespace as delimiters.
  const tokenWords = rawSample
    .split(ingredientSplitPunctuationPattern)
    .map(tok => tok.trim())
    .filter(tok => tok.length >= 2)
  let latinTokenCount = 0
  let cjkTokenCount = 0
  for (const tok of tokenWords) {
    const cjkChars = (tok.match(/[\u4e00-\u9fa5]/g) || []).length
    const latChars = (tok.match(/[a-zA-Z\u00C0-\u024F]/g) || []).length
    // Skip tokens with equal counts — no clear majority, so don't bias either language.
    if (cjkChars > latChars) cjkTokenCount++
    else if (latChars > cjkChars && latChars > 0) latinTokenCount++
  }
  if (latinTokenCount > 0) scores.en += latinTokenCount * LANGUAGE_SCORE_WEIGHTS.tokenScript
  if (cjkTokenCount > 0) scores.zh += cjkTokenCount * LANGUAGE_SCORE_WEIGHTS.tokenScript

  Object.entries(languageSignalLexicon).forEach(([lang, tokens]) => {
    tokens.forEach((token) => {
      // Use word-boundary matching for Latin tokens to prevent substring false positives
      // (e.g. "et" inside "retinol" incorrectly scoring French; "und" inside "wound").
      const isLatinToken = /[a-z\u00C0-\u024F]/i.test(token)
      const matched = isLatinToken
        ? new RegExp(`\\b${token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(sample)
        : sample.includes(token)
      if(matched) {
        scores[lang] += token.length >= 3
          ? LANGUAGE_SCORE_WEIGHTS.longTokenMatch
          : LANGUAGE_SCORE_WEIGHTS.shortTokenMatch
      }
    })
  })

  Object.entries(ingredientAliasLanguageHints).forEach(([lang, aliasSet]) => {
    aliasSet.forEach((alias) => {
      if(sample.includes(alias)) scores[lang] += LANGUAGE_SCORE_WEIGHTS.aliasMatch
    })
  })

  const ranked = Object.entries(scores).sort((a, b) => b[1] - a[1])
  const [bestLang, bestScore] = ranked[0]
  if(bestScore > 0){
    // Guard against OCR noise where a single stray CJK char appears in otherwise Latin text.
    if(bestLang === "zh" && latinCharCount >= 4 && chineseCharCount <= 1) return "en"
    return bestLang
  }
  if(chineseCharCount > 0) return "zh"
  if(latinCharCount > 0) return "en"
  return currentLanguage()
}

function localizeStaticUI(){
  if(!cachedI18nNodes) cachedI18nNodes = [...document.querySelectorAll("[data-i18n]")]
  if(!cachedI18nPlaceholderNodes) cachedI18nPlaceholderNodes = [...document.querySelectorAll("[data-i18n-placeholder]")]

  cachedI18nNodes.forEach((node) => {
    const key = node.getAttribute("data-i18n")
    if(!key) return
    node.textContent = t(key)
  })

  cachedI18nPlaceholderNodes.forEach((node) => {
    const key = node.getAttribute("data-i18n-placeholder")
    if(!key) return
    node.setAttribute("placeholder", t(key))
  })

  // Sync <html lang> attribute with current UI language
  const lang = currentLanguage()
  document.documentElement.lang = lang

  // Swap <meta name="description"> to the current language
  const metaDesc = document.querySelector('meta[name="description"]')
  if(metaDesc) metaDesc.setAttribute("content", t("metaDescription"))

  // Keep OG and Twitter description in sync with current language
  const ogDesc = document.querySelector('meta[property="og:description"]')
  if(ogDesc) ogDesc.setAttribute("content", t("metaDescription"))
  const twDesc = document.querySelector('meta[name="twitter:description"]')
  if(twDesc) twDesc.setAttribute("content", t("metaDescription"))

  const analysisEl = document.getElementById("ingredientResult")
  const warningEl = document.getElementById("interactionWarnings")
  const analysisPlaceholderValues = Object.values(uiMessages).map(m => m.analysisPlaceholder)
  const warningPlaceholderValues = [
    ...Object.values(uiMessages).map(m => m.warningPlaceholder),
    ...Object.values(uiMessages).map(m => m.noConflicts)
  ]

  if(analysisEl){
    const currentText = analysisEl.innerText.trim()
    if(!analysisEl.children.length && (!currentText || analysisPlaceholderValues.includes(currentText))){
      analysisEl.innerText = t("analysisPlaceholder")
    }
  }

  if(warningEl){
    const currentText = warningEl.innerText.trim()
    if(!currentText || warningPlaceholderValues.includes(currentText)){
      warningEl.innerText = t("warningPlaceholder")
    }
  }
}

function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

function displayAIAnalysis(message, rawLines, options = {}) {
  const el = document.getElementById("ingredientResult")
  if(!el) return
  const lang = normalizeSupportedLanguage(options.lang || currentLanguage())
  const isLoadingState = Boolean(options.isLoading)

  el.innerHTML = ""

  if(message){
    const cls = isLoadingState ? "info" : "error"
    const icon = isLoadingState
      ? `<span class="spinner"></span>`
      : `<span class="warning-icon">${escapeHtml(t("alertTag", lang))}</span>`
    el.insertAdjacentHTML(
      "beforeend",
      `<div class="message-card ${cls}">${icon} ${escapeHtml(message)}</div>`
    )
    return
  }

  if(!Array.isArray(rawLines) || !rawLines.length) return

  const filteredLines = rawLines.filter(l => l.trim())
  let startIdx = 0

  // First line is the section title ("Ingredient Analysis:")
  if(filteredLines[0] && filteredLines[0].trim().endsWith(":") && !filteredLines[0].includes("[")){
    el.insertAdjacentHTML(
      "beforeend",
      `<p class="analysis-heading">${escapeHtml(filteredLines[0])}</p>`
    )
    startIdx = 1
  }

  // Risk keywords across all supported languages.
  // EN: allergen/allergy/avoid/anaphylaxis | FR: allergène | ZH: 过敏原/过敏/避免/禁用 | DE: vermeiden/nicht verwenden
  const dangerWords  = ["allergen", "allergène", "allergy", "avoid", "anaphylax",
                        "过敏原", "过敏", "避免", "禁用", "vermeiden", "nicht verwenden"]
  // EN: irritat/sensitiv/caution/monitor | FR: peut augmenter | ZH: 刺激/敏感/注意/谨慎/失活/慎用 | DE: vorsicht/reizung/kann
  const cautionWords = ["irritat", "sensitiv", "caution", "monitor", "deactivat", "increase skin",
                        "may affect", "peut augmenter", "kann",
                        "刺激", "敏感", "注意", "谨慎", "失活", "慎用",
                        "vorsicht", "reizung", "hautreizung", "nicht empfohlen"]

  filteredLines.slice(startIdx).forEach(line => {
    // Expected format: "name: [Category] detail text"
    const match = line.match(/^(.+?):\s*\[([^\]]+)\]\s*(.*)$/)
    if(match){
      const [, name, category, detail] = match
      const catLower  = category.toLowerCase()
      const detLower  = detail.toLowerCase()
      const nameLower = name.toLowerCase()

      let riskClass = "safe"
      if(dangerWords.some(k => detLower.includes(k) || nameLower.includes(k))){
        riskClass = "danger"
      } else if(cautionWords.some(k => detLower.includes(k))){
        riskClass = "caution"
      }

      let catClass = "general"
      if(/food|aliment|lebensmittel|食品/i.test(catLower)) catClass = "food"
      else if(/skin|soin|haut|护肤/i.test(catLower))       catClass = "skincare"

      el.insertAdjacentHTML("beforeend", `
        <div class="ingredient-card ${riskClass}">
          <span class="ingredient-name">${escapeHtml(name)}</span><span class="ingredient-category ${catClass}">${escapeHtml(category)}</span>
          <span class="ingredient-detail">${escapeHtml(detail)}</span>
        </div>
      `)
    } else if(line.trim()){
      el.insertAdjacentHTML(
        "beforeend",
        `<div class="ingredient-card neutral"><span class="ingredient-detail">${escapeHtml(line)}</span></div>`
      )
    }
  })
}

function stripTagPrefix(tag = "") {
  return String(tag).replace(/^[a-z]{2}:/i, "").replace(/-/g, " ").trim()
}

function sanitizeIngredientTerm(value = "") {
  return String(value)
    .toLowerCase()
    .replace(/\([^)]*\)/g, "")
    .replace(/[^a-z0-9\u00C0-\u024F\u4e00-\u9fa5\s-]/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
}

/* -----------------------
OCR IMAGE PRE-PROCESSING
Adaptive block threshold handles non-uniform lighting better than a fixed
global threshold. Each pixel is thresholded against its block's local mean
minus a small constant offset.
----------------------- */
function applyAdaptiveThreshold(ctx, width, height, blockSize = 48, offset = 10) {
  const imgData = ctx.getImageData(0, 0, width, height)
  const data = imgData.data
  const cols = Math.ceil(width / blockSize)
  const rows = Math.ceil(height / blockSize)
  const blockMeans = new Float32Array(cols * rows)

  for (let br = 0; br < rows; br++) {
    for (let bc = 0; bc < cols; bc++) {
      let sum = 0, n = 0
      for (let dy = 0; dy < blockSize; dy++) {
        const py = br * blockSize + dy
        if (py >= height) break
        for (let dx = 0; dx < blockSize; dx++) {
          const px = bc * blockSize + dx
          if (px >= width) break
          const idx = (py * width + px) * 4
          sum += 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2]
          n++
        }
      }
      blockMeans[br * cols + bc] = n ? sum / n : 128
    }
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4
      const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
      const br = Math.min(Math.floor(y / blockSize), rows - 1)
      const bc = Math.min(Math.floor(x / blockSize), cols - 1)
      const boosted = gray < blockMeans[br * cols + bc] - offset ? 0 : 255
      data[i] = data[i + 1] = data[i + 2] = boosted
    }
  }
  ctx.putImageData(imgData, 0, 0)
}

/* -----------------------
RESULTS SUMMARY BANNER
Counts total, caution, and danger ingredient cards after analysis completes.
----------------------- */
function showResultsSummary(lang = currentLanguage()) {
  const summaryEl = document.getElementById("analysisSummary")
  const resultEl = document.getElementById("ingredientResult")
  const exportEl = document.getElementById("analysisExport")
  if (!summaryEl || !resultEl) return

  const cards = resultEl.querySelectorAll(".ingredient-card")
  if (!cards.length) { summaryEl.style.display = "none"; return }

  const total = cards.length
  const cautionCount = resultEl.querySelectorAll(".ingredient-card.caution").length
  const dangerCount = resultEl.querySelectorAll(".ingredient-card.danger").length
  const flaggedCount = cautionCount + dangerCount

  // Compute 0-100 safety score.
  // Danger ingredients (allergens/avoid) are weighted 2.5× higher than caution
  // ingredients because they pose immediate health risks (e.g. anaphylaxis)
  // versus caution items which are merely inadvisable for some users.
  const safetyScore = Math.max(0, Math.min(100, 100 - dangerCount * 25 - cautionCount * 10))
  const scoreClass = safetyScore >= 75 ? "score-high" : safetyScore >= 45 ? "score-medium" : "score-low"

  const parts = [
    typeof t("resultsSummaryIngredients", lang) === "function"
      ? t("resultsSummaryIngredients", lang)(total)
      : tf("resultsSummaryIngredients", total, lang),
    flaggedCount > 0
      ? (typeof t("resultsSummaryCaution", lang) === "function"
          ? t("resultsSummaryCaution", lang)(flaggedCount)
          : tf("resultsSummaryCaution", flaggedCount, lang))
      : null
  ].filter(Boolean)
  const normalizedLang = normalizeSupportedLanguage(lang)
  const detectedLanguageName = Object.hasOwn(languageNames, normalizedLang) ? languageNames[normalizedLang] : normalizedLang
  parts.push(`${t("languageDetectedLabel", lang)}: ${detectedLanguageName}`)

  // Build badges HTML (safety score + optional Nutri-Score)
  const safetyBadgeHtml = `<span class="safety-score-badge ${escapeHtml(scoreClass)}"><span class="score-label">${escapeHtml(t("safetyScoreLabel", lang))}</span> ${safetyScore}</span>`

  let nutriBadgeHtml = ""
  if (currentNutriScore && /^[a-e]$/.test(currentNutriScore)) {
    const grade = currentNutriScore.toUpperCase()
    nutriBadgeHtml = `<span class="summary-nutri-score ns-${escapeHtml(currentNutriScore)}" title="${escapeHtml(t("nutriScoreLabel", lang))}">Nutri-Score ${escapeHtml(grade)}</span>`
  }

  summaryEl.innerHTML = `<span class="summary-icon">✓</span> ${parts.map(escapeHtml).join(" · ")}${safetyBadgeHtml}${nutriBadgeHtml}`
  summaryEl.className = `analysis-summary ${dangerCount > 0 ? "has-danger" : flaggedCount > 0 ? "has-caution" : "all-clear"}`
  summaryEl.style.display = ""
  if (exportEl) exportEl.style.display = ""
}

function buildAnalysisReportText(lang = currentLanguage()) {
  const summaryEl = document.getElementById("analysisSummary")
  const analysisEl = document.getElementById("ingredientResult")
  const warningsEl = document.getElementById("interactionWarnings")
  // Strip HTML from summary to get plain text for export
  const summaryText = summaryEl ? (summaryEl.innerText || summaryEl.textContent || "").trim() : ""
  const analysisText = analysisEl ? analysisEl.innerText.trim() : ""
  const warningsText = warningsEl ? warningsEl.innerText.trim() : ""

  if (!analysisText || analysisText === t("analysisPlaceholder", lang)) return ""

  return [
    "Wykta Ingredient Report",
    summaryText ? `Summary: ${summaryText}` : "",
    "",
    "Analysis",
    analysisText,
    "",
    "Warnings",
    warningsText || t("warningPlaceholder", lang),
    "",
    `Generated: ${new Date().toLocaleString()}`
  ].filter(Boolean).join("\n")
}

function exportAnalysisPdf() {
  trackEvent('PDF', 'Export', 'pdf')
  const lang = currentLanguage()
  const reportText = buildAnalysisReportText(lang)
  if (!reportText) {
    window.alert(t("exportEmptyError", lang))
    return
  }

  const reportHtml = reportText
    .split("\n")
    .map(line => `<p>${escapeHtml(line)}</p>`)
    .join("")
  const popup = window.open("", "_blank", "noopener,noreferrer,width=900,height=720")
  if (!popup) return
  popup.document.write(`<!doctype html><html><head><title>Wykta Report</title><style>body{font-family:Arial,sans-serif;padding:24px;color:#1f2937}p{margin:0 0 10px;line-height:1.5}</style></head><body>${reportHtml}</body></html>`)
  popup.document.close()
  popup.focus()
  popup.print()
}

async function shareAnalysisResult() {
  trackEvent('Share', 'Share', 'share')
  const lang = currentLanguage()
  const reportText = buildAnalysisReportText(lang)
  if (!reportText) {
    window.alert(t("exportEmptyError", lang))
    return
  }

  if (navigator.share) {
    try {
      await navigator.share({
        title: "Wykta Ingredient Report",
        text: reportText
      })
      return
    } catch (error) {
      if (error && error.name === "AbortError") return
    }
  }

  if (navigator.clipboard && navigator.clipboard.writeText) {
    await navigator.clipboard.writeText(reportText)
    window.alert(t("shareSuccess", lang))
    return
  }

  window.alert(t("shareUnsupported", lang))
}

async function fetchJsonWithTimeout(url, timeoutMs = 7000) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(url, { signal: controller.signal })
    if(!response.ok) {
      const parsedUrl = new URL(url)
      const endpoint = `${parsedUrl.origin}${parsedUrl.pathname}`
      throw new Error(`HTTP ${response.status} ${response.statusText} (${endpoint})`)
    }
    return await response.json()
  } finally {
    clearTimeout(timeout)
  }
}

function getBestProductMatch(products = [], ingredient) {
  if(!products.length) return null
  const normalizedIngredient = sanitizeIngredientTerm(ingredient)
  if(!normalizedIngredient) return null

  for (const product of products) {
    const ingredientsText = sanitizeIngredientTerm(product.ingredients_text || product.ingredients_text_en || "")
    if(ingredientsText.includes(normalizedIngredient)) return product
  }
  return products[0]
}

async function lookupOpenFoodFacts(ingredient, lang = currentLanguage()) {
  const cacheKey = `off|${sanitizeIngredientTerm(ingredient)}`
  const cached = getCachedLookup(cacheKey)
  if (cached !== undefined) {
    if (!cached) return null
    // Rebuild localized labels from stored raw values on every retrieval.
    const notes = [
      `${t("sourceLabel", lang)}: Open Food Facts`,
      `${t("seenInLabel", lang)}: ${cached.productName}`
    ]
    if(cached.allergenTags && cached.allergenTags.length) notes.push(`${t("allergenIndicatorsLabel", lang)}: ${cached.allergenTags.join(", ")}`)
    if(cached.processingTag) notes.push(`${t("ingredientAnalysisTagLabel", lang)}: ${cached.processingTag}`)
    return { category: t("foodCategory", lang), detail: notes.join(" · ") }
  }

  const params = new URLSearchParams({
    search_terms: ingredient,
    search_simple: "1",
    action: "process",
    json: "1",
    page_size: "8",
    fields: "product_name,ingredients_text,ingredients_text_en,ingredients_analysis_tags,allergens_tags"
  })
  const url = `https://world.openfoodfacts.org/cgi/search.pl?${params.toString()}`
  const data = await fetchJsonWithTimeout(url)
  const match = getBestProductMatch(data.products || [], ingredient)
  if(!match) {
    setCachedLookup(cacheKey, null)
    return null
  }

  const productName = match.product_name || "N/A"
  const allergenTags = Array.isArray(match.allergens_tags)
    ? [...new Set(match.allergens_tags.map(stripTagPrefix).filter(Boolean))].slice(0, 3)
    : []
  const processingTag = Array.isArray(match.ingredients_analysis_tags) && match.ingredients_analysis_tags.length
    ? stripTagPrefix(match.ingredients_analysis_tags[0])
    : null

  // Store only raw data values — labels are rebuilt with the correct language on every retrieval.
  setCachedLookup(cacheKey, { productName, allergenTags, processingTag })

  const notes = [
    `${t("sourceLabel", lang)}: Open Food Facts`,
    `${t("seenInLabel", lang)}: ${productName}`
  ]
  if(allergenTags.length) notes.push(`${t("allergenIndicatorsLabel", lang)}: ${allergenTags.join(", ")}`)
  if(processingTag) notes.push(`${t("ingredientAnalysisTagLabel", lang)}: ${processingTag}`)

  return {
    category: t("foodCategory", lang),
    detail: notes.join(" · ")
  }
}

async function lookupOpenBeautyFacts(ingredient, lang = currentLanguage()) {
  const cacheKey = `obf|${sanitizeIngredientTerm(ingredient)}`
  const cached = getCachedLookup(cacheKey)
  if (cached !== undefined) {
    if (!cached) return null
    // Rebuild localized labels from stored raw values on every retrieval.
    const notes = [
      `${t("sourceLabel", lang)}: Open Beauty Facts`,
      `${t("seenInLabel", lang)}: ${cached.productName}`
    ]
    if(cached.categoryTag) notes.push(`${t("productTypeLabel", lang)}: ${cached.categoryTag}`)
    if(cached.ingredientTag) notes.push(`${t("ingredientTagLabel", lang)}: ${cached.ingredientTag}`)
    return { category: t("skincareCategory", lang), detail: notes.join(" · ") }
  }

  const params = new URLSearchParams({
    search_terms: ingredient,
    search_simple: "1",
    action: "process",
    json: "1",
    page_size: "8",
    fields: "product_name,ingredients_text,ingredients_text_en,categories_tags,ingredients_analysis_tags"
  })
  const url = `https://world.openbeautyfacts.org/cgi/search.pl?${params.toString()}`
  const data = await fetchJsonWithTimeout(url)
  const match = getBestProductMatch(data.products || [], ingredient)
  if(!match) {
    setCachedLookup(cacheKey, null)
    return null
  }

  const productName = match.product_name || "N/A"
  const categoryTag = Array.isArray(match.categories_tags) && match.categories_tags.length
    ? stripTagPrefix(match.categories_tags[0])
    : null
  const ingredientTag = Array.isArray(match.ingredients_analysis_tags) && match.ingredients_analysis_tags.length
    ? stripTagPrefix(match.ingredients_analysis_tags[0])
    : null

  // Store only raw data values — labels are rebuilt with the correct language on every retrieval.
  setCachedLookup(cacheKey, { productName, categoryTag, ingredientTag })

  const notes = [
    `${t("sourceLabel", lang)}: Open Beauty Facts`,
    `${t("seenInLabel", lang)}: ${productName}`
  ]
  if(categoryTag) notes.push(`${t("productTypeLabel", lang)}: ${categoryTag}`)
  if(ingredientTag) notes.push(`${t("ingredientTagLabel", lang)}: ${ingredientTag}`)

  return {
    category: t("skincareCategory", lang),
    detail: notes.join(" · ")
  }
}

function lookupLocalIngredientDb(ingredient, lang = currentLanguage()) {
  const key = sanitizeIngredientTerm(ingredient)
  const entry = localIngredientDb[key]
  if (!entry) return null

  const catMap = {
    skincare: t("skincareCategory", lang),
    food:     t("foodCategory", lang),
    general:  t("generalCategory", lang)
  }
  return {
    category: catMap[entry.category] || t("generalCategory", lang),
    detail:   `${entry.fn}: ${entry.note}`
  }
}

async function lookupOFFIngredientTaxonomy(ingredient, lang = currentLanguage()) {
  const slug = sanitizeIngredientTerm(ingredient).replace(/\s+/g, "-")
  if (!slug) return null

  const cacheKey = `offtax|${slug}`
  const cached = getCachedLookup(cacheKey)
  if (cached !== undefined) {
    if (!cached) return null
    // Rebuild localized labels from stored raw values on every retrieval.
    const notes = [
      `${t("sourceLabel", lang)}: Open Food Facts ingredient taxonomy`,
      `${t("ingredientLabel", lang)}: ${cached.ingredientName}`
    ]
    if (cached.wikidata) notes.push(`${t("wikidataLabel", lang)}: ${cached.wikidata}`)
    return { category: t("foodCategory", lang), detail: notes.join(" · ") }
  }

  const url = `https://world.openfoodfacts.org/ingredient/${encodeURIComponent(slug)}.json`
  const data = await fetchJsonWithTimeout(url, 6000)
  // OFF ingredient taxonomy response includes fields like name, wikidata, parents, children
  if (!data || (!data.name && !data.wikidata && !data.id)) {
    setCachedLookup(cacheKey, null)
    return null
  }

  const ingredientName = data.name || slug
  const wikidata = data.wikidata || null
  // Store only raw data values — labels are rebuilt with the correct language on every retrieval.
  setCachedLookup(cacheKey, { ingredientName, wikidata })

  const notes = [
    `${t("sourceLabel", lang)}: Open Food Facts ingredient taxonomy`,
    `${t("ingredientLabel", lang)}: ${ingredientName}`
  ]
  if (wikidata) notes.push(`${t("wikidataLabel", lang)}: ${wikidata}`)

  return {
    category: t("foodCategory", lang),
    detail:   notes.join(" · ")
  }
}

function getWikidataLanguageCode(lang = "en") {
  const map = {
    en: "en",
    fr: "fr",
    de: "de",
    zh: "zh"
  }
  return map[lang] || "en"
}

async function lookupWikidataIngredient(ingredient, lang = currentLanguage()) {
  const normalizedIngredient = normalizeIngredientName(ingredient)
  if(!normalizedIngredient) return null

  const selectedLanguage = getWikidataLanguageCode(lang)
  // Include language in cache key so English/French/German/Chinese lookups
  // each receive their own cached label and description.
  const cacheKey = `wikidata|${normalizedIngredient}|${selectedLanguage}`
  const cachedEntry = getCachedLookup(cacheKey)
  if (cachedEntry !== undefined) {
    if (!cachedEntry) return null
    return {
      category: t("generalCategory", lang),
      detail: [
        `${t("sourceLabel", lang)}: Wikidata`,
        `${t("entityLabel", lang)}: ${cachedEntry.label}`,
        `${t("descriptionLabel", lang)}: ${cachedEntry.description}`,
        ...(cachedEntry.id ? [`${t("wikidataLabel", lang)}: ${cachedEntry.id}`] : [])
      ].join(" · ")
    }
  }

  // Query only the detected language first, then fall back to English.
  // Avoids 3 extra parallel requests per ingredient across all supported languages.
  const languagePriority = [...new Set([selectedLanguage, "en"])]
  const wikimediaNoisePattern = /\b(wikimedia|disambiguation|template)\b/i

  const results = await Promise.allSettled(languagePriority.map(async (languageCode) => {
    const params = new URLSearchParams({
      action: "wbsearchentities",
      search: normalizedIngredient,
      language: languageCode,
      format: "json",
      limit: "5",
      origin: "*"
    })
    const url = `https://www.wikidata.org/w/api.php?${params.toString()}`
    const data = await fetchJsonWithTimeout(url, WIKIDATA_TIMEOUT_MS)
    if(!data || !Array.isArray(data.search) || !data.search.length) return null

    const preferredMatch = data.search.find((candidate) => {
      const description = String(candidate.description || "").trim()
      return description && !wikimediaNoisePattern.test(description)
    })

    return preferredMatch || data.search[0]
  }))

  const firstHit = results
    .filter((result) => result.status === "fulfilled" && result.value)
    .map((result) => result.value)[0]

  if(!firstHit) {
    setCachedLookup(cacheKey, null)
    return null
  }

  const label = firstHit.label || normalizedIngredient
  const description = firstHit.description || t("wikidataNoDescription", lang)
  setCachedLookup(cacheKey, { label, description: firstHit.description || "", id: firstHit.id || null })
  const notes = [
    `${t("sourceLabel", lang)}: Wikidata`,
    `${t("entityLabel", lang)}: ${label}`,
    `${t("descriptionLabel", lang)}: ${description}`
  ]
  if(firstHit.id) notes.push(`${t("wikidataLabel", lang)}: ${firstHit.id}`)

  return {
    category: t("generalCategory", lang),
    detail: notes.join(" · ")
  }
}

async function analyzeWithFreeDatabases(ingredients, lang = currentLanguage(), displayNameMap = {}) {
  const lines = [`${t("fallbackHeader", lang)}:`]

  const analysisLines = await Promise.all(ingredients.map(async (ingredient) => {
    // Use the original user-typed token for display name and per-ingredient language detection.
    // e.g. normalized "aloe vera" from "芦荟" → displayName="芦荟", ingredientLang="zh"
    const displayName = displayNameMap[ingredient] || ingredient
    const ingredientLang = normalizeSupportedLanguage(detectInputLanguage(displayName))

    // 1. Check embedded local database first (instant, no network required)
    const localResult = lookupLocalIngredientDb(ingredient, ingredientLang)
    if (localResult) {
      return `${displayName}: [${localResult.category}] ${localResult.detail}`
    }

    // 2. Try OFF ingredient taxonomy, OFF/OBF product search, and Wikidata in parallel.
    const [offTaxResult, foodResult, beautyResult, wikidataResult] = await Promise.allSettled([
      lookupOFFIngredientTaxonomy(ingredient, ingredientLang),
      lookupOpenFoodFacts(ingredient, ingredientLang),
      lookupOpenBeautyFacts(ingredient, ingredientLang),
      lookupWikidataIngredient(ingredient, ingredientLang)
    ])

    const firstHit = [
      offTaxResult.status  === "fulfilled" ? offTaxResult.value  : null,
      foodResult.status    === "fulfilled" ? foodResult.value    : null,
      beautyResult.status  === "fulfilled" ? beautyResult.value  : null,
      wikidataResult.status === "fulfilled" ? wikidataResult.value : null
    ].find(Boolean)

    const detail = firstHit
      ? firstHit
        : {
          category: t("generalCategory", ingredientLang),
          detail: `${t("noPublicData", ingredientLang)} ${t("publicDbSourceNote", ingredientLang)}`
        }

    return `${displayName}: [${detail.category}] ${detail.detail}`
  }))
  lines.push(...analysisLines)

  return lines.join("\n")
}


/* -----------------------
AI ANALYSIS
----------------------- */

async function analyzeWithAI(ingredients, analysisLang = currentLanguage(), displayNameMap = {}){
  const normalizedAnalysisLang = normalizeSupportedLanguage(analysisLang)
  if(!Array.isArray(ingredients) || !ingredients.length){
    displayAIAnalysis(t("analysisPlaceholder", normalizedAnalysisLang), [], { lang: normalizedAnalysisLang })
    return "local"
  }

  displayAIAnalysis(t("analyzing", normalizedAnalysisLang), [], { lang: normalizedAnalysisLang, isLoading: true })

  // Send original user-typed names to the AI so it can respond per-ingredient
  // in the language the user wrote each ingredient (e.g. "芦荟" → Chinese reply).
  const ingredientsForAI = ingredients.map(i => displayNameMap[i] || i)

  if(supabaseClient){
    let invokeTimeoutId = null
    try{
      const langName = languageNames[normalizedAnalysisLang] || normalizedAnalysisLang
      const langLocale = languageLocales[normalizedAnalysisLang] || normalizedAnalysisLang

      // Race the invoke against a 12-second timeout so a cold-start or paused
      // Supabase project doesn't leave the UI stuck at "Analyzing..." indefinitely.
      const invokePromise = supabaseClient.functions.invoke(
        "wykta-backend",
        {
          body: {
            ingredients: ingredientsForAI,
            lang: langLocale,
            targetLanguage: langName,
            promptLanguage: langName,
            sessionId: getOrCreateSessionId()
          }
        }
      )
      const timeoutPromise = new Promise((_, reject) => {
        invokeTimeoutId = setTimeout(
          () => reject(new Error("Edge function timed out after 12 seconds")),
          12000
        )
      })

      const { data, error } = await Promise.race([invokePromise, timeoutPromise])
      clearTimeout(invokeTimeoutId)

      if(error) throw error

      console.log("AI result:", data)

      // Server indicated the free daily limit has been reached — fall through to
      // open-database analysis and show an upgrade prompt.
      if(data && data.limitReached){
        console.warn("Daily AI limit reached for this session.")
        showFreeLimitBanner(normalizedAnalysisLang)
        // Continue to open-database fallback below (do not return "ai").
      } else if(data && data.analysis){
        const lines = data.analysis.split("\n")
        displayAIAnalysis("", lines, { lang: normalizedAnalysisLang })
        return "ai"
      } else {
        console.warn(tf("noAnalysisFor", langName, normalizedAnalysisLang))
      }
    } catch(err){
      clearTimeout(invokeTimeoutId)
      console.error("AI function error, using open databases fallback:", err)
    }
  }

  try{
    const fallbackAnalysis = await analyzeWithFreeDatabases(ingredients, normalizedAnalysisLang, displayNameMap)
    displayAIAnalysis("", fallbackAnalysis.split("\n"), { lang: normalizedAnalysisLang })
  } catch(err){
    console.error("Public database lookup error:", err)
    displayAIAnalysis(t("failed", normalizedAnalysisLang), [], { lang: normalizedAnalysisLang })
  }
  return "local"
}

/* -----------------------
ANALYZE BUTTON LOADING STATE
----------------------- */

/* -----------------------
FREE TIER LIMIT BANNER
Shows when the server returns limitReached: true.
Prompts the user to upgrade to Pro.
----------------------- */

function showFreeLimitBanner(lang) {
  const bannerMessages = {
    en: { text: "You've reached the daily limit of 5 AI analyses (free tier). Results below use open databases. Upgrade to Pro for unlimited AI scans.", cta: "Upgrade to Pro →", href: "checkout.html?plan=pro-monthly" },
    fr: { text: "Vous avez atteint la limite quotidienne de 5 analyses IA (offre gratuite). Les résultats ci-dessous proviennent des bases ouvertes. Passez à Pro pour des analyses illimitées.", cta: "Passer à Pro →", href: "checkout.html?plan=pro-monthly" },
    de: { text: "Sie haben das Tageslimit von 5 KI-Analysen (kostenloses Kontingent) erreicht. Die folgenden Ergebnisse stammen aus offenen Datenbanken. Upgraden Sie auf Pro für unbegrenzte Analysen.", cta: "Auf Pro upgraden →", href: "checkout.html?plan=pro-monthly" },
    zh: { text: "您已达到每日5次AI分析的免费用量上限，以下结果来自开放数据库。升级专业版以获得无限次AI分析。", cta: "立即升级专业版 →", href: "checkout.html?plan=pro-monthly" },
  }
  const m = bannerMessages[lang] || bannerMessages.en
  let banner = document.getElementById("freeLimitBanner")
  if (!banner) {
    banner = document.createElement("div")
    banner.id = "freeLimitBanner"
    banner.style.cssText = "background:rgba(255,200,0,0.13);border:1px solid rgba(220,160,0,0.35);border-radius:10px;padding:12px 16px;margin:12px 0;font-size:13px;color:var(--text-2);display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;"
    const resultsSection = document.getElementById("resultsSection")
    if (resultsSection) resultsSection.prepend(banner)
  }
  banner.innerHTML = `<span>${m.text}</span><a href="${m.href}" style="white-space:nowrap;font-weight:700;color:var(--brand);text-decoration:none;">${m.cta}</a>`
  banner.style.display = ""
}


function setAnalyzeBtnLoading(isLoading){
  const btn = document.getElementById("analyzeBtn")
  if(!btn) return

  const icon    = btn.querySelector(".btn-icon")
  const btnText = btn.querySelector("[data-i18n='analyzeButton']")
  if(icon && !icon.dataset.defaultHtml) icon.dataset.defaultHtml = icon.innerHTML

  if(isLoading){
    btn.disabled = true
    if(icon) icon.style.display = "none"
    if(!btn.querySelector(".spinner")){
      btn.insertAdjacentHTML("afterbegin", '<span class="spinner" id="analyzeBtnSpinner"></span>')
    }
  } else {
    btn.disabled = false
    const spinner = document.getElementById("analyzeBtnSpinner")
    if(spinner) spinner.remove()
    if(icon){
      icon.style.display = ""
      if(icon.dataset.defaultHtml) icon.innerHTML = icon.dataset.defaultHtml
    }
    if(btnText) btnText.textContent = t("analyzeButton")
  }
}

/* -----------------------
MAIN ANALYSIS BUTTON
----------------------- */

async function analyzeIngredients(){
  trackEvent('Ingredient', 'Analyze', 'manual')
  const resultsSection = document.getElementById("resultsSection")
  if(resultsSection) resultsSection.style.display = ""

  // Clear Nutri-Score if the product info banner is hidden
  // (means this is a manual analysis, not from a barcode scan)
  const productBanner = document.getElementById("productInfoBanner")
  if (!productBanner || productBanner.style.display === "none" || !productBanner.innerHTML.trim()) {
    currentNutriScore = null
  }

  setAnalyzeBtnLoading(true)

  let analysisLanguage = currentLanguage()
  try {
    const text = document.getElementById("ingredients").value
    const ingredients = extractIngredients(text)
    analysisLanguage = detectInputLanguage(text, ingredients)
    const warnings = checkInteractions(ingredients, analysisLanguage)

    // Build a map from normalized ingredient key → original user-typed token.
    // This preserves the input language and display name (e.g. "芦荟" instead of "aloe vera")
    // for per-ingredient language detection and display in the results.
    const displayNameMap = {}
    const scriptBoundaryNormalized = (text || "")
      .replace(/([\u4e00-\u9fa5])([a-z\u00C0-\u024F0-9])/giu, "$1, $2")
      .replace(/([a-z\u00C0-\u024F0-9])([\u4e00-\u9fa5])/giu, "$1, $2")
    const rawTokens = scriptBoundaryNormalized
      .split(ingredientSplitPunctuationPattern)
      .flatMap(seg => seg.split(multilingualIngredientJoinerPattern))
      .map(tok => tok.trim())
      .filter(Boolean)
    for (const raw of rawTokens) {
      const normalized = normalizeIngredientName(raw)
      if (normalized && !displayNameMap[normalized]) {
        displayNameMap[normalized] = raw
      }
    }

    displayInteractions(warnings, analysisLanguage)

    await saveResult(text, warnings.join("; "))
    const analysisSource = await analyzeWithAI(ingredients, analysisLanguage, displayNameMap)
    showResultsSummary(analysisLanguage)

    // Record anonymous scan telemetry (no PII: no ingredient text stored)
    const resultEl = document.getElementById("ingredientResult")
    const allergenCount = resultEl
      ? resultEl.querySelectorAll(".ingredient-card.danger").length
      : 0
    recordScanEvent({
      ingredientCount: ingredients.length,
      inputLang:       analysisLanguage,
      analysisSource:  analysisSource || "local",
      warningCount:    warnings.length,
      allergenCount,
      lang:            currentLanguage()
    })
  } catch (err) {
    console.error("Analyze flow error:", err)
    displayAIAnalysis(t("failed", analysisLanguage), [])
  } finally {
    setAnalyzeBtnLoading(false)
  }
}

/* -----------------------
CAMERA SCAN
----------------------- */

let stream

// Barcode scanning state
let barcodeZxingControls = null
let currentNutriScore = null

/* -----------------------
BARCODE PRODUCT LOOKUP
Fetches product details from Open Food Facts by EAN/UPC barcode.
Returns { name, ingredients, nutriScore } or null.
----------------------- */

async function lookupProductByBarcode(barcode) {
  const url = `https://world.openfoodfacts.org/product/${encodeURIComponent(barcode)}.json`
  try {
    const data = await fetchJsonWithTimeout(url, 9000)
    if (!data || data.status !== 1 || !data.product) return null
    const p = data.product
    const name = p.product_name_en || p.product_name || ""
    const ingredients = p.ingredients_text_en || p.ingredients_text || ""
    const nutriScore = (p.nutrition_grades || "").toLowerCase().trim() || null
    return { name: name.trim(), ingredients: ingredients.trim(), nutriScore }
  } catch (err) {
    console.warn("Barcode OFF lookup failed:", err)
    return null
  }
}

/* -----------------------
SHOW PRODUCT INFO BANNER
Displays the product name + Nutri-Score badge after a barcode scan.
----------------------- */

function showProductInfoBanner(name, nutriScore, lang = currentLanguage()) {
  currentNutriScore = nutriScore || null
  const banner = document.getElementById("productInfoBanner")
  if (!banner) return

  let html = ""
  if (name) {
    html += `<span class="product-info-name">${escapeHtml(name)}</span>`
  }
  if (nutriScore && /^[a-e]$/.test(nutriScore)) {
    const grade = nutriScore.toUpperCase()
    html += `<span class="nutri-score-badge nutri-score-${nutriScore}" title="${escapeHtml(t("nutriScoreLabel", lang))}"><span class="ns-label">Nutri-Score</span> ${escapeHtml(grade)}</span>`
  }

  banner.innerHTML = html
  banner.style.display = html ? "" : "none"
}

/* -----------------------
STOP BARCODE SCANNING
Stops any active ZXing reader and hides the overlay.
----------------------- */

function stopBarcodeScanning() {
  if (barcodeZxingControls) {
    try { barcodeZxingControls.stop() } catch (e) {}
    barcodeZxingControls = null
  }
  const overlay = document.getElementById("barcodeOverlay")
  if (overlay) overlay.style.display = "none"
  const btn = document.getElementById("scanBarcodeBtn")
  if (btn) btn.disabled = false
}

/* -----------------------
BARCODE SCAN (ZXing)
Starts camera + ZXing multi-format barcode reader.
On detection: stops reader, looks up product on OFF, fills form, triggers analysis.
----------------------- */

async function scanBarcode() {
  trackEvent('Barcode', 'Scan', 'barcode')
  const lang = currentLanguage()

  if (typeof ZXing === "undefined") {
    const ocrEl = document.getElementById("ocrResult")
    if (ocrEl) {
      ocrEl.innerText = "ZXing library not loaded."
      ocrEl.classList.add("visible")
    }
    return
  }

  // Stop any existing scan
  stopBarcodeScanning()

  // Start camera if not already running
  if (!stream || stream.getTracks().every(track => track.readyState === "ended")) {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error(t("cameraAccessFailed", lang))
      }
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 } }
      })
      const video = document.getElementById("camera")
      video.srcObject = stream
      await video.play()
      const placeholder = document.getElementById("cameraPlaceholder")
      if (placeholder) placeholder.style.display = "none"
    } catch (err) {
      console.error("Camera error for barcode scan:", err)
      const ocrEl = document.getElementById("ocrResult")
      if (ocrEl) {
        ocrEl.innerText = t("cameraAccessFailed", lang)
        ocrEl.classList.add("visible")
      }
      return
    }
  }

  // Show barcode overlay
  const overlay = document.getElementById("barcodeOverlay")
  const scanningLabel = document.getElementById("barcodeScanningLabel")
  if (overlay) overlay.style.display = ""
  if (scanningLabel) scanningLabel.textContent = t("barcodeScanning", lang)

  const btn = document.getElementById("scanBarcodeBtn")
  if (btn) btn.disabled = true

  const video = document.getElementById("camera")
  const codeReader = new ZXing.BrowserMultiFormatReader()

  try {
    barcodeZxingControls = await codeReader.decodeFromVideoElement(video, async (result, err) => {
      if (!result) return
      const barcode = result.getText()
      if (!barcode) return

      // Stop scanning immediately on first result
      stopBarcodeScanning()
      trackEvent('Barcode', 'Detected', barcode)

      const ocrEl = document.getElementById("ocrResult")
      if (ocrEl) {
        ocrEl.innerText = `${t("barcodeProductFound", lang)}: ${barcode}`
        ocrEl.classList.add("visible")
      }

      // Look up product on OFF
      const product = await lookupProductByBarcode(barcode)
      if (!product || !product.ingredients) {
        if (ocrEl) ocrEl.innerText = t("barcodeNotFound", lang)
        showProductInfoBanner("", null, lang)
        return
      }

      // Display product info and Nutri-Score
      showProductInfoBanner(product.name, product.nutriScore, lang)

      // Populate ingredients textarea
      const textarea = document.getElementById("ingredients")
      if (textarea) textarea.value = product.ingredients

      if (ocrEl) {
        ocrEl.innerText = t("barcodeIngredientsLoaded", lang)
      }

      // Auto-trigger analysis
      await analyzeIngredients()
    })
  } catch (err) {
    console.error("ZXing barcode scan error:", err)
    stopBarcodeScanning()
    const ocrEl = document.getElementById("ocrResult")
    if (ocrEl) {
      ocrEl.innerText = t("cameraAccessFailed", lang)
      ocrEl.classList.add("visible")
    }
  }
}

async function startScan(){
  trackEvent('Camera', 'Open', 'camera')
try{
if(!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia){
  throw new Error(t("cameraAccessFailed"))
}

stream = await navigator.mediaDevices.getUserMedia({
video: {
  facingMode: { ideal: "environment" },
  width: { ideal: 1920 },
  height: { ideal: 1080 }
}
})

const video = document.getElementById("camera")

video.srcObject = stream
await video.play()

const placeholder = document.getElementById("cameraPlaceholder")
if(placeholder) placeholder.style.display = "none"

}catch(err){

console.error("Camera error:", err)
const ocrEl = document.getElementById("ocrResult")
if(ocrEl){
  ocrEl.innerText = t("cameraAccessFailed")
  ocrEl.classList.add("visible")
}

}

}

/* -----------------------
CAPTURE IMAGE
----------------------- */

async function capture(){

const video = document.getElementById("camera")
const canvas = document.getElementById("snapshot")
const ocrEl = document.getElementById("ocrResult")

if(!video || !canvas || !video.videoWidth || !video.videoHeight){
  if(ocrEl){
    ocrEl.innerText = t("cameraAccessFailed")
    ocrEl.classList.add("visible")
  }
  return
}

const ctx = canvas.getContext("2d")

canvas.width = video.videoWidth
canvas.height = video.videoHeight

ctx.drawImage(video, 0, 0)

if(stream){
stream.getTracks().forEach(track => track.stop())
}

if(ocrEl){
  ocrEl.innerText = t("ocrProcessing")
  ocrEl.classList.add("visible")
}

runOCR(canvas)

}

/* -----------------------
OCR TEXT RECOGNITION
----------------------- */
async function runOCR(canvas) {
  try {
    const processedCanvas = document.createElement("canvas")
    processedCanvas.width = canvas.width
    processedCanvas.height = canvas.height
    const processedCtx = processedCanvas.getContext("2d")
    if(processedCtx){
      processedCtx.drawImage(canvas, 0, 0)
      applyAdaptiveThreshold(processedCtx, processedCanvas.width, processedCanvas.height)
    }

    const selectedLang = currentLanguage()
    const primaryOcrLang = ocrPrimaryLanguagePack[selectedLang] || ocrLanguageCodes[selectedLang] || "eng"
    const backupOcrLang = ocrBackupLanguagePack[selectedLang] || "eng+chi_sim+fra+deu"
    const { data } = await Tesseract.recognize(processedCanvas, primaryOcrLang)
    let text = data.text || ""

    const primaryIngredientCount = extractIngredients(text).length
    if(primaryIngredientCount < 2 && backupOcrLang !== primaryOcrLang){
      const { data: backupData } = await Tesseract.recognize(processedCanvas, backupOcrLang)
      const backupText = backupData.text || ""
      const backupIngredientCount = extractIngredients(backupText).length
      if(
        backupIngredientCount > primaryIngredientCount ||
        (backupIngredientCount === primaryIngredientCount && backupText.length > text.length)
      ){
        text = backupText
      }
    }

    const ocrEl = document.getElementById("ocrResult")
    if(ocrEl){
      ocrEl.innerText = text
      ocrEl.classList.add("visible")
    }
    document.getElementById("ingredients").value = text

    await analyzeIngredients()
  } catch (err) {
    console.error("OCR error:", err)
    const ocrEl = document.getElementById("ocrResult")
    if(ocrEl){
      ocrEl.innerText = t("ocrFailed")
      ocrEl.classList.add("visible")
    }
  }
}

function formatLocalizedPrice(amount, lang = currentLanguage()) {
  const normalizedLang = normalizeSupportedLanguage(lang)
  const pricing = marketPricing[normalizedLang] || marketPricing.en
  const locale = languageLocales[normalizedLang] || "en"
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: pricing.currency,
    maximumFractionDigits: pricing.currency === "CNY" ? 0 : 2
  }).format(amount)
}

function getCheckoutHrefForPlan(plan, lang = currentLanguage()) {
  const normalizedLang = normalizeSupportedLanguage(lang)
  return `checkout.html?plan=${encodeURIComponent(plan)}&lang=${encodeURIComponent(normalizedLang)}`
}

function withLangQuery(href, lang = currentLanguage()) {
  if (!href || href.startsWith("#")) return href
  if (/^(mailto:|tel:|javascript:)/i.test(href)) return href
  try {
    const normalizedLang = normalizeSupportedLanguage(lang)
    const url = new URL(href, window.location.href)
    if (url.origin !== window.location.origin) return href
    const page = url.pathname.split("/").pop() || "index.html"
    const localPages = new Set(["index.html", "checkout.html", "contact-sales.html", "community.html", "payment-success.html"])
    if (!localPages.has(page)) return href
    url.searchParams.set("lang", normalizedLang)
    return `${url.pathname}${url.search}${url.hash}`
  } catch (err) {
    return href
  }
}

function localizeInternalLinks(lang = currentLanguage()) {
  document.querySelectorAll("a[href]").forEach((el) => {
    const href = el.getAttribute("href")
    const localizedHref = withLangQuery(href, lang)
    if (localizedHref && localizedHref !== href) {
      el.setAttribute("href", localizedHref)
    }
  })
}

document.addEventListener("DOMContentLoaded", () => {
  // UTM parameter capture + retention
  ;(function captureUTM() {
    const p = new URLSearchParams(window.location.search)
    const utmKeys = ['utm_source','utm_medium','utm_campaign','utm_content','utm_term']
    utmKeys.forEach(k => {
      const v = p.get(k)
      if (v) {
        try { sessionStorage.setItem(k, v) } catch(e) {}
      }
    })
    // Attach UTMs to all checkout links
    document.querySelectorAll('a[href*="checkout.html"]').forEach(el => {
      try {
        const rawHref = el.getAttribute("href")
        if (!rawHref) return
        const url = new URL(rawHref, window.location.href)
        utmKeys.forEach(k => {
          const v = sessionStorage.getItem(k)
          if (v) url.searchParams.set(k, v)
        })
        el.href = url.toString()
      } catch(e) {}
    })
  })()
  const languageSelect = document.getElementById("language")
  const urlParams = new URLSearchParams(window.location.search)
  const urlLangRaw = urlParams.get("lang")
  const storedLangRaw = localStorage.getItem("wykta_lang")
  const initialLang = normalizeSupportedLanguage(urlLangRaw || storedLangRaw || navigator.language || "en")
  if (languageSelect) languageSelect.value = initialLang
  localStorage.setItem("wykta_lang", initialLang)
  localizeStaticUI()
  localizeInternalLinks(initialLang)
  if(languageSelect){
    languageSelect.addEventListener("change", () => {
      const lang = normalizeSupportedLanguage(currentLanguage())
      localStorage.setItem("wykta_lang", lang)
      localizeStaticUI()
      localizeInternalLinks(lang)
      const isAnnual = annualBtn ? annualBtn.classList.contains("active") : false
      setBilling(isAnnual)
    })
  }

  // Billing toggle: switch Pro card price between monthly and annual
  const monthlyBtn = document.getElementById("billingMonthlyBtn")
  const annualBtn = document.getElementById("billingAnnualBtn")
  const proPriceEl = document.getElementById("proPriceDisplay")
  const proPeriodEl = document.getElementById("proPeriodDisplay")
  const discountBadge = document.getElementById("billingDiscountBadge")
  const planProCta = document.getElementById("planProCta")
  const ctaGetProBtn = document.getElementById("ctaGetProBtn")
  const exportPdfBtn = document.getElementById("exportPdfBtn")
  const shareResultBtn = document.getElementById("shareResultBtn")

  function setBilling(isAnnual) {
    const lang = currentLanguage()
    const pricing = marketPricing[normalizeSupportedLanguage(lang)] || marketPricing.en
    const amount = isAnnual ? pricing.annual : pricing.monthly
    const suffix = isAnnual ? pricing.annualSuffix : pricing.monthlySuffix

    if (monthlyBtn) monthlyBtn.classList.toggle("active", !isAnnual)
    if (annualBtn) annualBtn.classList.toggle("active", isAnnual)
    if (discountBadge) discountBadge.classList.toggle("visible", isAnnual)
    if (proPriceEl) {
      proPriceEl.innerHTML = `${escapeHtml(formatLocalizedPrice(amount, lang))}<small style="font-size:16px;font-weight:500">${escapeHtml(suffix)}</small>`
    }
    if (proPeriodEl) {
      proPeriodEl.textContent = isAnnual
        ? t("billingAnnualPeriod", lang)
        : t("proPeriod", lang)
    }
    const checkoutHref = getCheckoutHrefForPlan(isAnnual ? "pro-annual" : "pro-monthly", lang)
    if (planProCta) planProCta.setAttribute("href", checkoutHref)
    if (ctaGetProBtn) ctaGetProBtn.setAttribute("href", checkoutHref)
    localizeInternalLinks(lang)
  }

  if (monthlyBtn) monthlyBtn.addEventListener("click", () => setBilling(false))
  if (annualBtn) annualBtn.addEventListener("click", () => setBilling(true))
  if (exportPdfBtn) exportPdfBtn.addEventListener("click", exportAnalysisPdf)
  if (shareResultBtn) shareResultBtn.addEventListener("click", () => {
    shareAnalysisResult().catch((err) => {
      console.error("Share failed:", err)
      window.alert(t("shareUnsupported"))
    })
  })
  setBilling(false)

  // PWA install prompt — capture the beforeinstallprompt event and show a non-intrusive banner
  let deferredInstallPrompt = null
  const pwaKey = "wykta_pwa_dismissed"
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault()
    deferredInstallPrompt = e
    try {
      if (sessionStorage.getItem(pwaKey)) return
    } catch (ex) {}
    const lang = currentLanguage()
    const banner = document.createElement("div")
    banner.className = "pwa-install-banner"
    banner.setAttribute("role", "banner")
    banner.innerHTML = `
      <p><strong>${escapeHtml(t("pwaInstallTitle", lang))}</strong><br>${escapeHtml(t("pwaInstallBody", lang))}</p>
      <button class="btn btn-primary btn-sm" id="pwaInstallBtn">${escapeHtml(t("pwaInstallBtn", lang))}</button>
      <button class="pwa-close" aria-label="${escapeHtml(t("pwaInstallDismiss", lang))}" id="pwaCloseBtn">×</button>
    `
    const main = document.querySelector(".main")
    if (main) main.insertBefore(banner, main.firstChild)

    document.getElementById("pwaInstallBtn")?.addEventListener("click", async () => {
      if (!deferredInstallPrompt) return
      deferredInstallPrompt.prompt()
      const { outcome } = await deferredInstallPrompt.userChoice
      trackEvent("PWA", "Install", outcome)
      deferredInstallPrompt = null
      banner.remove()
    })
    document.getElementById("pwaCloseBtn")?.addEventListener("click", () => {
      try { sessionStorage.setItem(pwaKey, "1") } catch (ex) {}
      banner.remove()
    })
  })
})
