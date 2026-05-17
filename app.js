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

/* -----------------------
PREMIUM STATE MANAGEMENT
----------------------- */

// Check if user has premium (stored in localStorage for demo)
let isPremium = localStorage.getItem('wykta_premium') === 'true'
const FREE_SCAN_LIMIT = 2
let freeScanCount = 0

// Update UI based on premium status
function updatePremiumUI() {
  const freeBadge = document.querySelector('.app header .badge.free')
  const premiumBadge = document.querySelector('.app header .premium-badge')
  const cameraNote = document.getElementById('cameraNote')
  const upgradeSection = document.getElementById('upgradeCard')

  if (isPremium) {
    // Premium user
    if (freeBadge) freeBadge.style.display = 'none'
    if (premiumBadge) {
      premiumBadge.textContent = 'Premium Active'
      premiumBadge.style.background = 'linear-gradient(135deg, #10b981, #059669)'
      premiumBadge.style.cursor = 'default'
    }
    if (cameraNote) cameraNote.innerText = 'Unlimited scans and uploads with advanced OCR.'
    if (upgradeSection) upgradeSection.style.display = 'none'
  } else {
    // Free user
    if (freeBadge) freeBadge.style.display = 'inline-flex'
    if (premiumBadge) {
      premiumBadge.textContent = 'Premium Available'
      premiumBadge.style.background = 'linear-gradient(135deg, var(--primary), var(--primary-dark))'
      premiumBadge.style.cursor = 'pointer'
    }
    if (cameraNote) {
      if (freeScanCount >= FREE_SCAN_LIMIT) {
        cameraNote.innerText = 'Free scan/upload limit reached. Upgrade to Premium for unlimited scanning.'
      } else {
        cameraNote.innerText = `Free scans/uploads remaining: ${FREE_SCAN_LIMIT - freeScanCount} of ${FREE_SCAN_LIMIT} this session.`
      }
    }
    if (upgradeSection) upgradeSection.style.display = 'block'
  }
}

function updateCloudStatusUI() {
  const cloudBadge = document.getElementById('cloudStatusBadge')
  const cloudStatusText = document.getElementById('cloudStatusText')

  if (!cloudBadge || !cloudStatusText) return

  if (supabaseClient) {
    cloudBadge.textContent = 'Cloud connected'
    cloudBadge.classList.add('connected')
    cloudBadge.classList.remove('offline')
    cloudStatusText.textContent = 'Live backend detected. AI analysis will run via Supabase Edge Function.'
    return
  }

  cloudBadge.textContent = 'Cloud not configured'
  cloudBadge.classList.add('offline')
  cloudBadge.classList.remove('connected')
  cloudStatusText.textContent = 'Cloud AI is unavailable. Local multilingual food and skincare analysis will be used until Supabase is configured.'
}

// Upgrade to premium (demo implementation)
function upgradeToPremium() {
  // Show upgrade modal
  showUpgradeModal()
}

// Show upgrade modal
function showUpgradeModal() {
  // Create modal overlay
  const modal = document.createElement('div')
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  `

  modal.innerHTML = `
    <div style="
      background: white;
      padding: 40px;
      border-radius: 16px;
      max-width: 400px;
      text-align: center;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
    ">
      <h2 style="color: var(--primary-dark); margin-bottom: 16px;">Upgrade to Premium</h2>
      <p style="color: var(--text-secondary); margin-bottom: 24px;">
        Get unlimited advanced scans, faster OCR, priority support, and personalized diet recommendations!
      </p>
      <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 24px;">
        <div style="font-size: 24px; font-weight: bold; color: var(--primary); margin-bottom: 8px;">$4.99/month</div>
        <div style="font-size: 14px; color: var(--text-secondary);">Cancel anytime</div>
      </div>
      <button id="confirmUpgrade" style="
        background: linear-gradient(135deg, var(--secondary), #d97706);
        color: white;
        border: none;
        padding: 12px 24px;
        border-radius: 8px;
        font-size: 16px;
        font-weight: 600;
        cursor: pointer;
        margin-right: 12px;
      ">🚀 Upgrade Now</button>
      <button id="cancelUpgrade" style="
        background: #e5e7eb;
        color: var(--text-secondary);
        border: none;
        padding: 12px 24px;
        border-radius: 8px;
        font-size: 16px;
        cursor: pointer;
      ">Maybe Later</button>
    </div>
  `

  document.body.appendChild(modal)

  // Handle upgrade confirmation
  document.getElementById('confirmUpgrade').onclick = () => {
    isPremium = true
    localStorage.setItem('wykta_premium', 'true')
    updatePremiumUI()
    document.body.removeChild(modal)
    showSuccessMessage('Welcome to Premium! 🎉')
  }

  // Handle cancel
  document.getElementById('cancelUpgrade').onclick = () => {
    document.body.removeChild(modal)
  }

  // Close modal on outside click
  modal.onclick = (e) => {
    if (e.target === modal) {
      document.body.removeChild(modal)
    }
  }
}

// Show success message
function showSuccessMessage(message) {
  const toast = document.createElement('div')
  toast.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: var(--success);
    color: white;
    padding: 16px 24px;
    border-radius: 8px;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    z-index: 1000;
    font-weight: 500;
  `
  toast.textContent = message
  document.body.appendChild(toast)

  setTimeout(() => {
    if (toast.parentNode) {
      document.body.removeChild(toast)
    }
  }, 3000)
}

// Debug function to toggle premium (call from console: togglePremium())
window.togglePremium = function() {
  isPremium = !isPremium
  localStorage.setItem('wykta_premium', isPremium.toString())
  updatePremiumUI()
  showSuccessMessage(isPremium ? 'Premium activated! 🎉' : 'Switched to free tier')
}

// Debug function to test OCR processing (call from console: testOCR("your text here"))
window.testOCR = function(text) {
  const processed = processExtractedText(text)
  const validation = validateIngredientListAdvanced(processed)
  console.log("Original:", text)
  console.log("Processed:", processed)
  console.log("Validation:", validation)
  return { processed, validation }
}

// Test OCR with sample text
function testOCRWithSample() {
  const sampleText = "INGREDIENTS: water, sugar, wheat flour, palm oil, salt, eggs, milk powder, baking soda, vanilla extract. Contains: wheat, eggs, milk.";
  const processed = processExtractedText(sampleText);
  const validation = validateIngredientListAdvanced(processed);

  document.getElementById("ocrResult").innerText = `🧪 Test Results:\n✅ Valid: ${validation.isValid}\n📝 Processed: ${processed}`;
  document.getElementById("ingredients").value = processed;
}

// Initialize premium UI on load
document.addEventListener('DOMContentLoaded', () => {
  updatePremiumUI()
  updateCloudStatusUI()
})


function extractIngredients(text) {
  if (!text || !text.trim()) return []

  const prepared = prepareIngredientText(text)
  const pattern = buildIngredientSearchPattern()
  const matcher = pattern ? new RegExp(pattern, 'gu') : null
  const results = []

  if (!matcher) {
    return splitUnknownIngredientSegment(prepared)
  }

  let cursor = 0
  let match
  while ((match = matcher.exec(prepared)) !== null) {
    const rawBefore = prepared.slice(cursor, match.index)
    results.push(...splitUnknownIngredientSegment(rawBefore))

    const canonical = resolveCanonicalIngredient(match[0])
    if (canonical) {
      results.push(canonical)
    }

    cursor = match.index + match[0].length
  }

  results.push(...splitUnknownIngredientSegment(prepared.slice(cursor)))

  return results.filter(Boolean)
}


/* -----------------------
INTERACTION CHECKER
----------------------- */

function checkInteractions(ingredients){

let warnings = []

if(
ingredients.includes("sugar") &&
ingredients.includes("artificial sweeteners")
){
warnings.push(
"Combining sugar with artificial sweeteners may cause digestive discomfort."
)
}

if(
ingredients.includes("caffeine") &&
ingredients.includes("alcohol")
){
warnings.push(
"Caffeine and alcohol together may increase dehydration and heart rate."
)
}

if(
ingredients.includes("high fructose corn syrup") &&
(ingredients.includes("trans fats") || ingredients.includes("trans fat"))
){
warnings.push(
"High fructose corn syrup combined with trans fats may increase cardiovascular risks."
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
el.innerText = "No obvious nutritional conflicts detected."
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

/* Comprehensive Ingredient Database - 200+ ingredients */
const ingredientDatabase = {
  'water': { en: 'Water', type: 'solvent', safe: true },
  '水': { en: 'Water', type: 'solvent', safe: true },
  'aqua': { en: 'Water', type: 'solvent', safe: true },
  'glycérine': { en: 'Glycerin', type: 'humectant', safe: true },
  'glycerin': { en: 'Glycerin', type: 'humectant', safe: true },
  'glykolsäure': { en: 'Glycolic Acid', type: 'exfoliant', safe: true },
  'glycolic acid': { en: 'Glycolic Acid', type: 'exfoliant', safe: true },
  'sugar': { en: 'Sugar', type: 'sweetener', safe: true },
  'glucose': { en: 'Glucose', type: 'sweetener', safe: true },
  'fructose': { en: 'Fructose', type: 'sweetener', safe: true },
  'dextrose': { en: 'Dextrose', type: 'sweetener', safe: true },
  'lactose': { en: 'Lactose', type: 'sweetener', safe: true },
  'maltose': { en: 'Maltose', type: 'sweetener', safe: true },
  'sucrose': { en: 'Sucrose', type: 'sweetener', safe: true },
  'sorbitol': { en: 'Sorbitol', type: 'sweetener', safe: true },
  'maltitol': { en: 'Maltitol', type: 'sweetener', safe: true },
  'xylitol': { en: 'Xylitol', type: 'sweetener', safe: true },
  'erythritol': { en: 'Erythritol', type: 'sweetener', safe: true },
  'honey': { en: 'Honey', type: 'sweetener', safe: true },
  'molasses': { en: 'Molasses', type: 'sweetener', safe: true },
  'maple syrup': { en: 'Maple Syrup', type: 'sweetener', safe: true },
  'agave': { en: 'Agave Nectar', type: 'sweetener', safe: true },
  'rice syrup': { en: 'Rice Syrup', type: 'sweetener', safe: true },
  'corn syrup': { en: 'Corn Syrup', type: 'sweetener', safe: true },
  'high fructose corn syrup': { en: 'High Fructose Corn Syrup', type: 'sweetener', safe: false, warning: 'Associated with metabolic issues' },
  'salt': { en: 'Salt', type: 'seasoning', safe: true },
  'sea salt': { en: 'Sea Salt', type: 'seasoning', safe: true },
  'sodium chloride': { en: 'Sodium Chloride', type: 'seasoning', safe: true },
  'potassium': { en: 'Potassium', type: 'mineral', safe: true },
  'magnesium': { en: 'Magnesium', type: 'mineral', safe: true },
  'calcium': { en: 'Calcium', type: 'mineral', safe: true },
  'iron': { en: 'Iron', type: 'mineral', safe: true },
  'zinc': { en: 'Zinc', type: 'mineral', safe: true },
  'palm oil': { en: 'Palm Oil', type: 'fat', safe: true },
  'palm shortening': { en: 'Palm Shortening', type: 'fat', safe: true },
  'coconut oil': { en: 'Coconut Oil', type: 'fat', safe: true },
  'coconut shortening': { en: 'Coconut Shortening', type: 'fat', safe: true },
  'olive oil': { en: 'Olive Oil', type: 'fat', safe: true },
  'canola oil': { en: 'Canola Oil', type: 'fat', safe: true },
  'soybean oil': { en: 'Soybean Oil', type: 'fat', safe: true },
  'sunflower oil': { en: 'Sunflower Oil', type: 'fat', safe: true },
  'safflower oil': { en: 'Safflower Oil', type: 'fat', safe: true },
  'cottonseed oil': { en: 'Cottonseed Oil', type: 'fat', safe: true },
  'peanut oil': { en: 'Peanut Oil', type: 'fat', safe: true },
  'sesame oil': { en: 'Sesame Oil', type: 'fat', safe: true },
  'vegetable oil': { en: 'Vegetable Oil', type: 'fat', safe: true },
  'shortening': { en: 'Shortening', type: 'fat', safe: true },
  'trans fat': { en: 'Trans Fat', type: 'fat', safe: false, warning: 'Harmful to cardiovascular health' },
  'lard': { en: 'Lard', type: 'fat', safe: true },
  'tallow': { en: 'Tallow', type: 'fat', safe: true },
  'butter': { en: 'Butter', type: 'fat', safe: true },
  'ghee': { en: 'Ghee', type: 'fat', safe: true },
  'milk': { en: 'Milk', type: 'dairy', safe: true },
  'whole milk': { en: 'Whole Milk', type: 'dairy', safe: true },
  'skim milk': { en: 'Skim Milk', type: 'dairy', safe: true },
  'milk powder': { en: 'Milk Powder', type: 'dairy', safe: true },
  'milk solids': { en: 'Milk Solids', type: 'dairy', safe: true },
  'whey': { en: 'Whey', type: 'dairy', safe: true },
  'casein': { en: 'Casein', type: 'dairy', safe: true },
  'lactose': { en: 'Lactose', type: 'dairy', safe: true },
  'cheese': { en: 'Cheese', type: 'dairy', safe: true },
  'cream': { en: 'Cream', type: 'dairy', safe: true },
  'yogurt': { en: 'Yogurt', type: 'dairy', safe: true },
  'sour cream': { en: 'Sour Cream', type: 'dairy', safe: true },
  'buttermilk': { en: 'Buttermilk', type: 'dairy', safe: true },
  'egg': { en: 'Egg', type: 'protein', safe: true },
  'eggs': { en: 'Eggs', type: 'protein', safe: true },
  'egg white': { en: 'Egg White', type: 'protein', safe: true },
  'egg yolk': { en: 'Egg Yolk', type: 'protein', safe: true },
  'egg powder': { en: 'Egg Powder', type: 'protein', safe: true },
  'wheat': { en: 'Wheat', type: 'grain', safe: true },
  'wheat flour': { en: 'Wheat Flour', type: 'grain', safe: true },
  'wheat starch': { en: 'Wheat Starch', type: 'grain', safe: true },
  'wheat gluten': { en: 'Wheat Gluten', type: 'grain', safe: true },
  'rice': { en: 'Rice', type: 'grain', safe: true },
  'rice flour': { en: 'Rice Flour', type: 'grain', safe: true },
  'rice starch': { en: 'Rice Starch', type: 'grain', safe: true },
  'corn': { en: 'Corn', type: 'grain', safe: true },
  'corn flour': { en: 'Corn Flour', type: 'grain', safe: true },
  'cornstarch': { en: 'Cornstarch', type: 'grain', safe: true },
  'corn meal': { en: 'Corn Meal', type: 'grain', safe: true },
  'oat': { en: 'Oat', type: 'grain', safe: true },
  'oatmeal': { en: 'Oatmeal', type: 'grain', safe: true },
  'barley': { en: 'Barley', type: 'grain', safe: true },
  'rye': { en: 'Rye', type: 'grain', safe: true },
  'tapioca': { en: 'Tapioca', type: 'grain', safe: true },
  'potato starch': { en: 'Potato Starch', type: 'grain', safe: true },
  'potato': { en: 'Potato', type: 'vegetable', safe: true },
  'tomato': { en: 'Tomato', type: 'vegetable', safe: true },
  'onion': { en: 'Onion', type: 'vegetable', safe: true },
  'garlic': { en: 'Garlic', type: 'vegetable', safe: true },
  'pepper': { en: 'Pepper', type: 'spice', safe: true },
  'black pepper': { en: 'Black Pepper', type: 'spice', safe: true },
  'white pepper': { en: 'White Pepper', type: 'spice', safe: true },
  'chili pepper': { en: 'Chili Pepper', type: 'spice', safe: true },
  'paprika': { en: 'Paprika', type: 'spice', safe: true },
  'cumin': { en: 'Cumin', type: 'spice', safe: true },
  'cinnamon': { en: 'Cinnamon', type: 'spice', safe: true },
  'nutmeg': { en: 'Nutmeg', type: 'spice', safe: true },
  'clove': { en: 'Clove', type: 'spice', safe: true },
  'ginger': { en: 'Ginger', type: 'spice', safe: true },
  'turmeric': { en: 'Turmeric', type: 'spice', safe: true },
  'cardamom': { en: 'Cardamom', type: 'spice', safe: true },
  'vanilla': { en: 'Vanilla', type: 'flavoring', safe: true },
  'vanilla extract': { en: 'Vanilla Extract', type: 'flavoring', safe: true },
  'cocoa': { en: 'Cocoa', type: 'flavoring', safe: true },
  'cocoa powder': { en: 'Cocoa Powder', type: 'flavoring', safe: true },
  'chocolate': { en: 'Chocolate', type: 'flavoring', safe: true },
  'coffee': { en: 'Coffee', type: 'flavoring', safe: true },
  'tea': { en: 'Tea', type: 'flavoring', safe: true },
  'vinegar': { en: 'Vinegar', type: 'flavoring', safe: true },
  'apple cider vinegar': { en: 'Apple Cider Vinegar', type: 'flavoring', safe: true },
  'balsamic vinegar': { en: 'Balsamic Vinegar', type: 'flavoring', safe: true },
  'citric acid': { en: 'Citric Acid', type: 'preservative', safe: true },
  'lemon juice': { en: 'Lemon Juice', type: 'flavoring', safe: true },
  'lime juice': { en: 'Lime Juice', type: 'flavoring', safe: true },
  'sodium benzoate': { en: 'Sodium Benzoate', type: 'preservative', safe: true },
  'potassium sorbate': { en: 'Potassium Sorbate', type: 'preservative', safe: true },
  'sodium nitrite': { en: 'Sodium Nitrite', type: 'preservative', safe: true },
  'sodium nitrate': { en: 'Sodium Nitrate', type: 'preservative', safe: true },
  'sodium sulfite': { en: 'Sodium Sulfite', type: 'preservative', safe: true },
  'calcium propionate': { en: 'Calcium Propionate', type: 'preservative', safe: true },
  'sodium propionate': { en: 'Sodium Propionate', type: 'preservative', safe: true },
  'bha': { en: 'BHA (Butylated Hydroxyanisole)', type: 'preservative', safe: true, note: 'Controversial antioxidant' },
  'bht': { en: 'BHT (Butylated Hydroxytoluene)', type: 'preservative', safe: true, note: 'Controversial antioxidant' },
  'ascorbic acid': { en: 'Ascorbic Acid', type: 'preservative', safe: true },
  'vitamin c': { en: 'Vitamin C', type: 'vitamin', safe: true },
  'vitamin e': { en: 'Vitamin E', type: 'vitamin', safe: true },
  'vitamin a': { en: 'Vitamin A', type: 'vitamin', safe: true },
  'vitamin d': { en: 'Vitamin D', type: 'vitamin', safe: true },
  'vitamin b12': { en: 'Vitamin B12', type: 'vitamin', safe: true },
  'msg': { en: 'Monosodium Glutamate (MSG)', type: 'flavor enhancer', safe: true, note: 'May trigger sensitivity in some' },
  'monosodium glutamate': { en: 'Monosodium Glutamate', type: 'flavor enhancer', safe: true },
  'inosinate': { en: 'Disodium Inosinate', type: 'flavor enhancer', safe: true },
  'guanylate': { en: 'Disodium Guanylate', type: 'flavor enhancer', safe: true },
  'aspartame': { en: 'Aspartame', type: 'sweetener', safe: true, note: 'Artificial sweetener' },
  'sucralose': { en: 'Sucralose', type: 'sweetener', safe: true, note: 'Artificial sweetener' },
  'saccharin': { en: 'Saccharin', type: 'sweetener', safe: true, note: 'Artificial sweetener' },
  'acesulfame': { en: 'Acesulfame K', type: 'sweetener', safe: true, note: 'Artificial sweetener' },
  'neotame': { en: 'Neotame', type: 'sweetener', safe: true, note: 'Artificial sweetener' },
  'stevia': { en: 'Stevia', type: 'sweetener', safe: true, note: 'Natural sweetener' },
  'monk fruit': { en: 'Monk Fruit', type: 'sweetener', safe: true, note: 'Natural sweetener' },
  'caramel color': { en: 'Caramel Color', type: 'colorant', safe: true },
  'caramel coloring': { en: 'Caramel Coloring', type: 'colorant', safe: true },
  'red 40': { en: 'Red 40 (Allura Red)', type: 'colorant', safe: true, note: 'May affect children behavior' },
  'yellow 5': { en: 'Yellow 5 (Tartrazine)', type: 'colorant', safe: true, note: 'Can cause allergies' },
  'yellow 6': { en: 'Yellow 6 (Sunset Yellow)', type: 'colorant', safe: true },
  'blue 1': { en: 'Blue 1 (Brilliant Blue)', type: 'colorant', safe: true },
  'blue 2': { en: 'Blue 2 (Indigo Carmine)', type: 'colorant', safe: true },
  'green 3': { en: 'Green 3', type: 'colorant', safe: true },
  'red 3': { en: 'Red 3 (Erythrosine)', type: 'colorant', safe: true },
  'black 1': { en: 'Black 1 (Amaranth)', type: 'colorant', safe: true },
  'orange b': { en: 'Orange B', type: 'colorant', safe: true },
  'lithol rubine': { en: 'Lithol Rubine BK', type: 'colorant', safe: true },
  'annatto': { en: 'Annatto', type: 'colorant', safe: true },
  'beta carotene': { en: 'Beta Carotene', type: 'colorant', safe: true },
  'beetroot': { en: 'Beetroot Extract', type: 'colorant', safe: true },
  'carmine': { en: 'Carmine', type: 'colorant', safe: true },
  'cochineal': { en: 'Cochineal', type: 'colorant', safe: true },
  'spirulina': { en: 'Spirulina', type: 'colorant', safe: true },
  'chlorophyll': { en: 'Chlorophyll', type: 'colorant', safe: true },
  'iron oxide': { en: 'Iron Oxide', type: 'colorant', safe: true },
  'titanium dioxide': { en: 'Titanium Dioxide', type: 'colorant', safe: true },
  'gelatin': { en: 'Gelatin', type: 'thickener', safe: true },
  'agar': { en: 'Agar', type: 'thickener', safe: true },
  'carrageenan': { en: 'Carrageenan', type: 'thickener', safe: true },
  'xanthan gum': { en: 'Xanthan Gum', type: 'thickener', safe: true },
  'guar gum': { en: 'Guar Gum', type: 'thickener', safe: true },
  'locust bean gum': { en: 'Locust Bean Gum', type: 'thickener', safe: true },
  'tara gum': { en: 'Tara Gum', type: 'thickener', safe: true },
  'acacia gum': { en: 'Acacia Gum', type: 'thickener', safe: true },
  'arabic gum': { en: 'Arabic Gum', type: 'thickener', safe: true },
  'pectin': { en: 'Pectin', type: 'thickener', safe: true },
  'starch': { en: 'Starch', type: 'thickener', safe: true },
  'modi starch': { en: 'Modified Starch', type: 'thickener', safe: true },
  'lecithin': { en: 'Lecithin', type: 'emulsifier', safe: true },
  'soy lecithin': { en: 'Soy Lecithin', type: 'emulsifier', safe: true },
  'sunflower lecithin': { en: 'Sunflower Lecithin', type: 'emulsifier', safe: true },
  'mono and diglycerides': { en: 'Mono and Diglycerides', type: 'emulsifier', safe: true },
  'polysorbate 60': { en: 'Polysorbate 60', type: 'emulsifier', safe: true },
  'polysorbate 80': { en: 'Polysorbate 80', type: 'emulsifier', safe: true },
  'polysorbate 20': { en: 'Polysorbate 20', type: 'emulsifier', safe: true },
  'sorbitan monostearate': { en: 'Sorbitan Monostearate', type: 'emulsifier', safe: true },
  'cellulose': { en: 'Cellulose', type: 'thickener', safe: true },
  'microcrystalline cellulose': { en: 'Microcrystalline Cellulose', type: 'thickener', safe: true },
  'carboxymethyl cellulose': { en: 'Carboxymethyl Cellulose', type: 'thickener', safe: true },
  'methylcellulose': { en: 'Methylcellulose', type: 'thickener', safe: true },
  'hydroxypropyl methylcellulose': { en: 'Hydroxypropyl Methylcellulose', type: 'thickener', safe: true },
  'baking soda': { en: 'Baking Soda', type: 'leavening', safe: true },
  'sodium bicarbonate': { en: 'Sodium Bicarbonate', type: 'leavening', safe: true },
  'baking powder': { en: 'Baking Powder', type: 'leavening', safe: true },
  'potassium bitartrate': { en: 'Potassium Bitartrate', type: 'leavening', safe: true },
  'ammonium bicarbonate': { en: 'Ammonium Bicarbonate', type: 'leavening', safe: true },
  'yeast': { en: 'Yeast', type: 'leavening', safe: true },
  'brewers yeast': { en: 'Brewers Yeast', type: 'leavening', safe: true },
  'nutritional yeast': { en: 'Nutritional Yeast', type: 'leavening', safe: true },
  'soy': { en: 'Soy', type: 'allergen', safe: true, note: 'Common allergen' },
  'soybean': { en: 'Soybean', type: 'allergen', safe: true, note: 'Common allergen' },
  'soy sauce': { en: 'Soy Sauce', type: 'flavoring', safe: true },
  'soy lecithin': { en: 'Soy Lecithin', type: 'emulsifier', safe: true },
  'soy protein': { en: 'Soy Protein', type: 'protein', safe: true },
  'peanut': { en: 'Peanut', type: 'allergen', safe: true, note: 'Common allergen' },
  'peanut oil': { en: 'Peanut Oil', type: 'fat', safe: true },
  'peanut butter': { en: 'Peanut Butter', type: 'allergen', safe: true },
  'tree nut': { en: 'Tree Nuts', type: 'allergen', safe: true, note: 'Common allergen' },
  'almond': { en: 'Almond', type: 'allergen', safe: true },
  'cashew': { en: 'Cashew', type: 'allergen', safe: true },
  'walnut': { en: 'Walnut', type: 'allergen', safe: true },
  'pecan': { en: 'Pecan', type: 'allergen', safe: true },
  'pistachio': { en: 'Pistachio', type: 'allergen', safe: true },
  'macadamia': { en: 'Macadamia', type: 'allergen', safe: true },
  'hazelnut': { en: 'Hazelnut', type: 'allergen', safe: true },
  'brazil nut': { en: 'Brazil Nut', type: 'allergen', safe: true },
  'pine nut': { en: 'Pine Nut', type: 'allergen', safe: true },
  'sesame': { en: 'Sesame', type: 'allergen', safe: true, note: 'Common allergen' },
  'sesame seed': { en: 'Sesame Seed', type: 'allergen', safe: true },
  'sesame oil': { en: 'Sesame Oil', type: 'allergen', safe: true },
  'mustard': { en: 'Mustard', type: 'flavoring', safe: true },
  'celery': { en: 'Celery', type: 'allergen', safe: true, note: 'Common allergen' },
  'lupine': { en: 'Lupine', type: 'allergen', safe: true, note: 'Common allergen' },
  'mollusks': { en: 'Mollusks', type: 'allergen', safe: true, note: 'Shellfish allergen' },
  'crustaceans': { en: 'Crustaceans', type: 'allergen', safe: true, note: 'Shellfish allergen' },
  'fish': { en: 'Fish', type: 'allergen', safe: true, note: 'Common allergen' },
  'sulfites': { en: 'Sulfites', type: 'preservative', safe: true, note: 'Can trigger asthma-like reactions' },
  'sulfur dioxide': { en: 'Sulfur Dioxide', type: 'preservative', safe: true },
}

Object.assign(ingredientDatabase, {
  'glycerin': { en: 'Glycerin', type: 'humectant', safe: true },
  'niacinamide': { en: 'Niacinamide', type: 'vitamin', safe: true },
  'hyaluronic acid': { en: 'Hyaluronic Acid', type: 'humectant', safe: true },
  'sodium hyaluronate': { en: 'Sodium Hyaluronate', type: 'humectant', safe: true },
  'panthenol': { en: 'Panthenol', type: 'humectant', safe: true },
  'allantoin': { en: 'Allantoin', type: 'skin protectant', safe: true },
  'ceramide np': { en: 'Ceramide NP', type: 'skin barrier', safe: true },
  'ceramide ap': { en: 'Ceramide AP', type: 'skin barrier', safe: true },
  'ceramide eop': { en: 'Ceramide EOP', type: 'skin barrier', safe: true },
  'cholesterol': { en: 'Cholesterol', type: 'skin barrier', safe: true },
  'dimethicone': { en: 'Dimethicone', type: 'silicone', safe: true },
  'cyclopentasiloxane': { en: 'Cyclopentasiloxane', type: 'silicone', safe: true },
  'petrolatum': { en: 'Petrolatum', type: 'occlusive', safe: true },
  'mineral oil': { en: 'Mineral Oil', type: 'emollient', safe: true },
  'paraffinum liquidum': { en: 'Paraffinum Liquidum', type: 'emollient', safe: true },
  'butylene glycol': { en: 'Butylene Glycol', type: 'humectant', safe: true },
  'propylene glycol': { en: 'Propylene Glycol', type: 'humectant', safe: true },
  'pentylene glycol': { en: 'Pentylene Glycol', type: 'humectant', safe: true },
  'caprylyl glycol': { en: 'Caprylyl Glycol', type: 'humectant', safe: true },
  'phenoxyethanol': { en: 'Phenoxyethanol', type: 'preservative', safe: true, note: 'May irritate very sensitive skin' },
  'ethylhexylglycerin': { en: 'Ethylhexylglycerin', type: 'preservative', safe: true },
  'chlorphenesin': { en: 'Chlorphenesin', type: 'preservative', safe: true },
  'carbomer': { en: 'Carbomer', type: 'thickener', safe: true },
  'disodium edta': { en: 'Disodium EDTA', type: 'stabilizer', safe: true },
  'trisodium edta': { en: 'Trisodium EDTA', type: 'stabilizer', safe: true },
  'cetearyl alcohol': { en: 'Cetearyl Alcohol', type: 'emollient', safe: true },
  'cetyl alcohol': { en: 'Cetyl Alcohol', type: 'emollient', safe: true },
  'stearyl alcohol': { en: 'Stearyl Alcohol', type: 'emollient', safe: true },
  'behenyl alcohol': { en: 'Behenyl Alcohol', type: 'emollient', safe: true },
  'cetearyl glucoside': { en: 'Cetearyl Glucoside', type: 'emulsifier', safe: true },
  'glyceryl stearate': { en: 'Glyceryl Stearate', type: 'emulsifier', safe: true },
  'peg 100 stearate': { en: 'PEG-100 Stearate', type: 'emulsifier', safe: true },
  'squalane': { en: 'Squalane', type: 'emollient', safe: true },
  'squalene': { en: 'Squalene', type: 'emollient', safe: true },
  'argan oil': { en: 'Argan Oil', type: 'emollient', safe: true },
  'jojoba oil': { en: 'Jojoba Oil', type: 'emollient', safe: true },
  'helianthus annuus seed oil': { en: 'Sunflower Seed Oil', type: 'emollient', safe: true },
  'butyrospermum parkii butter': { en: 'Shea Butter', type: 'emollient', safe: true },
  'shea butter': { en: 'Shea Butter', type: 'emollient', safe: true },
  'aloe barbadensis leaf juice': { en: 'Aloe Vera Leaf Juice', type: 'soothing extract', safe: true },
  'centella asiatica extract': { en: 'Centella Asiatica Extract', type: 'soothing extract', safe: true },
  'camellia sinensis leaf extract': { en: 'Green Tea Extract', type: 'antioxidant', safe: true },
  'chamomilla recutita flower extract': { en: 'Chamomile Extract', type: 'soothing extract', safe: true },
  'retinol': { en: 'Retinol', type: 'active', safe: true, note: 'Powerful active; may irritate sensitive skin' },
  'retinyl palmitate': { en: 'Retinyl Palmitate', type: 'active', safe: true },
  'salicylic acid': { en: 'Salicylic Acid', type: 'active', safe: true },
  'lactic acid': { en: 'Lactic Acid', type: 'active', safe: true },
  'mandelic acid': { en: 'Mandelic Acid', type: 'active', safe: true },
  'tocopherol': { en: 'Tocopherol', type: 'antioxidant', safe: true },
  'tocopheryl acetate': { en: 'Tocopheryl Acetate', type: 'antioxidant', safe: true },
  'ascorbyl glucoside': { en: 'Ascorbyl Glucoside', type: 'antioxidant', safe: true },
  'fragrance': { en: 'Fragrance', type: 'fragrance', safe: true, note: 'May irritate sensitive skin' },
  'parfum': { en: 'Parfum', type: 'fragrance', safe: true, note: 'May irritate sensitive skin' },
  'limonene': { en: 'Limonene', type: 'fragrance allergen', safe: true, note: 'Potential fragrance allergen' },
  'linalool': { en: 'Linalool', type: 'fragrance allergen', safe: true, note: 'Potential fragrance allergen' },
  'citral': { en: 'Citral', type: 'fragrance allergen', safe: true, note: 'Potential fragrance allergen' },
  'geraniol': { en: 'Geraniol', type: 'fragrance allergen', safe: true, note: 'Potential fragrance allergen' },
  'benzyl alcohol': { en: 'Benzyl Alcohol', type: 'preservative', safe: true, note: 'Potential irritant for sensitive skin' },
  'sodium laureth sulfate': { en: 'Sodium Laureth Sulfate', type: 'surfactant', safe: true, note: 'Can be drying for sensitive skin' },
  'sodium lauryl sulfate': { en: 'Sodium Lauryl Sulfate', type: 'surfactant', safe: true, note: 'Can be irritating for sensitive skin' },
  'cocamidopropyl betaine': { en: 'Cocamidopropyl Betaine', type: 'surfactant', safe: true },
  'zinc oxide': { en: 'Zinc Oxide', type: 'uv filter', safe: true },
  'mica': { en: 'Mica', type: 'colorant', safe: true },
  'iron oxides': { en: 'Iron Oxides', type: 'colorant', safe: true }
})

const ingredientAliases = {
  'aqua': 'water',
  'eau': 'water',
  'wasser': 'water',
  'sucre': 'sugar',
  'zucker': 'sugar',
  'sel': 'salt',
  'salz': 'salt',
  'ble': 'wheat',
  'weizen': 'wheat',
  'farine de ble': 'wheat flour',
  'weizenmehl': 'wheat flour',
  'huile de palme': 'palm oil',
  'palmol': 'palm oil',
  'huile d olive': 'olive oil',
  'olivenol': 'olive oil',
  'huile de tournesol': 'sunflower oil',
  'sonnenblumenol': 'sunflower oil',
  'lait': 'milk',
  'milch': 'milk',
  'lait en poudre': 'milk powder',
  'milchpulver': 'milk powder',
  'oeuf': 'egg',
  'oeufs': 'eggs',
  'eier': 'eggs',
  'arome vanille': 'vanilla extract',
  'vanilleextrakt': 'vanilla extract',
  'acide citrique': 'citric acid',
  'zitronensaure': 'citric acid',
  'sirop de glucose fructose': 'high fructose corn syrup',
  'fruktosesirup': 'high fructose corn syrup',
  'gras trans': 'trans fat',
  'transfett': 'trans fat',
  'hfcs': 'high fructose corn syrup',
  'trans fats': 'trans fat',
  'artificial sweetener': 'artificial sweeteners',
  'glycolic acid': 'glycolic acid',
  'glycerine': 'glycerin',
  'glycerol': 'glycerin',
  'glycerine vegetale': 'glycerin',
  'glycerin vegetal': 'glycerin',
  'niacin': 'niacinamide',
  'vitamin b3': 'niacinamide',
  'acide hyaluronique': 'hyaluronic acid',
  'hyaluronsaure': 'hyaluronic acid',
  'hyaluronate de sodium': 'sodium hyaluronate',
  'natriumhyaluronat': 'sodium hyaluronate',
  'provitamin b5': 'panthenol',
  'huile d argan': 'argan oil',
  'arganol': 'argan oil',
  'huile de jojoba': 'jojoba oil',
  'jojobaol': 'jojoba oil',
  'beurre de karite': 'shea butter',
  'sheabutter': 'shea butter',
  'parfum fragrance': 'fragrance',
  '香精': 'fragrance',
  '香料': 'fragrance',
  '甘油': 'glycerin',
  '烟酰胺': 'niacinamide',
  '透明质酸': 'hyaluronic acid',
  '透明质酸钠': 'sodium hyaluronate',
  '泛醇': 'panthenol',
  '尿囊素': 'allantoin',
  '神经酰胺 np': 'ceramide np',
  '神经酰胺 ap': 'ceramide ap',
  '神经酰胺 eop': 'ceramide eop',
  '二甲基硅油': 'dimethicone',
  '矿油': 'mineral oil',
  '苯氧乙醇': 'phenoxyethanol',
  '乙基己基甘油': 'ethylhexylglycerin',
  '视黄醇': 'retinol',
  '水杨酸': 'salicylic acid',
  '乳酸': 'lactic acid',
  '库拉索芦荟叶汁': 'aloe barbadensis leaf juice',
  '积雪草提取物': 'centella asiatica extract',
  '绿茶提取物': 'camellia sinensis leaf extract',
  '氧化锌': 'zinc oxide'
}

const ingredientNoiseWords = new Set([
  'ingredient', 'ingredients', 'contains', 'with', 'and', 'may', 'contain', 'less', 'than',
  'free', 'from', 'color', 'colors', 'flavor', 'flavors', 'natural', 'artificial', 'formula',
  'composition', 'aquae', '配料', '成分', '含有', '及', '和', 'avec', 'et', 'und', 'mit'
])

const ingredientNormalizedKeyMap = new Map()
let ingredientSearchPattern = ''

function normalizeIngredientKey(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[()\[\]{}]/g, ' ')
    .replace(/[%]/g, ' ')
    .replace(/[^\p{L}\p{N}\s,\-+]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function buildIngredientIndex() {
  if (ingredientNormalizedKeyMap.size > 0) return

  Object.keys(ingredientDatabase).forEach((key) => {
    const normalized = normalizeIngredientKey(key)
    if (normalized && !ingredientNormalizedKeyMap.has(normalized)) {
      ingredientNormalizedKeyMap.set(normalized, key)
    }
  })

  Object.entries(ingredientAliases).forEach(([alias, canonical]) => {
    const normalizedAlias = normalizeIngredientKey(alias)
    if (normalizedAlias) {
      ingredientNormalizedKeyMap.set(normalizedAlias, canonical)
    }
  })
}

function buildIngredientSearchPattern() {
  if (ingredientSearchPattern) return ingredientSearchPattern

  buildIngredientIndex()

  const terms = [...new Set([...ingredientNormalizedKeyMap.keys()])]
    .filter((term) => term && term.length > 1 && !ingredientNoiseWords.has(term))
    .sort((left, right) => right.length - left.length)

  ingredientSearchPattern = terms.map(escapeRegex).join('|')
  return ingredientSearchPattern
}

function resolveCanonicalIngredient(ingredient) {
  buildIngredientIndex()

  const normalized = normalizeIngredientKey(ingredient)
  if (!normalized) return ''

  if (ingredientNormalizedKeyMap.has(normalized)) {
    return ingredientNormalizedKeyMap.get(normalized)
  }

  for (const [candidate, canonical] of ingredientNormalizedKeyMap.entries()) {
    if (candidate.includes(normalized) || normalized.includes(candidate)) {
      return canonical
    }
  }

  return normalized
}

function prepareIngredientText(text) {
  return normalizeIngredientKey(
    String(text || '')
      .replace(/[\r\n]+/g, ', ')
      .replace(/[•;，；、|]/g, ', ')
      .replace(/\b(?:ingredients?|contains|with|and|plus|et|avec|und|mit)\b/giu, ', ')
      .replace(/(?:配料|成分|含有|以及|和)/gu, ', ')
  )
}

function splitUnknownIngredientSegment(segment) {
  const cleaned = normalizeIngredientKey(segment)
  if (!cleaned) return []

  return cleaned
    .split(/\s*,\s*/)
    .map((item) => item.trim())
    .filter((item) => item && !ingredientNoiseWords.has(item))
}

function searchIngredientDatabase(ingredient) {
  const canonical = resolveCanonicalIngredient(ingredient)

  if (ingredientDatabase[canonical]) return ingredientDatabase[canonical]

  const normalized = normalizeIngredientKey(canonical)
  for (const [key, value] of Object.entries(ingredientDatabase)) {
    const normalizedKey = normalizeIngredientKey(key)
    if (normalizedKey.includes(normalized) || normalized.includes(normalizedKey)) return value
  }

  return null
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
      `<div class="ai-message">${message}</div>`
    )
  }

  if(Array.isArray(rawLines) && rawLines.length){
    el.insertAdjacentHTML(
      "beforeend",
      rawLines.map(line =>
        `<div class="result-card">${escapeHtml(line)}</div>`
      ).join("")
    )
  }
}

/* -----------------------
AI ANALYSIS
----------------------- */

async function analyzeWithAI(ingredients){
  displayAIAnalysis("🔄 Analyzing ingredients...", [])

  if(!supabaseClient){
    console.warn("Supabase not configured. Cloud AI unavailable.")
    analyzeWithLocalDatabase(ingredients)
    return
  }

  try{
    const lang = document.getElementById("language").value
    const langName = languageNames[lang] || lang
    const langLocale = languageLocales[lang] || lang

    let response = await supabaseClient.functions.invoke(
      "wykta-backend",
      {
        body: {
          ingredients,
          lang: langLocale,
          targetLanguage: langName,
          promptLanguage: langName
        }
      }
    )

    if (response.error) {
      response = await supabaseClient.functions.invoke(
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
    }

    const { data, error } = response

    if(error) throw error

    console.log("AI result:", data)

    if(!data || !data.analysis){
      displayAIAnalysis(`❌ AI returned no analysis for ${langName}. The backend function may not be deployed.`, [])
      return
    }

    const lines = data.analysis.split("\n")
    displayAIAnalysis("", lines)

  } catch(err){
    console.error("AI function error:", err)
    analyzeWithLocalDatabase(ingredients)
  }
}

/* Local Database Analysis (Fallback when AI/Supabase unavailable) */
function analyzeWithLocalDatabase(ingredients) {
  const ingredientList = Array.isArray(ingredients) ? ingredients : extractIngredients(ingredients)
  const analysisLines = []
  
  analysisLines.push("📊 Analysis Results (Local Database)")
  analysisLines.push("")
  
  const safeIngredients = []
  const warningIngredients = []
  const unknownIngredients = []
  
  for (const ingredient of ingredientList) {
    const data = searchIngredientDatabase(ingredient)
    if (data) {
      if (data.safe === false) {
        warningIngredients.push({ name: ingredient, data })
      } else {
        safeIngredients.push({ name: ingredient, data })
      }
    } else {
      unknownIngredients.push(ingredient)
    }
  }
  
  analysisLines.push(`✅ ${safeIngredients.length} Safe | ⚠️ ${warningIngredients.length} Warnings | ❓ ${unknownIngredients.length} Unknown`)
  analysisLines.push("")
  
  if (safeIngredients.length > 0) {
    analysisLines.push("🟢 Safe Ingredients:")
    safeIngredients.forEach(item => {
      analysisLines.push(`  • ${item.data.en}`)
    })
    analysisLines.push("")
  }
  
  if (warningIngredients.length > 0) {
    analysisLines.push("🔴 Ingredients with Warnings:")
    warningIngredients.forEach(item => {
      analysisLines.push(`  ⚠️ ${item.data.en}`)
      if (item.data.warning) {
        analysisLines.push(`     → ${item.data.warning}`)
      }
    })
    analysisLines.push("")
  }
  
  if (unknownIngredients.length > 0) {
    analysisLines.push(`❓ Unknown Ingredients (${unknownIngredients.length}):`)
    const toShow = unknownIngredients.slice(0, 10)
    toShow.forEach(ing => analysisLines.push(`  • ${ing}`))
    if (unknownIngredients.length > 10) {
      analysisLines.push(`  ... and ${unknownIngredients.length - 10} more`)
    }
    analysisLines.push("")
    analysisLines.push("💡 Pro Tip: Set up Supabase Edge Functions for complete AI-powered ingredient analysis.")
  }
  
  displayAIAnalysis("", analysisLines)
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
  if (!isPremium && freeScanCount >= FREE_SCAN_LIMIT) {
    alert(`Free scan limit reached. Upgrade to Premium for unlimited camera and upload scanning.`)
    return
  }

  try {
    // Show loading state
    const cameraBtn = document.getElementById("cameraBtn")
    const originalText = cameraBtn.textContent
    cameraBtn.textContent = "📷 Starting camera..."
    cameraBtn.disabled = true

    stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: 'environment', // Use back camera on mobile
        width: { ideal: 1280 },
        height: { ideal: 720 }
      }
    })

    const video = document.getElementById("camera")
    video.srcObject = stream
    video.style.display = 'block'

    // Show capture button
    document.getElementById("captureBtn").style.display = 'inline-block'

    // Reset OCR result
    document.getElementById("ocrResult").innerHTML = `
      <div class="ocr-tips">
        <strong>📋 OCR Tips for Best Results:</strong><br>
        • Use bright, even lighting without shadows<br>
        • Hold camera steady and focus on the text<br>
        • Keep the label flat and parallel to camera<br>
        • Avoid glare, reflections, and background clutter<br>
        • Ensure text is sharp and well-contrasted<br>
        • Crop close to ingredients for best accuracy<br>
        • Avoid curved or wrinkled labels if possible
      </div>
      Camera ready! Point at ingredient list and tap "Capture & Analyze"
    `

    // Hide retry button
    document.getElementById("retryBtn").style.display = 'none'

    // Reset button
    cameraBtn.textContent = originalText
    cameraBtn.disabled = false

  } catch(err) {
    console.error("Camera error:", err)

    let errorMessage = "❌ Camera access failed."
    if (err.name === 'NotAllowedError') {
      errorMessage += " Please allow camera access and try again."
    } else if (err.name === 'NotFoundError') {
      errorMessage += " No camera found on this device."
    } else {
      errorMessage += " Please check your camera settings."
    }

    document.getElementById("ocrResult").innerText = errorMessage

    // Reset button
    const cameraBtn = document.getElementById("cameraBtn")
    cameraBtn.textContent = "📷 Open Camera"
    cameraBtn.disabled = false
  }
}

/* -----------------------
CAPTURE IMAGE (Enhanced)
----------------------- */

async function capture(){
  const video = document.getElementById("camera")
  const canvas = document.getElementById("snapshot")

  if (!video.srcObject) {
    alert("Please start the camera first!");
    return;
  }

  try {
    const ctx = canvas.getContext("2d")

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    ctx.drawImage(video, 0, 0)

    // Stop the camera stream
    if(stream){
      stream.getTracks().forEach(track => track.stop())
      video.style.display = 'none'
      document.getElementById("captureBtn").style.display = 'none'
    }

    if (!isPremium) {
      freeScanCount += 1
      updatePremiumUI()
    }

    // Pre-process image for better OCR
    preprocessImageForOCR(canvas)

    // Run OCR
    await runOCR(canvas)

  } catch (err) {
    console.error("Capture error:", err)
    document.getElementById("ocrResult").innerText = "❌ Failed to capture image. Try again."
  }
}

/* -----------------------
IMAGE PREPROCESSING FOR OCR (Enhanced)
----------------------- */
function preprocessImageForOCR(canvas) {
  const ctx = canvas.getContext('2d')
  let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  let data = imageData.data

  // Step 0: Resize image for better OCR (Tesseract works best around 300 DPI)
  // const targetWidth = Math.min(2000, Math.max(600, canvas.width * 2)) // Scale up small images, cap large ones
  // const targetHeight = (canvas.height * targetWidth) / canvas.width

  // if (canvas.width !== targetWidth) {
  //   const tempCanvas = document.createElement('canvas')
  //   tempCanvas.width = targetWidth
  //   tempCanvas.height = targetHeight
  //   const tempCtx = tempCanvas.getContext('2d')
  //   tempCtx.drawImage(canvas, 0, 0, targetWidth, targetHeight)
  //   canvas.width = targetWidth
  //   canvas.height = targetHeight
  //   ctx.drawImage(tempCanvas, 0, 0)
  //   imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  //   data = imageData.data
  // }

  // Step 1: Convert to grayscale and increase contrast
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]

    // Convert to grayscale using luminance formula
    let gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b)

    // Apply gamma correction for better contrast
    gray = Math.round(255 * Math.pow(gray / 255, 1 / 1.5))

    // Increase contrast more carefully (less aggressive)
    const contrasted = Math.min(255, Math.max(0, (gray - 80) * 1.5 + 80))

    data[i] = contrasted     // Red
    data[i + 1] = contrasted // Green
    data[i + 2] = contrasted // Blue
    // Alpha remains unchanged
  }

  // Step 2: Apply simple noise reduction (median filter approximation)
  // applyMedianFilter(data, canvas.width, canvas.height) // Temporarily disabled

  // Step 3: Apply sharpening to enhance text edges
  applySharpenFilter(data, canvas.width, canvas.height)

  // Step 4: Apply adaptive thresholding for better text extraction
  const threshold = calculateAdaptiveThreshold(data, canvas.width, canvas.height)
  for (let i = 0; i < data.length; i += 4) {
    const gray = data[i]
    data[i] = data[i + 1] = data[i + 2] = gray > threshold ? 255 : 0
  }

  ctx.putImageData(imageData, 0, 0)
}

/* -----------------------
APPLY MEDIAN FILTER FOR NOISE REDUCTION
----------------------- */
function applyMedianFilter(data, width, height) {
  const newData = new Uint8ClampedArray(data.length)

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const neighbors = []
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const idx = ((y + dy) * width + (x + dx)) * 4
          neighbors.push(data[idx])
        }
      }
      neighbors.sort((a, b) => a - b)
      const median = neighbors[4] // Middle value in 3x3 grid
      const idx = (y * width + x) * 4
      newData[idx] = newData[idx + 1] = newData[idx + 2] = median
      newData[idx + 3] = data[idx + 3] // Alpha
    }
  }

  // Copy back
  for (let i = 0; i < data.length; i++) {
    data[i] = newData[i]
  }
}

/* -----------------------
APPLY SHARPEN FILTER TO ENHANCE TEXT EDGES
----------------------- */
function applySharpenFilter(data, width, height) {
  const newData = new Uint8ClampedArray(data.length)
  const kernel = [
    0, -1, 0,
    -1, 5, -1,
    0, -1, 0
  ]

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let sum = 0
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const idx = ((y + ky) * width + (x + kx)) * 4
          const kIdx = (ky + 1) * 3 + (kx + 1)
          sum += data[idx] * kernel[kIdx]
        }
      }
      const idx = (y * width + x) * 4
      const sharpened = Math.min(255, Math.max(0, sum))
      newData[idx] = newData[idx + 1] = newData[idx + 2] = sharpened
      newData[idx + 3] = data[idx + 3] // Alpha
    }
  }

  // Copy back
  for (let i = 0; i < data.length; i++) {
    data[i] = newData[i]
  }
}

/* -----------------------
CALCULATE ADAPTIVE THRESHOLD
----------------------- */
function calculateAdaptiveThreshold(data, width, height) {
  // Calculate average brightness for adaptive thresholding
  let totalBrightness = 0
  let pixelCount = 0

  for (let i = 0; i < data.length; i += 4) {
    totalBrightness += data[i] // Use red channel as grayscale
    pixelCount++
  }

  const averageBrightness = totalBrightness / pixelCount
  return averageBrightness * 0.7 // Adjusted for better text extraction
}

/* -----------------------
OCR TEXT RECOGNITION
----------------------- */
async function runOCR(canvas) {
  try {
    // Show loading state
    document.getElementById("ocrSpinner").style.display = 'block';
    document.getElementById("ocrResult").innerText = "🔍 Analyzing image... (15-20 seconds)";

    const selectedLanguage = document.getElementById("language")?.value || 'en'
    const ocrLanguageMap = {
      en: 'eng',
      fr: 'fra',
      de: 'deu',
      zh: 'chi_sim'
    }
    const ocrLanguage = ocrLanguageMap[selectedLanguage] || 'eng'

    // Use Tesseract with optimized settings for ingredient labels
    const { data } = await Tesseract.recognize(canvas, ocrLanguage, {
      logger: false,
      tessedit_pageseg_mode: Tesseract.PSM.AUTO_OSD, // Auto orientation and script detection
      tessedit_ocr_engine_mode: Tesseract.OEM.LSTM_ONLY,
    });

    let text = data.text;
    console.log("Raw OCR text:", text);

    // Enhanced processing for complex ingredient lists
    const processedText = processExtractedTextAdvanced(text);

    // Validate the result with more sophisticated checks
    const validation = validateIngredientListAdvanced(processedText);

    if (!validation.isValid) {
      document.getElementById("ocrResult").innerText = `❌ ${validation.message}\n\nTry:\n• Better image quality\n• Closer zoom on ingredients\n• Straight, flat surface\n• Good lighting`;
      document.getElementById("retryBtn").style.display = 'inline-block';
      document.getElementById("ocrSpinner").style.display = 'none';
      return;
    }

    // Show confidence score
    const confidence = validation.confidence || 0;
    const confidenceEmoji = confidence > 80 ? '🟢' : confidence > 60 ? '🟡' : '🟠';

    document.getElementById("ocrResult").innerText = `${confidenceEmoji} Ingredients extracted (${confidence}% confidence):\n${processedText}`;

    // Auto-fill ingredients
    document.getElementById("ingredients").value = processedText;
    document.getElementById("retryBtn").style.display = 'none';
    document.getElementById("ocrSpinner").style.display = 'none';
    showSuccessMessage("Ingredients extracted! Click Analyze to continue.");

  } catch (err) {
    console.error("OCR error:", err);
    document.getElementById("ocrResult").innerText = "❌ OCR failed. Try a clearer image with better lighting.";
    document.getElementById("retryBtn").style.display = 'inline-block';
    document.getElementById("ocrSpinner").style.display = 'none';
  }
}

/* -----------------------
ADVANCED TEXT PROCESSING FOR COMPLEX INGREDIENT LISTS
----------------------- */
function processExtractedTextAdvanced(text) {
  if (!text || text.trim().length < 5) return "";

  let processed = text;

  // Step 1: Normalize line breaks and spacing
  processed = processed
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n{3,}/g, '\n\n') // Max 2 consecutive line breaks
    .replace(/^\s+|\s+$/gm, '') // Trim each line
    .replace(/\t/g, ' ') // Replace tabs with spaces
    .replace(/ {2,}/g, ' '); // Multiple spaces to single

  // Step 2: Split into lines and filter out non-ingredient content
  const lines = processed.split('\n');
  const ingredientLines = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length < 2) continue; // Skip empty lines

    // Skip obvious non-ingredient lines
    if (isNonIngredientLine(trimmed)) continue;

    // Clean the line
    const cleaned = cleanIngredientLine(trimmed);
    if (cleaned.length > 2) {
      ingredientLines.push(cleaned);
    }
  }

  // Step 3: Join lines and further process
  processed = ingredientLines.join(', ');

  // Step 4: Extract ingredient phrases using dictionary-driven parsing
  processed = extractIngredientPhrases(processed);

  // Step 5: Final cleanup
  processed = processed
    .replace(/^[,;\s]+/, '') // Remove leading punctuation
    .replace(/[,;\s]+$/, '') // Remove trailing punctuation
    .replace(/,+\s*,+/g, ',') // Fix multiple commas
    .replace(/\s+/g, ' ') // Single spaces
    .trim();

  return processed.length > 10 ? processed : "";
}

/* -----------------------
CHECK IF LINE IS NON-INGREDIENT CONTENT
----------------------- */
function isNonIngredientLine(line) {
  const lower = line.toLowerCase();

  // Skip nutritional info headers
  if (lower.includes('serving size') || lower.includes('calories') ||
      lower.includes('total fat') || lower.includes('saturated fat') ||
      lower.includes('trans fat') || lower.includes('cholesterol') ||
      lower.includes('sodium') || lower.includes('total carbohydrate') ||
      lower.includes('dietary fiber') || lower.includes('sugars') ||
      lower.includes('protein') || lower.includes('vitamin') ||
      lower.includes('mineral') || lower.includes('calcium') ||
      lower.includes('iron') || lower.includes('potassium')) {
    return true;
  }

  // Skip packaging/marketing text
  if (lower.includes('distributed by') || lower.includes('manufactured by') ||
      lower.includes('product of') || lower.includes('best by') ||
      lower.includes('use by') || lower.includes('keep refrigerated') ||
      lower.includes('net wt') || lower.includes('ingredients:') ||
      lower.includes('contains:') || lower.includes('may contain') ||
      lower.includes('ingredients') || lower.includes('ingrédients') ||
      lower.includes('zutaten') || lower.includes('配料') || lower.includes('成分') ||
      lower.includes('allergen') || lower.match(/^\d+%$/)) {
    return true;
  }

  // Skip lines that are mostly numbers or symbols
  if (line.replace(/[^\p{L}]/gu, '').length < line.length * 0.25) {
    return true;
  }

  // Skip very short lines (likely fragments)
  if (line.trim().length < 3) {
    return true;
  }

  return false;
}

/* -----------------------
CLEAN INDIVIDUAL INGREDIENT LINE
----------------------- */
function cleanIngredientLine(line) {
  return line
    .replace(/\([^)]*\)/g, '') // Remove parentheses (weights, etc.)
    .replace(/^\d+\.?\s*/, '') // Remove leading numbers (1. Water, etc.)
    .replace(/\d+g|\d+mg|\d+kg|\d+ml|\d+l|\d+oz|\d+lb/g, '') // Remove measurements
    .replace(/%\s*/g, '') // Remove percentages
    .replace(/[^\p{L}\p{N}\s,.;()\-]/gu, '') // Remove special chars except common separators
    .replace(/\s+/g, ' ') // Single spaces
    .trim();
}

/* -----------------------
EXTRACT INGREDIENT-LIKE PHRASES
----------------------- */
function extractIngredientPhrases(text) {
  return extractIngredients(text).join(', ')
}

/* -----------------------
ADVANCED INGREDIENT LIST VALIDATION
----------------------- */
function validateIngredientListAdvanced(text) {
  if (!text || text.length < 5) {
    return { isValid: false, message: "No text detected. Try a clearer image.", confidence: 0 };
  }

  let score = 0;
  const issues = [];
  const extractedIngredients = extractIngredients(text)

  // Length check
  if (text.length < 10) {
    issues.push("Text too short");
    score -= 20;
  } else if (text.length > 50) {
    score += 10; // Good length
  }

  // Word count
  const words = text.split(/\s+/).filter(w => w.length > 1);
  if (words.length < 3) {
    issues.push("Not enough words detected");
    score -= 30;
  } else if (words.length > 5) {
    score += 15;
  }

  if (extractedIngredients.length >= 2) {
    score += 30;
  } else {
    issues.push("Could not confidently segment ingredients")
    score -= 25
  }

  // Check average word length
  const avgWordLength = words.reduce((sum, w) => sum + w.length, 0) / words.length;
  if (avgWordLength < 5) {
    issues.push("Words too short on average");
    score -= 30;
  }

  // Check for gibberish
  const repeatedChars = /(.)\1{4,}/g;
  if (repeatedChars.test(text)) {
    issues.push("Contains gibberish characters");
    score -= 50;
  }

  // Check for too many short words (likely OCR fragments)
  const shortWords = words.filter(w => w.length < 3).length;
  if (shortWords > words.length * 0.4) {
    issues.push("Too many short word fragments");
    score -= 40;
  }

  // Check for too many special characters
  const specialChars = text.replace(/[\p{L}\s,.;()]/gu, '').length;
  if (specialChars > text.length * 0.2) {
    issues.push("Too many special characters");
    score -= 20;
  }

  if (extractedIngredients.length >= 4) {
    score += 10
  }

  const confidence = Math.max(0, Math.min(100, 50 + score));

  if (confidence < 70) {
    return {
      isValid: false,
      message: `Low confidence result (${confidence}%). ${issues.join(', ')}`,
      confidence
    };
  }

  return { isValid: true, message: "Valid ingredient list detected", confidence };
}
function processExtractedText(text) {
  if (!text || text.trim().length < 5) return "";

  // Convert to lowercase for processing
  let processed = text.toLowerCase();

  // Aggressive cleanup of OCR artifacts
  processed = processed
    .replace(/_{2,}/g, '') // Remove multiple underscores
    .replace(/\.+/g, '.') // Normalize multiple dots
    .replace(/,+/g, ',') // Normalize multiple commas
    .replace(/\s+/g, ' ') // Multiple spaces to single
    .trim();

  // Remove lines that are clearly not ingredients (too short, gibberish, etc.)
  const lines = processed.split(/\n/);
  const cleanLines = lines.filter(line => {
    const trimmed = line.trim();
    if (trimmed.length < 3) return false; // Too short
    if (/^[^a-zA-Z]*$/.test(trimmed)) return false; // No letters
    if (/(.)\1{3,}/.test(trimmed)) return false; // Repeated characters (gibberish)
    return true;
  });

  processed = cleanLines.join(' ');

  // Remove common header/footer text that might appear on labels
  const removePatterns = [
    /nutrition facts/i,
    /nutritional information/i,
    /serving size/i,
    /calories/i,
    /total fat/i,
    /saturated fat/i,
    /trans fat/i,
    /cholesterol/i,
    /sodium/i,
    /total carbohydrate/i,
    /dietary fiber/i,
    /sugars/i,
    /protein/i,
    /vitamin/i,
    /mineral/i,
    /ingredients?[:\s]*/i, // Remove "ingredients:" prefix
    /contains[:\s]*/i,
    /may contain/i,
    /allergen/i,
    /distributed by/i,
    /manufactured by/i,
    /product of/i,
    /best by/i,
    /use by/i,
    /keep refrigerated/i,
    /net wt/i,
    /\d+g/i, // Remove weights like "100g"
    /\d+mg/i,
    /\d+kg/i,
    /%\s*/g, // Remove percentages
    /\([^)]*\)/g, // Remove parentheses content (often weights)
  ];

  removePatterns.forEach(pattern => {
    processed = processed.replace(pattern, '');
  });

  // Clean up punctuation and normalize
  processed = processed
    .replace(/[,;•]\s*[,;•]/g, ', ') // Fix double punctuation
    .replace(/[^\w\s,.;()]/g, '') // Remove special chars except common separators
    .replace(/\s+/g, ' ') // Multiple spaces to single
    .trim();

  processed = extractIngredients(processed).join(', ')

  // Final cleanup
  processed = processed
    .replace(/^[,;\s]+/, '') // Remove leading punctuation
    .replace(/[,;\s]+$/, '') // Remove trailing punctuation
    .trim();

  return processed.length > 5 ? processed : "";
}

/* -----------------------
RETRY SCAN FUNCTION
----------------------- */
function retryScan() {
  // Hide video and buttons
  document.getElementById("camera").style.display = 'none'
  document.getElementById("captureBtn").style.display = 'none'
  document.getElementById("retryBtn").style.display = 'none'
  document.getElementById("ocrSpinner").style.display = 'none'

  // Reset OCR result
  document.getElementById("ocrResult").innerHTML = `
    <div class="ocr-tips">
      <strong>📋 OCR Tips for Best Results:</strong><br>
      • Use bright, even lighting without shadows<br>
      • Hold camera steady and focus on the text<br>
      • Keep the label flat and parallel to camera<br>
      • Avoid glare, reflections, and background clutter<br>
      • Ensure text is sharp and well-contrasted<br>
      • Crop close to ingredients for best accuracy<br>
      • Avoid curved or wrinkled labels if possible
    </div>
    Choose Camera or Upload Photo above to start scanning
  `
}

/* -----------------------
HANDLE FILE UPLOAD
----------------------- */
async function handleFileUpload(event) {
  if (!isPremium && freeScanCount >= FREE_SCAN_LIMIT) {
    alert(`Free scan/upload limit reached. Upgrade to Premium for unlimited camera and photo scanning.`)
    return
  }

  const file = event.target.files[0]
  if (!file) return

  // Validate file type
  if (!file.type.startsWith('image/')) {
    alert('Please select an image file.')
    return
  }

  // Validate file size (max 10MB)
  if (file.size > 10 * 1024 * 1024) {
    alert('File size too large. Please choose an image under 10MB.')
    return
  }

  try {
    // Show loading state
    document.getElementById("ocrResult").innerText = "📁 Loading image...";

    // Create image element and load file
    const img = new Image()
    const canvas = document.getElementById("snapshot")
    const ctx = canvas.getContext("2d")

    await new Promise((resolve, reject) => {
      img.onload = resolve
      img.onerror = reject
      img.src = URL.createObjectURL(file)
    })

    // Set canvas size to image size (with max dimensions)
    const maxWidth = 2000
    const maxHeight = 2000
    let { width, height } = img

    if (width > maxWidth || height > maxHeight) {
      const ratio = Math.min(maxWidth / width, maxHeight / height)
      width *= ratio
      height *= ratio
    }

    canvas.width = width
    canvas.height = height

    // Draw image to canvas
    ctx.drawImage(img, 0, 0, width, height)

    // Clean up object URL
    URL.revokeObjectURL(img.src)

    // Pre-process image for better OCR
    preprocessImageForOCR(canvas)

    // Run OCR
    await runOCR(canvas)

  } catch (err) {
    console.error("Upload error:", err)
    document.getElementById("ocrResult").innerText = "❌ Failed to process image. Try a different photo."
    document.getElementById("retryBtn").style.display = 'inline-block'
  }

  // Reset file input
  event.target.value = ''
}