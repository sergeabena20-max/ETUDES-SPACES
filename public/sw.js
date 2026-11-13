const CACHE_VERSION = "etudes-space-v1";
const APP_CACHE = `${CACHE_VERSION}-app`;
const DOCUMENT_CACHE = "etudes-space-documents-v1";
const MAX_OFFLINE_DOCUMENTS = 20;
const APP_FILES = ["/offline.html", "/icons/etudes-space.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(APP_CACHE).then((cache) => cache.addAll(APP_FILES)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => ![APP_CACHE, DOCUMENT_CACHE].includes(key)).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
  if (event.data?.type === "DELETE_OFFLINE_DOCUMENT" && typeof event.data.url === "string") {
    event.waitUntil(caches.open(DOCUMENT_CACHE).then((cache) => cache.delete(event.data.url)));
  }
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);

  // Offline, only the dedicated offline library page is displayed.
  if (request.mode === "navigate" && url.origin === self.location.origin) {
    event.respondWith(fetch(request).catch(async () =>
      (await caches.match("/offline.html")) ||
      new Response("Hors connexion", { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } })
    ));
    return;
  }

  // Download routes are cached only when the learner explicitly saves a document.
  if (url.origin === self.location.origin && url.pathname.startsWith("/api/exams/") && url.pathname.endsWith("/download")) {
    event.respondWith(caches.open(DOCUMENT_CACHE).then(async (cache) => {
      try { return await fetch(request); }
      catch {
        const saved = await cache.match(request);
        return saved || new Response("Ce document n'a pas été enregistré hors connexion.", { status: 503 });
      }
    }));
  }
});
