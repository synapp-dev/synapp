const CACHE_NAME = "youthjustice-static-v2";
const ASSETS_TO_CACHE = ["/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    }),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => cacheName !== CACHE_NAME)
          .map((cacheName) => caches.delete(cacheName)),
      );
    }),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Never intercept anything but same-origin GETs.
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Let the browser handle navigations itself. Intercepting them and returning
  // a redirected response (the middleware redirects "/" -> "/home" | "/auth")
  // throws "a redirected response was used for a request whose redirect mode is
  // not follow", and caching HTML would serve stale/broken pages.
  if (request.mode === "navigate") return;

  // Only cache immutable build output; skip API routes, auth callbacks, etc.
  const isStaticAsset =
    url.pathname.startsWith("/_next/static/") ||
    /\.(?:js|css|woff2?|png|jpg|jpeg|svg|gif|webp|ico|json|webmanifest)$/.test(
      url.pathname,
    );
  if (!isStaticAsset) return;

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse;

      return fetch(request).then((networkResponse) => {
        if (networkResponse.ok && networkResponse.type === "basic") {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });
        }
        return networkResponse;
      });
    }),
  );
});
