const CACHE_VERSION = "etudes-space-v1";
const APP_CACHE = `${CACHE_VERSION}-app`;
const PDF_CACHE = `${CACHE_VERSION}-pdf`;
const DOCUMENT_CACHE = "etudes-space-documents-v1";
const APP_FILES = ["/offline.html", "/icons/etudes-space.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(APP_CACHE).then((cache) => cache.addAll(APP_FILES)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => ![APP_CACHE, PDF_CACHE].includes(key)).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
  if (event.data?.type === "CACHE_PDF" && typeof event.data.url === "string") {
    event.waitUntil(cachePdf(event.data.url));
  }
  if (event.data?.type === "DELETE_PDF" && typeof event.data.url === "string") {
    event.waitUntil(caches.open(PDF_CACHE).then((cache) => cache.delete(event.data.url)));
  }
});

async function cachePdf(url) {
  const parsed = new URL(url, self.location.origin);
  if (parsed.protocol !== "https:" && parsed.origin !== self.location.origin) return;
  const cache = await caches.open(PDF_CACHE);
  const response = await fetch(parsed.href, { mode: "cors", credentials: "omit" });
  if (!response.ok || (response.type !== "basic" && response.type !== "cors")) throw new Error("PDF indisponible pour le stockage hors connexion");
  await cache.put(parsed.href, response);
  const keys = await cache.keys();
  // Keep at most 20 PDFs to avoid consuming too much device storage.
  while (keys.length > 20) await cache.delete(keys.shift());
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);

  if (request.destination === "document" && url.origin === self.location.origin) {
    event.respondWith(fetch(request).catch(async () => (await caches.match(request)) || (await caches.match("/offline.html"))));
    return;
  }

  if (url.origin === self.location.origin && url.pathname.startsWith("/api/exams/") && url.pathname.endsWith("/download")) {
    event.respondWith(caches.open(DOCUMENT_CACHE).then(async (cache) => {
      try { const response = await fetch(request); if (response.ok) await cache.put(request, response.clone()); return response; }
      catch { const saved = await cache.match(request); return saved || new Response("Document indisponible hors connexion.", { status: 503 }); }
    }));
    return;
  }

  if (request.destination === "document" && url.pathname.toLowerCase().endsWith(".pdf")) {
    event.respondWith(caches.open(PDF_CACHE).then(async (cache) => {
      const saved = await cache.match(request.url);
      if (saved) return saved;
      try { return await fetch(request); }
      catch { return new Response("Ce PDF n'est pas enregistré pour une consultation hors connexion.", { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } }); }
    }));
  }
});
