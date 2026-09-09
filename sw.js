/* Service worker: cache-first per il guscio dell'app, così funziona offline. */
const VERSIONE = 'gomme-v3';
const GUSCIO = [
  './',
  './index.html',
  './manifest.json',
  './icon.svg',
  './css/style.css',
  './js/app.js',
  './js/config.js',
  './js/rules.js',
  './js/store.js',
  './js/format.js',
  './js/ui.js',
  './js/views/sessioni.js',
  './js/views/sessione.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(VERSIONE).then((c) => c.addAll(GUSCIO)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((chiavi) => Promise.all(chiavi.filter((k) => k !== VERSIONE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(
    caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      if (res.ok && res.type === 'basic') {
        const copia = res.clone();
        caches.open(VERSIONE).then((c) => c.put(req, copia));
      }
      return res;
    }).catch(() => (req.mode === 'navigate' ? caches.match('./index.html') : Response.error())))
  );
});
