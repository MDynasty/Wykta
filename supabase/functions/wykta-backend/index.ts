import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const FALLBACK_OPENAI_MODEL = "gpt-4o-mini"

// ---------------------------------------------------------------------------
// OpenAI AI analysis
// Set the OPENAI_API_KEY Supabase secret to enable AI-powered analysis:
//   supabase secrets set OPENAI_API_KEY=sk-...
// When the secret is absent the function falls back to the local database.
// ---------------------------------------------------------------------------

async function analyzeWithOpenAI(
  ingredients: string[],
  targetLanguage: string,
): Promise<string | null> {
  const apiKey = Deno.env.get("OPENAI_API_KEY")
  const model = Deno.env.get("OPENAI_MODEL") || FALLBACK_OPENAI_MODEL
  if (!apiKey) return null

  const ingredientList = ingredients.join(", ")
  const prompt =
    `You are an expert ingredient analyst for food and skincare products. ` +
    `Analyze each of the following ingredients and provide a concise description ` +
    `covering its purpose, category (Food / Skincare / General), and any notable ` +
    `safety or health considerations. ` +
    `Include one reliable source reference per ingredient. ` +
    `Respond in ${targetLanguage}. ` +
    `Format your answer as a plain list, one ingredient per line, like:\n` +
    `<ingredient name>: [<Category>] <description> | Source: <source>\n\n` +
    `Ingredients: ${ingredientList}`

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      max_tokens: 1024,
      temperature: 0.3,
    }),
  })

  if (!response.ok) {
    const errText = await response.text()
    throw new Error(`OpenAI API error ${response.status}: ${errText}`)
  }

  const json = await response.json()
  const content: string | undefined = json?.choices?.[0]?.message?.content
  if (!content) return null

  const normalizedLines = content
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.includes("Source:") ? line : `${line} | Source: AI model synthesis`)

  return normalizedLines.join("\n")
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
  },

  "retinyl palmitate": {
    category: "skincare",
    en: "Ester of vitamin A (retinol); gentler skin-conditioning agent.",
    fr: "Ester de la vitamine A (rétinol) ; agent conditionneur plus doux.",
    de: "Ester von Vitamin A (Retinol); sanfteres hautpflegendes Mittel.",
    zh: "维生素A（视黄醇）的酯类；温和护肤成分。"
  },
  ceramide: {
    category: "skincare",
    en: "Lipid that replenishes and strengthens the skin barrier.",
    fr: "Lipide qui reconstitue et renforce la barrière cutanée.",
    de: "Lipid, das die Hautbarriere ergänzt und stärkt.",
    zh: "脂质成分，有助于修复和强化皮肤屏障。"
  },
  panthenol: {
    category: "skincare",
    en: "Pro-vitamin B5; soothes, moisturises, and aids wound healing.",
    fr: "Pro-vitamine B5 ; apaise, hydrate et favorise la cicatrisation.",
    de: "Pro-Vitamin B5; beruhigt, feuchtet und fördert die Wundheilung.",
    zh: "泛醇（维生素B5前体）；舒缓、保湿并促进伤口愈合。"
  },
  "shea butter": {
    category: "skincare",
    en: "Plant-derived emollient rich in fatty acids; deeply nourishing.",
    fr: "Émollient d'origine végétale riche en acides gras ; très nourrissant.",
    de: "Pflanzliches Emolliens reich an Fettsäuren; tief nährend.",
    zh: "富含脂肪酸的植物性润肤剂，滋养效果深入。"
  },
  "cetearyl alcohol": {
    category: "skincare",
    en: "Fatty alcohol used as emulsifier and emollient; thickens formulas.",
    fr: "Alcool gras utilisé comme émulsifiant et émollient ; épaissit les formules.",
    de: "Fettalkohol als Emulgator und Emolliens; verdickt Formeln.",
    zh: "脂肪醇，用作乳化剂和润肤剂，同时增稠配方。"
  },
  "zinc oxide": {
    category: "skincare",
    en: "Broad-spectrum mineral UV filter; also soothing and anti-inflammatory.",
    fr: "Filtre UV minéral à large spectre ; également apaisant et anti-inflammatoire.",
    de: "Breitbandiger mineralischer UV-Filter; auch beruhigend und entzündungshemmend.",
    zh: "广谱矿物防晒成分，同时具有舒缓和抗炎效果。"
  },
  "titanium dioxide": {
    category: "skincare",
    en: "Mineral UV filter and whitening pigment used in sunscreens.",
    fr: "Filtre UV minéral et pigment blanchissant utilisé dans les écrans solaires.",
    de: "Mineralischer UV-Filter und Weißpigment in Sonnenschutzmitteln.",
    zh: "矿物紫外线过滤剂和美白色素，常用于防晒产品。"
  },
  dimethicone: {
    category: "skincare",
    en: "Silicone that smooths skin texture and forms a protective layer.",
    fr: "Silicone qui lisse la texture cutanée et forme une couche protectrice.",
    de: "Silikon, das die Hauttextur glättet und eine Schutzschicht bildet.",
    zh: "硅酮成分，使皮肤光滑并形成保护层。"
  },
  squalane: {
    category: "skincare",
    en: "Lightweight, non-comedogenic emollient with excellent skin feel.",
    fr: "Émollient léger et non comédogène avec une excellente texture.",
    de: "Leichtes, nicht-komedogenes Emolliens mit hervorragendem Hautgefühl.",
    zh: "轻盈、不堵塞毛孔的润肤成分，肤感极佳。"
  },
  "sodium lauryl sulfate": {
    category: "skincare",
    en: "Anionic surfactant for cleansing; may strip natural oils and irritate.",
    fr: "Tensioactif anionique nettoyant ; peut décaper les huiles naturelles et irriter.",
    de: "Anionisches Tensid zur Reinigung; kann natürliche Öle entfernen und reizen.",
    zh: "阴离子表面活性剂，用于清洁；可能去除天然油脂并引起刺激。"
  },
  allantoin: {
    category: "skincare",
    en: "Promotes cell regeneration and soothes irritation.",
    fr: "Favorise la régénération cellulaire et apaise l'irritation.",
    de: "Fördert die Zellregeneration und beruhigt Reizungen.",
    zh: "促进细胞再生，舒缓皮肤刺激。"
  },
  "azelaic acid": {
    category: "skincare",
    en: "Keratolytic and antimicrobial; used for acne, rosacea, and uneven tone.",
    fr: "Kératolytique et antimicrobien ; utilisé contre l'acné, la rosacée et le teint irrégulier.",
    de: "Keratolytisch und antimikrobiell; bei Akne, Rosacea und ungleichmäßigem Teint.",
    zh: "角质溶解和抗菌成分，用于痤疮、玫瑰痤疮及肤色不均。"
  },
  // ── Additional food ───────────────────────────────────────────────────
  "palm oil": {
    category: "food",
    en: "High in saturated fat; environmental concerns over deforestation.",
    fr: "Riche en graisses saturées ; préoccupations environnementales liées à la déforestation.",
    de: "Reich an gesättigten Fettsäuren; Umweltbedenken wegen Abholzung.",
    zh: "富含饱和脂肪；与森林砍伐相关的环境问题受到关注。"
  },
  "coconut oil": {
    category: "food",
    en: "High in saturated fat; stable for high-heat cooking.",
    fr: "Riche en graisses saturées ; stable pour la cuisson à haute température.",
    de: "Reich an gesättigten Fettsäuren; stabil bei hoher Hitze.",
    zh: "富含饱和脂肪，耐高温烹饪。"
  },
  "potassium sorbate": {
    category: "food",
    en: "Preservative (E202) that extends shelf life; inhibits yeast and mould.",
    fr: "Conservateur (E202) prolongeant la durée de conservation ; inhibe levures et moisissures.",
    de: "Konservierungsmittel (E202) zur Haltbarkeitsverlängerung; hemmt Hefen und Schimmel.",
    zh: "防腐剂（E202），延长保质期，抑制酵母和霉菌。"
  },
  "monosodium glutamate": {
    category: "food",
    en: "Flavour enhancer (E621) providing umami taste; safe for most people.",
    fr: "Exhausteur de goût (E621) apportant un goût umami ; sûr pour la plupart.",
    de: "Geschmacksverstärker (E621) mit Umami-Geschmack; für die meisten sicher.",
    zh: "味精（E621），提供鲜味，对大多数人安全。"
  },
  "high fructose corn syrup": {
    category: "food",
    en: "Liquid sweetener from corn starch; high intake linked to metabolic concerns.",
    fr: "Édulcorant liquide issu de l'amidon de maïs ; consommation élevée liée à des problèmes métaboliques.",
    de: "Flüssiges Süßungsmittel aus Maisstärke; hoher Konsum mit Stoffwechselproblemen verbunden.",
    zh: "玉米淀粉来源的液体甜味剂，大量摄入与代谢问题相关。"
  },
  carrageenan: {
    category: "food",
    en: "Seaweed-derived thickener (E407); some evidence of gut inflammation at high doses.",
    fr: "Épaississant d'origine marine (E407) ; certaines preuves d'inflammation intestinale à doses élevées.",
    de: "Algen-basiertes Verdickungsmittel (E407); einige Hinweise auf Darmentzündung bei hohen Dosen.",
    zh: "海藻提取增稠剂（E407），高剂量下可能引发肠道炎症。"
  },
  lecithin: {
    category: "food",
    en: "Natural emulsifier (E322); often from soy or sunflower; blends oil and water.",
    fr: "Émulsifiant naturel (E322) souvent issu du soja ou du tournesol ; mélange huile et eau.",
    de: "Natürlicher Emulgator (E322); oft aus Soja oder Sonnenblume; verbindet Öl und Wasser.",
    zh: "天然乳化剂（E322），常来源于大豆或葵花籽，使油水相溶。"
  },
  maltodextrin: {
    category: "food",
    en: "Starch-derived thickener and filler; rapidly digested and raises blood sugar.",
    fr: "Épaississant et charge dérivés d'amidon ; digestion rapide et élève la glycémie.",
    de: "Stärkebasierter Verdicker und Füllstoff; schnell verdaut und erhöht Blutzucker.",
    zh: "淀粉衍生增稠剂和填充剂，消化速度快，可快速升高血糖。"
  },
  aspartame: {
    category: "food",
    en: "Artificial sweetener (E951); avoid if you have PKU (contains phenylalanine).",
    fr: "Édulcorant artificiel (E951) ; à éviter en cas de PCU (contient de la phénylalanine).",
    de: "Künstlicher Süßstoff (E951); bei PKU meiden (enthält Phenylalanin).",
    zh: "人工甜味剂（E951），苯丙酮尿症患者应避免（含苯丙氨酸）。"
  },
  sucralose: {
    category: "food",
    en: "Artificial sweetener (E955); 600× sweeter than sugar; heat-stable.",
    fr: "Édulcorant artificiel (E955) ; 600× plus sucré que le sucre ; stable à la chaleur.",
    de: "Künstlicher Süßstoff (E955); 600× süßer als Zucker; hitzestabil.",
    zh: "人工甜味剂（E955），甜度是蔗糖的600倍，耐热稳定。"
  },
  stevia: {
    category: "food",
    en: "Plant-based zero-calorie sweetener (E960); considered safe.",
    fr: "Édulcorant d'origine végétale sans calories (E960) ; considéré comme sûr.",
    de: "Pflanzenbasierter kalorienfreier Süßstoff (E960); als sicher eingestuft.",
    zh: "植物来源零卡路里甜味剂（E960），被认为安全。"
  },
  erythritol: {
    category: "food",
    en: "Sugar alcohol sweetener (E968); low glycaemic; minimally absorbed.",
    fr: "Polyol édulcorant (E968) ; faible index glycémique ; peu absorbé.",
    de: "Zuckeralkohol-Süßstoff (E968); niedriger GI; kaum absorbiert.",
    zh: "糖醇甜味剂（E968），升糖指数低，吸收量极少。"
  },
  "sodium nitrite": {
    category: "food",
    en: "Curing agent and preservative (E250) in meats; potential carcinogen at high doses.",
    fr: "Agent de salaison et conservateur (E250) dans les viandes ; cancérigène potentiel à fortes doses.",
    de: "Pökel- und Konservierungsmittel (E250) in Fleisch; bei hohen Dosen potenziell krebserregend.",
    zh: "肉类腌制剂和防腐剂（E250），高剂量下可能致癌。"
  },
  "caramel color": {
    category: "food",
    en: "Brown food colourant (E150) made by heating sugar; Class IV linked to 4-MEI concerns.",
    fr: "Colorant alimentaire brun (E150) obtenu par chauffage du sucre ; classe IV liée au 4-MEI.",
    de: "Brauner Lebensmittelfarbstoff (E150) durch Erhitzen von Zucker; Klasse IV mit 4-MEI-Bedenken.",
    zh: "棕色食用色素（E150），加热糖制成，第四类与4-MEI安全问题相关。"
  },
  "guar gum": {
    category: "food",
    en: "Plant-based thickener (E412); high in soluble fibre.",
    fr: "Épaississant végétal (E412) ; riche en fibres solubles.",
    de: "Pflanzliches Verdickungsmittel (E412); reich an löslichen Ballaststoffen.",
    zh: "植物性增稠剂（E412），富含可溶性膳食纤维。"
  },
  vinegar: {
    category: "food",
    en: "Acetic acid solution used for flavouring and natural preservation.",
    fr: "Solution d'acide acétique utilisée pour aromatiser et conserver naturellement.",
    de: "Essigsäurelösung für Würze und natürliche Konservierung.",
    zh: "醋酸溶液，用于调味和天然防腐。"
  }
}

const languageContent = {
  en: {
    title: "Ingredient Analysis",
    aiLanguage: "English",
    unknown: "No detailed database entry yet; flagged for future enrichment. Source: Wykta local ingredient database fallback.",
    categories: {
      skincare: "Skincare",
      food: "Food",
      general: "General"
    }
  },
  fr: {
    title: "Analyse des ingrédients",
    aiLanguage: "French",
    unknown: "Aucune fiche détaillée en base pour l'instant ; élément signalé pour enrichissement. Source : base locale Wykta (fallback).",
    categories: {
      skincare: "Soin de la peau",
      food: "Alimentaire",
      general: "Général"
    }
  },
  de: {
    title: "Inhaltsstoffanalyse",
    aiLanguage: "German",
    unknown: "Noch kein detaillierter Datenbankeintrag vorhanden; zur Erweiterung markiert. Quelle: lokale Wykta-Datenbank (Fallback).",
    categories: {
      skincare: "Hautpflege",
      food: "Lebensmittel",
      general: "Allgemein"
    }
  },
  zh: {
    title: "成分分析",
    aiLanguage: "Chinese",
    unknown: "数据库暂无详细条目，已标记用于后续补充。来源：Wykta 本地数据库兜底。",
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
    const { ingredients, lang, targetLanguage } = await req.json()
    const normalizedLanguage = normalizeLanguage(lang)
    const languagePack = languageContent[normalizedLanguage] || languageContent.en
    const aiLanguage = targetLanguage || languagePack.aiLanguage || 'English'

    console.log('Request:', { ingredients, lang, targetLanguage })

    const inputIngredients: string[] = Array.isArray(ingredients)
      ? ingredients.map((i) => String(i || '').trim()).filter(Boolean)
      : []

    if (!inputIngredients.length) {
      return new Response(
        JSON.stringify({ analysis: '' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
      )
    }

    // 1. Try AI analysis (requires OPENAI_API_KEY secret)
    try {
      const aiAnalysis = await analyzeWithOpenAI(inputIngredients, aiLanguage)
      if (aiAnalysis) {
        console.log('Using AI analysis')
        return new Response(
          JSON.stringify({ analysis: `${languagePack.title}:\n${aiAnalysis}` }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
        )
      }
    } catch (aiErr) {
      console.warn('AI analysis failed, falling back to local database:', aiErr)
    }

    // 2. Fallback: local ingredient database
    console.log('Using local ingredient database')
    const analysisLines = inputIngredients.map((displayName) => {
      const name = displayName.toLowerCase()
      const result = analyzeIngredient(name, normalizedLanguage)
      return `${displayName}: [${result.category}] ${result.detail}`
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
