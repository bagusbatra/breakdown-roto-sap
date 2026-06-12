# Notes — Persiapan Uji Coba SE80 (Multi Kategori ROTO + RSB7)

> Catatan pre-flight sebelum copy-paste `ZPR_REL_BSP_up/Page with FLow
> Logic/{main.htm,index.htm}` ke SE80. Status kode: **final per
> 2026-06-12**, tidak perlu diedit lagi. Checklist coding lengkap ada di
> `ZPR_REL_BSP_up/development-to-roto.md` §9.

## 1. Prasyarat WAJIB (dilewati = pasti error)

> **REVISI 2026-06-12 (lihat `development-to-roto.md` §1.1):** tidak ada
> lagi pembuatan tabel SE11 / migrasi. Kode sudah di-revert memakai
> **`ZROTO_APP_HIST`/`ZROTO_REJ_HIST` existing** (sudah aktif di sistem,
> kolom `BSART` sudah ada). **Tidak ada prasyarat SE11 apa pun** —
> langsung lanjut ke §2.

(Arsip prasyarat lama ZPR_* — tidak berlaku: struktur tabel §7 plan,
REASON STRING vs CHAR 255.)

## 2. Tergantung Cara Uji Coba

### A. Menimpa langsung aplikasi BSP live
- Cukup paste 2 file — ICF service, MIME, properti page sudah ada.
- Kedua file **harus di-deploy bersamaan** (kontrak JSON `GET_SIDEBAR`
  berubah — frontend lama tidak kompatibel dengan backend baru, dan
  sebaliknya).
- History menulis & membaca tabel `ZROTO_*` yang sama dengan aplikasi
  lama — seluruh riwayat lama **langsung tampil**, tanpa migrasi
  (urutan cutover sederhana: plan §10).

### B. Buat BSP application baru untuk testing (DISARANKAN)
1. Kedua page dibuat sebagai **"Page with Flow Logic"**, kode di-paste ke
   tab *Layout* — objek implisit `request`/`response`/`_m_navigation`
   hanya tersedia di tipe page itu.
2. **Upload 4 file MIME** ke folder MIME aplikasi baru: `logo.png`,
   `background.png`, `surabaya.png`, `semarang.png` — kalau tidak,
   gambar sidebar/header pecah (bukan error, tapi tampilan rusak).
3. **Aktifkan node ICF** aplikasi baru di SICF.
4. Jika POST `PROCESS` ditolak (403/redirect login) padahal GET jalan →
   samakan setting SICF service baru dengan service aplikasi lama
   (kemungkinan beda di proteksi XSRF/session handling).

## 3. Peringatan Saat Uji Coba

- **Approve/Reject bekerja pada data PR SUNGGUHAN**:
  `BAPI_REQUISITION_RELEASE` benar-benar me-release PR;
  reject benar-benar menghapus PR dari SAP (`LOEKZ='L'`).
  Di sistem produktif, uji hanya pada PR yang memang boleh diproses —
  atau lakukan di client DEV/QAS.
  Aman sepenuhnya: lihat daftar, search, filter, expand detail, history.
- **Fitur approve hanya muncul untuk user `KMI-BOD`** — user lain
  read-only (by design). Tes dengan user yang tepat.
- Badge "PR Jasa" = 0 jika belum ada PR `RSB7` pending
  (`FRGKZ='X' AND FRGZU=' '`) di plant 1200/1300 — bukan bug.

## 4. Prosedur Paste Teraman di SE80

1. ~~Buat tabel SE11~~ — TIDAK perlu (revisi §1.1, tabel `ZROTO_*`
   sudah ada).
2. Paste `main.htm` → **syntax check (Ctrl+F2) dulu sebelum activate**.
3. Paste `index.htm` → activate keduanya.
4. Jika syntax check memunculkan pesan apa pun → kirim teks errornya
   persis; bisa langsung dikoreksi.

## 5. Status Jaminan Kode

- ABAP 100% klasik, meniru pola baseline yang terbukti jalan
  (CONCATENATE, macro DEFINE, READ TABLE WITH KEY) — tanpa sintaks
  7.40+. JS murni ES5 (var, forEach, string concat).
- Sudah melalui review berlapis: tidak ada deklarasi ganda, tidak ada
  sisa referensi `zroto_*`/hardcode `'ROTO'` di luar yang disengaja,
  kolom tabel history frontend sejajar (header vs body).
- Yang TIDAK bisa dilakukan dari sini: menekan Ctrl+F2 di SE80 —
  karena itu ikuti prosedur §4 di atas.
