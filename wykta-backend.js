import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const ingredientDatabase = {
  water: {
    category: "general",
    en: "Solvent base used to dissolve and blend ingredients.",
    fr: "Base solvante utilisée pour dissoudre et mélanger les ingrédients.",
    de: "Lösungsmittelbasis zum Lösen und Mischen von Inhaltsstoffen.",
    zh: "作为溶剂基础，用于溶解和混合其他成分。"
  },
  glycerin: {
    category: "skincare",
    en: "Humectant that helps skin retain moisture.",
    fr: "Humectant qui aide la peau à retenir l'hydratation.",
    de: "Feuchthaltemittel, das der Haut hilft, Feuchtigkeit zu speichern.",
    zh: "保湿剂，帮助皮肤锁住水分。"
  },
  niacinamide: {
    category: "skincare",
    en: "Vitamin B3 derivative that supports skin barrier and tone.",
    fr: "Dérivé de vitamine B3 qui soutient la barrière cutanée et l'uniformité du teint.",
    de: "Vitamin-B3-Derivat zur Unterstützung von Hautbarriere und Hautton.",
    zh: "维生素B3衍生物，有助于皮肤屏障和肤色均匀。"
  },
  "hyaluronic acid": {
    category: "skincare",
    en: "Hydrator that binds water to the skin.",
    fr: "Hydratant qui fixe l'eau dans la peau.",
    de: "Feuchtigkeitsspender, der Wasser in der Haut bindet.",
    zh: "保湿成分，可将水分结合到皮肤。"
  },
  retinol: {
    category: "skincare",
    en: "Vitamin A derivative often used for anti-aging and texture improvement.",
    fr: "Dérivé de vitamine A souvent utilisé contre le vieillissement et pour la texture.",
    de: "Vitamin-A-Derivat, häufig für Anti-Aging und bessere Hautstruktur.",
    zh: "维生素A衍生物，常用于抗老和改善肤质。"
  },
  "glycolic acid": {
    category: "skincare",
    en: "AHA exfoliant that helps remove dead skin cells.",
    fr: "Exfoliant AHA qui aide à éliminer les cellules mortes.",
    de: "AHA-Peelingstoff, der abgestorbene Hautzellen entfernt.",
    zh: "果酸类去角质成分，有助于去除老废角质。"
  },
  "salicylic acid": {
    category: "skincare",
    en: "BHA exfoliant commonly used for oily or acne-prone skin.",
    fr: "Exfoliant BHA couramment utilisé pour les peaux grasses ou à tendance acnéique.",
    de: "BHA-Peelingstoff für fettige oder zu Akne neigende Haut.",
    zh: "水杨酸（BHA）常用于油性或痘痘肌。"
  },
  "benzoyl peroxide": {
    category: "skincare",
    en: "Antibacterial acne treatment ingredient.",
    fr: "Ingrédient antibactérien pour le traitement de l'acné.",
    de: "Antibakterieller Wirkstoff zur Aknebehandlung.",
    zh: "抗菌祛痘成分。"
  },
  fragrance: {
    category: "skincare",
    en: "Added scent component that may irritate sensitive skin.",
    fr: "Composant parfumé ajouté pouvant irriter les peaux sensibles.",
    de: "Duftstoff, der empfindliche Haut reizen kann.",
    zh: "添加香精，敏感肌可能受刺激。"
  },
  phenoxyethanol: {
    category: "general",
    en: "Preservative that helps prevent microbial growth.",
    fr: "Conservateur qui aide à prévenir la croissance microbienne.",
    de: "Konservierungsmittel, das mikrobielles Wachstum hemmt.",
    zh: "防腐剂，可抑制微生物生长。"
  },
  milk: {
    category: "food",
    en: "Common dairy allergen.",
    fr: "Allergène laitier courant.",
    de: "Häufiges Milchallergen.",
    zh: "常见乳制品过敏原。"
  },
  egg: {
    category: "food",
    en: "Common food allergen from eggs.",
    fr: "Allergène alimentaire courant issu des œufs.",
    de: "Häufiges Nahrungsmittelallergen aus Eiern.",
    zh: "常见鸡蛋类食物过敏原。"
  },
  soy: {
    category: "food",
    en: "Soy-based ingredient and common allergen.",
    fr: "Ingrédient à base de soja et allergène courant.",
    de: "Sojabasierter Inhaltsstoff und häufiges Allergen.",
    zh: "大豆类成分，也是常见过敏原。"
  },
  peanut: {
    category: "food",
    en: "Major food allergen requiring strict avoidance for allergic users.",
    fr: "Allergène alimentaire majeur nécessitant une éviction stricte.",
    de: "Wichtiges Nahrungsmittelallergen mit strikter Vermeidungspflicht.",
    zh: "主要食物过敏原，过敏人群需严格避免。"
  },
  wheat: {
    category: "food",
    en: "Contains gluten and may affect gluten-sensitive users.",
    fr: "Contient du gluten et peut affecter les personnes sensibles.",
    de: "Enthält Gluten und kann empfindliche Personen beeinträchtigen.",
    zh: "含有麸质，可能影响麸质敏感人群。"
  },
  fish: {
    category: "food",
    en: "Common seafood allergen.",
    fr: "Allergène courant des produits de la mer.",
    de: "Häufiges Meeresfrüchte-Allergen.",
    zh: "常见海鲜过敏原。"
  },
  shellfish: {
    category: "food",
    en: "Shellfish allergen category (e.g., shrimp, crab).",
    fr: "Catégorie d'allergènes de crustacés (ex. crevette, crabe).",
    de: "Schalentier-Allergenkategorie (z. B. Garnele, Krabbe).",
    zh: "甲壳类过敏原类别（如虾、蟹）。"
  },
  sesame: {
    category: "food",
    en: "Common allergen from sesame seeds or oil.",
    fr: "Allergène courant issu du sésame (graines ou huile).",
    de: "Häufiges Allergen aus Sesam (Samen oder Öl).",
    zh: "芝麻相关常见过敏原（种子或油）。"
  },
  sugar: {
    category: "food",
    en: "Sweetener; high intake should be monitored.",
    fr: "Édulcorant ; une consommation élevée doit être surveillée.",
    de: "Süßungsmittel; hohe Aufnahme sollte überwacht werden.",
    zh: "甜味来源，建议关注高摄入量。"
  },
  salt: {
    category: "food",
    en: "Sodium source; monitor intake for blood pressure concerns.",
    fr: "Source de sodium ; surveiller la consommation en cas d'hypertension.",
    de: "Natriumquelle; bei Blutdruckthemen die Aufnahme überwachen.",
    zh: "钠来源，如有血压问题应注意摄入量。"
  }
}

const languageContent = {
  en: {
    title: "Ingredient Analysis",
    unknown: "No detailed database entry yet; flagged for future enrichment.",
    categories: {
      skincare: "Skincare",
      food: "Food",
      general: "General"
    }
  },
  fr: {
    title: "Analyse des ingrédients",
    unknown: "Aucune fiche détaillée en base pour l'instant ; élément signalé pour enrichissement.",
    categories: {
      skincare: "Soin de la peau",
      food: "Alimentaire",
      general: "Général"
    }
  },
  de: {
    title: "Inhaltsstoffanalyse",
    unknown: "Noch kein detaillierter Datenbankeintrag vorhanden; zur Erweiterung markiert.",
    categories: {
      skincare: "Hautpflege",
      food: "Lebensmittel",
      general: "Allgemein"
    }
  },
  zh: {
    title: "成分分析",
    unknown: "数据库暂无详细条目，已标记用于后续补充。",
    categories: {
      skincare: "护肤",
      food: "食品",
      general: "通用"
    }
  }
}

function normalizeLanguage(lang) {
  if (!lang) return 'en'
  if (lang.startsWith('fr')) return 'fr'
  if (lang.startsWith('de')) return 'de'
  if (lang.startsWith('zh')) return 'zh'
  return 'en'
}

function analyzeIngredient(ingredientName, languageKey) {
  const item = ingredientDatabase[ingredientName]
  const content = languageContent[languageKey] || languageContent.en

  if (!item) {
    return {
      category: content.categories.general,
      detail: content.unknown
    }
  }

  const localizedCategory = content.categories[item.category] || content.categories.general

  return {
    category: localizedCategory,
    detail: item[languageKey] || item.en
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { ingredients, lang, targetLanguage, promptLanguage } = await req.json()
    const normalizedLanguage = normalizeLanguage(lang)
    const languagePack = languageContent[normalizedLanguage] || languageContent.en

    console.log('Request:', { ingredients, lang, targetLanguage, promptLanguage })

    const inputIngredients = Array.isArray(ingredients) ? ingredients : []
    const analysisLines = inputIngredients.map((rawIngredient) => {
      const name = String(rawIngredient || '').trim().toLowerCase()
      const result = analyzeIngredient(name, normalizedLanguage)
      return `${rawIngredient}: [${result.category}] ${result.detail}`
    })

    const analysis = `${languagePack.title}:\n${analysisLines.join('\n')}`

    return new Response(
      JSON.stringify({ analysis }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    console.error(error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
