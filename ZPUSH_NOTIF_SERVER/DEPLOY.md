# Deploy — Jembatan Push Notif (Debian)

Server "kurir" untuk notifikasi PR pending KMI-BOD. Path target:
`/srv/www/notif-approval`.

## 1. Siapkan folder & dependency

```bash
mkdir -p /srv/www/notif-approval && cd /srv/www/notif-approval
# salin server.js + package.json ke folder ini
npm install
npm install -g pm2   # bila belum ada
```

## 2. Buat file .env

Salin `.env.example` → `.env`, lalu isi:

```bash
cp .env.example .env
nano .env
```

Isi `.env`:

```
VAPID_PUBLIC_KEY=BBIEvHSjYzluVDkCCuRMUrIF9SrIupRQZzn0qJE_FXtgMByyxeWhp5rhzuLE6vT3RZagmHOX5aokzu6TPomAroE
VAPID_PRIVATE_KEY=<private key dari output "npx web-push generate-vapid-keys">
PUSH_SECRET=a6df29a9d9f981ceb8d76982e1b0860d88b67297fc5ccf265804a2f027953827
PORT=3002
VAPID_CONTACT=mailto:admin@pawindo.com
```

> `PUSH_SECRET` di atas harus **sama persis** dengan `gc_push_secret` di report
> ABAP `ZPUSH_PR_NOTIF`. `.env` JANGAN di-commit / dibagikan.

Amankan izin file:

```bash
chmod 600 .env
```

## 3. Jalankan dengan PM2

```bash
pm2 start server.js --name notif-approval
pm2 save
pm2 startup     # ikuti perintah yang dicetak agar auto-start saat reboot
```

## 4. Cek jalan

```bash
curl http://localhost:3002/health
# -> {"status":"ok"}
```

Cek auth token (harus 401 tanpa header):

```bash
curl -X POST http://localhost:3002/kirim-notif -H "Content-Type: application/json" -d '{}'
# -> {"status":"Unauthorized"}
```

## 5. HTTPS — tidak perlu untuk server ini

Web Push memang hanya jalan lewat HTTPS, tapi syarat itu berlaku untuk
**halaman BSP** yang diakses browser — bukan untuk server ini. `/kirim-notif`
hanya dipanggil report ABAP `ZPUSH_PR_NOTIF` (backend→backend, di dalam LAN),
jadi HTTP internal sudah cukup dan `gc_push_url` menunjuk langsung ke
`http://<ip-debian>:3002/kirim-notif`.

HTTPS untuk BSP-nya sudah selesai lewat reverse proxy terpisah
(`approval-pr.kayumebel.net`) — lihat `REVERSE_PROXY_SAP.md`.

> Jika suatu saat server ini dipindah ke luar LAN SAP, barulah ia butuh
> reverse proxy + TLS sendiri.

## 6. Log & troubleshooting

```bash
pm2 logs notif-approval      # lihat log realtime
pm2 restart notif-approval   # setelah ubah .env / server.js
```

- **401** dari server → `PUSH_SECRET` beda dengan `gc_push_secret` di ABAP.
- **410** dari server → subscription device mati; report ABAP hapus baris
  `rec_type='D'` device tsb (normal, auto-cleanup).
- **500** → cek `pm2 logs`; biasanya VAPID key mismatch atau payload rusak.
