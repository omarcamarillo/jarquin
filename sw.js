const VERSION = "facturacion-notas-v2";
const SHELL = [
  "./", "./index.html", "./login.html", "./dashboard.html", "./manifest.json",
  "./assets/css/global.css", "./assets/css/login.css", "./assets/css/dashboard.css",
  "./assets/js/firebase.js", "./assets/js/auth.js", "./assets/js/dashboard.js",
  "./assets/js/pwa.js", "./assets/js/animations.js",
  "./assets/icons/icon.svg", "./assets/icons/icon-192.png", "./assets/icons/icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(VERSION).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== VERSION).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);

  if (url.origin === self.location.origin) {
    event.respondWith((async () => {
      const cached = await caches.match(request);
      try {
        const response = await fetch(request);
        if (response && response.ok) {
          const cache = await caches.open(VERSION);
          cache.put(request, response.clone());
        }
        return response;
      } catch (error) {
        if (cached) return cached;
        if (request.mode === "navigate") {
          return (await caches.match("./index.html")) || Response.error();
        }
        return Response.error();
      }
    })());
    return;
  }

  // Solo se cachean librerías externas solicitadas por la aplicación.
  if (["www.gstatic.com", "cdn.tailwindcss.com", "unpkg.com", "cdnjs.cloudflare.com", "fonts.googleapis.com", "fonts.gstatic.com"].includes(url.hostname)) {
    event.respondWith((async () => {
      const cache = await caches.open(VERSION);
      const cached = await cache.match(request);
      try {
        const response = await fetch(request);
        if (response && (response.ok || response.type === "opaque")) await cache.put(request, response.clone());
        return response;
      } catch (error) {
        if (cached) return cached;
        throw error;
      }
    })());
  }
});
