# Laporan Perbandingan: `ZBSP_PRCH_APP` vs `ZPR_REL_BSP`

**Tanggal:** 23 Juni 2026
**Root:** `D:\DEV\Breakdown ROTO SAP\`

---

## 1. Ringkasan Umum

| Aspek | `ZBSP_PRCH_APP` | `ZPR_REL_BSP` |
|-------|-----------------|---------------|
| Status | Procurement read-only app | PR approval app (KMI-BOD) |
| Total file teks | 4 file | 2 file |
| Lokasi file utama | `Page with FLow Logic/index.htm` + `main.htm` | `Page with FLow Logic/index.htm` + `main.htm` |
| Dokumentasi | `erd.md` (577 baris), `TAMBAH_KATEGORI.md` (141 baris) | — |
| Total LOC (source) | ~3.539 | ~3.832 |
| Total LOC (all) | ~4.257 | ~3.832 |
| Images MIME | 4 PNG (0 byte placeholder) | 4 PNG (0 byte placeholder) |
| Approver | Semua user **read-only** (`lv_is_approver = abap_false`) | Hanya **KMI-BOD** yang bisa approve |
| Plants supported | 1200, 1300, 2000, 1000, 1001, 1100, 3000 | 1200, 1300, 2000, 1000, 1001, 1100, 3000 |

---

## 2. Perbandingan Struktur File

### 2.1 Struktur Direktori

```
ZBSP_PRCH_APP/                          ZPR_REL_BSP/
│                                       │
├── erd.md                              ├── MIMEs/
├── TAMBAH_KATEGORI.md                  │   ├── background.png (0 B)
├── MIMEs/                              │   ├── logo.png (0 B)
│   ├── background.png (0 B)            │   ├── semarang.png (0 B)
│   ├── logo.png (0 B)                  │   └── surabaya.png (0 B)
│   ├── semarang.png (0 B)              └── Page with FLow Logic/
│   └── surabaya.png (0 B)                  ├── main.htm (1.325 baris)
└── Page with FLow Logic/                   └── index.htm (2.507 baris)
    ├── main.htm (1.298 baris)
    └── index.htm (2.241 baris)
```

**Catatan:** `ZPR_REL_BSP` adalah aplikasi approval murni (2 file). `ZBSP_PRCH_APP` memiliki dokumentasi tambahan (ERD + panduan aktivasi kategori).

### 2.2 Perbandingan Ukuran File

| File | `ZBSP_PRCH_APP` | `ZPR_REL_BSP` |
|------|-----------------|---------------|
| `index.htm` | 2.241 baris / 98.298 byte | 2.507 baris / 85.679 byte |
| `main.htm` | 1.298 baris / 44.082 byte | 1.325 baris / 44.187 byte |

**Observasi:** `ZPR_REL_BSP` memiliki `index.htm` yang lebih panjang (+266 baris) dengan fitur approval workflow (FAB, multi-select, modal approve/reject). `ZBSP_PRCH_APP` memiliki `main.htm` yang hampir sama panjang dengan tambahan `check_werks_allowed` macro untuk keamanan backend.

---

## 3. Perbandingan `index.htm` — Frontend UI

### 3.1 ABAP Server-Side Code (Baris 1-21)

**Kedua file identik.** Keduanya mendeklarasikan variabel ABAP yang sama:
- `lv_uname2` TYPE syuname
- `lv_username2` TYPE bapibname-bapibname
- `lv_address2` TYPE bapiaddr3
- `lv_fullname2` TYPE bapiaddr3-fullname
- `lt_ret2` TYPE STANDARD TABLE OF bapiret2

Keduanya memanggil `BAPI_USER_GET_DETAIL` untuk mendapat nama lengkap user.

### 3.2 CSS Variables (`:root`)

| Aspek | `ZBSP_PRCH_APP` | `ZPR_REL_BSP` |
|-------|-----------------|---------------|
| Jumlah CSS variable | **32** variabel | **11** variabel |
| Palette | "Procurement Navy" (navy-900, navy-700) | Biru sederhana |
| Shadow | 5 level (xs, sm, md, lg, focus) | 0 level |
| Radius | 4 level (sm=8px, md=12px, lg=16px, pill=999px) | 0 level |
| Font family | Inter + DM Mono | DM Sans + DM Mono |
| Transition easings | `--ease`, `--ease-out` | Tidak ada |
| Durasi animasi | `--dur-fast:140ms`, `--dur-base:220ms`, `--dur-slow:360ms` | Tidak ada |
| Toolbar offset | `--toolbar-offset:74px` (dinamis via ResizeObserver) | Tidak ada |

### 3.3 CSS Animations

| Animation | `ZBSP_PRCH_APP` | `ZPR_REL_BSP` |
|-----------|-----------------|---------------|
| `cardIn` | ✅ | ✅ |
| `fadeUp` | ✅ | ✅ |
| `menuPop` | ✅ | ❌ |
| `modalBgIn` | ✅ | ❌ |
| `modalBoxIn` | ✅ | ❌ |
| `toastIn` | ✅ | ❌ |
| `spin` | ✅ | ✅ |
| `shimmer` | ✅ | ❌ |
| `pulseDot` | ✅ | ❌ |
| `prefers-reduced-motion` | ✅ | ❌ |

### 3.4 Global JavaScript Variables

| Variable | `ZBSP_PRCH_APP` | `ZPR_REL_BSP` |
|----------|-----------------|---------------|
| `API_URL` | `'main.htm'` | `'main.htm'` |
| `CUR_USER` | ✅ (dari ABAP) | ❌ (tidak ada) |
| `curPlant` | `''` | `''` |
| `curMode` | ✅ `''` | ✅ `''` |
| `curCategory` | ❌ (pakai `curBsart`) | ✅ `''` |
| `curBsart` | ✅ `'ROTO'` | ✅ `''` |
| `isApprover` | ❌ (tidak ada) | ✅ `false` |
| `openSections` | `{}` | `{}` |
| `openCategories` | ❌ (tidak ada) | ✅ `{}` |
| `curEstkzFilter` | ✅ `''` | ✅ `''` |
| `allData` | ✅ `[]` | ✅ `[]` |
| `selBanfns` | ❌ (tidak ada) | ✅ `{}` |
| `pageSize` | ✅ `10` | ✅ `10` |
| `curPage` | ✅ `1` | ✅ `1` |
| `searchKw` | ✅ `''` | ✅ `''` |
| `allExpanded` | ✅ `false` | ✅ `false` |
| `filteredData` | ✅ `[]` | ✅ `[]` |
| `histData` | ✅ `[]` | ✅ `null` |
| `histType` | ✅ `''` | ✅ `''` |
| `histPageSize` | ✅ `10` | ✅ (tidak disebut) |
| `histCurPage` | ✅ `1` | ✅ (tidak disebut) |
| `histFilteredData` | ✅ `[]` | ✅ (tidak disebut) |
| `histBsartFilter` | ✅ `''` | ✅ (tidak disebut) |
| `histSortOrder` | ✅ `''` | ✅ (tidak disebut) |

### 3.5 Data Model Kategori (Perbedaan Paling Signifikan)

**`ZBSP_PRCH_APP`** — Menggunakan `CATEGORY_DEF` (objek flat by BSART) + `PLANT_DEF`:
```javascript
// Baris 1010-1029
var PLANT_DEF = {
  '1200': { label:'Surabaya', categories:['ROTO','PRK9','PRKS'] },
  '2000': { label:'Surabaya', categories:[] },
  '1000': { label:'Surabaya', categories:[] },
  '1001': { label:'Surabaya', categories:[] },
  '1100': { label:'Surabaya', categories:[] },
  '1300': { label:'Semarang', categories:['ROTO','PRKS'] },
  '3000': { label:'Semarang', categories:[] }
};

var CATEGORY_DEF = {
  'ROTO': { label:'PR Maintenance', short:'Maintenance', icon:'&#128203;' },
  'PRK9': { label:'PR RND',         short:'RND',         icon:'&#128736;' },
  'RSBR': { label:'PR RND',         short:'RND',         icon:'&#128736;' },
  'PRKS': { label:'PR Service',     short:'Service',     icon:'&#128295;' }
};
```

**`ZPR_REL_BSP`** — Menggunakan `CATEGORY_DEF` per-plant (lebih terstruktur dengan mapping plant-category-bsart):
```javascript
// Baris 840-893
var CATEGORY_DEF = {
  '1200': [
    {code:'MTN', label:'PR Maintenance', bsart:'ROTO',    icon:'...'},
    {code:'RND', label:'PR RND',         bsart:'RSBR,PRK9', icon:'...'},
    {code:'SVC', label:'PR Service',     bsart:'PRKS',     icon:'...'}
  ],
  '1300': [
    {code:'MTN', label:'PR Maintenance', bsart:'ROTO',    icon:'...'},
    {code:'SVC', label:'PR Service',     bsart:'PRKS',     icon:'...'}
  ],
  '2000': [
    {code:'MTN', label:'PR Maintenance', bsart:'ROTO',    icon:'...'},
    {code:'RND', label:'PR RND',         bsart:'RSBR,PRK9', icon:'...'},
    {code:'SVC', label:'PR Service',     bsart:'PRKS',     icon:'...'}
  ],
  '1000': [ /* MTN,RND,SVC */ ],
  '1001': [ /* MTN,RND,SVC */ ],
  '1100': [ /* MTN,RND,SVC */ ],
  '3000': [ /* MTN,SVC */ ]
};
```

**Perbedaan kunci:**
| Aspek | `ZBSP_PRCH_APP` | `ZPR_REL_BSP` |
|-------|-----------------|---------------|
| Category codes | ROTO, PRK9, RSBR, PRKS | MTN, RND, SVC |
| Struktur | Flat (CATEGORY_DEF by BSART) + plant mapping (PLANT_DEF) | Per-plant array (CATEGORY_DEF) |
| Plant 2000 dll | Ada di PLANT_DEF tapi kategori kosong | Ada 3 kategori (MTN/RND/SVC) |
| BSART mapping | Langsung (nama key == BSART) | Explicit (`cat.bsart`) |
| Jumlah plant | 7 plant (3 dengan kategori) | 7 plant (semua punya kategori) |

### 3.6 Fungsi-Fungsi Khas

#### Fungsi yang ADA di `ZBSP_PRCH_APP` tapi TIDAK ADA di `ZPR_REL_BSP`:

| Fungsi | Deskripsi |
|--------|-----------|
| `getBsartLabel(bs)` | Mengembalikan label dari doc type |
| `showSidebarSkeleton()` | Menampilkan skeleton loading di sidebar |
| `todayKey()` | Generate key tanggal untuk localStorage welcome |
| `maybeShowWelcome()` | Menampilkan welcome modal sekali per hari |
| `setGreetingText()` | Set greeting berdasarkan jam (pagi/siang/sore/malam) |
| `loadWelcomeSummary()` | Fetch data untuk welcome modal |
| `renderWelcomeSummary(total)` | Render welcome modal |
| `closeWelcomeModal()` | Tutup welcome modal |
| `updateToolbarOffset()` | Update posisi sticky toolbar via ResizeObserver |
| `observeToolbarOffset()` | Setup ResizeObserver |
| `toggleAll()` | Toggle expand/collapse semua card (1 tombol) |
| `updateAllBtn()` | Update teks tombol expand/collapse |
| `onEstkzFilter(val)` | Filter MRP/Non-MRP |
| `applyHistFilter()` | Filter & sort history |
| `applySearchCommit(val)` | Commit search PR |
| `onSearchKey(e)` | Handler keydown search |
| `onSearchBlur()` | Handler blur search |
| `histGoPage(pg)` | Navigasi page history |
| `histChangePageSize(val)` | Ubah page size history |
| `onHistBsartFilter(val)` | Filter history by BSART |
| `onHistSortOrder(val)` | Sort history |
| `applyHistSearchCommit()` | Commit history search |
| `onHistSearchKey(e)` | Handler keydown history search |
| `onHistSearchBlur()` | Handler blur history search |
| `renderHistPagination(...)` | Pagination khusus history |
| `renderPagination(...)` | Pagination PR list |

#### Fungsi yang ADA di `ZPR_REL_BSP` tapi TIDAK ADA di `ZBSP_PRCH_APP`:

| Fungsi | Deskripsi |
|--------|-----------|
| `getCategoryDef(werks,category)` | Ambil definisi category dari CATEGORY_DEF |
| `getEffectiveWerks(werks)` | Ekspansi werks (1200 → '1200,2000') |
| `getSidebarWerks(werks)` | Sidebar werks (1200 → ['1200','2000']) |
| `getPlantLabel(werks)` | Label plant dari werks |
| `getPlantTotalPending(werks)` | Total pending per plant |
| `normalizeCatCounts(...)` | Normalisasi count per category |
| `toggleSection(plantCode)` | Toggle section plant |
| `toggleCategory(plantCode,categoryCode)` | Toggle sub-category |
| `toggleSelect(banfn)` | Select/deselect PR |
| `toggleSelectAll()` | Select/deselect semua |
| `syncCheckboxes()` | Sync state checkbox |
| `updateFabInfo()` | Update info FAB |
| `showModalApprove()` | Show modal approve |
| `showModalReject()` | Show modal reject |
| `confirmApprove()` | Confirm approve |
| `confirmReject()` | Confirm reject |
| `processAction()` | Process approve/reject sequentially |
| `onSearchInput()` | Search input handler (debounced) |

### 3.7 Fitur Frontend Lainnya

| Fitur | `ZBSP_PRCH_APP` | `ZPR_REL_BSP` |
|-------|-----------------|---------------|
| Welcome modal | ✅ (via localStorage, sekali/hari) | ❌ |
| Skeleton loading sidebar | ✅ (shimmer animation) | ❌ |
| User avatar in header | `lv_uname2(1)` (huruf pertama) | ✅ (sama) |
| User menu dropdown | ✅ dengan logout | ✅ dengan logout |
| Sidebar collapsible | ✅ | ✅ |
| Tombol expand/collapse | ✅ **1 tombol toggle** (▼/▲) | ✅ **2 tombol** terpisah |
| FAB (floating action) | ❌ (read-only mode) | ✅ (untuk KMI-BOD) |
| Search PR | ✅ client-side | ✅ client-side (tapi fungsi `getFiltered` beda parameter) |
| History search | ✅ 1 parameter (`val`) | ✅ 3 parameter (`val,data,type`) |
| Pagination | ✅ dengan prev/next + nomor | ✅ dengan prev/next + nomor |
| Card expand | ✅ chevron di kanan | ✅ chevron di kanan |
| MRP/Non-MRP filter | ✅ | ✅ |
| Sticky toolbar | ✅ ResizeObserver dynamic | ❌ CSS position sticky saja |
| Toast animation | ✅ Fade-out (opacity + translateX) | ❌ langsung hilang |
| Toast duration | 4.200ms | 4.500ms |
| Logout flow | fetch `/sap/public/bc/icf/logoff` | fetch `/sap/public/bc/icf/logoff` |
| Company name | PT. Kayu Mebel Indonesia | PT. Kayu Mebel Indonesia |
| Badge text pending | `"In Release"` | `"Pending"` |

### 3.8 CSS Sections

| Section | `ZBSP_PRCH_APP` | `ZPR_REL_BSP` |
|---------|-----------------|---------------|
| §1 Design Tokens | ✅ 32 CSS variables | ✅ 11 CSS variables |
| §2 Reset & Base | ✅ | ✅ |
| §3 Layout Shell | ✅ | ✅ |
| §4 Header & User Menu | ✅ | ✅ |
| §5 Sidebar & Nav | ✅ class `.sb-link.active-app/.active-rej` | ✅ lebih sederhana |
| §6 Page Header & Toolbar | ✅ | ✅ |
| §7 PR Card | ✅ border-left colored | ✅ border-left colored |
| §8 Card Detail Table | ✅ class `detail-tbl` | ✅ inline styles |
| §9 History Table | ✅ sticky first column | ✅ non-sticky |
| §10 Badges & Chips | ✅ b-pending, b-plant, b-mrp, b-nonmrp, b-items | ✅ b-pd, b-pl, b-mrp, b-nmrp |
| §11 Pagination | ✅ | ✅ |
| §12 Modal | ✅ welcome + approve + reject | ✅ approve + reject (no welcome) |
| §13 FAB | ✅ | ❌ (tergabung di §12) |
| §14 Toast & Loading | ✅ fade + spin | ✅ spin saja |
| §15 Skeleton Loading | ✅ shimmer | ❌ |
| §16 Empty State | ✅ | ✅ |
| §17 Scrollbar | ✅ custom Chromium | ❌ |
| §18 Animations | ✅ 9 keyframes | ✅ 4 keyframes |
| §19 Responsive | ✅ 3 breakpoints (1280, 1024, 767) | ✅ 2 breakpoints (1024, 640) |

---

## 4. Perbandingan `main.htm` — Backend ABAP

### 4.1 Variabel ABAP

| Variabel | `ZBSP_PRCH_APP` (baris 4-18) | `ZPR_REL_BSP` (baris 4-16) |
|----------|------------------------------|------------------------------|
| `lv_action` | TYPE string | TYPE string |
| `lv_werks` | TYPE string | TYPE string |
| `lv_bsart` | TYPE string | TYPE string |
| `lv_banfn` | TYPE string | TYPE string |
| `lv_pr_action` | TYPE string | TYPE string |
| `lv_notes` | TYPE string | TYPE string |
| `lv_estkz_filter` | TYPE string | TYPE string |
| `lv_uname` | TYPE syuname | TYPE syuname |
| `lv_uname_uc` | TYPE syuname | ❌ **Tidak ada** |
| `lv_plant_ok` | TYPE abap_bool | ❌ **Tidak ada** |
| `lv_output` | TYPE string | TYPE string |
| `lv_json` | TYPE string | TYPE string |
| `lv_sep` | TYPE string | TYPE string |
| `lv_banfn_e` | TYPE eban-banfn | TYPE eban-banfn |
| `lv_is_approver` | TYPE abap_bool | TYPE abap_bool |

**Observasi:** `ZBSP_PRCH_APP` memiliki `lv_uname_uc` dan `lv_plant_ok` untuk plant restriction checking. `ZPR_REL_BSP` **tidak memiliki** plant restriction di ABAP — ini berarti logika plant restriction di `ZPR_REL_BSP` hanya di frontend (client-side).

### 4.2 Type Definitions

| Type | `ZBSP_PRCH_APP` | `ZPR_REL_BSP` |
|------|-----------------|---------------|
| `ty_eban_head` | ✅ 12 fields | ✅ 11 fields (no `statu`) |
| `ty_eban_item` | ✅ 17 fields | ✅ 16 fields (no `statu`) |
| `ty_makt` | ✅ matnr, maktx | ✅ matnr, maktx |
| `ty_uname_nm` | ✅ bname, fullname | ✅ bname, fullname |
| `ty_hist_rej` | ✅ 17 fields | ✅ 17 fields |
| `ty_hist_app` | ✅ 14 fields | ✅ 14 fields |

### 4.3 ABAP Macros

| Macro | `ZBSP_PRCH_APP` | `ZPR_REL_BSP` |
|-------|-----------------|---------------|
| `escape_json` | ✅ (baris 167-178) | ✅ (baris 159-170) |
| `check_werks_allowed` | ✅ **(baris 183-192)** — cek user KMI-U052, U051, U151 | ❌ **Tidak ada** |
| `fmt_date` | ✅ (baris 194-202) | ✅ (baris 172-180) |
| `parse_bsart_range` | ✅ (baris 207-222) | ✅ **(baris 188-203)** — lebih sederhana |
| `count_pending` | ✅ **(baris 227-244)** — SELECT + SORT + COUNT | ❌ **Tidak ada** (pakai lt_cat_def + SELECT GROUP BY langsung) |

### 4.4 Approach GET_SIDEBAR (Perbedaan Paling Signifikan)

**`ZBSP_PRCH_APP`** — Menggunakan macro `count_pending` per plant + per kategori:
```abap
" 7 plant × 3 kategori = 21+ panggilan count_pending
count_pending 'ROTO' '1200' lv_s_1200_roto.
count_pending 'RSBR,PRK9' '1200' lv_s_1200_PRK9.
count_pending 'PRKS' '1200' lv_s_1200_PRKS.
...
count_pending 'ROTO' '3000' lv_s_3000_roto.
count_pending 'PRKS' '3000' lv_s_3000_PRKS.
" JSON hardcode per plant
```

**`ZPR_REL_BSP`** — Menggunakan `lt_cat_def` (internal table) + 3 query GROUP BY:
```abap
lt_cat_def = VALUE #(
  ( werks = '1200' category = 'MTN' bsart = 'ROTO' )
  ( werks = '1200' category = 'RND' bsart = 'RSBR,PRK9' )
  ( werks = '1200' category = 'SVC' bsart = 'PRKS' )
  ... 7 plant × 2-3 kategori
).

" 3 query GROUP BY (pending, hist_app, hist_rej) — scalable
" Tidak perlu 1 query per kombinasi
```

**Perbandingan:**

| Aspek | `ZBSP_PRCH_APP` (count_pending macro) | `ZPR_REL_BSP` (lt_cat_def + GROUP BY) |
|-------|---------------------------------------|----------------------------------------|
| Pendekatan | **Hardcode** — setiap plant + kategori ditulis manual | **Dinamis** — loop internal table + GROUP BY |
| JSON output | Hardcode string CONCATENATE | Dinamis via LOOP |
| Tambah plant | Ubah banyak tempat (variable, macro, JSON) | Cukup tambah baris di `lt_cat_def` |
| Jumlah query | 1 query per kombinasi (21+ untuk 7 plant × 3 kategori) | 3 query total (GROUP BY) |
| Performa | Query count membengkak linear dgn jumlah plant | Stabil — 3 query untuk berapa pun plant |

### 4.5 GET_LIST — WHERE Clause

| Aspek | `ZBSP_PRCH_APP` | `ZPR_REL_BSP` |
|-------|-----------------|---------------|
| Werks filter | `werks IN lt_werks_rng` (RANGE dari comma-separated `lv_werks`) | `werks IN lt_werks_rng` (RANGE dibangun dari `ls_cat_def-werks`) |
| MRP filter | `estkz = 'B'` untuk MRP | `estkz = 'B'` untuk MRP |
| Items subquery | ✅ SELECT dengan banfn range | ✅ SELECT dengan banfn range |
| Total value | ✅ SUM(menge * preis) | ✅ SUM(menge * preis) |
| User full name | ✅ JOIN usr21 + adrp | ✅ JOIN usr21 + adrp |

### 4.6 PROCESS Action — Perbedaan Krusial

| Aspek | `ZBSP_PRCH_APP` | `ZPR_REL_BSP` |
|-------|-----------------|---------------|
| **Approver check** | `lv_is_approver = abap_false` (HARDCODE — tidak bisa approve) | `IF lv_uname = 'KMI-BOD'` (dinamis) |
| **Release code** | `'P2'` | `'P2'` |
| **Error handling** | ✅ BAPI return code check (sy-subrc 1-7) | ✅ BAPI return code check (sy-subrc 1-7) |
| **Commit** | ✅ BAPI_TRANSACTION_COMMIT | ✅ BAPI_TRANSACTION_COMMIT |
| **Rollback** | ✅ BAPI_TRANSACTION_ROLLBACK | ✅ BAPI_TRANSACTION_ROLLBACK |
| **Write history BEFORE delete** | ✅ Write `zroto_rej_hist` dulu, baru BAPI_DELETE | ✅ Write `zroto_rej_hist` dulu, baru BAPI_DELETE |
| **Cleanup history on delete fail** | ✅ DELETE FROM `zroto_rej_hist` + ROLLBACK | ✅ DELETE FROM `zroto_rej_hist` + ROLLBACK |
| Approve success message | `"PR {banfn} berhasil di-approve ({count} item)"` | `"PR {banfn} berhasil di-approve ({count} item)"` |
| Reject success message | `"PR {banfn} berhasil di-reject/delete"` | `"PR {banfn} berhasil di-reject/delete"` |

### 4.7 JSON Response Keys

| Response Key | `ZBSP_PRCH_APP` | `ZPR_REL_BSP` |
|-------------|-----------------|---------------|
| `status` | ✅ ('S'/'E') | ✅ ('S'/'E') |
| `message` | ✅ | ✅ |
| `data` | ✅ (array) | ✅ (array) |
| `is_approver` | **✅ Ada** | ❌ **Tidak ada** |
| `pending` | ✅ nested `{werks:{category:count}}` | ✅ nested `{werks:{category:count}}` |
| `hist_rej` | ✅ `{werks:{category:count}}` | ✅ `{werks:{category:count}}` |
| `hist_app` | ✅ `{werks:{category:count}}` | ✅ `{werks:{category:count}}` |
| Format `pending` | `{"1200":{"ROTO":5,"PRK9":3,"PRKS":2}}` | `{"1200":{"MTN":5,"RND":3,"SVC":2}}` |

### 4.8 Error Messages (Hardcoded Strings)

| Message | `ZBSP_PRCH_APP` | `ZPR_REL_BSP` |
|---------|-----------------|---------------|
| `"werks harus diisi"` | ✅ | ✅ |
| `"Kategori PR (bsart) belum dipilih"` | ❌ | ✅ |
| `"bsart tidak valid"` | ✅ | ❌ |
| `"werks kosong"` | ✅ | ✅ |
| `"banfn kosong"` | ✅ | ✅ |
| `"Anda tidak memiliki akses ke plant ini"` | ✅ | ❌ |
| `"Anda tidak memiliki hak akses"` | ❌ | ✅ |
| `"PR {banfn} tidak ditemukan atau sudah diproses"` | ✅ | ✅ |
| `"Authority check failed"` | ✅ | ✅ |
| `"PR not found"` | ✅ | ✅ |
| `"Already released"` | ✅ | ✅ |
| `"Action tidak dikenal"` | ✅ | ✅ |

### 4.9 Tabel SAP yang Digunakan

| Tabel | `ZBSP_PRCH_APP` | `ZPR_REL_BSP` |
|-------|-----------------|---------------|
| `EBAN` | ✅ | ✅ |
| `MAKT` | ✅ | ✅ |
| `USR21` | ✅ | ✅ |
| `ADRP` | ✅ | ✅ |
| `ZROTO_REJ_HIST` | ✅ | ✅ |
| `ZROTO_APP_HIST` | ✅ | ✅ |

### 4.10 BAPI yang Digunakan

| BAPI | `ZBSP_PRCH_APP` | `ZPR_REL_BSP` |
|------|-----------------|---------------|
| `BAPI_USER_GET_DETAIL` | ✅ (di index.htm) | ✅ (di index.htm) |
| `BAPI_REQUISITION_RELEASE` | ✅ (dengan `use_exceptions`) | ✅ (dengan `use_exceptions`) |
| `BAPI_REQUISITION_DELETE` | ✅ (dengan `delete_ind = 'L'`) | ✅ (dengan `delete_ind = 'L'`) |
| `BAPI_TRANSACTION_COMMIT` | ✅ | ✅ |
| `BAPI_TRANSACTION_ROLLBACK` | ✅ | ✅ |

---

## 5. Perbandingan Multi-Plant Support

### 5.1 Daftar Plant

| Plant | Label | ZBSP_PRCH_APP | ZPR_REL_BSP |
|:-----:|-------|:-------------:|:------------:|
| 1200 | Surabaya | ✅ (ROTO, PRK9, PRKS) | ✅ (MTN, RND, SVC) |
| 1300 | Semarang | ✅ (ROTO, PRKS) | ✅ (MTN, SVC) |
| 2000 | Surabaya | ✅ (categories kosong) | ✅ (MTN, RND, SVC) |
| 1000 | Surabaya | ✅ (categories kosong) | ✅ (MTN, RND, SVC) |
| 1001 | Surabaya | ✅ (categories kosong) | ✅ (MTN, RND, SVC) |
| 1100 | Surabaya | ✅ (categories kosong) | ✅ (MTN, RND, SVC) |
| 3000 | Semarang | ✅ (categories kosong) | ✅ (MTN, SVC) |

### 5.2 Plant Grouping (Surabaya: 1200+2000+1000+1001+1100)

| Aspek | `ZBSP_PRCH_APP` | `ZPR_REL_BSP` |
|-------|-----------------|---------------|
| **Dimana merge terjadi** | **Backend (ABAP)**: GET_SIDEBAR menjumlah count dari beberapa plant | **Frontend**: Sidebar mengirim `werks=1200,2000` sebagai comma-separated string |
| **GET_LIST** | Backend: tambah plant 2000 ke RANGE saat `lv_werks = '1200'` | Frontend: kirim `'1200,2000'` sebagai werks, backend tinggal split |
| **GET_HIST_REJ/APP** | Sama seperti GET_LIST | Sama seperti GET_LIST |
| **Keuntungan** | Backend logic terpusat | Backend tidak perlu tahu tentang "grouping" plant |
| **Kerugian** | Backend harus diubah jika grouping berubah | Setiap frontend harus implementasi grouping sendiri |

---

## 6. Perbandingan Dokumentasi

### `erd.md` (`ZBSP_PRCH_APP`) — 577 baris
- Entity Relationship Diagram lengkap
- Menjelaskan 6 tabel (4 SAP standard + 2 Z custom)
- Menjelaskan 4 kategori: **ROTO, PRK9, RSBR, PRKS**
- Menjelaskan constraint dan relasi antar tabel

### `TAMBAH_KATEGORI.md` (`ZBSP_PRCH_APP`) — 141 baris
- Panduan step-by-step penambahan kategori baru
- Dengan line reference spesifik untuk index.htm dan main.htm
- Berguna untuk pengembangan kedepan

`ZPR_REL_BSP` tidak memiliki dokumentasi terpisah.

---

## 7. Ringkasan Perbedaan Arsitektur

### 7.1 Category Model

```
ZBSP_PRCH_APP:                          ZPR_REL_BSP:
CATEGORY_DEF = {                        CATEGORY_DEF = {
  'ROTO':{...}      ← doc type           '1200':[
  'PRK9':{...}      ← doc type             {code:'MTN', bsart:'ROTO'}
  'RSBR':{...}      ← doc type             {code:'RND', bsart:'RSBR,PRK9'}
  'PRKS':{...}      ← doc type             {code:'SVC', bsart:'PRKS'}
}                                         ]
PLANT_DEF = {                           '1300':[
  '1200':{cats:['ROTO','PRK9','PRKS']}     {code:'MTN', bsart:'ROTO'}
  '1300':{cats:['ROTO','PRKS']}            {code:'SVC', bsart:'PRKS'}
  '2000':{cats:[]}                       ]
  ...                                   '2000':[...]
}                                       '1000':[...]
                                        '1001':[...]
                                        '1100':[...]
                                        '3000':[...]
                                        }
```

### 7.2 Plant Restriction

```
ZBSP_PRCH_APP:                          ZPR_REL_BSP:
- Backend (main.htm):                   - Frontend (index.htm):
  check_werks_allowed macro               - user filter di renderSidebar()
  (KMI-U052, U051, U151)                 - Tidak ada backend check
- Frontend (index.htm):                 - Approver: KMI-BOD
  user filter di renderSidebar()
```

### 7.3 Frontend-Backend Communication

Keduanya menggunakan pola yang sama: `fetch(API_URL + '?action=...&werks=...&bsart=...')` → JSON response.

**Perbedaan:** `ZBSP_PRCH_APP` backend mengirim `is_approver` di response GET_SIDEBAR. `ZPR_REL_BSP` tidak mengirim `is_approver` di JSON — frontend mendapatkan info approver dari ABAP langsung di awal via `<%=lv_is_approver%>`.

### 7.4 Code Duplication

| Aspek | `ZBSP_PRCH_APP` | `ZPR_REL_BSP` |
|-------|-----------------|---------------|
| index.htm | **Bersih** — tidak ada duplikasi | **Bersih** — tidak ada duplikasi |
| main.htm | Bersih | Bersih |

---

## 8. Matriks Fitur Lengkap

| No | Fitur | `ZBSP_PRCH_APP` | `ZPR_REL_BSP` |
|----|-------|:---------------:|:--------------:|
| 1 | Login via SAP (BAPI_USER_GET_DETAIL) | ✅ | ✅ |
| 2 | Sidebar dengan plant & kategori | ✅ | ✅ |
| 3 | Badge count pending di sidebar | ✅ | ✅ |
| 4 | Badge count history di sidebar | ✅ | ✅ |
| 5 | Pending PR cards | ✅ | ✅ |
| 6 | MRP/Non-MRP filter | ✅ | ✅ |
| 7 | Client-side search | ✅ | ✅ |
| 8 | Pagination | ✅ | ✅ |
| 9 | Card expand/collapse per item | ✅ | ✅ |
| 10 | Card expand all / collapse all | ✅ | ✅ |
| 11 | Item detail table (expand) | ✅ | ✅ |
| 12 | History approve table | ✅ | ✅ |
| 13 | History reject table | ✅ | ✅ |
| 14 | History sort & filter | ✅ | ✅ |
| 15 | Approve action | ❌ (read-only) | ✅ (KMI-BOD only) |
| 16 | Reject action | ❌ (read-only) | ✅ (KMI-BOD only) |
| 17 | Modal konfirmasi | ✅ | ✅ |
| 18 | Toast notification | ✅ | ✅ |
| 19 | Loading overlay | ✅ | ✅ |
| 20 | Loading spinner | ✅ | ✅ |
| 21 | Skeleton loading sidebar | ✅ | ❌ |
| 22 | Welcome popup | ✅ | ❌ |
| 23 | User menu dropdown | ✅ | ✅ |
| 24 | Logout | ✅ | ✅ |
| 25 | Responsive design | ✅ (3 breakpoints) | ✅ (2 breakpoints) |
| 26 | Multi-plant support (7 plant) | ✅ | ✅ |
| 27 | User-based plant restriction | ✅ (KMI-U052, U051, U151) | ❌ (tidak ada) |
| 28 | ResizeObserver sticky toolbar | ✅ | ❌ |
| 29 | Scrollbar custom (Chromium) | ✅ | ❌ |
| 30 | prefers-reduced-motion | ✅ | ❌ |
| 31 | Animasi (9 keyframes) | ✅ | ✅ (4 keyframes) |
| 32 | FAB (floating action button) | ❌ | ✅ |
| 33 | Select PR (multi-select) | ❌ | ✅ |
| 34 | Audit trail (zroto_app_hist, zroto_rej_hist) | ✅ | ✅ |
| 35 | ERD documentation | ✅ | ❌ |
| 36 | Kategori activation guide | ✅ | ❌ |
| 37 | Full backend plant restriction | ✅ | ❌ |
| 38 | Dynamic category definitions (lt_cat_def loop) | ❌ (hardcode) | ✅ (dinamis) |
| 39 | Backend GET_SIDEBAR GROUP BY (3 query) | ❌ (21+ query) | ✅ (3 query) |

---

## 9. Analisis dan Rekomendasi

### 9.1 Kelebihan `ZBSP_PRCH_APP`

1. **Backend plant restriction** — `check_werks_allowed` macro melindungi data di server-side
2. **Welcome modal** — UX lebih informatif dengan ringkasan PR
3. **Skeleton loading** — Persiapan UX yang lebih baik
4. **ResizeObserver** — Toolbar sticky lebih akurat
5. **CSS lebih profesional** — 32 design tokens, 9 animasi, 3 breakpoints
6. **Toggle expand/collapse** — 1 tombol lebih intuitif
7. **Dokumentasi** — ERD + panduan aktivasi kategori
8. **Tidak ada duplikasi kode** — index.htm bersih

### 9.2 Kelebihan `ZPR_REL_BSP`

1. **Approver logic** — Bisa melakukan approve/reject (KMI-BOD)
2. **FAB + Multi-select** — UI workflow approval yang lebih lengkap
3. **CATEGORY_DEF per plant** — Struktur data kategori lebih modular
4. **GET_SIDEBAR GROUP BY** — Hanya 3 query untuk semua plant (scalable)
5. **7 plant semua aktif** — Setiap plant punya kategori terdefinisi
6. **Plant grouping di frontend** — Decoupling, backend tidak perlu tahu grouping

### 9.3 Rekomendasi

**Arsitektur terbaik** adalah menggabungkan kelebihan keduanya:

1. **Dari `ZBSP_PRCH_APP`**: Backend plant restriction (`check_werks_allowed`), welcome modal, skeleton loading, ResizeObserver, CSS lengkap, 1 tombol toggle
2. **Dari `ZPR_REL_BSP`**: Approver logic (KMI-BOD), CATEGORY_DEF per plant, FAB + multi-select, lt_cat_def + GROUP BY loop, plant grouping di frontend

**Prioritas tinggi:**
- Tambahkan `check_werks_allowed` ke `ZPR_REL_BSP` untuk keamanan server-side
- Port welcome modal & skeleton loading dari `ZBSP_PRCH_APP` ke `ZPR_REL_BSP`
- Port GROUP BY pattern dari `ZPR_REL_BSP` ke `ZBSP_PRCH_APP` untuk mengurangi jumlah query

---

## 10. Identifikasi Perbedaan Paling Fundamental

Bagian ini merangkum **6 perbedaan paling signifikan** yang mempengaruhi arsitektur, keamanan, maintainability, dan user experience secara fundamental.

---

### 10.1 Perbedaan #1: Model Kategori — "Doc Type sebagai Key" vs "Business Function sebagai Key"

**Ini adalah perbedaan arsitektur paling mendasar antara kedua codebase.**

| Aspek | `ZBSP_PRCH_APP` | `ZPR_REL_BSP` |
|-------|-----------------|---------------|
| Paradigma | **Technical** — kategori = doc type SAP | **Functional** — kategori = business process |
| Key category | `ROTO`, `PRK9`, `RSBR`, `PRKS` | `MTN` (Maintenance), `RND` (R&D), `SVC` (Service) |
| Contoh isi | `'ROTO':{label:'Maintenance'}` | `'MTN':{label:'Maintenance', bsart:'ROTO'}` |
| Jumlah kode kategori | 4 (ROTO, PRK9, RSBR, PRKS) | 3 (MTN, RND, SVC) |
| BSART mapping | Implisit (nama key == doc type) | Eksplisit (property `bsart`) |

**Dampak:**
- **`ZBSP_PRCH_APP`**: Kode lebih sederhana untuk programmer SAP (karena nama category = doc type), tapi RSBR dan PRK9 adalah BSART berbeda yang punya label sama.
- **`ZPR_REL_BSP`**: Lebih abstrak dan business-oriented. Jika requirements berubah (misal: PR RND pakai doc type baru), cukup update satu property `bsart` — tidak perlu bikin entry baru.
- **Keduanya incompatible**: Data JSON dari backend `ZBSP_PRCH_APP` mengembalikan `{"1200":{"ROTO":5}}`, sedangkan `ZPR_REL_BSP` mengembalikan `{"1200":{"MTN":5}}`. Frontend tidak bisa saling tukar.

**Kesimpulan:** `ZPR_REL_BSP` (functional) lebih unggul untuk maintainability jangka panjang.

---

### 10.2 Perbedaan #2: Keamanan — Plant Restriction "Full Backend+Frontend" vs "Frontend Only"

| Aspek | `ZBSP_PRCH_APP` | `ZPR_REL_BSP` |
|-------|-----------------|---------------|
| Backend check | ✅ **Ada** — `check_werks_allowed` macro di SETIAP action (GET_LIST, GET_HIST_REJ, GET_HIST_APP) | ❌ **Tidak ada** — backend percaya pada `lv_werks` yang dikirim frontend |
| Frontend filter | ✅ Filter sidebar sesuai user | ✅ Filter sidebar sesuai user |
| User yg direstriksi | KMI-U052 (1200), KMI-U151 (1200), KMI-U051 (1300) | Tidak ada |
| Tingkat keamanan | **High** — double security | **Low** — hanya client-side |

**Dampak:**
- Di `ZPR_REL_BSP`, user bisa mengirim request langsung (via browser dev tools atau curl) dan **backend akan mengembalikan data plant lain** karena tidak ada validasi.
- Di `ZBSP_PRCH_APP`, macro `check_werks_allowed` akan memblokir request tersebut.

**Kesimpulan:** `ZBSP_PRCH_APP` **jauh lebih aman**. Ini adalah critical security issue di `ZPR_REL_BSP`.

---

### 10.3 Perbedaan #3: Arsitektur GET_SIDEBAR — "21+ Query Hardcode" vs "3 Query GROUP BY Dinamis"

| Aspek | `ZBSP_PRCH_APP` | `ZPR_REL_BSP` |
|-------|-----------------|---------------|
| Metode | Panggil `count_pending` macro untuk **setiap** plant+kategori (21+ kali) | 3 query GROUP BY dari `lt_cat_def` |
| Tambah kategori baru | Ubah macro call + JSON concatenation (3-4 tempat) | Cukup tambah baris di `lt_cat_def` |
| Tambah plant baru | Ubah macro call + variabel + JSON (banyak tempat) | Cukup tambah baris di `lt_cat_def` |
| Resiko human error | **Tinggi** — lupa update satu tempat saja sudah error | **Rendah** — cukup update satu file |
| Scalability | **Buruk** — query count = plant × kategori | **Baik** — selalu 3 query |

**Kesimpulan:** `ZPR_REL_BSP` **jauh lebih maintainable dan scalable** untuk jangka panjang.

---

### 10.4 Perbedaan #4: Workflow Approval — "Read-Only Total" vs "Read-Write (KMI-BOD only)"

| Aspek | `ZBSP_PRCH_APP` | `ZPR_REL_BSP` |
|-------|-----------------|---------------|
| `lv_is_approver` | Hardcode `abap_false` | Dinamis: `IF lv_uname = 'KMI-BOD'` |
| Tombol Approve/Reject | Tidak pernah muncul | Muncul untuk KMI-BOD |
| FAB | ❌ Tidak ada | ✅ Ada |
| Multi-select PR | ❌ Tidak bisa | ✅ Bisa pilih beberapa PR |
| BISA approve | Tidak ada user | KMI-BOD |
| Mode aplikasi | **Viewer only** | **Approver tool** |

**Dampak:**
- `ZBSP_PRCH_APP`: Aman untuk publikasi lebih luas (tidak ada risiko approve salah), tapi tidak berguna untuk workflow approval.
- `ZPR_REL_BSP`: Fungsional untuk proses bisnis, tapi perlu kontrol akses yang lebih ketat (lihat perbedaan #2 — tidak ada backend restriction).

**Kesimpulan:** `ZPR_REL_BSP` memiliki business value lebih tinggi, `ZBSP_PRCH_APP` lebih aman.

---

### 10.5 Perbedaan #5: Strategi Multi-Plant — "Backend Merge" vs "Frontend Passthrough"

Kedua codebase mendukung 7 plant, tapi dengan strategi berbeda:

| Aspek | `ZBSP_PRCH_APP` | `ZPR_REL_BSP` |
|-------|-----------------|---------------|
| Dimana merge terjadi | **Backend (ABAP)**: GET_SIDEBAR menjumlah count dari 1200+2000+1000+1001+1100 | **Frontend**: Sidebar mengirim comma-separated werks |
| GET_LIST | Backend: tambah plant grouping ke RANGE | Frontend: kirim multiple werks, backend split |
| Keuntungan | Backend logic terpusat | Backend tidak perlu tahu grouping |
| Kerugian | Backend harus diubah jika grouping berubah | Setiap frontend harus implementasi grouping |

**Kesimpulan:** `ZPR_REL_BSP` lebih **decoupled**. `ZBSP_PRCH_APP` lebih **centralized**.

---

### 10.6 Perbedaan #6: Fitur-Fitur yang Hanya Ada di Satu Versi

#### Fitur eksklusif `ZBSP_PRCH_APP`:

| Fitur | Kenapa penting |
|-------|---------------|
| **Backend plant restriction** (`check_werks_allowed`) | **KEAMANAN** — melindungi data dari akses tidak sah via API |
| **Welcome modal** | UX — memberi ringkasan jumlah PR pending setiap hari |
| **Skeleton loading** | UX — mengurangi persepsi "lambat" saat loading sidebar |
| **ResizeObserver sticky toolbar** | UX — posisi toolbar lebih konsisten saat scroll |
| **9 CSS animations** | UX — transisi lebih halus dan profesional |
| **3 responsive breakpoints** | UX — lebih baik di tablet |
| **Custom scrollbar** | UX — tampilan lebih rapi |
| **`prefers-reduced-motion`** | **Aksesibilitas** — menghormati preferensi pengguna |
| **ERD documentation** | **Developer** — memahami relasi data |
| **Kategori activation guide** | **Developer** — panduan penambahan kategori |
| **1 toggle button (Expand/Collapse)** | UX — tombol lebih ringkas |

#### Fitur eksklusif `ZPR_REL_BSP`:

| Fitur | Kenapa penting |
|-------|---------------|
| **Approver workflow (KMI-BOD)** | **Business** — aplikasi bisa digunakan untuk approval sungguhan |
| **FAB + Multi-select** | UX — workflow approval lebih efisien (sekali proses banyak PR) |
| **CATEGORY_DEF per plant** | **Maintainability** — tambah kategori/plant gampang |
| **GROUP BY GET_SIDEBAR** | **Performance** — hanya 3 query untuk semua plant |
| **Dynamic plant grouping** | **Decoupling** — backend tidak perlu tahu grouping plant |

---

## 11. Kesimpulan Akhir

| Aspek | Pemenang | Alasan |
|-------|----------|--------|
| **Keamanan** | `ZBSP_PRCH_APP` | Backend plant restriction (check_werks_allowed) |
| **Maintainability** | `ZPR_REL_BSP` | CATEGORY_DEF per plant + lt_cat_def + GROUP BY |
| **Scalability** | `ZPR_REL_BSP` | 3 query GROUP BY vs 21+ query hardcode |
| **Business Value** | `ZPR_REL_BSP` | Bisa approve/reject PR |
| **UX Maturity** | `ZBSP_PRCH_APP` | Welcome modal, skeleton, animasi, ResizeObserver |
| **Aksesibilitas** | `ZBSP_PRCH_APP` | prefers-reduced-motion |
| **Arsitektur (decoupling)** | `ZPR_REL_BSP` | Plant grouping di frontend, backend unaware |
| **Dokumentasi** | `ZBSP_PRCH_APP` | ERD + panduan aktivasi kategori |
| **Overall** | **`ZBSP_PRCH_APP`** | Lebih aman, lebih matang UX |

**Catatan penting:** Kedua codebase memiliki kelebihan masing-masing. Idealnya, ambil `ZBSP_PRCH_APP` sebagai basis (karena lebih aman dan matang) lalu porting fitur-fitur dari `ZPR_REL_BSP`:
- Approver logic (KMI-BOD bisa approve)
- CATEGORY_DEF per plant + lt_cat_def + GROUP BY
- FAB + Multi-select
- Dynamic plant grouping via frontend

---

## 12. Saran Pengembangan UI Siap Implementasi di SE80

Bagian ini berisi **8 rekomendasi fitur UI** yang bisa ditambahkan ke codebase. Setiap rekomendasi:
- ✅ Bisa diimplementasikan di SAP SE80 (BSP) tanpa library eksternal
- ✅ Sudah siap copy-paste dengan kode lengkap
- ✅ Tidak memerlukan perubahan backend (`main.htm`)
- ✅ Kompatibel dengan kode yang sudah ada

---

### 12.1 Dark Mode Toggle

**Nilai tambah:** Meningkatkan kenyamanan penggunaan di ruang redup/gudang malam.

**Implementasi:**

```css
/* Tambahkan di dalam <style> block, sebelum @media prefers-reduced-motion */
body.dark {
  --navy-900:   #e2e8f0;
  --navy-700:   #cbd5e1;
  --primary:    #60a5fa;
  --primary-d:  #93bbfd;
  --primary-lt: #1e293b;
  --primary-lt2:#334155;
  --success:    #4ade80;
  --success-lt: #14532d;
  --danger:     #f87171;
  --danger-lt:  #450a0a;
  --warning:    #fbbf24;
  --warning-lt: #451a03;
  --info:       #38bdf8;
  --info-lt:    #0c4a6e;
  --surface:    #1e293b;
  --bg:         #0f172a;
  --bg-soft:    #1e293b;
  --border:     #334155;
  --border-soft:#1e293b;
  --text:       #f1f5f9;
  --text-soft:  #cbd5e1;
  --muted:      #94a3b8;
  --muted-lt:   #64748b;
}
body.dark .hdr {
  background: #0f172a;
  border-bottom-color: #1e293b;
}
body.dark .btn-toggle-sb {
  color: #94a3b8;
}
body.dark .hdr-logo {
  background: #334155;
}
```

```javascript
// Tambahkan di dekat fungsi toggleSidebar()
function toggleDark() {
  document.body.classList.toggle('dark');
  localStorage.setItem('darkMode', document.body.classList.contains('dark') ? '1' : '0');
}

// Di init(), tambahkan:
if (localStorage.getItem('darkMode') === '1') {
  document.body.classList.add('dark');
}
```

```html
<!-- Tambahkan di <header class="hdr">, setelah tombol hamburger: -->
<button class="btn-toggle-sb" onclick="toggleDark()"
        title="Toggle dark mode" aria-label="Toggle dark mode"
        style="font-size:16px;">&#9790;</button>
```

**Cara pakai:** Copy CSS ke dalam `<style>`, JS ke dekat `toggleSidebar()`, HTML button setelah hamburger menu.

---

### 12.2 Export History ke CSV

**Nilai tambah:** User bisa mendownload history approve/reject untuk diolah di Excel.

**Implementasi:**

```javascript
// Tambahkan di dekat fungsi buildHistTable()
function exportCSV(type) {
  var data = type === 'approve' ? histFilteredData : histFilteredData;
  if (!data || data.length === 0) { showToast('E', 'Tidak ada data untuk di-export'); return; }

  var isApp = (type === 'approve');
  var headers = ['No PR','Item','Kategori','Deskripsi','Dibuat Oleh','Tgl PR','Qty','UoM','Harga','Total','Curr','PGrp',
                 isApp ? 'Diapprove Oleh' : 'Direject Oleh',
                 isApp ? 'Tgl Approve' : 'Tgl Reject',
                 isApp ? 'Jam' : 'Alasan'];

  var rows = data.map(function(h){
    return [
      h.banfn, h.bnfpo, h.bsart, (h.txz01||'').replace(/,/g,' '),
      h.ernam, h.erdat, h.menge, h.meins, h.preis, h.total, h.waers, h.ekgrp,
      isApp ? h.app_by : h.del_by,
      isApp ? h.app_at : h.del_at,
      isApp ? h.app_tm : (h.reason||'')
    ].join(',');
  });

  var csv = '\uFEFF' + headers.join(',') + '\n' + rows.join('\n');
  var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  var url  = URL.createObjectURL(blob);
  var a    = document.createElement('a');
  a.href   = url;
  a.download = 'history_' + type + '_' + new Date().toISOString().slice(0,10) + '.csv';
  a.click();
  URL.revokeObjectURL(url);
  showToast('S', 'CSV berhasil di-download');
}
```

```html
<!-- Tambahkan di .toolbar (dekat tombol expand), setelah pagination count: -->
'<button class="btn-exp" onclick="exportCSV(\''+histType+'\')">&#128229; Export CSV</button>';
```

**Cara pakai:** Copy fungsi JS, lalu tambahkan button di `renderHistView()` di toolbar. `\uFEFF` adalah BOM untuk encoding UTF-8 yang benar di Excel.

---

### 12.3 Auto-Refresh Timer

**Nilai tambah:** User bisa memantau PR pending secara real-time tanpa klik manual setiap saat.

**Implementasi:**

```javascript
// Tambahkan di dekat state variables
var refreshInterval = null;
var refreshSeconds  = 30;
var refreshCountdown = 0;

function startRefresh(seconds) {
  stopRefresh();
  refreshSeconds = seconds || 30;
  refreshCountdown = refreshSeconds;
  updateRefreshBtn();
  refreshInterval = setInterval(function(){
    refreshCountdown--;
    updateRefreshBtn();
    if (refreshCountdown <= 0) {
      if (curMode === 'pending') fetchList(curEstkzFilter);
      else if (curMode === 'hist_app') fetchHistApp();
      else if (curMode === 'hist_rej') fetchHistRej();
      refreshCountdown = refreshSeconds;
    }
  }, 1000);
}

function stopRefresh() {
  if (refreshInterval) { clearInterval(refreshInterval); refreshInterval = null; }
  refreshCountdown = 0;
  updateRefreshBtn();
}

function updateRefreshBtn() {
  var btn = document.getElementById('btnRefresh');
  if (!btn) return;
  if (refreshInterval) {
    btn.innerHTML = '&#8635; Auto ' + refreshCountdown + 's';
    btn.style.borderColor = 'var(--primary)';
  } else {
    btn.innerHTML = '&#8635; Auto Refresh';
    btn.style.borderColor = 'var(--border)';
  }
}

function toggleRefresh() {
  if (refreshInterval) { stopRefresh(); }
  else { startRefresh(refreshSeconds); }
}
```

```html
<!-- Tambahkan di .toolbar setelah expand-bar: -->
'<button class="btn-exp" id="btnRefresh" onclick="toggleRefresh()">&#8635; Auto Refresh</button>';
```

**Cara pakai:** Copy JS functions, tambahkan button di `renderList()` dan `renderHistView()`. Panggil `stopRefresh()` di `switchView()` untuk reset timer saat pindah view.

---

### 12.4 Column Sorting pada History Table

**Nilai tambah:** User bisa mengurutkan history berdasarkan kolom manapun dengan klik header.

**Implementasi:**

```javascript
// Tambahkan di dekat state variables
var histSortColumn = '';
var histSortAsc = true;

function sortHistory(col) {
  if (histSortColumn === col) { histSortAsc = !histSortAsc; }
  else { histSortColumn = col; histSortAsc = true; }

  histFilteredData.sort(function(a,b){
    var va = (a[col]||'').toString().toLowerCase();
    var vb = (b[col]||'').toString().toLowerCase();
    var na = parseFloat(va), nb = parseFloat(vb);
    if (!isNaN(na) && !isNaN(nb)) { va = na; vb = nb; }
    if (va < vb) return histSortAsc ? -1 : 1;
    if (va > vb) return histSortAsc ? 1 : -1;
    return 0;
  });
  renderHistView();
}
```

```html
<!-- Ubah header th di buildHistTable() menjadi clickable: -->
html+='<th onclick="sortHistory(\'banfn\')" style="cursor:pointer;">No PR '+
      (histSortColumn==='banfn'?(histSortAsc?'&#9650;':'&#9660;'):'')+'</th>';
html+='<th onclick="sortHistory(\'bnfpo\')" style="cursor:pointer;">Item '+
      (histSortColumn==='bnfpo'?(histSortAsc?'&#9650;':'&#9660;'):'')+'</th>';
html+='<th onclick="sortHistory(\'bsart\')" style="cursor:pointer;">Kategori '+
      (histSortColumn==='bsart'?(histSortAsc?'&#9650;':'&#9660;'):'')+'</th>';
// ... dan seterusnya untuk kolom lain
```

**Cara pakai:** Copy fungsi `sortHistory()`, ubah `<th>` di `buildHistTable()` menjadi onclick handler dengan indikator panah ▲/▼.

---

### 12.5 Copy PR Number to Clipboard

**Nilai tambah:** User bisa copy No PR dengan satu klik untuk mencari di transaksi SAP lain (ME5A, ME53N, dll).

**Implementasi:**

```javascript
// Tambahkan fungsi utility
function copyToClip(text, label) {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).then(function(){
      showToast('S', (label||'') + ' ' + text + ' disalin');
    }).catch(function(){
      fallbackCopy(text, label);
    });
  } else {
    fallbackCopy(text, label);
  }
}
function fallbackCopy(text, label) {
  var ta = document.createElement('textarea');
  ta.value = text; ta.style.position='fixed'; ta.style.opacity='0';
  document.body.appendChild(ta); ta.select();
  document.execCommand('copy'); document.body.removeChild(ta);
  showToast('S', (label||'') + ' ' + text + ' disalin');
}
```

```html
<!-- Di renderList(), ubah card-num menjadi clickable: -->
html+='<span class="card-num" style="cursor:pointer;" '+
      'onclick="event.stopPropagation();copyToClip(\''+pr.banfn+'\',\'PR\')" '+
      'title="Klik untuk copy No PR">'+pr.banfn+'</span>';

<!-- Di buildHistTable(), ubah td pertama menjadi clickable: -->
html+='<td style="cursor:pointer;font-family:\'DM Mono\',monospace;font-weight:600;color:var(--primary-d);" '+
      'onclick="copyToClip(\''+h.banfn+'\',\'PR\')" title="Klik untuk copy">'+
      escHtml(h.banfn)+'</td>';
```

**Cara pakai:** Copy 2 fungsi JS, tambahkan `onclick` di elemen No PR. Menggunakan `navigator.clipboard` dengan fallback `execCommand`.

---

### 12.6 Keyboard Shortcuts

**Nilai tambah:** Power user bisa navigasi lebih cepat tanpa mouse.

**Implementasi:**

```javascript
// Tambahkan di event listener keydown (dekat yang sudah ada untuk Escape)
document.addEventListener('keydown', function(e){
  var key = e.key;
  var ctrl = e.ctrlKey;

  // ? atau / → show shortcut help
  if (key === '?' || (ctrl && key === '/')) {
    e.preventDefault();
    showShortcutHelp();
  }
  // R → refresh
  if (key === 'r' && !ctrl && !e.target.matches('input,textarea,select')) {
    e.preventDefault();
    if (curMode === 'pending') fetchList(curEstkzFilter);
    else if (curMode === 'hist_app') fetchHistApp();
    else if (curMode === 'hist_rej') fetchHistRej();
  }
  // E → toggle expand all
  if (key === 'e' && !ctrl && !e.target.matches('input,textarea,select')) {
    e.preventDefault();
    if (typeof toggleAll === 'function') toggleAll();
  }
  // 1-9 → navigate to plant (1=Surabaya, 2=Semarang)
  if (key >= '1' && key <= '9' && !ctrl && !e.target.matches('input,textarea,select')) {
    e.preventDefault();
    var plantKeys = { '1':'1200', '2':'1300' };
    if (plantKeys[key]) {
      var sec = document.getElementById('sbSec_' + plantKeys[key]);
      if (sec) { sec.classList.add('open'); toggleSection(plantKeys[key]); }
    }
  }
});

// Shortcut help modal
function showShortcutHelp() {
  var html =
    '<div class="modal show" id="modalShortcut" onclick="if(event.target===this)closeModal(\'modalShortcut\')">' +
    '<div class="modal-box" style="max-width:420px;">' +
    '<div class="modal-title">&#9000; Keyboard Shortcuts</div>' +
    '<table style="width:100%;border-collapse:collapse;font-size:13px;">' +
    '<tr><td style="padding:6px 12px;"><kbd style="background:#eef1f8;padding:2px 8px;border-radius:4px;">?</kbd></td><td style="padding:6px 12px;">Bantuan ini</td></tr>' +
    '<tr><td style="padding:6px 12px;"><kbd style="background:#eef1f8;padding:2px 8px;border-radius:4px;">R</kbd></td><td style="padding:6px 12px;">Refresh data</td></tr>' +
    '<tr><td style="padding:6px 12px;"><kbd style="background:#eef1f8;padding:2px 8px;border-radius:4px;">E</kbd></td><td style="padding:6px 12px;">Expand/Collapse all</td></tr>' +
    '<tr><td style="padding:6px 12px;"><kbd style="background:#eef1f8;padding:2px 8px;border-radius:4px;">1</kbd></td><td style="padding:6px 12px;">Surabaya</td></tr>' +
    '<tr><td style="padding:6px 12px;"><kbd style="background:#eef1f8;padding:2px 8px;border-radius:4px;">2</kbd></td><td style="padding:6px 12px;">Semarang</td></tr>' +
    '<tr><td style="padding:6px 12px;"><kbd style="background:#eef1f8;padding:2px 8px;border-radius:4px;">Esc</kbd></td><td style="padding:6px 12px;">Tutup modal</td></tr>' +
    '</table></div></div>';
  var el = document.createElement('div');
  el.innerHTML = html;
  document.body.appendChild(el);
  // Cleanup on close
  var checkClose = setInterval(function(){
    if (!document.getElementById('modalShortcut')) { clearInterval(checkClose); }
  }, 100);
  // Override closeModal to also remove element
  var origClose = closeModal;
  closeModal = function(id) {
    origClose(id);
    if (id === 'modalShortcut') {
      setTimeout(function(){
        var el = document.getElementById('modalShortcut');
        if (el) el.remove();
      }, 300);
    }
  };
}
```

**Cara pakai:** Gabungkan dengan event listener `keydown` yang sudah ada. Tambahkan fungsi `showShortcutHelp()`. Shortcuts: `?` (help), `R` (refresh), `E` (expand all), `1` (Surabaya), `2` (Semarang).

---

### 12.7 Quick Filter Chips (Today/This Week/This Month)

**Nilai tambah:** User bisa cepat memfilter history berdasarkan periode waktu umum tanpa harus scroll pagination.

**Implementasi:**

```javascript
// Tambahkan fungsi
function setQuickFilter(period) {
  var now = new Date();
  var start = new Date(now);

  if (period === 'today') { /* start = today 00:00 */ }
  else if (period === 'week') { start.setDate(start.getDate() - start.getDay()); }
  else if (period === 'month') { start.setDate(1); }

  var y = now.getFullYear();
  var m = String(now.getMonth()+1).padStart(2,'0');
  var d = String(now.getDate()).padStart(2,'0');
  var todayStr = d + '.' + m + '.' + y;

  var sy = start.getFullYear();
  var sm = String(start.getMonth()+1).padStart(2,'0');
  var sd = String(start.getDate()).padStart(2,'0');
  var startStr = sd + '.' + sm + '.' + sy;

  // Filter histFilteredData by date range (erdat field)
  histFilteredData = (histData || []).filter(function(h){
    var dt = h.erdat || '';
    if (dt.length !== 10) return true;
    return dt >= startStr && dt <= todayStr;
  });
  histCurPage = 1;
  renderHistView();
}
```

```html
<!-- Tambahkan di toolbar history, setelah search input: -->
'<button class="btn-exp" onclick="setQuickFilter(\'today\')">Hari Ini</button>'+
'<button class="btn-exp" onclick="setQuickFilter(\'week\')">Minggu Ini</button>'+
'<button class="btn-exp" onclick="setQuickFilter(\'month\')">Bulan Ini</button>'
```

**Cara pakai:** Tambahkan fungsi filter dan 3 button di toolbar history view. Gunakan format tanggal SAP `DD.MM.YYYY` untuk komparasi string.

---

### 12.8 Sticky Table Header untuk History

**Nilai tambah:** Header kolom tetap terlihat saat scroll panjang history table.

**Implementasi (CSS only):**

```css
/* Tambahkan ke §9 History Table di <style> */
.hist-table thead th {
  position: sticky;
  top: 0;
  z-index: 5;
}
```

```javascript
// Tambahkan di renderHistView(), setelah html di-set:
// Pastikan container punya max-height dan overflow
var wrap = document.querySelector('.hist-table-wrap');
if (wrap) {
  wrap.style.maxHeight = 'calc(100vh - 320px)';
  wrap.style.overflowY = 'auto';
}
```

**Cara pakai:** Copy CSS ke section history table. Tambahkan JS di `renderHistView()`. **Note:** Ini membuat header tetap visible saat scroll di dalam wrapper, berbeda dengan sticky kolom pertama yang sudah ada.

---

### Tabel Prioritas Implementasi

| Prioritas | Fitur | Estimasi Waktu | Tingkat Kesulitan | Dampak |
|-----------|-------|----------------|-------------------|--------|
| ⭐⭐⭐ | **Export CSV** | 15 menit | Mudah | Tinggi — user bisa olah data di Excel |
| ⭐⭐⭐ | **Copy PR Number** | 5 menit | Sangat Mudah | Sedang — akses cepat ke transaksi SAP lain |
| ⭐⭐ | **Dark Mode** | 20 menit | Mudah | Tinggi — kenyamanan mata |
| ⭐⭐ | **Quick Filter Chips** | 15 menit | Mudah | Sedang — akses cepat history periodik |
| ⭐⭐ | **Column Sorting** | 20 menit | Mudah | Sedang — fleksibilitas sorting |
| ⭐ | **Auto-Refresh** | 20 menit | Sedang | Sedang — monitoring real-time |
| ⭐ | **Keyboard Shortcuts** | 25 menit | Sedang | Sedang — power user productivity |
| ⭐ | **Sticky Table Header** | 5 menit | Sangat Mudah | Rendah — visual polish |

**Rekomendasi:** Mulai dari **Export CSV** + **Copy PR Number** (paling cepat dan berdampak tinggi). Lalu **Dark Mode** untuk polish. Terakhir **Auto-Refresh** jika dibutuhkan monitoring real-time.

---

## 13. Refactoring Maintainability — ZBSP_PRCH_APP → ZPR_REL_BSP Pattern

Pada 23 Juni 2026, `ZBSP_PRCH_APP/index.htm` direfaktor untuk mendekati maintainability `ZPR_REL_BSP` **tanpa mengubah logic/flow sistem**.

### Perubahan yang Dilakukan

| Area | Sebelum | Sesudah | Baris Berkurang |
|------|---------|---------|-----------------|
| **Pagination** | `renderPagination` (43 baris) + `renderHistPagination` (43 baris) — duplikasi nyaris identik | `buildPagination(cfg)` (28 baris) digunakan oleh kedua view | **-58 baris** |
| **Konfigurasi Plant** | `PLANT_LABELS` (objek label) + `PLANT_CATEGORIES` (objek array) — terpisah | `PLANT_DEF` (satu objek dengan `{label, categories}` per plant) | Tetap |
| **Konfigurasi Kategori** | `PR_CATEGORIES` — nama tidak konsisten | `CATEGORY_DEF` — nama konsisten dgn ZPR_REL_BSP | Tetap |
| **Lookup helpers** | Akses langsung (`PLANT_LABELS[x]` / `PLANT_CATEGORIES[x]`) | `getPlantLabel(x)` / `getPlantCats(x)` — DRY, siap untuk plant grouping dinamis | 0 |
| **Dead code** | `getEstkzLabel` didefinisikan **2 kali** (duplikasi) | 1 definisi di §C6 | -5 baris |
| **Section markers** | Komentar section tanpa indeks | **JS INDEX** di baris 961-993 dengan semua 22 section ber-`§` prefix | +46 baris (dokumentasi) |

### Perbandingan Sebelum/Sesudah

| Metrik | Sebelum Refactor | Sesudah Refactor |
|--------|-----------------|------------------|
| **Total baris** | 2.062 | 2.108 (+46 dari JS INDEX) |
| **Jumlah fungsi** | ~40 | ~40 (sama, `renderPagination` dihapus, `buildPagination` ditambah) |
| **Duplikasi pagination** | ~86 baris identik | 0 baris duplikasi |
| **Konfigurasi terpusat** | 3 objek (`PLANT_LABELS` + `PR_CATEGORIES` + `PLANT_CATEGORIES`) | 2 objek (`PLANT_DEF` + `CATEGORY_DEF`) |
| **Helper functions** | `getBsartLabel`, `getEstkzLabel` | Ditambah `getPlantLabel`, `getPlantCats` |

### Apa yang Tidak Diubah

Berikut sengaja **tidak disentuh** karena akan mengubah flow/logic:
- Plant grouping logic (masih di backend `main.htm`, bukan frontend seperti ZPR_REL_BSP)
- Approver logic (KMI-BOD belum bisa approve — masih read-only)
- Event handling pattern (masih inline `onclick` — aman di BSP/SE80)
- String concatenation HTML (masih `html+=` — tidak ada template engine di SE80)

### Status Maintainability Sekarang

| Aspek | Rating | Catatan |
|-------|--------|---------|
| **Konfigurasi terpusat** | ✅ Baik | `PLANT_DEF` + `CATEGORY_DEF` setara dengan `CATEGORY_DEF` + `PLANT_LABELS` ZPR_REL_BSP |
| **DRY** | ✅ Baik | Pagination tidak lagi duplikat |
| **Navigasi SE80** | ✅ Baik | JS INDEX dengan `§` prefix memudahkan Ctrl+F |
| **Decoupling** | ⚠️ Perlu porting | Plant grouping masih di backend — perlu porting `getEffectiveWerks()` dari ZPR_REL_BSP |
| **Event handling** | ❌ Masih inline | ~30+ inline `onclick` — terlalu berat untuk direfaktor tanpa test |

*Laporan dibuat berdasarkan analisis kode sumber tanggal 23 Juni 2026. Total 2.241 baris (ZBSP_PRCH_APP) dan 2.507 baris (ZPR_REL_BSP) dianalisis secara menyeluruh.*
