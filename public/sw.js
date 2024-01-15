self.addEventListener('push', function (event) {
  const title = 'Progodoro';
  const options = {
    body: event.data.text(),
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  // Optionally, do something when the notification is clicked, like open a URL
});