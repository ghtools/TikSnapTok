// Minimal service worker for TikSnapTok.
// This exists primarily to satisfy browser installability criteria for the
// "Install App" (Add to Home Screen) prompt. It does a basic network-first
// pass-through and does not cache anything aggressively, so the site always
// shows fresh content and downloads keep working normally.

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
