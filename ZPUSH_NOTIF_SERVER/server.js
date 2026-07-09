// ======================================================================
// server.js — Jembatan Web Push (Debian "kurir")
// ZPR_REL_BSP push notification untuk user KMI-BOD.
//
// Menerima POST dari report SAP ZPUSH_PR_NOTIF, lalu meneruskan sebagai
// Web Push terenkripsi ke FCM/APNs.
//
// Jalankan: pm2 start server.js --name notif-approval
// ======================================================================
require('dotenv').config();
const express = require('express');
const webpush = require('web-push');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json({ limit: '64kb' }));
app.use(express.urlencoded({ extended: true }));

// ----------------------------------------------------------------------
// KONFIGURASI — semua dari .env, JANGAN hardcode key di sini.
// ----------------------------------------------------------------------
const publicVapidKey  = process.env.VAPID_PUBLIC_KEY;
const privateVapidKey = process.env.VAPID_PRIVATE_KEY;
const PUSH_SECRET     = process.env.PUSH_SECRET;      // harus sama dgn gc_push_secret di ABAP
const PORT            = process.env.PORT || 3000;
const CONTACT         = process.env.VAPID_CONTACT || 'mailto:admin@pawindo.com';

if (!publicVapidKey || !privateVapidKey || !PUSH_SECRET) {
  console.error('FATAL: VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY / PUSH_SECRET belum diset di .env');
  process.exit(1);
}

webpush.setVapidDetails(CONTACT, publicVapidKey, privateVapidKey);

// ----------------------------------------------------------------------
// MIDDLEWARE: cek token rahasia untuk endpoint /kirim-notif.
// Tanpa ini, siapapun yang tahu URL bisa memicu notifikasi palsu.
// ----------------------------------------------------------------------
function checkPushSecret(req, res, next) {
  const token = req.headers['x-push-secret'];
  if (token !== PUSH_SECRET) {
    return res.status(401).json({ status: 'Unauthorized' });
  }
  next();
}

// Health check (buat cek dari SAP / monitoring; tidak butuh secret).
app.get('/health', (req, res) => res.status(200).json({ status: 'ok' }));

// ----------------------------------------------------------------------
// KIRIM 1 NOTIF ke 1 subscription (1 device).
// Body: { endpoint, p256dh, auth, title, body, url }
// ----------------------------------------------------------------------
app.post('/kirim-notif', checkPushSecret, (req, res) => {
  const { endpoint, p256dh, auth, title, body, url } = req.body;

  if (!endpoint || !p256dh || !auth) {
    return res.status(400).json({ status: 'Gagal', message: 'Subscription tidak lengkap' });
  }

  const pushSubscription = { endpoint, keys: { p256dh, auth } };
  const payload = JSON.stringify({
    title: title || 'Notifikasi',
    body:  body  || '',
    url:   url   || '/'
  });

  webpush.sendNotification(pushSubscription, payload)
    .then(() => res.status(200).json({ status: 'Berhasil' }))
    .catch(err => {
      console.error('Gagal kirim push:', err.statusCode, err.message);
      // 404/410 = subscription sudah tidak valid (device uninstall / expired).
      // ABAP akan menghapus baris device (rec_type='D') saat menerima 410.
      const gone = (err.statusCode === 410 || err.statusCode === 404);
      res.status(gone ? 410 : 500)
         .json({ status: 'Gagal', message: err.message });
    });
});

app.listen(PORT, () =>
  console.log('Jembatan Push Notif aktif di port ' + PORT + ' (auth token ON).'));
