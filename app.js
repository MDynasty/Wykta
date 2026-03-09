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

let response = await fetch(
"https://YOURPROJECT.supabase.co/functions/v1/analyze",
{
method:"POST",
headers:{
"Content-Type":"application/json"
},
body: JSON.stringify({
ingredients: ingredients
})
});

let data = await response.json();

document.getElementById("ingredientResult")
.innerText = data.result;

}
