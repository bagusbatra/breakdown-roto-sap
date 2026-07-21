/* sw.js — offline-shell Service Worker ZPO_REL_BSP (tanpa push).
 * Host sejajar index.htm: .../sap/bc/bsp/sap/zpo_rel_bsp/sw.js */
var CACHE_NAME = 'zpo-shell-v1';
var SHELL_ASSETS = [
  'style.css', 'app-core.js', 'app-ui.js', 'app-list.js',
  'app-history.js', 'app-detail.js', 'app-action.js',
  'DMSans.woff2', 'DMMono.woff2', 'icon-192.png', 'icon-512.png'
];

self.addEventListener('install', function (event) {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(SHELL_ASSETS);
    })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        if (k !== CACHE_NAME) { return caches.delete(k); }
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (event) {
  var req = event.request;
  if (req.method !== 'GET') { return; }
  var url = new URL(req.url);

  // main.htm (JSON API & data) — SELALU network, jangan pernah di-cache.
  if (url.pathname.indexOf('main.htm') !== -1) {
    return; // biarkan browser fetch normal ke network
  }

  // Navigasi (index.htm) — network dulu, fallback ke cache shell bila offline.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(function () { return caches.match('index.htm') || caches.match(req); })
    );
    return;
  }

  // Aset statis — cache-first.
  event.respondWith(
    caches.match(req).then(function (hit) { return hit || fetch(req); })
  );
});
