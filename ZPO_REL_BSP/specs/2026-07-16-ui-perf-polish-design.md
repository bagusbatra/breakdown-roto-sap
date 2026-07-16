# Desain: Optimalisasi Performa & UI Polish — ZPO_REL_BSP

**Tanggal:** 2026-07-16
**Target file:** `ZPO_REL_BSP/Page with FLow Logic/main.htm` (satu-satunya file yang diubah)
**Pendekatan terpilih:** A — Paket terpadu (perf + polish halus dalam satu revisi)

## Aturan Kerja (mengikat)

1. Hanya file di direktori `ZPO_REL_BSP` yang boleh dibaca/diubah.
2. **Logika program tidak berubah sama sekali**: seluruh ABAP page script (baris 1–1343), semua endpoint/action, parameter POST, format angka, dan alur fungsional tetap identik.
3. Hasil akhir tetap satu file `main.htm` utuh, siap copy-paste ke SE80. ABAP klasik tanpa sintaks 7.40+ (bagian ABAP tidak disentuh).
4. Gaya JS mengikuti kode existing: `var`, function declaration, tanpa arrow function / template literal / `let`/`const`.

## Bagian 1 — Optimalisasi Performa

Prinsip: output HTML & perilaku 100% identik; hanya jalur komputasi yang dipercepat.

### 1a. Index map item & remark
- Fungsi baru `buildDataIndexes()`: satu loop `ALL_DATA2` mengisi
  `ITEM_INDEX` (`ebeln → array item`) dan `REMARK_INDEX` (`ebeln → teks remark
  non-kosong pertama`, logika sama persis dengan `getRemarkForPO` sekarang).
- `getItemsForPO(ebeln)` → `return ITEM_INDEX[ebeln] || [];`
  `getRemarkForPO(ebeln)` → `return REMARK_INDEX[ebeln] || '';`
  Signature tetap; semua pemanggil tidak berubah.
- Dipanggil saat init dan di-rebuild sekali setelah bulk action sukses
  (setelah `ALL_DATA1`/`ALL_DATA2` difilter di callback `submitAction`).

### 1b. Cache count sidebar
- Fungsi baru `buildSidebarCounts()`: satu loop `ALL_DATA1` menghasilkan
  `SIDEBAR_COUNTS = { byPlant: {…}, byBsart: {…} }`.
- `countByBsart()` dan `countTotalByPlant()` tetap ada, membaca cache
  (jumlah = penjumlahan `byBsart` per daftar bsart — hasil identik dengan
  filter sekarang).
- Invalidasi/rebuild: hanya setelah bulk action sukses (satu-satunya titik
  mutasi data), bersamaan dengan 1a.

### 1c. Badge history tanpa re-render sidebar penuh
- `loadHistoryCounts()` saat ini memanggil `renderSidebar()` penuh per respons.
- Elemen badge release/reject diberi `id` stabil (`sbCntRel_1200`, dst.) di
  HTML yang digenerate `renderSidebar()`.
- Callback `loadHistoryCounts()`: jika elemen badge ada → update
  `textContent`/visibilitas saja; jika belum ada (sidebar belum render) →
  fallback `renderSidebar()` seperti sekarang.
- Catatan: badge dengan count 0 kini dirender dengan `display:none` (bukan
  tidak dirender) agar bisa dimunculkan tanpa re-render. Tampilan akhir sama.

### 1d. Lazy render detail kartu
- `renderCardListOnly()` merender `card-detail` kosong dengan atribut
  `data-rendered=""`.
- Fungsi baru `ensureCardDetail(ebeln)`: saat kartu pertama kali di-expand
  (dipanggil dari `toggleCard` dan `expandAll`), render isi detail (tabel item
  + add-info, markup persis seperti sekarang) lalu set `data-rendered="1"`.
- Modal detail (`openModal`) tidak berubah (sudah on-demand).

## Bagian 2 — UI/UX Polish

Prinsip: identitas visual dipertahankan (palet `--primary #1a56db`, DM Sans /
DM Mono, kartu putih radius 12px). Perubahan hanya di CSS + layer render JS.

### 2a. Feedback seleksi
- Class `.po-card.selected` (border + background `--primary-lt` tipis),
  di-toggle oleh handler `onchange` checkbox dan oleh `toggleAll()`.
- Klik pada area `card-top` (selain nomor PO, chevron, dan checkbox itu
  sendiri) men-toggle checkbox — memperbesar area klik.
- Chip counter di FAB: elemen baru `#fabCount` menampilkan
  `N dipilih · <total per currency>` (perhitungan memakai logika totals yang
  sudah ada di `submitAction`, diekstrak ke helper `computeSelectedTotals()`
  yang dipakai keduanya). Update dipicu setiap perubahan checkbox.
- Saat 0 terpilih: chip redup, tombol Release/Reject diberi class visual
  disabled. Guard `alert('Select at least one PO.')` existing tetap ada.

### 2b. Dialog konfirmasi custom
- Komponen modal konfirmasi baru (`#confirmModal`, reuse pola `.modal`):
  judul, body (ringkasan N PO + tabel total per currency), tombol Batal +
  tombol aksi (hijau untuk Release, merah untuk Reject).
- API JS: `showConfirm(opts, onYes)` — generik, dipakai untuk:
  - konfirmasi BULK_REL / BULK_REJ (menggantikan `confirm(msg)`);
  - konfirmasi logout (menggantikan `confirm('Yakin ingin logout?')`).
- `onYes` menjalankan kode submit existing tanpa perubahan.
- `alert()` untuk validasi ("Select at least one PO.", "Please enter a reject
  reason.", error parsing/network) diganti `showToast('E', …)` — pesan sama.

### 2c. Toast & transisi
- Toast: animasi keluar (slide+fade) sebelum remove; ikon lingkaran ✓/✗;
  progress bar tipis berdurasi 4 detik (durasi auto-hide tidak berubah).
- Expand/collapse `card-detail`: fade + slide ringan murni CSS
  (`opacity`/`transform`), menggantikan lompatan `display:none → block`.
- `:focus-visible` ring konsisten (outline `--primary`) untuk tombol, input,
  select, link sidebar.

### 2d. Detail kecil
- Skeleton shimmer untuk state loading history (pengganti spinner polos).
- Empty state hasil search: tombol "Bersihkan pencarian" (clear input +
  render ulang).
- Scrollbar tipis custom (WebKit) untuk sidebar & modal.
- Hover kartu: shadow lebih lembut + `translateY(-1px)`.

## Yang Sengaja TIDAK Diubah

- Seluruh ABAP (baris 1–1343): semua action handler, query, serialisasi JSON.
- Layout header/sidebar/main, struktur toolbar, pagination.
- Alur history & OGR (termasuk flag `ENABLE_OGR = false`).
- Endpoint, nama parameter POST, format tanggal/angka, logika filter/search.
- Perilaku popstate/init/logout redirect.

## Penanganan Error & Kompatibilitas

- Semua fungsi lama dipertahankan namanya — tidak ada pemanggil yang rusak.
- Index/cache selalu di-rebuild pada titik mutasi data yang sama; tidak ada
  jalur data baru.
- JS tetap ES5-style konsisten dengan kode existing.

## Verifikasi

Checklist manual setelah paste ke SE80 (tidak ada test otomatis untuk BSP):
1. Buka tiap potype di kedua plant → daftar kartu tampil, count sidebar sama
   seperti sebelum perubahan.
2. Expand satu kartu & Expand All → tabel item + remark muncul benar.
3. Search, page size, pagination → hasil identik.
4. Centang beberapa PO → highlight kartu + counter FAB akurat.
5. Bulk Release & Bulk Reject (dengan dialog baru) → PO terproses hilang,
   sidebar count ter-update, index ter-rebuild (expand kartu lain tetap benar).
6. History Release/Reject: filter tanggal, search, pagination, expand item.
7. Logout dengan dialog baru.
8. Badge history hari ini muncul setelah load tanpa flicker sidebar.
