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
      // Payment reminders carry an "Add expense" button; browsers that do not show buttons ignore this list
      actions: Array.isArray(data.actions) ? data.actions : [],
      data: { url: data.url || '/', actionUrl: data.actionUrl || data.url || '/' },
    })
  );
});

// Tapping an alert opens the app, or brings the open window to the front.
// The "Add expense" button opens the reminder's link, which logs the payment in the app.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  const isAddExpense = event.action === 'add-expense';
  const url = (isAddExpense ? data.actionUrl : data.url) || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ('focus' in client) {
          // An open window is moved to the reminder link only for the button, so a plain tap does not reload it
          if (isAddExpense && 'navigate' in client) {
            return client.navigate(url).then((c) => (c || client).focus());
          }
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});
