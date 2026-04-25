// Deprecated. OneSignal integration was removed in favour of native Web
// Push (see /sw.js). This file is kept as a no-op so stale registrations
// continue to activate without errors until the browser garbage collects
// them.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
