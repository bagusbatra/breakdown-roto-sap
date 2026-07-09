# Reverse Proxy HTTPS untuk SAP BSP (ZPR_REL_BSP)

Tujuan: agar `index.htm` diakses via **HTTPS dengan sertifikat tepercaya**,
supaya Service Worker & Web Push aktif (termasuk di iPhone).

```
[HP / Laptop]                 [Reverse Proxy]              [SAP ICM]
 https://pr.kmi.com  ──TLS──▶  Nginx / Caddy  ──HTTP──▶  http://kmiprd.kmi.com:8001
   (Let's Encrypt)             (terminasi SSL)             (BSP zpr_rel_bsp)
```

> Hanya BSP yang perlu di-proxy. Server push Debian (`/kirim-notif`) dipanggil
> report ABAP (backend→backend), boleh tetap HTTP internal.

## 0. Prasyarat (akses dari internet / data seluler)

> ⚠️ **KEAMANAN:** langkah ini **mengekspos SAP PRD ke internet.** Wajib
> di-review Basis/IT security. Mitigasi minimum sudah diterapkan di config
> bawah: proxy **hanya** meneruskan path aplikasi `zpr_rel_bsp` + resource yang
> diperlukan, selain itu ditolak 404. Pertimbangkan juga: rate-limiting, WAF,
> dan pastikan tidak ada BSP/ICF service sensitif lain yang ikut terekspos.

1. **Domain publik** yang KMI miliki, mis. `pr.kmi.com` → **A record ke IP
   publik** edge/proxy. (Bukan hostname internal `kmiprd.kmi.com`.)
2. **Port 80 & 443** dari internet di-*forward* ke host proxy (Let's Encrypt
   HTTP-01 butuh 80; layanan di 443).
3. Host proxy harus bisa menjangkau **`kmiprd.kmi.com:8001`** ke dalam (LAN).
   Jadi proxy duduk di DMZ / punya kaki ke internet **dan** ke jaringan internal.
4. Server Debian yang sudah menjalankan `notif-approval` **boleh** dipakai
   sebagai proxy ini **hanya jika** ia memang internet-facing & bisa reach SAP.

---

## 1. Opsi A — Caddy (rekomendasi, auto-HTTPS)

Install:
```bash
# Debian/Ubuntu
apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
apt update && apt install caddy
```

`/etc/caddy/Caddyfile` (hardened — hanya izinkan path aplikasi):
```caddyfile
pr.kmi.com {
    # Hanya path aplikasi zpr_rel_bsp + logoff yang boleh diteruskan.
    # Cocokkan dengan / tanpa segmen sesi sap(bD1lbiZjPTMwMA==).
    @app {
        path_regexp ^/sap(\([^)]*\))?/bc/bsp/sap/zpr_rel_bsp/.*
    }
    @logoff {
        path /sap/public/bc/icf/logoff*
    }

    handle @app {
        reverse_proxy http://kmiprd.kmi.com:8001 {
            # Pertahankan Host asli (pr.kmi.com) supaya cookie sesi SAP
            # ter-set untuk domain publik & URL self-reference benar.
            header_up Host {host}
            header_up X-Forwarded-Proto https
            # Redirect absolut SAP -> balik ke domain HTTPS.
            header_down Location http://kmiprd.kmi.com:8001 https://pr.kmi.com
        }
    }
    handle @logoff {
        reverse_proxy http://kmiprd.kmi.com:8001 {
            header_up Host {host}
        }
    }
    # Selain path di atas: tolak (jangan buka seluruh /sap/ ke internet).
    handle {
        respond "Not found" 404
    }
}
```
```bash
systemctl reload caddy
```
Caddy otomatis mengurus sertifikat Let's Encrypt (terbit + auto-renew), asalkan
`pr.kmi.com` resolve ke IP publik host ini & port 80 terjangkau dari internet.

> Setelah aktif, URL yang dibuka direksi:
> `https://pr.kmi.com/sap(bD1lbiZjPTMwMA==)/bc/bsp/sap/zpr_rel_bsp/index.htm`

---

## 2. Opsi B — Nginx + Certbot

```bash
apt install -y nginx certbot python3-certbot-nginx
```

`/etc/nginx/sites-available/pr.kmi.com`:
```nginx
server {
    listen 80;
    server_name pr.kmi.com;
    location / { return 301 https://$host$request_uri; }
}

server {
    listen 443 ssl;
    server_name pr.kmi.com;

    # (isi cert diisi otomatis oleh certbot)

    location / {
        proxy_pass http://kmiprd.kmi.com:8001;
        proxy_set_header Host $host;              # pertahankan pr.kmi.com
        proxy_set_header X-Forwarded-Proto https;
        proxy_set_header X-Real-IP $remote_addr;

        # Redirect absolut SAP -> balik ke domain HTTPS
        proxy_redirect http://kmiprd.kmi.com:8001/ https://pr.kmi.com/;

        proxy_read_timeout 120s;
    }
}
```
```bash
ln -s /etc/nginx/sites-available/pr.kmi.com /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
certbot --nginx -d pr.kmi.com     # terbitkan sertifikat + auto-config SSL
```

---

## 3. Akses & verifikasi

Buka:
```
https://pr.kmi.com/sap(bD1lbiZjPTMwMA==)/bc/bsp/sap/zpr_rel_bsp/index.htm
```
(atau path tanpa segmen `sap(...)` bila SAP meng-handle-nya).

Di browser (F12 → Console):
```js
console.log(location.protocol, ('serviceWorker' in navigator));
// harus: "https:" true
```
Lalu buka menu user → tombol harus jadi **"Aktifkan Notifikasi"** (bukan lagi
"tak didukung").

---

## 4. Catatan penting SAP

- **Segmen `sap(bD1lbiZjPTMwMA==)`** = encoding `l=en&c=300` (bahasa+client),
  **stabil** per user/client — jadi scope Service Worker konsisten. Bukan token
  sesi acak. Aman.
- **Login SAP:** browser mengirim kredensial/cookie ke `pr.kmi.com`; proxy
  meneruskan. Karena Host dipertahankan, cookie sesi SAP ter-set untuk
  `pr.kmi.com` — sesi tetap jalan.
- **Sertifikat harus tepercaya** (Let's Encrypt = tepercaya). iPhone menolak
  self-signed untuk Service Worker.
- **Manifest 401** sudah diatasi di `index.htm` (`crossorigin="use-credentials"`).
- Bila muncul aset/URL absolut yang bocor ke `kmiprd:8001`, tambah aturan
  `proxy_redirect` / `header_down Location` seperti di atas, atau minta Basis
  set profil ICM `icm/host_name_full = pr.kmi.com`.

## 5. Setelah HTTPS jalan

Lanjut: subscribe dari 1 device → cek 1 baris `rec_type='D'` di `ZPUSH_LOG` →
baru bangun report `ZPUSH_PR_NOTIF` untuk mengirim notifikasi.
