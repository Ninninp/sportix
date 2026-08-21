const CACHE_NAME = 'sportix-v4';
const APP_SHELL = [
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png',
  './assets/logo.png',
  './css/styles.css',
  './js/main.js',
  './js/state.js',
  './js/utils.js',
  './js/calculs.js',
  './js/nav.js',
  './js/accueil.js',
  './js/seances.js',
  './js/exercices.js',
  './js/historique.js',
  './js/poids.js',
  './js/progression.js',
  './js/calendrier.js',
  './js/timer.js',
  './js/data-io.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  // Network-first for the app HTML itself (index.html / navigations),
  // so updates are picked up immediately instead of serving a stale cached page.
  const isHTML = req.mode === 'navigate' || req.destination === 'document' || req.url.endsWith('index.html');
  if (isHTML) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const resClone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
          return res;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  // Cache-first for static assets (icons, manifest, fonts)
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req)
        .then((res) => {
          const resClone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
          return res;
        })
        .catch(() => cached);
    })
  );
});
