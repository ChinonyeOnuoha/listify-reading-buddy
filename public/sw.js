/* Reading Buddy service worker — caches the app shell only.
 *
 * What it stores: the app's HTML, scripts, styles, fonts and icons, so repeat visits are fast and the app opens offline.
 * What it never stores: passages, page photos or recordings. Those live in the open tab's memory (blob: URLs, which a
 * service worker never sees) and are gone when the tab or app is closed.
 *
 * Updates: pages are fetched network-first, so a fresh open gets the latest version. A new version of this worker waits
 * until the app tells it to take over (only offered when no session is open), so nothing reloads mid-recording.
 */
const VERSION = "rb-v1";
const SHELL = `${VERSION}-shell`;
const ASSETS = `${VERSION}-assets`;
const FONTS = `${VERSION}-fonts`;
const STATIC = ["/", "/offline.html", "/manifest.webmanifest", "/icons/icon-192.png", "/icons/icon-512.png", "/icons/apple-touch-icon.png", "/icons/favicon-32.png"];
const MAX_ASSETS = 150;

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL);
      await cache.addAll(STATIC);
      // Also precache the scripts and styles the start page references, so the very first offline open works.
      try {
        const html = await (await fetch("/", { cache: "no-store" })).text();
        const urls = [...html.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)].map((m) => m[1]);
        const assets = await caches.open(ASSETS);
        await Promise.all([...new Set(urls)].map((u) => assets.add(u).catch(() => {})));
      } catch {
        /* offline during install: runtime caching fills in later */
      }
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keep = new Set([SHELL, ASSETS, FONTS]);
      for (const key of await caches.keys()) if (!keep.has(key)) await caches.delete(key);
      await self.clients.claim();
    })(),
  );
});

// The app asks a waiting worker to take over only at a safe point (no open session).
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});

async function trim(cacheName, max) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - max; i++) await cache.delete(keys[i]);
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Page loads: network first (latest version), then the cached start page, then the offline page.
  if (req.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const res = await fetch(req);
          if (res.ok && url.origin === self.location.origin && url.pathname === "/") {
            const copy = res.clone();
            caches.open(SHELL).then((c) => c.put("/", copy));
          }
          return res;
        } catch {
          return (await caches.match("/", { cacheName: SHELL })) || (await caches.match("/offline.html")) || Response.error();
        }
      })(),
    );
    return;
  }

  // Built scripts/styles have content-hashed names: cache first.
  if (url.origin === self.location.origin && url.pathname.startsWith("/assets/")) {
    event.respondWith(
      (async () => {
        const hit = await caches.match(req, { cacheName: ASSETS });
        if (hit) return hit;
        const res = await fetch(req);
        if (res.ok) {
          const copy = res.clone();
          caches.open(ASSETS).then((c) => c.put(req, copy).then(() => trim(ASSETS, MAX_ASSETS)));
        }
        return res;
      })(),
    );
    return;
  }

  // Google Fonts (stylesheet + font files): serve cached, refresh in the background.
  if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
    event.respondWith(
      (async () => {
        const cache = await caches.open(FONTS);
        const hit = await cache.match(req);
        const refresh = fetch(req)
          .then((res) => {
            if (res.ok || res.type === "opaque") cache.put(req, res.clone());
            return res;
          })
          .catch(() => hit);
        return hit || refresh;
      })(),
    );
    return;
  }

  // Other same-origin static files (icons, manifest): cache first.
  if (url.origin === self.location.origin && STATIC.includes(url.pathname)) {
    event.respondWith(caches.match(req).then((hit) => hit || fetch(req)));
  }
  // Everything else (including blob: audio/images, which never reach here) goes straight to the network.
});
