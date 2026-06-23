# ZPO_REL_BSP — PO Release System

Dokumentasi teknis aplikasi **Release PO (Purchase Order)** untuk
PT. Kayu Mebel Indonesia (KMI).

## Informasi Umum

| Atribut | Nilai |
|---------|-------|
| **Nama** | ZPO_REL_BSP |
| **Jenis** | BSP Application (Single-file) |
| **Fungsi** | Release & Reject PO massal (bulk) |
| **Plant** | 1200 (Surabaya), 1300 (Semarang) |
| **File** | `Page with FLow Logic/main.htm` (4085 baris) |
| **Status** | Live / Production |

## Arsitektur

Single-file BSP: ABAP + HTML + CSS + JS dalam 1 file `main.htm`.

### Alur Inisialisasi

1. ABAP script page jalankan `Z_FM_YMMR068` untuk plant 1200 dan 1300
2. Data PO (header+item) diserialisasi ke JSON, di-inject sebagai `ALL_DATA1` & `ALL_DATA2`
3. HTML dirender dengan sidebar navigasi
4. Semua interaksi via JavaScript client-side
5. Aksi bulk dikirim via POST ke `main.htm` yang sama dengan parameter `action`

### Kategori PO

| Plant | Kategori | BSART |
|-------|----------|-------|
| 1200 | JASA, JASA_PROD, BAHAN, PENUNJANG, SPAREPART, UTILITY, EXIM | PSB7, POK1, PSB1/3/4, PSB2, PSB8/9/BT, PSB5/6, PSBI/POK9 |
| 1300 | JASA, BAHAN, PENUNJANG, SPAREPART, UTILITY, EXIM | PSM7, PSM1/3/4, PSM2, PSM8/9/MT, PSM5/6, PSMI/POK9 |

### Action API

| Action | Method | Fungsi |
|--------|--------|--------|
| `GET_HISTORY_REL` | GET | Riwayat release (CDHDR+CDPOS, tcode ME28/ME29N) |
| `GET_HISTORY_REJ` | GET | Riwayat reject (PROCSTAT='08') + READ_TEXT |
| `GET_HISTORY_COUNT` | GET | Badge count sidebar |
| `GET_HISTORY_ITEMS` | GET | Item detail PO riwayat (lazy) |
| `GET_OGR` | GET | Outstanding Goods Receipt |
| `BULK_REL` | POST | Release massal via `Z_PO_RELEASE2` |
| `BULK_REJ` | POST | Reject massal via `Z_PO_COMMENT_UPDATE` + `Z_PO_REJECT` |

### Function Modules

| FM | Fungsi |
|----|--------|
| `Z_FM_YMMR068` | Ambil data PO per plant |
| `Z_PO_RELEASE2` | Release PO |
| `Z_PO_REJECT` | Reject PO |
| `Z_PO_COMMENT_UPDATE` | Simpan komentar PO (text ID F01) |
| `READ_TEXT` | Baca teks komentar |

### Fitur Eksklusif

- Outstanding GR monitoring
- Date range filter + server-side pagination history
- Popstate / URL state restore
- Kategori sebagai grup BSART (`POTYPE_MAP`)
- Alasan reject wajib via SAP text (object EKKO, ID F01)
