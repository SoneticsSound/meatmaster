/* MeatMaster — service worker
   This is the piece that lets the app open and run with no internet.
   It saves ("caches") the app's files on the phone the first time they load,
   then serves them from the phone afterwards.

   IMPORTANT: bump CACHE_VERSION whenever the app files change, so phones
   pick up the new version instead of the old cached one. */

const CACHE_VERSION = 'mm-v0.14.1';

// The "app shell" — the files needed to open the app offline.
const SHELL = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './scanner.js',
  './products.js',
  './session.js',
  './vendor/zbar/index.js',
  './vendor/zbar/zbar.wasm',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
];

// Install: pre-load the shell into the cache.
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

// Activate: delete caches from older versions so we don't pile them up.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// Fetch: serve from cache first (instant + offline). Fall back to network,
// and quietly refresh the cached copy when online.
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          // stash a fresh copy for next time (only same-origin, valid responses)
          if (res && res.status === 200 && res.type === 'basic') {
            const copy = res.clone();
            caches.open(CACHE_VERSION).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => cached); // offline: use whatever we cached
      return cached || network;
    })
  );
});
