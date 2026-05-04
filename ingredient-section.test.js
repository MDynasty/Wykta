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
