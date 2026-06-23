# Perbandingan ZPR_REL_BSP vs ZPO_REL_BSP

## Ringkasan

| Aspek | ZPR_REL_BSP (PR Release) | ZPO_REL_BSP (PO Release) |
|-------|--------------------------|---------------------------|
| **Dokumen yang diproses** | Purchase Requisition (PR) — `EBAN` | Purchase Order (PO) — `EKKO` / `EKPO` |
| **Key field** | `banfn` (nomor PR) | `ebeln` (nomor PO) |
| **Tujuan** | Persetujuan PR sebelum dikonversi ke PO | Persetujuan PO yang sudah jadi |
| **Struktur file** | 2 file: `main.htm` (ABAP) + `index.htm` (HTML/CSS/JS) | Monolitik: 1 file `main.htm` (~4085 baris) |
| **Arsitektur** | Backend API + frontend SPA terpisah | ABAP pre-load data + embedded JS |

## Struktur Data

| Aspek | ZPR_REL_BSP | ZPO_REL_BSP |
|-------|-------------|-------------|
| **Tipe data header** | `ty_eban_head` (EBAN langsung) | `ztymmr068` (DDIC structure via FM `Z_FM_YMMR068`) |
| **Tipe data item** | `ty_eban_item` (EBAN langsung) | `ztymmr068po` (DDIC structure via FM `Z_FM_YMMR068`) |
| **Sumber data** | SELECT langsung dari `EBAN` + `MAKT` | FM `Z_FM_YMMR068` (query internal complex) |
| **Cara ambil data** | Async per-plant/category via AJAX | Pre-load ALL data untuk plant 1200 + 1300 saat page load |
| **History approval** | Tabel custom `ZROTO_APP_HIST` (snapshot) | Change document SAP `CDHDR` / `CDPOS` |
| **History reject** | Tabel custom `ZROTO_REJ_HIST` (snapshot) | Change document SAP `CDHDR` / `CDPOS` + `READ_TEXT` |
| **History items** | Tidak ada (PR item di GET_DETAIL) | `GET_HISTORY_ITEMS` query ke `EKPO` + `MAKT` |

## Mapping Kategori / Plant

| Aspek | ZPR_REL_BSP | ZPO_REL_BSP |
|-------|-------------------|-------------|
| **Struktur kategori** | Langsung pakai BSART (`ROTO`, `RSB7`, `RSBT`, `RSB8`, `RSM8`) | `POTYPE_MAP` — grup BSART per kategori (JASA, BAHAN, SPAREPART, dll) |
| **Kategori Plant 1200** | 4 kategori: ROTO, RSB7, RSBT, RSB8 | 7 kategori: JASA (`PSB7`), JASA_PROD (`POK1`), BAHAN (`PSB1/3/4`), PENUNJANG (`PSB2`), SPAREPART (`PSB8/9/BT`), UTILITY (`PSB5/6`), EXIM (`PSBI/POK9`) |
| **Kategori Plant 1300** | 3 kategori: ROTO, RSB7, RSM8 | 6 kategori: JASA (`PSM7`), BAHAN (`PSM1/3/4`), PENUNJANG (`PSM2`), SPAREPART (`PSM8/9/MT`), UTILITY (`PSM5/6`), EXIM (`PSMI/POK9`) |
| **Label kategori** | Langsung dari BSART | Grup dengan badge warna (ungu, hijau, biru, amber, cyan, merah) |

## Backend (ABAP) — Perbandingan per Action

| Action | ZPR_REL_BSP | ZPO_REL_BSP |
|--------|-------------------|-------------|
| **GET_SIDEBAR / count** | Macro `count_pending` per bsart+werks + hitung history | `GET_HISTORY_COUNT` — query CDHDR+CDPOS untuk rel & rej hari ini |
| **GET_LIST / GET_OGR** | SELECT distinct `banfn` dr EBAN → validasi item open → detail items | `GET_OGR` — query EKKO+EKPO untuk outstanding GR |
| **GET_DETAIL** | SELECT item dari EBAN per `banfn` | Tidak ada (detail via modal dari pre-loaded data) |
| **GET_HIST_REL / REL** | `GET_HIST_APP` — SELECT dari `ZROTO_APP_HIST` | `GET_HISTORY_REL` — query `CDHDR` tcode ME28/ME29N → `CDPOS` fname FRGZU/FRGKE |
| **GET_HIST_REJ** | SELECT dari `ZROTO_REJ_HIST` | `GET_HISTORY_REJ` — query `CDHDR` → `CDPOS` fname PROCSTAT value_new='08' |
| **PROCESS / BULK_REL** | `BAPI_REQUISITION_RELEASE` per item dengan `rel_code='P2'` | `Z_PO_RELEASE2` per PO dengan release code dari `frgco` |
| **PROCESS reject / BULK_REJ** | `BAPI_REQUISITION_DELETE` untuk hapus PR dari SAP | `Z_PO_COMMENT_UPDATE` + `Z_PO_REJECT` |
| **Validasi approval** | Hardcoded `sy-uname = 'KMI-BOD'` | Tidak ada (semua user bisa release/reject) |

## Frontend (JavaScript/HTML/CSS)

| Fitur | ZPR_REL_BSP | ZPO_REL_BSP |
|-------|-------------------|-------------|
| **Search** | Client-side, filter `allData` (300ms debounce) | Client-side (PO/OGR) + Server-side (History, 400ms) |
| **Field search** | `banfn`, `ernam_full`, `ernam`, `txz01`, `ekgrp`, `estkz_label`, `badat`, `total_value`, `bsart`, `werks` | PO: `ebeln`, `name1`; OGR: `ebeln`, `name1`, `matnr`, `txz01`, `bsart`; History: server-side |
| **Pagination** | Client-side, page size: 10/20/50/All | Client-side (PO/OGR) + Server-side offset/limit (History) |
| **Sidebar** | Fixed 264px, collapsible, 2 plant section + submenu per kategori + history | Fixed, collapsible, 2 plant section + kategori + history + OGR |
| **OGR (Outstanding GR)** | Tidak ada | Full fitur: summary cards, tabel, expand/collapse, filter, pagination |
| **FAB (Action Bar)** | Muncul untuk approver: Approve + Reject button | Muncul untuk semua user: Release + Reject button + comment input |
| **Modal** | Approve modal + Reject modal (dengan textarea notes opsional) | PO Detail modal (expand item) |
| **Toast notification** | Ada, auto-dismiss 4500ms | Ada, auto-dismiss |
| **Popstate / URL** | Tidak ada | Ada — parse URL parameter untuk restore state |
| **Loading overlay** | Overlay "Processing N / Total" | Overlay spinner |
| **Utility functions** | `escHtml`, `fmtAmt`, `fmtQty`, `parseNum`, `getEstkzLabel`, `getBsartLabel`, `postOpts` | `escHtml`, `formatAmount`, `formatNum`, `formatNumHist`, `parseAbapNum`, `formatDate`, `formatTime`, `getPotypeInfo` |
| **Theme** | CSS variables (biru-putih) | CSS variables (biru-putih) |
| **Bahasa UI** | Indonesia | Indonesia |

## Proses Approval

| Tahap | ZPR_REL_BSP | ZPO_REL_BSP |
|-------|-------------------|-------------|
| **Approval method** | Per-item: `BAPI_REQUISITION_RELEASE` (rel_code='P2') | Per-PO: `Z_PO_RELEASE2` (release code dari field `frgco`) |
| **Eksekusi** | Satu PR selesai → commit → history → lanjut PR berikutnya | Semua PO dalam 1 loop → 1 commit di akhir |
| **History** | Snapshot ke `ZROTO_APP_HIST` (hanya item sukses) | Tersimpan otomatis di change document SAP |
| **Rollback** | `BAPI_TRANSACTION_ROLLBACK` jika 0 item sukses | Break loop jika error, commit hanya jika semua sukses |

## Proses Reject

| Tahap | ZPR_REL_BSP | ZPO_REL_BSP |
|-------|-------------------|-------------|
| **Method** | `BAPI_REQUISITION_DELETE` (delete_ind='L') — hapus PR | `Z_PO_COMMENT_UPDATE` + `Z_PO_REJECT` |
| **Alasan reject** | Opsional, disimpan di `ZROTO_REJ_HIST.reason` | Wajib, disimpan sebagai SAP text (ID `F01`, object `EKKO`) |
| **Atomicity** | 1 LUW: BAPI delete → history → COMMIT; rollback jika gagal | Per-PO: comment → reject; break jika error |
| **History** | Snapshot ke `ZROTO_REJ_HIST` hanya jika BAPI sukses | Tersimpan di change document SAP |

## Perbedaan Arsitektur Signifikan

| Aspek | ZPR_REL_BSP | ZPO_REL_BSP |
|-------|-------------------|-------------|
| **Loading data** | On-demand (AJAX per kategori) | Pre-load semua data di ABAP → embed ke JS sebagai JSON |
| **Pagination data** | Client-side (semua data di-load, dipotong di frontend) | Client-side (PO/OGR) + Server-side offset/limit (History) |
| **Performa dataset besar** | Lebih scalable (load per kategori) | Berpotensi lambat di initial load (semua data sekali ambil) |
| **Single point of entry** | `index.htm` sebagai shell, `main.htm` sebagai API | Satu file `main.htm` untuk semua (ABAP + HTML + CSS + JS) |
| **Custom FM** | Tidak ada (inline SELECT + BAPI standard) | `Z_FM_YMMR068`, `Z_PO_RELEASE2`, `Z_PO_REJECT`, `Z_PO_COMMENT_UPDATE` |
| **Cek approver** | Ya — hanya user `KMI-BOD` | Tidak — semua user bisa approve/reject |
| **Pengecekan wewenang** | Hardcoded username di ABAP | Tidak ada |
| **Fitur unik** | ESTKZ filter (MRP / Non-MRP), search 10 field | OGR monitoring, history date range filter, popstate URL |

> **Multi-Plant Support:** ZPR_REL_BSP mendukung 7 plant: 1200 (Surabaya), 1300 (Semarang), 2000, 1000, 1001, 1100, 3000. Masing-masing dengan konfigurasi kategori per plant di `CATEGORY_DEF` (frontend) dan `lt_cat_def` (backend).
