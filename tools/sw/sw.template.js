/* Reading Buddy service worker — caches the app shell only.
 *
 * This file is a TEMPLATE. The build (tools/sw-plugin.ts) stamps BUILD_ID and PRECACHE below and emits it as /sw.js.
 *
 * Why stamping matters: a browser only notices a new service worker when /sw.js changes byte for byte. BUILD_ID is derived
 * from the hashed names of every built script and style plus the contents of the public files, so any release that changes
 * the app changes this file, and the update is detected.
 *
 * What it stores: the app's HTML, scripts, styles, fonts and icons, so repeat visits are fast and the app opens offline.
 * What it never stores: passages, page photos or recordings. Those live in the open tab's memory (blob: URLs, which a
 * service worker never sees) and are gone when the tab or app is closed.
 *
 * Updates never interrupt anyone: install does not call skipWaiting. A new version waits until the app asks for it with a
 * SKIP_WAITING message (only sent when no session is open) or until every open copy of the app has closed. The old
 * version keeps serving its own caches until then, so nothing changes under an open session.
 *
 * Caches: only caches whose names start with "reading-buddy-" (or the legacy "rb-v<number>" names from the first
 * release) are ever read or deleted here. Other caches on the same origin are never touched.
 */
const BUILD_ID = "__RB_BUILD_ID__";
const PRECACHE = ["__RB_PRECACHE__"]; // built scripts and styles, e.g. "/assets/index-abc123.js"

const PREFIX = "reading-buddy-";
const SHELL = `${PREFIX}${BUILD_ID}-shell`; // start page, icons, manifest — replaced every release
const ASSETS = `${PREFIX}${BUILD_ID}-assets`; // built scripts and styles — replaced every release
const FONTS = `${PREFIX}fonts`; // web fonts — kept across releases
const OWNED = /^(reading-buddy-|rb-v\d)/; // ours, including the first release's "rb-v1-…" names
const STATIC = [
  "/",
  "/offline.html",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/apple-touch-icon.png",
  "/icons/favicon-32.png",
];
const MAX_ASSETS = 200;

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      // addAll is all-or-nothing: if anything can't be fetched, this version doesn't install and the current one keeps running.
      await (await caches.open(SHELL)).addAll(STATIC);
      await (await caches.open(ASSETS)).addAll(PRECACHE);
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keep = new Set([SHELL, ASSETS, FONTS]);
      for (const key of await caches.keys()) {
        if (OWNED.test(key) && !keep.has(key)) await caches.delete(key);
      }
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
            event.waitUntil(caches.open(SHELL).then((c) => c.put("/", copy)));
          }
          return res;
        } catch {
          return (
            (await caches.match("/", { cacheName: SHELL })) ||
            (await caches.match("/offline.html", { cacheName: SHELL })) ||
            Response.error()
          );
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
          event.waitUntil(
            caches.open(ASSETS).then((c) => c.put(req, copy).then(() => trim(ASSETS, MAX_ASSETS))),
          );
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

  // Other same-origin static files (icons, manifest): cache first, from our own shell cache only.
  if (url.origin === self.location.origin && STATIC.includes(url.pathname)) {
    event.respondWith(caches.match(req, { cacheName: SHELL }).then((hit) => hit || fetch(req)));
  }
  // Everything else (including blob: audio/images, which never reach here) goes straight to the network.
});
