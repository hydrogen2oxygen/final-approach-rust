self.addEventListener('push', event => {
  let notification = {};

  try {
    notification = event.data ? event.data.json() : {};
  } catch {
    notification = {};
  }

  const title = notification.title || 'Final Approach';
  const options = {
    body: notification.body || 'Your territory overview has been updated.',
    icon: 'icon-192.png',
    badge: 'icon-192.png',
    tag: notification.eventId || 'territory-overview-update',
    renotify: false,
    data: {
      url: notification.url || './'
    }
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const targetUrl = new URL(event.notification.data?.url || './', self.location.href).href;

  event.waitUntil(clients.matchAll({type: 'window', includeUncontrolled: true}).then(windowClients => {
    const matchingClient = windowClients.find(client => client.url === targetUrl);

    if (matchingClient) {
      return matchingClient.focus();
    }

    return clients.openWindow(targetUrl);
  }));
});
