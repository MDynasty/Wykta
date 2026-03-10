console.log("Wykta app started")

function extractIngredients(text){

return text
.split(",")
.map(i => i.trim().toLowerCase())
.filter(i => i.length > 0)

}

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

function displayInteractions(warnings){

const el = document.getElementById("interactionWarnings")

if(!warnings.length){
el.innerText = "No obvious ingredient conflicts detected."
return
}

el.innerText = warnings.join("\n")

}

async function saveResult(input, result){

try{

const { data, error } =
await supabaseClient
.from("ingredient_checks")
.insert([
{
input: input,
result: result
}
])

console.log("Saved:", data, error)

}catch(err){

console.error("Database save error:", err)

}

}

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

document.getElementById("ingredientResult").innerText =
data?.analysis || "No AI analysis returned."

}catch(err){

console.error("AI function error:", err)

document.getElementById("ingredientResult").innerText =
"AI analysis unavailable."

}

}

async function analyzeIngredients(){

let text =
document.getElementById("ingredients").value

let ingredients =
extractIngredients(text)

let warnings =
checkInteractions(ingredients)

displayInteractions(warnings)

await saveResult(
text,
warnings.join("; ")
)

await analyzeWithAI(ingredients)

}