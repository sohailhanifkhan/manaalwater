// Manaal Water — minimal service worker
// Just enough to make the site installable (PWA requirement) and cache
// the core visual shell for faster repeat visits. Live data (prices,
// orders) always goes to the network, never the cache.

const CACHE_NAME = 'manaal-water-shell-v1';
const SHELL_FILES = [
  'index.html',
  'assets/style.css',
  'assets/logo.png',
  'assets/icon-192.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_FILES)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter(n => n !== CACHE_NAME).map(n => caches.delete(n)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Only handle simple same-origin GET requests for the shell files.
  // Everything else (Sheets CSV, Firebase, WhatsApp, etc.) always goes to the network.
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});
