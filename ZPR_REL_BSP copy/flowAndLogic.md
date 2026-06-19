# Release PR ROTO — Dokumentasi Sistem & Alur

## 1. Gambaran Umum

**Aplikasi:** Release PR ROTO  
**Perusahaan:** PT. Kayu Mebel Indonesia (KMI)  
**Platform:** SAP BSP (Business Server Pages)  
**Tujuan:** Approval / Rejection Purchase Requisition (PR) tipe dokumen **ROTO** dari plant Surabaya (1200) dan Semarang (1300).

**Frontend:** `index.htm` — UI/UX (HTML, CSS, JavaScript)  
**Backend:** `main.htm` — logic ABAP (menerima request AJAX, mengolah data SAP, mengembalikan JSON)

---

## 2. Struktur File

| File | Fungsi |
|---|---|
| `Page with FLow Logic/index.htm` | Halaman utama BSP — rendering UI, interaksi user, AJAX call |
| `Page with FLow Logic/main.htm` | Backend handler — semua action processing (ABAP) |
| `MIMEs/background.png` | Background image |
| `MIMEs/logo.png` | Logo KMI |
| `MIMEs/semarang.png` | Icon plant Semarang |
| `MIMEs/surabaya.png` | Icon plant Surabaya |

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
              per plant (1200 & 1300)
                     │
                     ▼
              Render sidebar dengan badge counts
```

### 3.2. Memilih Plant & Mode (Switch View)

```
User klik menu di sidebar
       │
       ▼
switchView(plant, mode)
  - plant: '1200' | '1300'
  - mode: 'pending' | 'hist_app' | 'hist_rej'
       │
       ▼
Reset state: curPage=1, selBanfns={}, searchKw='', filter=''
       │
       ▼
mode = pending  ───→ fetchList('')       → GET_LIST
mode = hist_app ───→ fetchHistApp()      → GET_HIST_APP
mode = hist_rej ───→ fetchHistRej()      → GET_HIST_REJ
```

### 3.3. Tampilkan PR Pending (List View)

```
fetchList(estkz) ── AJAX GET ──→ main.htm?action=GET_LIST&werks=X&estkz=Y
                                        │
                                        ▼
                          SELECT dari table EBAN
                          - bsart = 'ROTO'
                          - werks = plant
                          - frgkz = 'X' (menunggu release)
                          - frgzu = ' ' (belum release)
                          - loekz = ' ' (tidak didelete)
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
  - Header: judul plant + jumlah pending
  - Toolbar: Select All, Search, Page Size, Filter MRP, Expand/Collapse
  - Cards: setiap PR menampilkan:
    - Nomor PR (banfn)
    - Status Pending
    - Plant
    - Tipe estkz (MRP / Non-MRP)
    - Jumlah item
    - Total nilai + mata uang
    - Dibuat oleh, deskripsi, purch group, tgl PR
  - Pagination (10 / 20 / 50 / All)
  - Floating Action Bar (Approve / Reject) — hanya untuk approver
```

### 3.4. Expand Detail PR

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
                          Item | Material | Deskripsi | Qty | UoM | Harga | Total | Curr | Tgl Butuh
```

### 3.5. Approve PR

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

### 3.6. Reject PR (Delete)

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
Pertama: Simpan ke ZROTO_REJ_HIST (history reject)
  - Semua field item + del_by, del_at, del_tm, reason
  - MODIFY zroto_rej_hist
  - COMMIT WORK
       │
       ▼
Kedua: Hapus PR dari SAP
  LOOP items → ls_delitem-delete_ind = 'L'
  CALL FUNCTION 'BAPI_REQUISITION_DELETE'
       │
       ▼
Jika sukses → return JSON sukses
Jika gagal → rollback history + return JSON error
```

### 3.7. History Approve

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
  - Tabel: No PR | Item | Deskripsi | Pembuat | Tgl PR | Qty | UoM | Harga | Total | Curr | PGrp | Diapprove Oleh | Tgl Approve | Jam
  - Search filter client-side (debaunce 300ms)
```

### 3.8. History Reject

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
  - Tabel: No PR | Item | Deskripsi | Pembuat | Tgl PR | Qty | UoM | Harga | Total | Curr | PGrp | Direject Oleh | Tgl Reject | Jam | Alasan
```

### 3.9. Searching & Filtering

**Search (client-side):**  
- Field: No PR, Nama pembuat, Deskripsi, Purch Group, Tipe estkz
- Debounce 300ms, case-insensitive
- Mencari di data yang sudah di-load (allData), dipaginasi ulang

**Filter estkz (server-side):**  
- Semua PR, MRP saja (estkz = 'B'), Non-MRP saja (estkz ≠ 'B')
- Trigger fetch ulang dari server

**Pagination:**  
- Page size: 10, 20, 50, All
- Navigasi: First, Prev, Numbered, Next, Last
- Counter showing "start–end of total"

### 3.10. Logout

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
|---|---|
| `GET_SIDEBAR` | Hitung count PR pending, history approve, history reject per plant |
| `GET_LIST` | Ambil data PR pending (header) dengan filter plant + estkz |
| `GET_DETAIL` | Ambil item-item dari suatu PR |
| `GET_HIST_APP` | Ambil history approve dari ZROTO_APP_HIST |
| `GET_HIST_REJ` | Ambil history reject dari ZROTO_REJ_HIST |
| `PROCESS` | Eksekusi approve (BAPI_REQUISITION_RELEASE) atau delete/reject (BAPI_REQUISITION_DELETE) |

### 4.2. Tabel Database

| Tabel | Keterangan |
|---|---|
| `EBAN` | Tabel standar SAP — Purchase Requisition (header + item) |
| `MAKT` | Tabel standar SAP — Material Description |
| `USR21` | Tabel standar SAP — User address key |
| `ADRP` | Tabel standar SAP — Person (name) |
| `ZROTO_APP_HIST` | Tabel custom — History approve PR ROTO |
| `ZROTO_REJ_HIST` | Tabel custom — History reject PR ROTO |

### 4.3. Tipe Data Custom

```abap
ty_eban_head   — Header PR dari EBAN (banfn, badat, werks, bsart, txz01, ernam, ekgrp, frgkz, frgzu, loekz, estkz)
ty_eban_item   — Item PR dari EBAN (banfn, bnfpo, matnr, txz01, menge, meins, preis, peinh, waers, lfdat, ...)
ty_makt        — Material description dari MAKT
ty_uname_nm    — Mapping bname → fullname dari USR21 + ADRP
ty_hist_rej    — Record history reject dari ZROTO_REJ_HIST
ty_hist_app    — Record history approve dari ZROTO_APP_HIST
```

### 4.4. Authorization (Approver)

```abap
IF lv_uname = 'KMI-BOD'.
  lv_is_approver = abap_true.   " Hanya user KMI-BOD yang bisa Approve/Reject
ENDIF.
```

---

## 5. Struktur UI

### 5.1. Layout
```
┌─────────────────────────────────────────────────────┐
│ HEADER: Logo + Title + User Avatar + Dropdown Menu  │
├──────────┬──────────────────────────────────────────┤
│ SIDEBAR  │              MAIN CONTENT                │
│          │                                          │
│ Surabaya │  Page Title & Subtitle                   │
│  ├ PR    │  Toolbar (Search, Filter, PageSize)      │
│  ├ Hist  │  ┌──────────────────────────────────────┐│
│  └ Hist  │  │ PR Card 1 (expandable)              ││
│          │  ├──────────────────────────────────────┤│
│ Semarang │  │ PR Card 2 (expandable)              ││
│  ├ PR    │  ├──────────────────────────────────────┤│
│  ├ Hist  │  │ ...                                  ││
│  └ Hist  │  └──────────────────────────────────────┘│
│          │  Pagination (1 2 3 ...)                  │
├──────────┴──────────────────────────────────────────┤
│ FAB: [Approve] [Reject] (floating, if approver)     │
└─────────────────────────────────────────────────────┘
```

### 5.2. State Variabel (JavaScript)

| Variabel | Tipe | Fungsi |
|---|---|---|
| `API_URL` | string | 'main.htm' — endpoint backend |
| `curPlant` | string | Plant aktif ('1200' / '1300') |
| `curMode` | string | Mode aktif ('pending' / 'hist_app' / 'hist_rej') |
| `isApprover` | boolean | User adalah approver (KMI-BOD) |
| `allData` | array | Seluruh data PR pending dari server |
| `filteredData` | array | Data setelah filter search client-side |
| `selBanfns` | object | PR yang dicentang (key: banfn, value: true) |
| `pageSize` | number | Jumlah per halaman (10/20/50/0=All) |
| `curPage` | number | Halaman aktif |
| `searchKw` | string | Keyword pencarian |
| `allExpanded` | boolean | Semua card dalam keadaan expand |
| `curEstkzFilter` | string | Filter tipe ('' / 'MRP' / 'NONMRP') |

---

## 6. API Contract (Request / Response)

### 6.1. GET_SIDEBAR

**Request:** `main.htm?action=GET_SIDEBAR`  
**Response:**
```json
{
  "status": "S",
  "is_approver": true,
  "pending": { "1200": 5, "1300": 3 },
  "hist_rej": { "1200": 2, "1300": 1 },
  "hist_app": { "1200": 10, "1300": 8 }
}
```

### 6.2. GET_LIST

**Request:** `main.htm?action=GET_LIST&werks=1200&estkz=MRP`  
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
**Response:**
```json
{ "status": "S", "message": "PR 0010000001 berhasil di-approve (3 item)" }
```
atau
```json
{ "status": "E", "message": "Error message" }
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
APPROVE FLOW:
  User centang → klik Approve → modal confirm
    → loop per PR:
        → fetch POST action=PROCESS&pr_action=approve
        → BAPI_REQUISITION_RELEASE (rel_code='P2')
        → Jika sukses: COMMIT + simpan ke ZROTO_APP_HIST
        → Jika gagal: ROLLBACK
    → reload sidebar + list

REJECT FLOW:
  User centang → klik Reject → isi alasan → modal confirm
    → loop per PR:
        → fetch POST action=PROCESS&pr_action=delete&notes=...
        → Simpan ke ZROTO_REJ_HIST (COMMIT)
        → BAPI_REQUISITION_DELETE (delete_ind='L')
        → Jika gagal: Hapus dari ZROTO_REJ_HIST (rollback)
    → reload sidebar + list
```

---

## 8. Catatan Teknis

- **Pengecekan Approver:** hardcoded untuk user `KMI-BOD` (dapat diubah sesuai kebutuhan).
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
- **Mata Uang:** IDR ditampilkan tanpa desimal, USD dengan 2 desimal.
- **Session:** Menggunakan SAP session — logout via `/sap/public/bc/icf/logoff` dengan basic auth logout.
