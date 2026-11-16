const CACHE_VERSION = "etudes-space-v1";
const APP_CACHE = `${CACHE_VERSION}-app`;
const DOCUMENT_CACHE = "etudes-space-documents-v1";
const APP_FILES = ["/offline.html", "/icons/etudes-space.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(APP_CACHE).then((cache) => cache.addAll(APP_FILES)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => ![APP_CACHE, DOCUMENT_CACHE].includes(key)).map((key) => caches.delete(key))))
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
  if (url.origin !== self.location.origin) return;

  // Handle PDF download requests BEFORE generic page navigations.
  // A link opened in a new tab is also a navigation request.
  if (url.pathname.startsWith("/api/exams/") && url.pathname.endsWith("/download")) {
    event.respondWith((async () => {
      try {
        return await fetch(request);
      } catch {
        const cache = await caches.open(DOCUMENT_CACHE);
        const saved = await cache.match(url.href);
        return saved || new Response("Ce document n'a pas été enregistré hors connexion. Reconnecte-toi pour l'enregistrer.", {
          status: 503,
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        });
      }
    })());
    return;
  }

  // Other pages use the offline library fallback. The rest of the site is not cached.
  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(async () =>
      (await caches.match("/offline.html")) ||
      new Response("Hors connexion", { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } })
    ));
  }
});


self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { title: "Études Space", body: event.data?.text() || "Une nouvelle information est disponible." };
  }
  const title = typeof payload.title === "string" ? payload.title : "Études Space";
  const options = {
    body: typeof payload.body === "string" ? payload.body : "Une nouvelle épreuve est disponible.",
    icon: "/icons/etudes-space.svg",
    badge: "/icons/etudes-space.svg",
    tag: typeof payload.tag === "string" ? payload.tag : "etudes-space-update",
    data: { url: typeof payload.url === "string" ? payload.url : "/dashboard" },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || "/dashboard", self.location.origin);
  if (target.origin !== self.location.origin) return;
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const client of windows) {
      if ("focus" in client) {
        await client.focus();
        if ("navigate" in client) await client.navigate(target.href);
        return;
      }
    }
    await self.clients.openWindow(target.href);
  })());
});
