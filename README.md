# Breakdown ROTO SAP

Repo ini berisi hasil bedah (reverse-engineering) aplikasi **SAP BSP** milik
PT. Kayu Mebel Indonesia (KMI), modul **MM (Materials Management)**.

**Tujuan:** Memahami logic yang sudah ada di aplikasi original `ZPR_REL_BSP`
supaya bisa diambil pola/logic-nya dan dipakai ulang untuk membuat aplikasi
serupa pada **kategori PR lain** (bukan hanya ROTO).

## Aplikasi dalam Repo

| Aplikasi | Fungsi | File | Status |
|----------|--------|------|--------|
| `ZPR_REL_BSP` | Release PR ROTO (single kategori) | index.htm + main.htm | Baseline |
| `ZPR_REL_BSP/index-merge.htm` | Release PR Multi Kategori (merge) | Single file 2811 baris | Hasil merge |
| `ZPO_REL_BSP` | Release PO multi kategori | main.htm (4085 baris) | Live |
| `ZBSP_PRCH_APP` | Release PR multi kategori (v2) | index.htm + main.htm | Rujukan |

## Struktur Folder

```
Breakdown-ROTO-SAP/
│
├── ZPR_REL_BSP/                     <- clone aplikasi BSP asli dari SAP
│   ├── Page with FLow Logic/
│   │   ├── index.htm                <- UI (HTML+CSS+JS, 2372 baris)
│   │   └── main.htm                 <- API (ABAP, 1154 baris)
│   ├── index-merge.htm              <- hasil merge dengan jasa_copy (2811 baris)
│   ├── Session Notes - 22 Jun 2026.md
│   └── MIMEs/                       <- aset gambar
│
├── ZPO_REL_BSP/                     <- aplikasi Release PO (Live)
│   ├── Page with FLow Logic/
│   │   └── main.htm                 <- single-file (ABAP+HTML+CSS+JS, 4085 baris)
│   ├── doc.md                       <- dokumentasi aplikasi
│   └── MIMEs/
│
├── ZBSP_PRCH_APP/                   <- aplikasi Release PR rujukan
│   ├── Page with FLow Logic/
│   │   ├── index.htm                <- UI (2062 baris)
│   │   └── main.htm                 <- API (1229 baris)
│   ├── erd.md                       <- ERD lengkap (577 baris)
│   ├── TAMBAH_KATEGORI.md           <- panduan aktivasi kategori
│   └── MIMEs/
│
├── documentation/
│   ├── README.md                    <- index dokumentasi
│   ├── business-process.md          <- konteks bisnis multi kategori
│   ├── flow.md                      <- alur teknis semua versi
│   ├── zpo-rel-bsp.md               <- dokumentasi PO Release
│   └── zbsp-prch-app.md             <- dokumentasi PR rujukan
│
├── notes/
│   └── investigation.md             <- catatan temuan, bug, ide reuse
│
├── flowAndLogic.md                  <- dokumentasi sistem & alur (566 baris)
├── myLearning.md                    <- laporan pembelajaran (631 baris)
├── history_screaning.md             <- audit log screening (177 baris)
├── perbandingan.md                  <- ZBSP_PRCH_APP vs ZPR_REL_BSP
├── perbandingan-logic.md            <- ZPR_REL_BSP_jasa vs ZPO_REL_BSP
├── notes.md                         <- pre-flight SE80 test notes
└── README.md
```

## Aplikasi dalam Repo

### `ZPR_REL_BSP` — Release PR (Baseline)

Aplikasi original "Release PR ROTO". Portal untuk BOD approve/reject PR
dengan document type `ROTO` (One Time Off) untuk plant Surabaya (1200)
dan Semarang (1300).

- **`index.htm`** (2372 baris): UI shell — ABAP scriptlet, CSS, JavaScript.
  Render sidebar, daftar PR, detail item, search/filter/pagination.
- **`main.htm`** (1154 baris): API handler ABAP — return JSON manual.
  Actions: `GET_SIDEBAR`, `GET_LIST`, `GET_DETAIL`, `GET_HIST_APP`,
  `GET_HIST_REJ`, `PROCESS`.
- **`index-merge.htm`** (2811 baris): Hasil merge dengan `jasa_copy`.
  Fitur: welcome modal, skeleton loading, 32 CSS variables, multi kategori.

### `ZPO_REL_BSP` — Release PO (Live)

Aplikasi **single-file** untuk Release & Reject PO massal.
- **`main.htm`** (4085 baris): ABAP + HTML + CSS + JS dalam 1 file.
- Data pre-load via `Z_FM_YMMR068`.
- Fitur: Outstanding GR, history dengan date filter, popstate URL.

### `ZBSP_PRCH_APP` — Release PR Rujukan

Versi rujukan 2-file dengan fitur keamanan lebih lengkap.
- **index.htm** (2062) + **main.htm** (1229).
- Backend plant restriction (`check_werks_allowed`).
- 32 CSS design tokens, welcome modal, skeleton loading.

## Tech Stack

- **SAP BSP** (Business Server Pages, `<%@page language="abap"%>`)
- **ABAP**: SELECT ke `EBAN`/`EKKO`/`EKPO`, `MAKT`, `USR21`, `ADRP`,
  `CDHDR`/`CDPOS`, `LFA1`
- **BAPI/FM**: `BAPI_REQUISITION_RELEASE`, `BAPI_REQUISITION_DELETE`,
  `BAPI_TRANSACTION_COMMIT/ROLLBACK`, `BAPI_USER_GET_DETAIL`,
  `Z_PO_RELEASE2`, `Z_PO_REJECT`, `Z_FM_YMMR068`
- **Custom Z Tables**: `ZROTO_APP_HIST`, `ZROTO_REJ_HIST`
- **Vanilla HTML/CSS/JS** — no framework, no jQuery, no Fiori/UI5
- Komunikasi: `fetch()` ke `main.htm?action=...` (GET/POST)

## Hal Penting yang Hardcoded

| Item | Nilai | Lokasi |
|------|-------|--------|
| Document type PR | `ROTO`, `RSB7`, `RSBT`, `RSB8`, `RSM8` | Whitelist + count_pending |
| Plant | `1200`, `1300`, `2000` | `main.htm` + `index.htm` |
| User approver | `KMI-BOD` | `main.htm` line ~138 |
| Release code | `P2` | `main.htm` PROCESS approve |
| History tables | `ZROTO_APP_HIST`, `ZROTO_REJ_HIST` | Types, SELECT, MODIFY |
| ESTKZ mapping | 14 kode | JS `ESTKZ_MAP` |
| Logout URL | Hardcode path BSP | index.htm |

Detail lengkap di folder `documentation/` dan `notes/`.
