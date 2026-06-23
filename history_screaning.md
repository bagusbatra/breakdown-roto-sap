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

## Screening #2 — 2026-06-12 (sore)

### Scope
Screening ulang setelah user menambahkan bab fitur **PO** (`ZPO_REL_BSP`,
aplikasi release PO yang sudah selesai & live, multi kategori).

### Kondisi Repo
- Commit baru: `a74069f final update task`, `8973b46 update hasil tambah
  fitur untuk PR Jasa` — hasil coding `ZPR_REL_BSP_up` (main.htm +
  index.htm multi kategori ROTO/RSB7) sudah di-commit.
- Untracked: `ZPO_REL_BSP/` (baru) dan `notes.md` (pre-flight SE80).

### Inventori Baru

| File | Baris | Keterangan |
|---|---|---|
| `ZPO_REL_BSP/Page with FLow Logic/main.htm` | 4084 | Aplikasi release PO — **single-file** (ABAP + HTML + CSS + JS jadi satu, tanpa index.htm) |
| `ZPO_REL_BSP/MIMEs/*.png` | - | 4 aset sama seperti ZPR (logo, background, surabaya, semarang) |
| `notes.md` (root) | - | Catatan pre-flight uji coba SE80 utk ZPR_REL_BSP_up |

### Temuan Kunci — Arsitektur ZPO_REL_BSP ("standar baru")

1. **Single-file BSP**: load pertama me-render seluruh HTML + data
   ter-embed sebagai JSON; action API (`GET_HISTORY_*`, `GET_OGR`,
   `BULK_REL`, `BULK_REJ`) di-handle di awal file yang sama lalu
   `response_complete( )` + `EXIT`.
2. **BSP tidak menulis logic SELECT list sendiri** — data pending diambil
   dari **FM existing** `Z_FM_YMMR068` (reuse logic report ZMMR068) per
   plant 1200/1300 (`main.htm:1044-1060`).
3. **Release/Reject via FM existing**: `Z_PO_RELEASE2` (release code
   diambil dari data, `frgco`), `Z_PO_REJECT`; alasan reject disimpan
   sebagai **PO header text** via `Z_PO_COMMENT_UPDATE` (text id `F01`)
   dan dibaca kembali via `READ_TEXT` — **bukan tabel Z custom**.
4. **History TANPA tabel Z custom** — dibaca dari **change documents
   standar** `CDHDR`/`CDPOS` (`objectclas='EINKBELEG'`, `tabname='EKKO'`,
   `fname FRGZU/FRGKE`, tcode `ME28`/`ME29N`), dengan **filter rentang
   tanggal + search + paginasi server-side** (`offset`/`limit`,
   `main.htm:68-86`).
5. **Kategori murni konfigurasi JS**: `POTYPE_MAP` per plant, satu
   kategori = **array BSART** (mis. BAHAN = `PSB1/PSB3/PSB4` di 1200,
   `PSM1/PSM3/PSM4` di 1300; 7 kategori utk 1200, 6 utk 1300;
   `main.htm:1950-1968`) + reverse map `BSART_POTYPE_MAP` utk badge.
   Menambah kategori = edit JS map saja.
6. **Memakai sintaks ABAP 7.40+** (`DATA(...)` inline, `VALUE
   string_table`, `main.htm:762,781`) → sistem SAP mendukung ABAP modern;
   batasan "ABAP klasik" di standar §11 `development-to-roto.md` adalah
   pilihan aman, bukan keterbatasan sistem.
7. Pola bulk-select POST: field `po_selected_1..500` dibaca `DO 500
   TIMES` (`main.htm:1070-1081`).
8. Kriteria PO released utk listing OGR: `EKKO-FRGKE = 'R'`.

### Implikasi (arah baru dari user)

Pengembangan fitur PR selanjutnya **fokus pada BSP** (pengembangan &
pemanfaatan BSP), **tidak mengubah konfigurasi atau ABAP backend**:
- Pembuatan tabel baru `ZPR_APP_HIST`/`ZPR_REJ_HIST` di SE11 + report
  migrasi **bertentangan dengan prinsip ini** → keputusan tabel direvisi
  kembali ke **pakai ulang `ZROTO_*_HIST` existing** (kolom `BSART` sudah
  ada & terisi — lihat Screening #1 temuan 2).
- Konsekuensi kode: `ZPR_REL_BSP_up/main.htm` perlu revert referensi
  `zpr_*_hist` → `zroto_*_hist` (frontend tidak terdampak).
- Detail revisi: `ZPR_REL_BSP_up/development-to-roto.md` §0 (prinsip) &
  §7 (tabel).

---

## Screening #3 — 2026-06-12 (verifikasi final ZPR_REL_BSP_up)

### Scope
User konfirmasi: `ZPO_REL_BSP` (selesai, live, basis standar) → `ZPR_REL_BSP`
(original/baseline, JANGAN diubah) → `ZPR_REL_BSP_up` (folder development,
PR ROTO sudah selesai, lanjut PR Jasa/RSB7). Permintaan: cek apakah
`ZPR_REL_BSP_up` sudah sesuai aturan §11 `development-to-roto.md` dan siap
copy-paste langsung ke SE80.

### Kondisi Repo
- Commit terakhir: `f9057c7 update`, working tree clean.
- `ZPR_REL_BSP_up/Page with FLow Logic/main.htm`: 1030 baris.
- `ZPR_REL_BSP_up/Page with FLow Logic/index.htm`: 2143 baris.

### Verifikasi vs §11 Standar Kode (Copy-Paste Ready)

| # | Aturan | Hasil |
|---|---|---|
| 1 | Deliverable file utuh | ✅ Kedua file lengkap, bukan diff |
| 2 | ABAP klasik (tanpa `DATA(...)`, `\|...\|`, `VALUE #()`, `NEW`, `COND`, `line_exists()`, `->*`) | ✅ Grep nol hasil — tidak ada sintaks 7.40+ |
| 3 | Deklarasi variabel unik (no duplicate `lv_`/`ls_`/`lt_`) | ✅ Semua nama unik (dicek via grep+uniq) |
| 4 | Objek implisit BSP (`request`/`response`/`_m_navigation`, `<%@page%>`, `append_cdata`+`response_complete`) | ✅ Pola dipertahankan persis |
| 5 | Frontend vanilla ES5 | ✅ `var`, string concat, tanpa library eksternal |
| 6 | Referensi tabel `ZROTO_*_HIST` (existing, aktif) | ✅ Nol sisa `zpr_`/`ZPR_` di kedua file |
| 7 | Self-review syntax (deklarasi, tipe, struktur) | ✅ IF/ENDIF (38=38 setelah dikurangi 3 ELSEIF), LOOP/ENDLOOP (14/14), CASE/ENDCASE (2/2) seimbang |

### Temuan Tambahan (bukan blocker, perlu perhatian user saat deploy)

- `index.htm` baris 950 & 955: URL logout hardcode
  `/sap/bc/bsp/sap/zpr_rel_bsp/index.htm` — **mengacu nama aplikasi BSP
  `zpr_rel_bsp` (baseline)**, bukan path `_up`. Ini KONSISTEN dengan pola
  baseline (`ZPR_REL_BSP/index.htm` juga hardcode nama dirinya sendiri,
  begitu juga `ZPO_REL_BSP/main.htm` → `zpo_rel_bsp`). **Tidak perlu
  diubah** jika deploy Skenario A (`notes.md` §2A — menimpa aplikasi BSP
  `zpr_rel_bsp` yang sama). **Perlu disesuaikan** ke nama teknis aplikasi
  baru jika deploy sebagai aplikasi BSP terpisah (Skenario B).

### Kesimpulan

`ZPR_REL_BSP_up` (main.htm + index.htm) **SUDAH SESUAI** standar §11 dan
**SIAP copy-paste langsung ke SE80** tanpa prasyarat SE11/konfigurasi
tambahan (sesuai §1.1 — pakai ulang `ZROTO_APP_HIST`/`ZROTO_REJ_HIST`
existing). Satu-satunya hal yang perlu dipastikan user sebelum paste adalah
nama aplikasi BSP tujuan (lihat temuan URL logout di atas) — pilih Skenario
A atau B di `notes.md` §2.

---

## Screening #4 — 2026-06-23

### Scope
Full screening of the entire repository (excluding `ZPO_REL_BSP` per `.opencodeignore`) to refresh all `.md` documentation after a "start from 0" reset.

### Kondisi Repo
- Working tree: include any unstaged/untracked changes from the current documentation refresh
- All `.md` files have been updated to reflect actual current file sizes and structure
- Key findings: `ZPR_REL_BSP/index-merge.htm` (2811 lines per old docs) no longer exists on disk
- `ZPR_REL_BSP_jasa` folder no longer exists

### Actual File Inventory (after screening)

| File | Baris | Keterangan |
|---|---|---|
| `.opencodeignore` | 3 | Ignore rules |
| `README.md` | (updated) | Overview repo |
| `flowAndLogic.md` | (updated) | Flow & logic documentation |
| `myLearning.md` | (updated) | Learning notes |
| `history_screaning.md` | (updated, now with #4) | This file |
| `perbandingan.md` | (updated) | Comparison doc |
| `perbandingan-logic.md` | (updated) | Comparison logic doc |
| `notes.md` | (updated) | Notes |
| `notes/investigation.md` | (updated) | Investigation notes |
| `documentation/README.md` | (updated) | Doc index |
| `documentation/business-process.md` | (updated) | Business process |
| `documentation/flow.md` | (updated) | Technical flow |
| `documentation/zbsp-prch-app.md` | (updated) | ZBSP_PRCH_APP docs |
| `documentation/zpo-rel-bsp.md` | (updated) | ZPO_REL_BSP docs |
| `ZBSP_PRCH_APP/erd.md` | (updated) | ERD |
| `ZBSP_PRCH_APP/TAMBAH_KATEGORI.md` | (updated) | Add category guide |
| `ZBSP_PRCH_APP/Page with FLow Logic/index.htm` | 2241 | Frontend |
| `ZBSP_PRCH_APP/Page with FLow Logic/main.htm` | 1298 | Backend |
| `ZPR_REL_BSP/Page with FLow Logic/index.htm` | 2507 | Frontend |
| `ZPR_REL_BSP/Page with FLow Logic/main.htm` | 1325 | Backend |
| `ZPO_REL_BSP/` | — | Excluded per `.opencodeignore` |

### Temuan Kunci Screening #4

1. **index-merge.htm (2811 lines, referenced in old docs) confirmed missing from disk** — file `ZPR_REL_BSP/index-merge.htm` yang tercatat di dokumentasi lama sudah tidak ada.
2. **Both BSP apps now support 7 plants**: 1200, 1300, 2000, 1000, 1001, 1100, 3000.
3. **ZPR_REL_BSP uses functional category codes** (MTN, RND, SVC) with dynamic `lt_cat_def` loop.
4. **ZBSP_PRCH_APP uses technical BSART codes** (ROTO, PRK9, RSBR, PRKS) with hardcoded `count_pending`.
5. **ZPR_REL_BSP has live approver logic** (KMI-BOD), **ZBSP_PRCH_APP is read-only** with plant restriction.
6. **All `.md` documentation refreshed** to reflect current state.
