// This is a module service worker (registered with { type: 'module' } in
// main.js) specifically so it can import the version constant directly
// instead of duplicating a version string here that's easy to forget to
// bump. The cache name is derived from js/version.js — change the app
// version there, and the old cache is dropped automatically on next load.
import { APP_VERSION } from './js/version.js';

const CACHE_NAME = 'sportix-v' + APP_VERSION;
const APP_SHELL = [
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png',
  './assets/logo_unnamed.png',
  './css/styles.css',
  './js/main.js',
  './js/version.js',
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
    caches.keys().then((keys) => {
      const oldKeys = keys.filter((k) => k !== CACHE_NAME);
      return Promise.all(oldKeys.map((k) => caches.delete(k))).then(() => oldKeys.length > 0);
    }).then((hadOldCache) => {
      // Only notify clients if this activation actually replaced a previous
      // version. On a brand-new install there's no old cache to replace, so
      // reloading the page here would just interrupt the very first render
      // (this was the exact cause of the "content flashes then disappears"
      // bug — the SW's first-ever activation fired the reload mid-animation).
      if (!hadOldCache) return;
      return self.clients.matchAll().then((clients) => {
        clients.forEach((c) => c.postMessage({ type: 'APP_UPDATED', version: APP_VERSION }));
      });
    })
  );
  self.clients.claim();
});

// Allow clients to ask the service worker to check for updates immediately
self.addEventListener('message', (event) => {
  if (!event.data) return;
  if (event.data.type === 'CHECK_FOR_UPDATE') {
    // Trigger the browser to fetch an updated service worker script
    self.registration.update();
  }
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
