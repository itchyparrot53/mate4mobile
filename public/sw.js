'use strict';

// The release installer stamps this value. Private API responses are NEVER cached.
const CACHE = 'tm-mobile-m4m-0.0.1-beta-notices';
const SHELL = ['/', '/styles.css', '/app.js','/money.js', '/charts.js', '/vehicle-catalog.js', '/appearance.js', '/manifest.webmanifest', '/assets/model-3.png', '/assets/inter-latin.woff2', '/brand-mark.svg', '/brand-wordmark.svg', '/favicon.svg', '/apple-touch-icon.png', '/icon-192.png', '/icon-512.png'];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('tm-mobile') && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/') || url.pathname === '/healthz') {
    event.respondWith(fetch(request, {cache:'no-store'}).catch(() => new Response(JSON.stringify({error:'offline'}), {status:503, headers:{'Content-Type':'application/json','Cache-Control':'no-store'}})));
    return;
  }
  // Download only chosen vehicle images. Never put readings or authentication in a cache.
  if (/^\/assets\/vehicles\/[a-z0-9-]+-[A-Z0-9]+\.png$/.test(url.pathname)) {
    event.respondWith(caches.open(CACHE).then(async cache => {
      const hit = await cache.match(request);
      if(hit) return hit;
      const response = await fetch(request);
      if(response.ok && response.headers.get('content-type')?.startsWith('image/')) {
        try { await cache.put(request,response.clone()); } catch { /* still display images when storage is full */ }
      }
      return response;
    }));
    return;
  }
  if (!SHELL.includes(url.pathname)) return;
  // A release uses one internally consistent shell. Activation triggers one reload.
  event.respondWith(caches.open(CACHE).then(cache => cache.match(request).then(hit => hit || fetch(request))));
});
