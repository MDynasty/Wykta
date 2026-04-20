const LEGACY_HOST = "mdynasty.github.io";
const TARGET_ORIGIN = "https://wykta.pages.dev";
const LEGACY_BASE_PATH = "/Wykta";

/**
 * Compute the redirect URL for a legacy GitHub Pages URL.
 * Returns the target URL string when the given href is on the legacy host,
 * or null when no redirect is needed.
 *
 * @param {string} href - The full URL to evaluate (e.g. window.location.href).
 * @returns {string|null}
 */
function computeRedirectUrl(href) {
  const currentUrl = new URL(href);
  if (currentUrl.hostname !== LEGACY_HOST) return null;

  let nextPath = currentUrl.pathname || "/";

  if (nextPath === LEGACY_BASE_PATH) {
    nextPath = "/";
  } else if (nextPath.startsWith(`${LEGACY_BASE_PATH}/`)) {
    nextPath = nextPath.slice(LEGACY_BASE_PATH.length) || "/";
  }

  return `${TARGET_ORIGIN}${nextPath}${currentUrl.search}${currentUrl.hash}`;
}

// Browser auto-redirect: run immediately when loaded in a page.
if (typeof window !== "undefined") {
  const redirectUrl = computeRedirectUrl(window.location.href);
  if (redirectUrl) window.location.replace(redirectUrl);
}

// CommonJS export for tests (no-op in browser environments).
if (typeof module !== "undefined") module.exports = { computeRedirectUrl };
