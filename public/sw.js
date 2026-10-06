/* מטמון לא-מקוון – המשחק עובד גם בלי אינטרנט */
const CACHE = 'wm-v1';
const FILES = [
  './', 'index.html', 'css/style.css', 'manifest.webmanifest',
  'vendor/matter.min.js', 'js/parts.js', 'js/sim.js', 'js/levels.js', 'js/game.js',
  'icons/icon-192.png', 'icons/icon-512.png',
];
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
// קודם רשת (כדי לקבל עדכונים), ואם אין – מהמטמון
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request)
      .then((res) => { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); return res; })
      .catch(() => caches.match(e.request, { ignoreSearch: true }))
  );
});
