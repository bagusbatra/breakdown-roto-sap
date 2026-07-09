/* ======================================================================
 * sw.js — Service Worker penerima Web Push untuk ZPR_REL_BSP (KMI-BOD).
 *
 * WAJIB di-host sejajar dengan index.htm:
 *   .../sap/bc/bsp/sap/zpr_rel_bsp/sw.js
 * (bukan di dalam subfolder) agar scope-nya mencakup halaman aplikasi.
 * ==================================================================== */

// Aktif segera tanpa menunggu reload semua tab.
self.addEventListener('install', function (event) {
  self.skipWaiting();
});
self.addEventListener('activate', function (event) {
  event.waitUntil(self.clients.claim());
});

// ----------------------------------------------------------------------
// Terima push dari FCM/APNs. Payload dari server.js:
//   { title, body, url }
// ----------------------------------------------------------------------
self.addEventListener('push', function (event) {
  var data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: 'Notifikasi', body: (event.data && event.data.text()) || '' };
  }

  var title = data.title || 'PR Menunggu Approval';
  var options = {
    body: data.body || '',
    icon: 'icon-192.png',
    badge: 'icon-192.png',
    tag: data.url || 'pr-notif',   // notif dgn url sama saling menimpa, tidak menumpuk
    renotify: true,
    requireInteraction: true,      // tetap tampil sampai user berinteraksi
    data: { url: data.url || 'index.htm' }
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// ----------------------------------------------------------------------
// Klik notif → fokuskan tab app bila sudah terbuka, atau buka tab baru
// ke URL detail PR.
// ----------------------------------------------------------------------
self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  var target = (event.notification.data && event.notification.data.url) || 'index.htm';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(function (clientList) {
        for (var i = 0; i < clientList.length; i++) {
          var c = clientList[i];
          // Bila ada tab aplikasi ini yang terbuka, fokuskan & arahkan.
          if (c.url.indexOf('zpr_rel_bsp') !== -1 && 'focus' in c) {
            c.navigate(target);
            return c.focus();
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(target);
        }
      })
  );
});
