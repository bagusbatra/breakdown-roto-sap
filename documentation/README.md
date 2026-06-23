# Dokumentasi — Breakdown ROTO SAP

Index dokumentasi teknis & bisnis untuk proyek Release PR/PO
PT. Kayu Mebel Indonesia (KMI).

## Dokumentasi Inti

| File | Isi | Baris |
|------|-----|:-----:|
| `business-process.md` | Konteks bisnis, alur approve/reject, ERD, multi kategori | ~300 |
| `flow.md` | Flow teknis, arsitektur, action API, perbandingan versi | ~280 |

## Dokumentasi Per Aplikasi

| File | Aplikasi | Isi |
|------|----------|-----|
| `zpo-rel-bsp.md` | ZPO_REL_BSP | PO Release (single-file, live) |
| `zbsp-prch-app.md` | ZBSP_PRCH_APP | PR Release rujukan (read-only, multi kategori) |

## Dokumentasi Eksternal (Root Repo)

| File | Isi |
|------|-----|
| `README.md` | Overview proyek, struktur folder, tech stack |
| `flowAndLogic.md` | Dokumentasi sistem & alur (566 baris) |
| `myLearning.md` | Laporan pembelajaran (631 baris) |
| `history_screaning.md` | 3x screening audit log (177 baris) |
| `perbandingan.md` | Perbandingan ZBSP_PRCH_APP vs ZPR_REL_BSP |
| `perbandingan-logic.md` | Perbandingan ZPR_REL_BSP_jasa vs ZPO_REL_BSP |
| `notes.md` | Pre-flight SE80 test notes (73 baris) |
| `notes/investigation.md` | 8 temuan bug, rekomendasi keamanan (272 baris) |

## Aplikasi dalam Repo

| Folder | Aplikasi | File |
|--------|----------|------|
| `ZPR_REL_BSP/` | PR Release (baseline) | index.htm (2372) + main.htm (1154) |
| `ZPR_REL_BSP/` | index-merge.htm | Hasil merge (2811 baris) |
| `ZPO_REL_BSP/` | PO Release (live) | main.htm (4085) |
| `ZBSP_PRCH_APP/` | PR Release rujukan | index.htm (2062) + main.htm (1229) |
