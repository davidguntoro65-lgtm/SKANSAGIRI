// Service Worker – SMKN 1 Wonogiri
// Caches the app shell for fast loads and basic offline support.

const CACHE_NAME = "smkn1wng-v3";

// Assets to pre-cache on install (app shell)
const PRECACHE_URLS = [
  "/id/",
  "/id/manifest.json",
  "/id/favicon.svg"
];

// ─── Install: pre-cache app shell ────────────────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

// ─── Activate: remove old caches ─────────────────────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_NAME)
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// ─── Push: show school updates even while the app is closed ───────────────────
self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { body: event.data?.text() || "Ada informasi baru dari sekolah." };
  }

  const scopeUrl = self.registration.scope;
  event.waitUntil(
    self.registration.showNotification(payload.title || "Pembaruan SMKN 1 Wonogiri", {
      body: payload.body || "Ada informasi baru dari sekolah.",
      icon: new URL(payload.icon || "icons/icon-192.png", scopeUrl).href,
      badge: new URL(payload.badge || "icons/icon-192.png", scopeUrl).href,
      tag: payload.tag || "smkn1-school-update",
      data: { url: payload.url || "./" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const destination = new URL(event.notification.data?.url || "./", self.registration.scope).href;

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(async (windowClients) => {
      for (const client of windowClients) {
        if (!client.url.startsWith(self.registration.scope)) continue;
        try {
          const focusedClient = await client.navigate(destination);
          if (focusedClient) return focusedClient.focus();
          return client.focus();
        } catch {
          return client.focus();
        }
      }
      return self.clients.openWindow(destination);
    }),
  );
});

// ─── Fetch: network-first for API, cache-first for static assets ──────────────
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET and cross-origin requests
  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  // API requests: network-only (never cache).
  // Use .includes("/api/") so it catches both /api/... and /id/api/... (BASE_PATH prefix).
  if (url.pathname.includes("/api/")) return;

  // Static assets (JS, CSS, images): cache-first
  if (
    url.pathname.match(/\.(js|css|png|svg|webp|jpg|jpeg|woff2?|ico)$/)
  ) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((res) => {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((c) => c.put(request, clone));
            return res;
          })
      )
    );
    return;
  }

  // HTML navigation: network-first, fall back to cached /id/
  event.respondWith(
    fetch(request)
      .then((res) => {
        const clone = res.clone();
        caches.open(CACHE_NAME).then((c) => c.put(request, clone));
        return res;
      })
      .catch(() => caches.match("/id/"))
  );
});
