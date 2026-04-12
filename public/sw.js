const CACHE_NAME = 'gymkhata-pro-v3'; // Incremented to v3 to bust the old faulty cache
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Opened cache v2');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  // Force the waiting service worker to become the active service worker
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  // Ensure that the service worker takes control of the page immediately
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Prevent TypeError: Failed to fetch for only-if-cached requests
  if (event.request.cache === 'only-if-cached' && event.request.mode !== 'same-origin') {
    return;
  }

  // Ignore non-HTTP requests (like chrome-extension://)
  if (!event.request.url.startsWith('http')) {
    return;
  }

  // Use Network First for navigation requests (HTML)
  // This ensures users always get the latest version of the app from the server
  if (event.request.mode === 'navigate' || event.request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          return caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, networkResponse.clone());
            return networkResponse;
          });
        })
        .catch(() => {
          return caches.match('/index.html');
        })
    );
    return;
  }

  // For API requests, bypass cache
  if (event.request.url.includes('/supabase.co') || event.request.url.includes('/rest/v1/')) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Cache First strategy for static assets (JS, CSS, Images)
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      
      return fetch(event.request)
        .then((networkResponse) => {
          // Check if we received a valid response before caching
          if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic' || event.request.method !== 'GET') {
            return networkResponse;
          }

          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });

          return networkResponse;
        })
        .catch((error) => {
          console.error('Fetch error in Service Worker:', error);
          // Return a 408 response to avoid "Failed to convert value to 'Response'" TypeError
          return new Response(JSON.stringify({ error: 'Network error occurred' }), {
            status: 408,
            headers: { 'Content-Type': 'application/json' },
          });
        });
    })
  );
});
