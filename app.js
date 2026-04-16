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
    if(!response.ok) throw new Error(`HTTP ${response.status}`)
    return await response.json()
  } finally {
    clearTimeout(timeout)
  }
}

function getBestProductMatch(products = [], ingredient) {
  if(!products.length) return null
  const normalizedIngredient = sanitizeIngredientTerm(ingredient)
  if(!normalizedIngredient) return products[0]

  return products.find((product) => {
    const ingredientsText = sanitizeIngredientTerm(product.ingredients_text || product.ingredients_text_en || "")
    return ingredientsText.includes(normalizedIngredient)
  }) || products[0]
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
  const allergenTag = Array.isArray(match.allergens_tags) && match.allergens_tags.length
    ? stripTagPrefix(match.allergens_tags[0])
    : null
  const processingTag = Array.isArray(match.ingredients_analysis_tags) && match.ingredients_analysis_tags.length
    ? stripTagPrefix(match.ingredients_analysis_tags[0])
    : null

  const notes = [
    `Source: Open Food Facts`,
    `Seen in: ${productName}`
  ]
  if(allergenTag) notes.push(`Allergen indicator: ${allergenTag}`)
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

async function analyzeWithFreeDatabases(ingredients) {
  const lines = [`${t("fallbackHeader")}:`]

  await Promise.all(ingredients.map(async (ingredient) => {
    const [foodResult, beautyResult] = await Promise.allSettled([
      lookupOpenFoodFacts(ingredient),
      lookupOpenBeautyFacts(ingredient)
    ])

    const firstHit = [
      foodResult.status === "fulfilled" ? foodResult.value : null,
      beautyResult.status === "fulfilled" ? beautyResult.value : null
    ].find(Boolean)

    const detail = firstHit
      ? firstHit
      : { category: t("foodCategory"), detail: t("noPublicData") }

    lines.push(`${ingredient}: [${detail.category}] ${detail.detail}`)
  }))

  return lines.join("\n")
}

/* -----------------------
AI ANALYSIS
----------------------- */

async function analyzeWithAI(ingredients){
  displayAIAnalysis(t("analyzing"), [])

  if(!Array.isArray(ingredients) || !ingredients.length){
    displayAIAnalysis(t("analysisPlaceholder"), [])
    return
  }

  if(supabaseClient){
    try{
      const lang = document.getElementById("language").value
      const langName = languageNames[lang] || lang
      const langLocale = languageLocales[lang] || lang

      const { data, error } =
        await supabaseClient.functions.invoke(
          "Wykta-backend",
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
