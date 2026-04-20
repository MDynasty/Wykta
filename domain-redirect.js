(() => {
  const LEGACY_HOST = "mdynasty.github.io";
  const TARGET_ORIGIN = "https://wykta.pages.dev";
  const LEGACY_BASE_PATH = "/Wykta";

  if (window.location.hostname !== LEGACY_HOST) return;

  const currentUrl = new URL(window.location.href);
  let nextPath = currentUrl.pathname || "/";

  if (nextPath === LEGACY_BASE_PATH) {
    nextPath = "/";
  } else if (nextPath.startsWith(`${LEGACY_BASE_PATH}/`)) {
    nextPath = nextPath.slice(LEGACY_BASE_PATH.length) || "/";
  }

  const redirectUrl = `${TARGET_ORIGIN}${nextPath}${currentUrl.search}${currentUrl.hash}`;
  window.location.replace(redirectUrl);
})();
