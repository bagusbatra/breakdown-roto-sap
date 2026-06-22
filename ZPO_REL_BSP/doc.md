# Dokumentasi Program ZPO_REL_BSP — PO Release System

## 1. Informasi Umum

| Atribut | Deskripsi |
|---|---|
| **Nama Program** | ZPO_REL_BSP |
| **Jenis** | BSP Application (Business Server Page) SAP |
| **Perusahaan** | PT. Kayu Mebel Indonesia |
| **Fungsi Utama** | Release dan Reject Purchase Order (PO) secara massal (bulk) berbasis web |
| **Plant** | 1200 (Surabaya) dan 1300 (Semarang) |
| **Teknologi** | ABAP (backend), HTML/CSS/JavaScript (frontend) — Single Page Application |

---

## 2. Struktur File

```
ZPO_REL_BSP/
├── Page with FLow Logic/
│   └── main.htm              # Halaman utama (single-page) — 4085 baris
└── MIMEs/
    ├── background.png         # Gambar latar halaman awal
    ├── logo.png               # Logo perusahaan di header
    ├── surabaya.png           # Ikon plant Surabaya (1200)
    └── semarang.png           # Ikon plant Semarang (1300)
```

---

## 3. Arsitektur Aplikasi

Aplikasi ini adalah **BSP Application** SAP dengan arsitektur **single-page application (SPA)**. Semua logika backend (ABAP) dan frontend (HTML/JS) berada dalam satu file utama `main.htm`.

### 3.1 Alur Kerja Umum

1. **Inisialisasi**: Server ABAP menjalankan script page (tag `<%@page language="abap"%>`) yang memuat data dari dua function module:
   - `Z_FM_YMMR068` untuk plant `1200` (Surabaya)
   - `Z_FM_YMMR068` untuk plant `1300` (Semarang)
2. Data PO (header & item) diserialisasi ke JSON dan di-inject ke JavaScript sebagai `ALL_DATA1` (header) dan `ALL_DATA2` (item).
3. Halaman HTML dirender dengan sidebar navigasi dan area konten utama.
4. Semua interaksi pengguna (filter, search, expand, submit) ditangani oleh JavaScript client-side.
5. Aksi seperti **Bulk Release** dan **Bulk Reject** dikirim ke server via `XMLHttpRequest` (fetch) sebagai `POST` ke `main.htm` yang sama dengan parameter `action`.

---

## 4. Komponen Backend (ABAP)

### 4.1 Data Utama

**Function Module**: `Z_FM_YMMR068`

Dipanggil dua kali saat inisialisasi untuk mengambil data PO:
- Parameter: `P_WERKS = '1200'` → menyimpan ke `lt_data1_1200`, `lt_data2_1200`
- Parameter: `P_WERKS = '1300'` → menyimpan ke `lt_data1_1300`, `lt_data2_1300`

Data digabung ke `lt_data1` (header) dan `lt_data2` (item) lalu diserialisasi ke JSON.

**Tipe data terkait**:
- `ztymmr068` — struktur header PO
- `ztymmr068po` — struktur item PO

### 4.2 Actions (Dikirim via parameter `action` dari form POST)

#### 4.2.1 `GET_HISTORY_REL` — Riwayat Release

- **Tujuan**: Mengambil histori PO yang sudah direlease (via tcode ME28 / ME29N)
- **Input**:
  - `werks` — plant
  - `date_from` / `date_to` — rentang tanggal
  - `search` — kata kunci pencarian (PO number atau nama vendor)
  - `offset` / `limit` — pagination
- **Logika**:
  1. `SELECT` dari tabel `cdhdr` (change document header) untuk object class `EINKBELEG` dengan tcode = `ME28` atau `ME29N`
  2. `SELECT` dari `cdpos` (change document item) pada tabname `EKKO` dengan field `FRGZU` atau `FRGKE` (release strategy fields)
  3. Join ke `ekko` (header PO) dan `ekpo` (item PO) untuk detail, `lfa1` untuk nama vendor
  4. Filter berdasarkan plant (`werks`) dan teks pencarian
- **Output**: JSON array dengan field: `ebeln`, `bsart`, `lifnr`, `name1`, `werks`, `frgco`, `uname`, `udate`, `utime`

#### 4.2.2 `GET_HISTORY_REJ` — Riwayat Reject

- **Tujuan**: Mengambil histori PO yang di-reject (PROCSTAT = '08')
- **Input**: Sama dengan `GET_HISTORY_REL`
- **Logika**:
  1. `SELECT` dari `cdhdr` semua tcode (tidak difilter tcode tertentu)
  2. `SELECT` dari `cdpos` dengan `fname = 'PROCSTAT'` dan `value_new = '08'`
  3. Sama seperti release, join ke tabel terkait
  4. **Tambahan**: Membaca teks komentar reject menggunakan function module `READ_TEXT` dengan object `EKKO`, ID `F01`
- **Output**: JSON array dengan field: `ebeln`, `bsart`, `lifnr`, `name1`, `werks`, `uname`, `udate`, `utime`, `comment`

#### 4.2.3 `GET_HISTORY_COUNT` — Jumlah Riwayat (untuk badge sidebar)

- **Tujuan**: Menghitung jumlah release dan reject hari ini per plant untuk ditampilkan di badge sidebar
- **Input**: `werks`, `date_from`, `date_to`
- **Logika**: Sama dengan query release dan reject, tetapi hanya menghitung jumlah
- **Output**: JSON `{ count_rel: N, count_rej: N }`

#### 4.2.4 `GET_HISTORY_ITEMS` — Item Detail PO Riwayat

- **Tujuan**: Mengambil item-item dari satu atau beberapa PO untuk ditampilkan di detail kartu riwayat
- **Input**: `ebelns` — daftar nomor PO dipisah koma
- **Logika**:
  1. Parse daftar ebeln
  2. `SELECT` dari `ekpo` (filter `loekz NE 'L'`)
  3. `SELECT` dari `ekko` untuk currency
  4. `SELECT` dari `makt` untuk deskripsi material
- **Output**: JSON array dengan field: `ebeln`, `ebelp`, `matnr`, `txz01`, `maktx`, `menge`, `meins`, `netpr`, `netwr`, `waers`

#### 4.2.5 `GET_OGR` — Outstanding Goods Receipt

- **Tujuan**: Menampilkan PO yang sudah full release (`frgke = 'R'`) tapi belum ada penerimaan barang (GR)
- **Input**: `werks`
- **Logika**:
  1. Tentukan daftar `bsart` yang relevan per plant:
     - Plant 1200: `PSB7`, `POK1`, `PSB1`, `PSB3`, `PSB4`, `PSB2`, `PSB8`, `PSB9`, `PSBT`, `PSB5`, `PSB6`, `PSBI`, `POK9`
     - Plant 1300: `PSM7`, `PSM1`, `PSM3`, `PSM4`, `PSM2`, `PSM8`, `PSM9`, `PSMT`, `PSM5`, `PSM6`, `PSMI`, `POK9`
  2. `SELECT` dari `ekko` JOIN `ekpo` dengan kondisi:
     - `frgke = 'R'` (sudah release penuh)
     - `bsart` dalam daftar KMI
     - `bedat >= '20260101'`
     - `loekz NE 'L'` (tidak didelete)
     - `elikz = ' '` (belum GR final)
  3. Cek `ekbe` untuk movement type GR (`101`, `103`, `105`, `107`) — item yang sudah ada GR dihapus
  4. Ambil nama vendor dari `lfa1`
  5. Baca teks item dari `READ_TEXT` object `EKPO` ID `F01`
- **Output**: JSON data array dengan field: `ebeln`, `ebelp`, `bsart`, `bedat`, `lifnr`, `name1`, `werks`, `matnr`, `txz01`, `menge`, `meins`, `netpr`, `waers`

#### 4.2.6 `BULK_REL` — Release Massal

- **Tujuan**: Me-release beberapa PO sekaligus
- **Input**:
  - `plant`, `potype`
  - `po_selected_1`, `po_selected_2`, ... — PO yang dipilih (maks 500)
- **Logika**:
  1. Loop setiap PO yang dipilih
  2. Panggil **`Z_PO_RELEASE2`** dengan parameter:
     - `purchaseorder` = nomor PO
     - `po_rel_code` = release code dari data header
  3. Jika ada error (type 'E' atau 'A'), hentikan proses dan kirim pesan error
  4. Jika sukses semua, panggil `BAPI_TRANSACTION_COMMIT`
- **Output**: JSON `{ status, message, processed: [...] }`

#### 4.2.7 `BULK_REJ` — Reject Massal

- **Tujuan**: Menolak beberapa PO sekaligus dengan alasan
- **Input**:
  - `plant`, `potype`
  - `comment` — alasan reject (wajib diisi)
  - `po_selected_1`, `po_selected_2`, ... — PO yang dipilih
- **Logika**:
  1. Loop setiap PO yang dipilih
  2. Panggil **`Z_PO_COMMENT_UPDATE`** untuk menyimpan komentar reject:
     - `purchaseorder`, `comment_text`, `text_id = 'F01'`, `header_level = 'X'`, `item_number = '00000'`
  3. Panggil **`Z_PO_REJECT`** untuk melakukan reject
  4. Periksa return type 'E' atau 'A' untuk error
- **Output**: JSON `{ status, message, processed: [...] }`

### 4.3 Daftar Function Module / BAPI Eksternal

| Function Module | Kegunaan |
|---|---|
| `Z_FM_YMMR068` | Mengambil data PO (header & item) per plant |
| `Z_PO_RELEASE2` | Me-release PO (menggunakan release code) |
| `Z_PO_REJECT` | Menolak PO |
| `Z_PO_COMMENT_UPDATE` | Menyimpan komentar/text pada PO |
| `BAPI_TRANSACTION_COMMIT` | Commit database SAP |
| `READ_TEXT` | Membaca teks (komentar) dari PO/item |

---

## 5. Komponen Frontend (JavaScript)

### 5.1 Struktur Data JavaScript

| Variabel | Sumber | Deskripsi |
|---|---|---|
| `ALL_DATA1` | `lt_data1` → JSON | Array header PO: `ebeln`, `bsart`, `name1`, `stats`, `totpr`, `waerk`, `frgco`, `plant` |
| `ALL_DATA2` | `lt_data2` → JSON | Array item PO: `ebeln`, `ebelp`, `maktx`, `menge`, `meins`, `nettt`, `netwr`, `waerk`, `text` |
| `POTYPE_MAP` | Hardcoded | Mapping tipe PO per plant (berdasarkan bsart) |
| `BSART_POTYPE_MAP` | Generated | Reverse lookup bsart → potype, warna, label |

### 5.2 Mapping PO Type per Plant

#### Plant 1200 — Surabaya

| Kategori | Label | Bsart |
|---|---|---|
| `JASA` | PO Jasa | `PSB7` |
| `JASA_PROD` | PO Jasa Production | `POK1` |
| `BAHAN` | PO Bahan Baku | `PSB1`, `PSB3`, `PSB4` |
| `PENUNJANG` | PO Bahan Baku Penunjang | `PSB2` |
| `SPAREPART` | PO Sparepart & Tools | `PSB8`, `PSB9`, `PSBT` |
| `UTILITY` | PO Bahan Penunjang & Utility | `PSB5`, `PSB6` |
| `EXIM` | PO Exim | `PSBI`, `POK9` |

#### Plant 1300 — Semarang

| Kategori | Label | Bsart |
|---|---|---|
| `JASA` | PO Jasa | `PSM7` |
| `BAHAN` | PO Bahan Baku | `PSM1`, `PSM3`, `PSM4` |
| `PENUNJANG` | PO Bahan Baku Penunjang | `PSM2` |
| `SPAREPART` | PO Sparepart & Tools | `PSM8`, `PSM9`, `PSMT` |
| `UTILITY` | PO Bahan Penunjang & Utility | `PSM5`, `PSM6` |
| `EXIM` | PO Exim | `PSMI`, `POK9` |

### 5.3 Warna PO Type

| Kategori | Warna | Background |
|---|---|---|
| Jasa / Jasa Production | `#7c3aed` | `#ede9fe` |
| Bahan Baku | `#057a55` | `#def7ec` |
| Bahan Penunjang | `#0369a1` | `#e0f2fe` |
| Sparepart & Tools | `#b45309` | `#fef3c7` |
| Utility | `#0891b2` | `#cffafe` |
| Exim | `#c81e1e` | `#fde8e8` |

### 5.4 Fungsi JavaScript Utama

#### Navigasi & Sidebar
| Fungsi | Deskripsi |
|---|---|
| `renderSidebar()` | Render sidebar dinamis: plant, tipe PO, history, outstanding GR |
| `switchView(plant, potype)` | Beralih ke tampilan daftar PO berdasarkan plant & tipe |
| `switchHistory(plant, mode)` | Beralih ke tampilan histori (release/reject) |
| `switchOGR(plant)` | Beralih ke tampilan Outstanding GR |
| `toggleSection(plantCode)` | Expand/collapse section plant di sidebar |
| `toggleHistSection(plantCode)` | Expand/collapse history section |
| `loadHistoryCounts(plantCode)` | Memuat jumlah release/reject hari ini via `GET_HISTORY_COUNT` |

#### Daftar PO (Main View)
| Fungsi | Deskripsi |
|---|---|
| `renderCards(data, plant, potype)` | Render toolbar + container kartu PO |
| `renderCardListOnly()` | Render daftar kartu PO dengan filter, search, pagination |
| `getFilteredData()` | Filter data berdasarkan search input |
| `getPageData(data)` | Ambil data untuk halaman tertentu |
| `toggleCard(ebeln)` | Expand/collapse kartu PO |
| `expandAll()` / `collapseAll()` | Expand/collapse semua kartu |
| `toggleAll()` | Select/deselect semua checkbox |
| `changePageSize(size)` | Ubah jumlah item per halaman |
| `goToPage(page)` | Navigasi ke halaman tertentu |
| `onSearchChange()` | Handler search input dengan debounce 200ms |
| `openModal(ebeln)` | Buka modal detail PO |
| `closeModal()` | Tutup modal detail PO |

#### Riwayat (History View)
| Fungsi | Deskripsi |
|---|---|
| `loadHistory()` | Fetch data riwayat dari server (REL / REJ) |
| `renderHistoryPage()` | Render halaman riwayat dengan filter bar, kartu, pagination |
| `renderHistPagination()` | Render pagination riwayat |
| `loadHistoryItems(ebelns, callback)` | Fetch item detail PO riwayat dengan cache |
| `renderHistItemTable(items, waers)` | Render tabel item PO pada kartu riwayat |
| `toggleHistCard(cardId, ebeln)` | Expand kartu riwayat + load items |
| `onHistDateChange()` | Handler perubahan filter tanggal |
| `applyHistFilter()` | Terapkan filter dan reload |
| `onHistSearchInput(val)` | Handler search riwayat dengan debounce 400ms |
| `histGoPage(pg)` | Pagination riwayat |

#### Outstanding GR (OGR View)
| Fungsi | Deskripsi |
|---|---|
| `loadOGR(plant)` | Fetch data OGR dari server |
| `renderOGRPage(plant, data)` | Render halaman OGR: summary cards, toolbar, kartu PO |
| `ogrGetFiltered()` | Filter & group data OGR berdasarkan search & potype filter |
| `ogrRenderCards(order, grouped)` | Render kartu PO OGR dengan pagination |
| `ogrRenderPagination(totalPOs)` | Render pagination OGR |
| `ogrToggleCard(cardId)` | Expand/collapse kartu OGR |
| `ogrExpandAll()` / `ogrCollapseAll()` | Expand/collapse semua kartu OGR |
| `onOgrSearch(val)` | Search OGR dengan debounce 300ms |
| `onOgrPotypeFilter(val)` | Filter OGR berdasarkan potype |
| `onOgrPageSize(val)` | Ubah page size OGR |
| `ogrGoPage(pg)` | Navigasi halaman OGR |
| `ogrGetTotalPOs()` | Hitung jumlah unique PO |

#### Aksi (Bulk Action)
| Fungsi | Deskripsi |
|---|---|
| `submitAction(action)` | Submit bulk release/reject via XHR |
| `showToast(type, message)` | Tampilkan notifikasi toast |
| `doLogout()` | Logout dari SAP |
| `toggleUserMenu()` | Tampilkan/sembunyikan menu user |

#### Utility
| Fungsi | Deskripsi |
|---|---|
| `todayStr()` | Ambil tanggal hari ini format YYYYMMDD |
| `toInputDate(dats)` | Konversi YYYYMMDD → YYYY-MM-DD (input date) |
| `fromInputDate(val)` | Konversi YYYY-MM-DD → YYYYMMDD |
| `formatDate(dats)` | Format DD/MM/YYYY |
| `formatTime(tims)` | Format HH:MM:SS |
| `escHtml(s)` | Escape HTML entities |
| `parseAbapNum(rawStr)` | Parse angka ABAP (dengan pemisah ribuan) ke float |
| `formatAmount(rawStr, currency)` | Format jumlah uang |
| `formatNum(rawStr, currency)` | Format angka umum |
| `formatNumHist(rawStr, currency)` | Format angka untuk riwayat (dari DB langsung) |
| `getItemsForPO(ebeln)` | Ambil item-item dari suatu PO dari ALL_DATA2 |
| `getRemarkForPO(ebeln)` | Ambil teks remark PO |

---

## 6. UI / Komponen Tampilan

### 6.1 Header
- Tombol toggle sidebar (hamburger menu)
- Logo perusahaan
- Nama aplikasi "Release PO" dan subjudul "PT. Kayu Mebel Indonesia"
- User info: username SAP, avatar (inisial), dropdown menu dengan tombol logout

### 6.2 Sidebar
- **Plant sections**:
  - Surabaya (1200) — dengan gambar surabaya.png
  - Semarang (1300) — dengan gambar semarang.png
  - Setiap plant menampilkan total jumlah PO + badge per tipe
- **Submenu per plant**:
  - PO Type menu items (dengan badge count)
  - **History**: expandable submenu dengan History Release dan History Reject (badge count hari ini)
  - **Outstanding GR**: link dengan badge count

### 6.3 Halaman Daftar PO
- **Sticky header**: Judul halaman (tipe PO) + jumlah PO
- **Sticky toolbar**:
  - Select All / Deselect All button
  - Search input (filter by PO number / vendor)
  - Page size selector (10/20/50/All)
  - Expand All / Collapse All buttons
  - Item count
- **Kartu PO** (masing-masing PO):
  - Checkbox untuk seleksi
  - Nomor PO (klik → modal detail)
  - Badge "In release" (status)
  - Total amount
  - Chevron expand/collapse
  - Meta info: Vendor, Status, Type, Currency
  - **Expanded detail**:
    - Tabel item (Item, Description, Qty, Unit, Net Price, Total, Curr)
    - Additional Information box (remark / comment)
- **Pagination bar**

### 6.4 Halaman Riwayat
- **Header**: judul (History Release / History Reject) + total records
- **Filter bar**:
  - Date range picker (Dari — s/d)
  - Tombol "Cari"
  - Search input (cari no PO atau vendor)
- **Kartu riwayat**:
  - Nomor PO
  - Badge status (Released / Rejected)
  - Doc type badge
  - Plant badge
  - Timestamp
  - Meta info: PO Number, Vendor, Released/Rejected By
  - **Expanded detail**:
    - Tabel info header (PO Number, Doc Type, Vendor Code, Vendor Name, Plant, User, Date, Time, Release Code / Reject Comment)
    - Reject reason box (jika ada)
    - Item detail section (PO Items table) — dimuat on-demand via AJAX

### 6.5 Halaman Outstanding GR
- **Header**: judul "Outstanding GR — [Plant]"
- **Summary cards**: Total PO, Total Line Items, Estimated Amount per currency
- **Toolbar**: Search, Filter by PO Type, Page Size, Expand/Collapse All
- **Kartu PO OGR**:
  - Nomor PO
  - Badge potype + bsart
  - Badge "Outstanding GR"
  - Estimated total amount
  - Meta: Vendor, Doc Date, Plant, Items count
  - **Expanded detail**: tabel item dengan outstanding qty, unit price, estimated amount (dengan warna kuning untuk outstanding)

### 6.6 Floating Action Button (FAB)
- Muncul hanya saat melihat daftar PO (bukan riwayat/OGR)
- Input teks untuk alasan reject
- Tombol **Release Selected** (hijau)
- Tombol **Reject Selected** (merah)

### 6.7 Komponen Lain
- **Modal Detail PO**: tampilan detail PO lengkap (header + item + remark)
- **Toast Notification**: notifikasi sukses/error (auto-hide 4 detik)
- **Loading Overlay**: spinner "Processing... Please wait" saat submit action
- **Empty State**: gambar + teks saat belum ada data dipilih

---

## 7. User Flow

### 7.1 Melihat Daftar PO
1. Buka aplikasi → sidebar tampil dengan 2 plant
2. Klik plant → expand submenu
3. Klik tipe PO (misal "PO Bahan Baku") → halaman menampilkan kartu PO
4. Gunakan search, filter page size, expand all untuk navigasi

### 7.2 Bulk Release PO
1. Centang checkbox PO yang akan di-release
2. Klik tombol **Release Selected** pada FAB
3. Konfirmasi dialog (menampilkan jumlah + total amount)
4. Loading overlay tampil
5. Kartu PO yang sukses di-release akan terhapus dengan animasi

### 7.3 Bulk Reject PO
1. Centang checkbox PO yang akan di-reject
2. Isi alasan reject pada input FAB
3. Klik tombol **Reject Selected** pada FAB
4. Konfirmasi dialog
5. Loading overlay tampil
6. Kartu PO yang di-reject akan terhapus dengan animasi

### 7.4 Melihat Riwayat
1. Klik **History** di sidebar → submenu terbuka
2. Klik **History Release** atau **History Reject**
3. Atur filter tanggal, klik "Cari"
4. Klik kartu untuk melihat detail + item PO

### 7.5 Melihat Outstanding GR
1. Klik **Outstanding GR** di sidebar
2. Halaman menampilkan summary + daftar PO yang outstanding
3. Gunakan filter, search, expand untuk analisis

---

## 8. Tabel Database yang Digunakan

| Tabel | Kegunaan |
|---|---|
| `cdhdr` | Change document header — riwayat perubahan PO |
| `cdpos` | Change document item — detail field yang berubah |
| `ekko` | Header Purchase Order |
| `ekpo` | Item Purchase Order |
| `ekbe` | Histori penerimaan barang (GR) |
| `lfa1` | Master vendor |
| `makt` | Deskripsi material |
| `tline` | Teks (untuk READ_TEXT) |

---

## 9. Konstanta Penting

### Release Strategy Fields
| Field | Deskripsi |
|---|---|
| `FRGZU` | Release strategy pada EKKO |
| `FRGKE` | Release status pada EKKO ('R' = released) |
| `FRGCO` | Release code |

### Processing Status (PROCSTAT)
| Value | Deskripsi |
|---|---|
| `08` | Rejected |

### Movement Type GR
| Value | Deskripsi |
|---|---|
| `101` | GR for purchase order |
| `103` | GR for purchase order (into GR blocked stock) |
| `105` | GR for purchase order (consignment) |
| `107` | GR for purchase order (valuation) |

### Zero-decimal Currencies
IDR, JPY, KRW, VND, BIF, CLP, GNF, ISK, KMF, MGA, PYG, RWF, UGX, XAF, XOF, XPF

### Teks ID
| ID | Deskripsi |
|---|---|
| `F01` | Purchase order header / item text |

---

## 10. Keamanan

- Logout menggunakan `/sap/public/bc/icf/logoff`
- Session management via sessionStorage (`logged_out`)
- Username ditampilkan dari `sy-uname` (ABAP system field)
- User menu dropdown dengan tombol logout

---

## 11. Catatan Pengembangan

- Semua logika berada dalam satu file `main.htm` — ABAP page script + HTML + CSS (inline `<style>`) + JavaScript (inline `<script>`)
- Data utama dimuat saat inisialisasi page via function module `Z_FM_YMMR068` untuk dua plant
- Aksi bulk menggunakan loop maksimal 500 iterasi untuk checkbox
- Riwayat item dimuat on-demand (lazy load) saat kartu di-expand
- Pagination dilakukan client-side untuk daftar PO utama, server-side untuk riwayat
- OGR dibatasi untuk PO dengan `bedat >= 20260101`
- Halaman menggunakan font: DM Sans (teks) dan DM Mono (monospace/kode)
- Responsive design dengan CSS custom properties (variables)
- Sidebar dapat di-collapse untuk layar sempit
