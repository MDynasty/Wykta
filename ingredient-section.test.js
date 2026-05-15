// Tests for ingredient-section.js — findIngredientSection()
// Run with: node --test ingredient-section.test.js
//
// Covers the exact real-world scenario that was reported as broken:
// a Chinese product label whose OCR output contains BOTH a Chinese 成分: section
// AND a Latin INCI INGREDIENTS section. The function must return only the
// Chinese section when lang="zh", and only the Latin section when lang="en".

const { test } = require("node:test")
const assert = require("node:assert/strict")
const { findIngredientSection } = require("./ingredient-section.js")

// ─── Core bilingual label (the originally broken scenario) ───────────────────

// Realistic OCR output for a Chinese skincare label that has both a Chinese
// ingredient section (成分:) and a Latin INCI section (INGREDIENTS).
const BILINGUAL_LABEL =
  "生产商：某某化妆品有限公司\n" +
  "成分:水,月桂酰氨基乙酸钠,椰油酰甘氨酸钾,甘油,聚季铵盐-7\n" +
  "生产日期:2024-01\n" +
  "INGREDIENTS: AQUA / WATER / EAU, SODIUM LAUROYL SARCOSINATE, POTASSIUM COCOYL GLYCINATE, GLYCERIN, POLYQUATERNIUM-7\n" +
  "Manufactured by SomeCo Ltd."

test("bilingual label zh: returns ONLY the Chinese section", () => {
  const result = findIngredientSection(BILINGUAL_LABEL, "zh")
  // Must contain Chinese ingredient names
  assert.ok(result.includes("水"), `expected 水, got: ${result}`)
  assert.ok(result.includes("月桂酰氨基乙酸钠"), `expected 月桂酰氨基乙酸钠, got: ${result}`)
  // Must NOT bleed into the INCI / Latin section
  assert.ok(!result.includes("AQUA"), `must not contain AQUA (INCI), got: ${result}`)
  assert.ok(!result.includes("INGREDIENTS"), `must not contain INGREDIENTS header, got: ${result}`)
})

test("bilingual label en: returns ONLY the Latin INCI section", () => {
  const result = findIngredientSection(BILINGUAL_LABEL, "en")
  // Must contain INCI names
  assert.ok(result.includes("AQUA"), `expected AQUA, got: ${result}`)
  assert.ok(result.includes("GLYCERIN"), `expected GLYCERIN, got: ${result}`)
  // Must NOT contain Chinese characters
  assert.ok(!/[\u4e00-\u9fa5]/.test(result), `must not contain Chinese chars, got: ${result}`)
  // Must NOT bleed into "Manufactured by" metadata
  assert.ok(!result.includes("Manufactured"), `must not contain manufacturer info, got: ${result}`)
})

// ─── Space-only separator (INGREDIENTS AQUA without colon) ──────────────────

const BILINGUAL_SPACE_SEP =
  "成分:水,月桂酰氨基乙酸钠,甘油\n" +
  "INGREDIENTS AQUA / WATER, SODIUM LAUROYL SARCOSINATE, GLYCERIN\n"

test("bilingual label zh with space-only INCI separator: returns Chinese section", () => {
  const result = findIngredientSection(BILINGUAL_SPACE_SEP, "zh")
  assert.ok(result.includes("水"), `expected 水, got: ${result}`)
  assert.ok(!result.includes("AQUA"), `must not contain AQUA, got: ${result}`)
})

test("bilingual label en with space-only INCI separator: returns Latin section", () => {
  const result = findIngredientSection(BILINGUAL_SPACE_SEP, "en")
  assert.ok(result.includes("AQUA"), `expected AQUA, got: ${result}`)
  assert.ok(!/[\u4e00-\u9fa5]/.test(result), `must not contain Chinese chars, got: ${result}`)
})

// ─── Chinese header variants ─────────────────────────────────────────────────

test("配料: header is recognised as Chinese ingredient section", () => {
  const text = "配料:水,甘油,透明质酸钠\nINGREDIENTS: AQUA, GLYCERIN, SODIUM HYALURONATE"
  const result = findIngredientSection(text, "zh")
  assert.ok(result.includes("透明质酸钠"), `expected 透明质酸钠, got: ${result}`)
  assert.ok(!result.includes("HYALURONATE"), `must not contain HYALURONATE, got: ${result}`)
})

test("原料: header is recognised as Chinese ingredient section", () => {
  const text = "原料:水,甘油\nINGREDIENTS: AQUA, GLYCERIN"
  const result = findIngredientSection(text, "zh")
  assert.ok(result.includes("甘油"), `expected 甘油, got: ${result}`)
  assert.ok(!result.includes("AQUA"), `must not contain AQUA, got: ${result}`)
})

// ─── Single-language labels — fallback behaviour ─────────────────────────────

test("Chinese-only label, lang=en: falls back to Chinese section", () => {
  const text = "成分:水,甘油,透明质酸钠"
  const result = findIngredientSection(text, "en")
  assert.ok(result.includes("甘油"), `expected 甘油 (fallback), got: ${result}`)
})

test("Latin-only label, lang=zh: falls back to Latin section", () => {
  const text = "INGREDIENTS: AQUA, GLYCERIN, SODIUM HYALURONATE"
  const result = findIngredientSection(text, "zh")
  assert.ok(result.includes("AQUA"), `expected AQUA (fallback), got: ${result}`)
})

test("Latin-only label with colon separator, lang=en", () => {
  const text = "INGREDIENTS: AQUA, GLYCERIN, CITRIC ACID"
  const result = findIngredientSection(text, "en")
  assert.equal(result, "AQUA, GLYCERIN, CITRIC ACID")
})

// ─── Metadata is stripped ────────────────────────────────────────────────────

test("Chinese label: metadata after ingredients is stripped", () => {
  const text = "成分:水,甘油\n生产日期:2024-01 净含量:150ml"
  const result = findIngredientSection(text, "zh")
  assert.ok(result.includes("甘油"), `expected 甘油, got: ${result}`)
  assert.ok(!result.includes("生产日期"), `must not contain 生产日期, got: ${result}`)
  assert.ok(!result.includes("净含量"), `must not contain 净含量, got: ${result}`)
})

test("Latin label: 'Made in' metadata is stripped", () => {
  const text = "INGREDIENTS: AQUA, GLYCERIN, CITRIC ACID. Made in France."
  const result = findIngredientSection(text, "en")
  assert.ok(result.includes("CITRIC ACID"), `expected CITRIC ACID, got: ${result}`)
  assert.ok(!result.includes("Made in"), `must not contain Made in, got: ${result}`)
})

test("Latin label: manufacturer info (Ltd., GmbH) is stripped", () => {
  const text = "INGREDIENTS: AQUA, GLYCERIN Distributed by SomeCo Ltd. Germany"
  const result = findIngredientSection(text, "en")
  assert.ok(result.includes("GLYCERIN"), `expected GLYCERIN, got: ${result}`)
  assert.ok(!result.includes("SomeCo"), `must not contain SomeCo, got: ${result}`)
})

// ─── Chinese product-metadata tokens are stripped (bug regression) ────────────
//
// Real-world labels often have the following metadata immediately after the
// ingredient list.  None of these should appear in the extracted ingredient text.

// Realistic OCR output for a Chinese food label with company/licence/usage metadata.
const ZH_FOOD_LABEL_WITH_METADATA =
  "配料：水，白砂糖，食用盐，柠檬酸，维生素C\n" +
  "食品生产许可证编号：SC12345678901234\n" +
  "储存方法：请置于阴凉干燥，不受阳光直射处保存\n" +
  "开封后请尽快食用\n" +
  "见包装喷码处\n" +
  "河南金禾生物科技有限公司\n" +
  "河南省周口市港区物流大道南路\n" +
  "致敏原提示：含小麦"

test("Chinese food label: 食品生产许可证编号 is not included in ingredient section", () => {
  const result = findIngredientSection(ZH_FOOD_LABEL_WITH_METADATA, "zh")
  assert.ok(result.includes("柠檬酸"), `expected 柠檬酸, got: ${result}`)
  assert.ok(!result.includes("食品生产许可证编号"), `must not contain 食品生产许可证编号, got: ${result}`)
})

test("Chinese food label: company name (有限公司) is not included in ingredient section", () => {
  const result = findIngredientSection(ZH_FOOD_LABEL_WITH_METADATA, "zh")
  assert.ok(!result.includes("有限公司"), `must not contain 有限公司, got: ${result}`)
  assert.ok(!result.includes("河南金禾"), `must not contain company name, got: ${result}`)
})

test("Chinese food label: after-opening instruction (开封后请) is not included", () => {
  const result = findIngredientSection(ZH_FOOD_LABEL_WITH_METADATA, "zh")
  assert.ok(!result.includes("开封后请尽快食用"), `must not contain 开封后 instruction, got: ${result}`)
})

test("Chinese food label: storage instruction (请置于阴凉) is not included", () => {
  const result = findIngredientSection(ZH_FOOD_LABEL_WITH_METADATA, "zh")
  assert.ok(!result.includes("请置于阴凉"), `must not contain storage instruction, got: ${result}`)
})

test("Chinese food label: 见包装 packaging note is not included", () => {
  const result = findIngredientSection(ZH_FOOD_LABEL_WITH_METADATA, "zh")
  assert.ok(!result.includes("见包装"), `must not contain 见包装, got: ${result}`)
})

test("Chinese label with only licence/company metadata after ingredients: ingredients still returned", () => {
  const text = "成分：水，甘油，透明质酸钠\n食品生产许可证编号：SC99887766\n河南某某有限公司"
  const result = findIngredientSection(text, "zh")
  assert.ok(result.includes("透明质酸钠"), `expected ingredient, got: ${result}`)
  assert.ok(!result.includes("SC99887766"), `must not contain licence number, got: ${result}`)
})

test("Chinese label: 保质期/保鲜期 line without colon is treated as metadata stop", () => {
  const text =
    "配料：水，白砂糖，食用盐，柠檬酸，维生素C\n" +
    "产品的保质期或保鲜期，用于标识产品的安全性和质量\n" +
    "食品生产许可证编号 一般\n" +
    "河南省周口市"
  const result = findIngredientSection(text, "zh")
  assert.equal(result, "水，白砂糖，食用盐，柠檬酸，维生素C")
})

test("Chinese label: standalone 保质期 without colon is treated as metadata stop", () => {
  const text =
    "配料：小麦，大豆，花生，芝麻\n" +
    "保质期 12个月\n" +
    "净含量 500克"
  const result = findIngredientSection(text, "zh")
  assert.ok(result.includes("小麦"), `expected 小麦, got: ${result}`)
  assert.ok(!result.includes("保质期"), `must not contain 保质期, got: ${result}`)
})

test("Chinese label: OCR-spaced 保 质 期 is treated as metadata stop", () => {
  const text =
    "配料：小麦，大豆，花生，芝麻\n" +
    "保 质 期 12个月\n" +
    "净 含 量 500克"
  const result = findIngredientSection(text, "zh")
  assert.ok(result.includes("小麦"), `expected 小麦, got: ${result}`)
  assert.ok(!result.includes("保 质 期"), `must not contain spaced 保质期, got: ${result}`)
})

test("Chinese label: 致敏原提示 section is excluded as metadata", () => {
  const text =
    "配料：小麦，大豆，花生，芝麻，黑芝麻核桃黑豆桑葚粉\n" +
    "致敏原提示：本产品含有小麦、大豆、花生、芝麻等过敏原成分\n" +
    "本生产线也生产含麦麸的谷类及其制品"
  const result = findIngredientSection(text, "zh")
  assert.ok(result.includes("小麦"), `expected 小麦, got: ${result}`)
  assert.ok(!result.includes("致敏原提示"), `must not contain 致敏原提示, got: ${result}`)
  assert.ok(!result.includes("本生产线"), `must not contain 本生产线, got: ${result}`)
})

test("Chinese label: 本生产线 cross-contamination warning is excluded as metadata", () => {
  const text =
    "配料：小麦，大豆，花生\n" +
    "本生产线也生产含麦麸的谷类及其制品"
  const result = findIngredientSection(text, "zh")
  assert.ok(result.includes("小麦"), `expected 小麦, got: ${result}`)
  assert.ok(!result.includes("本生产线"), `must not contain 本生产线, got: ${result}`)
})

test("Chinese label: bracketed 产品标准代号/净含量 metadata is excluded", () => {
  const text =
    "配料：黑芝麻核桃黑豆桑葚粉，山药，核桃仁，黑豆，小麦，大豆，花生，芝麻\n" +
    "【产品标准代号】GB 19640\n" +
    "【净含量】500克\n" +
    "【保质期】12个月"
  const result = findIngredientSection(text, "zh")
  assert.ok(result.includes("小麦"), `expected 小麦, got: ${result}`)
  assert.ok(!result.includes("产品标准代号"), `must not contain 产品标准代号, got: ${result}`)
  assert.ok(!result.includes("净含量"), `must not contain 净含量, got: ${result}`)
})

test("Latin label: Net Weight / Best before metadata is stripped", () => {
  const text =
    "INGREDIENTS: OATS, PEANUTS, SESAME\n" +
    "Net Weight 500g\n" +
    "Best before: 2027-12-30"
  const result = findIngredientSection(text, "en")
  assert.ok(result.includes("PEANUTS"), `expected PEANUTS, got: ${result}`)
  assert.ok(!result.includes("Net Weight"), `must not contain Net Weight, got: ${result}`)
  assert.ok(!result.includes("Best before"), `must not contain Best before, got: ${result}`)
})

test("French label: Poids net metadata is stripped", () => {
  const text =
    "Ingrédients: Eau, Glycérine, Acide citrique\n" +
    "Poids net 200 ml\n" +
    "Fabriqué en France"
  const result = findIngredientSection(text, "fr")
  assert.ok(result.includes("Glycérine"), `expected Glycérine, got: ${result}`)
  assert.ok(!result.includes("Poids net"), `must not contain Poids net, got: ${result}`)
})

test("German label: Nettoinhalt metadata is stripped", () => {
  const text =
    "Inhaltsstoffe: Wasser, Glycerin, Zitronensäure\n" +
    "Nettoinhalt 200 ml\n" +
    "MHD 12.2027"
  const result = findIngredientSection(text, "de")
  assert.ok(result.includes("Zitronensäure"), `expected Zitronensäure, got: ${result}`)
  assert.ok(!result.includes("Nettoinhalt"), `must not contain Nettoinhalt, got: ${result}`)
})

test("English label: ALLERGENS and IMPORTANT INFORMATION blocks are excluded", () => {
  const text =
    "INGREDIENTS: Whey Protein Concentrate (Milk) (89%), Juice Powders (White Grape and Peach), Flavourings, Acid (Citric Acid), Sweetener (Sucralose)\n" +
    "ALLERGENS: For allergens, see ingredients in bold.\n" +
    "IMPORTANT INFORMATION: Store in a cool, dry place away from direct sunlight."
  const result = findIngredientSection(text, "en")
  assert.ok(result.includes("Whey Protein Concentrate"), `expected ingredient content, got: ${result}`)
  assert.ok(!result.includes("ALLERGENS"), `must not contain ALLERGENS block, got: ${result}`)
  assert.ok(!result.includes("IMPORTANT INFORMATION"), `must not contain IMPORTANT INFORMATION block, got: ${result}`)
})

test("English label: (contains X (A, B)) section with line-wrapped OCR is cut at ALLERGENS", () => {
  // Simulates real OCR output for a UK protein powder label where:
  // - "(contains Emulsifiers (Soya Lecithin, Sunflower\nLecithin))" wraps across lines
  // - "(89%)" and "(5%)" are percentage declarations
  // - ALLERGENS and IMPORTANT INFORMATION follow immediately after INGREDIENTS
  const text =
    "INGREDIENTS: Whey Protein Concentrate (Milk) (89%)\n" +
    "(contains Emulsifiers (Soya Lecithin, Sunflower\n" +
    "Lecithin)). Juice Powders (5%) (White Grape and\n" +
    "Peach). Flavourings. Acid (Citric Acid). Colour (Carotenes). Sweetener (Sucralose).\n" +
    "ALLERGENS: For allergens, see ingredients in bold.\n" +
    "IMPORTANT INFORMATION: Store in a cool, dry place away from direct sunlight.\n" +
    "Suitable for vegetarians. *Naturally Occurring BCAAs."
  const result = findIngredientSection(text, "en")
  assert.ok(result.includes("Whey Protein Concentrate"), `expected WPC, got: ${result}`)
  assert.ok(result.includes("Soya Lecithin"), `expected Soya Lecithin, got: ${result}`)
  assert.ok(!result.includes("ALLERGENS"), `must not contain ALLERGENS block, got: ${result}`)
  assert.ok(!result.includes("IMPORTANT INFORMATION"), `must not contain IMPORTANT INFORMATION, got: ${result}`)
  assert.ok(!result.includes("*Naturally"), `must not contain footnote text, got: ${result}`)
})

test("Chinese label: spaced metadata marker 产 品 标 准 代 号 is stripped", () => {
  const text =
    "配料：黑芝麻，核桃仁，小麦，大豆，花生，芝麻\n" +
    "【产 品 标 准 代 号】GB 19640\n" +
    "【净 含 量】500克"
  const result = findIngredientSection(text, "zh")
  assert.ok(result.includes("小麦"), `expected 小麦, got: ${result}`)
  assert.ok(!result.includes("产 品 标 准 代 号"), `must not contain spaced 产品标准代号, got: ${result}`)
  assert.ok(!result.includes("净 含 量"), `must not contain spaced 净含量, got: ${result}`)
})

// ─── No ingredient header found ──────────────────────────────────────────────

test("bare ingredient list (no header): returned as-is", () => {
  const text = "AQUA, GLYCERIN, CITRIC ACID, SODIUM BENZOATE"
  const result = findIngredientSection(text, "en")
  assert.equal(result, text)
})

test("bare Chinese ingredient list (no header): returned as-is", () => {
  const text = "水, 甘油, 柠檬酸, 苯甲酸钠"
  const result = findIngredientSection(text, "zh")
  assert.equal(result, text)
})

// ─── Nutrition facts panel detection ─────────────────────────────────────────

test("Nutrition Facts heading: returns empty string", () => {
  const text = "Nutrition Facts\nServing size: 1 cup\nCalories: 250\nProtein: 10g\nFat: 5g 8%\nSodium: 200mg 9%"
  const result = findIngredientSection(text, "en")
  assert.equal(result, "", `expected empty string, got: ${result}`)
})

test("营养成分表 heading: returns empty string", () => {
  const text = "营养成分表\n热量 500kJ 6%\n蛋白质 3g 5%\n脂肪 2g 3%"
  const result = findIngredientSection(text, "zh")
  assert.equal(result, "", `expected empty string, got: ${result}`)
})

test("macronutrients + percentage but no heading: returns empty string", () => {
  const text = "Calories 250\nProtein 10g\nFat 5g\nSodium 200mg 9%\nSugars 5g 6%"
  const result = findIngredientSection(text, "en")
  assert.equal(result, "", `expected empty string, got: ${result}`)
})

// ─── Edge cases ───────────────────────────────────────────────────────────────

test("empty string: returned unchanged", () => {
  assert.equal(findIngredientSection("", "en"), "")
})

test("whitespace-only string: returned unchanged", () => {
  const ws = "   \n  "
  assert.equal(findIngredientSection(ws, "en"), ws)
})

test("null input: returned unchanged", () => {
  assert.equal(findIngredientSection(null, "en"), null)
})

test("undefined preferredLang: defaults without throwing", () => {
  // When preferredLang is omitted, function should not throw even in Node
  // (falls back to 'en' via the typeof currentLanguage guard).
  const text = "INGREDIENTS: AQUA, GLYCERIN"
  assert.doesNotThrow(() => findIngredientSection(text))
})

// ─── French / German header variants ─────────────────────────────────────────

test("Ingrédients: header is recognised", () => {
  const text = "Ingrédients: Aqua, Glycérine, Acide citrique"
  const result = findIngredientSection(text, "fr")
  assert.ok(result.includes("Glycérine"), `expected Glycérine, got: ${result}`)
})

test("Inhaltsstoffe: header is recognised", () => {
  const text = "Inhaltsstoffe: Aqua, Glycerin, Zitronensäure"
  const result = findIngredientSection(text, "de")
  assert.ok(result.includes("Zitronensäure"), `expected Zitronensäure, got: ${result}`)
})
