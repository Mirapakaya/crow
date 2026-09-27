/// <reference lib="webworker" />
// Crow Service Worker — manual fallback for PWA offline support
// This file is served from public/ so Vite copies it as-is to dist/.

const CACHE_VERSION = 'crow-v1';
const SHELL_CACHE = `${CACHE_VERSION}-shell`;
const ASSET_CACHE = `${CACHE_VERSION}-assets`;

// App shell resources to pre-cache on install
const APP_SHELL = [
  '/',
  '/index.html',
  '/icons/favicon.svg',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/manifest.webmanifest',
];

// Install: pre-cache the app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => {
      return cache.addAll(APP_SHELL);
    })
  );
  // Activate immediately instead of waiting for old SW to finish
  self.skipWaiting();
});

// Activate: clean up old caches
self.addEventListener('activate', (event) => {
  const currentCaches = [SHELL_CACHE, ASSET_CACHE];
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => !currentCaches.includes(key))
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch strategy:
// - Navigation (HTML): network-first, fall back to cached index.html
// - Static assets (js/css/svg/woff2/png): cache-first
// - WebSocket / relay connections: network only (never cache)
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Never cache WebSocket connections (relay signaling)
  if (request.url.startsWith('ws') || request.url.startsWith('wss')) {
    return;
  }

  // Never cache API / relay requests
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/relay')) {
    return;
  }

  // Navigation requests: network-first
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache a clone for offline use
          const clone = response.clone();
          caches.open(SHELL_CACHE).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match('/index.html'))
    );
    return;
  }

  // Static assets: cache-first
  if (isStaticAsset(request)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          // Only cache successful responses
          if (response.ok) {
            const clone = response.clone();
            caches.open(ASSET_CACHE).then((cache) => cache.put(request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // Everything else: network, no caching
  // (fetch events not handled simply pass through)
});

function isStaticAsset(request) {
  const url = new URL(request.url);
  // Match Vite-bundled assets and public assets
  return (
    url.pathname.startsWith('/assets/') ||
    url.pathname.startsWith('/icons/') ||
    /\.(js|css|html|svg|woff2?|ttf|eot|png|jpg|webp|ico|webmanifest)$/i.test(
      url.pathname
    )
  );
}
