console.log("Wykta app started")

/* -----------------------
MOBILE NAV TOGGLE
----------------------- */
function toggleNav() {
  const navRight = document.getElementById("navRight")
  const btn = document.getElementById("navHamburger")
  if (!navRight || !btn) return
  const isOpen = navRight.classList.toggle("open")
  btn.setAttribute("aria-expanded", isOpen ? "true" : "false")
}

// Close nav when a link is tapped on mobile
document.addEventListener("DOMContentLoaded", function() {
  const navLinks = document.querySelectorAll(".nav-right .nav-link")
  navLinks.forEach(function(link) {
    link.addEventListener("click", function() {
      const navRight = document.getElementById("navRight")
      const btn = document.getElementById("navHamburger")
      if (navRight) navRight.classList.remove("open")
      if (btn) btn.setAttribute("aria-expanded", "false")
    })
  })
})

/* -----------------------
CAPACITOR NATIVE DETECTION
On iOS/Android the Capacitor bridge is injected into the WebView before the
page loads, making window.Capacitor available. On the web (Cloudflare Pages /
GitHub Pages) window.Capacitor is undefined, so isNativeApp() returns false
and all camera code falls through to the standard getUserMedia path.
----------------------- */
function isNativeApp() {
  return !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform())
}

function getCapacitorCamera() {
  return window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Camera
    ? window.Capacitor.Plugins.Camera
    : null
}

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
  // Additional Chinese INCI / skincare / food aliases for better local-DB coverage
  "麦芽糊精": "maltodextrin",
  "角鲨烷": "squalane",
  // 角鲨烯 (squalene) is a different unsaturated compound; remove incorrect mapping
  "咖啡因": "caffeine",
  "尿素": "urea",
  "卡波姆": "carbomer",
  "卡波": "carbomer",
  "生育酚": "tocopherol",
  "维生素e": "tocopherol",
  "乙酰化透明质酸钠": "sodium hyaluronate",
  "积雪草": "centella asiatica",
  "积雪草苷": "centella asiatica",
  "白藜芦醇": "resveratrol",
  "腺苷": "adenosine",
  "阿魏酸": "ferulic acid",
  "甘草提取物": "licorice root extract",
  "光果甘草提取物": "licorice root extract",
  "母菊花提取物": "bisabolol",
  "α-甜没药醇": "bisabolol",
  "茶树油": "tea tree oil",
  "金缕梅提取物": "witch hazel",
  // 红景天提取物 (Rhodiola extract) is a separate plant; remove incorrect resveratrol mapping
  "传明酸": "tranexamic acid",
  "氨甲环酸": "tranexamic acid",
  "α-熊果苷": "alpha-arbutin",
  "熊果苷": "alpha-arbutin",
  "曲酸": "kojic acid",
  "壬二酸": "azelaic acid",
  "聚谷氨酸钠": "polyglutamic acid",
  "β-葡聚糖": "beta-glucan",
  "燕麦β-葡聚糖": "beta-glucan",
  "胶原蛋白": "collagen",
  "胶原": "collagen",
  "胶原多肽": "collagen",
  "喜马拉雅植物油": "jojoba oil",
  "荷荷巴油": "jojoba oil",
  "乳木果油": "shea butter",
  "玫瑰果油": "rosehip oil",
  "摩洛哥坚果油": "argan oil",
  "依地树油": "argan oil",
  "硫酸月桂醇聚醚钠": "sodium laureth sulfate",
  "十二烷基硫酸钠": "sodium lauryl sulfate",
  "椰油酰丙基甜菜碱": "cocamidopropyl betaine",
  "黄原胶": "xanthan gum",
  "玻璃酸钠": "sodium hyaluronate",
  // 羟乙基哌嗪乙磺酸 is HEPES buffer (not lactic acid); remove incorrect mapping
  "乳酸": "lactic acid",
  // 苯甲醇 (benzyl alcohol) is a distinct compound; should not map to phenoxyethanol
  // 对羟基苯乙酮 (p-hydroxyacetophenone) is also distinct; remove incorrect mappings
  "二甲基硅氧烷": "dimethicone",
  "聚二甲基硅氧烷": "dimethicone",
  "矿物油": "mineral oil",
  "石蜡油": "mineral oil",
  "凡士林": "petrolatum",
  "白凡士林": "petrolatum",
  "氧化锌": "zinc oxide",
  "二氧化钛": "titanium dioxide",
  "玉米淀粉": "cornstarch",
  "淀粉糖浆": "high fructose corn syrup",
  "果葡糖浆": "high fructose corn syrup",
  "大豆卵磷脂": "lecithin",
  "葵花籽卵磷脂": "lecithin",
  "葵花籽油": "sunflower oil",
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

// Keep slightly lower than fetchJsonWithTimeout default (7000ms) so this fallback cannot block overall analysis.
const WIKIDATA_TIMEOUT_MS = 6500
// Maximum character length for a single ingredient token in the raw-fallback extraction path.
const MAX_INGREDIENT_TOKEN_LENGTH = 120
// Viewport width at which the analysis section switches from stacked to side-by-side layout.
const WIDE_DESKTOP_BREAKPOINT_PX = 1200
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

// Per-language translations for localIngredientDb fn and note fields.
// Keyed by language code → ingredient key → { fn, note }.
// Falls back to the English values in localIngredientDb when a key is absent.
const localIngredientDbI18n = {
  zh: {
    // ── Universal ──────────────────────────────────────────────────────────
    "water":                        { fn: "溶剂",                 note: "食品与化妆品中的通用溶剂。来源：Open Food Facts 分类 / CosIng。" },
    "aqua":                         { fn: "溶剂",                 note: "化妆品中水的 INCI 名称。来源：CosIng（欧盟）。" },
    "glycerin":                     { fn: "保湿剂",               note: "为皮肤补充水分，改善食品质地。来源：CosIng（欧盟）/ FDA GRAS。" },
    "ascorbic acid":                { fn: "抗氧化剂 / 维生素C",   note: "食品中保鲜（E300）；化妆品中提亮肤色。来源：欧盟添加剂列表 / CosIng。" },
    "citric acid":                  { fn: "酸化剂 / 防腐剂",      note: "pH 调节剂和抗氧化剂（E330）；亦用于护肤品。来源：欧盟添加剂列表。" },
    "tocopherol":                   { fn: "抗氧化剂 / 维生素E",   note: "防止食品氧化酸败（E306-309）；保护皮肤免受氧化损伤。来源：欧盟添加剂列表 / CosIng。" },
    "xanthan gum":                  { fn: "增稠剂 / 稳定剂",      note: "天然多糖（E415）；用于食品和化妆品以改善质地。来源：欧盟添加剂列表。" },
    "lactic acid":                  { fn: "酸化剂 / 去角质（AHA）", note: "发酵产生的酸；食品中用于调节 pH；护肤品中作为温和的 AHA 去角质成分。来源：CosIng / 欧盟添加剂列表。" },
    "sodium benzoate":              { fn: "防腐剂",               note: "E211；抑制食品中的霉菌和酵母；也用于部分化妆品。来源：欧盟添加剂列表 / CosIng。" },
    "propylene glycol":             { fn: "保湿剂 / 溶剂",        note: "食品中为 E1520；化妆品中用作溶剂和保湿剂；一般认为安全。来源：欧盟添加剂列表 / CosIng。" },
    // ── Skincare ──────────────────────────────────────────────────────────
    "niacinamide":                  { fn: "护肤调理",             note: "维生素 B3；改善肤色、毛孔外观及皮肤屏障功能。来源：CosIng（欧盟）。" },
    "hyaluronic acid":              { fn: "保湿剂",               note: "可锁住自身重量 1000 倍的水分；深层保湿。来源：CosIng（欧盟）。" },
    "sodium hyaluronate":           { fn: "保湿剂",               note: "透明质酸的盐形式；更易渗透皮肤。来源：CosIng（欧盟）。" },
    "retinol":                      { fn: "护肤调理",             note: "维生素 A；促进细胞更新和胶原蛋白合成。来源：CosIng（欧盟）。" },
    "retinyl palmitate":            { fn: "护肤调理",             note: "维生素 A 的酯形式；比视黄醇更温和。来源：CosIng（欧盟）。" },
    "glycolic acid":                { fn: "去角质（AHA）",         note: "α-羟基酸；去除死皮细胞，改善肤质。来源：CosIng（欧盟）。" },
    "salicylic acid":               { fn: "去角质（BHA）",         note: "β-羟基酸；疏通毛孔；适合油性或痘肌。来源：CosIng（欧盟）。" },
    "mandelic acid":                { fn: "去角质（AHA）",         note: "大分子 AHA；对敏感肌足够温和。来源：CosIng（欧盟）。" },
    "benzoyl peroxide":             { fn: "抗菌",                 note: "杀灭引起痘痘的细菌；可能漂白织物，使用时注意。来源：CosIng（欧盟）。" },
    "vitamin c":                    { fn: "抗氧化剂",             note: "提亮肤色并促进胶原蛋白合成。来源：CosIng（欧盟）。" },
    "ceramide":                     { fn: "皮肤屏障脂质",          note: "补充并强化皮肤屏障。来源：CosIng（欧盟）。" },
    "panthenol":                    { fn: "保湿剂 / 润肤剂",       note: "泛酸原（维生素 B5）；舒缓、保湿并辅助伤口愈合。来源：CosIng（欧盟）。" },
    "shea butter":                  { fn: "润肤剂",               note: "富含脂肪酸；深度滋养和柔润肌肤。来源：CosIng（欧盟）。" },
    "cetearyl alcohol":             { fn: "乳化剂 / 润肤剂",       note: "脂肪醇；增稠配方并柔化皮肤。来源：CosIng（欧盟）。" },
    "fragrance":                    { fn: "香料",                 note: "可能含未申报过敏原；敏感肌慎用。来源：CosIng（欧盟）。" },
    "parfum":                       { fn: "香料",                 note: "欧盟对香精混合物的通称；潜在致敏物。来源：CosIng（欧盟）。" },
    "phenoxyethanol":               { fn: "防腐剂",               note: "广谱防腐剂；在 ≤1% 浓度下耐受性良好。来源：CosIng（欧盟）。" },
    "methylparaben":                { fn: "防腐剂",               note: "对羟基苯甲酸酯类防腐剂；高剂量下内分泌干扰问题存争议。来源：CosIng（欧盟）。" },
    "ethylparaben":                 { fn: "防腐剂",               note: "对羟基苯甲酸酯类防腐剂；低浓度下被认为安全。来源：CosIng（欧盟）。" },
    "butylparaben":                 { fn: "防腐剂",               note: "脂溶性较高的对羟基苯甲酸酯；部分地区有限用规定。来源：CosIng（欧盟）。" },
    "zinc oxide":                   { fn: "防晒剂 / 矿物质",       note: "广谱物理防晒；对皮肤亦有舒缓作用。来源：CosIng（欧盟）。" },
    "titanium dioxide":             { fn: "防晒剂 / 着色剂",       note: "物理防晒剂兼增白颜料。来源：CosIng（欧盟）。" },
    "petrolatum":                   { fn: "封闭剂",               note: "形成屏障锁住水分；不堵塞毛孔。来源：CosIng（欧盟）。" },
    "mineral oil":                  { fn: "润肤剂 / 封闭剂",       note: "锁住水分；高度精炼的化妆品级别被认为安全。来源：CosIng（欧盟）。" },
    "dimethicone":                  { fn: "润肤剂 / 硅酮",         note: "平滑肤感并形成保护层。来源：CosIng（欧盟）。" },
    "aloe vera":                    { fn: "舒缓 / 保湿剂",         note: "抗炎；舒缓刺激并补充水分。来源：CosIng（欧盟）。" },
    "green tea extract":            { fn: "抗氧化剂",             note: "富含 EGCG 多酚；减少皮肤氧化应激。来源：CosIng（欧盟）。" },
    "kojic acid":                   { fn: "美白",                 note: "抑制黑色素生成；用于改善色素沉着。来源：CosIng（欧盟）。" },
    "azelaic acid":                 { fn: "角质溶解剂 / 抗菌",      note: "针对痘痘和玫瑰痤疮；均匀肤色。来源：CosIng（欧盟）。" },
    "caffeine":                     { fn: "护肤调理",             note: "减少浮肿和黑眼圈；具有抗氧化特性。来源：CosIng（欧盟）。" },
    "squalane":                     { fn: "润肤剂",               note: "轻盈不堵孔的油脂；肤感极佳。来源：CosIng（欧盟）。" },
    "jojoba oil":                   { fn: "润肤剂",               note: "液态蜡；高度模拟皮肤天然皮脂。来源：CosIng（欧盟）。" },
    "rosehip oil":                  { fn: "润肤剂",               note: "富含维生素 A 和 C；支持皮肤更新。来源：Open Beauty Facts 分类。" },
    "argan oil":                    { fn: "润肤剂",               note: "富含维生素 E；滋养柔润。来源：CosIng（欧盟）。" },
    "sodium lauryl sulfate":        { fn: "表面活性剂 / 清洁",     note: "起泡清洁剂；可能剥离天然油脂并引起刺激。来源：CosIng（欧盟）。" },
    "sodium laureth sulfate":       { fn: "表面活性剂 / 清洁",     note: "比 SLS 更温和；洗发水和沐浴露中常见。来源：CosIng（欧盟）。" },
    "cocamidopropyl betaine":       { fn: "表面活性剂",            note: "温和的两性表面活性剂，用于温和洁面产品。来源：CosIng（欧盟）。" },
    "butylene glycol":              { fn: "保湿剂 / 溶剂",         note: "锁水并辅助其他成分渗透皮肤。来源：CosIng（欧盟）。" },
    "carbomer":                     { fn: "粘度调节剂",            note: "增稠并稳定凝胶；被认为安全。来源：CosIng（欧盟）。" },
    "allantoin":                    { fn: "舒缓",                 note: "促进细胞再生；镇静刺激。来源：CosIng（欧盟）。" },
    "urea":                         { fn: "保湿剂 / 角质溶解剂",    note: "高浓度时去角质；低浓度时保湿。来源：CosIng（欧盟）。" },
    "alpha-arbutin":                { fn: "美白",                 note: "抑制酪氨酸酶；安全淡化色斑。来源：CosIng（欧盟）。" },
    "tranexamic acid":              { fn: "美白",                 note: "减少色素沉着；与维生素 C 联用效果更佳。来源：CosIng（欧盟）。" },
    "resveratrol":                  { fn: "抗氧化剂",             note: "多酚类抗氧化剂；具有抗衰老特性。来源：CosIng（欧盟）。" },
    "centella asiatica":            { fn: "舒缓 / 修复",          note: "支持胶原蛋白合成；舒缓敏感肌。来源：CosIng（欧盟）。" },
    "bakuchiol":                    { fn: "护肤调理",             note: "植物源视黄醇替代品；对敏感肌更温和。来源：CosIng（欧盟）。" },
    "adenosine":                    { fn: "抗皱",                 note: "欧盟认可的抗衰老成分；刺激胶原蛋白生成。来源：CosIng（欧盟）。" },
    "polyglutamic acid":            { fn: "保湿剂",               note: "保湿能力是透明质酸的 4 倍。来源：Open Beauty Facts 分类。" },
    "ferulic acid":                 { fn: "抗氧化剂",             note: "提升维生素 C 和 E 的稳定性与功效。来源：CosIng（欧盟）。" },
    "licorice root extract":        { fn: "美白",                 note: "光甘草定抑制黑色素合成；具抗炎作用。来源：CosIng（欧盟）。" },
    "bisabolol":                    { fn: "舒缓 / 抗炎",           note: "来源于洋甘菊；镇静红肿并促进修复。来源：CosIng（欧盟）。" },
    "tea tree oil":                 { fn: "抗菌",                 note: "强效天然抗菌剂；对痘痘有效但可能引起刺激。来源：CosIng（欧盟）。" },
    "witch hazel":                  { fn: "收敛剂 / 抗氧化剂",     note: "收缩毛孔；高酒精配方可能造成干燥。来源：Open Beauty Facts 分类。" },
    "neem oil":                     { fn: "抗菌",                 note: "抗真菌和抗菌；用于痤疮和湿疹。来源：Open Beauty Facts 分类。" },
    "collagen":                     { fn: "护肤调理",             note: "皮肤弹性结构蛋白；外用吸收有限。来源：CosIng（欧盟）。" },
    "beta-glucan":                  { fn: "护肤调理",             note: "来源于燕麦；舒缓刺激并刺激胶原蛋白生成。来源：CosIng（欧盟）。" },
    "peptides":                     { fn: "护肤调理",             note: "信号肽可刺激胶原蛋白和弹性蛋白生成。来源：CosIng（欧盟）。" },
    // ── Food ──────────────────────────────────────────────────────────────
    "sugar":                        { fn: "甜味剂",               note: "蔗糖；过量摄入与肥胖和龋齿相关。来源：FDA GRAS。" },
    "salt":                         { fn: "调味剂 / 防腐剂",       note: "氯化钠；摄入过多会升高血压。来源：FDA GRAS。" },
    "wheat":                        { fn: "谷物",                 note: "含麸质；腹腔疾病或麸质敏感者应避免。主要过敏原（欧盟/美国）。" },
    "milk":                         { fn: "乳制品",               note: "常见过敏原（欧盟前14 / 美国前9）；钙质来源。" },
    "egg":                          { fn: "黏合剂 / 乳化剂",       note: "常见过敏原（欧盟前14 / 美国前9）；烘焙时提供结构。" },
    "soy":                          { fn: "蛋白质 / 乳化剂",       note: "常见过敏原；植物蛋白和异黄酮来源。" },
    "peanut":                       { fn: "豆类",                 note: "主要过敏原；可引发过敏性休克，须严格避免。来源：FDA。" },
    "tree nuts":                    { fn: "坚果",                 note: "过敏原类别（杏仁、腰果等）；存在交叉污染风险。来源：FDA。" },
    "fish":                         { fn: "海鲜",                 note: "常见过敏原；富含 omega-3 脂肪酸。来源：欧盟过敏原列表。" },
    "shellfish":                    { fn: "贝类",                 note: "过敏原类别（虾、蟹、龙虾）。来源：欧盟/FDA 过敏原列表。" },
    "sesame":                       { fn: "种子",                 note: "美国（2023年起）和欧盟主要过敏原；同时也是健康脂肪来源。" },
    "palm oil":                     { fn: "脂肪 / 油脂",           note: "饱和脂肪含量高；过度开采对环境影响显著。" },
    "coconut oil":                  { fn: "脂肪 / 油脂",           note: "饱和脂肪含量高；耐高温烹饪。来源：OFF 分类。" },
    "olive oil":                    { fn: "脂肪 / 油脂",           note: "富含单不饱和脂肪；有益心脏健康（地中海饮食）。来源：OFF 分类。" },
    "sunflower oil":                { fn: "脂肪 / 油脂",           note: "富含维生素 E；适合高温烹饪。来源：OFF 分类。" },
    "canola oil":                   { fn: "脂肪 / 油脂",           note: "饱和脂肪含量低；烟点高。来源：OFF 分类。" },
    "potassium sorbate":            { fn: "防腐剂",               note: "E202；延长饮料和乳制品的保质期。来源：欧盟添加剂列表。" },
    "monosodium glutamate":         { fn: "增味剂",               note: "味精（E621）；鲜味来源；对普通人群安全。来源：FDA GRAS。" },
    "artificial flavor":            { fn: "香精",                 note: "合成香味化合物；确切成分通常不公开。来源：FDA。" },
    "natural flavors":              { fn: "香精",                 note: "来源于天然物质；确切化合物通常不公开。来源：FDA。" },
    "high fructose corn syrup":     { fn: "甜味剂",               note: "液体甜味剂；高摄入量与代谢问题相关。来源：FDA GRAS。" },
    "maltodextrin":                 { fn: "增稠剂 / 填充剂",       note: "来源于淀粉；消化吸收快，可升高血糖。来源：FDA GRAS。" },
    "guar gum":                     { fn: "增稠剂",               note: "E412；植物来源增稠剂；膳食纤维含量高。来源：欧盟添加剂列表。" },
    "carrageenan":                  { fn: "增稠剂 / 乳化剂",       note: "E407；海藻提取物；高剂量下有肠道炎症的部分证据。来源：欧盟添加剂列表。" },
    "lecithin":                     { fn: "乳化剂",               note: "E322；通常来自大豆或葵花籽；使油水均匀混合。来源：欧盟添加剂列表。" },
    "mono- and diglycerides":       { fn: "乳化剂",               note: "E471；来源于脂肪；用于烘焙食品和人造黄油。来源：欧盟添加剂列表。" },
    "baking powder":                { fn: "膨松剂",               note: "碳酸氢钠与酸的混合物；使烘焙食品膨胀。来源：FDA GRAS。" },
    "sodium bicarbonate":           { fn: "膨松剂",               note: "小苏打（E500）；与酸反应产生 CO₂。来源：欧盟添加剂列表。" },
    "cornstarch":                   { fn: "增稠剂",               note: "来源于玉米；用于增稠酱汁和汤品。来源：FDA GRAS。" },
    "yeast extract":                { fn: "增味剂",               note: "含游离谷氨酸；天然鲜味来源。来源：OFF 分类。" },
    "caramel color":                { fn: "色素",                 note: "E150；由加热糖制成；IV 类与 4-MEI 安全顾虑相关。来源：欧盟添加剂列表。" },
    "annatto":                      { fn: "色素",                 note: "E160b；来源于胭脂树种子的天然黄橙色色素。来源：欧盟添加剂列表。" },
    "beta-carotene":                { fn: "色素 / 营养素",         note: "E160a；维生素 A 原；天然橙色素。来源：欧盟添加剂列表。" },
    "sodium nitrite":               { fn: "防腐剂 / 腌制剂",       note: "E250；用于腌肉；高剂量下潜在致癌。来源：欧盟添加剂列表。" },
    "red 40":                       { fn: "人工色素",             note: "FD&C 红色 40 号；可能导致敏感儿童多动。来源：FDA。" },
    "yellow 5":                     { fn: "人工色素",             note: "柠檬黄（E102）；罕见过敏风险；欧盟要求警示标签。来源：欧盟添加剂列表。" },
    "yellow 6":                     { fn: "人工色素",             note: "日落黄（E110）；欧盟要求警示标签。来源：欧盟添加剂列表。" },
    "stevia":                       { fn: "甜味剂",               note: "植物来源零卡路里甜味剂；被认为安全（E960）。来源：欧盟添加剂列表。" },
    "erythritol":                   { fn: "甜味剂（糖醇）",        note: "低升糖指数；耐受性好；极少被吸收（E968）。来源：欧盟添加剂列表。" },
    "sorbitol":                     { fn: "甜味剂（糖醇）",        note: "E420；每日摄入超 50 g 可产生泻效。来源：欧盟添加剂列表。" },
    "aspartame":                    { fn: "人工甜味剂",            note: "E951；苯丙酮尿症患者（PKU）应避免（含苯丙氨酸）。来源：欧盟添加剂列表。" },
    "sucralose":                    { fn: "人工甜味剂",            note: "E955；甜度是蔗糖的 600 倍；耐高温。来源：欧盟添加剂列表。" },
    "acesulfame potassium":         { fn: "人工甜味剂",            note: "安赛蜜（E950）；常与三氯蔗糖或阿斯巴甜复配使用。来源：欧盟添加剂列表。" },
    "rice":                         { fn: "谷物 / 淀粉",          note: "无麸质谷物；常见小麦替代品。来源：OFF 分类。" },
    "oat":                          { fn: "谷物 / 膳食纤维",       note: "富含 β-葡聚糖纤维；可能与麸质交叉污染。来源：OFF 分类。" },
    "corn":                         { fn: "谷物 / 淀粉",          note: "无麸质；加工食品中常用作淀粉或糖浆。来源：OFF 分类。" },
    "almond":                       { fn: "坚果（树生）",          note: "主要树坚果过敏原；富含维生素 E 和健康脂肪。" },
    "almonds":                      { fn: "坚果（树生）",          note: "主要树坚果过敏原；富含维生素 E 和健康脂肪。" },
    "cashew":                       { fn: "坚果（树生）",          note: "常见树坚果过敏原；富含镁。" },
    "hazelnut":                     { fn: "坚果（树生）",          note: "树坚果过敏原；同时含维生素 E。" },
    "shrimp":                       { fn: "贝类",                 note: "常见贝类过敏原；高蛋白质和碘含量。" },
    "vinegar":                      { fn: "酸化剂 / 防腐剂",       note: "乙酸溶液；用于调味和天然防腐。来源：OFF 分类。" },
    "msg":                          { fn: "增味剂",               note: "谷氨酸钠（E621）；鲜味来源；对普通人群安全。来源：FDA GRAS。" },
    "artificial color":             { fn: "色素",                 note: "合成染料类别；各具体染料的安全性有所不同。来源：FDA。" },
    "sodium phosphate":             { fn: "乳化剂 / pH调节剂",     note: "E339；用于加工奶酪和肉类。来源：欧盟添加剂列表。" },
    "calcium propionate":           { fn: "防腐剂",               note: "E282；防止面包发霉；普遍被认为安全。来源：欧盟添加剂列表。" },
    "sorbic acid":                  { fn: "防腐剂",               note: "E200；天然防腐剂；抑制酵母和霉菌。来源：欧盟添加剂列表。" }
  }
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

  const withoutHeader = String(value).replace(/^(ingredients?|contains?|contient?|ingrédients?|inhaltsstoffe?|其他微量成分|其他成分|微量成分|成分|配料|原料|成份)[:：\s-]*/i, "")
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
  if(!normalized || normalized.length < 3) return false
  if(/^\d+([.,]\d+)?$/.test(normalized)) return false
  if(normalized.split(" ").length > 8) return false
  // Tokens ≤ 4 chars with no vowels are almost always OCR noise or abbreviations
  // (e.g. "LS", "OP", "OI", "XRF") — reject them.
  if(normalized.length <= 4 && !/[aeiouy]/i.test(normalized)) return false
  // Tokens ≤ 4 chars that mix digits and letters (e.g. "52S", "22b") are
  // scan-code or batch-number fragments — reject them.
  if(normalized.length <= 4 && /\d/.test(normalized) && /[a-z]/i.test(normalized)) return false
  // OCR garbage: single-word tokens (no spaces) that start with an impossible consonant
  // cluster (3+ consonants before the first vowel) are not valid INCI/food ingredient names.
  // e.g. "RNTEARIR" (starts with RNT). Multi-word tokens are excluded from this check
  // because multi-word INCI names can begin with abbreviations like "DMDM HYDANTOIN".
  // CJK tokens are also excluded — Chinese ingredient names don't follow Latin phonotactics.
  const hasSingleWord = !normalized.includes(" ")
  const asciiOnly = normalized.replace(/[^a-z]/gi, "")
  // \u4e00-\u9fa5 = CJK Unified Ideographs (Chinese characters)
  if (hasSingleWord && asciiOnly.length >= 5 && !/[\u4e00-\u9fa5]/.test(normalized)) {
    const leadConsonantMatch = asciiOnly.match(/^([^aeiouy]+)/i)
    if (leadConsonantMatch) {
      const lead = leadConsonantMatch[1].toLowerCase()
      // Allowlist of recognised English/Latin initial consonant clusters (digraphs and
      // trigraphs) that appear in real INCI names: bl/br/cl/cr/dr/fl/fr/gl/gr/ph/pl/pr/
      // sc/sh/sk/sl/sm/sn/sp/st/sw/th/tr/wh/wr/ch/gh/kn/gn/mn and chr/str/spr/spl/
      // scr/thr/shr/phr/sch. Any other 3+ consonant lead is rejected as OCR noise.
      const validClusters = /^(bl|br|cl|cr|dr|fl|fr|gl|gr|ph|pl|pr|sc|sh|sk|sl|sm|sn|sp|st|sw|th|tr|wh|wr|ch|gh|kn|gn|mn|chr|str|spr|spl|scr|thr|shr|phr|sch)/
      if (lead.length >= 3 && !validClusters.test(lead)) return false
    }
  }
  // Multi-word OCR garbage: tokens of 2-4 words where EVERY word either has no vowels
  // or is only 1-2 letters are almost certainly address/code fragments
  // (e.g. "LSE SBF", "BIR Raa E"). Real INCI multi-word names always have at least
  // one word with a vowel and >= 3 letters (e.g. "sodium lauryl sulfate", "aloe vera").
  if (!hasSingleWord && !/[\u4e00-\u9fa5]/.test(normalized)) {
    const words = normalized.trim().split(/\s+/)
    if (words.length >= 2 && words.length <= 4) {
      const allWordsAreFiller = words.every(w => w.length <= 2 || !/[aeiouy]/i.test(w))
      if (allWordsAreFiller) return false
    }
  }
  // Single-word tokens containing a run of 5 or more consecutive digits are almost certainly
  // registration/lot/authorization codes (e.g. "EAH-NXA06372", "CPNP12345678") rather than
  // INCI names — the highest E-number is E1521 (4 digits), and PEG numbers top out at 4 digits.
  // CI colorant numbers ("CI 77891") are multi-word after sanitization so hasSingleWord=false.
  if (hasSingleWord && /\d{5,}/.test(normalized)) return false
  return true
}


// Extracts just the ingredient section from full product label text (e.g. OCR of an entire label).
// findIngredientSection is defined in ingredient-section.js (loaded before app.js).
// See that file for full implementation and documentation.

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

const uiMessages = {
  en: {
    heroBadge: "AI-Powered Ingredient Intelligence",
    heroTitlePrefix: "Know what's",
    heroTitleHighlight: "in your products",
    chipCoverage: "Food + Skincare",
    chipLanguage: "4 Languages",
    chipSpeed: "OCR in Seconds",
    chipUpgrade: "Allergen Alerts",
    communityNav: "Community",
    accountNav: "My Account",
    analysisTitle: "AI Ingredient Analysis",
    analysisSubtitle: "Now enriched with free food and skincare databases for broader ingredient coverage.",
    ingredientList: "Ingredient List",
    ingredientsPlaceholder: "Paste ingredients from food or skincare labels",
    analyzeButton: "Analyze Ingredients",
    openCameraButton: "Open Camera",
    captureButton: "Capture Label",
    valueTitle: "Why users pay for Wykta",
    valueSubtitle: "Simple pricing that grows with you. Start free, upgrade when you're ready.",
    pricingTitle: "Pricing",
    billingMonthly: "Monthly",
    billingAnnual: "Annual",
    billingDiscount: "Save 20%",
    billingAnnualPeriod: "billed annually",
    starterTitle: "Starter (Free)",
    proTitle: "Pro (Recommended)",
    proBody: "Monthly or annual plans with priority analysis, richer ingredient insights, and premium trust reports.",
    proCtaButton: "Get Pro",
    enterpriseCtaButton: "Contact Sales",
    footerTagline: "Know what goes in and on your body.",
    footerCommunity: "Community",
    footerPricing: "Pricing",
    footerContact: "Contact",
    footerPrivacy: "Privacy",
    footerTerms: "Terms",
    footerGitHub: "GitHub",
    aiDisclaimer: "For reference only — not medical or dietary advice. AI results may be inaccurate.",
    warningTitle: "Interaction Warnings",
    analysisPlaceholder: "AI analysis will appear here",
    warningPlaceholder: "Ingredient conflicts will appear here",
    noConflicts: "No obvious ingredient conflicts detected.",
    retinolGlycolic: "Retinol combined with glycolic acid may increase skin irritation.",
    peroxideRetinol: "Benzoyl peroxide may deactivate retinol.",
    analyzing: "Analyzing ingredients...",
    ocrProcessing: "Processing image and running OCR...",
    cameraAccessFailed: "Unable to access camera. Please allow camera permission in your browser settings, then try again. On mobile you can also use the 'Upload image' option.",
    noAnalysisFor: (langName) => `AI returned no analysis for ${langName}. Falling back to open databases — paste your ingredients again or try a different product label.`,
    failed: "Analysis could not be completed. Check your internet connection. You can also paste ingredients manually into the text field above.",
    ocrFailed: "OCR could not read the label. Try better lighting, hold the camera closer, or paste the ingredients manually below.",
    ocrLocalProcessing: "Running on-device OCR (may be slower)…",
    fallbackHeader: "Open-data ingredient analysis",
    foodCategory: "Food",
    skincareCategory: "Skincare",
    generalCategory: "General",
    noPublicData: "No clear match was found in public ingredient databases.",
    wikidataNoDescription: "No description available from Wikidata.",
    starterPeriod: "forever free",
    starterScanLimit: "5 AI analyses/day",
    starterFeatureInput: "Paste or camera input",
    starterFeatureLang: "4-language support",
    starterFeaturePriority: "No priority analysis",
    starterFeatureExport: "No PDF export",
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
    uploadImageButton: "Upload Image",
    stopBarcodeButton: "Stop",
    barcodeScanning: "Point camera at a barcode…",
    barcodeProductFound: "Product found",
    barcodeIngredientsLoaded: "Ingredients loaded — analyzing…",
    barcodeNoIngredients: "No ingredients found for this product.",
    nutriScoreLabel: "Nutri-Score",
    safetyScoreLabel: "Safety",
    pwaInstallTitle: "Add Wykta to your home screen",
    pwaInstallBody: "Install the app for quick access — no App Store needed.",
    pwaInstallBtn: "Add to Home Screen",
    pwaInstallDismiss: "Not now",
    stopCameraButton: "Stop Camera",
    noIngredientSection: "No ingredient list detected in this scan. Aim the camera at the section labeled \"INGREDIENTS:\" on the label and try again.",
    cookieText: "We use optional analytics cookies to improve Wykta. Your ingredient text is never stored.",
    cookieDecline: "Decline",
    cookieAccept: "Accept analytics",
    cookieSettings: "Cookie settings"
  },
  fr: {
    heroBadge: "Intelligence ingrédients pilotée par l'IA",
    heroTitlePrefix: "Ce qu'il y a",
    heroTitleHighlight: "dans vos produits",
    chipCoverage: "Alimentaire + skincare",
    chipLanguage: "4 langues",
    chipSpeed: "OCR en secondes",
    chipUpgrade: "Alertes allergènes",
    communityNav: "Communauté",
    accountNav: "Mon compte",
    analysisTitle: "Analyse IA des ingrédients",
    analysisSubtitle: "Désormais enrichi avec des bases alimentaires et skincare gratuites pour élargir la couverture.",
    ingredientList: "Liste d'ingrédients",
    ingredientsPlaceholder: "Collez les ingrédients d'étiquettes alimentaires ou skincare",
    analyzeButton: "Analyser les ingrédients",
    openCameraButton: "Ouvrir la caméra",
    captureButton: "Capturer l'étiquette",
    valueTitle: "Pourquoi les utilisateurs paient Wykta",
    valueSubtitle: "Des tarifs simples qui évoluent avec vous. Commencez gratuitement, passez Pro quand vous êtes prêt.",
    pricingTitle: "Tarifs",
    billingMonthly: "Mensuel",
    billingAnnual: "Annuel",
    billingDiscount: "Économisez 20 %",
    billingAnnualPeriod: "facturé annuellement",
    starterTitle: "Starter (Gratuit)",
    proTitle: "Pro (Recommandé)",
    proBody: "Abonnements mensuel ou annuel avec analyse prioritaire, insights plus riches et rapports premium.",
    proCtaButton: "Passer Pro",
    enterpriseCtaButton: "Contacter l'équipe commerciale",
    footerTagline: "Sachez ce que vous consommez et appliquez sur votre peau.",
    footerCommunity: "Communauté",
    footerPricing: "Tarifs",
    footerContact: "Contact",
    footerPrivacy: "Confidentialité",
    footerTerms: "CGU",
    footerGitHub: "GitHub",
    aiDisclaimer: "À titre indicatif uniquement — pas de conseil médical ni diététique. Les résultats IA peuvent être inexacts.",
    warningTitle: "Avertissements d'interaction",
    analysisPlaceholder: "L'analyse IA apparaîtra ici",
    warningPlaceholder: "Les conflits d'ingrédients apparaîtront ici",
    noConflicts: "Aucun conflit évident entre ingrédients détecté.",
    retinolGlycolic: "Le rétinol combiné à l'acide glycolique peut augmenter l'irritation cutanée.",
    peroxideRetinol: "Le peroxyde de benzoyle peut désactiver le rétinol.",
    analyzing: "Analyse des ingrédients...",
    ocrProcessing: "Traitement de l'image et OCR en cours...",
    cameraAccessFailed: "Impossible d'accéder à la caméra. Autorisez l'accès dans les paramètres de votre navigateur, puis réessayez. Sur mobile, vous pouvez aussi utiliser l'option « Charger une image ».",
    noAnalysisFor: (langName) => `L'IA n'a renvoyé aucune analyse pour ${langName}. Utilisation des bases ouvertes — recollez vos ingrédients ou essayez une autre étiquette.`,
    failed: "L'analyse n'a pas pu être effectuée. Vérifiez votre connexion internet. Vous pouvez aussi coller les ingrédients manuellement dans le champ ci-dessus.",
    ocrFailed: "L'OCR n'a pas pu lire l'étiquette. Essayez avec un meilleur éclairage, rapprochez la caméra, ou collez les ingrédients manuellement ci-dessous.",
    ocrLocalProcessing: "OCR sur l'appareil en cours (peut être plus lent)…",
    fallbackHeader: "Analyse d'ingrédients via données ouvertes",
    foodCategory: "Alimentaire",
    skincareCategory: "Soin de la peau",
    generalCategory: "Général",
    noPublicData: "Aucune correspondance claire trouvée dans les bases publiques.",
    wikidataNoDescription: "Aucune description disponible depuis Wikidata.",
    starterPeriod: "gratuit à vie",
    starterScanLimit: "5 analyses IA/jour",
    starterFeatureInput: "Saisie par collage ou caméra",
    starterFeatureLang: "Support de 4 langues",
    starterFeaturePriority: "Pas d'analyse prioritaire",
    starterFeatureExport: "Pas d'export PDF",
    planMostPopular: "Le plus populaire",
    proPeriod: "facturé mensuellement",
    proFeatureStarter: "Tout le contenu de Starter",
    proFeatureUnlimited: "Scans illimités",
    proFeaturePdf: "Export PDF des rapports",
    enterpriseTitle: "Entreprise",
    enterprisePrice: "Sur mesure",
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
    uploadImageButton: "Télécharger une image",
    stopBarcodeButton: "Arrêter",
    barcodeScanning: "Pointez la caméra sur un code-barres…",
    barcodeProductFound: "Produit trouvé",
    barcodeIngredientsLoaded: "Ingrédients chargés — analyse en cours…",
    barcodeNoIngredients: "Aucun ingrédient trouvé pour ce produit.",
    nutriScoreLabel: "Nutri-Score",
    safetyScoreLabel: "Sécurité",
    pwaInstallTitle: "Ajoutez Wykta à votre écran d'accueil",
    pwaInstallBody: "Installez l'app pour un accès rapide — sans App Store.",
    pwaInstallBtn: "Ajouter à l'écran d'accueil",
    pwaInstallDismiss: "Plus tard",
    stopCameraButton: "Arrêter la caméra",
    noIngredientSection: "Aucune liste d'ingrédients détectée dans ce scan. Pointez la caméra vers la section « INGRÉDIENTS : » de l'étiquette et réessayez.",
    cookieText: "Nous utilisons des cookies analytiques optionnels pour améliorer Wykta. Votre texte de composition n'est jamais stocké.",
    cookieDecline: "Refuser",
    cookieAccept: "Accepter l'analyse",
    cookieSettings: "Paramètres cookies"
  },
  de: {
    heroBadge: "KI-gestützte Inhaltsstoff-Intelligenz",
    heroTitlePrefix: "Was steckt",
    heroTitleHighlight: "in Ihren Produkten",
    chipCoverage: "Food + Hautpflege",
    chipLanguage: "4 Sprachen",
    chipSpeed: "OCR in Sekunden",
    chipUpgrade: "Allergen-Warnungen",
    communityNav: "Community",
    accountNav: "Mein Konto",
    analysisTitle: "KI-Inhaltsstoffanalyse",
    analysisSubtitle: "Jetzt mit kostenlosen Lebensmittel- und Hautpflege-Datenbanken für breitere Abdeckung.",
    ingredientList: "Inhaltsstoffliste",
    ingredientsPlaceholder: "Inhaltsstoffe von Lebensmittel- oder Hautpflegeetiketten einfügen",
    analyzeButton: "Inhaltsstoffe analysieren",
    openCameraButton: "Kamera öffnen",
    captureButton: "Etikett erfassen",
    valueTitle: "Warum Nutzer für Wykta zahlen",
    valueSubtitle: "Einfache Preisgestaltung, die mit Ihnen wächst. Kostenlos starten, jederzeit upgraden.",
    pricingTitle: "Preise",
    billingMonthly: "Monatlich",
    billingAnnual: "Jährlich",
    billingDiscount: "20 % sparen",
    billingAnnualPeriod: "jährliche Abrechnung",
    starterTitle: "Starter (Kostenlos)",
    proTitle: "Pro (Empfohlen)",
    proBody: "Monatlicher oder jährlicher Tarif mit priorisierter Analyse, tieferen Insights und Premium-Reports.",
    proCtaButton: "Pro holen",
    enterpriseCtaButton: "Vertrieb kontaktieren",
    footerTagline: "Wissen, was in und auf Ihren Körper gelangt.",
    footerCommunity: "Community",
    footerPricing: "Preise",
    footerContact: "Kontakt",
    footerPrivacy: "Datenschutz",
    footerTerms: "AGB",
    footerGitHub: "GitHub",
    aiDisclaimer: "Nur zur Information — keine medizinische oder diätetische Beratung. KI-Ergebnisse können ungenau sein.",
    warningTitle: "Interaktionswarnungen",
    analysisPlaceholder: "KI-Analyse erscheint hier",
    warningPlaceholder: "Inhaltsstoffkonflikte erscheinen hier",
    noConflicts: "Keine offensichtlichen Inhaltsstoffkonflikte erkannt.",
    retinolGlycolic: "Retinol in Kombination mit Glykolsäure kann Hautreizungen verstärken.",
    peroxideRetinol: "Benzoylperoxid kann Retinol deaktivieren.",
    analyzing: "Inhaltsstoffe werden analysiert...",
    ocrProcessing: "Bild wird verarbeitet und OCR läuft...",
    cameraAccessFailed: "Kein Kamerazugriff möglich. Bitte Berechtigung in den Browsereinstellungen erteilen und erneut versuchen. Auf dem Handy können Sie auch die Option „Bild hochladen“ verwenden.",
    noAnalysisFor: (langName) => `Die KI hat keine Analyse für ${langName} geliefert. Nutze offene Datenbanken — Zutaten erneut einfügen oder anderes Etikett ausprobieren.`,
    failed: "Analyse konnte nicht abgeschlossen werden. Bitte Internetverbindung prüfen. Sie können Zutaten auch manuell in das obige Textfeld einfügen.",
    ocrFailed: "OCR konnte das Etikett nicht lesen. Versuchen Sie bessere Beleuchtung, halten Sie die Kamera näher, oder fügen Sie die Zutaten manuell unten ein.",
    ocrLocalProcessing: "Lokale Texterkennung läuft (kann langsamer sein)…",
    fallbackHeader: "Inhaltsstoffanalyse mit Open-Data",
    foodCategory: "Lebensmittel",
    skincareCategory: "Hautpflege",
    generalCategory: "Allgemein",
    noPublicData: "Keine klare Übereinstimmung in öffentlichen Datenbanken gefunden.",
    wikidataNoDescription: "Keine Beschreibung von Wikidata verfügbar.",
    starterPeriod: "dauerhaft kostenlos",
    starterScanLimit: "5 KI-Analysen/Tag",
    starterFeatureInput: "Eingabe per Einfügen oder Kamera",
    starterFeatureLang: "Unterstützung für 4 Sprachen",
    starterFeaturePriority: "Keine priorisierte Analyse",
    starterFeatureExport: "Kein PDF-Export",
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
    uploadImageButton: "Bild hochladen",
    stopBarcodeButton: "Stopp",
    barcodeScanning: "Kamera auf Barcode richten…",
    barcodeProductFound: "Produkt gefunden",
    barcodeIngredientsLoaded: "Inhaltsstoffe geladen — Analyse läuft…",
    barcodeNoIngredients: "Keine Inhaltsstoffe für dieses Produkt gefunden.",
    nutriScoreLabel: "Nutri-Score",
    safetyScoreLabel: "Sicherheit",
    pwaInstallTitle: "Wykta zum Home-Screen hinzufügen",
    pwaInstallBody: "App installieren für schnellen Zugriff — kein App Store nötig.",
    pwaInstallBtn: "Zum Home-Screen hinzufügen",
    pwaInstallDismiss: "Nicht jetzt",
    stopCameraButton: "Kamera schließen",
    noIngredientSection: "Keine Zutatenliste in diesem Scan erkannt. Bitte Kamera auf den Abschnitt „ZUTATEN:“ des Etiketts richten und erneut versuchen.",
    cookieText: "Wir verwenden optionale Analyse-Cookies zur Verbesserung von Wykta. Ihre Inhaltsstofftexte werden nie gespeichert.",
    cookieDecline: "Ablehnen",
    cookieAccept: "Analyse akzeptieren",
    cookieSettings: "Cookie-Einstellungen"
  },
  zh: {
    heroBadge: "AI 驱动的成分智能",
    heroTitlePrefix: "精确了解",
    heroTitleHighlight: "您产品的成分",
    chipCoverage: "食品 + 护肤",
    chipLanguage: "支持 4 种语言",
    chipSpeed: "OCR 秒速分析",
    chipUpgrade: "过敏原预警",
    communityNav: "社区",
    accountNav: "我的账户",
    analysisTitle: "AI 成分分析",
    analysisSubtitle: "现已接入免费的食品与护肤数据库，成分覆盖更广。",
    ingredientList: "成分列表",
    ingredientsPlaceholder: "粘贴食品或护肤品标签中的成分",
    analyzeButton: "分析成分",
    openCameraButton: "打开相机",
    captureButton: "拍摄标签",
    valueTitle: "用户愿意为 Wykta 付费的原因",
    valueSubtitle: "清晰透明的定价，随您需求成长。免费开始，随时升级。",
    pricingTitle: "价格方案",
    billingMonthly: "按月",
    billingAnnual: "按年",
    billingDiscount: "节省 20%",
    billingAnnualPeriod: "按年计费",
    starterTitle: "基础版（免费）",
    proTitle: "专业版（推荐）",
    proBody: "提供月付与年付两种专业版，含优先分析、更丰富洞察和高级可信报告。",
    proCtaButton: "升级专业版",
    enterpriseCtaButton: "联系销售团队",
    footerTagline: "了解进入和涂抹在身体上的每一种成分。",
    footerCommunity: "社区",
    footerPricing: "定价",
    footerContact: "联系我们",
    footerPrivacy: "隐私政策",
    footerTerms: "服务条款",
    footerGitHub: "GitHub",
    aiDisclaimer: "仅供参考，不构成医疗或饮食建议。AI分析结果可能存在误差。",
    warningTitle: "成分相互作用预警",
    analysisPlaceholder: "AI 分析结果将显示在这里",
    warningPlaceholder: "成分冲突将显示在这里",
    noConflicts: "未检测到明显成分冲突。",
    retinolGlycolic: "视黄醇与乙醇酸同时使用可能增加皮肤刺激。",
    peroxideRetinol: "过氧化苯甲酰可能使视黄醇失活。",
    analyzing: "正在分析成分...",
    ocrProcessing: "正在处理图像并执行 OCR...",
    cameraAccessFailed: "无法访问相机。请在浏览器设置中允许相机权限后重试。在手机上，您也可以使用“上传图片”选项。",
    noAnalysisFor: (langName) => `AI 未返回 ${langName} 的分析结果，正在切换至开放数据库——请重新粘贴成分，或尝试其他产品标签。`,
    failed: "分析未能完成，请检查网络连接。您也可以直接将成分粘贴至上方文本框中进行分析。",
    ocrFailed: "OCR 无法识别标签内容。请改善光线、靠近拍摄，或在下方手动粘贴成分。",
    ocrLocalProcessing: "正在使用本地 OCR（速度可能较慢）……",
    fallbackHeader: "开放数据成分分析",
    foodCategory: "食品",
    skincareCategory: "护肤",
    generalCategory: "通用",
    noPublicData: "在公共数据库中未找到明确匹配。",
    wikidataNoDescription: "Wikidata 未提供可用描述。",
    starterPeriod: "永久免费",
    starterScanLimit: "每日 5 次 AI 分析",
    starterFeatureInput: "支持粘贴或相机输入",
    starterFeatureLang: "支持 4 种语言",
    starterFeaturePriority: "无优先分析",
    starterFeatureExport: "无 PDF 导出",
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
    uploadImageButton: "上传图片",
    stopBarcodeButton: "停止",
    barcodeScanning: "将相机对准条形码…",
    barcodeProductFound: "已找到产品",
    barcodeIngredientsLoaded: "成分已加载 — 正在分析…",
    barcodeNoIngredients: "该产品暂无成分信息。",
    nutriScoreLabel: "营养评级",
    safetyScoreLabel: "安全",
    pwaInstallTitle: "将 Wykta 添加到主屏幕",
    pwaInstallBody: "安装应用快速访问 — 无需应用商店。",
    pwaInstallBtn: "添加到主屏幕",
    pwaInstallDismiss: "暂不",
    stopCameraButton: "关闭相机",
    noIngredientSection: "此次扫描未找到成分列表。请将相机对准标签上标有“成分：”的部分后重试。",
    cookieText: "我们使用可选分析 Cookie 来改善 Wykta。您的成分文本永远不会被存储。",
    cookieDecline: "拒绝",
    cookieAccept: "接受分析",
    cookieSettings: "Cookie 设置"
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

  // UI-language affinity: INCI ingredient names are always Latin-script even on Chinese products,
  // so a Chinese label with a full INCI list can score higher for English than for Chinese.
  // When the user's UI is already set to a specific language and the text contains characters
  // from that language's script, add a small affinity bonus to prevent INCI names from
  // overriding the obvious product language context.
  const uiLang = currentLanguage()
  if (uiLang === "zh" && chineseCharCount > 0) scores.zh += 10
  else if (uiLang === "fr" && scores.fr > 0) scores.fr += 5
  else if (uiLang === "de" && scores.de > 0) scores.de += 5

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
  // Always rebuild from the live DOM so newly shown elements (e.g. after display:none
  // sections become visible) and any nodes added since the last call are included.
  cachedI18nNodes = [...document.querySelectorAll("[data-i18n]")]
  cachedI18nPlaceholderNodes = [...document.querySelectorAll("[data-i18n-placeholder]")]

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

  document.querySelectorAll("[data-i18n-aria-label]").forEach((node) => {
    const key = node.getAttribute("data-i18n-aria-label")
    if(!key) return
    node.setAttribute("aria-label", t(key))
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
  const noConflictsValues = Object.values(uiMessages).map(m => m.noConflicts)
  const warningPlaceholderValues = Object.values(uiMessages).map(m => m.warningPlaceholder)

  if(analysisEl){
    const currentText = analysisEl.innerText.trim()
    if(!analysisEl.children.length && (!currentText || analysisPlaceholderValues.includes(currentText))){
      analysisEl.innerText = t("analysisPlaceholder")
    }
  }

  if(warningEl){
    const currentText = warningEl.innerText.trim()
    if(!warningEl.children.length){
      // Plain-text state (placeholder set via innerText on a previous call):
      // re-translate if it matches any known placeholder value.
      if(!currentText || warningPlaceholderValues.includes(currentText)){
        warningEl.innerText = t("warningPlaceholder")
      }
    } else {
      // warningEl has child elements.  Three cases:
      // 1. Initial empty-state with data-i18n span — already handled by the forEach loop above.
      // 2. "No conflicts" state set by displayInteractions([], ...) — re-translate in-place.
      // 3. Actual warning cards from an analysis — leave them as-is (untranslated dynamic content).
      if(noConflictsValues.includes(currentText)){
        displayInteractions([], lang)
      }
    }
  }

  // Re-translate any OCR status message that is currently visible and matches a known
  // single-key i18n value.  Composite messages (e.g. barcode number appended) are left
  // as-is because they contain dynamic data that cannot be reconstructed from the key alone.
  const ocrEl = document.getElementById("ocrResult")
  if(ocrEl && ocrEl.classList.contains("visible")){
    const ocrText = ocrEl.innerText.trim()
    if(ocrText){
      const retranslatableKeys = ["ocrFailed", "cameraAccessFailed", "ocrLocalProcessing",
        "ocrProcessing", "barcodeNoIngredients", "barcodeIngredientsLoaded"]
      const langs = Object.keys(uiMessages)
      let matched = false
      for(const key of retranslatableKeys){
        if(matched) break
        for(const l of langs){
          if(uiMessages[l][key] === ocrText){ ocrEl.innerText = t(key); matched = true; break }
        }
      }
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

// Returns "danger", "caution", or "safe" based on the curated local ingredient DB note.
// This catches known-concern ingredients even when the AI returns a neutral description.
function riskFromLocalDb(ingredientName) {
  if (!ingredientName) return "safe"
  const key = sanitizeIngredientTerm(ingredientName)
  const entry = localIngredientDb[key]
  if (!entry) return "safe"
  const note = entry.note.toLowerCase()
  if (["allergen", "anaphylax", "carcinogen"].some(k => note.includes(k))) return "danger"
  if (["caution", "avoid", "irritat", "sensitiv", "sensitiser", "sensitize", "restrict",
       "concern", "debated", "endocrine", "hyperactiv", "strip", "linked to metabolic"].some(k => note.includes(k))) return "caution"
  return "safe"
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
  // EN: allergen/allergy/avoid/anaphylaxis/carcinogen/toxic | FR: allergène | ZH: 过敏原/过敏/避免/禁用/致癌/有毒 | DE: vermeiden/nicht verwenden/karzinogen
  const dangerWords  = ["allergen", "allergène", "allergy", "avoid", "anaphylax",
                        "carcinogen", "karzinogen", "toxic",
                        "过敏原", "过敏", "避免", "禁用", "致癌", "有毒",
                        "vermeiden", "nicht verwenden"]
  // EN: irritat/sensitiv/sensitis/caution/monitor/endocrine/restrict/hyperactiv/debat |
  // FR: peut augmenter | ZH: 刺激/敏感/注意/谨慎/失活/慎用/内分泌/限制/争议 |
  // DE: vorsicht/reizung/kann/einschränk
  const cautionWords = ["irritat", "sensitiv", "sensitise", "sensitize", "caution", "monitor", "deactivat",
                        "increase skin", "may affect", "endocrine", "restrict", "hyperactiv",
                        "debat", "peut augmenter", "kann",
                        "刺激", "敏感", "注意", "谨慎", "失活", "慎用", "内分泌", "限制", "争议",
                        "vorsicht", "reizung", "hautreizung", "nicht empfohlen", "einschränk"]

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

      // Cross-reference the local ingredient DB to catch known-concern ingredients
      // that the AI described in neutral language (e.g. parabens, fragrances, SLS).
      const localRisk = riskFromLocalDb(name)
      if (localRisk === "danger" && riskClass !== "danger") riskClass = "danger"
      else if (localRisk === "caution" && riskClass === "safe") riskClass = "caution"

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
  const i18n = localIngredientDbI18n[lang] && localIngredientDbI18n[lang][key]
  const fn   = (i18n && i18n.fn)   || entry.fn
  const note = (i18n && i18n.note) || entry.note
  return {
    category: catMap[entry.category] || t("generalCategory", lang),
    detail:   `${fn}: ${note}`
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
    // Use the original user-typed token for display name.
    // e.g. normalized "aloe vera" from "芦荟" → displayName="芦荟"
    const displayName = displayNameMap[ingredient] || ingredient

    // 1. Check embedded local database first (instant, no network required)
    const localResult = lookupLocalIngredientDb(ingredient, lang)
    if (localResult) {
      return `${displayName}: [${localResult.category}] ${localResult.detail}`
    }

    // 2. Try OFF ingredient taxonomy, OFF/OBF product search, and Wikidata in parallel.
    // Always use the UI language (lang) for output labels; ingredientLang only tells us
    // what script the input token was written in (used upstream for alias resolution).
    // Use `lang` for all user-facing output; use `ingredientLang` only for input processing and alias matching.
    const [offTaxResult, foodResult, beautyResult, wikidataResult] = await Promise.allSettled([
      lookupOFFIngredientTaxonomy(ingredient, lang),
      lookupOpenFoodFacts(ingredient, lang),
      lookupOpenBeautyFacts(ingredient, lang),
      lookupWikidataIngredient(ingredient, lang)
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
          category: t("generalCategory", lang),
          detail: `${t("noPublicData", lang)} ${t("publicDbSourceNote", lang)}`
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

      // Race the invoke against a 30-second timeout so a cold-start or paused
      // Supabase project doesn't leave the UI stuck at "Analyzing..." indefinitely.
      // 30 s matches the OCR timeout and gives enough headroom for a cold-start
      // plus one provider API call in the multi-provider fallback chain.
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
          () => reject(new Error("Edge function timed out after 30 seconds")),
          30000
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
  if(resultsSection) {
    resultsSection.style.display = ""
    const layout = document.getElementById("analysisLayout")
    if (layout) layout.classList.add("has-results")
    // On narrow viewports (stacked layout), scroll results into view so user sees output
    if (window.innerWidth < WIDE_DESKTOP_BREAKPOINT_PX) {
      setTimeout(() => resultsSection.scrollIntoView({ behavior: "smooth", block: "start" }), 80)
    }
  }

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
    // Strip product metadata and choose the language-appropriate ingredient section
    // (e.g. Chinese 成分: section vs Latin INCI section) before any further parsing.
    const ingredientText = findIngredientSection(text, currentLanguage())

    // If the scan contained content but no ingredient section was found — most likely
    // because the user aimed the camera at a nutrition facts panel rather than the
    // ingredient list — show a targeted message and abort analysis.
    if (text.trim().length > 0 && !ingredientText.trim()) {
      displayAIAnalysis(t("noIngredientSection", analysisLanguage), [], { lang: analysisLanguage })
      return
    }

    let ingredients = extractIngredients(ingredientText)
    // Detect the input language for telemetry purposes only.
    // Always use the user's chosen UI language for AI responses and all display,
    // so results are consistently in the language the user selected.
    const detectedInputLang = detectInputLanguage(ingredientText, ingredients)
    const warnings = checkInteractions(ingredients, analysisLanguage)

    // Build a map from normalized ingredient key → original user-typed token.
    // This preserves the input language and display name (e.g. "芦荟" instead of "aloe vera")
    // for per-ingredient language detection and display in the results.
    const displayNameMap = {}
    const scriptBoundaryNormalized = (ingredientText || "")
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

    // If vocabulary extraction found nothing but there is raw text (e.g. OCR output that
    // doesn't match our ingredient dictionary), split by common delimiters and use those
    // raw tokens so the AI can still analyze whatever was captured or pasted.
    if (ingredients.length === 0 && ingredientText.trim().length > 0) {
      const rawFallback = ingredientText
        .replace(/([\u4e00-\u9fa5])([a-zA-Z0-9])/g, "$1, $2")
        .replace(/([a-zA-Z0-9])([\u4e00-\u9fa5])/g, "$1, $2")
        .split(ingredientSplitPunctuationPattern)
        .map(s => s.trim())
        .filter(s => s.length >= 3 && s.length <= MAX_INGREDIENT_TOKEN_LENGTH && isLikelyIngredientToken(s))
      if (rawFallback.length > 0) {
        ingredients = rawFallback
        for (const raw of ingredients) {
          const normalized = normalizeIngredientName(raw) || raw.toLowerCase().trim()
          if (normalized && !displayNameMap[normalized]) {
            displayNameMap[normalized] = raw
          }
        }
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
      inputLang:       detectedInputLang,
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

/* Helper: show or hide the camera live-action buttons (in-camera capture/stop)
   and the top-row captureBtn in sync. */
function setCameraLiveMode(isLive) {
  const captureBtn = document.getElementById("captureBtn")
  if (captureBtn) captureBtn.style.display = isLive ? "" : "none"
  const cameraLiveActions = document.getElementById("cameraLiveActions")
  if (cameraLiveActions) cameraLiveActions.style.display = isLive ? "" : "none"
}

/* Stop the active camera stream and reset the camera panel. */
function stopCamera() {
  if (stream) {
    stream.getTracks().forEach(track => track.stop())
    stream = null
  }
  const video = document.getElementById("camera")
  if (video) video.srcObject = null
  setCameraLiveMode(false)
  // Reset the Open Camera button label
  const openBtn = document.getElementById("openCameraBtn")
  if (openBtn) {
    const span = openBtn.querySelector("[data-i18n='openCameraButton']")
    if (span) span.textContent = t("openCameraButton")
    openBtn.disabled = false
  }
}

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
  // If camera stream is still live after barcode stops, restore label-scan controls
  const cameraStillLive = !!(stream && stream.getTracks().some(t => t.readyState === "live"))
  setCameraLiveMode(cameraStillLive)
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
  // Barcode scan has its own overlay — hide label-scan live actions
  setCameraLiveMode(false)

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
    } catch (err) {
      console.error("Camera error for barcode scan:", err)
      const ocrEl = document.getElementById("ocrResult")
      if (ocrEl) {
        ocrEl.innerText = t("cameraAccessFailed", lang)
        ocrEl.classList.add("visible")
      }
      // Show camera panel to display error
      const cameraPanel = document.getElementById("cameraPanel")
      if (cameraPanel) cameraPanel.style.display = ""
      return
    }
  }

  // Show camera panel
  const cameraPanel = document.getElementById("cameraPanel")
  if (cameraPanel) cameraPanel.style.display = ""

  // Show video, hide any previous snapshot or image preview
  const videoForBarcode = document.getElementById("camera")
  if (videoForBarcode) videoForBarcode.style.display = ""
  const snapshotForBarcode = document.getElementById("snapshot")
  if (snapshotForBarcode) snapshotForBarcode.style.display = "none"
  const previewImgForBarcode = document.getElementById("imagePreview")
  if (previewImgForBarcode) { previewImgForBarcode.style.display = "none"; previewImgForBarcode.src = "" }

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
    barcodeZxingControls = await codeReader.decodeFromVideoElementContinuously(video, async (result, err) => {
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
        if (ocrEl) ocrEl.innerText = t("barcodeNoIngredients", lang)
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

  // On iOS/Android use the native Capacitor camera sheet (no getUserMedia needed)
  if (isNativeApp()) {
    await captureNative()
    return
  }

  // If camera is already active, show the capture button and do nothing else
  if (stream && stream.getTracks().some(t => t.readyState === "live")) {
    setCameraLiveMode(true)
    const cameraPanel = document.getElementById("cameraPanel")
    if (cameraPanel) cameraPanel.style.display = ""
    return
  }

  const openBtn = document.getElementById("openCameraBtn")
  if (openBtn) {
    const span = openBtn.querySelector("[data-i18n='openCameraButton']")
    if (span) span.textContent = "…"
    openBtn.disabled = true
  }

  try {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
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

    // Show camera panel
    const cameraPanel = document.getElementById("cameraPanel")
    if (cameraPanel) cameraPanel.style.display = ""

    // Hide any previous snapshot and image preview, show video
    const snapshot = document.getElementById("snapshot")
    if (snapshot) snapshot.style.display = "none"
    const previewImg = document.getElementById("imagePreview")
    if (previewImg) { previewImg.style.display = "none"; previewImg.src = "" }
    video.style.display = ""

    // Re-enable the Open Camera button (text stays as-is)
    if (openBtn) {
      const span = openBtn.querySelector("[data-i18n='openCameraButton']")
      if (span) span.textContent = t("openCameraButton")
      openBtn.disabled = false
      openBtn.title = ""
    }

    // Show capture buttons (both top-row and in-camera overlay)
    setCameraLiveMode(true)

  } catch (err) {
    console.error("Camera error:", err)
    const ocrEl = document.getElementById("ocrResult")
    if (ocrEl) {
      ocrEl.innerText = t("cameraAccessFailed")
      ocrEl.classList.add("visible")
    }
    // Show camera panel to display error message
    const cameraPanel = document.getElementById("cameraPanel")
    if (cameraPanel) cameraPanel.style.display = ""

    // Reset button and hide capture buttons
    if (openBtn) {
      const span = openBtn.querySelector("[data-i18n='openCameraButton']")
      if (span) span.textContent = t("openCameraButton")
      openBtn.disabled = false
    }
    setCameraLiveMode(false)
  }

}

/* -----------------------
SHOW CANVAS PREVIEW
Hides the live video feed and shows the snapshot canvas inside the
camera-wrapper. Called after label capture or image upload.
----------------------- */

function showCanvasPreview(canvas) {
  // Always make the camera panel visible when displaying a preview — this makes
  // the function self-contained and robust regardless of call order.
  const panel = document.getElementById("cameraPanel")
  if (panel) panel.style.display = ""

  const video = document.getElementById("camera")
  if (video) video.style.display = "none"
  // Populate the <img> preview for reliable cross-browser photo display.
  // Using canvas.toDataURL() ensures the image is available even after the
  // original object URL is revoked (which happens synchronously after onload).
  const preview = document.getElementById("imagePreview")
  if (preview) {
    try {
      preview.src = canvas.toDataURL("image/jpeg", 0.88) // quality 0.88 balances visual fidelity and file size
      preview.style.display = "block"
    } catch (e) {
      // toDataURL may fail on tainted canvases (cross-origin); fall back to canvas display
      canvas.style.display = "block"
      canvas.style.width = "100%"
    }
  } else {
    canvas.style.display = "block"
    canvas.style.width = "100%"
  }
  // Scroll the camera panel into view so the user can see the captured photo,
  // especially on mobile where the panel may be above the fold.
  if (panel) {
    setTimeout(() => panel.scrollIntoView({ behavior: "smooth", block: "nearest" }), 60)
  }
}

/* -----------------------
CAPTURE IMAGE
----------------------- */

async function capture(){

  // On iOS/Android the native camera sheet has already delivered the image
  // via captureNative(); tapping the in-page "Capture" button is a no-op.
  if (isNativeApp()) return

  // If camera not active, start it first
  if (!stream || !stream.getTracks || stream.getTracks().every(t => t.readyState !== "live")) {
    await startScan()
    return
  }

  const video = document.getElementById("camera")
  const canvas = document.getElementById("snapshot")
  const ocrEl = document.getElementById("ocrResult")

  if (!video || !canvas || !video.videoWidth || !video.videoHeight) {
    if (ocrEl) {
      ocrEl.innerText = t("cameraAccessFailed")
      ocrEl.classList.add("visible")
    }
    return
  }

  const ctx = canvas.getContext("2d")
  canvas.width = video.videoWidth
  canvas.height = video.videoHeight
  ctx.drawImage(video, 0, 0)

  // Stop all tracks and null the stream. Nulling is important: it frees the
  // MediaStream object so the browser can release the camera hardware resource.
  if (stream) {
    stream.getTracks().forEach(track => track.stop())
    stream = null
  }

  // Show snapshot preview so user sees what was captured
  // Hide live video, show canvas inside camera-wrapper
  showCanvasPreview(canvas)

  // Reset the open-camera button back to its original label
  const openBtn = document.getElementById("openCameraBtn")
  if (openBtn) {
    const span = openBtn.querySelector("[data-i18n='openCameraButton']")
    if (span) span.textContent = t("openCameraButton")
    openBtn.title = ""
  }

  // Hide all capture buttons after taking the photo
  setCameraLiveMode(false)

  if (ocrEl) {
    ocrEl.innerText = t("ocrProcessing")
    ocrEl.classList.add("visible")
  }

  runOCR(canvas)

}

/* -----------------------
NATIVE CAMERA CAPTURE (iOS / Android via Capacitor)
Uses @capacitor/camera getPhoto() which opens the system camera sheet,
then decodes the returned base64 JPEG into a canvas and passes it to runOCR().
Falls back to cameraAccessFailed message if the plugin is unavailable.
----------------------- */
async function captureNative() {
  const ocrEl = document.getElementById("ocrResult")
  const CapCamera = getCapacitorCamera()

  if (!CapCamera) {
    if (ocrEl) {
      ocrEl.innerText = t("cameraAccessFailed")
      ocrEl.classList.add("visible")
    }
    return
  }

  try {
    // CameraSource enum maps to the string "CAMERA". Since this app has no
    // bundler the @capacitor/camera ES-module cannot be imported directly, so
    // we use the underlying string value that CameraSource.Camera resolves to.
    // See: https://capacitorjs.com/docs/apis/camera#camerasource
    const photo = await CapCamera.getPhoto({
      quality: 90,
      allowEditing: false,
      resultType: "base64",
      source: "CAMERA",
      correctOrientation: true,
      width: 1920,
      height: 1080
    })

    const base64 = photo.base64String
    if (!base64) throw new Error("No image data returned")

    if (ocrEl) {
      ocrEl.innerText = t("ocrProcessing")
      ocrEl.classList.add("visible")
    }

    const img = new Image()
    img.onload = () => {
      const canvas = document.getElementById("snapshot")
      if (!canvas) return
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      const ctx = canvas.getContext("2d")
      ctx.drawImage(img, 0, 0)
      // Show camera panel and snapshot preview; hide live video
      const cameraPanel = document.getElementById("cameraPanel")
      if (cameraPanel) cameraPanel.style.display = ""
      showCanvasPreview(canvas)
      runOCR(canvas)
    }
    img.onerror = () => {
      if (ocrEl) {
        ocrEl.innerText = t("cameraAccessFailed")
        ocrEl.classList.add("visible")
      }
    }
    img.src = `data:image/jpeg;base64,${base64}`
  } catch (err) {
    // User cancelled the camera picker — silently ignore; any other error shows message
    if (err && err.message && err.message.toLowerCase().includes("cancel")) return
    console.error("Native camera error:", err)
    if (ocrEl) {
      ocrEl.innerText = t("cameraAccessFailed")
      ocrEl.classList.add("visible")
    }
  }
}



/* -----------------------
CLIENT-SIDE OCR FALLBACK (Tesseract.js)
Used when the AI backend is unavailable or returns no text.
Tesseract.js is lazy-loaded from CDN on first use so it has zero impact
on normal page-load performance.
----------------------- */

// Lazy-load Tesseract.js from CDN.
// Cached promise for the Tesseract.js script load.
// Shared across all callers so the <script> tag is injected only once even if
// loadTesseract() is called concurrently (e.g. from runOCR and runLocalOCR).
let _tesseractLoadPromise = null

// Returns true when the library is available, false if the CDN load failed.
async function loadTesseract() {
  if (typeof window.Tesseract !== "undefined") return true
  if (!_tesseractLoadPromise) {
    _tesseractLoadPromise = new Promise((resolve) => {
      const script = document.createElement("script")
      script.src = "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js"
      script.onload = () => resolve(true)
      script.onerror = () => {
        console.warn("Tesseract.js CDN load failed")
        _tesseractLoadPromise = null  // allow retry on next call
        resolve(false)
      }
      document.head.appendChild(script)
    })
  }
  return _tesseractLoadPromise
}

// Minimum output quality thresholds for the Tesseract fallback.
// Only the minimum character count is enforced — a non-empty string indicates
// that Tesseract found something on the label. Confidence is NOT checked because
// on real-world product label photos (blur, angles, small print) the mean
// document confidence routinely sits at 5–25 % even when the extracted
// ingredient words are largely correct. The ingredient parser in
// analyzeIngredients() already handles imperfect / partial text, so pre-filtering
// by confidence would silently discard usable results.
const LOCAL_OCR_MIN_CHARS = 5

// Maximum milliseconds to wait for the local OCR engine.
// The eng.traineddata file is ~10 MB; 90 s covers a slow 1 Mbit/s connection.
const LOCAL_OCR_TIMEOUT_MS = 90000

// Minimum width (px) for the preprocessed canvas fed to Tesseract.
// Upscaling small photos dramatically improves recognition — Tesseract needs
// at least ~30 px of cap-height to reliably identify characters.
// 1500 px is wide enough for typical label text while keeping the total pixel
// count low so on-device processing completes in a reasonable time.
const LOCAL_OCR_MIN_WIDTH = 1500

// Maximum total pixels in the preprocessed canvas.
// Prevents excessive memory usage and slow processing on mobile devices.
// 4 MP (≈ 2000×2000) gives adequate resolution for ingredient text while
// being ~2.5× faster to process than the previous 10 MP limit.
const LOCAL_OCR_MAX_PIXELS = 4_000_000

// OCR Engine Mode: 1 = LSTM (neural net engine, best accuracy in Tesseract 4/5).
const LOCAL_OCR_OEM_LSTM = 1

// Preprocess a canvas for Tesseract.js before recognition.
// Steps performed:
//   1. Scale up if the image is narrower than LOCAL_OCR_MIN_WIDTH (more pixels = better OCR).
//      The scale is capped so the total pixel count never exceeds LOCAL_OCR_MAX_PIXELS,
//      preventing browser crashes on memory-constrained devices with very tall photos.
//   2. Convert to greyscale and boost contrast using manual pixel manipulation.
//      Manual processing is used instead of ctx.filter because ctx.filter is not
//      supported in Safari < 18 (released Sept 2024) — the iOS browser most users
//      on iOS 17 or older will be running. ctx.filter silently does nothing on
//      those browsers, leaving the image in colour and harming OCR accuracy.
// Returns a new off-screen canvas; the original src canvas is unchanged.
function preprocessCanvasForOCR(src) {
  let scale = src.width < LOCAL_OCR_MIN_WIDTH ? LOCAL_OCR_MIN_WIDTH / src.width : 1
  // Cap scale so total pixel count stays within LOCAL_OCR_MAX_PIXELS.
  const scaledPixels = src.width * scale * src.height * scale
  if (scaledPixels > LOCAL_OCR_MAX_PIXELS) {
    scale = Math.sqrt(LOCAL_OCR_MAX_PIXELS / (src.width * src.height))
  }
  const dst = document.createElement("canvas")
  dst.width  = Math.round(src.width  * scale)
  dst.height = Math.round(src.height * scale)
  // willReadFrequently: true keeps pixel data in CPU memory for fast getImageData.
  const ctx = dst.getContext("2d", { willReadFrequently: true })
  ctx.drawImage(src, 0, 0, dst.width, dst.height)

  // Manual luminance-weighted greyscale (ITU-R BT.601) + contrast boost.
  // factor = 1.8 pushes pixels toward black/white; intercept keeps midtones centred.
  const imageData = ctx.getImageData(0, 0, dst.width, dst.height)
  const data = imageData.data
  const factor = 1.8
  const intercept = 128 * (1 - factor)
  for (let i = 0; i < data.length; i += 4) {
    const grey = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
    const contrasted = factor * grey + intercept
    const clamped = contrasted < 0 ? 0 : contrasted > 255 ? 255 : contrasted
    data[i] = data[i + 1] = data[i + 2] = clamped
    // alpha unchanged
  }
  ctx.putImageData(imageData, 0, 0)
  return dst
}

// Checks whether Tesseract output looks like real label text vs. OCR noise.
// A garbage scan (curled label, blurry photo, logo area) typically yields many
// 1-3 character fragments and very few proper words.
// Returns false (unusable) if fewer than 2 words of 4+ characters are found —
// real ingredient lists always contain at least one or two full words (e.g. "AQUA",
// "WATER", "GLYCERIN") even when the scan is imperfect. Two is the minimum
// because some very short lists (e.g. "Water, Glycerin") are genuinely valid.
function isOCRTextUsable(text) {
  if (!text) return false
  const words = text.trim().split(/\s+/).filter(w => w.length > 0)
  const longWordCount = words.filter(w => w.replace(/[^a-z\u4e00-\u9fa5]/gi, "").length >= 4).length
  return longWordCount >= 2
}

// Run on-device OCR via Tesseract.js.
// INCI ingredient names are always Latin-script, so the English training data
// covers the vast majority of cosmetic and food labels globally.
// Uses PSM 11 (SPARSE_TEXT) which tells Tesseract to find as much text as
// possible without assuming a structured page layout — far better than the
// default PSM 3 (AUTO) for product labels with scattered text, logos, and
// varying font sizes spread across the image.
// Returns the extracted text string, or null if recognition failed/produced nothing.
async function runLocalOCR(canvas) {
  const loaded = await loadTesseract()
  if (!loaded || typeof window.Tesseract === "undefined") return null
  let worker = null
  let timeoutId = null
  // Live progress element — updated by the Tesseract logger below.
  const ocrEl = document.getElementById("ocrResult")
  try {
    const prepared = preprocessCanvasForOCR(canvas)
    // Use the Worker API so we can set Tesseract parameters before recognition.
    // The logger receives status/progress events from the worker; we use them to
    // show a live percentage so users know the OCR is still running (not frozen).
    worker = await window.Tesseract.createWorker("eng", LOCAL_OCR_OEM_LSTM, {
      logger: (m) => {
        if (!ocrEl) return
        if (m.status === "recognizing text" && typeof m.progress === "number") {
          const pct = Math.round(m.progress * 100)
          ocrEl.innerText = `${t("ocrLocalProcessing")} ${pct}%`
        } else if (m.status === "loading tesseract core" || m.status === "initializing tesseract") {
          ocrEl.innerText = `${t("ocrLocalProcessing")} (loading…)`
        } else if (m.status === "loading language traineddata" || m.status === "initializing api") {
          ocrEl.innerText = `${t("ocrLocalProcessing")} (initializing…)`
        }
      },
    })
    await worker.setParameters({
      // PSM 11 — Sparse text: find as much text as possible in no particular order.
      // This is the correct mode for product labels where text is scattered across
      // logos, nutritional tables, and graphics at varying sizes and orientations.
      tessedit_pageseg_mode: "11",
    })
    const recognizePromise = worker.recognize(prepared)
    const timeoutPromise = new Promise((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error("Local OCR timed out")), LOCAL_OCR_TIMEOUT_MS)
    })
    const { data: { text } } = await Promise.race([recognizePromise, timeoutPromise])
    clearTimeout(timeoutId)
    if (!text || text.trim().length < LOCAL_OCR_MIN_CHARS) return null
    const trimmed = text.trim()
    if (!isOCRTextUsable(trimmed)) {
      console.warn("Local OCR: output rejected as noise (too many fragments, not enough real words)")
      return null
    }
    return trimmed
  } catch (err) {
    clearTimeout(timeoutId)
    console.warn("Local OCR (Tesseract) failed:", err)
    return null
  } finally {
    if (worker) {
      try { await worker.terminate() } catch (e) {}
    }
  }
}

// JPEG quality for the base64 payload sent to the AI Vision backend.
// 0.85 balances readability vs payload size; label text remains clear.
const AI_OCR_JPEG_QUALITY = 0.85
// Timeout (ms) for the AI Vision OCR backend call.
const AI_OCR_TIMEOUT_MS = 30000

// Send images at up to 2048 px wide so OpenAI Vision (detail: "high") gets
// enough tiles to read dense small-print text on product labels.
// A 4 K phone photo at 1024 px yields only 4 tiles; at 2048 px it gets 12 tiles.
const AI_OCR_MAX_WIDTH = 2048

function resizeCanvasForBackend(src) {
  if (src.width <= AI_OCR_MAX_WIDTH) return src
  const scale = AI_OCR_MAX_WIDTH / src.width
  const dst = document.createElement("canvas")
  dst.width = AI_OCR_MAX_WIDTH
  dst.height = Math.round(src.height * scale)
  const ctx = dst.getContext("2d")
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = "high"
  ctx.drawImage(src, 0, 0, dst.width, dst.height)
  return dst
}

// Sends the canvas image to the Supabase backend for OpenAI Vision OCR.
// Returns { text: string, unavailable: false } on success,
//         { text: null, unavailable: false } when the model found no text, or
//         { text: null, unavailable: true }  when the OCR engine is not configured.
async function callAIVisionOCR(canvas) {
  if (!supabaseClient) return { text: null, unavailable: true }
  try {
    const resized = resizeCanvasForBackend(canvas)
    const imageBase64 = resized.toDataURL("image/jpeg", AI_OCR_JPEG_QUALITY).split(",")[1]
    const invokePromise = supabaseClient.functions.invoke("wykta-backend", {
      body: {
        action: "ocrImage",
        imageBase64,
        lang: currentLanguage(),
        sessionId: getOrCreateSessionId(),
      },
    })
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("AI Vision OCR timed out")), AI_OCR_TIMEOUT_MS)
    )
    const { data: visionData, error: visionErr } = await Promise.race([invokePromise, timeoutPromise])
    if (visionErr) {
      console.error("AI Vision OCR backend error:", visionErr)
      return { text: null, unavailable: false }
    }
    if (visionData && visionData.ocrUnavailable) {
      return { text: null, unavailable: true }
    }
    const text = visionData && visionData.extractedText && visionData.extractedText.trim()
      ? visionData.extractedText.trim()
      : null
    return { text, unavailable: false }
  } catch (visionErr) {
    console.warn("AI Vision OCR failed:", visionErr)
    return { text: null, unavailable: false }
  }
}

// Builds the OCR system prompt for the direct client-side Gemini Vision call.
// The prompt asks the AI to transcribe ALL visible label text without filtering.
// Section selection (Chinese vs Latin INCI vs other languages) is handled
// deterministically by findIngredientSection() on the client, which is more
// reliable than asking the AI to pick the right section.
// Mirrors the server-side buildOCRSystemPrompt() in the edge function.
// The lang parameter is accepted for API compatibility but no longer alters the prompt.
function buildOCRDirectPrompt(_lang) {
  return (
    "You are a product label OCR assistant. " +
    "Your task is to accurately read and transcribe ALL visible text from the product label image. " +
    "Output the complete label text exactly as it is printed, preserving: " +
    "all ingredient sections in every language present on the label (e.g. sections headed by " +
    "'INGREDIENTS', 'Ingrédients', '成分', '配料', '原料', 'Inhaltsstoffe', or any equivalent term), " +
    "all section headings and markers, all separators (commas, slashes, semicolons, asterisks, etc.), " +
    "and the original text structure. " +
    "Do NOT skip, filter, or omit any section of the label. " +
    "If any text is unclear or partially legible, output your best reading. " +
    "Never output an empty response — always return whatever text is visible on the label."
  )
}

// Calls the Gemini Vision API directly from the browser using the optional
// geminiApiKey declared in config.js.  This provides AI-quality OCR without
// requiring a configured Supabase backend.
// Returns { text: string } on success or { text: null } when the key is absent
// or the request fails.
async function callGeminiVisionDirect(canvas, lang) {
  if (typeof geminiApiKey === "undefined" || !geminiApiKey || !geminiApiKey.trim()) {
    return { text: null }
  }
  try {
    const resized = resizeCanvasForBackend(canvas)
    const imageBase64 = resized.toDataURL("image/jpeg", AI_OCR_JPEG_QUALITY).split(",")[1]
    const model = "gemini-2.0-flash"
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey.trim()}`
    const fetchPromise = fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: buildOCRDirectPrompt(lang || currentLanguage()) }] },
        contents: [{ parts: [{ inline_data: { mime_type: "image/jpeg", data: imageBase64 } }] }],
        generationConfig: { maxOutputTokens: 4096, temperature: 0.1 },
      }),
    })
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Direct Gemini Vision timed out")), AI_OCR_TIMEOUT_MS)
    )
    const response = await Promise.race([fetchPromise, timeoutPromise])
    if (!response.ok) {
      console.warn("Direct Gemini Vision API error:", response.status)
      return { text: null }
    }
    const json = await response.json()
    const text = json?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || null
    return { text }
  } catch (err) {
    console.warn("Direct Gemini Vision failed:", err)
    return { text: null }
  }
}

async function runOCR(canvas) {
  const ocrEl = document.getElementById("ocrResult")

  // Start loading the Tesseract.js script immediately in the background so it is
  // ready (or already loading) by the time the on-device OCR fallback is reached.
  // This call is idempotent and fire-and-forget — it overlaps the CDN download
  // with any backend call that is in flight, reducing total wait time.
  loadTesseract()

  // Try the Supabase AI backend first (highest accuracy, multi-language).
  if (supabaseClient) {
    if (ocrEl) {
      ocrEl.innerText = t("ocrProcessing")
      ocrEl.classList.add("visible")
    }
    const { text: visionText } = await callAIVisionOCR(canvas)
    if (visionText) {
      if (ocrEl) {
        ocrEl.innerText = ""
        ocrEl.classList.remove("visible")
      }
      document.getElementById("ingredients").value = visionText
      await analyzeIngredients()
      return
    }
    // Backend unavailable or returned no text — fall through.
  }

  // Direct client-side Gemini Vision fallback (uses geminiApiKey from config.js).
  // Works without a Supabase backend; requires a free key from aistudio.google.com.
  const { text: directText } = await callGeminiVisionDirect(canvas, currentLanguage())
  if (directText) {
    if (ocrEl) {
      ocrEl.innerText = ""
      ocrEl.classList.remove("visible")
    }
    document.getElementById("ingredients").value = directText
    await analyzeIngredients()
    return
  }

  // On-device Tesseract.js OCR fallback — works without any API keys.
  // Always show the status banner before starting so the user gets immediate
  // feedback; the Tesseract logger will update it with percentage progress.
  if (ocrEl) {
    ocrEl.innerText = t("ocrLocalProcessing")
    ocrEl.classList.add("visible")
  }
  const localText = await runLocalOCR(canvas)
  if (localText) {
    if (ocrEl) {
      ocrEl.innerText = ""
      ocrEl.classList.remove("visible")
    }
    document.getElementById("ingredients").value = localText
    await analyzeIngredients()
  } else {
    if (ocrEl) {
      ocrEl.innerText = t("ocrFailed")
      ocrEl.classList.add("visible")
    }
  }
}

/* -----------------------
IMAGE UPLOAD (fallback for camera)
Reads a user-selected image file, draws it to the snapshot canvas,
and runs OCR on it — same pipeline as the live camera capture.
----------------------- */
async function handleImageUpload(input) {
  if (!input || !input.files || !input.files[0]) return
  const file = input.files[0]

  // Stop any active camera stream or barcode scan to avoid conflicts
  stopBarcodeScanning()
  stopCamera()

  const ocrEl = document.getElementById("ocrResult")
  const canvas = document.getElementById("snapshot")
  if (!canvas) return

  if (ocrEl) {
    ocrEl.innerText = t("ocrProcessing")
    ocrEl.classList.add("visible")
  }
  // Clear any stale preview from a previous upload so the old image is not
  // still visible while the new image is loading.
  const stalePreview = document.getElementById("imagePreview")
  if (stalePreview) { stalePreview.style.display = "none"; stalePreview.src = "" }
  canvas.style.display = "none"

  // Show camera panel immediately so the processing message is visible.
  // Also hide the video right away so no blank/black frame flashes before the
  // uploaded image preview appears in img.onload below.
  const cameraPanel = document.getElementById("cameraPanel")
  if (cameraPanel) cameraPanel.style.display = ""
  const videoElForUpload = document.getElementById("camera")
  if (videoElForUpload) videoElForUpload.style.display = "none"

  try {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      // Reset input now that the file has been fully read, so the same file can be re-selected
      input.value = ""
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      const ctx = canvas.getContext("2d")
      ctx.drawImage(img, 0, 0)
      showCanvasPreview(canvas)
      URL.revokeObjectURL(url)
      // Show camera panel so the uploaded preview and OCR result are visible
      const cameraPanel = document.getElementById("cameraPanel")
      if (cameraPanel) cameraPanel.style.display = ""
      runOCR(canvas)
    }
    img.onerror = () => {
      input.value = ""
      URL.revokeObjectURL(url)
      if (ocrEl) {
        ocrEl.innerText = t("ocrFailed")
        ocrEl.classList.add("visible")
      }
    }
    img.src = url
  } catch (err) {
    console.error("Image upload error:", err)
    if (ocrEl) {
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
    const localPages = new Set(typeof APP_LOCAL_PAGES !== 'undefined' ? APP_LOCAL_PAGES : ["index.html", "checkout.html", "contact-sales.html", "community.html", "payment-success.html", "account.html", "privacy.html", "terms.html"])
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

function syncCurrentUrlLanguage(lang = currentLanguage()) {
  try {
    const normalizedLang = normalizeSupportedLanguage(lang)
    const url = new URL(window.location.href)
    url.searchParams.set("lang", normalizedLang)
    history.replaceState(history.state ?? null, "", `${url.pathname}${url.search}${url.hash}`)
  } catch (err) {
    // Best-effort URL sync only; ignore environments where History API is restricted.
  }
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
  syncCurrentUrlLanguage(initialLang)
  localizeInternalLinks(initialLang)
  if(languageSelect){
    languageSelect.addEventListener("change", () => {
      const lang = normalizeSupportedLanguage(currentLanguage())
      localStorage.setItem("wykta_lang", lang)
      localizeStaticUI()
      syncCurrentUrlLanguage(lang)
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
  const exportPdfBtn = document.getElementById("exportPdfBtn")
  const shareResultBtn = document.getElementById("shareResultBtn")

  function setBilling(isAnnual) {
    const lang = currentLanguage()
    const pricing = marketPricing[normalizeSupportedLanguage(lang)] || marketPricing.en
    const amount = isAnnual ? pricing.annual : pricing.monthly
    const suffix = isAnnual ? pricing.annualSuffix : pricing.monthlySuffix

    if (monthlyBtn) monthlyBtn.classList.toggle("active", !isAnnual)
    if (annualBtn) annualBtn.classList.toggle("active", isAnnual)
    if (proPriceEl) {
      proPriceEl.innerHTML = `${escapeHtml(formatLocalizedPrice(amount, lang))}<small class="plan-price-suffix">${escapeHtml(suffix)}</small>`
    }
    if (proPeriodEl) {
      proPeriodEl.textContent = isAnnual
        ? t("billingAnnualPeriod", lang)
        : t("proPeriod", lang)
    }
    const checkoutHref = getCheckoutHrefForPlan(isAnnual ? "pro-annual" : "pro-monthly", lang)
    if (planProCta) planProCta.setAttribute("href", checkoutHref)
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
      <p><strong data-i18n="pwaInstallTitle">${escapeHtml(t("pwaInstallTitle", lang))}</strong><br><span data-i18n="pwaInstallBody">${escapeHtml(t("pwaInstallBody", lang))}</span></p>
      <button class="btn btn-primary btn-sm" id="pwaInstallBtn" data-i18n="pwaInstallBtn">${escapeHtml(t("pwaInstallBtn", lang))}</button>
      <button class="pwa-close" data-i18n-aria-label="pwaInstallDismiss" aria-label="${escapeHtml(t("pwaInstallDismiss", lang))}" id="pwaCloseBtn">×</button>
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
