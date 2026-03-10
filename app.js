const SUPABASE_URL = "https://rryuicpnjxxzsmkotgrj.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJyeXVpY3Buanh4enNta290Z3JqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwNTY1NzYsImV4cCI6MjA4ODYzMjU3Nn0.283wfb_yVscOYWHigTbIFjm6GIeVmSiVuM-XwyinNBc";

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

console.log("Wykta app started");


function extractIngredients(text){

return text
.split(",")
.map(i => i.trim().toLowerCase());

}


function checkInteractions(ingredients){

let warnings = [];

if(
ingredients.includes("retinol") &&
ingredients.includes("glycolic acid")
){
warnings.push(
"Retinol combined with glycolic acid may increase skin irritation."
);
}

if(
ingredients.includes("salicylic acid") &&
ingredients.includes("benzoyl peroxide")
){
warnings.push(
"Salicylic acid and benzoyl peroxide together may cause dryness."
);
}

return warnings;

}


async function analyzeIngredients(){

let text =
document.getElementById("ingredients").value;

let ingredients =
extractIngredients(text);

let interactionWarnings =
checkInteractions(ingredients);

displayInteractions(interactionWarnings);

await saveResult(text, interactionWarnings.join("; "));

await analyzeWithAI(ingredients);

}


function displayInteractions(warnings){

let container =
document.getElementById("interactionResult");

container.innerHTML = "";

warnings.forEach(w => {

container.innerHTML += "<p>" + w + "</p>";

});

}


async function analyzeWithAI(ingredients){

try{

let response = await fetch(
"https://rryuicpnjxxzsmkotgrj.supabase.co/functions/v1/analyze",
{
method:"POST",
headers:{
"Content-Type":"application/json",
"Authorization": `Bearer ${window.SUPABASE_ANON_KEY}`
},
body: JSON.stringify({
ingredients: ingredients
})
});

let text = await response.text();
console.log("AI function status", response.status, response.statusText);
console.log("AI function raw response", text);

if (!response.ok) {
  throw new Error(`AI function error ${response.status}: ${text}`);
}

let data;
try {
  data = JSON.parse(text);
} catch (e) {
  data = { result: text };
}

document.getElementById("ingredientResult")
.innerText = data.result || data || "No AI response yet.";

}catch(error){

console.error(error);

document.getElementById("ingredientResult")
.innerText = "AI analysis unavailable.";

}

}


async function startScan(){

try{

const video =
document.getElementById("camera");

const stream =
await navigator.mediaDevices.getUserMedia({
video: true
});

video.srcObject = stream;

}catch(error){

console.error("Camera error:", error);

alert("Camera access failed. Please ensure you're on HTTPS or localhost, and allow camera permissions.");

}

}


function capture(){

const video =
document.getElementById("camera");

const canvas =
document.getElementById("snapshot");

const context =
canvas.getContext("2d");

canvas.width = video.videoWidth;
canvas.height = video.videoHeight;

context.drawImage(
video,
0,
0,
canvas.width,
canvas.height
);

scanImage(canvas);

}


async function scanImage(canvas){

const result =
await Tesseract.recognize(
canvas,
"eng"
);

let text = result.data.text;

text = cleanOCR(text);

document.getElementById("ingredients").value = text;

}


function cleanOCR(text){

return text
.replace(/\n/g,",")
.replace(/\s{2,}/g,",")
.replace(/\s/g,",")
.replace(/,+/g,",")
.trim();

}

async function testConnection(){

const { data, error } = await supabase
.from("test")
.select("*")

console.log(data, error)

}

testConnection()


async function saveResult(input, result){

const { data, error } = await supabase
.from("ingredient_checks")
.insert([
{
input: input,
result: result
}
])

console.log(data, error)

}