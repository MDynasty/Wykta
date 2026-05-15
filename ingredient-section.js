// ingredient-section.js
// Pure utility: given raw label text (e.g. full OCR output) and a UI language code,
// returns the ingredient sub-string that belongs to that language.
//
// Used by app.js (loaded via <script> tag → global) and by unit tests (CommonJS require).

/**
 * Extract the language-appropriate ingredient section from raw label text.
 *
 * Strategy:
 *   - Looks for Chinese heading (成分: / 配料: / 原料: / 成份:) and Latin heading
 *     (INGREDIENTS / CONTAINS / INCI / Ingrédients / Inhaltsstoffe).
 *   - When lang === "zh": returns the Chinese section, stopping before the Latin
 *     section if present (avoids returning the duplicate INCI block).
 *   - For all other lang values: returns the Latin section, stopping before the
 *     Chinese section if present.
 *   - Fallback: if only one type of heading is present, that section is returned
 *     regardless of the requested language.
 *   - No heading found: if the text looks like a Nutrition Facts panel (signals:
 *     "Nutrition Facts" heading OR ≥2 macronutrient names + a % value), returns ""
 *     so the caller can show a targeted "aim at the INGREDIENTS section" message.
 *     Otherwise returns the text as-is (user likely pasted a bare ingredient list).
 *   - Each extracted section is further trimmed at the first metadata marker
 *     (batch number, manufacturer address, "Made in", etc.) that follows the
 *     ingredients list.
 *
 * @param {string} text          Full label text (may contain multiple language sections).
 * @param {string} [preferredLang] UI language code, e.g. "zh", "en", "fr", "de".
 *                                 Falls back to calling currentLanguage() (browser global)
 *                                 or "en" in non-browser environments.
 * @returns {string} Extracted ingredient text, or "" when a nutrition panel is detected.
 */
function findIngredientSection(text, preferredLang) {
  if (!text || !text.trim()) return text
  const lang = preferredLang ||
    (typeof currentLanguage === "function" ? currentLanguage() : "en")

  // Heading patterns that signal the start of an ingredient section.
  // Separators include : / and also a newline (INGREDIENTS\nWater...) or a dash/em-dash
  // (OCR sometimes reads colons as dashes). A trailing space before an uppercase word
  // is also accepted (e.g. "INGREDIENTS AQUA" as OCR'd from a label without a colon).
  const zhHeaderRe = /(?:其他微量|其他|微量)?成分[:：]|配料[:：]|原料[:：]|成份[:：]/i
  const laHeaderRe = /\bINGREDIENTS?\s*[:/\-–—\n]|\bINGREDIENTS?\s+(?=[A-ZÀÂÇÉÈÊËÎÏÔÛÙÜŸŒÆ])|\bCONTAINS\s*[:/\-–—\n]|\bCONTIENT\s*[:/\-–—\n]|\bINCI\s*[:/\-–—\n]|Ingrédients?\s*[:/\-–—\n]|Inhaltsstoffe?\s*[:/\-–—\n]/i

  const zhMatch = zhHeaderRe.exec(text)
  const laMatch = laHeaderRe.exec(text)

  // No known ingredient heading found.
  // Check whether the text looks like a nutrition facts / nutritional information panel.
  // Key signals: "Nutrition Facts" / "Valeur nutritive" / "Nährwerte" heading OR
  // a combination of ≥2 distinct macronutrient/micronutrient names plus a percentage
  // value (characteristic of a nutrition table row). When detected without an ingredient
  // header, return "" so the caller can show a targeted "aim at INGREDIENTS section" message.
  // Otherwise (no nutrition-facts signals) the text is probably a user-pasted ingredient
  // list without a header — return it as-is so it can be parsed normally.
  if (!zhMatch && !laMatch) {
    const hasNutrifactsHeader = /\bNutrition\s+Facts\b|\bValeur\s+nutritive\b|\bNährwert(?:angaben|information|e)?\b|营养成分(?:表)?/i.test(text)
    const macroMatches = text.match(/\b(?:Calories?|Protein|Protéines?|Fat|Fett|Graisses?|Carbohydrate|Glucides?|Sodium|Natrium|Cholesterol|Cholestérol|Sugars?|Sucres?|Fibre|Fiber|Potassium|Eiweiß|Kohlenhydrate|Calcium|Iron|Fer|Vitamine?\s*[A-Za-z0-9]+)\b/gi)
    const distinctMacros = new Set((macroMatches || []).map(m => m.toLowerCase().replace(/\s+/g, " "))).size
    const hasPercentageValue = /\b\d+\s*%/.test(text)
    if (hasNutrifactsHeader || (distinctMacros >= 2 && hasPercentageValue)) return ""
    return text
  }

  // After identifying the start of an ingredient section, stop before product-metadata keywords
  // (batch number, net weight, manufacturer info, usage instructions, etc.) that typically
  // follow the ingredient list on both Chinese and Latin-script labels.
  // The order of alternates matters: more-specific company/address patterns fire before
  // the broader "Made in" pattern, cutting off company name + address + registration code
  // that sit between the last INCI ingredient and the country-of-origin statement.
  //
  // Chinese metadata stop patterns fall into two groups:
  //   1. Heading-style keywords that are always followed by a colon on Chinese labels
  //      (e.g. "储存方法：", "生产日期：").  We require the colon so a rare ingredient name
  //      that happens to share a substring cannot accidentally truncate the list.
  //   2. Unambiguous non-ingredient phrases that never appear as ingredient names and
  //      therefore do not need a colon guard — e.g. licence-number codes, company-name
  //      suffixes, after-opening / storage instruction openers, and "see packaging" notes.
  const metadataStopRe = /(?:生产批号|使用方法|生产日期|限期使用日期|保质期|适用人群|使用注意|储存方法|产品批号|注意事项|生产企业|备案人|境内负责人|委托单位)[：:]|(?:食品生产许可证编号|卫生许可证编号|生产许可证编号|产品的保质期|保质期或保鲜期|保鲜期|储存方法\s|保存方法|净\s*含\s*量|净\s*重|规\s*格|执\s*行\s*标\s*准(?:\s*号)?|产\s*品\s*标\s*准\s*(?:代\s*号|号)|标\s*准\s*代\s*号|有限公司|股份有限公司|股份公司|合伙企业|开封后请|开封后需|开封后立即|开封后应|见包装|喷码处|请置于阴凉|请存放于|请放置于|不受阳光直射|避免阳光直射|交叉口|本品在|本产品在)|\b(?:Lot\s*(?:No?\.?\s*)?[#:\-–]|Batch\s*(?:No?\.?\s*)?[#:\-–]|(?:Manufactured|Distributed|Imported|Packaged|Produced|Bottled|Packed)\s+(?:by|for)\b|Made\s+in\b|Produced\s+in\b|Product\s+of\b|Fabriqu[eé]s?\s+(?:en|au|par)\b|Import[eé]\s+par\b|Distribu[eé]\s+par\b|Produit\s+(?:de|par)\b|Questions?\s+or\s+Comments?\b|For\s+more\s+information\b|Net\s*(?:Wt|Weight|Content)\b|Poids\s+net\b|Contenu\s+net\b|Netto(?:gewicht|inhalt)\b|Best\s+before\b|Use\s+by\b|Expiry(?:\s+date)?\b|Expiration(?:\s+date)?\b|MHD\b|SKU\b|EAN\b|Barcode\b|www\.[a-z]+|Laboratoires?\b|GmbH\b|Ltd\.?\b|Inc\.?\b|Corp\.?\b|S\.A\.S\.?\b|SAS\b|SARL\b|B\.V\.?\b|\d+\s*,?\s*(?:avenue|rue|boulevard|all[eé]e|strasse|street|place)\s+[A-Z])|©/i

  function sliceSection(start, hardEnd) {
    const rawSlice = text.slice(start, hardEnd).trim()
    if (!rawSlice) return ""
    const stopMatch = metadataStopRe.exec(rawSlice)
    if (stopMatch) {
      // Return everything before the metadata marker.
      // If the marker fires right at the start (no ingredient content), fall back
      // to the raw slice to avoid an empty result — this is still better than
      // returning the full label text with pre-header metadata.
      return rawSlice.slice(0, stopMatch.index).trim() || rawSlice
    }
    return rawSlice
  }

  if (lang === "zh") {
    if (zhMatch) {
      const start = zhMatch.index + zhMatch[0].length
      // Stop before the Latin INCI section (same ingredients in different notation)
      const laStop = (laMatch && laMatch.index > start) ? laMatch.index : text.length
      return sliceSection(start, laStop) || ""
    }
    // No Chinese header but Latin exists — use Latin section as fallback
    return sliceSection(laMatch.index + laMatch[0].length, text.length) || ""
  } else {
    if (laMatch) {
      const start = laMatch.index + laMatch[0].length
      // Stop before the Chinese section (if it appears after the Latin header)
      const zhStop = (zhMatch && zhMatch.index > start) ? zhMatch.index : text.length
      return sliceSection(start, zhStop) || ""
    }
    // No Latin header but Chinese exists — use Chinese section as fallback
    return sliceSection(zhMatch.index + zhMatch[0].length, text.length) || ""
  }
}

// CommonJS export for unit tests (Node.js).
// In the browser this file is loaded as a plain <script> tag, making
// findIngredientSection available as a global.
if (typeof module !== "undefined") {
  module.exports = { findIngredientSection }
}
