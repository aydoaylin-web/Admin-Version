const CACHE_NAME = 'deepfake-defender-v9-fixes-20260720';

const APP_SHELL = [
  './',
  './index.html',
  './manifest.webmanifest'
];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(APP_SHELL);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();

    await Promise.all(
      keys
        .filter(key => key !== CACHE_NAME)
        .map(key => caches.delete(key))
    );

    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  if (url.origin !== self.location.origin) return;

  // Audio-Dateien niemals cachen (wichtig für iOS/Android)
  const isAudio =
    event.request.destination === 'audio' ||
    url.pathname.endsWith('.mp3');

  // Mobile Browser verwenden häufig Range Requests für Audio
  const isRangeRequest = event.request.headers.has('range');

  if (isAudio || isRangeRequest) {
    event.respondWith(fetch(event.request));
    return;
  }

  // JSON-Dateien immer aktuell aus dem Netzwerk laden
  if (
    url.pathname.includes('/content/') ||
    url.pathname.endsWith('.json')
  ) {
    event.respondWith((async () => {
      try {
        const response = await fetch(event.request, {
          cache: 'no-store'
        });

        if (response.ok && response.status === 200) {
          const cache = await caches.open(CACHE_NAME);
          await cache.put(event.request, response.clone());
        }

        return response;
      } catch {
        return (
          await caches.match(event.request)
        ) || new Response('Content unavailable.', {
          status: 503
        });
      }
    })());

    return;
  }

  // HTML-Seiten
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() =>
        caches.match('./index.html')
      )
    );

    return;
  }

  // Alle übrigen Dateien (JS, CSS, Bilder usw.)
  event.respondWith((async () => {
    try {
      const response = await fetch(event.request);

      // Nur vollständige Antworten cachen (kein 206 Partial Content)
      if (response.ok && response.status === 200) {
        const cache = await caches.open(CACHE_NAME);
        await cache.put(event.request, response.clone());
      }

      return response;
    } catch {
      return (
        await caches.match(event.request)
      ) || new Response('Offline resource unavailable.', {
        status: 503
      });
    }
  })());
});
