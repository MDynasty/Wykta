console.log("Wykta app started")

/* -----------------------
SUPABASE CONNECTION
----------------------- */

const hasSupabaseConfig =
  typeof supabaseUrl !== "undefined" &&
  typeof supabaseKey !== "undefined" &&
  supabaseKey.trim().length > 0

const { createClient } = supabase

const supabaseClient = hasSupabaseConfig
  ? createClient(supabaseUrl, supabaseKey)
  : null

if (supabaseClient) {
  console.log("Supabase connected")
} else {
  console.warn("Supabase client is not configured. Create config.js from config.example.js to enable AI and saving.")
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

function getKnownIngredientMatchers(){
  if(cachedKnownIngredientMatchers) return cachedKnownIngredientMatchers

  cachedKnownIngredientMatchers = knownIngredients
    .slice()
    .sort((a, b) => b.length - a.length)
    .map(ingredient => {
      const escapedIngredient = ingredient.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
      return {
        ingredient,
        regex: new RegExp(`(^|[^\\p{L}\\p{N}])${escapedIngredient}($|[^\\p{L}\\p{N}])`, "iu")
      }
    })

  return cachedKnownIngredientMatchers
}


function extractIngredients(text){
  const normalizedText = (text || "").toLowerCase().trim()
  if(!normalizedText) return []

  const foundByVocabulary = getKnownIngredientMatchers()
    .filter(({ regex }) => regex.test(normalizedText))
    .map(({ ingredient }) => ingredient)

  const splitByPunctuation = normalizedText
    .split(/[,\.;:•\n\r\t，；。、|/\\]+/)
    .map(i => i.trim())
    .filter(i => i.length > 0)

  const fallbackSplit = splitByPunctuation.length > 1
    ? splitByPunctuation
    : foundByVocabulary.length
      ? []
      : normalizedText
        .split(/\s+(?:and|und|et|和)\s+|\s{2,}/i)
        .map(i => i.trim())
        .filter(i => i.length > 0)

  const normalizedVocabularyMatches = foundByVocabulary.filter(Boolean)
  const normalizedFallbackMatches = fallbackSplit.filter(Boolean)
  return [...new Set([...normalizedVocabularyMatches, ...normalizedFallbackMatches])]
}


/* -----------------------
INTERACTION CHECKER
----------------------- */

function checkInteractions(ingredients){

let warnings = []

if(
ingredients.includes("retinol") &&
ingredients.includes("glycolic acid")
){
warnings.push(
t("retinolGlycolic")
)
}

if(
ingredients.includes("benzoyl peroxide") &&
ingredients.includes("retinol")
){
warnings.push(
t("peroxideRetinol")
)
}

return warnings

}

/* -----------------------
DISPLAY WARNINGS
----------------------- */

function displayInteractions(warnings){

  const el = document.getElementById("interactionWarnings")
  if(!el) return

  if(!warnings.length){
    el.innerHTML = `<div class="no-conflict"><span>✅</span> <span>${escapeHtml(t("noConflicts"))}</span></div>`
    return
  }

  el.innerHTML = warnings
    .map(w => `<div class="warning-card"><span class="warning-icon">⚠️</span><span>${escapeHtml(w)}</span></div>`)
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

const ocrLanguageCodes = {
  en: "eng",
  fr: "fra",
  de: "deu",
  zh: "chi_sim"
}

const uiMessages = {
  en: {
    heroTitle: "Wykta Premium Ingredient Intelligence",
    heroSubtitle: "Scan food or skincare labels instantly, reduce ingredient risk, and unlock confidence that users will pay for.",
    chipCoverage: "✅ Food + Skincare Coverage",
    chipLanguage: "🌐 4-Language Support",
    chipSpeed: "⚡ OCR-to-Analysis in Seconds",
    chipUpgrade: "💎 Upgrade-ready UX",
    proofData: "Data Sources",
    proofTrust: "Trust Signal",
    proofTrustValue: "Community-maintained open databases",
    proofSpeed: "Speed",
    proofSpeedValue: "Live lookup + instant warnings",
    analysisSubtitle: "Now enriched with free food and skincare databases for broader ingredient coverage.",
    scanSubtitle: "Use your camera to pull ingredients from labels in seconds.",
    ctaTitle: "Turn ingredient uncertainty into buying confidence",
    ctaBody: "Wykta combines fast OCR, interaction checks, and open ingredient intelligence so users can decide what to buy faster.",
    analysisLanguage: "Analysis Language",
    ingredientList: "Ingredient List",
    ingredientsPlaceholder: "Paste ingredients from food or skincare labels",
    analyzeButton: "Analyze Ingredients",
    openCameraButton: "Open Camera",
    captureButton: "Capture Label",
    valueTitle: "Why users pay for Wykta",
    starterTitle: "Starter (Free)",
    starterBody: "Quick scans, basic warnings, multilingual output.",
    proTitle: "Pro (Recommended)",
    proBody: "Priority analysis, richer ingredient insights, premium trust reports.",
    footnote: "Designed for high conversion: clear value, instant outcomes, and premium upgrade positioning.",
    analysisTitle: "AI Ingredient Analysis",
    warningTitle: "Interaction Warnings",
    scanTitle: "Scan Ingredient Label",
    detectedTitle: "Detected Text",
    analysisPlaceholder: "AI analysis will appear here",
    warningPlaceholder: "Ingredient conflicts will appear here",
    noConflicts: "No obvious ingredient conflicts detected.",
    retinolGlycolic: "Retinol combined with glycolic acid may increase skin irritation.",
    peroxideRetinol: "Benzoyl peroxide may deactivate retinol.",
    analyzing: "Analyzing ingredients...",
    aiUnavailable: "AI analysis unavailable. Please check your Supabase configuration.",
    noAnalysisFor: (langName) => `AI returned no analysis for ${langName}. Please try again or check the backend function.`,
    failed: "AI analysis failed. Please check your internet connection and Supabase setup.",
    ocrFailed: "OCR failed. Try again.",
    fallbackHeader: "Open-data ingredient analysis",
    foodCategory: "Food",
    skincareCategory: "Skincare",
    generalCategory: "General",
    noPublicData: "No clear match was found in public ingredient databases."
  },
  fr: {
    heroTitle: "Wykta Intelligence Premium des Ingrédients",
    heroSubtitle: "Scannez les étiquettes alimentaires ou skincare instantanément, réduisez les risques d'ingrédients et augmentez la confiance.",
    chipCoverage: "✅ Couverture alimentaire + skincare",
    chipLanguage: "🌐 Support 4 langues",
    chipSpeed: "⚡ OCR vers analyse en quelques secondes",
    chipUpgrade: "💎 UX prête pour l'abonnement",
    proofData: "Sources de données",
    proofTrust: "Signal de confiance",
    proofTrustValue: "Bases ouvertes maintenues par la communauté",
    proofSpeed: "Vitesse",
    proofSpeedValue: "Recherche en direct + alertes instantanées",
    analysisSubtitle: "Désormais enrichi avec des bases alimentaires et skincare gratuites pour élargir la couverture.",
    scanSubtitle: "Utilisez votre caméra pour extraire les ingrédients en quelques secondes.",
    ctaTitle: "Transformez l'incertitude ingrédients en confiance d'achat",
    ctaBody: "Wykta combine OCR rapide, vérification des interactions et intelligence ouverte des ingrédients pour accélérer la décision d'achat.",
    analysisLanguage: "Langue d'analyse",
    ingredientList: "Liste d'ingrédients",
    ingredientsPlaceholder: "Collez les ingrédients d'étiquettes alimentaires ou skincare",
    analyzeButton: "Analyser les ingrédients",
    openCameraButton: "Ouvrir la caméra",
    captureButton: "Capturer l'étiquette",
    valueTitle: "Pourquoi les utilisateurs paient Wykta",
    starterTitle: "Starter (Gratuit)",
    starterBody: "Scans rapides, alertes de base, sortie multilingue.",
    proTitle: "Pro (Recommandé)",
    proBody: "Analyse prioritaire, insights plus riches, rapports premium.",
    footnote: "Conçu pour la conversion: valeur claire, résultats immédiats, et montée en gamme premium.",
    analysisTitle: "Analyse IA des ingrédients",
    warningTitle: "Avertissements d'interaction",
    scanTitle: "Scanner l'étiquette d'ingrédients",
    detectedTitle: "Texte détecté",
    analysisPlaceholder: "L'analyse IA apparaîtra ici",
    warningPlaceholder: "Les conflits d'ingrédients apparaîtront ici",
    noConflicts: "Aucun conflit évident entre ingrédients détecté.",
    retinolGlycolic: "Le rétinol combiné à l'acide glycolique peut augmenter l'irritation cutanée.",
    peroxideRetinol: "Le peroxyde de benzoyle peut désactiver le rétinol.",
    analyzing: "Analyse des ingrédients...",
    aiUnavailable: "Analyse IA indisponible. Vérifiez la configuration Supabase.",
    noAnalysisFor: (langName) => `L'IA n'a renvoyé aucune analyse pour ${langName}. Veuillez réessayer ou vérifier la fonction backend.`,
    failed: "Échec de l'analyse IA. Vérifiez votre connexion et Supabase.",
    ocrFailed: "Échec de l'OCR. Réessayez.",
    fallbackHeader: "Analyse d'ingrédients via données ouvertes",
    foodCategory: "Alimentaire",
    skincareCategory: "Soin de la peau",
    generalCategory: "Général",
    noPublicData: "Aucune correspondance claire trouvée dans les bases publiques."
  },
  de: {
    heroTitle: "Wykta Premium-Inhaltsstoff-Intelligenz",
    heroSubtitle: "Scannen Sie Lebensmittel- oder Hautpflegeetiketten sofort, reduzieren Sie Risiken und steigern Sie Vertrauen.",
    chipCoverage: "✅ Lebensmittel + Hautpflege",
    chipLanguage: "🌐 Unterstützung für 4 Sprachen",
    chipSpeed: "⚡ OCR-zu-Analyse in Sekunden",
    chipUpgrade: "💎 Upgrade-fähige UX",
    proofData: "Datenquellen",
    proofTrust: "Vertrauenssignal",
    proofTrustValue: "Community-gepflegte offene Datenbanken",
    proofSpeed: "Geschwindigkeit",
    proofSpeedValue: "Live-Abfrage + sofortige Warnungen",
    analysisSubtitle: "Jetzt mit kostenlosen Lebensmittel- und Hautpflege-Datenbanken für breitere Abdeckung.",
    scanSubtitle: "Nutzen Sie Ihre Kamera, um Inhaltsstoffe in Sekunden zu erfassen.",
    ctaTitle: "Machen Sie aus Unsicherheit Kaufvertrauen",
    ctaBody: "Wykta kombiniert schnelles OCR, Interaktionschecks und offene Inhaltsstoffdaten für schnellere Kaufentscheidungen.",
    analysisLanguage: "Analysesprache",
    ingredientList: "Inhaltsstoffliste",
    ingredientsPlaceholder: "Inhaltsstoffe von Lebensmittel- oder Hautpflegeetiketten einfügen",
    analyzeButton: "Inhaltsstoffe analysieren",
    openCameraButton: "Kamera öffnen",
    captureButton: "Etikett erfassen",
    valueTitle: "Warum Nutzer für Wykta zahlen",
    starterTitle: "Starter (Kostenlos)",
    starterBody: "Schnelle Scans, Basiswarnungen, mehrsprachige Ausgabe.",
    proTitle: "Pro (Empfohlen)",
    proBody: "Priorisierte Analyse, tiefere Insights, Premium-Vertrauensberichte.",
    footnote: "Für hohe Conversion entwickelt: klarer Nutzen, sofortige Ergebnisse, starkes Upgrade-Design.",
    analysisTitle: "KI-Inhaltsstoffanalyse",
    warningTitle: "Interaktionswarnungen",
    scanTitle: "Inhaltsstoffetikett scannen",
    detectedTitle: "Erkannter Text",
    analysisPlaceholder: "KI-Analyse erscheint hier",
    warningPlaceholder: "Inhaltsstoffkonflikte erscheinen hier",
    noConflicts: "Keine offensichtlichen Inhaltsstoffkonflikte erkannt.",
    retinolGlycolic: "Retinol in Kombination mit Glykolsäure kann Hautreizungen verstärken.",
    peroxideRetinol: "Benzoylperoxid kann Retinol deaktivieren.",
    analyzing: "Inhaltsstoffe werden analysiert...",
    aiUnavailable: "KI-Analyse nicht verfügbar. Bitte Supabase-Konfiguration prüfen.",
    noAnalysisFor: (langName) => `Die KI hat keine Analyse für ${langName} geliefert. Bitte erneut versuchen oder die Backend-Funktion prüfen.`,
    failed: "KI-Analyse fehlgeschlagen. Bitte Internetverbindung und Supabase prüfen.",
    ocrFailed: "OCR fehlgeschlagen. Bitte erneut versuchen.",
    fallbackHeader: "Inhaltsstoffanalyse mit Open-Data",
    foodCategory: "Lebensmittel",
    skincareCategory: "Hautpflege",
    generalCategory: "Allgemein",
    noPublicData: "Keine klare Übereinstimmung in öffentlichen Datenbanken gefunden."
  },
  zh: {
    heroTitle: "Wykta 高级成分智能分析",
    heroSubtitle: "即时扫描食品或护肤标签，降低成分风险，提升用户付费信心。",
    chipCoverage: "✅ 食品 + 护肤双场景覆盖",
    chipLanguage: "🌐 支持 4 种语言",
    chipSpeed: "⚡ OCR 到分析仅需数秒",
    chipUpgrade: "💎 可升级的高端体验",
    proofData: "数据来源",
    proofTrust: "信任信号",
    proofTrustValue: "社区维护的开放数据库",
    proofSpeed: "速度",
    proofSpeedValue: "实时查询 + 即时预警",
    analysisSubtitle: "现已接入免费的食品与护肤数据库，成分覆盖更广。",
    scanSubtitle: "使用相机可在数秒内提取标签成分。",
    ctaTitle: "把成分不确定性变成购买信心",
    ctaBody: "Wykta 将 OCR、相互作用检查与开放成分数据结合，帮助用户更快决策。",
    analysisLanguage: "分析语言",
    ingredientList: "成分列表",
    ingredientsPlaceholder: "粘贴食品或护肤品标签中的成分",
    analyzeButton: "分析成分",
    openCameraButton: "打开相机",
    captureButton: "拍摄标签",
    valueTitle: "用户愿意为 Wykta 付费的原因",
    starterTitle: "基础版（免费）",
    starterBody: "快速扫描、基础预警、多语言输出。",
    proTitle: "专业版（推荐）",
    proBody: "优先分析、更丰富洞察、高级可信报告。",
    footnote: "围绕高转化设计：价值清晰、结果即时、升级路径明确。",
    analysisTitle: "AI 成分分析",
    warningTitle: "成分相互作用预警",
    scanTitle: "扫描成分标签",
    detectedTitle: "识别文本",
    analysisPlaceholder: "AI 分析结果将显示在这里",
    warningPlaceholder: "成分冲突将显示在这里",
    noConflicts: "未检测到明显成分冲突。",
    retinolGlycolic: "视黄醇与乙醇酸同时使用可能增加皮肤刺激。",
    peroxideRetinol: "过氧化苯甲酰可能使视黄醇失活。",
    analyzing: "正在分析成分...",
    aiUnavailable: "AI 分析不可用。请检查 Supabase 配置。",
    noAnalysisFor: (langName) => `AI 未返回 ${langName} 的分析结果。请重试或检查后端函数。`,
    failed: "AI 分析失败。请检查网络连接和 Supabase 设置。",
    ocrFailed: "OCR 失败，请重试。",
    fallbackHeader: "开放数据成分分析",
    foodCategory: "食品",
    skincareCategory: "护肤",
    generalCategory: "通用",
    noPublicData: "在公共数据库中未找到明确匹配。"
  }
}

function currentLanguage(){
  const languageSelect = document.getElementById("language")
  return languageSelect ? languageSelect.value : "en"
}

function t(key){
  const lang = currentLanguage()
  return (uiMessages[lang] && uiMessages[lang][key]) || uiMessages.en[key] || key
}

function tf(key, ...args){
  const template = t(key)
  return typeof template === "function" ? template(...args) : template
}

function localizeStaticUI(){
  document.querySelectorAll("[data-i18n]").forEach((node) => {
    const key = node.getAttribute("data-i18n")
    if(!key) return
    node.textContent = t(key)
  })

  document.querySelectorAll("[data-i18n-placeholder]").forEach((node) => {
    const key = node.getAttribute("data-i18n-placeholder")
    if(!key) return
    node.setAttribute("placeholder", t(key))
  })

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

function displayAIAnalysis(message, rawLines) {
  const el = document.getElementById("ingredientResult")
  if(!el) return

  el.innerHTML = ""

  if(message){
    const isLoading = message === t("analyzing")
    const cls = isLoading ? "info" : "error"
    const icon = isLoading
      ? `<span class="spinner"></span>`
      : `<span>⚠️</span>`
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

  const dangerWords  = ["allergen", "allergène", "allergy", "avoid"]
  const cautionWords = ["irritat", "sensitiv", "caution", "monitor", "deactivat", "increase skin", "may affect", "peut augmenter", "kann"]

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
      el.insertAdjacentHTML("beforeend",
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

async function lookupOpenFoodFacts(ingredient) {
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
  if(!match) return null

  const productName = match.product_name || "N/A"
  const allergenTags = Array.isArray(match.allergens_tags)
    ? [...new Set(match.allergens_tags.map(stripTagPrefix).filter(Boolean))].slice(0, 3)
    : []
  const processingTag = Array.isArray(match.ingredients_analysis_tags) && match.ingredients_analysis_tags.length
    ? stripTagPrefix(match.ingredients_analysis_tags[0])
    : null

  const notes = [
    `Source: Open Food Facts`,
    `Seen in: ${productName}`
  ]
  if(allergenTags.length) notes.push(`Allergen indicators: ${allergenTags.join(", ")}`)
  if(processingTag) notes.push(`Ingredient analysis tag: ${processingTag}`)

  return {
    category: t("foodCategory"),
    detail: notes.join(" · ")
  }
}

async function lookupOpenBeautyFacts(ingredient) {
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
  if(!match) return null

  const productName = match.product_name || "N/A"
  const categoryTag = Array.isArray(match.categories_tags) && match.categories_tags.length
    ? stripTagPrefix(match.categories_tags[0])
    : null
  const ingredientTag = Array.isArray(match.ingredients_analysis_tags) && match.ingredients_analysis_tags.length
    ? stripTagPrefix(match.ingredients_analysis_tags[0])
    : null

  const notes = [
    `Source: Open Beauty Facts`,
    `Seen in: ${productName}`
  ]
  if(categoryTag) notes.push(`Product type: ${categoryTag}`)
  if(ingredientTag) notes.push(`Ingredient tag: ${ingredientTag}`)

  return {
    category: t("skincareCategory"),
    detail: notes.join(" · ")
  }
}

function lookupLocalIngredientDb(ingredient) {
  const key = sanitizeIngredientTerm(ingredient)
  const entry = localIngredientDb[key]
  if (!entry) return null

  const catMap = {
    skincare: t("skincareCategory"),
    food:     t("foodCategory"),
    general:  t("generalCategory")
  }
  return {
    category: catMap[entry.category] || t("generalCategory"),
    detail:   `[${entry.fn}] ${entry.note}`
  }
}

async function lookupOFFIngredientTaxonomy(ingredient) {
  const slug = sanitizeIngredientTerm(ingredient).replace(/\s+/g, "-")
  if (!slug) return null
  const url = `https://world.openfoodfacts.org/ingredient/${encodeURIComponent(slug)}.json`
  const data = await fetchJsonWithTimeout(url, 6000)
  // OFF ingredient taxonomy response includes fields like name, wikidata, parents, children
  if (!data || (!data.name && !data.wikidata && !data.id)) return null

  const ingredientName = data.name || slug
  const notes = [`Source: Open Food Facts ingredient taxonomy`, `Ingredient: ${ingredientName}`]
  if (data.wikidata) notes.push(`Wikidata: ${data.wikidata}`)

  return {
    category: t("foodCategory"),
    detail:   notes.join(" · ")
  }
}

async function analyzeWithFreeDatabases(ingredients) {
  const lines = [`${t("fallbackHeader")}:`]

  const analysisLines = await Promise.all(ingredients.map(async (ingredient) => {
    // 1. Check embedded local database first (instant, no network required)
    const localResult = lookupLocalIngredientDb(ingredient)
    if (localResult) {
      return `${ingredient}: [${localResult.category}] ${localResult.detail}`
    }

    // 2. Try OFF ingredient taxonomy (direct per-ingredient lookup),
    //    OFF product search, and OBF product search in parallel
    const [offTaxResult, foodResult, beautyResult] = await Promise.allSettled([
      lookupOFFIngredientTaxonomy(ingredient),
      lookupOpenFoodFacts(ingredient),
      lookupOpenBeautyFacts(ingredient)
    ])

    const firstHit = [
      offTaxResult.status  === "fulfilled" ? offTaxResult.value  : null,
      foodResult.status    === "fulfilled" ? foodResult.value    : null,
      beautyResult.status  === "fulfilled" ? beautyResult.value  : null
    ].find(Boolean)

    const detail = firstHit
      ? firstHit
      : { category: t("generalCategory"), detail: t("noPublicData") }

    return `${ingredient}: [${detail.category}] ${detail.detail}`
  }))
  lines.push(...analysisLines)

  return lines.join("\n")
}


/* -----------------------
AI ANALYSIS
----------------------- */

async function analyzeWithAI(ingredients){
  if(!Array.isArray(ingredients) || !ingredients.length){
    displayAIAnalysis(t("analysisPlaceholder"), [])
    return
  }

  displayAIAnalysis(t("analyzing"), [])

  if(supabaseClient){
    try{
      const lang = document.getElementById("language").value
      const langName = languageNames[lang] || lang
      const langLocale = languageLocales[lang] || lang

      const { data, error } =
        await supabaseClient.functions.invoke(
          "wykta-backend",
          {
            body: {
              ingredients,
              lang: langLocale,
              targetLanguage: langName,
              promptLanguage: langName
            }
          }
        )

      if(error) throw error

      console.log("AI result:", data)

      if(data && data.analysis){
        const lines = data.analysis.split("\n")
        displayAIAnalysis("", lines)
        return
      }

      console.warn(tf("noAnalysisFor", langName))
    } catch(err){
      console.error("AI function error, using open databases fallback:", err)
    }
  }

  try{
    const fallbackAnalysis = await analyzeWithFreeDatabases(ingredients)
    displayAIAnalysis("", fallbackAnalysis.split("\n"))
  } catch(err){
    console.error("Public database lookup error:", err)
    displayAIAnalysis(t("failed"), [])
  }
}

/* -----------------------
ANALYZE BUTTON LOADING STATE
----------------------- */

function setAnalyzeBtnLoading(isLoading){
  const btn = document.getElementById("analyzeBtn")
  if(!btn) return

  const icon    = btn.querySelector(".btn-icon")
  const btnText = btn.querySelector("[data-i18n='analyzeButton']")

  if(isLoading){
    btn.disabled = true
    if(icon) icon.textContent = ""
    if(!btn.querySelector(".spinner")){
      btn.insertAdjacentHTML("afterbegin", '<span class="spinner" id="analyzeBtnSpinner"></span>')
    }
  } else {
    btn.disabled = false
    const spinner = document.getElementById("analyzeBtnSpinner")
    if(spinner) spinner.remove()
    if(icon) icon.textContent = "🔬"
    if(btnText) btnText.textContent = t("analyzeButton")
  }
}

/* -----------------------
MAIN ANALYSIS BUTTON
----------------------- */

async function analyzeIngredients(){
  const resultsSection = document.getElementById("resultsSection")
  if(resultsSection) resultsSection.style.display = ""

  setAnalyzeBtnLoading(true)

  const text = document.getElementById("ingredients").value
  const ingredients = extractIngredients(text)
  const warnings = checkInteractions(ingredients)

  displayInteractions(warnings)

  await saveResult(text, warnings.join("; "))
  await analyzeWithAI(ingredients)

  setAnalyzeBtnLoading(false)
}

/* -----------------------
CAMERA SCAN
----------------------- */

let stream

async function startScan(){

try{

stream = await navigator.mediaDevices.getUserMedia({
video: true
})

const video = document.getElementById("camera")

video.srcObject = stream

const placeholder = document.getElementById("cameraPlaceholder")
if(placeholder) placeholder.style.display = "none"

}catch(err){

console.error("Camera error:", err)

}

}

/* -----------------------
CAPTURE IMAGE
----------------------- */

async function capture(){

const video = document.getElementById("camera")
const canvas = document.getElementById("snapshot")

const ctx = canvas.getContext("2d")

canvas.width = video.videoWidth
canvas.height = video.videoHeight

ctx.drawImage(video, 0, 0)

if(stream){
stream.getTracks().forEach(track => track.stop())
}

runOCR(canvas)

}

/* -----------------------
OCR TEXT RECOGNITION
----------------------- */
/* -----------------------
OCR TEXT RECOGNITION (Simpler, main thread)
----------------------- */
async function runOCR(canvas) {
  try {
    const selectedLang = currentLanguage()
    const ocrLang = ocrLanguageCodes[selectedLang] || "eng"
    const { data } = await Tesseract.recognize(canvas, ocrLang);
    const text = data.text;

    const ocrEl = document.getElementById("ocrResult")
    if(ocrEl){
      ocrEl.innerText = text;
      ocrEl.classList.add("visible")
    }
    document.getElementById("ingredients").value = text;

    await analyzeIngredients();
  } catch (err) {
    console.error("OCR error:", err);
    document.getElementById("ocrResult").innerText = t("ocrFailed");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  localizeStaticUI()

  const languageSelect = document.getElementById("language")
  if(languageSelect){
    languageSelect.addEventListener("change", () => {
      localizeStaticUI()
    })
  }
})
