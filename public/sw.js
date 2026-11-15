// Rooted's service worker: makes the installed app open instantly and work offline.
//  - The page itself: network first (so new versions show up), cached copy when offline.
//  - Built files (/assets, /icons) and the fonts: cache first; their names change per build.
//  - Supabase (notes, accounts) is never cached: it always goes straight to the network.

const CACHE = 'rooted-v1';
const SHELL = ['/', '/manifest.webmanifest', '/icons/icon-192.png', '/icons/favicon-32.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys()) if (key !== CACHE) await caches.delete(key);
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  if (url.origin !== self.location.origin) {
    if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') event.respondWith(cacheFirst(req));
    return; // everything else (Supabase) is left alone
  }
  if (req.mode === 'navigate') {
    event.respondWith(page(req));
    return;
  }
  if (url.pathname.startsWith('/assets/') || url.pathname.startsWith('/icons/')) event.respondWith(cacheFirst(req));
});

async function cacheFirst(req) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok || res.type === 'opaque') cache.put(req, res.clone());
  return res;
}

/** Fresh page when the network answers within a few seconds, else the cached one. */
async function page(req) {
  const cache = await caches.open(CACHE);
  try {
    const res = await Promise.race([
      fetch(req),
      new Promise((_, reject) => setTimeout(() => reject(new Error('slow')), 4000)),
    ]);
    if (res.ok) {
      await cache.put('/', res.clone());
      pruneOldAssets(cache, await res.clone().text());
    }
    return res;
  } catch {
    return (await cache.match('/')) || Response.error();
  }
}

/** Drop built files that the current page no longer uses (left over from older versions). */
async function pruneOldAssets(cache, html) {
  const live = new Set(html.match(/\/assets\/[^"'\s)]+/g) || []);
  if (!live.size) return;
  for (const req of await cache.keys()) {
    const path = new URL(req.url).pathname;
    if (path.startsWith('/assets/') && !live.has(path)) await cache.delete(req);
  }
}
