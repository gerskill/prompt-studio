/* Prompt Studio — service worker (hors ligne) */
const CACHE = 'prompt-studio-v5';
const ASSETS = ['./', './index.html', './styles.css', './js/templates.js', './js/core.js', './js/ui.js', './js/views.js', './js/import.js', './js/resync.js', './js/views2.js', './js/phrase.js', './js/app.js', './manifest.webmanifest', './icons/icon.svg', './icons/favicon.svg', './icons/favicon-32.png', './icons/apple-touch-icon.png', './icons/icon-maskable-512.png', './icons/icon-192.png', './icons/icon-512.png'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  // Réseau d'abord (pour recevoir les mises à jour), cache en secours hors ligne
  e.respondWith(fetch(req).then((res) => { const copy = res.clone(); if (res.ok) caches.open(CACHE).then((c) => c.put(req, copy)); return res; })
    .catch(() => caches.match(req, { ignoreSearch: true }).then((r) => r || caches.match('./index.html'))));
});
