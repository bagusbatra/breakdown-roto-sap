# Flow Teknis — Release PR/PO PT. Kayu Mebel Indonesia

Dokumen ini menjelaskan alur teknis untuk semua aplikasi BSP di repo ini.

---

## 1. Ringkasan Arsitektur

### 1.1 Dua Model Arsitektur

| Model | Aplikasi | Struktur | Data Loading |
|-------|----------|----------|-------------|
| **2-file SPA** | `ZPR_REL_BSP`, `ZBSP_PRCH_APP` | `index.htm` (UI) + `main.htm` (API) | On-demand via AJAX |
| **Single-file monolitik** | `ZPO_REL_BSP` | 1 file `main.htm` (ABAP+HTML+CSS+JS) | Pre-load di ABAP, embed JSON |

### 1.2 Komunikasi Klien-Server

```
Browser
  │  fetch('main.htm?action=XXX', {GET|POST})
  ▼
main.htm (ABAP, BSP Page with Flow Logic)
  │  SELECT / CALL FUNCTION (BAPI)
  ▼
SAP Tables
```

- **GET**: `GET_SIDEBAR`, `GET_LIST`, `GET_DETAIL`, `GET_HIST_APP`, `GET_HIST_REJ`
- **POST** (form-urlencoded): `PROCESS` (approve/reject)
- Response: JSON (dibangun manual via `CONCATENATE` + macro `escape_json`)

---

## 2. Aplikasi Release PR — Flow Detail

### 2.1 Action Handler (main.htm)

| Action | Fungsi |
|--------|--------|
| `GET_SIDEBAR` | Hitung count pending & history per plant+kategori |
| `GET_LIST` | Ambil data PR pending (header+total) per plant+kategori |
| `GET_DETAIL` | Ambil item-item dari suatu PR |
| `GET_HIST_APP` | History approve dari `ZROTO_APP_HIST` |
| `GET_HIST_REJ` | History reject dari `ZROTO_REJ_HIST` |
| `PROCESS` | Eksekusi approve/reject |

### 2.2 Perbedaan Pendekatan GET_SIDEBAR

**Pendekatan Hardcode (ZBSP_PRCH_APP original):**
```abap
count_pending 'ROTO' '1200' lv_s_1200_roto.
count_pending 'PRK9' '1200' lv_s_1200_PRK9.
" ...manual untuk setiap plant+kategori...
```

**Pendekatan Dinamis (ZPR_REL_BSP — CATEGORY_DEF):**
```abap
lt_cat_def = VALUE #(
  ( werks = '1200' category = 'MTN' bsart = 'ROTO' )
  ( werks = '1200' category = 'RND' bsart = 'RSBR,PRK9' )
  ...
).
LOOP AT lt_cat_def INTO ls_cat_def.
  SELECT COUNT(*) ... WHERE werks = ls_cat_def-werks AND ...
ENDLOOP.
```

### 2.3 Perbedaan Model Kategori

| Aspek | ZBSP_PRCH_APP | ZPR_REL_BSP |
|-------|---------------|-------------|
| Paradigma | Technical (doc type = key) | Functional (business process = key) |
| Struktur | `PR_CATEGORIES` flat + `PLANT_CATEGORIES` | `CATEGORY_DEF` per-plant array |
| Contoh | `'ROTO':{label:'Maintenance'}` | `{code:'MTN', bsart:'ROTO'}` |
| Plant grouping | Backend merge (1200+2000) | Frontend passthrough (`'1200,2000'`) |

### 2.4 Bug Fixes yang Sudah Diterapkan

| Bug | Fix | File |
|-----|-----|------|
| History approve catat SEMUA item | Loop `lt_items_ok` saja | main.htm |
| XSS di renderHistTable | Data via variabel global `histData`/`histType` | index.htm |
| Reject tidak transaksional | BAPI delete dulu, baru history + COMMIT | main.htm |
| Closed PR (`statu='B'`) muncul | Tambah `statu NE 'B'` | main.htm |
| PR tanpa item open | Validasi item-level SELECT SINGLE | main.htm |

### 2.5 UI Changes (ZPR_REL_BSP — Hasil Pengembangan)

| Area | Perubahan |
|------|-----------|
| CSS variables | 11 → 32 (design tokens) |
| Google Font | DM Sans → Inter |
| Badge pending | "Pending" → "In Release" |
| Expand/collapse | 2 tombol → 1 tombol toggle |
| Toast animation | Tanpa fade → fade-out (opacity + translateX) |
| Welcome modal | Tidak ada → muncul setiap refresh |
| Skeleton loading | Tidak ada → shimmer animation |
| ResizeObserver | Tidak ada → sticky toolbar dinamis |
| Empty state padding | 40px → 50px |
| MRP filter colors | Hardcode hex → CSS variables |
| Card detail table | Inline styles → class `.detail-tbl` |
| History search params | 3 params (val, data, type) → 1 param (val) |

### 2.6 Remaining Visual Differences (Belum Diselaraskan)

1. Google Font: DM+Sans vs Inter
2. Welcome btn text: "Mulai" vs "Mulai Bekerja"
3. byColor: `--success`/`--danger` vs `--success-d`/`--danger-d`
4. Font-weight approver name: 600 vs 700
5. `white-space:normal` di description/reason cell
6. Sidebar img inline styles
7. Sidebar gap: 6px vs 7px
8. Page title update di switchView

---

## 3. Aplikasi Release PO — ZPO_REL_BSP

### 3.1 Arsitektur Single-File

Berbeda dengan aplikasi PR, `ZPO_REL_BSP` adalah **single-file BSP**:
- ABAP preamble: pre-load data via `Z_FM_YMMR068` untuk 2 plant
- Data diserialisasi ke JSON dan di-embed ke JavaScript sebagai `ALL_DATA1` (header) & `ALL_DATA2` (item)
- Action API di-handle di awal file, lalu `response_complete()` + `EXIT`
- HTML + CSS + JS sisanya untuk render UI

### 3.2 Action Handler

| Action | Fungsi |
|--------|--------|
| `GET_HISTORY_REL` | Riwayat release dari `CDHDR`+`CDPOS` (tcode ME28/ME29N) |
| `GET_HISTORY_REJ` | Riwayat reject dari `CDHDR`+`CDPOS` (PROCSTAT='08') + `READ_TEXT` |
| `GET_HISTORY_COUNT` | Badge count sidebar |
| `GET_HISTORY_ITEMS` | Item detail PO riwayat (lazy load) |
| `GET_OGR` | Outstanding Goods Receipt |
| `BULK_REL` | Release massal via `Z_PO_RELEASE2` |
| `BULK_REJ` | Reject massal via `Z_PO_COMMENT_UPDATE` + `Z_PO_REJECT` |

### 3.3 Data Source

- **Function Module**: `Z_FM_YMMR068` — mengambil data PO header & item per plant
- **History**: SAP Change Documents (`CDHDR`/`CDPOS`), bukan custom Z tables
- **Release**: `Z_PO_RELEASE2` (dengan release code dari field `frgco`)
- **Reject**: `Z_PO_COMMENT_UPDATE` (simpan reason) + `Z_PO_REJECT`
- **Text**: `READ_TEXT` untuk baca komentar reject (object `EKKO`, ID `F01`)

### 3.4 Frontend Functions

| Kelompok | Fungsi |
|----------|--------|
| Sidebar | `renderSidebar()`, `switchView()`, `switchHistory()`, `switchOGR()` |
| List | `renderCards()`, `renderCardListOnly()`, `getFilteredData()` |
| History | `loadHistory()`, `renderHistoryPage()`, `renderHistItemTable()` |
| OGR | `loadOGR()`, `renderOGRPage()`, `ogrRenderCards()` |
| Action | `submitAction()` — bulk release/reject via XHR |
| Utility | `parseAbapNum()`, `formatAmount()`, `formatDate()`, `formatTime()` |

### 3.5 Fitur Unik (tidak ada di PR apps)

- Outstanding GR monitoring
- Date range filter di history
- Server-side pagination (offset/limit)
- Popstate/URL restore
- Kategori sebagai grup BSART (`POTYPE_MAP`)
- Alasan reject wajib via SAP text (bukan tabel Z)

---

## 4. Flow Approve (PROCESS)

### 4.1 PR Approve (BAPI_REQUISITION_RELEASE)

```
1. LOOP setiap item PR
   └─ BAPI_REQUISITION_RELEASE(rel_code='P2', use_exceptions='X', no_commit_work='X')
      ├─ sukses → lv_ap_ok++
      └─ gagal  → ambil pesan error
2. IF lv_ap_ok > 0
   ├─ BAPI_TRANSACTION_COMMIT WAIT='X'
   ├─ LOOP lt_items_ok → MODIFY zroto_app_hist
   └─ COMMIT WORK AND WAIT
   ELSE → BAPI_TRANSACTION_ROLLBACK
```

### 4.2 PR Reject (BAPI_REQUISITION_DELETE)

```
1. BAPI_REQUISITION_DELETE (delete_ind='L')
2. IF tidak ada return type 'E'
   ├─ LOOP item → MODIFY zroto_rej_hist (dengan reason)
   └─ COMMIT WORK AND WAIT
   ELSE
   ├─ DELETE FROM zroto_rej_hist WHERE banfn=...
   └─ COMMIT WORK AND WAIT (rollback history)
```

### 4.3 PO Bulk Release (Z_PO_RELEASE2)

```
1. LOOP setiap PO terpilih (max 500)
   └─ Z_PO_RELEASE2(purchaseorder, po_rel_code)
      ├─ sukses → lanjut
      └─ error (type 'E'/'A') → break + return error
2. Jika semua sukses → BAPI_TRANSACTION_COMMIT
```

### 4.4 PO Bulk Reject (Z_PO_REJECT)

```
1. LOOP setiap PO terpilih
   ├─ Z_PO_COMMENT_UPDATE(purchaseorder, comment_text, text_id='F01')
   └─ Z_PO_REJECT(purchaseorder)
      └─ error → break + return error
```

---

## 5. State Management (Frontend)

### 5.1 ZPR_REL_BSP / ZBSP_PRCH_APP

| Variabel | Tipe | Fungsi |
|----------|------|--------|
| `curPlant` | string | Plant aktif |
| `curMode` | string | Mode: pending/hist_app/hist_rej |
| `curBsart` | string | Kategori PR aktif |
| `isApprover` | boolean | User adalah approver |
| `allData` | array | Data PR dari GET_LIST |
| `selBanfns` | object | PR yang dicentang |
| `filteredData` | array | Data setelah filter search |
| `histData`/`histType` | array/string | Data history (fix XSS) |
| `pageSize`/`curPage` | number | Pagination |
| `searchKw` | string | Keyword pencarian |

### 5.2 ZPO_REL_BSP

Data pre-loaded: `ALL_DATA1` (header), `ALL_DATA2` (item), `POTYPE_MAP`, `BSART_POTYPE_MAP`.

---

## 6. Teknis Umum

### 6.1 BSP Objects

| Objek | Fungsi |
|-------|--------|
| `request->get_form_field('name')` | Baca parameter |
| `response->set_header_field(...)` | Set response header |
| `response->append_cdata(lv_output)` | Tulis response body |
| `_m_navigation->next_page('...')` | Redirect |
| `_m_navigation->response_complete()` | Tandai response selesai |

### 6.2 ABAP Macros (main.htm)

- `escape_json`: escape `\`, `"`, `/`, newline/CR/tab untuk JSON
- `fmt_date`: konversi `YYYYMMDD` → `DD.MM.YYYY`
- `count_pending`: hitung PR pending per plant+kategori (hanya di ZBSP_PRCH_APP)
- `check_werks_allowed`: validasi akses user ke plant (hanya di ZBSP_PRCH_APP)
- `parse_bsart_range`: parse comma-separated BSART ke RANGE table

### 6.3 Format Data

- **Tanggal**: `YYYYMMDD` → `DD.MM.YYYY` (via `fmt_date` macro)
- **Jam**: `HHMMSS` → `HH:MM:SS` (via JS `formatTime`)
- **Angka**: SAP format (`,` desimal, `.` ribuan) → JS `parseNum`
- **Currency**: Zero-decimal (IDR, JPY, KRW, VND) → `Math.round(n*100)`, lainnya → 2 desimal

### 6.4 Keamanan

- **Approver**: Hardcode `KMI-BOD` (PR apps) vs tanpa check (PO app)
- **Plant restriction**: Backend `check_werks_allowed` (ZBSP_PRCH_APP) vs frontend-only (ZPR_REL_BSP)
- **CSRF**: Tidak ada token CSRF di POST request
- **XSS**: Sudah di-fix — data via variabel global, bukan embed di atribut HTML
- **Logout**: `/sap/public/bc/icf/logoff` dengan basic auth logout
