# History Screening — Breakdown ROTO SAP

> **PERINTAH TETAP (WAJIB):** Setiap kali ada perintah *screening* lagi
> (screening repo, screening file, audit ulang, dsb.), **JANGAN buat file
> baru** — **UPDATE file ini** dengan menambahkan entri baru di bagian
> "Log Screening" (format: `## Screening #N — YYYY-MM-DD`), berisi scope,
> kondisi repo saat itu, dan temuan. Entri lama tidak boleh dihapus.

---

## Screening #1 — 2026-06-12

### Scope
Screening seluruh repo (semua file markdown + kode BSP di `ZPR_REL_BSP` dan
`ZPR_REL_BSP_up`).

### Kondisi Repo
- Branch: `main`, sinkron dengan `origin/main`, working tree clean.
- Commit terakhir: `6207937 update`.
- File `ZPR_REL_BSP_up/development.md` sudah dihapus, digantikan
  `ZPR_REL_BSP_up/development-to-roto.md` (plan multi-kategori ROTO + RSB7).

### Inventori File

| File | Baris | Keterangan |
|---|---|---|
| `README.md` | 89 | Overview repo, struktur, tech stack, daftar hardcode |
| `documentation/business-process.md` | 320 | Konteks bisnis, kriteria pending, ERD, alur end-to-end |
| `documentation/flow.md` | 426 | Flow teknis request/response semua action API |
| `notes/investigation.md` | 273 | Temuan bug/potensi isu (§3), pertanyaan (§4), rekomendasi keamanan/arsitektur (§6) |
| `ZPR_REL_BSP/Page with FLow Logic/index.htm` | 2065 | Frontend baseline (HTML+CSS+JS) |
| `ZPR_REL_BSP/Page with FLow Logic/main.htm` | 1011 | Backend baseline (ABAP, JSON manual) |
| `ZPR_REL_BSP_up/Page with FLow Logic/index.htm` | 2065 | **Identik dengan baseline** (belum ada perubahan) |
| `ZPR_REL_BSP_up/Page with FLow Logic/main.htm` | 1011 | **Identik dengan baseline** (belum ada perubahan) |
| `ZPR_REL_BSP_up/development-to-roto.md` | 229 | Plan pengembangan multi kategori (ROTO + Jasa/RSB7) |
| `ZPR_REL_BSP*/MIMEs/*.png` | - | Aset: background, logo, semarang, surabaya |

### Temuan Kunci Screening

1. **Coding belum dimulai** — `index.htm` & `main.htm` di `ZPR_REL_BSP_up`
   100% identik dengan baseline `ZPR_REL_BSP` (diverifikasi via `diff`).
2. **Tabel `ZROTO_APP_HIST`/`ZROTO_REJ_HIST` SUDAH punya kolom `BSART`** —
   terbukti dari `TYPES ty_hist_app/ty_hist_rej` (`main.htm:77,97`) yang
   mereferensi `zroto_*_hist-bsart`, `SELECT` history yang mengambil `bsart`
   (`main.htm:622,712`), dan `PROCESS` yang menulis `bsart = 'ROTO'`
   (`main.htm:901,944`). Ini memengaruhi asumsi plan (lihat analisis).
3. **`bsart` di-SELECT di GET_HIST tapi TIDAK ikut di-output ke JSON**
   (loop CONCATENATE `main.htm:675-693` & `762-779` tidak ada field bsart).
4. **Parameter `lv_bsart` memang sudah dibaca** di `main.htm:20` (sesuai
   klaim plan §10), tapi belum dipakai di logic mana pun.
5. Titik hardcode `'ROTO'` di `main.htm`: baris 215, 231, 316 (SELECT EBAN)
   + 901, 944 (insert history). Plant `1200`/`1300` hardcode di
   GET_SIDEBAR (4 blok SELECT, baris 211-277).
6. Touchpoint frontend terverifikasi ada di `index.htm`: `PLANT_LABELS`
   (:798), `ESTKZ_MAP` (:803), `renderSidebar` (:1011), `switchView`
   (:1120), `fetchList` (:1141), `fetchHistApp/Rej` (:1163/:1181),
   `renderHistTable` (:1443), `processAction` (:1945).
7. Temuan lama di `notes/investigation.md` §3 (history mencatat semua item
   walau release sebagian gagal; XSS/quote-bug di `renderHistTable`;
   urutan commit reject tidak transaksional; dll.) **belum di-address**
   di plan `development-to-roto.md`.

---

<!-- Tambahkan entri "## Screening #N — YYYY-MM-DD" baru DI BAWAH baris ini -->
