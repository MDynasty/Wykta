console.log("Wykta app started")

/* -----------------------
SUPABASE CONNECTION
----------------------- */

const supabaseUrl = "https://rryuicpnjxxzsmkotgrj.supabase.co"

const supabaseKey = "eyJhbGc..."; // sensitive

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

const el = document.getElementById("ingredientResult")

if(el){

const lines = (data?.analysis || "No AI analysis returned.").split("\n")

el.innerHTML = lines.map(line =>
`<div class="result-card">${line}</div>`
).join("")

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

if(stream){
stream.getTracks().forEach(track => track.stop())
}

runOCR(canvas)

}

/* -----------------------
OCR TEXT RECOGNITION
----------------------- */

/* -----------------------
OCR TEXT RECOGNITION (Simpler)
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