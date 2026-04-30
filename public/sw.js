const CACHE_NAME = 'gymkhata-pro-v4'; // Incremented to bust the old faulty cache
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

// ═══════════════════════════════════════════════════════════════════
// PUSH NOTIFICATION LAYER — Added for automated member reminders
// Existing fetch/cache logic above is NOT modified.
// ═══════════════════════════════════════════════════════════════════

/**
 * push event — fires when server sends a Web Push message.
 * Displays notification with context-appropriate action buttons.
 */
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: 'Gym Reminder', body: event.data.text(), data: {} };
  }

  const { title = 'Vijay Fitness', body = '', data = {} } = payload;
  const type = data.type || 'at_risk';

  // Build action buttons based on notification type
  const actions = type === 'at_risk'
    ? [
        { action: 'coming',  title: "I'm coming 💪" },
        { action: 'later',   title: 'Remind me later ⏰' },
      ]
    : [
        { action: 'restart', title: 'Start Today 💪' },
        { action: 'call',    title: 'Call Gym 📞' },
      ];

  const notificationOptions = {
    body,
    icon:    '/icons/icon-192x192.png',
    badge:   '/icons/icon-192x192.png',
    actions,
    data,
    tag:     `gym-reminder-${data.member_id || 'unknown'}`,
    renotify: false,
    requireInteraction: false,
  };

  event.waitUntil(
    self.registration.showNotification(title, notificationOptions)
  );
});

/**
 * notificationclick — fires when member taps notification or an action button.
 * Handles:
 *  - "coming"  → store intent, open app
 *  - "later"   → store intent (Dashboard will re-evaluate next visit)
 *  - "restart" → store intent, open app
 *  - "call"    → open dialer with gym phone
 */
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const action    = event.action;          // 'coming' | 'later' | 'restart' | 'call' | ''
  const data      = event.notification.data || {};
  const memberId  = data.member_id  || '';
  const notifType = data.type       || 'at_risk';
  const gymPhone  = data.gym_phone  || '';

  // ── Map action → status for DB update ──────────────────────────
  const statusMap = {
    coming:  'coming',
    later:   'later',
    restart: 'restart',
    call:    'called',
    '':      'coming',   // tapped notification body (not a button)
  };
  const newStatus = statusMap[action] || 'coming';

  // ── Persist action via broadcast to open app tabs ───────────────
  // The app listens for 'pn-action' messages and calls handleNotificationAction()
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      // Broadcast to any open app tab
      for (const client of clients) {
        client.postMessage({
          type:      'pn-action',
          memberId,
          notifType,
          status:    newStatus,
        });
      }

      // ── "Call Gym" action — open phone dialer ────────────────────
      if (action === 'call' && gymPhone) {
        return self.clients.openWindow(`tel:${gymPhone}`);
      }

      // ── "Remind me later" — no tab needed (handled by next session) ──
      if (action === 'later') {
        return Promise.resolve();
      }

      // ── Other actions — open / focus the app ─────────────────────
      const appClient = clients.find((c) => c.url.includes(self.location.origin));
      if (appClient) {
        return appClient.focus();
      }
      return self.clients.openWindow('/');
    })
  );
});
