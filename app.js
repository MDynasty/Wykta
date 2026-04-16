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


function extractIngredients(text){
  const normalizedText = (text || "").toLowerCase().trim()
  if(!normalizedText) return []

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

  const escapedKnown = knownIngredients
    .slice()
    .sort((a, b) => b.length - a.length)
    .map(i => i.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))

  const foundByVocabulary = escapedKnown
    .filter(ingredient => new RegExp(`(^|[^a-z0-9])${ingredient}($|[^a-z0-9])`, "i").test(normalizedText))
    .map(i => i.replace(/\\([.*+?^${}()|[\]\\])/g, "$1"))

  const splitByPunctuation = normalizedText
    .split(/[,\.;:•\n\r\t，；。、|/\\]+/)
    .map(i => i.trim())
    .filter(i => i.length > 0)

  const fallbackSplit = splitByPunctuation.length > 1
    ? splitByPunctuation
    : foundByVocabulary.length
      ? []
      : normalizedText
        .split(/\s+(?:and|und|et|y|e|和)\s+|\s{2,}/i)
        .map(i => i.trim())
        .filter(i => i.length > 0)

  const unique = []
  ;[...foundByVocabulary, ...fallbackSplit].forEach(item => {
    if(!item) return
    if(!unique.includes(item)) unique.push(item)
  })

  return unique
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
el.innerText = t("noConflicts")
return
}

el.innerText = warnings.join("\n")

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
    noConflicts: "No obvious ingredient conflicts detected.",
    retinolGlycolic: "Retinol combined with glycolic acid may increase skin irritation.",
    peroxideRetinol: "Benzoyl peroxide may deactivate retinol.",
    analyzing: "Analyzing ingredients...",
    aiUnavailable: "AI analysis unavailable. Please check your Supabase configuration.",
    noAnalysis: "AI returned no analysis for",
    noAnalysisTail: "Please try again or check the backend function.",
    failed: "AI analysis failed. Please check your internet connection and Supabase setup.",
    ocrFailed: "OCR failed. Try again."
  },
  fr: {
    noConflicts: "Aucun conflit évident entre ingrédients détecté.",
    retinolGlycolic: "Le rétinol combiné à l'acide glycolique peut augmenter l'irritation cutanée.",
    peroxideRetinol: "Le peroxyde de benzoyle peut désactiver le rétinol.",
    analyzing: "Analyse des ingrédients...",
    aiUnavailable: "Analyse IA indisponible. Vérifiez la configuration Supabase.",
    noAnalysis: "L'IA n'a renvoyé aucune analyse pour",
    noAnalysisTail: "Veuillez réessayer ou vérifier la fonction backend.",
    failed: "Échec de l'analyse IA. Vérifiez votre connexion et Supabase.",
    ocrFailed: "Échec de l'OCR. Réessayez."
  },
  de: {
    noConflicts: "Keine offensichtlichen Inhaltsstoffkonflikte erkannt.",
    retinolGlycolic: "Retinol in Kombination mit Glykolsäure kann Hautreizungen verstärken.",
    peroxideRetinol: "Benzoylperoxid kann Retinol deaktivieren.",
    analyzing: "Inhaltsstoffe werden analysiert...",
    aiUnavailable: "KI-Analyse nicht verfügbar. Bitte Supabase-Konfiguration prüfen.",
    noAnalysis: "Die KI hat keine Analyse für",
    noAnalysisTail: "Bitte erneut versuchen oder die Backend-Funktion prüfen.",
    failed: "KI-Analyse fehlgeschlagen. Bitte Internetverbindung und Supabase prüfen.",
    ocrFailed: "OCR fehlgeschlagen. Bitte erneut versuchen."
  },
  zh: {
    noConflicts: "未检测到明显成分冲突。",
    retinolGlycolic: "视黄醇与乙醇酸同时使用可能增加皮肤刺激。",
    peroxideRetinol: "过氧化苯甲酰可能使视黄醇失活。",
    analyzing: "正在分析成分...",
    aiUnavailable: "AI 分析不可用。请检查 Supabase 配置。",
    noAnalysis: "AI 未返回以下语言的分析：",
    noAnalysisTail: "请重试或检查后端函数。",
    failed: "AI 分析失败。请检查网络连接和 Supabase 设置。",
    ocrFailed: "OCR 失败，请重试。"
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
    el.insertAdjacentHTML(
      "beforeend",
      `<div class="warning">${message}</div>`
    )
  }

  if(Array.isArray(rawLines) && rawLines.length){
    el.insertAdjacentHTML(
      "beforeend",
      rawLines.map(line =>
        `<div class="result-card">${line}</div>`
      ).join("")
    )
  }
}

/* -----------------------
AI ANALYSIS
----------------------- */

async function analyzeWithAI(ingredients){
  displayAIAnalysis(t("analyzing"), [])

  if(!supabaseClient){
    displayAIAnalysis(t("aiUnavailable"), [])
    return
  }

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

    if(!data || !data.analysis){
      displayAIAnalysis(`${t("noAnalysis")} ${langName}. ${t("noAnalysisTail")}`, [])
      return
    }

    const lines = data.analysis.split("\n")
    displayAIAnalysis("", lines)

  } catch(err){
    console.error("AI function error:", err)
    displayAIAnalysis(t("failed"), [])
  }
}

/* -----------------------
MAIN ANALYSIS BUTTON
----------------------- */

async function analyzeIngredients(){
  const text = document.getElementById("ingredients").value
  const ingredients = extractIngredients(text)
  const warnings = checkInteractions(ingredients)

  displayInteractions(warnings)

  await saveResult(text, warnings.join("; "))
  await analyzeWithAI(ingredients)
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

    document.getElementById("ocrResult").innerText = text;
    document.getElementById("ingredients").value = text;

    await analyzeIngredients();
  } catch (err) {
    console.error("OCR error:", err);
    document.getElementById("ocrResult").innerText = t("ocrFailed");
  }
}
