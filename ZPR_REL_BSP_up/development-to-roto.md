# Development Plan — PR Multi Kategori (ZPR_REL_BSP_up)

## 1. Tujuan

Mengembangkan aplikasi BSP yang bisa handle **2 kategori PR** (ROTO dan
Jasa/RSB7) dalam satu aplikasi. Folder `ZPR_REL_BSP_up` adalah tempat
pengembangan, di-copy manual ke SE80 saat deploy.

## 2. Pendekatan

**Navigasi sidebar:** Setiap plant punya 4 menu:
- PR One Time Off (ROTO)
- PR Jasa (RSB7)
- History Approve (gabung ROTO + Jasa, dengan label kolom kategori)
- History Reject (gabung ROTO + Jasa, dengan label kolom kategori)

Kategori yang dipilih (`bsart`) dikirim sebagai parameter pada tiap fetch
call internal ke `main.htm` — bukan bagian dari URL halaman yang bisa
di-bookmark/dibagikan (state kategori hidup di JS, `curBsart`).

## 3. Runtime Environment

| Komponen | Keterangan |
|----------|-----------|
| Platform | SAP NetWeaver AS ABAP (BSP/ICF Service) |
| Frontend | HTML + CSS + JS (vanilla, `index.htm`) |
| Backend | ABAP scriptlet (`main.htm`) |
| Komunikasi | `fetch()` → `main.htm?action=...&bsart=...` |
| BAPI | `BAPI_REQUISITION_RELEASE`, `BAPI_REQUISITION_DELETE` |
| Tabel history | **Unified** `ZPR_APP_HIST`, `ZPR_REJ_HIST` (+ kolom `bsart`) |
| Deploy | Copy manual file ke SE80 (BSP aplikasi) |

## 4. Arsitektur

```
Browser (index.htm)
  │ Klik "PR Jasa" → curBsart = 'RSB7'
  │ fetch('main.htm?action=GET_LIST&werks=1200&bsart=RSB7')
  ▼
main.htm (ABAP)
  │ SELECT EBAN WHERE bsart = lv_bsart AND ...
  │ CALL BAPI_REQUISITION_RELEASE / DELETE
  │ MODIFY ZPR_APP_HIST / ZPR_REJ_HIST (isi bsart)
  ▼
SAP Tables: EBAN, MAKT, USR21, ADRP,
           ZPR_APP_HIST, ZPR_REJ_HIST
```

## 5. Navigasi Sidebar (Baru)

```
SURABAYA (1200)
  ├── PR One Time Off      ← curBsart='ROTO',  mode='pending'
  ├── PR Jasa              ← curBsart='RSB7',  mode='pending'
  ├── History Approve      ← curBsart='',      mode='hist_app' (semua)
  └── History Reject       ← curBsart='',      mode='hist_rej' (semua)

SEMARANG (1300)
  ├── PR One Time Off
  ├── PR Jasa
  ├── History Approve
  └── History Reject
```

Setiap plant punya badge jumlah pending per kategori.

## 6. Perubahan dari ROTO ke Multi Kategori

| Item | Sebelum (ROTO only) | Sesudah (Multi) |
|------|---------------------|-----------------|
| BSART | Hardcode `'ROTO'` | Parameter `lv_bsart` dari frontend |
| Tabel history | `ZROTO_APP_HIST`, `ZROTO_REJ_HIST` | `ZPR_APP_HIST`, `ZPR_REJ_HIST` + kolom `bsart` |
| Sidebar per plant | 3 menu (PR, Hist App, Hist Rej) | 4 menu (+ PR Jasa) |
| History | Hanya ROTO | ROTO + Jasa, ditandai kolom `bsart` |
| Release code | `P2` | `P2` (sama) |
| Approver | `KMI-BOD` | `KMI-BOD` (sama) |
| Plant | `1200`, `1300` | `1200`, `1300` (sama) |
| Filter ESTKZ | MRP/Non-MRP | MRP/Non-MRP (sama) |

## 7. Tabel Unified — Siap SE11

### ZPR_APP_HIST

| Kolom | Key | Data Element | Domain | Panjang |
|-------|:---:|-------------|--------|:-------:|
| MANDT | PK | MANDT | MANDT | 3 |
| BANFN | PK | BANFN | BANFN | 10 |
| BNFPO | PK | BNFPO | BNFPO | 5 |
| BSART | | BSART | BSART | 4 |
| WERKS | | WERKS_D | WERKS | 4 |
| TXZ01 | | TXZ01 | TXZ01 | 40 |
| ERNAM | | ERNAM | USNAM | 12 |
| ERDAT | | ERDAT | DATUM | 8 |
| MENGE | | MENGE_D | MENGE | 13(3) |
| MEINS | | MEINS | MEINS | 3 |
| PREIS | | PREIS | PREIS | 11(2) |
| PEINH | | PEINH | PEINH | 5 |
| WAERS | | WAERS | WAERS | 3 |
| EKGRP | | EKGRP | EKGRP | 3 |
| APP_BY | | AD_NAME | AD_NAMR | 12 |
| APP_AT | | DATUM | DATUM | 8 |
| APP_TM | | UZEIT | UZEIT | 6 |

### ZPR_REJ_HIST

Sama seperti ZPR_APP_HIST + kolom berikut:

| Kolom | Key | Data Element | Domain | Panjang |
|-------|:---:|-------------|--------|:-------:|
| DEL_BY | | AD_NAME | AD_NAMR | 12 |
| DEL_AT | | DATUM | DATUM | 8 |
| DEL_TM | | UZEIT | UZEIT | 6 |
| REASON | | STRING | | 256+ |

> *Kolom `bsart` menggunakan data element `BSART` (sama dengan EBAN-BSART).
> Key: `MANDT` + `BANFN` + `BNFPO` (sama seperti tabel ZROTO_*).

### Migrasi Data — Report Z Sekali Jalan (`ZPR_MIGRATE_HIST`)

> Catatan: sintaks `INSERT ... FROM (SELECT ...)` butuh ABAP 7.50+ dan tidak
> bisa dieksekusi sebagai SQL lepas — gunakan report di bawah (kompatibel
> semua versi). Kolom `bsart` di `ZROTO_*_HIST` **sudah terisi `'ROTO'`**
> oleh aplikasi existing (`main.htm:901,944`), jadi cukup di-copy apa adanya;
> `IF ... IS INITIAL` hanya safety net.

```abap
REPORT zpr_migrate_hist.

DATA: lt_app_old TYPE STANDARD TABLE OF zroto_app_hist,
      lt_app_new TYPE STANDARD TABLE OF zpr_app_hist,
      ls_app_old TYPE zroto_app_hist,
      ls_app_new TYPE zpr_app_hist.

SELECT * FROM zroto_app_hist INTO TABLE lt_app_old.
LOOP AT lt_app_old INTO ls_app_old.
  CLEAR ls_app_new.
  MOVE-CORRESPONDING ls_app_old TO ls_app_new.
  IF ls_app_new-bsart IS INITIAL.
    ls_app_new-bsart = 'ROTO'.
  ENDIF.
  APPEND ls_app_new TO lt_app_new.
ENDLOOP.
MODIFY zpr_app_hist FROM TABLE lt_app_new.
WRITE: / 'APP_HIST:', lines( lt_app_old ), '->', sy-dbcnt.

" Blok yang sama untuk reject:
" zroto_rej_hist -> zpr_rej_hist (ikut copy del_by/del_at/del_tm/reason)

COMMIT WORK.
```

Desain report:
- `MOVE-CORRESPONDING` — bawa semua kolom bernama sama otomatis (termasuk
  `bsart`); tahan terhadap penambahan kolom di `ZPR_*`.
- `MODIFY` (bukan `INSERT`) — **idempotent**: aman dijalankan ulang saat
  cutover, tidak dump duplicate key.
- `WRITE` jumlah baris sumber vs `sy-dbcnt` — bukti verifikasi row count.

## 8. Titik Perubahan di Kode

### 8.0 Kontrak JSON `GET_SIDEBAR` (Baru)

Pending dipecah per kategori (key = kode BSART asli, bukan label);
history tetap satu angka per plant (gabungan semua kategori):

```json
{
  "status": "S",
  "is_approver": true,
  "pending": {
    "1200": { "ROTO": 5, "RSB7": 2 },
    "1300": { "ROTO": 1, "RSB7": 0 }
  },
  "hist_app": { "1200": 10, "1300": 4 },
  "hist_rej": { "1200": 3,  "1300": 1 }
}
```

- Backend: blok pending jadi 4 SELECT (2 plant × 2 kategori), JSON pending
  dirakit nested per plant.
- Frontend: `renderSidebar` baca `sbCounts.pending[plant]['ROTO']` /
  `['RSB7']` dengan fallback `|| 0` (jaga-jaga jika frontend/backend tidak
  ter-deploy serempak — deploy = copy manual 2 file ke SE80).

### 8.1 `main.htm` — Backend ABAP

| Perubahan | Detail |
|-----------|--------|
| Validasi `lv_bsart` | Hanya di dalam branch `GET_LIST` (bukan global): kosong → `'ROTO'` (kompatibel lama); selain `ROTO`/`RSB7` → return error JSON. Whitelist mencegah intip PR kategori lain via `bsart=NB` dsb. |
| TYPES ty_hist_app | Tambah field `bsart TYPE bsart` |
| TYPES ty_hist_rej | Tambah field `bsart TYPE bsart` |
| GET_SIDEBAR | SELECT EBAN: `WHERE bsart = lv_bsart AND ...` (2x SELECT untuk tiap plant, untuk tiap kategori) |
| GET_SIDEBAR | SELECT `zpr_app_hist` tanpa filter bsart (jumlah semua) |
| GET_SIDEBAR | SELECT `zpr_rej_hist` tanpa filter bsart (jumlah semua) |
| GET_LIST | `WHERE bsart = lv_bsart AND ...` |
| GET_HIST_APP | SELECT dari `zpr_app_hist` (tanpa filter bsart, tampil semua) |
| GET_HIST_REJ | SELECT dari `zpr_rej_hist` (tanpa filter bsart, tampil semua) |
| GET_HIST_APP | Tambah `bsart` ke output JSON: `'"bsart":"' ls_hist_app-bsart '",'` (sumber kolom "Kategori") |
| GET_HIST_REJ | Tambah `bsart` ke output JSON: `'"bsart":"' ls_hist_rej-bsart '",'` (sumber kolom "Kategori") |
| TYPES ty_eban_item | Tambah field `bsart TYPE eban-bsart` (aman — semua SELECT existing sebut field eksplisit) |
| PROCESS (select item) | Tambah `bsart` ke daftar field SELECT item EBAN |
| PROCESS approve | `MODIFY zpr_app_hist` dengan `bsart = ls_item-bsart` (dari EBAN, ganti hardcode `'ROTO'` di ~line 901 — JANGAN pakai `lv_bsart` dari frontend) |
| PROCESS reject | `MODIFY zpr_rej_hist` dengan `bsart = ls_item-bsart` (dari EBAN, ganti hardcode `'ROTO'` di ~line 944) |

### 8.2 `index.htm` — Frontend

| Perubahan | Detail |
|-----------|--------|
| Variabel global | Tambah `curBsart` (default `'ROTO'`) |
| `PR_CATEGORIES` | `{ ROTO: { label: 'PR One Time Off', ... }, RSB7: { label: 'PR Jasa', ... } }` |
| `renderSidebar` | Setiap plant: 4 link (PR One Time Off, PR Jasa, Hist App, Hist Rej) |
| `switchView` | Terima parameter `bsart`, simpan ke `curBsart` |
| `fetchList` | Kirim `bsart` param |
| `fetchHistApp/Rej` | Kirim `bsart` kosong (ambil semua kategori) |
| `renderList` | Label dinamis dari `PR_CATEGORIES[curBsart].label` |
| `renderHistTable` | Tambah kolom "Kategori" (nilai `bsart`) |
| `processAction` | TIDAK perlu kirim `bsart` — backend ambil dari EBAN item (lihat §8.1 PROCESS) |
| Title | Dinamis: "Release PR ..." |

## 8.3 Perbaikan Bug Lama yang Ikut Iterasi Ini

Keputusan 2026-06-12 atas temuan `notes/investigation.md` §3:

| Bug | Keputusan | Perbaikan |
|-----|-----------|-----------|
| §3.1 History approve mencatat semua item walau sebagian gagal release | **Fix** | Tandai per item saat loop `BAPI_REQUISITION_RELEASE`; tulis ke `zpr_app_hist` hanya item yang sukses |
| §3.5 XSS/quote-bug: `JSON.stringify(data)` ditanam ke atribut `oninput` di `renderHistTable` | **Fix** | Simpan data history ke variabel JS global (mis. `histData`), `oninput` cukup panggil `onHistSearch(this.value)` tanpa membawa data |
| §3.6 Reject tidak transaksional (history di-commit sebelum BAPI delete) | **Fix** | Balik urutan: `BAPI_REQUISITION_DELETE` dulu → jika tidak ada error type `E`, baru tulis history + satu `COMMIT WORK` → rollback manual `DELETE FROM zpr_rej_hist` tidak diperlukan lagi |
| §3.2 Pesan error approve hanya item terakhir | **Ditunda** | Tetap perilaku lama; kandidat iterasi berikutnya |

## 9. Task Checklist

### ✅ Sudah Dikonfirmasi
- [x] **BSART ROTO** = `ROTO`, **BSART Jasa** = `RSB7`
- [x] **Release code** = `P2` (sama)
- [x] **Approver** = `KMI-BOD`, **Plant** = `1200`/`1300`
- [x] **Filter ESTKZ** = MRP/Non-MRP (sama)
- [x] **History** = unified (`ZPR_APP_HIST` / `ZPR_REJ_HIST`)
- [x] **Sidebar** = setiap plant punya 4 menu (PR ROTO, PR Jasa, Hist App, Hist Rej)
- [x] **Deploy** = copy manual ke SE80

### ⏳ Persiapan di SAP
- [x] ~~[BLOCKER]~~ **TERVERIFIKASI 2026-06-12 (oleh user, langsung di SAP):** strategi release RSB7 = **single-level** (hanya `P2`) → kriteria pending `FRGKZ='X' AND FRGZU=' '` valid untuk RSB7. Kontinjensi multi-level di §12 tidak diperlukan.
- [ ] Buat tabel `ZPR_APP_HIST` di SE11 (gambar struktur di atas)
- [ ] Buat tabel `ZPR_REJ_HIST` di SE11
- [ ] Aktivasi tabel + generate maintenance dialog (opsional)
- [ ] Buat report `ZPR_MIGRATE_HIST` (lihat §7) di SE38
- [ ] Jalankan migrasi `ZROTO_*_HIST` → `ZPR_*_HIST` + verifikasi row count (output report)

### ✅ Coding — `main.htm` (SELESAI 2026-06-12)
- [x] Update TYPES (`ty_hist_app`, `ty_hist_rej`) — referensi tabel diganti ke `zpr_*_hist` (field `bsart` memang sudah ada)
- [x] Validasi `lv_bsart` di branch **GET_LIST** saja: kosong → `'ROTO'`; selain `ROTO`/`RSB7` → error `{"status":"E","message":"bsart tidak valid"}` (jangan default global)
- [x] **GET_SIDEBAR**: pending per kategori via macro `count_pending` (4x: 2 plant × 2 kategori), JSON sesuai §8.0
- [x] **GET_SIDEBAR**: ganti `zroto_app_hist` → `zpr_app_hist` (tanpa filter bsart)
- [x] **GET_SIDEBAR**: ganti `zroto_rej_hist` → `zpr_rej_hist` (tanpa filter bsart)
- [x] **GET_LIST**: `WHERE bsart = lv_bsart`
- [x] **GET_HIST_APP**: SELECT dari `zpr_app_hist` (tanpa filter bsart)
- [x] **GET_HIST_REJ**: SELECT dari `zpr_rej_hist` (tanpa filter bsart)
- [x] **GET_HIST_APP**: tambah `bsart` ke output JSON (`'"bsart":"' ls_hist_app-bsart '",'`)
- [x] **GET_HIST_REJ**: tambah `bsart` ke output JSON (`'"bsart":"' ls_hist_rej-bsart '",'`)
- [x] **TYPES `ty_eban_item`**: tambah field `bsart TYPE eban-bsart`
- [x] **PROCESS**: tambah `bsart` ke SELECT item EBAN
- [x] **PROCESS approve**: `MODIFY zpr_app_hist` + isi `bsart = ls_item-bsart` (dari EBAN, bukan param frontend)
- [x] **PROCESS approve**: history hanya item sukses release — item sukses dikumpulkan ke `lt_items_ok` (§8.3 / bug §3.1)
- [x] **PROCESS reject**: `MODIFY zpr_rej_hist` + isi `bsart = ls_item-bsart` (dari EBAN, bukan param frontend)
- [x] **PROCESS reject**: balik urutan — BAPI delete dulu, sukses baru tulis history + 1 commit (`ls_zrej`); rollback manual & `DELETE FROM` dihapus (§8.3 / bug §3.6)

### ✅ Coding — `index.htm` (SELESAI 2026-06-12)
- [x] Tambah konstanta `PR_CATEGORIES` (label/short/icon per kategori) + helper `getBsartLabel()`
- [x] Tambah variabel global `curBsart` (default `'ROTO'`)
- [x] Update `renderSidebar` → 4 menu per plant (loop `Object.keys(PR_CATEGORIES)`) + badge pending per kategori; badge total plant = jumlah semua kategori
- [x] Update pembacaan `sbCounts.pending` → nested per kategori dengan fallback `|| 0` (§8.0)
- [x] Update `switchView(plant,mode,bsart)` → simpan `curBsart` (hanya saat mode pending)
- [x] Update `fetchList` → kirim `&bsart=`
- [x] `fetchHistApp`/`fetchHistRej` → tidak kirim `bsart` (backend memang tidak filter; sama dengan "kosong = semua")
- [x] Update `renderList` → judul, teks kosong dinamis dari `PR_CATEGORIES[curBsart]`
- [x] Update `renderHistTable`/`buildHistTable` → kolom "Kategori" (badge warna beda ROTO vs RSB7, fallback `-` utk data lama tanpa bsart)
- [x] `renderHistTable` → data ke variabel global `histData`/`histType`; `oninput` hanya `onHistSearch(this.value)`; search ikut match kode/label kategori (§8.3 / bug §3.5)
- [x] ~~`processAction` kirim `bsart`~~ (dibatalkan — backend ambil dari EBAN); `curBsart` ikut disimpan/dipulihkan saat reload view pasca-proses
- [x] Title dinamis: `<title>`/brand jadi "Release PR", `document.title` di-update per view di `switchView`

### 🧪 Testing
- [ ] Sidebar: badge pending ROTO vs RSB7 terpisah
- [ ] Klik PR One Time Off → tampil PR ROTO saja
- [ ] Klik PR Jasa → tampil PR RSB7 saja
- [ ] Approve PR ROTO → masuk `ZPR_APP_HIST` dgn `bsart='ROTO'`
- [ ] Approve PR Jasa → masuk `ZPR_APP_HIST` dgn `bsart='RSB7'`
- [ ] Reject PR ROTO → masuk `ZPR_REJ_HIST` dgn `bsart='ROTO'`
- [ ] Reject PR Jasa → masuk `ZPR_REJ_HIST` dgn `bsart='RSB7'`
- [ ] History Approve: tampil data ROTO + Jasa, kolom kategori terbaca
- [ ] History Reject: tampil data ROTO + Jasa, kolom kategori terbaca
- [ ] Search/filter history masih berfungsi
- [ ] Non-approver: checkbox & FAB tidak muncul
- [ ] Approve PR multi-item dgn sebagian item gagal release → history hanya berisi item sukses (§8.3)
- [ ] Reject yang gagal di BAPI → TIDAK ada record masuk `ZPR_REJ_HIST` (§8.3)
- [ ] Reason reject berisi tanda kutip `"` / `<` / `&` → tampilan & search history tidak rusak (§8.3)
- [ ] `GET_LIST` dengan `bsart=NB` (manual via URL) → return error, bukan data (§8.1 whitelist)

## 10. Urutan Cutover (Deploy + Migrasi)

Aplikasi lama terus menulis ke `ZROTO_*_HIST` sampai file baru ter-deploy —
migrasi yang dijalankan sebelum deploy akan kehilangan transaksi di
antaranya. Urutan wajib:

1. **Kapan saja sebelum cutover:** buat & aktivasi tabel `ZPR_*` (SE11),
   buat report `ZPR_MIGRATE_HIST` (SE38), selesaikan verifikasi RSB7
   (blocker di §9 Persiapan). Tabel kosong tidak mengganggu aplikasi lama.
2. **Sesi cutover** (saat BOD tidak sedang memproses PR):
   1. **Deploy dulu** — copy `index.htm` + `main.htm` ke SE80.
      Sejak ini semua tulisan masuk `ZPR_*`; `ZROTO_*` beku.
   2. **Baru jalankan `ZPR_MIGRATE_HIST`** — sumber sudah beku, tidak ada
      transaksi nyelip. (Jika urutan terlanjur terbalik: jalankan ulang
      report setelah deploy — idempotent.)
   3. **Verifikasi:** row count dari output report + buka UI History
      (data lama tampil) + smoke test approve 1 PR.
3. **`ZROTO_*` jangan langsung di-drop** — arsip read-only 2–4 minggu
   sebagai pembanding, baru di-retire.

## 11. Standar Kode — SE80 Copy-Paste Ready (WAJIB)

Hasil coding di `ZPR_REL_BSP_up` harus bisa di-copy-paste utuh ke SE80 dan
langsung aktif tanpa error. Aturan yang mengikat semua perubahan kode:

1. **Deliverable = file utuh**, bukan diff. `index.htm` dan `main.htm` di
   `ZPR_REL_BSP_up/Page with FLow Logic/` selalu dalam keadaan final —
   copy seluruh isi file → paste ke layout page di SE80 → activate.
2. **ABAP klasik saja** (kompatibel NetWeaver lama, gaya sama dengan kode
   existing): TIDAK memakai sintaks 7.40+ — tanpa `DATA(...)` inline,
   tanpa string template `|...|`, tanpa `VALUE #( )` / `NEW` / `COND` /
   `line_exists( )` / `->*`. Hanya `DATA`, `CONCATENATE`, `LOOP`, `READ
   TABLE ... WITH KEY`, macro `DEFINE`, seperti yang sudah ada.
3. **Deklarasi variabel unik** — BSP page = satu method besar; `DATA` yang
   sama tidak boleh dideklarasi dua kali di branch `WHEN` berbeda
   (syntax error). Cek duplikasi nama sebelum menambah deklarasi baru.
4. **Objek implisit BSP dipertahankan**: `request`, `response`,
   `_m_navigation`, header `<%@page language="abap"%>`, pola
   `response->append_cdata( )` + `_m_navigation->response_complete( )`.
5. **Frontend vanilla** — tanpa library eksternal/CDN, tanpa sintaks ES6+
   yang berisiko (tetap `var`, string concatenation, gaya kode existing).
6. **Urutan aktivasi di SE80**: tabel `ZPR_APP_HIST` & `ZPR_REJ_HIST` HARUS
   sudah dibuat & aktif di SE11 **sebelum** paste `main.htm` — kode
   mereferensi tabel ini di TYPES/SELECT/MODIFY; tanpa tabel, syntax check
   gagal. Urutan: SE11 tabel → SE38 report migrasi → SE80 paste page.
7. Setiap selesai satu blok perubahan, lakukan **self-review syntax**
   (simulasi syntax check: deklarasi, tipe, panjang nama ≤30, koma/titik
   ABAP) sebelum menyerahkan file ke user.

## 12. Catatan Penting

- **Jangan ubah `ZPR_REL_BSP`** — itu baseline original.
- Parameter `lv_bsart` sudah ada di `main.htm` line 20 — tinggal dipakai.
- Untuk multi-level release strategy, lihat `notes/investigation.md` §6.2.
- **Kontinjensi:** jika verifikasi SE16/OMGQ menunjukkan RSB7 multi-level,
  kriteria pending `FRGZU=' '` TIDAK valid — ganti dengan cek "kode `P2`
  belum ditekan" (mis. `BAPI_REQUISITION_GETRELINFO` atau pemetaan posisi
  karakter `FRGZU`), dan plan ini harus direvisi sebelum coding.
