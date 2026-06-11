# Catatan Investigasi & Ide Reuse

Catatan teknis hasil bedah `ZPR_REL_BSP/Page with FLow Logic/{index.htm,
main.htm}`. Berisi temuan, potensi isu, hal yang perlu dikonfirmasi, dan ide
untuk dipakai ulang di kategori PR lain.

## 1. Pola Arsitektur yang Bisa Direplikasi Langsung

Pola ini cukup generic dan bisa jadi **template** untuk kategori PR lain:

- **2-file BSP**: 1 file UI (`index.htm`, render sekali, semua interaksi via
  JS) + 1 file "API" (`main.htm`, ABAP murni, return JSON via
  `response->append_cdata`).
- **Routing via query param `action`**: `CASE lv_action` di `main.htm` —
  mudah ditambah action baru.
- **Macro ABAP reusable**:
  - `escape_json` — escape string untuk JSON manual.
  - `fmt_date` — format `YYYYMMDD` → `DD.MM.YYYY`.
- **State management di JS**: variabel global (`allData`, `selBanfns`,
  `curPage`, `searchKw`, dst.) + fungsi `render*()` yang membangun ulang
  `innerHTML`. Tidak ada framework — cukup portable untuk di-copy ke proyek
  BSP lain.
- **Pola "sequential batch action"** (`processAction`/`doNext`) untuk approve/
  reject banyak dokumen satu per satu dengan progress indicator — bagus untuk
  dipakai ulang karena BAPI per-item kadang perlu enqueue/lock yang sebaiknya
  tidak diparalelkan.
- **Pola sidebar dengan badge counter** per plant/kategori, dengan endpoint
  ringan terpisah (`GET_SIDEBAR`) supaya tidak perlu load semua data di awal.

## 2. Hal yang Hardcode & Perlu Diparameterisasi (lihat juga business-process.md §10)

- `BSART = 'ROTO'` — muncul di `GET_SIDEBAR`, `GET_LIST`.
- Plant `1200`/`1300` — hardcode di `GET_SIDEBAR` (4x SELECT terpisah) dan di
  `index.htm` (`PLANT_LABELS`, `renderSidebar` array `plants`).
- `lv_uname = 'KMI-BOD'` — single approver hardcode.
- `rel_code = 'P2'` — release code untuk approve.
- Nama tabel custom `ZROTO_APP_HIST` / `ZROTO_REJ_HIST` — hardcode di
  beberapa `TYPES` dan `MODIFY`/`SELECT`.

> Saran saat membuat versi untuk kategori lain: jadikan `BSART`, daftar
> plant, release code, dan nama tabel history sebagai **konstanta di satu
> tempat** (atau parameter URL/config table `Z*` tersendiri), supaya 1 set
> kode bisa dipakai untuk banyak kategori PR dengan konfigurasi berbeda.

## 3. Potensi Bug / Hal yang Perlu Diverifikasi ke Tim/Functional

1. **History approve dicatat untuk SEMUA item, bukan hanya yang sukses
   release** (`main.htm` ~baris 895-915):
   ```abap
   IF lv_ap_ok > 0.
     ...
     LOOP AT lt_items INTO ls_item.   " <- loop SEMUA item
       ... MODIFY zroto_app_hist FROM ls_zapp.
     ENDLOOP.
   ```
   Jika PR punya 3 item dan hanya 2 yang berhasil di-release (1 gagal karena
   misal `release_already_posted`), maka `ZROTO_APP_HIST` tetap mencatat 3
   item sebagai "approved". Perlu dikonfirmasi apakah ini **by design**
   (karena BAPI biasanya all-or-nothing per PR) atau **bug** yang berpotensi
   membuat history tidak akurat.

2. **Pesan error approve hanya menyimpan error dari item TERAKHIR yang
   gagal** (`lv_ap_err` di-overwrite tiap iterasi loop, tidak diakumulasi).
   Jika beberapa item gagal dengan alasan berbeda, user hanya melihat 1
   pesan.

3. **`fmtAmt` untuk currency "zero decimal" (IDR/JPY/KRW/VND) dikalikan 100**
   (`index.htm`, fungsi `fmtAmt`):
   ```js
   if (zd) return Math.round(n*100).toLocaleString('id-ID', ...);
   ```
   Ini mengasumsikan nilai `preis`/`total` dari SAP untuk currency tsb
   disimpan **sudah dalam representasi dengan 2 desimal tersembunyi** (umum
   terjadi karena field `EBAN-PREIS`/`KBETR` dsb secara internal punya
   `DECIMALS 2` walau currency-nya 0-decimal). **Perlu dikonfirmasi ke tim**
   apakah asumsi `x100` ini selalu benar, terutama jika dipakai ulang untuk
   tabel/field lain yang representasinya berbeda.

4. **`lt_makt` di-SELECT tapi tidak dipakai di `GET_LIST`** (`main.htm`
   ~baris 379-384) — deskripsi material untuk list diambil dari `txz01`
   (free text PR), bukan `maktx`. `maktx` baru benar-benar dipakai di
   `GET_DETAIL`. Ini bukan bug fatal (hanya SELECT yang sia-sia di
   `GET_LIST`), tapi bisa dibersihkan saat refactor.

5. **Embed `JSON.stringify(data)` langsung ke atribut HTML `oninput`**
   (`index.htm`, fungsi `renderHistTable`):
   ```js
   ' oninput="onHistSearch(this.value,'+JSON.stringify(data)+',"'+type+'")"'
   ```
   - Ada **bug syntax**: urutan tanda kutip tampak salah —
     `,"'+type+'")` akan menghasilkan string literal `"reject"` atau
     `"approve"` tapi dengan kombinasi quote yang berpotensi **invalid HTML
     attribute** jika `data` mengandung karakter tertentu. Karena `escHtml`
     **tidak** diterapkan ke hasil `JSON.stringify(data)`, jika ada nilai
     string di data history yang mengandung karakter `"` (misal `reason`
     hasil reject yang mengandung tanda kutip ganda), ini berpotensi
     **merusak HTML / inject atribut/JS lain** (mirip celah XSS) karena
     `reason` di backend hanya di-`escape_json` (escape untuk konteks JSON),
     bukan di-escape untuk konteks atribut HTML.
   - **Rekomendasi**: untuk versi baru, jangan embed data mentah ke atribut
     HTML — simpan data history di variabel JS global (seperti `allData`)
     dan akses lewat closure/referensi, bukan string interpolation ke DOM.

6. **Rollback reject tidak benar-benar transaksional** — `ZROTO_REJ_HIST`
   di-`COMMIT WORK AND WAIT` **sebelum** `BAPI_REQUISITION_DELETE` dipanggil.
   Jika ada error di antara commit history dan panggilan BAPI delete (misal
   short dump), history sudah permanen tapi PR belum ter-delete — kondisi
   ini di-mitigasi dengan `DELETE FROM zroto_rej_hist` manual jika BAPI
   mengembalikan error eksplisit, tapi **tidak menutup race window** untuk
   error lain (dump, timeout, dsb). Untuk reuse, pertimbangkan urutan:
   panggil BAPI dulu (tanpa commit) → jika sukses baru tulis history → commit
   sekaligus (satu LUW).

7. **Tidak ada paging/limit di `SELECT` `EBAN`** untuk `GET_LIST` — semua PR
   pending per plant ditarik sekaligus (lalu paging dilakukan di client).
   Untuk volume besar ini bisa jadi masalah performa; pertimbangkan paging
   server-side untuk kategori PR dengan volume tinggi.

8. **Validasi `lv_banfn`** di `GET_DETAIL`/`PROCESS` hanya `lv_banfn IS
   INITIAL` — tidak ada validasi format/leading zero. `lv_banfn_e TYPE
   eban-banfn` (konversi implisit string → numeric char) — perlu pastikan
   input dari `encodeURIComponent` di JS selalu menghasilkan format yang
   sesuai (10 digit numeric).

## 4. Pertanyaan untuk User (untuk mempercepat pemahaman fitur berikutnya)

Untuk membantu merancang fitur "kategori PR lain" berikutnya, akan sangat
membantu jika dijawab:

1. **Kategori PR apa** yang akan dibuat berikutnya? (Document type/`BSART`
   apa, dan apakah polanya sama persis: 1 level approval BOD, atau
   multi-level?)
2. Apakah **approver** untuk kategori baru juga 1 user tunggal seperti
   `KMI-BOD`, atau perlu role/group/multi-user?
3. Apakah **plant** yang terlibat sama (`1200`/`1300`), bertambah, atau
   berbeda total?
4. Apakah perlu **filter ESTKZ** seperti ROTO (MRP/Non-MRP), atau kategori
   baru punya filter lain yang lebih relevan (misal per `EKGRP`, range
   tanggal, dsb.)?
5. Apakah tabel history (`ZROTO_APP_HIST`/`ZROTO_REJ_HIST`) akan **dibuat
   ulang per kategori** (mis. `ZXXX_APP_HIST`) atau ingin dibuat **satu
   tabel generik** dengan kolom tambahan `kategori`/`bsart`?
6. Untuk **release code** (`P2`) — apakah kategori baru punya kode release
   sendiri yang sudah ditentukan di release strategy SAP-nya, dan apakah
   prosesnya tetap **single release** (1x `BAPI_REQUISITION_RELEASE`) atau
   **multi-step** (beberapa kode release berurutan)?
7. Soal temuan #1 dan #2 di atas (history dicatat utk semua item walau
   sebagian gagal release, dan pesan error hanya item terakhir) — apakah ini
   perilaku yang **diinginkan untuk dipertahankan**, atau perlu diperbaiki
   pada implementasi baru?
8. Apakah ada kebutuhan **export** (Excel/PDF) untuk daftar PR/history pada
   fitur baru? (Belum ada di kode existing.)

## 5. Item Open / TODO Investigasi Lanjutan

- [ ] Cek isi tabel `ZROTO_APP_HIST` & `ZROTO_REJ_HIST` di SAP (struktur field
  lengkap, domain/data element) untuk memastikan tipe data yang dipakai saat
  bikin tabel custom baru.
- [ ] Cek release strategy PR `ROTO` di transaksi `OMGQ` — konfirmasi makna
  `FRGKZ='X'`/`FRGZU=' '` dan kode release `P2` di environment KMI.
- [ ] Konfirmasi representasi `PREIS`/currency 0-desimal (poin #3) dengan
  cek beberapa data riil PR ROTO currency `IDR` vs `USD`.
- [ ] Cek apakah ada Web Dynpro/transaksi lain yang juga memproses
  `ZROTO_APP_HIST`/`ZROTO_REJ_HIST` (untuk tahu apakah tabel ini "milik"
  aplikasi ini sepenuhnya atau dipakai bersama report lain).
