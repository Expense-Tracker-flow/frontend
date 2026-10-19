// Service Worker for FIN-XL: installable PWA with phone notifications. No offline caching.
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Pass through all requests directly to the network
  event.respondWith(fetch(event.request));
});

// Show an alert pushed from the server, even when the app is closed
self.addEventListener('push', (event) => {
  let data = { title: 'FIN-XL', body: '', url: '/' };
  try {
    data = { ...data, ...event.data.json() };
  } catch (e) {
    // Plain text or empty payload: keep the defaults
  }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      data: { url: data.url || '/' },
    })
  );
});

// Tapping an alert opens the app, or brings the open window to the front
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ('focus' in client) return client.focus();
      }
      return self.clients.openWindow(url);
    })
  );
});
