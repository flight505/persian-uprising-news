// Custom Service Worker for Push Notifications
// This file extends the auto-generated service worker from next-pwa

// Listen for push events
self.addEventListener('push', function(event) {
  console.log('[Service Worker] Push received:', event);

  let notification = {
    title: 'Persian Uprising News',
    body: 'New updates available',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-72.png',
    vibrate: [200, 100, 200],
    data: {
      url: '/',
      dateOfArrival: Date.now(),
    },
    actions: [
      { action: 'view', title: 'View Articles' },
      { action: 'close', title: 'Close' },
    ],
  };

  // Parse push data if available
  if (event.data) {
    try {
      const data = event.data.json();
      notification.title = data.title || notification.title;
      notification.body = data.body || notification.body;
      notification.data.url = data.url || notification.data.url;
      notification.tag = data.tag || 'news-update';
    } catch (e) {
      console.error('[Service Worker] Error parsing push data:', e);
    }
  }

  event.waitUntil(
    self.registration.showNotification(notification.title, notification)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', function(event) {
  console.log('[Service Worker] Notification click received:', event);

  event.notification.close();

  if (event.action === 'close') {
    return;
  }

  // Navigate to the URL
  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      // Check if there's already a window open
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }

      // No window open, open a new one
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// Background sync for offline reports (future enhancement)
self.addEventListener('sync', function(event) {
  console.log('[Service Worker] Background sync:', event);

  if (event.tag === 'sync-reports') {
    event.waitUntil(
      // Sync offline reports when connection is restored
      fetch('/api/incidents/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }).catch(err => console.error('[Service Worker] Sync failed:', err))
    );
  }
});

console.log('[Service Worker] Custom service worker loaded');
