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
  return text
    .split(/[,\.;•\n，；]/)  // Added Chinese comma and semicolon
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
  displayAIAnalysis("Analyzing ingredients...", [])

  if(!supabaseClient){
    displayAIAnalysis("AI analysis unavailable. Please check your Supabase configuration.", [])
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
      displayAIAnalysis(`AI returned no analysis for ${langName}. Please try again or check the backend function.`, [])
      return
    }

    const lines = data.analysis.split("\n")
    displayAIAnalysis("", lines)

  } catch(err){
    console.error("AI function error:", err)
    displayAIAnalysis("AI analysis failed. Please check your internet connection and Supabase setup.", [])
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