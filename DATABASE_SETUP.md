# Wykta Database & AI Setup Guide

## Current Status

- ✅ **Supabase credentials** configured in `config.js`
- ✅ **Edge Function code** lives in `supabase/functions/wykta-backend/index.ts`
- ✅ **Fallback chain**: local DB → Open Food Facts taxonomy → Open Food Facts search → Open Beauty Facts
- ⚠️ **Edge Function must be deployed** to the Supabase project (one-time step below)

## Deploy the Edge Function (One-Time Setup)

### Automatic (GitHub Actions)

The repo includes `.github/workflows/deploy-edge-function.yml` which deploys on every push to `main` that touches `supabase/functions/`.

**Required GitHub secret:**

1. Go to your repo → **Settings → Secrets and variables → Actions → New repository secret**
2. Name: `SUPABASE_ACCESS_TOKEN`
3. Value: your Supabase personal access token → get it at https://supabase.com/dashboard/account/tokens

Once the secret is added, push any change to `supabase/functions/` (or trigger the workflow manually) and the function will deploy automatically.

### Manual (Supabase CLI)

```bash
# Install CLI
npm install -g supabase

# Log in
supabase login

# Deploy
supabase functions deploy wykta-backend --project-ref rryuicpnjxxzsmkotgrj --no-verify-jwt
```

---

## Why ingredients might still fall back to open databases

If the Edge Function is deployed but analysis still uses the free-DB path, check:

1. **Browser console** — look for `"Supabase connected"` and any `"AI function error"` messages
2. **Supabase dashboard → Edge Functions → wykta-backend → Logs** — confirm requests arrive and succeed
3. **CORS** — the function already returns `Access-Control-Allow-Origin: *`

---

### Option 2: Extend the Built-in Local Database (Free, No Setup)

**What you get:**
- ✅ Unlimited ingredient analysis
- ✅ AI-powered explanations
- ✅ Multi-language support
- ✅ Can analyze ANY ingredient
- ⚠️ Requires Supabase account ($25/month)

**Steps:**

1. **Create Supabase Project**
   ```
   https://supabase.com → Create new project
   ```

2. **Create Edge Function**
   - Go to: SQL Editor → Create new function → `Wykta-backend`
   
3. **Replace `config.example.js` with your credentials**
   ```javascript
   const supabaseUrl = "https://YOUR_PROJECT.supabase.co"
   const supabaseKey = "YOUR_ANON_KEY"
   ```

4. **Example Edge Function Code:**

```typescript
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

export default async (req: Request) => {
  try {
    const { ingredients, targetLanguage = "English" } = await req.json();

    const message = await client.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: `Analyze these ingredients in detail (respond in ${targetLanguage}):

${ingredients}

For each ingredient, provide:
1. What it is
2. Its purpose in food
3. Safety profile
4. Any dietary concerns

Format clearly with emojis.`,
        },
      ],
    });

    const analysis = message.content[0].type === "text" ? message.content[0].text : "";
    return new Response(JSON.stringify({ analysis }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
```

---

### Option 3: Use Free Ingredient API

**Use EDAMAM Food Database (Free tier)**

```javascript
const API_KEY = "YOUR_API_KEY"
const APP_ID = "YOUR_APP_ID"

async function analyzeWithAPI(ingredient) {
  const response = await fetch(
    `https://api.edamam.com/api/food-database/v2/parser?query=${ingredient}&type=generic&app_id=${APP_ID}&app_key=${API_KEY}`
  )
  return response.json()
}
```

Sign up: https://developer.edamam.com/food-database-api

---

### Option 4: Public Ingredient Database API

**Use Open Food Facts API (Completely Free)**

```javascript
async function searchOpenFoodFacts(ingredient) {
  const response = await fetch(
    `https://world.openfoodfacts.org/api/v0/product/search?q=${ingredient}`
  )
  return response.json()
}
```

No authentication needed. Perfect for quick lookups!

---

## Quick Test

Test the current implementation:

```javascript
// In browser console
testOCR("water glycérine glykolsäure salt sugar")

// Output will show:
// ✅ 5 Safe ingredients found
// ✅ 0 warnings
// ❓ 0 unknown
```

---

## Recommended Path Forward

**For MVP:**
1. ✅ Use built-in local database (already done)
2. Expand database with ~500 common ingredients
3. Deploy and test

**For Production:**
1. Add Supabase Edge Function + Claude AI
2. Keep local fallback as backup
3. Monitor API usage and costs

---

## Expand Local Database (Easy)

Popular ingredients to add:

```javascript
'baking powder': { en: 'Baking Powder', type: 'leavening', safe: true },
'cornstarch': { en: 'Cornstarch', type: 'thickener', safe: true },
'cellulose': { en: 'Cellulose', type: 'thickener', safe: true },
'guar gum': { en: 'Guar Gum', type: 'thickener', safe: true },
'carrageenan': { en: 'Carrageenan', type: 'thickener', safe: true },
'polysorbate 80': { en: 'Polysorbate 80', type: 'emulsifier', safe: true },
'sorbitol': { en: 'Sorbitol', type: 'sweetener', safe: true },
'maltodextrin': { en: 'Maltodextrin', type: 'sweetener', safe: true },
'erythritol': { en: 'Erythritol', type: 'sweetener', safe: true },
'invert sugar': { en: 'Invert Sugar', type: 'sweetener', safe: true },
```

---

## Questions?

- **How much will API cost?** Supabase: ~$25/month. EDAMAM: Free tier available. Open Food Facts: Free.
- **Can I use local-only?** Yes! Current setup works offline.
- **How to add more ingredients?** Edit the `ingredientDatabase` object in app.js
- **How many ingredients?** Local DB can handle 1000+ without issues

