// Shinoon service worker — handles Web Push events and notification clicks.
// Registered from the client at /sw.js with scope "/" so it controls the
// whole origin.

self.addEventListener('install', () => {
  // Take over as soon as the new SW finishes installing — no "waiting" phase.
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// ----------------------------------------------------------------------------
// Incoming push
// ----------------------------------------------------------------------------

self.addEventListener('push', (event) => {
  /** @type {{ title?: string, body?: string, url?: string, tag?: string }} */
  let payload = {};
  if (event.data) {
    try {
      payload = event.data.json();
    } catch {
      payload = { title: 'שינוע חדש', body: event.data.text() };
    }
  }

  const title = payload.title || 'שינוע חדש התקבל';
  const options = {
    body:   payload.body || '',
    icon:   '/icon-192.png',
    badge:  '/icon-192.png',
    tag:    payload.tag || 'shinoon-mission',
    // Using `renotify: true` forces the phone to re-alert (vibrate + sound)
    // even when an existing notification with the same tag is showing.
    renotify: true,
    requireInteraction: false,
    vibrate: [200, 100, 200, 100, 200],
    data: { url: payload.url || '/driver' },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// ----------------------------------------------------------------------------
// User tapped the notification — focus an existing tab or open /driver.
// ----------------------------------------------------------------------------

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/driver';

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          const url = new URL(client.url);
          if (url.pathname.startsWith('/driver') && 'focus' in client) {
            return client.focus();
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
        return undefined;
      })
  );
});

// ----------------------------------------------------------------------------
// Browser invalidated the subscription — try to re-subscribe silently.
// The client will re-POST to /api/subscribe on next page load as a backup.
// ----------------------------------------------------------------------------

self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil(
    (async () => {
      try {
        // The browser gives us `event.newSubscription` in some implementations;
        // otherwise we fetch the VAPID key from the page and re-subscribe.
        if (event.newSubscription) {
          await fetch('/api/subscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(event.newSubscription.toJSON()),
          });
        }
      } catch {
        // No-op — driver page will resubscribe on next visit.
      }
    })()
  );
});
