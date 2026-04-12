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
  water: "A moisturizing base and solvent used in most skincare formulations.",
  glycerin: "A humectant that draws moisture to the skin and helps maintain hydration.",
  niacinamide: "Vitamin B3 that can help improve skin texture, reduce pores, and brighten tone.",
  "phenoxyethanol": "A preservative commonly used to prevent bacterial growth in cosmetics.",
  retinol: "A vitamin A derivative that boosts cell turnover and can improve fine lines.",
  "glycolic acid": "An AHA exfoliant that helps shed dead skin cells and smooth texture.",
  "benzoyl peroxide": "An acne-fighting ingredient that kills acne-causing bacteria.",
  "tocopherol": "Vitamin E, an antioxidant that protects skin from free-radical damage.",
  "sodium hyaluronate": "A form of hyaluronic acid that helps skin retain moisture.",
  "aloe vera": "A soothing plant extract with calming and hydrating properties."
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

/* -----------------------
AI ANALYSIS
----------------------- */

async function analyzeWithAI(ingredients){
  const el = document.getElementById("ingredientResult")

  if(!supabaseClient){
    if(el && ingredients.length){
      el.insertAdjacentHTML(
        "afterbegin",
        `<div class="warning">AI analysis unavailable. Showing local ingredient definitions instead.</div>`
      )
    }
    return
  }

  try{
    const lang = document.getElementById("language").value

    const { data, error } =
      await supabaseClient.functions.invoke(
        "Wykta-backend",
        {
          body: { ingredients, lang }
        }
      )

    if(error) throw error

    console.log("AI result:", data)

    if(!el) return

    const lines = (data?.analysis || "No AI analysis returned.").split("\n")
    el.innerHTML = lines.map(line =>
      `<div class="result-card">${line}</div>`
    ).join("")

  } catch(err){
    console.error("AI function error:", err)

    if(el){
      el.innerText = "AI analysis unavailable."
    }
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