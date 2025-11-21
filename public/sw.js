// Service worker for push notifications
self.addEventListener('push', function(event) {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.notification.body,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: data.data?.type || 'default',
      data: data.data,
      actions: [
        {
          action: 'view',
          title: 'Ver mensaje'
        }
      ]
    };

    event.waitUntil(
      self.registration.showNotification(data.notification.title, options)
    );
  }
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();

  if (event.action === 'view' || !event.action) {
    const urlToOpen = event.notification.data?.type === 'chat_message' 
      ? `${self.location.origin}/dashboard?tab=chat`
      : self.location.origin;

    event.waitUntil(
      clients.matchAll().then(function(clientList) {
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
    );
  }
});