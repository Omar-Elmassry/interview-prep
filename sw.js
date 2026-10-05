// Offline support for the Interview Prep site.
//
// - The landing page and the three apps are stored on install. When opened they
//   come from the cache straight away, and a fresh copy is fetched in the
//   background for the next launch (stale-while-revalidate).
// - Fonts and the CodeMirror editor come from CDNs. They're stored the first
//   time they load and kept across versions.
// - publish.sh rewrites VERSION on every publish that changes a page, which
//   makes browsers install this worker again and replace the stored pages.

const VERSION = "98cd728dee1b";
const PAGES_CACHE = "ip-pages-" + VERSION;
const RUNTIME_CACHE = "ip-runtime-v1";

const PAGES = ["./", "frontend/", "backend/", "code-drill/"];
const ASSETS = [
  "manifest.webmanifest",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/maskable-512.png",
  "icons/apple-touch-icon.png",
  "icons/favicon-32.png",
];

// Must match CM_BASE / CM_FILES in the code-drill template.
const CM_BASE = "https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/";
const CM_FILES = [
  "codemirror.min.js",
  "mode/javascript/javascript.min.js",
  "addon/edit/matchbrackets.min.js",
  "addon/edit/closebrackets.min.js",
  "addon/comment/comment.min.js",
  "addon/hint/show-hint.min.js",
  "addon/hint/javascript-hint.min.js",
  "addon/hint/anyword-hint.min.js",
];

// The default fonts every app links in its <head>. Fonts picked in Settings
// are stored the first time they load.
const FONT_CSS =
  "https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap";

const CACHE_FIRST_HOSTS = ["cdnjs.cloudflare.com", "fonts.gstatic.com"];
const REVALIDATE_HOSTS = ["fonts.googleapis.com"];

// Fetch a CDN file in CORS mode so the stored copy is a normal response
// (the pages request scripts and stylesheets without CORS).
async function fetchAndStore(cache, url) {
  const res = await fetch(url, { mode: "cors", credentials: "omit" });
  if (res.ok) await cache.put(url, res.clone());
  return res;
}

async function storeIfMissing(cache, url) {
  if (!(await cache.match(url))) await fetchAndStore(cache, url);
}

// Store the font stylesheet plus its Latin font files, so the first offline
// launch already has the right fonts.
async function storeFonts(cache) {
  const res = await fetchAndStore(cache, FONT_CSS);
  if (!res.ok) return;
  const css = await res.text();
  const urls = [];
  for (const block of css.split("/*").slice(1)) {
    const subset = block.slice(0, block.indexOf("*/")).trim();
    if (subset !== "latin" && subset !== "latin-ext") continue;
    const m = block.match(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\)/);
    if (m) urls.push(m[1]);
  }
  await Promise.all(urls.map((u) => storeIfMissing(cache, u)));
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const pages = await caches.open(PAGES_CACHE);
      await pages.addAll([...PAGES, ...ASSETS].map((u) => new Request(u, { cache: "reload" })));
      // CDN files are a bonus: the apps fall back to system fonts and a plain
      // editor without them, so a failure here mustn't stop the install.
      const runtime = await caches.open(RUNTIME_CACHE);
      await Promise.all([
        ...CM_FILES.map((f) => storeIfMissing(runtime, CM_BASE + f).catch(() => {})),
        storeFonts(runtime).catch(() => {}),
      ]);
      await self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys()) {
        if (key.startsWith("ip-") && key !== PAGES_CACHE && key !== RUNTIME_CACHE) await caches.delete(key);
      }
      await self.clients.claim();
    })()
  );
});

function staleWhileRevalidate(event, cacheName, key, fallbackKey) {
  const update = (async () => {
    const res = await fetch(event.request.url, event.request.mode === "navigate" ? {} : { mode: "cors", credentials: "omit" });
    if (res.ok) await (await caches.open(cacheName)).put(key, res.clone());
    return res;
  })();
  event.waitUntil(update.catch(() => {}));
  event.respondWith(
    (async () => {
      const cache = await caches.open(cacheName);
      const hit = await cache.match(key, { ignoreSearch: true });
      if (hit) return hit;
      try {
        return await update;
      } catch (err) {
        const fallback = fallbackKey && (await cache.match(fallbackKey));
        if (fallback) return fallback;
        throw err;
      }
    })()
  );
}

function cacheFirst(event, cacheName, cors) {
  event.respondWith(
    (async () => {
      const cache = await caches.open(cacheName);
      const hit = await cache.match(event.request.url, { ignoreSearch: !cors });
      if (hit) return hit;
      if (cors) return fetchAndStore(cache, event.request.url);
      const res = await fetch(event.request);
      if (res.ok) await cache.put(event.request.url, res.clone());
      return res;
    })()
  );
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  if (url.origin === self.location.origin) {
    if (req.mode === "navigate" || req.destination === "document") {
      // Leave /code-drill (no slash) to the network: GitHub redirects it, and a
      // redirected response can't answer a navigation.
      if (!url.pathname.endsWith("/") && !url.pathname.endsWith(".html")) return;
      // Strip index.html so /code-drill/index.html and /code-drill/ share one entry.
      const key = url.origin + url.pathname.replace(/index\.html$/, "");
      staleWhileRevalidate(event, PAGES_CACHE, key, new URL("./", self.registration.scope).href);
    } else {
      cacheFirst(event, PAGES_CACHE, false);
    }
    return;
  }
  if (CACHE_FIRST_HOSTS.includes(url.hostname)) return cacheFirst(event, RUNTIME_CACHE, true);
  if (REVALIDATE_HOSTS.includes(url.hostname)) return staleWhileRevalidate(event, RUNTIME_CACHE, req.url);
  // Anything else (e.g. the optional Monaco editor) goes straight to the network.
});
