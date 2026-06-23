# Laporan Perbandingan: `ZBSP_PRCH_APP` vs `ZPR_REL_BSP`

**Tanggal:** 23 Juni 2026
**Root:** `D:\DEV\Breakdown ROTO SAP\`

---

## 1. Ringkasan Umum

| Aspek | `ZBSP_PRCH_APP` | `ZPR_REL_BSP` |
|-------|-----------------|---------------|
| Status | Versi rujukan (sebelum merge) | Versi hasil merge dengan `jasa_copy` |
| Total file teks | 4 file | 4 file |
| Lokasi file utama | `Page with FLow Logic/index.htm` + `main.htm` | `Page with FLow Logic/index.htm` + `main.htm` + `index-merge.htm` (root) |
| Dokumentasi | `erd.md` (577 baris), `TAMBAH_KATEGORI.md` (141 baris) | `Session Notes - 22 Jun 2026.md` (229 baris) |
| Total LOC | ~4.009 | ~6.296 |
| Images MIME | 4 PNG (0 byte placeholder) | 4 PNG (0 byte placeholder) |
| Approver | Semua user **read-only** (`lv_is_approver = abap_false`) | Hanya **KMI-BOD** yang bisa approve |

---

## 2. Perbandingan Struktur File

### 2.1 Struktur Direktori

```
ZBSP_PRCH_APP/                          ZPR_REL_BSP/
│                                       │
├── erd.md                              ├── index-merge.htm
├── TAMBAH_KATEGORI.md                  ├── Session Notes - 22 Jun 2026.md
├── MIMEs/                              ├── MIMEs/
│   ├── background.png (0 B)            │   ├── background.png (0 B)
│   ├── logo.png (0 B)                  │   ├── logo.png (0 B)
│   ├── semarang.png (0 B)              │   ├── semarang.png (0 B)
│   └── surabaya.png (0 B)              │   └── surabaya.png (0 B)
└── Page with FLow Logic/               └── Page with FLow Logic/
    ├── main.htm (1.229 baris)              ├── main.htm (1.154 baris)
    └── index.htm (2.062 baris)             └── index.htm (2.241 baris)
```

**Catatan:** Kedua direktori memiliki struktur yang identik. `ZPR_REL_BSP` memiliki tambahan file `index-merge.htm` di root yang merupakan hasil merge antara `index.htm` lama dengan versi `jasa_copy`.

### 2.2 Perbandingan Ukuran File

| File | `ZBSP_PRCH_APP` | `ZPR_REL_BSP` |
|------|-----------------|---------------|
| `index.htm` | 2.062 baris / 87.659 byte | 2.241 baris / 67.785 byte |
| `main.htm` | 1.229 baris / 41.021 byte | 1.154 baris / 38.970 byte |
| `index-merge.htm` | — | 2.672 baris / 92.592 byte |

**Observasi:** `ZBSP_PRCH_APP` memiliki `main.htm` yang lebih panjang (+75 baris), sementara `ZPR_REL_BSP` memiliki `index.htm` yang lebih panjang (+179 baris) dengan lebih banyak fitur frontend.

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
| `curCategory` | ❌ (tidak ada) | ✅ `''` |
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

**`ZBSP_PRCH_APP`** — Menggunakan `PR_CATEGORIES` + `PLANT_CATEGORIES`:
```javascript
// Baris 999-1009
var PR_CATEGORIES = {
  'ROTO': { label:'PR Maintenance', short:'Maintenance', icon:'&#128203;' },
  'PRK9': { label:'PR RND',         short:'RND',         icon:'&#128736;' },
  'RSBR': { label:'PR RND',         short:'RND',         icon:'&#128736;' },
  'PRKS': { label:'PR Service',     short:'Service',     icon:'&#128295;' }
};

var PLANT_CATEGORIES = {
  '1200': ['ROTO', 'PRK9', 'PRKS'],
  '1300': ['ROTO', 'PRKS']
};
```

**`ZPR_REL_BSP`** — Menggunakan `CATEGORY_DEF` (lebih terstruktur dengan mapping plant-category-bsart):
```javascript
// Baris 837-860
var CATEGORY_DEF = {
  '1200': [
    {code:'MTN', label:'PR Maintenance', short:'Maintenance', icon:'...', bsart:'ROTO'},
    {code:'RND', label:'PR RND',         short:'RND',         icon:'...', bsart:'RSBR,PRK9'},
    {code:'SVC', label:'PR Service',     short:'Service',     icon:'...', bsart:'PRKS'}
  ],
  '1300': [
    {code:'MTN', label:'PR Maintenance', short:'Maintenance', icon:'...', bsart:'ROTO'},
    {code:'SVC', label:'PR Service',     short:'Service',     icon:'...', bsart:'PRKS'}
  ],
  '2000': [
    {code:'MTN', label:'PR Maintenance', short:'Maintenance', icon:'...', bsart:'ROTO'},
    {code:'RND', label:'PR RND',         short:'RND',         icon:'...', bsart:'RSBR,PRK9'},
    {code:'SVC', label:'PR Service',     short:'Service',     icon:'...', bsart:'PRKS'}
  ]
};
```

**Perbedaan kunci:**
| Aspek | `ZBSP_PRCH_APP` | `ZPR_REL_BSP` |
|-------|-----------------|---------------|
| Category codes | ROTO, PRK9, RSBR, PRKS | MTN, RND, SVC |
| Struktur | Flat (PR_CATEGORIES) + plant mapping (PLANT_CATEGORIES) | Per-plant array (CATEGORY_DEF) |
| Plant 2000 | Tidak ada di PLANT_CATEGORIES | Ada 3 kategori |
| BSART mapping | implicit (via PR_CATEGORIES key) | explicit (`cat.bsart`) |
| Dinamis | Kurang dinamis | Lebih mudah ditambah kategori baru |

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
| `count_pending` | ✅ **(baris 227-244)** — SELECT + SORT + COUNT | ❌ **Tidak ada** (pakai lt_cat_def + SELECT langsung) |

### 4.4 Approach GET_SIDEBAR (Perbedaan Paling Signifikan)

**`ZBSP_PRCH_APP`** — Menggunakan macro `count_pending` per plant + per kategori + merge 2000 ke 1200 secara manual:
```abap
count_pending 'ROTO' '1200' lv_s_1200_roto.
count_pending 'RSBR,PRK9' '1200' lv_s_1200_PRK9.
count_pending 'PRKS' '1200' lv_s_1200_PRKS.
count_pending 'ROTO' '1300' lv_s_1300_roto.
count_pending 'RSBR,PRK9' '1300' lv_s_1300_PRK9.
count_pending 'PRKS' '1300' lv_s_1300_PRKS.
count_pending 'ROTO' '2000' lv_s_2000_roto.
count_pending 'RSBR,PRK9' '2000' lv_s_2000_PRK9.
count_pending 'PRKS' '2000' lv_s_2000_PRKS.

" Merge 2000 ke 1200
lv_tmp_i = lv_s_1200_roto + lv_s_2000_roto...

" JSON hardcode per plant
"1200":{ROTO,PRK9,PRKS}
"1300":{ROTO,PRKS}
```

**`ZPR_REL_BSP`** — Menggunakan `lt_cat_def` (internal table) + LOOP:
```abap
lt_cat_def = VALUE #(
  ( werks = '1200' category = 'MTN' bsart = 'RSBR,PRK9' )
  ( werks = '1200' category = 'SVC' bsart = 'PRKS' )
  ( werks = '1300' category = 'MTN' bsart = 'ROTO' )
  ...
).

LOOP AT lt_cat_def INTO ls_cat_def.
  SELECT COUNT(*) ... WHERE werks = ls_cat_def-werks AND ...
  " Output JSON dinamis
ENDLOOP.
```

**Perbandingan:**

| Aspek | `ZBSP_PRCH_APP` (count_pending macro) | `ZPR_REL_BSP` (lt_cat_def loop) |
|-------|---------------------------------------|----------------------------------|
| Pendekatan | **Hardcode** — setiap plant + kategori ditulis manual | **Dinamis** — loop internal table |
| JSON output | Hardcode string CONCATENATE | Dinamis via LOOP |
| Plant 2000 | Manual merge ke 1200 | Langsung sebagai entry di `lt_cat_def` |
| Tambah kategori | Ubah 3-4 tempat | Cukup tambah baris di `lt_cat_def` |
| Resiko error | Tinggi (human error) | Rendah |
| Performa | Lebih cepat (langsung) | Sama (hanya loop kecil) |

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
| Release code | `'P2'` | `'P2'` |
| Error handling | ✅ BAPI return code check (sy-subrc 1-7) | ✅ BAPI return code check (sy-subrc 1-7) |
| Commit | ✅ BAPI_TRANSACTION_COMMIT | ✅ BAPI_TRANSACTION_COMMIT |
| Rollback | ✅ BAPI_TRANSACTION_ROLLBACK | ✅ BAPI_TRANSACTION_ROLLBACK |
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

## 5. Perbandingan Plant 2000

| Aspek | `ZBSP_PRCH_APP` | `ZPR_REL_BSP` |
|-------|-----------------|---------------|
| **Ada di `PLANT_LABELS`** | ✅ `'2000':'Surabaya'` | ✅ `'2000':'Surabaya'` |
| **Ada di backend GET_SIDEBAR** | ✅ count_pending untuk 2000, merge ke 1200 | ✅ entry di `lt_cat_def` untuk plant 2000 |
| **Ada di GET_LIST** | ✅ werks RANGE mencakup 2000 saat pilih 1200 | ✅ werks RANGE dari `lv_werks` (frontend kirim `'1200,2000'`) |
| **Ada di GET_HIST_REJ** | ✅ werks RANGE mencakup 2000 | ✅ werks RANGE dari `lv_werks` |
| **Ada di GET_HIST_APP** | ✅ werks RANGE mencakup 2000 | ✅ werks RANGE dari `lv_werks` |
| **Frontend `getEffectiveWerks`** | ✅ `'1200'` → `'1200,2000'` | **Ada** (baris 954-957) |
| **Frontend `getSidebarWerks`** | ✅ `'1200'` → `['1200','2000']` | **Ada** (baris 959-962) |
| **Card badge display** | `PLANT_LABELS[pr.werks]` → `'Surabaya'` | `getPlantLabel(pr.werks)` → `'Surabaya'` |
| **sbCounts untuk 2000** | ✅ merging ke 1200 | ✅ direct di `sbCounts.pending['2000']` |

---

## 6. Perbandingan `index-merge.htm` vs `index.htm` di `ZPR_REL_BSP`

`ZPR_REL_BSP` memiliki **2 file frontend**: `Page with FLow Logic/index.htm` (original) dan `index-merge.htm` (hasil merge di root).

### Perbedaan `index-merge.htm` dengan `index.htm` (ZPR_REL_BSP):

| Fitur | `index.htm` | `index-merge.htm` |
|-------|-------------|-------------------|
| **Total baris** | 2.241 | 2.672 (+431 baris) |
| **CSS variables** | 11 variabel | **32 variabel** (sama dengan `ZBSP_PRCH_APP`) |
| **Welcome modal** | ❌ | ✅ (via Navigation Timing API, setiap refresh) |
| **Skeleton loading** | ❌ | ✅ |
| **ResizeObserver** | ❌ | ✅ `observeToolbarOffset()` |
| **Google Font** | DM Sans + DM Mono | **Inter** + DM Mono |
| **Tombol expand/collapse** | 2 tombol terpisah | **1 tombol toggle** |
| **Toast animation** | tanpa fade | ✅ fade-out |
| **byColor variable** | ✅ dideklarasi benar | ✅ dideklarasi benar |
| **`onHistSearch` params** | 3 params (val, data, type) | 1 param (val) |
| **Badge pending text** | `"Pending"` | `"In Release"` |
| **Bug duplicate functions** | ❌ minim | ✅ **ADA** — fungsi di script block 1 di-override block 2 |
| **Card detail table** | inline styles | class `.detail-tbl` |
| **Scrollbar custom** | ❌ | ✅ |

### Daftar fungsi DUPLIKAT di `index-merge.htm`:

Akibat proses merge, fungsi-fungsi ini muncul **dua kali** (script block 1: baris 1105-2482, script block 2: baris 2483-2670):

| Fungsi | Block 1 (baris) | Block 2 (baris) |
|--------|-----------------|-----------------|
| `renderList()` | ~1807 | ~1810 (Override) |
| `renderHistTable()` | ~2034 | ~2034 (Sama) |
| `buildHistTable()` | ~2080 | ~2080 (Sama) |
| `toggleExpand()` | ~2293 | ~2296 (Sama) |
| `expandAll()` | ~2302 | ~2305 (Sama) |
| `collapseAll()` | ~2317 | ~2320 (Sama) |
| `loadDetail()` | ~2328 | ~2331 (Sama) |
| `toggleSelect()` | ~2407 | ~2410 (Sama) |
| `toggleSelectAll()` | ~2418 | ~2421 (Sama) |
| `syncCheckboxes()` | ~2458 | ~2461 (Sama) |
| `updateFabInfo()` | ~2469 | ~2472 (Sama) |

---

## 7. Perbandingan Dokumentasi

### `erd.md` (`ZBSP_PRCH_APP`) — 577 baris
- Entity Relationship Diagram lengkap
- Menjelaskan 6 tabel (4 SAP standard + 2 Z custom)
- Menjelaskan 5 kategori: **ROTO, RSB7, RSBT, RSB8, RSM8**
- **Catatan:** ERD mendokumentasikan kode yang berbeda dengan implementasi aktual (kode aktual pakai ROTO/PRK9/RSBR/PRKS)
- Menjelaskan constraint dan relasi antar tabel

### `TAMBAH_KATEGORI.md` (`ZBSP_PRCH_APP`) — 141 baris
- Panduan step-by-step aktivasi 3 kategori dormant: **RSBT, RSB8, RSM8**
- Dengan line reference spesifik untuk index.htm dan main.htm
- Berguna untuk pengembangan kedepan

### `Session Notes - 22 Jun 2026.md` (`ZPR_REL_BSP`) — 229 baris
- Catatan developer tentang proses merge
- Bug fix: `byColor is not defined`
- Perubahan welcome modal (localStorage → Navigation Timing API)
- 12 perubahan UI/UX yang sudah dilakukan
- 9 perbedaan visual yang tersisa
- 6 perbedaan arsitektur yang sengaja dipertahankan
- 4 perbedaan UX yang sengaja dipertahankan

---

## 8. Ringkasan Perbedaan Arsitektur

### 8.1 Category Model

```
ZBSP_PRCH_APP:                          ZPR_REL_BSP:
PR_CATEGORIES = {                       CATEGORY_DEF = {
  'ROTO':{...}      ← doc type           '1200':[
  'PRK9':{...}      ← doc type             {code:'MTN', bsart:'ROTO'}
  'RSBR':{...}      ← doc type             {code:'RND', bsart:'RSBR,PRK9'}
  'PRKS':{...}      ← doc type             {code:'SVC', bsart:'PRKS'}
}                                         ]
PLANT_CATEGORIES = {                     '1300':[
  '1200':['ROTO','PRK9','PRKS']            {code:'MTN', bsart:'ROTO'}
  '1300':['ROTO','PRKS']                   {code:'SVC', bsart:'PRKS'}
}                                         ]
                                        }
```

### 8.2 Plant Restriction

```
ZBSP_PRCH_APP:                          ZPR_REL_BSP:
- Backend (main.htm):                   - Frontend (index.htm):
  check_werks_allowed macro               - user filter di renderSidebar()
  (KMI-U052, U051, U151)                 - Tidak ada backend check
- Frontend (index.htm):                 - Approver: KMI-BOD
  user filter di renderSidebar()
```

### 8.3 Frontend-Backend Communication

Keduanya menggunakan pola yang sama: `fetch(API_URL + '?action=...&werks=...&bsart=...')` → JSON response.

**Perbedaan:** `ZBSP_PRCH_APP` backend mengirim `is_approver` di response GET_SIDEBAR. `ZPR_REL_BSP` tidak mengirim `is_approver` di JSON — frontend mendapatkan info approver dari ABAP langsung di awal via `<%=lv_is_approver%>` (tapi ini tidak ada di index.htm).

### 8.4 Code Duplication

| Aspek | `ZBSP_PRCH_APP` | `ZPR_REL_BSP` |
|-------|-----------------|---------------|
| index.htm | **Bersih** — tidak ada duplikasi | **Bersih** — tidak ada duplikasi |
| index-merge.htm | — | **Ada duplikasi** — 11+ fungsi muncul 2 kali |
| main.htm | Bersih | Bersih |

---

## 9. Matriks Fitur Lengkap

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
| 26 | Plant 2000 (Surabaya extension) | ✅ | ✅ |
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
| 37 | Developer session notes | ❌ | ✅ |
| 38 | Full backend plant restriction | ✅ | ❌ |
| 39 | Dynamic category definitions | ❌ (hardcode) | ✅ (CATEGORY_DEF) |
| 40 | Dynamic GET_SIDEBAR (lt_cat_def loop) | ❌ (hardcode) | ✅ (dinamis) |

---

## 10. Analisis dan Rekomendasi

### 10.1 Kelebihan `ZBSP_PRCH_APP`

1. **Backend plant restriction** — `check_werks_allowed` macro melindungi data di server-side
2. **Welcome modal** — UX lebih informatif dengan ringkasan PR
3. **Skeleton loading** — Persiapan UX yang lebih baik
4. **ResizeObserver** — Toolbar sticky lebih akurat
5. **CSS lebih profesional** — 32 design tokens, 9 animasi, 3 breakpoints
6. **Toggle expand/collapse** — 1 tombol lebih intuitif
7. **Dokumentasi** — ERD + panduan aktivasi kategori
8. **Tidak ada duplikasi kode** — index.htm bersih

### 10.2 Kelebihan `ZPR_REL_BSP`

1. **Approver logic** — Bisa melakukan approve/reject (KMI-BOD)
2. **FAB + Multi-select** — UI workflow approval yang lebih lengkap
3. **CATEGORY_DEF dinamis** — Struktur data kategori lebih modular
4. **GET_SIDEBAR dinamis** — Loop lt_cat_def lebih mudah di-maintain
5. **index-merge.htm** — Hasil merge dengan fitur lebih lengkap
6. **Session notes** — Dokumentasi proses development

### 10.3 Rekomendasi

**Arsitektur terbaik** adalah menggabungkan kelebihan keduanya:

1. **Dari `ZBSP_PRCH_APP`**: Backend plant restriction (`check_werks_allowed`), welcome modal, skeleton loading, ResizeObserver, CSS lengkap, 1 tombol toggle
2. **Dari `ZPR_REL_BSP`**: Approver logic (KMI-BOD), CATEGORY_DEF dinamis, FAB + multi-select, lt_cat_def loop, error handling cleanup history
3. **Dari keduanya**: Plant 2000 support (sudah ada di kedua versi)

**Prioritas tinggi:**
- Tambahkan `check_werks_allowed` ke `ZPR_REL_BSP` untuk keamanan server-side
- Pindahkan welcome modal & skeleton loading dari `ZBSP_PRCH_APP` ke `ZPR_REL_BSP`
- Bersihkan duplikasi fungsi di `index-merge.htm`

---

## 11. Identifikasi Perbedaan Paling Fundamental

Bagian ini merangkum **7 perbedaan paling signifikan** yang mempengaruhi arsitektur, keamanan, maintainability, dan user experience secara fundamental.

---

### 11.1 Perbedaan #1: Model Kategori — "Doc Type sebagai Key" vs "Business Function sebagai Key"

**Ini adalah perbedaan arsitektur paling mendasar antara kedua codebase.**

| Aspek | `ZBSP_PRCH_APP` | `ZPR_REL_BSP` |
|-------|-----------------|---------------|
| Paradigma | **Technical** — kategori = doc type SAP | **Functional** — kategori = business process |
| Key category | `ROTO`, `PRK9`, `RSBR`, `PRKS` | `MTN` (Maintenance), `RND` (R&D), `SVC` (Service) |
| Contoh isi | `'ROTO':{label:'Maintenance'}` | `'MTN':{label:'Maintenance', bsart:'ROTO'}` |
| Jumlah kode kategori | 4 (ROTO, PRK9, RSBR, PRKS) | 3 (MTN, RND, SVC) |
| BSART mapping | Implisit (nama key == doc type) | Eksplisit (property `bsart`) |

**Dampak:**
- **`ZBSP_PRCH_APP`**: Kode lebih sederhana untuk programmer SAP (karena nama category = doc type), tapi repot jika satu kategori punya multiple doc type (makanya `RSBR` dan `PRK9` jadi duplikasi dengan label sama).
- **`ZPR_REL_BSP`**: Lebih abstrak dan business-oriented. Jika requirements berubah (misal: PR RND pakai doc type baru `RND1`), cukup update satu property `bsart` — tidak perlu bikin entry baru. Juga lebih mudah dipahami oleh non-SAP stakeholder.
- **Keduanya incompatible**: Data JSON dari backend `ZBSP_PRCH_APP` mengembalikan `{"1200":{"ROTO":5}}`, sedangkan `ZPR_REL_BSP` mengembalikan `{"1200":{"MTN":5}}`. Frontend tidak bisa saling tukar.

**Kesimpulan:** `ZPR_REL_BSP` (functional) lebih unggul untuk maintainability jangka panjang.

---

### 11.2 Perbedaan #2: Keamanan — Plant Restriction "Full Backend+Frontend" vs "Frontend Only"

| Aspek | `ZBSP_PRCH_APP` | `ZPR_REL_BSP` |
|-------|-----------------|---------------|
| Backend check | ✅ **Ada** — `check_werks_allowed` macro di SETIAP action (GET_LIST, GET_HIST_REJ, GET_HIST_APP) | ❌ **Tidak ada** — backend percaya pada `lv_werks` yang dikirim frontend |
| Frontend filter | ✅ Filter sidebar sesuai user | ✅ Filter sidebar sesuai user |
| User yg direstriksi | KMI-U052 (1200), KMI-U151 (1200), KMI-U051 (1300) | Tidak ada |
| Tingkat keamanan | **High** — double security | **Low** — hanya client-side |

**Dampak:**
- Di `ZPR_REL_BSP`, user KMI-U151 bisa mengirim request `POST main.htm?action=GET_LIST&werks=1300` langsung (via browser dev tools atau curl) dan **backend akan mengembalikan data Semarang** karena tidak ada validasi.
- Di `ZBSP_PRCH_APP`, macro `check_werks_allowed` akan memblokir request tersebut dengan response `"Anda tidak memiliki akses ke plant ini"`.

**Kesimpulan:** `ZBSP_PRCH_APP` **jauh lebih aman**. Ini adalah critical security issue di `ZPR_REL_BSP`.

---

### 11.3 Perbedaan #3: Arsitektur GET_SIDEBAR — "Hardcode Statement" vs "Dynamic Loop"

| Aspek | `ZBSP_PRCH_APP` | `ZPR_REL_BSP` |
|-------|-----------------|---------------|
| Metode | Panggil `count_pending` macro untuk **setiap** plant+kategori (9 kali) | LOOP `lt_cat_def` yang berisi definisi plant+kategori (8 entry) |
| Tambah kategori baru | Ubah macro call + JSON concatenation (3-4 tempat) | Cukup tambah 1 baris di `lt_cat_def` |
| Tambah plant baru | Ubah macro call + variabel + JSON (banyak tempat) | Cukup tambah baris di `lt_cat_def` |
| Resiko human error | **Tinggi** — lupa update satu tempat saja sudah error | **Rendah** — cukup update satu file |
| Kode JSON output | String CONCATENATE manual — rentan typo | Dinamis dari LOOP + CONDENSE |

**Contoh konkret:** Misal ingin menambah plant `1400` (Bandung) dengan kategori MTN dan SVC.

Di **`ZBSP_PRCH_APP`** perlu:
1. Tambah variabel `lv_s_1400_roto`, `lv_s_1400_prks`, `lv_rj_1400`, `lv_ra_1400`
2. Tambah 2 baris `count_pending` untuk plant 1400
3. Tambah SELECT untuk hist_rej 1400
4. Tambah SELECT untuk hist_app 1400
5. Update user restriction (zero-out)
6. Update CONCATENATE JSON (4 tempat)

Di **`ZPR_REL_BSP`** cukup:
1. Tambah 2 baris di `lt_cat_def`:
   ```abap
   ls_cat_def-werks = '1400'. ls_cat_def-category = 'MTN'. ls_cat_def-bsart_cs = 'ROTO'.
   ls_cat_def-werks = '1400'. ls_cat_def-category = 'SVC'. ls_cat_def-bsart_cs = 'PRKS'.
   ```

**Kesimpulan:** `ZPR_REL_BSP` **jauh lebih maintainable** untuk jangka panjang.

---

### 11.4 Perbedaan #4: CODE DUPLICATION — "Bersih" vs "Bermasalah"

| Aspek | `index.htm (ZBSP_PRCH_APP)` | `index-merge.htm (ZPR_REL_BSP)` | `index.htm (ZPR_REL_BSP)` |
|-------|------------------------------|----------------------------------|----------------------------|
| Fungsi duplikat | ❌ **0** | ✅ **11+ fungsi** muncul 2x | ❌ **0** |
| Penyebab | Tidak ada proses merge | Hasil merge dari `jasa_copy` — 2 script block tidak digabung | Tidak ada proses merge |
| Dampak | ✅ Berfungsi normal | ❌ Berpotensi bug (fungsi block 1 di-override block 2, tapi state variable bisa berbeda) | ✅ Berfungsi normal |
| File size overhead | — | +431 baris dari duplikasi yang tidak perlu | — |

**Fungsi yang terduplikasi (muncul di kedua script block):**
`renderList`, `renderHistTable`, `buildHistTable`, `toggleExpand`, `expandAll`, `collapseAll`, `loadDetail`, `toggleSelect`, `toggleSelectAll`, `syncCheckboxes`, `updateFabInfo`

**Risiko:** Jika ada perubahan di fungsi block 1 tapi tidak di block 2 (atau sebaliknya), akan terjadi **inconsistent behavior**. Block 2 menimpa block 1, jadi developer harus selalu ingat untuk mengedit block 2 saja. Ini jebakan bagi developer baru.

**Kesimpulan:** `ZBSP_PRCH_APP` lebih bersih secara code quality. `index-merge.htm` perlu refactoring.

---

### 11.5 Perbedaan #5: Workflow Approval — "Read-Only Total" vs "Read-Write (KMI-BOD only)"

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

### 11.6 Perbedaan #6: Strategi Merge Plant 2000 — "Backend Merge" vs "Frontend Passthrough"

Kedua codebase mendukung plant 2000 digabung ke Surabaya 1200, tapi dengan strategi berbeda:

| Aspek | `ZBSP_PRCH_APP` | `ZPR_REL_BSP` |
|-------|-----------------|---------------|
| Dimana merge terjadi | **Backend (ABAP)**: `GET_SIDEBAR` menghitung count 1200 + 2000 lalu dijumlah | **Frontend**: Sidebar mengirim `werks=1200,2000` sebagai comma-separated string |
| GET_LIST | Backend: `IF lv_werks = '1200'` → include plant 2000 di RANGE | Frontend: kirim `'1200,2000'` sebagai werks, backend tinggal split |
| GET_HIST_REJ/APP | Sama seperti GET_LIST | Sama seperti GET_LIST |
| Keuntungan | Backend logic terpusat — semua client behave sama | Backend tidak perlu tahu tentang "grouping" plant |
| Kerugian | Backend harus diubah jika grouping berubah | Setiap frontend harus implementasi grouping sendiri |

**Ilustrasi aliran data:**

```
ZBSP_PRCH_APP:
Frontend: click Surabaya → curPlant='1200' → fetch 'werks=1200'
Backend:  lv_werks='1200' → IF '1200' THEN include '2000' → SELECT werks IN ('1200','2000')

ZPR_REL_BSP:
Frontend: click Surabaya → getEffectiveWerks('1200')='1200,2000' → curPlant='1200,2000' → fetch 'werks=1200,2000'
Backend:  SPLIT '1200,2000' → lt_werks_rng → SELECT werks IN lt_werks_rng
```

**Kesimpulan:** `ZPR_REL_BSP` lebih **decoupled** (backend tidak perlu tahu grouping). `ZBSP_PRCH_APP` lebih **centralized** (satu tempat aturan).

---

### 11.7 Perbedaan #7: Fitur-Fitur yang Hanya Ada di Satu Versi

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
| **CATEGORY_DEF dinamis** | **Maintainability** — tambah kategori gampang |
| **lt_cat_def loop (GET_SIDEBAR)** | **Maintainability** — tambah plant gampang |
| **Dynamic plant grouping** | **Decoupling** — backend tidak perlu tahu grouping plant |
| **Session notes documentation** | **Developer** — memahami riwayat perubahan |

---

## 12. Kesimpulan Akhir

| Aspek | Pemenang | Alasan |
|-------|----------|--------|
| **Keamanan** | `ZBSP_PRCH_APP` | Backend plant restriction (check_werks_allowed) |
| **Maintainability** | `ZPR_REL_BSP` | CATEGORY_DEF dinamis + lt_cat_def loop |
| **Code Quality** | `ZBSP_PRCH_APP` | Tidak ada duplikasi fungsi |
| **Business Value** | `ZPR_REL_BSP` | Bisa approve/reject PR |
| **UX Maturity** | `ZBSP_PRCH_APP` | Welcome modal, skeleton, animasi, ResizeObserver |
| **Aksesibilitas** | `ZBSP_PRCH_APP` | prefers-reduced-motion |
| **Arsitektur (decoupling)** | `ZPR_REL_BSP` | Plant grouping di frontend, backend unaware |
| **Dokumentasi** | Seimbang | ERD (ZBSP) vs Session Notes (ZPR) |
| **Overall** | **`ZBSP_PRCH_APP`** | Lebih aman, lebih matang UX, code lebih bersih |

**Catatan penting:** Kedua codebase memiliki kelebihan masing-masing. Idealnya, ambil `ZBSP_PRCH_APP` sebagai basis (karena lebih aman dan matang) lalu porting fitur-fitur dari `ZPR_REL_BSP`:
- Approver logic (KMI-BOD bisa approve)
- CATEGORY_DEF dinamis + lt_cat_def loop
- FAB + Multi-select
- Dynamic plant grouping via frontend

---

## 13. Saran Pengembangan UI Siap Implementasi di SE80

Bagian ini berisi **8 rekomendasi fitur UI** yang bisa ditambahkan ke codebase. Setiap rekomendasi:
- ✅ Bisa diimplementasikan di SAP SE80 (BSP) tanpa library eksternal
- ✅ Sudah siap copy-paste dengan kode lengkap
- ✅ Tidak memerlukan perubahan backend (`main.htm`)
- ✅ Kompatibel dengan kode yang sudah ada

---

### 13.1 Dark Mode Toggle

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

### 13.2 Export History ke CSV

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

### 13.3 Auto-Refresh Timer

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

### 13.4 Column Sorting pada History Table

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

### 13.5 Copy PR Number to Clipboard

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

### 13.6 Keyboard Shortcuts

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

### 13.7 Quick Filter Chips (Today/This Week/This Month)

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

### 13.8 Sticky Table Header untuk History

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

## 14. Refactoring Maintainability — ZBSP_PRCH_APP → ZPR_REL_BSP Pattern

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
- Approver logic (KMI-BOD belum bisa approve — masih using logic berbeda)
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

*Laporan dibuat berdasarkan analisis kode sumber tanggal 23 Juni 2026. Total 2.062→2.108 baris (ZBSP_PRCH_APP) dan 2.372 baris (ZPR_REL_BSP) dianalisis secara menyeluruh.*
