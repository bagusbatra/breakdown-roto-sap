# ZBSP_PRCH_APP — General Procurement PR Release

Dokumentasi teknis aplikasi **Release PR Multi Kategori** versi rujukan
sebelum merge dengan `jasa_copy`.

## Informasi Umum

| Atribut | Nilai |
|---------|-------|
| **Nama** | ZBSP_PRCH_APP |
| **Jenis** | BSP Application (2-file: index.htm + main.htm) |
| **Fungsi** | Release PR multi kategori (read-only) |
| **Plant** | 1200 (Surabaya), 1300 (Semarang), 2000 (extension) |
| **Total LOC** | ~4.009 (index: 2062, main: 1229) |
| **Status** | Versi rujukan (sebelum merge) |

## Perbedaan Kunci dengan ZPR_REL_BSP

| Aspek | ZBSP_PRCH_APP | ZPR_REL_BSP |
|-------|---------------|-------------|
| Approver | Read-only (`lv_is_approver = abap_false`) | KMI-BOD bisa approve |
| FAB + Select | Tidak ada | Ada |
| Kategori model | `PR_CATEGORIES` (doc type = key) | `CATEGORY_DEF` (business function = key) |
| Backend plant restriction | ✅ `check_werks_allowed` macro | ❌ Frontend only |
| CSS variables | 32 design tokens | 11 |
| Welcome modal | ✅ (localStorage, 1x/hari) | ❌ |
| Skeleton loading | ✅ | ❌ |
| Duplicate code | Bersih | index-merge.htm ada 11+ fungsi duplikat |

## Fitur Eksklusif ZBSP_PRCH_APP

- **Backend plant restriction**: `check_werks_allowed` macro untuk user KMI-U052, U051, U151
- **Welcome modal**: ringkasan PR pending setiap hari
- **Skeleton loading**: shimmer animation di sidebar
- **ResizeObserver**: sticky toolbar dinamis
- **9 CSS animations**: menuPop, modalBgIn, modalBoxIn, toastIn, shimmer, pulseDot
- **3 responsive breakpoints**: 1280, 1024, 767
- **Custom Chromium scrollbar**
- **`prefers-reduced-motion`**: aksesibilitas
- **Toggle expand/collapse**: 1 tombol (bukan 2)
- **ERD documentation**: `erd.md` (577 baris)
- **Kategori activation guide**: `TAMBAH_KATEGORI.md` (141 baris)

## Kategori

| Kode | Label | Plant |
|:----:|-------|-------|
| `ROTO` | PR Maintenance | 1200, 1300 |
| `PRK9` | PR RND | 1200 |
| `RSBR` | PR RND | 1200 |
| `PRKS` | PR Service | 1200, 1300 |
| `RSBT` | PR Tools (dormant) | 1200 |
| `RSB8` | PR Rawat & Projek (dormant) | 1200 |
| `RSM8` | PR Rawat & Projek (dormant) | 1300 |
