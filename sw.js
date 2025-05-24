const CACHE_NAME = "DJLarkiboyEvents_Cache_v2";
const urlsToCache = [
  "/img/favicon.ico",
  "/manifest.json",
  "/css/main.css",
  "/Ads.txt",
  "/img/hero_image.jpg",
  "/img/default_user.png",
  "/img/cloudinary.jpg",
  "/js/com.js",
  "/js/404.js",
  "/img/uptime-robot-logo.svg",
  "/html/offline.html",
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache)),
  );
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    fetch(event.request).catch(() =>
      caches
        .match(event.request)
        .then((response) => response || caches.match("/html/offline.html")),
    ),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name)),
      );
    }),
  );
});
