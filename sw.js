// Service worker: guarda la app en el dispositivo para que abra rápido y funcione sin conexión.
// No guarda nada de Google (hoja del grupo, fichas, audios): eso siempre va directo a Google.
const VERSION = 'portland-lab-v1.0.0';
const ARCHIVOS = [
  './', './index.html', './styles.css', './manifest.webmanifest',
  './js/app.js', './js/config.js', './js/comun.js', './js/google.js', './js/grupo.js', './js/hexaflex.js', './js/hexaflexBase.js',
  './js/ilustraciones.js', './js/portland.js', './js/procesos.js', './js/store.js', './js/ui.js',
  './vendor/fuentes/plus-jakarta-sans.woff', './icons/icon.svg', './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(ARCHIVOS.map((u) => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k.startsWith('portland-lab') && k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  // Primero la red (para recibir actualizaciones); si no hay conexión, la copia guardada
  e.respondWith(
    fetch(e.request, { cache: 'no-cache' }).then((r) => {
      const copia = r.clone();
      caches.open(VERSION).then((c) => c.put(e.request, copia));
      return r;
    }).catch(() => caches.match(e.request, { ignoreSearch: true }).then((r) => r || caches.match('./index.html')))
  );
});
