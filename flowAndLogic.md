# Release Purchasing Requisition — Dokumentasi Sistem & Alur

## 1. Gambaran Umum

**Aplikasi:**
1. **ZPR_REL_BSP** — Release PR (Approve/Reject) — `index.htm` (2507 baris) + `main.htm` (1325 baris)
2. **ZBSP_PRCH_APP** — Release PR (Read-Only) — `index.htm` (2241 baris) + `main.htm` (1298 baris)
3. **ZPO_REL_BSP** — Release PO (Live) — `main.htm` (~4085 baris, single-file)

**Perusahaan:** PT. Kayu Mebel Indonesia (KMI)  
**Platform:** SAP BSP (Business Server Pages) — ABAP + HTML/JS  
**Tujuan:** Approval / Rejection / Monitoring Purchase Requisition (PR) multi-kategori dan multi-plant.

**Pendekatan Kategori:**

| Aplikasi | Model Kategori | Approach |
|----------|---------------|----------|
| ZPR_REL_BSP | `CATEGORY_DEF` — business function → doc type | MTN=ROTO, RND=RSBR+PRK9, SVC=PRKS |
| ZBSP_PRCH_APP | `CATEGORY_DEF` — doc type langsung + `PLANT_DEF` | ROTO, PRK9, RSBR, PRKS |
| ZPO_REL_BSP | `POTYPE_MAP` — grup BSART per kategori | BAHAN, JASA, SPAREPART, dll. |

**Plants didukung (7 plant):**

| Plant | Label |
|-------|-------|
| 1200 | Surabaya |
| 2000 | Surabaya |
| 1000 | Surabaya |
| 1001 | Surabaya |
| 1100 | Surabaya |
| 1300 | Semarang |
| 3000 | Semarang |

**ZPR_REL_BSP — Kategori per Plant:**

| Plant | MTN (ROTO) | RND (RSBR,PRK9) | SVC (PRKS) |
|-------|:----------:|:----------------:|:----------:|
| 1200,2000,1000,1001,1100 (Surabaya) | ✅ | ✅ | ✅ |
| 1300,3000 (Semarang) | ✅ | ❌ | ✅ |

**ZBSP_PRCH_APP — Kategori per Plant:**

| Plant | ROTO | PRK9 | RSBR | PRKS |
|-------|:----:|:----:|:----:|:----:|
| 1200 (Surabaya) | ✅ | ✅ | ✅ | ✅ |
| 1300 (Semarang) | ✅ | ❌ | ❌ | ✅ |

**Catatan:** Plant 2000,1000,1001,1100 digabung ke Surabaya (1200) di backend. Plant 3000 digabung ke Semarang (1300). Plant-plant gabungan tidak punya entry sidebar sendiri.

---

## 2. Struktur File

### ZPR_REL_BSP

| File | Baris | Fungsi |
|------|:-----:|--------|
| `Page with FLow Logic/index.htm` | 2507 | Halaman utama BSP — rendering UI, interaksi user, AJAX call |
| `Page with FLow Logic/main.htm` | 1325 | Backend handler — semua action processing (ABAP) |
| `MIMEs/background.png` | — | Background image |
| `MIMEs/logo.png` | — | Logo KMI |
| `MIMEs/semarang.png` | — | Icon plant Semarang |
| `MIMEs/surabaya.png` | — | Icon plant Surabaya |

### ZBSP_PRCH_APP

| File | Baris | Fungsi |
|------|:-----:|--------|
| `Page with FLow Logic/index.htm` | 2241 | Halaman utama BSP — UI (32 CSS design tokens, skeleton loading, welcome modal) |
| `Page with FLow Logic/main.htm` | 1298 | Backend handler — ABAP macros + plant restriction |
| `MIMEs/` | — | Aset gambar |

### ZPO_REL_BSP

| File | Baris | Fungsi |
|------|:-----:|--------|
| `Page with FLow Logic/main.htm` | ~4085 | Single-file app — ABAP + HTML + CSS + JS |

---

## 3. Alur Sistem (System Flow)

### 3.1. Inisialisasi Aplikasi

```
Browser ───GET──→ index.htm
                    │
                    ▼
             Ambil user (BAPI_USER_GET_DETAIL)
             Tampilkan avatar + nama user
                    │
                    ▼
             JavaScript: init() → loadSidebarData()
                    │
                    ▼
             AJAX GET → main.htm?action=GET_SIDEBAR
                    │
                    ▼
             Backend hitung count pending / hist_app / hist_rej
             per plant × kategori
                    │
                    ▼
             Render sidebar dengan badge counts
```

### 3.2. Memilih Plant & Kategori (Switch View)

```
User klik menu di sidebar
       │
       ▼
switchView(plant, mode, bsart)
  - plant: '1200' | '1300'
  - mode: 'pending' | 'hist_app' | 'hist_rej'
  - bsart: 'MTN' | 'RND' | 'SVC' (ZPR_REL_BSP)
           'ROTO' | 'PRK9' | 'RSBR' | 'PRKS' (ZBSP_PRCH_APP)
       │
       ▼
Reset state: curPage=1, selBanfns={}, searchKw='', filter=''
       │
       ├── mode = pending  ──→ fetchList(bsart)        → GET_LIST
       ├── mode = hist_app ──→ fetchHistApp()          → GET_HIST_APP
       └── mode = hist_rej ──→ fetchHistRej()          → GET_HIST_REJ
```

### 3.3. Tampilkan PR Pending (List View)

```
fetchList(bsart) ── AJAX GET ──→ main.htm?action=GET_LIST&werks=X&bsart=Y
                                        │
                                        ▼
                          SELECT dari table EBAN
                          - bsart IN <kategori> (bisa comma-separated)
                          - werks IN <plant group> (Surabaya/Semarang group)
                          - frgkz = 'X' (menunggu release)
                          - frgzu = ' ' (belum release)
                          - loekz = ' ' (tidak didelete)
                          - statu NE 'B' (belum closed)
                          - Filter estkz (opsional: MRP / NONMRP)
                          - Urut DESC by banfn
                                        │
                                        ▼
                          Hitung total_value per PR (SUM menge * preis)
                          Ambil nama lengkap pembuat dari USR21 + ADRP
                          Ambil material description dari MAKT
                          Return JSON array
                                        │
                                        ▼
renderList():
  - Header: "PR Maintenance — Plant" + jumlah pending
  - Toolbar: Select All (ZPR_REL_BSP only), Search, Page Size,
             Filter MRP, Expand/Collapse
  - Cards: setiap PR menampilkan:
    - Nomor PR (banfn)
    - Status Pending
    - Plant
    - Tipe estkz (MRP / Non-MRP)
    - Kategori (badge)
    - Jumlah item
    - Total nilai + mata uang
    - Dibuat oleh, deskripsi, purch group, tgl PR
  - Pagination (10 / 20 / 50 / All)
  - Floating Action Bar (Approve / Reject) — ZPR_REL_BSP only (approver)
```

### 3.4. Kategori ZPR_REL_BSP

```
CATEGORY_DEF = {
  '1200': [
    {code:'MTN', label:'PR Maintenance', bsart:'ROTO'},
    {code:'RND', label:'PR RND',         bsart:'RSBR,PRK9'},
    {code:'SVC', label:'PR Service',     bsart:'PRKS'}
  ],
  '1300': [
    {code:'MTN', label:'PR Maintenance', bsart:'ROTO'},
    {code:'SVC', label:'PR Service',     bsart:'PRKS'}
  ],
  '2000'/'1000'/'1001'/'1100': [MTN,RND,SVC],
  '3000': [MTN,SVC]
}

- MTN (Maintenance):   bsart = 'ROTO'      — single doc type
- RND (R & D):         bsart = 'RSBR,PRK9' — composite (2 doc type)
- SVC (Service):       bsart = 'PRKS'      — single doc type
```

### 3.5. Expand Detail PR

```
User klik chevron pada PR card
       │
       ▼
toggleExpand(banfn)
       │
       ▼
loadDetail(banfn) ── AJAX GET ──→ main.htm?action=GET_DETAIL&banfn=X
                                        │
                                        ▼
                          SELECT dari EBAN (items)
                          JOIN MAKT untuk deskripsi material
                          Return JSON array item
                                        │
                                        ▼
                          Render table:
                          Item | Material | Deskripsi | Qty | UoM |
                          Harga | Total | Curr | Tgl Butuh
```

### 3.6. Approve PR (ZPR_REL_BSP only)

```
User centang PR → klik Approve
       │
       ▼
showModalApprove() → modal konfirmasi
       │
       ▼
confirmApprove() → processAction(banfns, 'approve', '')
       │
       ▼
Loop satu per satu (sequential processAction)
       │
       ▼
AJAX POST → main.htm?action=PROCESS&banfn=X&pr_action=approve
       │
       ▼
Backend: Cek approver (hanya user 'KMI-BOD')
       │
       ▼
Loop setiap item PR:
  CALL FUNCTION 'BAPI_REQUISITION_RELEASE'
    - rel_code = 'P2' (PR BOD Approval)
    - no_commit_work = 'X'
       │
       ▼
Jika semua item sukses:
  BAPI_TRANSACTION_COMMIT (commit SAP)
  Simpan ke tabel ZROTO_APP_HIST (history approve)
    - banfn, bnfpo, werks, bsart, txz01, ernam, erdat
    - menge, meins, preis, peinh, waers, ekgrp
    - app_by (sy-uname), app_at (sy-datum), app_tm (sy-uzeit)
  COMMIT WORK
  Return JSON sukses
       │
       ▼
Jika error:
  BAPI_TRANSACTION_ROLLBACK
  Return JSON error
       │
       ▼
Frontend: animasi card fade-out, toast sukses/error
Reload sidebar + list setelah delay 700ms
```

### 3.7. Reject PR (ZPR_REL_BSP only)

```
User centang PR → klik Reject → isi alasan (opsional)
       │
       ▼
showModalReject() → modal konfirmasi + textarea alasan
       │
       ▼
confirmReject() → processAction(banfns, 'delete', notes)
       │
       ▼
Loop sequential
       │
       ▼
AJAX POST → main.htm?action=PROCESS&banfn=X&pr_action=delete&notes=Y
       │
       ▼
Backend: Cek approver
       │
       ▼
Pertama: BAPI_REQUISITION_DELETE (delete_ind='L')
       │
       ▼
Jika sukses:
  Simpan ke ZROTO_REJ_HIST (history reject)
  - Semua field item + del_by, del_at, del_tm, reason
  - MODIFY zroto_rej_hist
  - COMMIT WORK
  Return JSON sukses
       │
       ▼
Jika gagal → BAPI_TRANSACTION_ROLLBACK → return JSON error
```

### 3.8. History Approve

```
fetchHistApp() ── AJAX GET ──→ main.htm?action=GET_HIST_APP&werks=X
                                        │
                                        ▼
                          SELECT dari ZROTO_APP_HIST
                          WHERE werks = plant
                          ORDER BY app_at DESC, app_tm DESC
                                        │
                                        ▼
renderHistTable(data, 'approve'):
  - Tabel/Group: No PR | Item | Deskripsi | Kategori |
    Pembuat | Tgl PR | Qty | UoM | Harga | Total | Curr |
    PGrp | Diapprove Oleh | Tgl Approve | Jam
  - Search filter client-side (debounce 300ms)
```

### 3.9. History Reject

```
fetchHistRej() ── AJAX GET ──→ main.htm?action=GET_HIST_REJ&werks=X
                                        │
                                        ▼
                          SELECT dari ZROTO_REJ_HIST
                          WHERE werks = plant
                          ORDER BY del_at DESC, del_tm DESC
                                        │
                                        ▼
renderHistTable(data, 'reject'):
  - Tabel/Group: No PR | Item | Deskripsi | Kategori |
    Pembuat | Tgl PR | Qty | UoM | Harga | Total | Curr |
    PGrp | Direject Oleh | Tgl Reject | Jam | Alasan
```

### 3.10. Searching & Filtering

**Search (client-side):**
- Field: No PR, Nama pembuat, Deskripsi, Purch Group, Tipe estkz, Kategori
- Debounce 300ms, case-insensitive
- Mencari di data yang sudah di-load (allData), dipaginasi ulang

**Filter estkz (server-side):**
- Semua PR, MRP saja (estkz = 'B'), Non-MRP saja (estkz ≠ 'B')
- Trigger fetch ulang dari server

**Pagination:**
- Page size: 10, 20, 50, All
- Navigasi: First, Prev, Numbered, Next, Last
- Counter showing "start–end of total"

### 3.11. Logout

```
doLogout()
  - Confirm dialog
  - sessionStorage.setItem('logged_out', '1')
  - fetch /sap/public/bc/icf/logoff (logoff SAP)
  - XHR basic auth dengan user 'logout'
  - Redirect ke index.htm
  - pageshow handler: jika persisted + logged_out, redirect logoff
```

---

## 4. Detail Logic Backend (ABAP)

### 4.1. Action Handler (main.htm)

Semua request diproses dalam `CASE lv_action`:

| Action | Fungsi |
|--------|--------|
| `GET_SIDEBAR` | Hitung count PR pending, history approve, history reject per plant × kategori |
| `GET_LIST` | Ambil data PR pending (header) dengan filter plant + bsart + estkz |
| `GET_DETAIL` | Ambil item-item dari suatu PR |
| `GET_HIST_APP` | Ambil history approve dari ZROTO_APP_HIST |
| `GET_HIST_REJ` | Ambil history reject dari ZROTO_REJ_HIST |
| `PROCESS` | Eksekusi approve (BAPI_REQUISITION_RELEASE) atau delete/reject (BAPI_REQUISITION_DELETE) — ZPR_REL_BSP only |

### 4.2. Macro Penting (ZBSP_PRCH_APP)

| Macro | Fungsi |
|-------|--------|
| `escape_json` | Escape string untuk JSON (\, ", /, newline, tab) |
| `check_werks_allowed` | Cek akses user ke plant (KMI-U052 = 1200 only, KMI-U051 = 1300 only, KMI-U151 = 1200 only) |
| `fmt_date` | Format tanggal SAP YYYYMMDD → DD.MM.YYYY |
| `parse_bsart_range` | Ubah string comma-separated (contoh 'RSBR,PRK9') jadi RANGE OF eban-bsart |
| `count_pending` | Hitung PR pending unik per kategori + plant |

### 4.3. Tabel Database

| Tabel | Keterangan |
|-------|-----------|
| `EBAN` | Tabel standar SAP — Purchase Requisition (header + item) |
| `MAKT` | Tabel standar SAP — Material Description |
| `USR21` | Tabel standar SAP — User address key (relasi ke ADRP) |
| `ADRP` | Tabel standar SAP — Person (name_text) |
| `ZROTO_APP_HIST` | Tabel custom — History approve PR |
| `ZROTO_REJ_HIST` | Tabel custom — History reject PR |

### 4.4. Tipe Data Custom

```abap
ty_eban_head   — Header PR dari EBAN
ty_eban_item   — Item PR dari EBAN
ty_makt        — Material description dari MAKT
ty_uname_nm    — Mapping bname → fullname dari USR21 + ADRP
ty_hist_rej    — Record history reject dari ZROTO_REJ_HIST
ty_hist_app    — Record history approve dari ZROTO_APP_HIST
```

### 4.5. Authorization (Approver) — ZPR_REL_BSP

```abap
IF lv_uname = 'KMI-BOD'.
  lv_is_approver = abap_true.   " Hanya user KMI-BOD yang bisa Approve/Reject
ENDIF.
```

**ZBSP_PRCH_APP** — read-only mode:
```abap
lv_is_approver = abap_false.  " Permanen false
```

---

## 5. Struktur UI

### 5.1. Layout (ZPR_REL_BSP / ZBSP_PRCH_APP)

```
┌──────────────────────────────────────────────────────┐
│ HEADER: Logo + Title + User Avatar + Dropdown Menu   │
├──────────┬───────────────────────────────────────────┤
│ SIDEBAR  │              MAIN CONTENT                 │
│          │                                           │
│ Surabaya │  Page Title & Subtitle                    │
│  ├ MTN   │  Toolbar (Search, Filter, PageSize)       │
│  ├ RND   │  ┌───────────────────────────────────────┐│
│  ├ SVC   │  │ PR Card 1 (expandable)               ││
│  ├ Hist  │  ├───────────────────────────────────────┤│
│  └ Hist  │  │ PR Card 2 (expandable)               ││
│          │  ├───────────────────────────────────────┤│
│ Semarang │  │ ...                                   ││
│  ├ MTN   │  └───────────────────────────────────────┘│
│  ├ SVC   │  Pagination (1 2 3 ...)                   │
│  ├ Hist  │                                           │
│  └ Hist  │                                           │
├──────────┴───────────────────────────────────────────┤
│ FAB: [Approve] [Reject] (ZPR_REL_BSP only)          │
└──────────────────────────────────────────────────────┘
```

### 5.2. Sidebar Menu per Plant (ZPR_REL_BSP)

| Menu | Mode | Keterangan |
|------|------|------------|
| &#128203; PR Maintenance | `pending` + `MTN` | Daftar PR ROTO yang menunggu approval |
| &#128300; PR RND | `pending` + `RND` | Daftar PR RSBR/PRK9 yang menunggu approval |
| &#128736; PR Service | `pending` + `SVC` | Daftar PR PRKS yang menunggu approval |
| &#10003; History Approve | `hist_app` | Riwayat PR yang sudah di-approve |
| &#128465; History Reject | `hist_rej` | Riwayat PR yang sudah di-reject |

### 5.3. Sidebar Menu per Plant (ZBSP_PRCH_APP)

| Menu | Mode | Keterangan |
|------|------|------------|
| &#128203; PR Maintenance | `pending` + `ROTO` | Daftar PR ROTO yang menunggu approval |
| &#128736; PR RND | `pending` + `PRK9`/`RSBR` | Daftar PR RND yang menunggu approval |
| &#128295; PR Service | `pending` + `PRKS` | Daftar PR Service yang menunggu approval |
| &#10003; History Approve | `hist_app` | Riwayat PR yang sudah di-approve |
| &#128465; History Reject | `hist_rej` | Riwayat PR yang sudah di-reject |

### 5.4. State Variabel (JavaScript)

| Variabel | Tipe | Fungsi |
|----------|------|--------|
| `API_URL` | string | 'main.htm' — endpoint backend |
| `curPlant` | string | Plant aktif ('1200' / '1300') |
| `curMode` | string | Mode aktif ('pending' / 'hist_app' / 'hist_rej') |
| `curBsart` | string | Kategori aktif (MTN/RND/SVC atau ROTO/PRK9/RSBR/PRKS) |
| `isApprover` | boolean | User adalah approver (KMI-BOD) — ZPR_REL_BSP only |
| `allData` | array | Seluruh data PR pending dari server |
| `filteredData` | array | Data setelah filter search client-side |
| `selBanfns` | object | PR yang dicentang (key: banfn, value: true) |
| `pageSize` | number | Jumlah per halaman (10/20/50/0=All) |
| `curPage` | number | Halaman aktif |
| `searchKw` | string | Keyword pencarian |
| `allExpanded` | boolean | Semua card dalam keadaan expand |
| `curEstkzFilter` | string | Filter tipe ('' / 'MRP' / 'NONMRP') |
| `sbCounts` | object | Badge counter per plant per kategori |
| `histData` | array | Data history (fix XSS: global variable, not HTML attribute) |
| `histType` | string | Tipe history ('approve' / 'reject') |

### 5.5. Config JavaScript (ZPR_REL_BSP — CATEGORY_DEF)

```js
var CATEGORY_DEF = {
  '1200':[
    {code:'MTN', label:'PR Maintenance', bsart:'ROTO',        icon:'📋'},
    {code:'RND', label:'PR RND',         bsart:'RSBR,PRK9',   icon:'🔬'},
    {code:'SVC', label:'PR Service',     bsart:'PRKS',        icon:'🔧'}
  ],
  '1300':[
    {code:'MTN', label:'PR Maintenance', bsart:'ROTO',        icon:'📋'},
    {code:'SVC', label:'PR Service',     bsart:'PRKS',        icon:'🔧'}
  ]
  // 2000,1000,1001,1100 → sama dengan 1200
  // 3000 → sama dengan 1300
};
var PLANT_LABELS = {
  '1200':'Surabaya', '1300':'Semarang',
  '2000':'Surabaya', '1000':'Surabaya',
  '1001':'Surabaya', '1100':'Surabaya', '3000':'Semarang'
};
```

### 5.6. Config JavaScript (ZBSP_PRCH_APP — PLANT_DEF + CATEGORY_DEF)

```js
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
  'ROTO': { label:'PR Maintenance', short:'Maintenance', icon:'📋' },
  'PRK9': { label:'PR RND',         short:'RND',         icon:'🔧' },
  'RSBR': { label:'PR RND',         short:'RND',         icon:'🔧' },
  'PRKS': { label:'PR Service',     short:'Service',     icon:'🔧' }
};
```

---

## 6. API Contract (Request / Response)

### 6.1. GET_SIDEBAR

**Request:** `main.htm?action=GET_SIDEBAR`  
**Response (ZPR_REL_BSP):**
```json
{
  "status": "S",
  "is_approver": true,
  "pending": {
    "1200": {"MTN":5, "RND":3, "SVC":2},
    "1300": {"MTN":4, "SVC":1}
  },
  "hist_rej": { "1200": { "total":2 }, "1300": { "total":1 } },
  "hist_app": { "1200": { "total":10 }, "1300": { "total":8 } }
}
```

### 6.2. GET_LIST

**Request:** `main.htm?action=GET_LIST&werks=1200&bsart=MTN&estkz=MRP`  
**Response:**
```json
{
  "status": "S",
  "message": "OK",
  "data": [
    {
      "banfn": "0010000001",
      "badat": "19.06.2026",
      "werks": "1200",
      "bsart": "ROTO",
      "txz01": "Deskripsi PR",
      "ernam": "USER1",
      "ernam_full": "User Satu",
      "ekgrp": "P01",
      "estkz": "B",
      "item_count": "3",
      "total_value": "15000000",
      "waers": "IDR"
    }
  ]
}
```

### 6.3. GET_DETAIL

**Request:** `main.htm?action=GET_DETAIL&banfn=0010000001`  
**Response:**
```json
{
  "status": "S",
  "message": "OK",
  "data": [
    {
      "bnfpo": "00010",
      "matnr": "MAT-001",
      "txz01": "Deskripsi item",
      "maktx": "Nama material",
      "menge": "100",
      "meins": "EA",
      "preis": "150000",
      "peinh": "1",
      "waers": "IDR",
      "total": "15000000",
      "lfdat": "30.06.2026"
    }
  ]
}
```

### 6.4. PROCESS

**Request (POST):** `action=PROCESS&banfn=0010000001&pr_action=approve`  
**Response (success):**
```json
{ "status": "S", "message": "PR 0010000001 berhasil di-approve (3 item)" }
```
**Response (error):**
```json
{ "status": "E", "message": "Authority check failed" }
```

### 6.5. GET_HIST_APP / GET_HIST_REJ

**Request:** `main.htm?action=GET_HIST_APP&werks=1200`  
**Response:**
```json
{
  "status": "S",
  "message": "OK",
  "data": [
    {
      "banfn": "0010000001",
      "bnfpo": "00010",
      "werks": "1200",
      "bsart": "ROTO",
      "txz01": "...",
      "ernam": "USER1",
      "erdat": "01.06.2026",
      "menge": "100",
      "meins": "EA",
      "preis": "150000",
      "peinh": "1",
      "waers": "IDR",
      "total": "15000000",
      "ekgrp": "P01",
      "app_by": "KMI-BOD",
      "app_at": "19.06.2026",
      "app_tm": "14:30:00"
    }
  ]
}
```

---

## 7. Diagram Alur Approve & Reject

```
APPROVE FLOW (ZPR_REL_BSP):
  User centang → klik Approve → modal confirm
    → loop per PR:
        → fetch POST action=PROCESS&pr_action=approve
        → BAPI_REQUISITION_RELEASE (rel_code='P2') per item
        → Hanya item sukses (lt_items_ok) dicatat ke ZROTO_APP_HIST
        → COMMIT WORK
    → reload sidebar + list

REJECT FLOW (ZPR_REL_BSP):
  User centang → klik Reject → isi alasan → modal confirm
    → loop per PR:
        → fetch POST action=PROCESS&pr_action=delete&notes=...
        → BAPI_REQUISITION_DELETE dulu (delete_ind='L')
        → Jika sukses: simpan ke ZROTO_REJ_HIST + COMMIT WORK
        → Jika gagal: ROLLBACK
    → reload sidebar + list
```

---

## 8. Catatan Teknis

- **Pengecekan Approver (ZPR_REL_BSP):** hardcoded untuk user `KMI-BOD` (dapat diubah sesuai kebutuhan).
- **ZBSP_PRCH_APP:** read-only (`lv_is_approver = abap_false` secara permanen).
- **Release Code:** `P2` — PR BOD Approval.
- **Sequential Processing:** Approve/Reject diproses satu per satu (sequential) untuk menghindari race condition.
- **MRP Filter:** `estkz = 'B'` untuk MRP. Semua nilai estkz lain dianggap Non-MRP.
- **Mapping Estkz:**

  | Kode | Label |
  |---|---|
  | B | MRP |
  | D | Direct |
  | F | Prod.Order |
  | G | Store Order |
  | R | Manual |
  | U | Planned Order |
  | V | SD Doc |
  | M | Monthly |
  | Y | Annual |
  | A | SAP APO |
  | I | SAP IBP |
  | T | S4CRM |
  | S | Self-Svc |
  | E | External |

- **Mata Uang:** IDR ditampilkan tanpa desimal, USD dengan 2 desimal. Kode mata uang zero-decimal: IDR, JPY, KRW, VND.
- **Session:** Menggunakan SAP session — logout via `/sap/public/bc/icf/logoff` dengan basic auth logout.
- **Kategori RND:** Composite category — jika bsart = 'RSBR,PRK9', parse_bsart_range akan membuat RANGE query untuk kedua doc type.
- **Plant Grouping:** Plant 2000/1000/1001/1100 digabung ke Surabaya (1200), plant 3000 digabung ke Semarang (1300) di backend query.
- **Backend Plant Restriction (ZBSP_PRCH_APP):** User KMI-U052 hanya bisa akses plant 1200, KMI-U051 hanya 1300, KMI-U151 hanya 1200. KMI-BOD & BASIS tanpa batasan.
- **ZPO_REL_BSP:** Single-file app (~4085 baris) untuk Release PO multi kategori. Berbeda arsitektur — pre-load data di ABAP, embed JSON di HTML, tidak pakai AJAX untuk data list.

---

## 9. Perubahan dari Versi Sebelumnya

| Item | Sebelum | Sesudah |
|------|---------|---------|
| Jumlah aplikasi | 1 (ZPR_REL_BSP) | 3 (ZPR_REL_BSP + ZBSP_PRCH_APP + ZPO_REL_BSP) |
| Model kategori | Single BSART (`ROTO`) | `CATEGORY_DEF` (business function → bsart) |
| Jumlah plant | 2 (1200, 1300) | 7 (1200,1300,2000,1000,1001,1100,3000) |
| ZPR_REL_BSP file sizes | ~2065 / ~1011 | 2507 / 1325 |
| ZBSP_PRCH_APP | Tidak ada | index.htm 2241 + main.htm 1298 |
| Sidebar kategori | ROTO + RND (placeholder) | MTN + RND + SVC (semua aktif) |
| Composite kategori | Tidak ada | RND = RSBR + PRK9 |
| Backend plant restriction | Frontend only | Backend macro `check_werks_allowed` |
| CSS design tokens | 11 | 32 (ZBSP_PRCH_APP) |
| Skeleton loading | Tidak ada | Ada (ZBSP_PRCH_APP) |
| Welcome modal | Tidak ada | Ada (ZBSP_PRCH_APP) |
| Jumlah aplikasi PR | 1 (single kategori) | 2 (multi kategori, different approach) |
| History grouping | Flat table | Group by No PR (expand/collapse) |
| History filter by kategori | Tidak ada | Ada dropdown filter by bsart |
