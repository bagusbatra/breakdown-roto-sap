# Breakdown ROTO SAP

Repo ini berisi hasil bedah (reverse-engineering) aplikasi **SAP BSP "Release PR
ROTO"** milik PT. Kayu Mebel Indonesia (KMI), modul **MM (Materials
Management)**. Tujuannya: memahami logic yang sudah ada di `ZPR_REL_BSP`
(clone dari aplikasi SAP asli) supaya bisa diambil pola/logic-nya dan dipakai
ulang untuk membuat aplikasi serupa pada **kategori PR lain** (bukan hanya
ROTO).

## Struktur Folder

```
Breakdown-ROTO-SAP/
│
├── ZPR_REL_BSP/                     <- clone aplikasi BSP asli dari SAP
│   ├── Page with FLow Logic/
│   │   ├── index.htm                <- halaman UI (HTML+CSS+JS, render di browser)
│   │   └── main.htm                 <- "API"/controller (ABAP, dipanggil via fetch/AJAX)
│   │
│   └── MIMEs/                       <- aset gambar (logo, background, icon plant)
│       ├── background.png
│       ├── logo.png
│       ├── semarang.png
│       └── surabaya.png
│
├── documentation/
│   ├── flow.md                      <- alur teknis (request/response, sequence)
│   └── business-process.md          <- konteks bisnis & aturan proses PR ROTO
│
├── notes/
│   └── investigation.md             <- catatan temuan, potensi bug, & ide reuse
│
└── README.md
```

## Apa itu Aplikasi Ini?

"Release PR ROTO" adalah aplikasi **BSP (Business Server Page)** yang berjalan
di dalam SAP NetWeaver (ICF service), dipakai oleh **BOD (Board of Director)**
PT KMI untuk **approve atau reject Purchase Requisition (PR)** dengan document
type `ROTO` ("One Time Off") yang masih berstatus pending release.

- **`index.htm`** — Halaman shell. Berisi:
  - ABAP scriptlet kecil di paling atas (`<%@page language="abap"%>`) untuk
    mengambil nama user login (`BAPI_USER_GET_DETAIL`) dan menampilkannya di
    header.
  - Seluruh **CSS** (desain dashboard: header, sidebar per plant, kartu PR,
    tabel history, modal approve/reject, toast, FAB tombol aksi).
  - Seluruh **JavaScript** sisi klien: render sidebar, render daftar PR,
    render detail item, search/filter/pagination, dan pemanggilan API ke
    `main.htm` lewat `fetch()`.

- **`main.htm`** — "Backend"/API handler. Murni ABAP, tidak ada HTML output.
  Menerima parameter `action` (GET/POST) dan mengembalikan **JSON** manual
  (string concatenation, bukan `/ui2/cl_json`). Action yang tersedia:
  - `GET_SIDEBAR` — hitung jumlah PR pending & history per plant.
  - `GET_LIST` — daftar PR pending (header + total per PR) untuk 1 plant.
  - `GET_DETAIL` — detail item-item dari 1 PR (banfn).
  - `GET_HIST_APP` / `GET_HIST_REJ` — riwayat approve/reject.
  - `PROCESS` — eksekusi approve (`BAPI_REQUISITION_RELEASE`) atau
    reject/delete (`BAPI_REQUISITION_DELETE`), sekaligus mencatat ke tabel
    custom history.

## Tech Stack

- **SAP BSP** (ABAP-based server pages, `<%@page language="abap"%>`)
- **ABAP** murni untuk logic backend (SELECT ke `EBAN`, `MAKT`, `USR21`,
  `ADRP`, tabel custom `ZROTO_APP_HIST` & `ZROTO_REJ_HIST`)
- **BAPI**: `BAPI_USER_GET_DETAIL`, `BAPI_REQUISITION_RELEASE`,
  `BAPI_REQUISITION_DELETE`, `BAPI_TRANSACTION_COMMIT/ROLLBACK`
- **Vanilla HTML/CSS/JS** di sisi klien — tidak ada framework (no jQuery,
  no Fiori/UI5)
- Komunikasi klien-server: `fetch()` ke `main.htm?action=...` (GET untuk
  query data, POST `application/x-www-form-urlencoded` untuk `PROCESS`)

## Hal Penting yang Hardcoded (perlu diganti saat reuse)

| Item | Nilai saat ini | Lokasi |
|---|---|---|
| Document type PR | `ROTO` | `main.htm` (semua SELECT ke EBAN) |
| Plant yang didukung | `1200` (Surabaya), `1300` (Semarang) | `main.htm` (GET_SIDEBAR) & `index.htm` (`PLANT_LABELS`, sidebar) |
| User approver | `KMI-BOD` (single hardcoded username) | `main.htm` baris ~136 |
| Release code BAPI | `P2` ("PR BOD Approval") | `main.htm` (PROCESS → approve) |
| Tabel history approve | `ZROTO_APP_HIST` | custom table |
| Tabel history reject | `ZROTO_REJ_HIST` | custom table |

Detail lengkap arsitektur, alur, konteks bisnis, dan catatan investigasi ada
di folder `documentation/` dan `notes/`.
