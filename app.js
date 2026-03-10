console.log("Wykta app started")

/* -----------------------
SUPABASE CONNECTION
----------------------- */

const supabaseUrl = "https://rryuicpnjxxzsmkotgrj.supabase.co"

const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJyeXVpY3Buanh4enNta290Z3JqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwNTY1NzYsImV4cCI6MjA4ODYzMjU3Nn0.283wfb_yVscOYWHigTbIFjm6GIeVmSiVuM-XwyinNBc"

const { createClient } = supabase

const supabaseClient = createClient(
  supabaseUrl,
  supabaseKey
)

console.log("Supabase connected")
/* -----------------------
INGREDIENT PARSER
----------------------- */

function extractIngredients(text){

return text
.split(",")
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

try{

const { data, error } =
await supabaseClient
.from("ingredient_checks")
.insert([{ input, result }])
.select()

if(error) throw error

console.log("Saved:", data)

}catch(err){

console.error("Database save error:", err)

}

}

/* -----------------------
AI ANALYSIS
----------------------- */

async function analyzeWithAI(ingredients){

try{

const { data, error } =
await supabaseClient.functions.invoke(
"Wykta-backend",
{
body: { ingredients }
}
)

if(error) throw error

console.log("AI result:", data)

const el = document.getElementById("ingredientResult")

if(el){
el.innerText =
data?.analysis || "No AI analysis returned."
}

}catch(err){

console.error("AI function error:", err)

const el = document.getElementById("ingredientResult")

if(el){
el.innerText = "AI analysis unavailable."
}

}

}

/* -----------------------
MAIN ANALYSIS BUTTON
----------------------- */

async function analyzeIngredients(){

const text =
document.getElementById("ingredients").value

const ingredients =
extractIngredients(text)

const warnings =
checkInteractions(ingredients)

displayInteractions(warnings)

await saveResult(
text,
warnings.join("; ")
)

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

runOCR(canvas)

}

/* -----------------------
OCR TEXT RECOGNITION
----------------------- */

async function runOCR(canvas){

const result = await Tesseract.recognize(
canvas,
"eng"
)

const text = result.data.text

document.getElementById("ocrResult").innerText = text

}