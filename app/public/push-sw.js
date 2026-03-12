// Push notification handler — imported by the main service worker
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let data;
  try {
    data = event.data.json();
  } catch {
    data = { title: 'Assisy', body: event.data.text() };
  }

  const { title, body, tag } = data;

  event.waitUntil(
    self.registration.showNotification(title || 'Assisy', {
      body: body || '',
      icon: '/icon-192.svg',
      badge: '/icon-192.svg',
      tag: tag || 'assisy-push',
      vibrate: [200, 100, 200],
      data: { url: '/' },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});
