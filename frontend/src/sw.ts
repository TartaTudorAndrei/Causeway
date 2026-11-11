/// <reference lib="webworker" />

declare const self: ServiceWorkerGlobalScope;

// VitePWA injectManifest injects self.__WB_MANIFEST here at build time
// We import from workbox-precaching/workbox-routing which ship with vite-plugin-pwa
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';
import { createHandlerBoundToURL } from 'workbox-precaching';

precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();
registerRoute(new NavigationRoute(createHandlerBoundToURL('index.html')));

self.skipWaiting();

// --- Web Push: receive push and show notification ---
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload: { title?: string; body?: string; url?: string } = {};
  try {
    payload = event.data.json();
  } catch {
    payload = { title: 'Notificare', body: event.data.text() };
  }

  const title = payload.title || 'Notificare';
  const options: NotificationOptions = {
    body: payload.body || '',
    icon: '/icons/pwa-192x192.png',
    badge: '/icons/pwa-192x192.png',
    data: { url: payload.url || '/' },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// --- Notification click: focus or open window ---
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl: string =
    (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if ('focus' in client) {
            client.navigate(targetUrl);
            return client.focus();
          }
        }
        return self.clients.openWindow(targetUrl);
      })
  );
});
