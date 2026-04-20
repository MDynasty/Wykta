// Tests for domain-redirect.js URL computation logic.
// Uses Node.js built-in test runner (no extra dependencies required).
// Run with: node --test domain-redirect.test.js

const { test } = require("node:test");
const assert = require("node:assert/strict");
const { computeRedirectUrl } = require("./domain-redirect.js");

// ─── Non-legacy host: no redirect ──────────────────────────────────────────

test("returns null for the target domain itself", () => {
  assert.equal(computeRedirectUrl("https://wykta.pages.dev/"), null);
});

test("returns null for an unrelated host", () => {
  assert.equal(computeRedirectUrl("https://example.com/Wykta/"), null);
});

// ─── Legacy root paths ──────────────────────────────────────────────────────

test("redirects legacy root /Wykta to /", () => {
  assert.equal(
    computeRedirectUrl("https://mdynasty.github.io/Wykta"),
    "https://wykta.pages.dev/"
  );
});

test("redirects legacy root /Wykta/ (trailing slash) to /", () => {
  assert.equal(
    computeRedirectUrl("https://mdynasty.github.io/Wykta/"),
    "https://wykta.pages.dev/"
  );
});

// ─── Legacy sub-paths ───────────────────────────────────────────────────────

test("strips /Wykta prefix from sub-page path", () => {
  assert.equal(
    computeRedirectUrl("https://mdynasty.github.io/Wykta/checkout.html"),
    "https://wykta.pages.dev/checkout.html"
  );
});

test("strips /Wykta prefix from nested sub-path", () => {
  assert.equal(
    computeRedirectUrl("https://mdynasty.github.io/Wykta/community.html"),
    "https://wykta.pages.dev/community.html"
  );
});

// ─── Query strings and hash fragments ───────────────────────────────────────

test("preserves query string during redirect", () => {
  assert.equal(
    computeRedirectUrl("https://mdynasty.github.io/Wykta/checkout.html?lang=zh"),
    "https://wykta.pages.dev/checkout.html?lang=zh"
  );
});

test("preserves hash fragment during redirect", () => {
  assert.equal(
    computeRedirectUrl("https://mdynasty.github.io/Wykta/index.html#workflow"),
    "https://wykta.pages.dev/index.html#workflow"
  );
});

test("preserves both query string and hash fragment during redirect", () => {
  assert.equal(
    computeRedirectUrl("https://mdynasty.github.io/Wykta/checkout.html?lang=fr&plan=pro#top"),
    "https://wykta.pages.dev/checkout.html?lang=fr&plan=pro#top"
  );
});

// ─── Legacy host without /Wykta prefix (direct root access) ─────────────────

test("redirects legacy host root / without stripping", () => {
  assert.equal(
    computeRedirectUrl("https://mdynasty.github.io/"),
    "https://wykta.pages.dev/"
  );
});

test("redirects legacy host plain / with query string", () => {
  assert.equal(
    computeRedirectUrl("https://mdynasty.github.io/?lang=de"),
    "https://wykta.pages.dev/?lang=de"
  );
});
