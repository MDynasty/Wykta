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

const ingredientDefinitions = {
  // English
  water: "A moisturizing base and solvent used in most skincare formulations.",
  glycerin: "A humectant that draws moisture to the skin and helps maintain hydration.",
  niacinamide: "Vitamin B3 that can help improve skin texture, reduce pores, and brighten tone.",
  "phenoxyethanol": "A preservative commonly used to prevent bacterial growth in cosmetics.",
  retinol: "A vitamin A derivative that boosts cell turnover and can improve fine lines.",
  "glycolic acid": "An AHA exfoliant that helps shed dead skin cells and smooth texture.",
  "benzoyl peroxide": "An acne-fighting ingredient that kills acne-causing bacteria.",
  "tocopherol": "Vitamin E, an antioxidant that protects skin from free-radical damage.",
  "sodium hyaluronate": "A form of hyaluronic acid that helps skin retain moisture.",
  "aloe vera": "A soothing plant extract with calming and hydrating properties.",

  // German
  wasser: "Eine feuchtigkeitsspendende Basis und Lösungsmittel, die in den meisten Hautpflegeformulierungen verwendet wird.",
  glycerin: "Ein Feuchthaltemittel, das Feuchtigkeit in die Haut zieht und die Hydratation unterstützt.",
  niacinamid: "Vitamin B3, das helfen kann, die Hauttextur zu verbessern, Poren zu reduzieren und den Teint aufzuhellen.",
  phenoxyethanol: "Ein Konservierungsmittel, das häufig verwendet wird, um das Bakterienwachstum in Kosmetika zu verhindern.",
  retinol: "Ein Vitamin-A-Derivat, das die Zellumsatzrate erhöht und feine Linien verbessern kann.",
  "glykolsäure": "Ein AHA-Peeling, das hilft, abgestorbene Hautzellen zu entfernen und die Textur zu glätten.",
  "benzoylperoxid": "Ein aknebekämpfender Inhaltsstoff, der akneverursachende Bakterien abtötet.",
  tocopherol: "Vitamin E, ein Antioxidans, das die Haut vor freien Radikalen schützt.",
  "natriumhyaluronat": "Eine Form von Hyaluronsäure, die hilft, die Hautfeuchtigkeit zu speichern.",
  "aloe vera": "Ein beruhigender Pflanzenextrakt mit beruhigenden und feuchtigkeitsspendenden Eigenschaften.",

  // French
  eau: "Une base hydratante et solvant utilisée dans la plupart des formulations de soins de la peau.",
  glycérine: "Un humectant qui attire l'humidité dans la peau et aide à maintenir l'hydratation.",
  niacinamide: "Vitamine B3 qui peut aider à améliorer la texture de la peau, réduire les pores et éclaircir le teint.",
  phénoxyéthanol: "Un conservateur couramment utilisé pour prévenir la croissance bactérienne dans les cosmétiques.",
  rétinol: "Un dérivé de la vitamine A qui stimule le renouvellement cellulaire et peut améliorer les rides fines.",
  "acide glycolique": "Un exfoliant AHA qui aide à éliminer les cellules mortes de la peau et à lisser la texture.",
  "peroxyde de benzoyle": "Un ingrédient anti-acné qui tue les bactéries causant l'acné.",
  tocophérol: "Vitamine E, un antioxydant qui protège la peau des dommages causés par les radicaux libres.",
  "hyaluronate de sodium": "Une forme d'acide hyaluronique qui aide la peau à retenir l'humidité.",
  "aloe vera": "Un extrait végétal apaisant avec des propriétés calmantes et hydratantes.",

  // Chinese
  水: "一种保湿基质和溶剂，用于大多数护肤配方。",
  甘油: "一种保湿剂，能将水分吸入皮肤，帮助维持水分。",
  烟酰胺: "维生素B3，可以帮助改善皮肤质地、减少毛孔、提亮肤色。",
  苯氧乙醇: "一种常用防腐剂，用于防止化妆品中的细菌生长。",
  视黄醇: "一种维生素A衍生物，能促进细胞更新，并改善细纹。",
  果酸: "一种AHA去角质剂，帮助去除死皮细胞，平滑质地。",
  过氧化苯甲酰: "一种抗痘成分，能杀死引起痘痘的细菌。",
  生育酚: "维生素E，一种抗氧化剂，能保护皮肤免受自由基损伤。",
  玻尿酸钠: "一种玻尿酸形式，帮助皮肤保持水分。",
  芦荟: "一种舒缓植物提取物，具有镇静和保湿特性。"
}


function extractIngredients(text){
  return text
    .split(/,|;|•|\n/)
    .map(i => i.trim().toLowerCase())
    .filter(i => i.length > 0)
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
"Retinol combined with glycolic acid may increase skin irritation."
)
}

if(
ingredients.includes("benzoyl peroxide") &&
ingredients.includes("retinol")
){
warnings.push(
"Benzoyl peroxide may deactivate retinol."
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
el.innerText = "No obvious ingredient conflicts detected."
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

function getIngredientDefinitions(ingredients) {
  return ingredients.map(name => ({
    name,
    definition: ingredientDefinitions[name] ||
      "No local definition found for this ingredient."
  }))
}

function displayDefinitions(definitions) {
  const el = document.getElementById("ingredientResult")
  if(!el) return

  if(!definitions.length){
    el.innerText = "Enter ingredients to see definitions and local analysis."
    return
  }

  el.innerHTML = definitions.map(({ name, definition }) =>
    `<div class="result-card"><strong>${name}</strong><br>${definition}</div>`
  ).join("")
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

function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

function displayAIAnalysis(message, rawLines) {
  const el = document.getElementById("aiAnalysis")
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
  displayAIAnalysis("", [])

  if(!supabaseClient){
    if(ingredients.length){
      displayAIAnalysis("AI analysis unavailable. Showing local ingredient definitions instead.", [])
    }
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
      displayAIAnalysis(`AI returned no analysis for ${langName}. Raw response shown below.`, [])
      const aiEl = document.getElementById("aiAnalysis")
      if(aiEl){
        const rawResponse = escapeHtml(JSON.stringify(data || {}, null, 2))
        aiEl.insertAdjacentHTML(
          "beforeend",
          `<pre class="result-card" style="white-space: pre-wrap;">${rawResponse}</pre>`
        )
      }
      return
    }

    const lines = data.analysis.split("\n")
    displayAIAnalysis("", lines)

  } catch(err){
    console.error("AI function error:", err)
    displayAIAnalysis("AI analysis unavailable. Showing local ingredient definitions instead.", [])
  }
}

/* -----------------------
MAIN ANALYSIS BUTTON
----------------------- */

async function analyzeIngredients(){
  const text = document.getElementById("ingredients").value
  const ingredients = extractIngredients(text)
  const warnings = checkInteractions(ingredients)

  displayDefinitions(getIngredientDefinitions(ingredients))
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
    const { data } = await Tesseract.recognize(canvas, 'eng');
    const text = data.text;

    document.getElementById("ocrResult").innerText = text;
    document.getElementById("ingredients").value = text;

    await analyzeIngredients();
  } catch (err) {
    console.error("OCR error:", err);
    document.getElementById("ocrResult").innerText = "OCR failed. Try again.";
  }
}