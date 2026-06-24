# Presentasi Projek — Release Purchase Requisition (PR)
## PT. Kayu Mebel Indonesia — Procurement & Purchasing Department

---

# Daftar Isi

1. [Ringkasan Eksekutif](#1-ringkasan-eksekutif)
2. [Latar Belakang & Tujuan](#2-latar-belakang--tujuan)
3. [Arsitektur Sistem](#3-arsitektur-sistem)
4. [Aplikasi ZBSP_PRCH_APP (PR Viewer)](#4-aplikasi-zbsp_prch_app-pr-viewer)
5. [Aplikasi ZPR_REL_BSP (PR Approval Workflow)](#5-aplikasi-zpr_rel_bsp-pr-approval-workflow)
6. [Perbandingan Kedua Aplikasi](#6-perbandingan-kedua-aplikasi)
7. [Fitur Multi-Currency](#7-fitur-multi-currency)
8. [Entitas Data & Database](#8-entitas-data--database)
9. [Demo Alur Penggunaan](#9-demo-alur-penggunaan)
10. [Kesimpulan & Rekomendasi](#10-kesimpulan--rekomendasi)

---

# 1. Ringkasan Eksekutif

Dua aplikasi SAP BSP (Business Server Pages) telah dikembangkan untuk mendukung proses **Release Purchase Requisition (PR)** di PT. Kayu Mebel Indonesia:

| Aplikasi | Fungsi | Status | Approver |
|----------|--------|--------|----------|
| **ZBSP_PRCH_APP** | Monitoring & Viewing PR Pending | ✅ Read-Only (Live) | ❌ Tidak |
| **ZPR_REL_BSP** | Approval Workflow (Approve/Reject) | ✅ Full Workflow (Live) | ✅ KMI-BOD |

**Teknologi:** SAP ABAP BSP (Backend) + HTML5/CSS3/Vanilla JavaScript (Frontend)  
**Cakupan:** 7 Plant, 4 Kategori PR, 2 Wilayah (Surabaya & Semarang)  
**Pengguna:** KMI-BOD (Approver), KMI-U052/U051/U151 (Viewer per Plant), BASIS (Admin)

---

# 2. Latar Belakang & Tujuan

## 2.1 Masalah Awal

- Proses approval PR sebelumnya tidak terpusat dan tidak terdokumentasi dengan baik
- Tidak ada history audit yang jelas untuk PR yang sudah di-approve atau di-reject
- Plant-group (Surabaya: 1200/2000/1000/1001/1100, Semarang: 1300/3000) perlu dikelola dalam satu tampilan terpadu
- Setiap PR bisa memiliki item dengan **mata uang berbeda** (IDR, USD, dll) — sistem harus mampu menampilkan total per mata uang secara akurat
- Tidak ada dashboard untuk monitoring KPI approval

## 2.2 Tujuan

1. **Sentralisasi** proses monitoring dan approval PR dalam satu portal berbasis web
2. **Audit Trail** — setiap approve/reject terekam di tabel history (`ZROTO_APP_HIST`, `ZROTO_REJ_HIST`) dengan snapshot data lengkap
3. **Multi-Plant** — menggabungkan 7 plant menjadi 2 grup wilayah (Surabaya, Semarang)
4. **Multi-Currency** — menampilkan total per mata uang, dengan opsi konversi ke IDR menggunakan kurs dari tabel SAP TCURR
5. **Dashboard KPI** — visualisasi jumlah pending, approved, rejected, dan approval rate
6. **Keamanan** — pembatasan akses per plant berdasarkan user SAP

---

# 3. Arsitektur Sistem

## 3.1 Pola Arsitektur

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        SAP NetWeaver AS ABAP                            │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                    BSP Application                                │   │
│  │                                                                   │   │
│  │  ┌──────────────────┐           ┌──────────────────────────────┐  │   │
│  │  │   index.htm       │  fetch()  │   main.htm                   │  │   │
│  │  │  (HTML/CSS/JS)   │◄────────►│  (ABAP Backend API Handler)  │  │   │
│  │  │  Frontend SPA    │   JSON   │                              │  │   │
│  │  │                   │          │  ┌────────────────────────┐  │  │   │
│  │  │  State:           │          │  │  Actions:              │  │  │   │
│  │  │  - curPlant       │          │  │  - GET_SIDEBAR         │  │  │   │
│  │  │  - curMode        │          │  │  - GET_LIST            │  │  │   │
│  │  │  - allData        │          │  │  - GET_DETAIL          │  │  │   │
│  │  │  - histData       │          │  │  - GET_HIST_APP/REJ   │  │  │   │
│  │  │                   │          │  │  - GET_EXCHANGE_RATES  │  │  │   │
│  │  │  Render:          │          │  │  - PROCESS             │  │  │   │
│  │  │  - Card View      │          │  │                        │  │  │   │
│  │  │  - Sidebar        │          │  │  Macros:               │  │  │   │
│  │  │  - History Table  │          │  │  - count_pending       │  │  │   │
│  │  │  - Dashboard      │          │  │  - fmt_date            │  │  │   │
│  │  │  - Currency Modal │          │  │  - escape_json         │  │  │   │
│  │  └──────────────────┘          │  │  - check_werks_alwd   │  │  │   │
│  │                                │  └────────────────────────┘  │  │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                    SAP Standard Tables                            │   │
│  │  ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐  ┌──────────┐  │   │
│  │  │ EBAN   │  │ MAKT   │  │ USR21  │  │ ADRP   │  │ TCURR    │  │   │
│  │  │ (PR)   │  │(Mater) │  │(User)  │  │(Person)│  │(Kurs)    │  │   │
│  │  └────────┘  └────────┘  └────────┘  └────────┘  └──────────┘  │   │
│  │                                                                   │   │
│  │  ┌────────────────────────────────────────────────────────────┐   │   │
│  │  │  Custom Z-Tables (Audit Trail)                             │   │   │
│  │  │  ┌──────────────────────────┐  ┌────────────────────────┐  │   │   │
│  │  │  │ ZROTO_APP_HIST           │  │ ZROTO_REJ_HIST         │  │   │   │
│  │  │  │ - Snapshot saat Approve  │  │ - Snapshot saat Reject │  │   │   │
│  │  │  │ - app_by, app_at, app_tm│  │ - del_by, del_at,      │  │   │   │
│  │  │  │                          │  │   del_tm, reason       │  │   │   │
│  │  │  └──────────────────────────┘  └────────────────────────┘  │   │   │
│  │  └────────────────────────────────────────────────────────────┘   │   │
│  └──────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

## 3.2 Alur Komunikasi

```
Browser (User)
    │
    ├─► Buka index.htm
    │     └─ ABAP: BAPI_USER_GET_DETAIL → nama user
    │     └─ JS: init() → loadSidebarData()
    │
    ├─► fetch(API_URL + '?action=GET_SIDEBAR')
    │     └─ main.htm: SELECT EBAN + ZROTO_*_HIST
    │     └─ Return JSON → renderSidebar()
    │
    ├─► Klik kategori di sidebar
    │     └─ switchView(plant, mode, bsart)
    │           ├─ mode='pending' → fetchList()
    │           │     └─ main.htm: SELECT EBAN (header + items + MAKT + USR21 + ADRP)
    │           │     └─ Return JSON → renderList() → cards
    │           │
    │           ├─ mode='hist_app' → fetchHistApp()
    │           │     └─ main.htm: SELECT ZROTO_APP_HIST
    │           │     └─ Return JSON → renderHistTable() → history cards
    │           │
    │           └─ mode='hist_rej' → fetchHistRej()
    │                 └─ main.htm: SELECT ZROTO_REJ_HIST
    │                 └─ Return JSON → renderHistTable() → history cards
    │
    ├─► Klik card-amount (multi-currency)
    │     └─ showCurrencyModal()
    │           ├─ renderCurrencyModal() → breakdown per currency
    │           └─ Toggle "Konversi ke IDR"
    │                 └─ fetchExchangeRates()
    │                       └─ main.htm: SELECT TCURR (kurs M → IDR)
    │                       └─ Return JSON → setConvertedDisplay()
    │
    └─► (ZPR_REL_BSP only) Klik Approve/Reject
          └─ processAction(banfns, action, notes)
                └─ fetch(POST main.htm, action=PROCESS)
                      ├─ Approve: BAPI_REQUISITION_RELEASE(rel_code='P2')
                      │           + MODIFY ZROTO_APP_HIST → COMMIT
                      └─ Reject:  BAPI_REQUISITION_DELETE(delete_ind='L')
                                  + MODIFY ZROTO_REJ_HIST → COMMIT
```

## 3.3 Struktur File

### ZBSP_PRCH_APP
```
├── Page with FLow Logic/
│   ├── index.htm    (2.241 baris)  — HTML/CSS/JS Frontend
│   └── main.htm     (1.384 baris)  — ABAP Backend API Handler
├── MIMEs/
│   ├── logo.png
│   ├── background.png
│   ├── surabaya.png
│   └── semarang.png
├── erd.md           (583 baris)    — ERD Documentation
├── TAMBAH_KATEGORI.md              — Panduan Kategori Baru
└── (documentasi terkait lainnya)
```

### ZPR_REL_BSP
```
├── Page with FLow Logic/
│   ├── index.htm    (2.680 baris)  — HTML/CSS/JS Frontend
│   └── main.htm     (1.341 baris)  — ABAP Backend API Handler
├── MIMEs/
│   ├── logo.png
│   ├── background.png
│   ├── surabaya.png
│   └── semarang.png
└── (documentasi terkait lainnya)
```

---

# 4. Aplikasi ZBSP_PRCH_APP (PR Viewer)

**Peran:** Portal monitoring PR — **read-only** (tidak bisa approve/reject)

## 4.1 Fitur Utama

### Sidebar Navigasi

```
┌─────────────────────────────────────┐
│  📊 Dashboard                       │
├─────────────────────────────────────┤
│  ┌ Surabaya ──── 12 ──────────┐     │
│  │  📋 PR Maintenance    8    │     │
│  │  🔧 PR RND            3    │     │
│  │  🔧 PR Service        1    │     │
│  │  ✓ History Approve   10    │     │
│  │  ✗ History Reject     2    │     │
│  └──────────────────────────────┘     │
│  ┌ Semarang ──── 5 ───────────┐     │
│  │  📋 PR Maintenance    4    │     │
│  │  🔧 PR Service        1    │     │
│  │  ✓ History Approve    4    │     │
│  │  ✗ History Reject     1    │     │
│  └──────────────────────────────┘     │
└─────────────────────────────────────┘
```

- **2 Plant Group:** Surabaya (1200/2000/1000/1001/1100) dan Semarang (1300/3000)
- **3 Kategori:** ROTO (Maintenance), PRK9 (RND), PRKS (Service)
- **Badge** jumlah pending, history approve, history reject
- **Restriksi User:**
  - `KMI-U052` & `KMI-U151` → hanya melihat Surabaya
  - `KMI-U051` → hanya melihat Semarang
  - `KMI-BOD` & `BASIS` → melihat semua plant

### Dashboard KPI

```
┌──────────────────────────────────────────────────────────────────┐
│  📊 DASHBOARD RELEASE PR                                         │
│                                                                   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐     │
│  │  PR      │  │  Total   │  │  Total   │  │  Approval    │     │
│  │  Pending │  │ Approved │  │ Rejected │  │  Rate        │     │
│  │    12    │  │    14    │  │    3     │  │    82%      │     │
│  └──────────┘  └──────────┘  └──────────┘  └──────────────┘     │
│                                                                   │
│  Pending per Kategori              │  Approve vs Reject          │
│  ┌────────────────────────────┐    │     ┌──────────────────┐   │
│  │  Maintenance ████████ 80%  │    │     │  ╭─ Approved 82% │   │
│  │  RND         ██      15%  │    │     │  │  Rejected 18% │   │
│  │  Service     █        5%  │    │     │  ╰────────────────╯   │
│  └────────────────────────────┘    │     └──────────────────┘   │
│                                                                   │
│  Detail per Plant                                                │
│  ┌ Surabaya ─────────────────────────────────────────────────┐   │
│  │  ROTO: 8 PR  │  PRK9: 3 PR  │  PRKS: 1 PR                │   │
│  └────────────────────────────────────────────────────────────┘   │
│  ┌ Semarang ──────────────────────────────────────────────────┐   │
│  │  ROTO: 4 PR  │  PRKS: 1 PR                                │   │
│  └────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────┘
```

### Card View (Pending PR)

```
┌─────────────────────────────────────────────────────────────────────┐
│  0010000001  ● Pending  1200 Surabaya  MRP  3 items                │
│                                      ┌──────────────────────────┐   │
│                                      │  IDR 50.000.000          │   │
│                                      │  Total                   │   │
│                                      └──────────────────────────┘   │
│  Dibuat Oleh    │ Deskripsi         │ Purch. Group  │ Tgl PR       │
│  User Satu      │ Maintenance Mesin │ P01           │ 19.06.2026   │
│  ───────────────────────────────────────────────────────────────────│
│  [▼ Expand → detail item table]                                     │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│  0010000002  ● Pending  1300 Semarang  Non-MRP  5 items            │
│                                      ┌──────────────────────────┐   │
│                                      │  USD 12.500              │   │
│                                      │  + 1 lainnya ▶           │   │
│                                      └──────────────────────────┘   │
│  Dibuat Oleh    │ Deskripsi         │ Purch. Group  │ Tgl PR       │
│  User Dua       │ Import Material   │ P02           │ 18.06.2026   │
│  ───────────────────────────────────────────────────────────────────│
│  [▼ Expand → detail item table]                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Multi-Currency Modal (Fitur Baru)

```
┌──────────────────────────────────┐
│  💰 Rincian Mata Uang            │
│                                  │
│  Rincian total per mata uang     │
│                                  │
│  ┌ Konversi ke IDR ──────┐      │
│  │                     🔘│      │
│  └────────────────────────┘      │
│                                  │
│  ┌────────────────────────────┐  │
│  │  IDR           45.000.000  │  │
│  │  USD             12.500.00 │  │
│  │  JPY             350.000   │  │
│  └────────────────────────────┘  │
│                                  │
│  Ketika toggle ON:               │
│  ┌────────────────────────────┐  │
│  │  = IDR 244.500.000         │  │
│  └────────────────────────────┘  │
│  Kurs: 1 USD = 15.500 IDR       │
│        1 JPY = 105 IDR           │
│                                  │
│  ┌──────────────────────────┐    │
│  │        Tutup             │    │
│  └──────────────────────────┘    │
└──────────────────────────────────┘
```

### History View (Approve / Reject)

```
┌──────────────────────────────────────────────────────────────────┐
│  ✓ History Approve — Surabaya                                    │
│  14 PR approved                                                  │
│                                                                   │
│  🔍 Cari...  [All Categories ▼]  [Newest ▼]  [10 per page ▼]  │
│                                                                   │
│  ┌ 0010000001 ─────────────────────────────────────────────────┐  │
│  │  ✓ Approved  1200 Surabaya  RND  2 items                    │  │
│  │                                        IDR 25.000.000       │  │
│  │  Dibuat: User1  │   Tgl PR: 01.06.2026                      │  │
│  │  Diapprove: KMI-BOD  │  19.06.2026 14:30                    │  │
│  │  [▼ Items → table detail]                                   │  │
│  └──────────────────────────────────────────────────────────────┘  │
│  ┌ 0010000002 ... (reject card dengan alasan)                    │  │
└──────────────────────────────────────────────────────────────────┘
```

## 4.2 Endpoint API (Backend Actions)

| Action | Method | Fungsi | Query Utama |
|--------|--------|--------|-------------|
| `GET_SIDEBAR` | GET | Badge counts sidebar | 21x SELECT COUNT(DISTINCT banfn) FROM EBAN + SELECT FROM ZROTO_*_HIST |
| `GET_LIST` | GET | Daftar PR pending | SELECT FROM EBAN (frgkz='X', frgzu=' ') + MAKT + USR21 + ADRP |
| `GET_DETAIL` | GET | Detail item per PR | SELECT FROM EBAN WHERE banfn= + MAKT |
| `GET_HIST_APP` | GET | History approve | SELECT FROM ZROTO_APP_HIST ORDER BY app_at DESC |
| `GET_HIST_REJ` | GET | History reject | SELECT FROM ZROTO_REJ_HIST ORDER BY del_at DESC |
| `GET_EXCHANGE_RATES` | GET | Kurs mata uang | SELECT FROM TCURR (KURST='M', TCURR='IDR') |
| `PROCESS` | POST | Approve/Reject | BAPI_REQUISITION_RELEASE / BAPI_REQUISITION_DELETE |

---

# 5. Aplikasi ZPR_REL_BSP (PR Approval Workflow)

**Peran:** Portal approval PR — dapat melakukan **Approve** dan **Reject** PR

## 5.1 Perbedaan Utama dari ZBSP_PRCH_APP

| Aspek | ZBSP_PRCH_APP | ZPR_REL_BSP |
|-------|---------------|-------------|
| **Approver** | ❌ `lv_is_approver = false` | ✅ `KMI-BOD` dapat approve/reject |
| **PROCESS Action** | Ada kodenya tapi tidak tereksekusi | ✅ Aktif dan berjalan |
| **Checkboxes** | ❌ Tidak ada | ✅ Setiap PR punya checkbox |
| **FAB (Floating Action Button)** | ❌ Tidak ada | ✅ Tombol Approve/Reject mengambang |
| **Card Animasi** | ❌ Tidak ada | ✅ Fade-out saat approve/reject sukses |
| **Welcome Modal** | ✅ Ada | ❌ Tidak ada |
| **Skeleton Loading** | ✅ Ada | ❌ Tidak ada |
| **Dashboard KPI** | ✅ Ada | ❌ Tidak ada |
| **Filter Panel** | ✅ Ada (ESTKZ + Sub-Plant) | ❌ Hanya ESTKZ filter |
| **Backend Plant Restriction** | ✅ `check_werks_allowed` | ❌ Tidak ada (hanya frontend) |
| **Sidebar Query** | 21x macro `count_pending` | 3x GROUP BY (optimized) |
| **Category Codes** | BSART langsung (ROTO, PRK9) | Kode abstrak (MTN, RND, SVC) |
| **User Restriction UI** | ✅ `getVisiblePlants()` | ✅ `getVisiblePlants()` |
| **Multi-Currency** | ✅ Per-currency totals + modal konversi IDR | ✅ Per-currency totals (stacked rows) |

## 5.2 Alur Approval

```
User memilih PR di daftar pending
         │
         ├─► Checklist PR yang akan diproses
         │
         ├─► Klik FAB "Approve" / "Reject"
         │
         ├─► Modal Konfirmasi
         │     ├─ Approve: "Release 3 PR dengan Release Code P2?"
         │     └─ Reject: "Hapus 2 PR? Alasan: [textarea]"
         │
         └─► Proses per PR (sequential loop):
               │
               ├─ Approve:
               │   ├─ BAPI_REQUISITION_RELEASE(rel_code='P2')
               │   │   └─ per item dalam PR
               │   ├─ Jika ada item sukses:
               │   │   ├─ BAPI_TRANSACTION_COMMIT
               │   │   └─ MODIFY ZROTO_APP_HIST (snapshot tiap item sukses)
               │   └─ Jika semua gagal: BAPI_TRANSACTION_ROLLBACK
               │
               └─ Reject:
                   ├─ BAPI_REQUISITION_DELETE(delete_ind='L')
                   ├─ Jika sukses:
                   │   ├─ MODIFY ZROTO_REJ_HIST (snapshot + alasan)
                   │   └─ COMMIT WORK
                   └─ Jika gagal: BAPI_TRANSACTION_ROLLBACK
                         (tanpa history)
```

### Release Code

| Kode | Deskripsi | Posisi |
|:----:|-----------|--------|
| **P2** | PR BOD Approval | Strategi Release tahap BOD |

### Atomicity Transaksi

- **Approve:** Setiap item di-release secara independen. Hanya item sukses yang dicatat di history. Tidak ada rollback parsial.
- **Reject:** BAPI delete dijalankan duluan. History ZROTO_REJ_HIST hanya ditulis jika BAPI sukses. COMMIT tunggal untuk keduanya (1 LUW).

## 5.3 Tampilan Approval

```
┌─────────────────────────────────────────────────────────────────────┐
│  0010000001  ☑ ● Pending  1200 Surabaya  MRP  3 items             │
│                                      ┌──────────────────────────┐   │
│                                      │  IDR 50.000.000          │   │
│                                      │  Total                   │   │
│                                      └──────────────────────────┘   │
│  Dibuat Oleh    │ Deskripsi         │ Purch. Group  │ Tgl PR       │
│  User Satu      │ Maintenance Mesin │ P01           │ 19.06.2026   │
│  ───────────────────────────────────────────────────────────────────│
│  [▼ Expand → item detail]                                           │
└─────────────────────────────────────────────────────────────────────┘

                                        ┌─────────────────────────────┐
                                        │  FAB: 3 PR dipilih          │
                                        │  ┌──────┐  ┌────────────┐  │
                                        │  │ ✓   │  │  🗑 Reject │  │
                                        │  │ Appr│  └────────────┘  │
                                        │  └──────┘                  │
                                        └─────────────────────────────┘
```

---

# 6. Perbandingan Kedua Aplikasi

## 6.1 Matriks Perbandingan Detail

| Kategori | ZBSP_PRCH_APP | ZPR_REL_BSP |
|----------|---------------|-------------|
| **Total Baris Kode** | ~3.625 baris | ~4.021 baris |
| **Frontend (index.htm)** | 2.241 baris | 2.680 baris |
| **Backend (main.htm)** | 1.384 baris | 1.341 baris |
| **CSS Variables** | 32 | 11 |
| **CSS Sections** | 19 (terstruktur §1-§19) | 12 |
| **JavaScript Functions** | ~40 | ~50 |
| **SAP BAPIs Used** | BAPI_USER_GET_DETAIL | BAPI_USER_GET_DETAIL, BAPI_REQUISITION_RELEASE, BAPI_REQUISITION_DELETE, BAPI_TRANSACTION_COMMIT, BAPI_TRANSACTION_ROLLBACK |
| **Custom Z-Tables** | ZROTO_APP_HIST, ZROTO_REJ_HIST | ZROTO_APP_HIST, ZROTO_REJ_HIST |
| **SAP Standard Tables** | EBAN, MAKT, USR21, ADRP, TCURR | EBAN, MAKT, USR21, ADRP |
| **Sidebar Queries** | 21 macro calls (kurang optimal) | 3 GROUP BY queries (optimal) |
| **Security (Backend)** | ✅ `check_werks_allowed` | ❌ Tidak ada |
| **Multi-Currency** | ✅ Modal + konversi IDR (TCURR) | ✅ Per-currency stacked rows |
| **Dashboard KPI** | ✅ 4 kartu + chart + detail plant | ❌ Tidak ada |
| **Skeleton Loading** | ✅ Ada | ❌ Tidak ada |
| **Welcome Modal** | ✅ Ada (sekali per hari) | ❌ Tidak ada |
| **Responsive Design** | ✅ 3 breakpoints | ✅ 1 breakpoint |
| **Pagination** | ✅ PR list + History | ✅ PR list + History |
| **Client-side search** | ✅ PR list + History | ✅ PR list + History |
| **Category Filter in History** | ✅ Ya (dropdown kategori) | ❌ Tidak (per plant semua kategori) |
| **Sub-Plant Filter** | ✅ Ya (dropdown) | ❌ Tidak ada |
| **Animasi** | cardIn, fadeUp, shimmer, pulseDot | cardIn, fadeUp, cardFadeOut |

## 6.2 Kelebihan Masing-Masing

### ZBSP_PRCH_APP (Read-Only Viewer)

✅ **Backend security** — `check_werks_allowed` memvalidasi akses plant di level ABAP  
✅ **Dashboard KPI** — visualisasi cepat untuk monitoring  
✅ **Multi-Currency Modal** — breakdown per currency + konversi IDR via kurs TCURR  
✅ **Skeleton Loading** — UX lebih halus saat loading  
✅ **Welcome Modal** — ringkasan harian untuk user  
✅ **Filter lebih lengkap** — ESTKZ + Sub-Plant filter  
✅ **CSS lebih kaya** — 32 design tokens, shadow system lengkap  
✅ **Responsive** — 3 breakpoints (1280, 1024, 767px)

### ZPR_REL_BSP (Full Workflow)

✅ **Approval capability** — satu-satunya yang bisa approve/reject PR  
✅ **Optimasi query sidebar** — 3 GROUP BY vs 21 macro calls  
✅ **Abstract category codes** — MTN/RND/SVC lebih business-friendly  
✅ **Card fade-out animation** — feedback visual yang lebih baik  
✅ **FAB (Floating Action Button)** — UX approval yang ergonomis  
✅ **Checkbox selection** — multi-select untuk batch approve/reject  
✅ **Processing per PR** — sequential loop dengan atomic transaction per PR

---

# 7. Fitur Multi-Currency

## 7.1 Latar Belakang

Dalam satu PR (Purchase Requisition), item-item dapat memiliki **mata uang yang berbeda**. Contoh:
- Item 1: 100 unit Material A @ Rp 150.000 = **IDR 15.000.000**
- Item 2: 50 unit Material B @ USD 250 = **USD 12.500**

Penjumlahan langsung (`15.000.000 + 12.500 = 15.012.500`) akan menghasilkan angka yang **salah secara akuntansi**.

## 7.2 Pendekatan yang Diimplementasikan

### Pendekatan: Group by Currency + Opsional Konversi

```
┌─────────────────────────────────────────────────────────────────┐
│  PR: 0010000001                                                  │
│                                                                   │
│  Item  │  Qty  │  Unit Price   │  Currency  │  Total             │
│  ──────┼───────┼───────────────┼───────────┼─────────────────── │
│  0010  │  100  │  150.000      │  IDR      │  IDR 15.000.000    │
│  0020  │   50  │  250          │  USD      │  USD 12.500        │
│  0030  │ 1000  │  350          │  JPY      │  JPY 350.000       │
│  ──────┼───────┼───────────────┼───────────┼─────────────────── │
│        │       │               │           │                     │
│        │       │  Tanpa Konversi:           │  IDR 15.000.000    │
│        │       │                            │  USD 12.500        │
│        │       │                            │  JPY 350.000       │
│        │       │  ────────────────────────  │                     │
│        │       │  Dengan Konversi ke IDR:   │  IDR 15.000.000    │
│        │       │  (1 USD = 15.500 IDR)      │  USD 193.750.000   │
│        │       │  (1 JPY = 105 IDR)         │  JPY 36.750.000    │
│        │       │                            │  ─────────────    │
│        │       │                            │  IDR 245.500.000   │
└─────────────────────────────────────────────────────────────────┘
```

### Backend (main.htm)

```abap
* Loop item per PR → akumulasi total per currency
LOOP AT lt_items INTO ls_gl_item WHERE banfn = ls_head-banfn.
  READ TABLE lt_gl_currtot INTO ls_gl_currtot
    WITH KEY waers = ls_gl_item-waers.
  IF sy-subrc = 0.
    ls_gl_currtot-total = ls_gl_currtot-total +
      ( ls_gl_item-menge * ls_gl_item-preis ).
    MODIFY lt_gl_currtot FROM ls_gl_currtot INDEX sy-tabix.
  ELSE.
    CLEAR ls_gl_currtot.
    ls_gl_currtot-waers = ls_gl_item-waers.
    ls_gl_currtot-total = ls_gl_item-menge * ls_gl_item-preis.
    APPEND ls_gl_currtot TO lt_gl_currtot.
  ENDIF.
ENDLOOP.
```

Output JSON field baru: `"totals_by_curr":{"IDR":"15000000","USD":"12500","JPY":"350000"}`

### Frontend (index.htm)

1. **Card-amount** — jika multi-currency, tampilkan ringkasan: `"IDR 15.000.000 +2 lainnya ▶"`
2. **Klik** — buka modal `Rincian Mata Uang`
3. **Toggle "Konversi ke IDR"** — fetch kurs dari tabel SAP TCURR
4. **Kurs dicache** di `RATE_CACHE` selama sesi

### Exchange Rate Source

```
SELECT ukurs UP TO 1 ROWS FROM tcurr
  WHERE kurst = 'M'           → Kurs tipe rata-rata (Average)
    AND fcurr = <currency>    → Dari mata uang (USD/JPY/dll)
    AND tcurr = 'IDR'         → Ke IDR (base currency)
    AND gdatu <= sy-datum     → Berlaku hingga hari ini
  ORDER BY gdatu DESCENDING   → Ambil kurs terbaru
```

---

# 8. Entitas Data & Database

## 8.1 Entity Relationship Diagram

```
┌─────────────────────┐         ┌─────────────────────┐
│      EBAN_HEAD      │         │      EBAN_ITEM      │
│  (1 PR = 1 baris)   │         │  (1 PR = N item)    │
├─────────────────────┤         ├─────────────────────┤
│ BANFN  (PK)         │1       N│ BANFN  (PK,FK)      │
│ BADAT               │◄───────►│ BNFPO  (PK)         │
│ WERKS               │         │ MATNR  (FK → MAKT)  │
│ BSART               │         │ TXZ01               │
│ TXZ01               │         │ MENGE               │
│ ERNAM               │         │ MEINS               │
│ EKGRP               │         │ PREIS               │
│ FRGKZ (='X')        │         │ PEINH               │
│ FRGZU (=' ')        │         │ WAERS ←─── KURS     │
│ LOEKZ (=' ')        │         │ LFDAT               │
│ ESTKZ               │         │ WERKS               │
│ STATU (≠'B')        │         └──────┬──────────────┘
└─────────────────────┘                │
        │                              │
        │ 1                            │ N
        │                              │
        │     ┌──────────────────┐     │
        │     │      MAKT        │     │
        │     │  (Deskripsi      │     │
        │     │   Material)      │     │
        │     ├──────────────────┤     │
        │     │ MATNR  (PK)      │◄────┘
        │     │ SPRAS  (PK)      │
        │     │ MAKTX            │
        │     └──────────────────┘
        │
        │ 1                    1
        │                      │
   ┌────┴──────────┐    ┌──────┴──────────┐
   │ ZROTO_APP_HIST│    │ ZROTO_REJ_HIST  │
   │ (Approve)     │    │ (Reject)        │
   ├───────────────┤    ├─────────────────┤
   │ BANFN (PK)    │    │ BANFN (PK)      │
   │ BNFPO (PK)    │    │ BNFPO (PK)      │
   │ WERKS         │    │ WERKS           │
   │ BSART         │    │ BSART           │
   │ TXZ01         │    │ TXZ01           │
   │ ERNAM         │    │ ERNAM           │
   │ ERDAT         │    │ ERDAT           │
   │ MENGE         │    │ MENGE           │
   │ MEINS         │    │ MEINS           │
   │ PREIS         │    │ PREIS           │
   │ PEINH         │    │ PEINH           │
   │ WAERS         │    │ WAERS           │
   │ EKGRP         │    │ EKGRP           │
   │ APP_BY        │    │ DEL_BY          │
   │ APP_AT        │    │ DEL_AT          │
   │ APP_TM        │    │ DEL_TM          │
   └───────────────┘    │ REASON          │
                        └─────────────────┘
```

## 8.2 Detail Tabel

### EBAN — Purchase Requisition (SAP Standard)

| Field | Tipe | Panjang | Deskripsi |
|-------|------|:-------:|-----------|
| `BANFN` | CHAR | 10 | No. PR (Key Header) |
| `BNFPO` | CHAR | 5 | No. Item PR (Key Item) |
| `BSART` | CHAR | 4 | Document Type: `ROTO`, `PRK9`, `RSBR`, `PRKS` |
| `WERKS` | CHAR | 4 | Plant: `1200`, `1300`, `2000`, `1000`, `1001`, `1100`, `3000` |
| `FRGKZ` | CHAR | 1 | Release Indicator: `X` = aktif, ` ` = tidak |
| `FRGZU` | CHAR | 1 | Release Status: ` ` = belum direlease |
| `LOEKZ` | CHAR | 1 | Deletion Flag: ` ` = aktif, `L` = dihapus |
| `STATU` | CHAR | 1 | Status: `B` = Completed, ` ` = Open |
| `ESTKZ` | CHAR | 1 | Source: `B`=MRP, `R`=Manual, dll |
| `PREIS` | DEC | 11(2) | Harga per unit |
| `WAERS` | CUKY | 3 | Mata uang |
| `MENGE` | DEC | 13(3) | Quantity |

### ZROTO_APP_HIST — Approve History (Custom)

| Field | Tipe | Deskripsi |
|-------|------|-----------|
| `MANDT` | CLNT | Client (SAP Mandatory) |
| `BANFN` | CHAR(10) | No. PR (Snapshot) |
| `BNFPO` | CHAR(5) | No. Item (Snapshot) |
| `WERKS` | CHAR(4) | Plant |
| `BSART` | CHAR(4) | Document Type |
| `TXZ01` | CHAR(40) | Deskripsi Item |
| `ERNAM` | CHAR(12) | Pembuat PR |
| `ERDAT` | DATS | Tanggal PR |
| `MENGE` | DEC | Quantity |
| `MEINS` | UNIT | Satuan |
| `PREIS` | DEC | Harga per Unit |
| `PEINH` | DEC | Price Unit |
| `WAERS` | CUKY | Mata Uang |
| `EKGRP` | CHAR(3) | Purchasing Group |
| `APP_BY` | CHAR(12) | Diapprove Oleh |
| `APP_AT` | DATS | Tanggal Approve |
| `APP_TM` | TIMS | Jam Approve |

### ZROTO_REJ_HIST — Reject History (Custom)

| Field | Tipe | Deskripsi |
|-------|------|-----------|
| `MANDT` | CLNT | Client |
| `BANFN` | CHAR(10) | No. PR (Snapshot) |
| `BNFPO` | CHAR(5) | No. Item (Snapshot) |
| `WERKS` | CHAR(4) | Plant |
| `BSART` | CHAR(4) | Document Type |
| `TXZ01` | CHAR(40) | Deskripsi Item |
| `ERNAM` | CHAR(12) | Pembuat PR |
| `ERDAT` | DATS | Tanggal PR |
| `MENGE` | DEC | Quantity |
| `MEINS` | UNIT | Satuan |
| `PREIS` | DEC | Harga per Unit |
| `PEINH` | DEC | Price Unit |
| `WAERS` | CUKY | Mata Uang |
| `EKGRP` | CHAR(3) | Purchasing Group |
| `DEL_BY` | CHAR(12) | Direject Oleh |
| `DEL_AT` | DATS | Tanggal Reject |
| `DEL_TM` | TIMS | Jam Reject |
| `REASON` | STRING | Alasan Reject |

---

# 9. Demo Alur Penggunaan

## 9.1 Skenario Demo (ZBSP_PRCH_APP — Viewer)

### Step 1: Login
```
1. Buka URL: /sap/bc/bsp/sap/zbsp_prch_app/index.htm
2. Masuk dengan user SAP (misal: KMI-U052)
3. Tampil Welcome Modal → ringkasan PR pending hari ini
```

### Step 2: Navigasi Sidebar
```
1. Klik "Surabaya" → expand submenu
2. Lihat badge: ROTO=8, PRK9=3, PRKS=1
3. Klik "PR Maintenance" (ROTO) → masuk ke pending list
```

### Step 3: Review PR Pending
```
1. Lihat daftar card PR pending
2. Perhatikan card-amount:
   - IDR 50.000.000 (single currency)
   - IDR 15.000.000 +1 lainnya ▶ (multi-currency, klik)
3. Klik ▶ → modal "Rincian Mata Uang"
4. Toggle "Konversi ke IDR" → lihat total setelah konversi
5. Klik card → expand → lihat detail item
6. Gunakan search, filter MRP, sort, pagination
```

### Step 4: History
```
1. Klik "✓ History Approve" → lihat PR yang sudah di-approve
2. Klik "✗ History Reject" → lihat PR yang di-reject + alasan
3. Gunakan filter kategori, search, sort
```

### Step 5: Dashboard
```
1. Klik "📊 Dashboard" di sidebar
2. Lihat 4 KPI card
3. Lihat bar chart pending per kategori
4. Lihat donut chart approve vs reject
5. Klik plant card → langsung navigasi ke pending list
```

## 9.2 Skenario Demo (ZPR_REL_BSP — Approval)

Tambahan untuk approval:

### Step 6: Approve PR
```
1. Masuk dengan user KMI-BOD
2. Pilih kategori PR → pending list muncul
3. Checklist beberapa PR
4. FAB muncul: "3 PR dipilih"
5. Klik "✓ Approve"
6. Modal konfirmasi: "Release 3 PR dengan Release Code P2?"
7. Klik "Ya, Approve"
8. Card fade-out animasi
9. Toast sukses: "3 PR berhasil di-approve"
10. Sidebar reload → badge berkurang
```

### Step 7: Reject PR
```
1. Checklist PR
2. Klik "🗑 Reject"
3. Modal: "Alasan penolakan:" → isi alasan
4. Klik "Ya, Reject"
5. Card fade-out
6. Toast sukses
```

---

# 10. Kesimpulan & Rekomendasi

## 10.1 Pencapaian

| No | Capaian | Status |
|:--:|---------|:------:|
| 1 | Portal monitoring PR terpusat untuk 7 plant | ✅ |
| 2 | History audit approve & reject (snapshot) | ✅ |
| 3 | Multi-currency: grouping per mata uang | ✅ |
| 4 | Konversi kurs ke IDR dari TCURR | ✅ |
| 5 | Dashboard KPI | ✅ |
| 6 | Approval workflow (ZPR_REL_BSP) | ✅ |
| 7 | Atomic transaction (COMMIT/ROLLBACK) | ✅ |
| 8 | Restriksi akses per plant | ✅ |

## 10.2 Rekomendasi Pengembangan ke Depan

| Prioritas | Item | Keterangan |
|:---------:|------|------------|
| 🔴 **Tinggi** | **Security ZPR_REL_BSP** | Tambahkan `check_werks_allowed` seperti di ZBSP_PRCH_APP (backend plant restriction) |
| 🟡 **Sedang** | **Flexible Approver** | Ganti hardcode KMI-BOD dengan authorization object atau custom table |
| 🟡 **Sedang** | **Date Range Filter** | Tambahkan filter tanggal untuk history (cegah pertumbuhan data yang tidak terkendali) |
| 🟢 **Ringan** | **Export to Excel** | Tambahkan tombol download data PR ke format spreadsheet |
| 🟢 **Ringan** | **Email Notification** | Notifikasi email ke approver saat ada PR baru yang perlu di-approve |
| 🟢 **Ringan** | **Audit Log Viewer** | Halaman khusus untuk melihat log perubahan (siapa, kapan, apa) |

## 10.3 Key Metrics (Estimasi)

| Metrik | Nilai |
|--------|:-----:|
| Total baris kode (kedua app) | ~7.646 baris |
| Jumlah file | ~12 file |
| Jumlah endpoint API | 7 action |
| Jumlah SAP tables digunakan | 6 (4 standard + 2 custom) |
| Jumlah BAPIs digunakan | 5 |
| Jumlah plant didukung | 7 |
| Jumlah kategori PR | 4 |
| Cakupan user | Seluruh user SAP KMI |

---

*Dokumen ini disusun untuk keperluan presentasi proyek pengembangan aplikasi Release Purchase Requisition*

**PT. Kayu Mebel Indonesia** — Procurement & Purchasing Department  
*Juni 2026*
