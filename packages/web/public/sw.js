const CACHE_NAME = 'raid-cache-v3';
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/favicon.ico',
  '/Raed.png'
];

// ─── INSTALL: Pre-cache critical assets ───
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('SW: Pre-caching static assets');
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// ─── ACTIVATE: Clean old caches ───
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// ─── FETCH: Intelligent caching strategies ───
self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;
  
  const url = new URL(event.request.url);
  
  // Skip API requests (handled by api.js interceptors)
  if (url.pathname.includes('/v1/') || url.hostname.includes('supabase')) return;

  // STRATEGY 1: Cache-First for static assets (_next/static, fonts, images)
  if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(event.request));
    return;
  }

  // STRATEGY 2: Stale-While-Revalidate for navigation/pages
  event.respondWith(staleWhileRevalidate(event.request));
});

// ─── Helper: Is this a static/immutable asset? ───
function isStaticAsset(url) {
  return (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname.startsWith('/fonts/') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.jpg') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.woff2') ||
    url.pathname.endsWith('.woff') ||
    url.pathname.endsWith('.ttf') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.js') ||
    url.hostname.includes('fonts.googleapis.com') ||
    url.hostname.includes('fonts.gstatic.com') ||
    url.hostname.includes('cdn.jsdelivr.net')
  );
}

// ─── Cache-First Strategy ───
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const networkResponse = await fetch(request);
    if (networkResponse && networkResponse.status === 200) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (e) {
    // If both cache and network fail, return offline fallback for navigation
    if (request.mode === 'navigate') {
      return caches.match('/');
    }
    return new Response('', { status: 408, statusText: 'Offline' });
  }
}

// ─── Stale-While-Revalidate Strategy ───
async function staleWhileRevalidate(request) {
  const cached = await caches.match(request);
  
  const fetchPromise = fetch(request).then((networkResponse) => {
    if (networkResponse && networkResponse.status === 200) {
      const responseToCache = networkResponse.clone();
      caches.open(CACHE_NAME).then((cache) => {
        cache.put(request, responseToCache);
      });
    }
    return networkResponse;
  }).catch(() => null);

  // Return cached immediately if available, update cache in background
  if (cached) {
    fetchPromise; // Fire and forget the background update
    return cached;
  }

  // No cache — wait for network
  const networkResponse = await fetchPromise;
  if (networkResponse) return networkResponse;

  // Fallback for navigation requests
  if (request.mode === 'navigate') {
    return caches.match('/');
  }
  
  return new Response('', { status: 408, statusText: 'Offline' });
}
