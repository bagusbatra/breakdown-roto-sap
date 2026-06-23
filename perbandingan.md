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

*Laporan dibuat berdasarkan analisis kode sumber tanggal 23 Juni 2026. Total 4.009 baris (ZBSP_PRCH_APP) dan 6.296 baris (ZPR_REL_BSP) dianalisis secara menyeluruh.*
