# Development Plan — PR Multi Kategori (ZPR_REL_BSP_up)

## 1. Tujuan

Mengembangkan aplikasi BSP yang bisa handle **2 kategori PR** (ROTO dan
Jasa/RSB7) dalam satu aplikasi. Folder `ZPR_REL_BSP_up` adalah tempat
pengembangan, di-copy manual ke SE80 saat deploy.

## 2. Pendekatan

**Navigasi sidebar:** Setiap plant punya 4 menu:
- PR One Time Off (ROTO)
- PR Jasa (RSB7)
- History Approve (gabung ROTO + Jasa, dengan label kolom kategori)
- History Reject (gabung ROTO + Jasa, dengan label kolom kategori)

Kategori yang dipilih (`bsart`) dikirim sebagai parameter di tiap fetch call
ke `main.htm`, bukan via query string URL.

## 3. Runtime Environment

| Komponen | Keterangan |
|----------|-----------|
| Platform | SAP NetWeaver AS ABAP (BSP/ICF Service) |
| Frontend | HTML + CSS + JS (vanilla, `index.htm`) |
| Backend | ABAP scriptlet (`main.htm`) |
| Komunikasi | `fetch()` → `main.htm?action=...&bsart=...` |
| BAPI | `BAPI_REQUISITION_RELEASE`, `BAPI_REQUISITION_DELETE` |
| Tabel history | **Unified** `ZPR_APP_HIST`, `ZPR_REJ_HIST` (+ kolom `bsart`) |
| Deploy | Copy manual file ke SE80 (BSP aplikasi) |

## 4. Arsitektur

```
Browser (index.htm)
  │ Klik "PR Jasa" → curBsart = 'RSB7'
  │ fetch('main.htm?action=GET_LIST&werks=1200&bsart=RSB7')
  ▼
main.htm (ABAP)
  │ SELECT EBAN WHERE bsart = lv_bsart AND ...
  │ CALL BAPI_REQUISITION_RELEASE / DELETE
  │ MODIFY ZPR_APP_HIST / ZPR_REJ_HIST (isi bsart)
  ▼
SAP Tables: EBAN, MAKT, USR21, ADRP,
           ZPR_APP_HIST, ZPR_REJ_HIST
```

## 5. Navigasi Sidebar (Baru)

```
SURABAYA (1200)
  ├── PR One Time Off      ← curBsart='ROTO',  mode='pending'
  ├── PR Jasa              ← curBsart='RSB7',  mode='pending'
  ├── History Approve      ← curBsart='',      mode='hist_app' (semua)
  └── History Reject       ← curBsart='',      mode='hist_rej' (semua)

SEMARANG (1300)
  ├── PR One Time Off
  ├── PR Jasa
  ├── History Approve
  └── History Reject
```

Setiap plant punya badge jumlah pending per kategori.

## 6. Perubahan dari ROTO ke Multi Kategori

| Item | Sebelum (ROTO only) | Sesudah (Multi) |
|------|---------------------|-----------------|
| BSART | Hardcode `'ROTO'` | Parameter `lv_bsart` dari frontend |
| Tabel history | `ZROTO_APP_HIST`, `ZROTO_REJ_HIST` | `ZPR_APP_HIST`, `ZPR_REJ_HIST` + kolom `bsart` |
| Sidebar per plant | 3 menu (PR, Hist App, Hist Rej) | 4 menu (+ PR Jasa) |
| History | Hanya ROTO | ROTO + Jasa, ditandai kolom `bsart` |
| Release code | `P2` | `P2` (sama) |
| Approver | `KMI-BOD` | `KMI-BOD` (sama) |
| Plant | `1200`, `1300` | `1200`, `1300` (sama) |
| Filter ESTKZ | MRP/Non-MRP | MRP/Non-MRP (sama) |

## 7. Tabel Unified — Siap SE11

### ZPR_APP_HIST

| Kolom | Key | Data Element | Domain | Panjang |
|-------|:---:|-------------|--------|:-------:|
| MANDT | PK | MANDT | MANDT | 3 |
| BANFN | PK | BANFN | BANFN | 10 |
| BNFPO | PK | BNFPO | BNFPO | 5 |
| BSART | | BSART | BSART | 4 |
| WERKS | | WERKS_D | WERKS | 4 |
| TXZ01 | | TXZ01 | TXZ01 | 40 |
| ERNAM | | ERNAM | USNAM | 12 |
| ERDAT | | ERDAT | DATUM | 8 |
| MENGE | | MENGE_D | MENGE | 13(3) |
| MEINS | | MEINS | MEINS | 3 |
| PREIS | | PREIS | PREIS | 11(2) |
| PEINH | | PEINH | PEINH | 5 |
| WAERS | | WAERS | WAERS | 3 |
| EKGRP | | EKGRP | EKGRP | 3 |
| APP_BY | | AD_NAME | AD_NAMR | 12 |
| APP_AT | | DATUM | DATUM | 8 |
| APP_TM | | UZEIT | UZEIT | 6 |

### ZPR_REJ_HIST

Sama seperti ZPR_APP_HIST + kolom berikut:

| Kolom | Key | Data Element | Domain | Panjang |
|-------|:---:|-------------|--------|:-------:|
| DEL_BY | | AD_NAME | AD_NAMR | 12 |
| DEL_AT | | DATUM | DATUM | 8 |
| DEL_TM | | UZEIT | UZEIT | 6 |
| REASON | | STRING | | 256+ |

> *Kolom `bsart` menggunakan data element `BSART` (sama dengan EBAN-BSART).
> Key: `MANDT` + `BANFN` + `BNFPO` (sama seperti tabel ZROTO_*).

### SQL Migrasi (copy data existing)

```sql
* Copy approve history
INSERT zpr_app_hist FROM (SELECT
    banfn, bnfpo, 'ROTO' AS bsart, werks, txz01, ernam, erdat,
    menge, meins, preis, peinh, waers, ekgrp,
    app_by, app_at, app_tm
  FROM zroto_app_hist).

* Copy reject history
INSERT zpr_rej_hist FROM (SELECT
    banfn, bnfpo, 'ROTO' AS bsart, werks, txz01, ernam, erdat,
    menge, meins, preis, peinh, waers, ekgrp,
    del_by, del_at, del_tm, reason
  FROM zroto_rej_hist).
```

## 8. Titik Perubahan di Kode

### 8.1 `main.htm` — Backend ABAP

| Perubahan | Detail |
|-----------|--------|
| Default `lv_bsart` | `IF lv_bsart IS INITIAL. lv_bsart = 'ROTO'. ENDIF.` |
| TYPES ty_hist_app | Tambah field `bsart TYPE bsart` |
| TYPES ty_hist_rej | Tambah field `bsart TYPE bsart` |
| GET_SIDEBAR | SELECT EBAN: `WHERE bsart = lv_bsart AND ...` (2x SELECT untuk tiap plant, untuk tiap kategori) |
| GET_SIDEBAR | SELECT `zpr_app_hist` tanpa filter bsart (jumlah semua) |
| GET_SIDEBAR | SELECT `zpr_rej_hist` tanpa filter bsart (jumlah semua) |
| GET_LIST | `WHERE bsart = lv_bsart AND ...` |
| GET_HIST_APP | SELECT dari `zpr_app_hist` (tanpa filter bsart, tampil semua) |
| GET_HIST_REJ | SELECT dari `zpr_rej_hist` (tanpa filter bsart, tampil semua) |
| PROCESS approve | `MODIFY zpr_app_hist` dengan `bsart = lv_bsart` |
| PROCESS reject | `MODIFY zpr_rej_hist` dengan `bsart = lv_bsart` |

### 8.2 `index.htm` — Frontend

| Perubahan | Detail |
|-----------|--------|
| Variabel global | Tambah `curBsart` (default `'ROTO'`) |
| `PR_CATEGORIES` | `{ ROTO: { label: 'PR One Time Off', ... }, RSB7: { label: 'PR Jasa', ... } }` |
| `renderSidebar` | Setiap plant: 4 link (PR One Time Off, PR Jasa, Hist App, Hist Rej) |
| `switchView` | Terima parameter `bsart`, simpan ke `curBsart` |
| `fetchList` | Kirim `bsart` param |
| `fetchHistApp/Rej` | Kirim `bsart` kosong (ambil semua kategori) |
| `renderList` | Label dinamis dari `PR_CATEGORIES[curBsart].label` |
| `renderHistTable` | Tambah kolom "Kategori" (nilai `bsart`) |
| `processAction` | Kirim `bsart` |
| Title | Dinamis: "Release PR ..." |

## 9. Task Checklist

### ✅ Sudah Dikonfirmasi
- [x] **BSART ROTO** = `ROTO`, **BSART Jasa** = `RSB7`
- [x] **Release code** = `P2` (sama)
- [x] **Approver** = `KMI-BOD`, **Plant** = `1200`/`1300`
- [x] **Filter ESTKZ** = MRP/Non-MRP (sama)
- [x] **History** = unified (`ZPR_APP_HIST` / `ZPR_REJ_HIST`)
- [x] **Sidebar** = setiap plant punya 4 menu (PR ROTO, PR Jasa, Hist App, Hist Rej)
- [x] **Deploy** = copy manual ke SE80

### ⏳ Persiapan di SAP
- [ ] Buat tabel `ZPR_APP_HIST` di SE11 (gambar struktur di atas)
- [ ] Buat tabel `ZPR_REJ_HIST` di SE11
- [ ] Aktivasi tabel + generate maintenance dialog (opsional)
- [ ] Migrasi data dari `ZROTO_*_HIST` → `ZPR_*_HIST`

### 🚧 Coding — `main.htm`
- [ ] Update TYPES (`ty_hist_app`, `ty_hist_rej`) — tambah field `bsart`
- [ ] Default `lv_bsart = 'ROTO'` jika kosong
- [ ] **GET_SIDEBAR**: loop 2 kategori (ROTO, RSB7) + 2 plant → akumulasi pending count
- [ ] **GET_SIDEBAR**: ganti `zroto_app_hist` → `zpr_app_hist` (tanpa filter bsart)
- [ ] **GET_SIDEBAR**: ganti `zroto_rej_hist` → `zpr_rej_hist` (tanpa filter bsart)
- [ ] **GET_LIST**: `WHERE bsart = lv_bsart`
- [ ] **GET_HIST_APP**: SELECT dari `zpr_app_hist` (tanpa filter bsart)
- [ ] **GET_HIST_REJ**: SELECT dari `zpr_rej_hist` (tanpa filter bsart)
- [ ] **PROCESS approve**: `MODIFY zpr_app_hist` + isi `bsart = lv_bsart`
- [ ] **PROCESS reject**: `MODIFY zpr_rej_hist` + isi `bsart = lv_bsart`

### 🚧 Coding — `index.htm`
- [ ] Tambah konstanta `PR_CATEGORIES`
- [ ] Tambah variabel global `curBsart`
- [ ] Update `renderSidebar` → 4 menu per plant + badge pending per kategori
- [ ] Update `switchView` → terima & simpan `bsart`
- [ ] Update `fetchList` → kirim `bsart`
- [ ] Update `fetchHistApp` / `fetchHistRej` → kirim `bsart` (kosong = semua)
- [ ] Update `renderList` → label dinamis sesuai `PR_CATEGORIES`
- [ ] Update `renderHistTable` → tambah kolom "Kategori"
- [ ] Update `processAction` → kirim `bsart`
- [ ] Update title aplikasi dinamis

### 🧪 Testing
- [ ] Sidebar: badge pending ROTO vs RSB7 terpisah
- [ ] Klik PR One Time Off → tampil PR ROTO saja
- [ ] Klik PR Jasa → tampil PR RSB7 saja
- [ ] Approve PR ROTO → masuk `ZPR_APP_HIST` dgn `bsart='ROTO'`
- [ ] Approve PR Jasa → masuk `ZPR_APP_HIST` dgn `bsart='RSB7'`
- [ ] Reject PR ROTO → masuk `ZPR_REJ_HIST` dgn `bsart='ROTO'`
- [ ] Reject PR Jasa → masuk `ZPR_REJ_HIST` dgn `bsart='RSB7'`
- [ ] History Approve: tampil data ROTO + Jasa, kolom kategori terbaca
- [ ] History Reject: tampil data ROTO + Jasa, kolom kategori terbaca
- [ ] Search/filter history masih berfungsi
- [ ] Non-approver: checkbox & FAB tidak muncul

## 10. Catatan Penting

- **Jangan ubah `ZPR_REL_BSP`** — itu baseline original.
- Backup tabel `ZROTO_*_HIST` sebelum migrasi.
- Tabel `ZROTO_*_HIST` bisa di-retire nanti.
- Parameter `lv_bsart` sudah ada di `main.htm` line 20 — tinggal dipakai.
- Untuk multi-level release strategy, lihat `notes/investigation.md` §6.2.
