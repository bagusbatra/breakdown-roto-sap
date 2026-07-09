# Planning — Push Notification Multi-Device untuk User KMI-BOD

Aplikasi: **ZPR_REL_BSP** (`Page with FLow Logic/index.htm` + `main.htm`)
Tanggal: 2026-07-08
Skema kode ABAP: **klasik, siap paste SE80** (tanpa sintaks 7.40+).

### Status progres

- [x] **SE11 — tabel `ZPUSH_LOG` selesai dibuat** (§3.1).
- [x] **VAPID key sudah di-generate** di server Debian (`npx web-push
      generate-vapid-keys`).
  - **Public Key** (boleh publik, dipakai di `main.htm` & `.env`):
    `BBIEvHSjYzluVDkCCuRMUrIF9SrIupRQZzn0qJE_FXtgMByyxeWhp5rhzuLE6vT3RZagmHOX5aokzu6TPomAroE`
  - **Private Key**: **JANGAN** ditulis di file ini / jangan di-commit. Sudah
    ada di output terminal Debian — salin langsung ke `.env`
    (`VAPID_PRIVATE_KEY=...`) di `/srv/www/notif-approval`.
- [x] **File server Debian disiapkan** di `../ZPUSH_NOTIF_SERVER/`
      (`server.js`, `.env.example`, `package.json`, `DEPLOY.md`). `PUSH_SECRET`
      sudah di-generate.
- [x] **Debian: server jalan** — `notif-approval` via PM2 di **port 3002**
      (`/health` OK, auth token aktif). `push-bridge` tetap di port 3000.
      Folder deploy Debian: `/srv/www/notif-approval` (= `/root/data/www/...`).
- [x] ~~Debian: reverse-proxy HTTPS ke `http://127.0.0.1:3002`~~ **TIDAK PERLU.**
      `/kirim-notif` hanya dipanggil report ABAP (backend→backend, dalam LAN),
      jadi `gc_push_url` memakai HTTP internal `192.168.254.167:3002`. Yang
      wajib HTTPS adalah halaman BSP-nya, dan itu sudah selesai.
- [x] **Report `ZPUSH_PR_NOTIF` selesai** (`ZPR_REL_BSP/ZPUSH_PR_NOTIF.abap`):
      baca device `rec_type='D'`, gabung endpoint 2 kolom, dedup `rec_type='P'`,
      cleanup 410, POST ke Debian dgn `X-Push-Secret`. **Isi `gc_push_url` (IP
      Debian yg dijangkau SAP) sebelum aktivasi.** Klik URL → domain HTTPS.
- [x] **File MIME disiapkan** di `MIMEs/`: `sw.js`, `manifest.json`,
      `icon-192.png`, `icon-512.png` (ikon placeholder "PR" — ganti dgn logo asli
      nanti). Tinggal di-upload ke SE80.
- [x] **SE80: 4 file MIME sudah di-upload** ke root app `zpr_rel_bsp`
      (terverifikasi: `.../zpr_rel_bsp/sw.js` bisa dibuka di browser).
- [x] **`main.htm`: 3 action ditambahkan** (`GET_VAPID_KEY`, `SAVE_SUB`,
      `DELETE_SUB`) sebelum `WHEN OTHERS`, guard `lv_is_approver` (KMI-BOD),
      VAPID public inline. **Prasyarat: struktur `ZPUSH_LOG` harus sesuai §3.1.**
- [x] **`index.htm`: selesai** — `<link manifest>` + meta PWA/apple di `<head>`;
      menu "Aktifkan/Matikan Notifikasi" di userMenu (di-gate ABAP `lv_uname2 =
      'KMI-BOD'`); JS `initPush/toggleNotif/enableNotif/disableNotif` + device
      UUID di `localStorage`; `initPush()` dipanggil di `init()`.
- [x] **SM36: job terjadwal & berjalan** (user `BASIS`, periode **15 menit** —
      bukan 10 seperti rencana awal; tidak masalah). Terverifikasi di SM37:
      run 07:00 / 07:15 / 07:30 / 07:45 / 08:00 semua **Finished**.
- [x] **Terbukti end-to-end (2026-07-09)**: baris `rec_type='P'` untuk PR
      `1104068387` berstatus `SENT_STAT='S'` — artinya device ditemukan, SAP →
      Debian tersambung, `PUSH_SECRET` cocok, VAPID cocok, FCM menerima.
      Device terdaftar: **1**.

> ⚠️ **Backlog storm sudah terjadi** pada run pertama 07:00 (durasi **395 detik**
> vs 7–11 detik pada run berikutnya) — seluruh PR pending lama dikirim sekaligus
> ke 1 device. Sekarang semua sudah bertanda `'P'`, sistem masuk *steady state*.
> Agar tidak terulang, report kini membatasi `gc_max_per_run = 50` PR per run.

### Perbaikan pasca-produksi (2026-07-09)

1. **`COMMIT WORK`** setelah tiap `MODIFY`/`DELETE` di `ZPUSH_PR_NOTIF` — tanpa
   ini, job yang dump di tengah loop mengirim notif tapi tidak menyimpan penanda
   `'P'` → notifikasi dobel di run berikutnya.
2. **PR gagal kirim tidak lagi ditandai `'P'`** → dicoba ulang run berikutnya.
   Sebelumnya, PR yang lewat saat Debian mati akan hilang selamanya dari
   notifikasi karena penandanya sudah terlanjur ditulis.
3. **Timeout HTTP 15 detik** + **circuit breaker** (`gc_max_conn_err = 5`): bila
   Debian tak merespons, job berhenti lebih awal alih-alih menggantung.
4. **Device 410 dibuang dari `lt_dev`** in-memory, bukan hanya dari DB — supaya
   PR berikutnya dalam loop yang sama tidak mengirim ulang ke device mati.
5. **Deep-link notif berfungsi**: report mengirim `?banfn=&werks=&bsart=`,
   `index.htm` membaca query, membuka plant+kategori yang benar, lompat ke
   halaman paginasi yang memuat PR itu, meng-expand kartunya, lalu membersihkan
   query agar refresh tidak mengulang. Doc type yang tak terdaftar di plant
   tersebut jatuh ke kategori `ALL`, bukan ke kategori yang salah.

> **HTTPS RESOLVED (2026-07-08):** BSP kini diakses via domain publik
> **`https://approval-pr.kayumebel.net/sap(bD1lbiZjPTMwMA==)/bc/bsp/sap/zpr_rel_bsp/index.htm`**
> (reverse proxy + cert tepercaya, disiapkan tim jaringan). Tombol "Aktifkan
> Notifikasi" muncul, izin Chrome granted. Manifest 401 diatasi via
> `crossorigin="use-credentials"`. Panduan proxy:
> `../ZPUSH_NOTIF_SERVER/REVERSE_PROXY_SAP.md`.
> **Domain final `approval-pr.kayumebel.net`** → dipakai untuk URL klik notif di
> report `ZPUSH_PR_NOTIF` (`gc_click_url`).

---

## 1. Tujuan

Mengirim **push notification** ke semua perangkat (HP Android/iPhone, laptop,
komputer) milik approver **KMI-BOD** setiap ada **PR baru** berstatus *pending
release* di `EBAN`. Notifikasi harus muncul **walau aplikasi/browser sedang
tidak dibuka**.

**Batasan tegas:** fitur ini **hanya** untuk user SAP `KMI-BOD`. Perangkat yang
login sebagai user lain **tidak boleh** bisa berlangganan notifikasi.

Karena `KMI-BOD` adalah user bersama (dipakai beberapa direksi di beberapa
perangkat), satu user = **banyak** subscription device → maka "multi-device".

---

## 2. Arsitektur (konsep "Tukang Pos")

```
[Browser KMI-BOD]              [SAP]                       [Debian Node.js]     [FCM/APNs]
 index.htm  ── subscribe ───▶  main.htm?action=SAVE_SUB ─▶ ZPUSH_LOG (rec 'D')
 sw.js  ◀── tampilkan notif ─────────────────────────────────────────── push ◀── /kirim-notif
                               Report ZPUSH_PR_NOTIF (SM36 tiap ~10 mnt)
                                 1. scan EBAN pending
                                 2. cek ZPUSH_LOG (rec 'P') = dedup per BANFN
                                 3. POST tiap device ── HTTP ─▶ Debian ─ web-push ─▶ FCM ─▶ perangkat
```

| Komponen | Peran ("tukang pos") | Teknologi |
|---|---|---|
| **Frontend** (browser KMI-BOD) | Pengguna memberi izin `Allow`, browser menerima pesan | BSP `index.htm` + `sw.js` + `manifest.json` |
| **Server Debian** (kurir) | Membungkus & mengenkripsi pesan, teruskan ke Google/Apple | Node.js `express` + `web-push` |
| **SAP** (admin) | Sumber data & pemicu "kirim notif" saat ada PR pending | Report `ZPUSH_PR_NOTIF` + action di `main.htm` |

**Web Push wajib enkripsi** → itulah alasan server Debian ada (browser menolak
payload tak terenkripsi; ABAP tidak praktis melakukan enkripsi ECDH/VAPID).

---

## 3. Model data — SATU tabel `ZPUSH_LOG` (dua peran via `REC_TYPE`)

Hanya **satu** tabel custom. Dua peran berbeda dibedakan oleh field key baru
**`REC_TYPE`**:

- `REC_TYPE = 'D'` → baris **Device** (subscription). `DEVICE_ID` diisi UUID
  perangkat, `BANFN` kosong, kolom `SUB_*` diisi.
- `REC_TYPE = 'P'` → baris **PR sudah dinotif** (penanda dedup). `BANFN` diisi
  nomor PR, `DEVICE_ID` kosong, kolom `SUB_*` kosong.

Karena `REC_TYPE` menjadi bagian key, baris 'D' dan 'P' **tidak akan pernah
bentrok** meski berada di satu tabel — sehingga tidak perlu tabel kedua.

### 3.1 Struktur `ZPUSH_LOG` (SE11)

| Field | Key | Data Type | Length | Isi baris `'D'` (device) | Isi baris `'P'` (PR notified) |
|---|---|---|---|---|---|
| MANDT         | ✅ | CLNT       | 3   | Client | Client |
| REC_TYPE      | ✅ | CHAR       | 1   | `'D'` | `'P'` |
| DEVICE_ID     | ✅ | CHAR       | 36  | UUID perangkat | *(kosong)* |
| BANFN         | ✅ | CHAR (BANFN) | 10 | *(kosong)* | Nomor PR |
| UNAME         |    | CHAR (XUBNAME) | 12 | `KMI-BOD` | *(kosong)* |
| SUB_ENDPOINT  |    | CHAR       | 255 | Endpoint bag. 1 (char 1..255) | *(kosong)* |
| SUB_ENDPOINT2 |    | CHAR       | 255 | Endpoint bag. 2 (char 256..510) | *(kosong)* |
| SUB_P256DH    |    | CHAR       | 255 | Public key subscription | *(kosong)* |
| SUB_AUTH      |    | CHAR       | 255 | Auth secret subscription | *(kosong)* |
| SENT_AT       |    | TIMESTAMPL | 21  | Waktu subscribe (UTC) | Waktu notif dikirim (UTC) |
| SENT_STAT     |    | CHAR       | 1   | Status kirim terakhir ke device: `S`/`E`/`410` | `S`=≥1 device sukses, `E`=gagal semua, `N`=tak ada device |
| SENT_MSG      |    | CHAR       | 255 | Catatan/error device ini | Catatan/error untuk debugging |

**Perubahan dari tabel `ZPUSH_LOG` yang ada sekarang** (via SE11 → ubah →
aktifkan ulang):
1. Tambah field **`REC_TYPE CHAR1`** dan jadikan **Key**.
2. Tambah field **`DEVICE_ID CHAR36`** dan jadikan **Key**.
3. `BANFN` **tetap** sebagai Key (sekarang hanya terisi untuk baris `'P'`).
4. Tambah field **`UNAME`** (XUBNAME, non-key).
5. Rename `SUB_P256PH` → **`SUB_P256DH`** (perbaiki typo).
6. Tambah field **`SUB_ENDPOINT2 CHAR255`**.

> Key final: `MANDT + REC_TYPE + DEVICE_ID + BANFN`.
> Baris device → `BANFN` kosong; baris PR → `DEVICE_ID` kosong. Aman & unik.

> Endpoint FCM sebagian bisa > 255 char → dipecah 2 kolom (total 510) agar tidak
> terpotong. Digabung kembali saat kirim: `endpoint = SUB_ENDPOINT && SUB_ENDPOINT2`.

### 3.2 Ringkasan operasi tabel (per peran)

| Operasi | SQL (inti) |
|---|---|
| Simpan/replace device | `MODIFY zpush_log` dgn `rec_type='D'`, `device_id=<uuid>`, `banfn=space` |
| Hapus device | `DELETE FROM zpush_log WHERE rec_type='D' AND device_id=<uuid>` |
| Ambil semua device | `SELECT ... WHERE rec_type='D' AND sub_endpoint <> space` |
| Cek PR sudah dinotif | `SELECT SINGLE banfn ... WHERE rec_type='P' AND banfn=<pr>` |
| Tandai PR dinotif | `MODIFY zpush_log` dgn `rec_type='P'`, `banfn=<pr>`, `device_id=space` |

---

## 4. Kontrak API (action baru di `main.htm`)

Ikuti pola JSON manual yang sudah ada; gaya ABAP klasik siap-paste SE80. Semua
action **guard**: jika `sy-uname <> 'KMI-BOD'` → balas `{"status":"E",
"message":"Not authorized"}` dan berhenti.

### 4.1 `GET_VAPID_KEY` (GET)
Frontend butuh public key untuk `pushManager.subscribe()`.
```json
{ "status":"S", "vapid_public":"BBIEvHSjYzluVDkCCuRMUrIF9SrIupRQZzn0qJE_FXtgMByyxeWhp5rhzuLE6vT3RZagmHOX5aokzu6TPomAroE" }
```
> Public key disimpan sebagai `CONSTANTS` di `main.htm` (boleh publik). Private
> key **tidak pernah** keluar dari server Debian.

### 4.2 `SAVE_SUB` (POST)
Body dari browser:
```json
{ "device_id":"<uuid>", "endpoint":"https://fcm.../...", "p256dh":"...", "auth":"..." }
```
Backend:
- Guard `KMI-BOD`.
- Pecah `endpoint` → `SUB_ENDPOINT` (1..255) + `SUB_ENDPOINT2` (256..).
- `MODIFY zpush_log` dgn `rec_type='D'`, `device_id=<uuid>`, `banfn=space`,
  `uname=sy-uname`, `sub_*` → upsert (re-subscribe device sama menimpa,
  tidak menambah baris).
- Balas `{ "status":"S" }`.

### 4.3 `DELETE_SUB` (POST)
Body `{ "device_id":"<uuid>" }` → `DELETE FROM zpush_log WHERE rec_type='D' AND
device_id=...`. Untuk tombol "Matikan Notifikasi". Balas `{ "status":"S" }`.

---

## 5. Frontend BSP (`index.htm` + MIME)

### 5.1 File MIME baru (wajib file fisik, tidak bisa di-inline)
- **`sw.js`** — service worker; handler `push` (tampilkan notif) + `notificationclick`
  (buka URL detail PR).
- **`manifest.json`** — PWA manifest (nama, ikon, `start_url`, `display:standalone`);
  wajib agar iPhone bisa "Add to Home Screen".

Keduanya di-host lewat MIME repository BSP (folder `MIMEs/`) dan direferensikan
dengan **path absolut** BSP.

### 5.2 Perubahan `index.htm`
1. `<link rel="manifest" href="...manifest.json">` di `<head>`.
2. Tombol **"🔔 Aktifkan Notifikasi"** + **"🔕 Matikan"** (tampil hanya bila
   `sy-uname = 'KMI-BOD'`).
   > Klik **manual wajib** — syarat iOS/Safari: notifikasi hanya boleh diminta
   > lewat gesture pengguna.
3. `DEVICE_ID`: `localStorage.getItem('push_device_id')`; bila kosong → generate
   UUID (`crypto.randomUUID()` / fallback) → simpan. Satu perangkat = satu ID stabil.
4. Alur tombol Aktifkan:
   - `navigator.serviceWorker.register('sw.js')`
   - `Notification.requestPermission()` → harus `granted`
   - fetch `GET_VAPID_KEY` → `reg.pushManager.subscribe({ userVisibleOnly:true,
     applicationServerKey: <vapid> })`
   - POST hasil subscription + `device_id` ke `SAVE_SUB`.
5. Tombol Matikan → `subscription.unsubscribe()` + POST `DELETE_SUB`.

---

## 6. Server Debian (kurir)

### 6.1 Persiapan
```bash
# folder project
mkdir -p /srv/www/notif-approval && cd /srv/www/notif-approval
npm init -y
npm install express web-push cors dotenv
npm install -g pm2
npx web-push generate-vapid-keys      # simpan Public & Private key
```

### 6.2 `server.js`
File siap-deploy sudah dibuat di **`../ZPUSH_NOTIF_SERVER/`** (server.js,
.env.example, package.json, DEPLOY.md). Berbasis `3_server_updated.js` (bukan
`server.js` lama):
- VAPID key & `PUSH_SECRET` dari **`.env`** (jangan hardcode).
- Endpoint `POST /kirim-notif` dilindungi header **`X-Push-Secret`**.
- Balas **410** bila `web-push` mengembalikan 410 Gone (subscription mati).

> ⚠️ **Regenerate VAPID key baru.** Key di `server.js` lama sudah bocor di repo
> ini → jangan dipakai. Public key baru dimasukkan ke `CONSTANTS` `main.htm`
> (action `GET_VAPID_KEY`); private key hanya di `.env` Debian.

`.env` (jangan commit) — public key sudah di-generate; private key salin dari
output terminal Debian:
```
VAPID_PUBLIC_KEY=BBIEvHSjYzluVDkCCuRMUrIF9SrIupRQZzn0qJE_FXtgMByyxeWhp5rhzuLE6vT3RZagmHOX5aokzu6TPomAroE
VAPID_PRIVATE_KEY=<salin dari terminal "npx web-push generate-vapid-keys">
PUSH_SECRET=<string acak panjang, mis. uuidgen>
```

### 6.3 Jalankan
```bash
pm2 start server.js --name notif-approval
pm2 save
```

> **Status aktual:** berjalan di **port 3002** (port 3000 sudah dipakai
> `push-bridge`). `.env` → `PORT=3002`. Reverse-proxy HTTPS harus menunjuk ke
> `http://127.0.0.1:3002`.

---

## 7. Report pemicu `ZPUSH_PR_NOTIF` (SM36)

Adaptasi dari `2_ZPUSH_PR_NOTIF.abap` dengan 3 perubahan:

1. **Baca device dari `ZPUSH_LOG`** (bukan `ZUSER_MAINT`), filter
   `rec_type = 'D'` dan `sub_endpoint <> space`. Gabung
   `endpoint = sub_endpoint && sub_endpoint2` sebelum kirim.
2. **Dedup di tabel yang sama** memakai baris `rec_type = 'P'`:
   `SELECT SINGLE banfn FROM zpush_log WHERE rec_type = 'P' AND banfn = ...`;
   bila sudah ada → skip. Setelah kirim → `MODIFY zpush_log` baris
   `rec_type='P'`, `banfn=<pr>`, `device_id=space`, isi `sent_stat` (`S`/`E`/`N`).
3. **Auto-cleanup 410**: bila server Debian balas HTTP **410** untuk sebuah
   device → `DELETE FROM zpush_log WHERE rec_type='D' AND device_id=...`
   (subscription mati).

Kriteria pending **sama** dengan `GET_LIST` di `main.htm` agar konsisten:
`frgkz = 'X' AND frgzu = ' ' AND loekz = ' '` (dedup per `BANFN`).

Header `X-Push-Secret` = `gc_push_secret` (konstanta) **harus sama persis**
dengan `PUSH_SECRET` di `.env` Debian.

URL klik notif menuju detail PR:
`https://<domain-sap>/sap/bc/bsp/sap/zpr_rel_bsp/index.htm?banfn=<BANFN>`.

**Interval** diatur di **SM36** (mis. tiap 10 menit) — bukan di kode, tidak perlu
transport ulang program untuk ubah interval.

---

## 8. Alur data end-to-end

**A. Registrasi device (sekali per perangkat):**
1. KMI-BOD buka `index.htm` → klik "Aktifkan Notifikasi".
2. Browser minta izin → `granted` → `subscribe()` menghasilkan
   `{endpoint, p256dh, auth}`.
3. POST ke `SAVE_SUB` → tersimpan 1 baris `rec_type='D'` di `ZPUSH_LOG`.

**B. Pengiriman notif (otomatis, berkala):**
1. Job SM36 jalankan `ZPUSH_PR_NOTIF`.
2. Scan `EBAN` pending → daftar `BANFN` unik.
3. Per PR yang **belum** punya baris `rec_type='P'` di `ZPUSH_LOG`:
   - baca semua device (`rec_type='D'`) dari `ZPUSH_LOG`;
   - POST per device ke Debian (`/kirim-notif`, header secret);
   - Debian → `web-push` → FCM/APNs → perangkat menampilkan notif via `sw.js`;
   - tulis baris `rec_type='P'` (status `S`/`E`/`N`);
   - device yang balas 410 → hapus baris `rec_type='D'` device tsb.

---

## 9. Langkah implementasi (urut aktivasi: tabel → report → page)

1. ~~**SE11 — `ZPUSH_LOG`**: tambah key `REC_TYPE` + `DEVICE_ID`, pertahankan
   `BANFN` sebagai key, tambah `UNAME`, rename `SUB_P256PH→SUB_P256DH`, tambah
   `SUB_ENDPOINT2`, aktifkan (§3.1).~~ ✅ **SELESAI**
2. **Debian**: setup folder, npm install, ~~generate VAPID~~ ✅ (public key sudah
   ada, lihat Status progres), isi `.env` (public di atas + private dari
   terminal + `PUSH_SECRET`), deploy `server.js` (dari `3_server_updated.js`),
   `pm2 start`, pasang HTTPS.
3. **SE38 — `ZPUSH_PR_NOTIF`**: buat report (§7); isi `gc_push_url` &
   `gc_push_secret`. Aktifkan.
4. **MIME BSP**: upload `sw.js` + `manifest.json` ke MIME `zpr_rel_bsp`.
5. **`main.htm`**: tambah `CONSTANTS` VAPID public + 3 action
   (`GET_VAPID_KEY`, `SAVE_SUB`, `DELETE_SUB`) dengan guard KMI-BOD. File utuh
   siap paste SE80.
6. **`index.htm`**: `<link manifest>`, tombol Aktif/Matikan, logika UUID +
   register SW + subscribe + save. File utuh siap paste SE80.
7. **SM36**: jadwalkan `ZPUSH_PR_NOTIF` tiap ~10 menit.

---

## 10. Checklist troubleshooting (tim teknis)

- **Koneksi:** IP/domain Debian benar & bisa diakses dari server SAP (cek
  firewall; SAP `SM59`/`ICM` bila lewat proxy).
- **HTTPS:** Web Push hanya jalan di HTTPS dengan sertifikat SSL valid — domain
  SAP **dan** Debian.
- **Secret cocok:** `gc_push_secret` (ABAP) == `PUSH_SECRET` (`.env`); kalau beda
  → server balas 401.
- **VAPID cocok:** public key di `main.htm` == public key di `.env` Debian; kalau
  beda → push ditolak FCM.
- **iPhone:** wajib **"Add to Home Screen"** lalu buka lewat ikon Home Screen
  (bukan dari Safari langsung). Perlu `manifest.json` + `display:standalone`.
- **iPhone diblokir:** hapus data website di Safari → Settings → Advanced →
  Website Data, lalu restart HP dan subscribe ulang.
- **Endpoint terpotong:** pastikan `SUB_ENDPOINT2` ikut disimpan & digabung.
- **Cek log:** baris `rec_type='P'` (status per PR) & `rec_type='D'.SENT_STAT`
  (status per device) di `ZPUSH_LOG`; `pm2 logs notif-approval` di Debian.

---

## 11. Rencana pengujian

1. **Guard user:** login user selain KMI-BOD → tombol Aktifkan tidak muncul /
   `SAVE_SUB` menolak.
2. **Subscribe multi-device:** login KMI-BOD di 2 browser/HP berbeda → 2 baris
   `rec_type='D'` dengan `DEVICE_ID` berbeda.
3. **Re-subscribe:** subscribe ulang di device sama → tetap 1 baris (upsert, tidak
   dobel).
4. **PR baru → notif:** buat PR pending → jalankan report manual (SE38) → notif
   muncul di semua device → 1 baris `rec_type='P'` (`S`).
5. **Idempotensi:** jalankan report lagi → PR sama **tidak** dikirim ulang.
6. **Endpoint panjang:** device dengan endpoint > 255 char → tersimpan utuh &
   notif sampai.
7. **410 cleanup:** uninstall/hapus izin di 1 device → run report → baris
   `rec_type='D'` device itu terhapus.
8. **iPhone PWA:** Add to Home Screen → subscribe → notif muncul saat app tertutup.
9. **Klik notif:** menekan notif membuka `index.htm?banfn=<PR>`.

---

## 12. Catatan terbuka

- Ikon PWA untuk `manifest.json` (ambil dari `MIMEs/logo.png`, siapkan ukuran
  192px & 512px).
- Domain final SAP & Debian untuk mengisi `gc_push_url` dan URL klik notif.
- Kebijakan retensi baris `rec_type='P'` (arsip/hapus PR lama) bila tabel
  membesar — di luar scope awal.
- Karena device & penanda PR kini satu tabel, hindari operasi SQL tanpa filter
  `rec_type` (mis. `DELETE FROM zpush_log` polos) agar tidak menghapus lintas
  peran.

---

## 13. Langkah SM36 — jadwalkan `ZPUSH_PR_NOTIF` tiap 10 menit

> Prasyarat: report `ZPUSH_PR_NOTIF` sudah di-activate & tes manual (F8) sukses.

### A. Buat job

1. Transaksi **`SM36`**.
2. **Job name**: `ZPUSH_PR_NOTIF` — **Job class**: `C` (prioritas rendah, aman
   untuk job sering). Biarkan target server kosong (default).
3. Klik **Step**.
4. Isi **ABAP program name** = `ZPUSH_PR_NOTIF`, **Variant** kosong (report tidak
   pakai parameter). **Save** step, lalu **Back**.

### B. Atur periode 10 menit

5. Klik **Start condition** → **Date/Time**.
6. Isi **Scheduled start**: tanggal & jam mulai (mis. hari ini, beberapa menit
   ke depan). Centang **Periodic job**.
7. Klik tombol **Period values** → pilih **Other period**.
8. Isi **Minutes = 10** → **Save** (kembali dgn tanda periodik aktif).
9. **Save** start condition.

### C. Aktifkan

10. Dari layar SM36 (job masih terbuka), klik **Save** (ikon disket) → job
    berstatus **Released/Scheduled**.

### D. Verifikasi jalan (SM37)

11. Transaksi **`SM37`** → Job name `ZPUSH_PR_NOTIF*`, rentang tanggal hari ini
    → **Execute**.
12. Tunggu ≥ 10 menit → harus muncul run dgn status **Finished**.
13. Klik run → **Job log** / **Spool** → lihat output:
    `PR baru dinotif : n` / `PR di-skip (sudah): n`.

### Operasional

- **Ubah interval** (mis. 5 mnt): SM37 → pilih job → **Change** → Start condition
  → Period values → ubah Minutes. **Tidak perlu** ubah/transport report.
- **Stop sementara**: SM37 → pilih job → menu **Job → Released → Scheduled**
  (turunkan status) atau hapus job periodiknya.
- **Beban**: job class C, query ringan (EBAN pending + ZPUSH_LOG). 10 menit aman.
  Bila PR pending sangat banyak saat pertama kali, run pertama mengirim semua
  yang belum ada di `rec_type='P'` (backlog) — normal, sesudahnya hanya PR baru.

> Alternatif interval < 1 menit tidak didukung SM36 langsung (minimum praktis
> ~1 menit). 10 menit sudah cukup responsif untuk approval PR.
