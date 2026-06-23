# Session Notes — 22 Jun 2026

## Scope
Perbaikan pada `ZPR_REL_BSP/Page with FLow Logic/index-merge.htm`:
1. Fix error `byColor is not defined`
2. Welcome modal muncul setiap refresh (bukan sekali per hari)
3. Selaraskan style/fungsi/expand/size dengan `ZPR_REL_BSP_jasa_copy/Page with FLow Logic/index.htm`

---

## 1. Bug Fix: `byColor is not defined`

### Root Cause
`buildHistTable()` (line 2037) menggunakan variabel `byColor` (line 2111, 2121) tetapi tidak pernah mendeklarasikannya.
Di versi original `index.htm`, deklarasi `var byColor=...` ada, tetapi di versi merge (jasa_copy) variabel ini dihapus/dikomentari.

### Fix
Ditambahkan deklarasi di line 2039:
```js
var byColor=isApp?'color:var(--success);':'color:var(--danger);';
```

### Scope
- Variabel `byColor` digunakan di 2 tempat:
- Line 2111: cell "Diapprove Oleh"
- Line 2121: cell "Direject Oleh"

---

## 2. Welcome Modal — Setiap Refresh

### Perubahan
| Sebelum | Sesudah |
|---------|---------|
| `localStorage` key `zpr_rel_welcome_last_shown`, tampil 1x/hari | `performance.getEntriesByType('navigation')[0].type === 'reload'`, tampil setiap F5/Ctrl+R |
| Fungsi `todayKey()`, variabel `WELCOME_LS_KEY` dihapus | Deteksi reload via Navigation Timing API |
| Tidak ada handler Escape | Ditambahkan `document.addEventListener('keydown')` tutup welcome modal via Escape |

### File
- `maybeShowWelcome()` — line 1321 (logika trigger diubah total)
- HTML comment line 1078: `sekali per hari` → `setiap refresh`
- JS comment line 1316-1318: diperbarui
- Escape handler — line 1489-1491

---

## 3. UI/UX Alignment dengan `jasa_copy/index.htm`

### 3.1 CSS
| Perubahan | Line | Sebelum | Sesudah |
|-----------|------|---------|---------|
| `scroll-behavior` | 129 | `scroll-behavior:smooth;` | Dihapus |

### 3.2 showLoading()
| Aspek | Line | Sebelum | Sesudah |
|-------|------|---------|---------|
| Padding | 1263 | `padding:60px` | `padding:70px` |
| Spinner margin | 1266 | `margin:0 auto 12px` | `margin:0 auto 14px` |
| Teks | 1267 | `Loading...` | `Memuat data...` |

### 3.3 showToast()
| Aspek | Line | Sebelum | Sesudah |
|-------|------|---------|---------|
| Durasi | 1478 | 4500ms | 4200ms |
| Animasi | 1475-1476 | `el.remove()` langsung | transisi opacity/transform 250ms, remove 260ms kemudian |
| Style | 1474-1475 | — | `transition`, `opacity:0`, `transform:translateX(18px)` |

### 3.4 onEstkzFilter()
| Aspek | Line | Sebelum | Sesudah |
|-------|------|---------|---------|
| Reset search | 1734-1736 | Tidak ada | `searchKw=''` + `inp.value=''` |

### 3.5 renderList() — Card Structure
| Perubahan | Line | Sebelum | Sesudah |
|-----------|------|---------|---------|
| Click handler | 1888 | Chevron `onclick="toggleExpand(...)"` | `.po-card` langsung `onclick="toggleExpand(...)"` |
| Chevron element | 1910-1912 | `<span class="card-chevron" onclick=...>` | Dihapus |
| Card amount | 1914-1918 | `'>`+amt | `'><div class="card-amount-val">`+amt+`</div>` |
| Badge text | 1902-1903 | `&#9679; Pending` | `In Release` |
| Animation delay | 1882 | `(idx*0.04).toFixed(2)` seconds | `Math.min(idx,8)*28` ms |
| Empty state padding | 1865 | `padding:40px 20px` | `padding:50px 20px` |
| MRP filter color | 1794-1798 | `#1d4ed8` / `#b45309` | `var(--info)` / `var(--warning)` |
| MRP filter weight | 1795, 1798 | `font-weight:600` | `font-weight:700` |
| Card detail | 1946-1949 | `<div class="card-detail" id="det_...">` | `<div class="card-detail" id="det_..." onclick="event.stopPropagation()"><div class="card-detail-inner">` |
| Closing tags | 1959 | `</div></div>` | `</div></div></div>` (tambah `.card-detail-inner`) |

### 3.6 loadDetail() — Detail Table
| Perubahan | Line | Sebelum | Sesudah |
|-----------|------|---------|---------|
| Wrapper | 2309 | `<div style="overflow-x:auto;">` | `<div class="card-detail-scroll">` |
| Table class | 2310 | `<table>` | `<table class="detail-tbl">` |
| UoM cell | 2337 | `<span style="background:#f1f5f9;padding:2px 6px;border-radius:4px;font-size:11px;">` | `<span class="chip">` |
| Currency cell | 2344 | `<span style="padding:2px 6px;border-radius:4px;font-size:11px;font-weight:600;`+cs+`">` | `<span class="chip `+cc+`">` |
| Currency helper | 2323 | `var cs=...` manual ternary | `var cc=curClass(w)` |
| Primary color | 2327, 2344 | `var(--primary)` | `var(--primary-d)` |

### 3.7 buildHistTable() — History Table
| Perubahan | Line | Sebelum | Sesudah |
|-----------|------|---------|---------|
| UoM cell | 2097 | `class="uom-badge"` | `class="chip"` |
| Currency cell | 2103-2105 | `<span class="badge-currency `+curClass(w)+`">` | `<span class="chip `+curClass(w)+`">` |
| PGrp cell | 2106-2108 | `<span style="background:#f1f5f9;padding:2px 6px;border-radius:4px;font-size:11px;">` | `<span class="chip">` |
| Empty padding | 2043 | `padding:40px 20px` | `padding:50px 20px` |

### 3.8 renderHistTable()
| Perubahan | Line | Sebelum | Sesudah |
|-----------|------|---------|---------|
| Global data | 1992-1993 | — | `histData=data; histType=type;` |
| Color | 1999-2000 | `var(--success)` / `var(--danger)` | `var(--success-d)` / `var(--danger-d)` |
| catDef/catLbl | 1998-1999 | Dideklarasikan | Dihapus |
| Title suffix | 2007-2008 | `title+...+' &middot; '+catLbl` | `title+PLANT_LABELS[curPlant]` saja |
| Search margin | 2015 | `margin-bottom:14px` | `margin-bottom:16px` |
| onHistSearch call | 2021-2022 | `onHistSearch(this.value,`+JSON.stringify(data)+`,"`+type+`")` | `onHistSearch(this.value)` |
| observeToolbarOffset | — | Tidak ada | Tidak ditambahkan (beda dgn jasa_copy) |

### 3.9 onHistSearch()
| Perubahan | Line | Sebelum | Sesudah |
|-----------|------|---------|---------|
| Signature | 2142 | `function onHistSearch(val,allHistData,type)` | `function onHistSearch(val)` |
| Filter source | 2147 | `allHistData.filter(...)` | `histData.filter(...)` |
| buildHistTable call | 2162-2163 | `buildHistTable(filtered,type)` | `buildHistTable(filtered,histType)` |

### 3.10 New Globals
| Variabel | Line | Tipe | Default |
|----------|------|------|---------|
| `histData` | 1126 | Array/null | `null` |
| `histType` | 1127 | String | `''` |

### 3.11 Escape Key Handler
Ditambahkan di line 1489-1491 (setelah `closeModal()`):
```js
document.addEventListener('keydown',function(e){
  if (e.key==='Escape') closeWelcomeModal();
});
```

---

## 4. Remaining Differences (Belum Diselaraskan)

### 4.1 Visual — Mudah Diselaraskan
| No | Perbedaan | Line (merge) | Nilai Sekarang | Target (jasa_copy) |
|----|-----------|-------------|----------------|-------------------|
| 1 | Google Font | 29 | `DM+Sans` | `Inter` |
| 2 | Welcome btn text | 1092 | `Mulai` | `Mulai Bekerja` |
| 3 | `byColor` di `buildHistTable` | 2039 | `--success` / `--danger` | `--success-d` / `--danger-d` |
| 4 | Font-weight approver name | 2110, 2120 (di `buildHistTable`) | `font-weight:600` | `font-weight:700` |
| 5 | `white-space:normal` di description cell | 2088-2090 (di `buildHistTable`) | Tidak ada | Perlu ditambah |
| 6 | `white-space:normal` di reason cell | 2131-2133 (di `buildHistTable`) | Tidak ada | Perlu ditambah |
| 7 | Sidebar img inline styles | 1567-1569 | `width:18px;height:18px;object-fit:cover;border-radius:3px;` | Tidak ada (dihapus) |
| 8 | Sidebar gap | 1573 | `gap:6px` | `gap:7px` |
| 9 | Page title update di `switchView` | 1646-1663 | Tidak update `document.title` | Perlu ditambah |

### 4.2 Data Model / Arsitektural (Tidak Perlu Diselaraskan)
| No | Perbedaan | Alasan |
|----|-----------|--------|
| 1 | Kolom Kategori di history table + `getBsartLabel()` | merge menggunakan `CATEGORY_DEF` (abstrak), jasa_copy pakai `PR_CATEGORIES` (bsart langsung) |
| 2 | History API kirim `&bsart=` | merge filter per kategori, jasa_copy tampilkan semua |
| 3 | Sidebar history counts per-category vs per-plant | Berbeda struktur data sidebar |
| 4 | User menu inline style vs class toggle | merge pakai `style.display`, jasa_copy pakai `classList.toggle` |
| 5 | Approve/reject workflow | merge punya FAB + modals + selection + processAction; jasa_copy read-only |
| 6 | Dynamic SAP user vs static | merge pakai ABAP server-side tags, jasa_copy hardcoded |
| 7 | Logout path | Beda BSP app (expected) |

### 4.3 UX — Perubahan yang Disengaja (Tidak Perlu Diselaraskan)
| No | Perbedaan | Alasan |
|----|-----------|--------|
| 1 | Welcome modal muncul setiap refresh (bukan 1x/hari) | Permintaan user |
| 2 | Welcome summary hitung semua kategori (bukan hanya ROTO+PRK9) | Lebih akurat |
| 3 | Pagination reset `selBanfns` + scroll to top | Selection hanya di merge |
| 4 | `showEmpty` hide FAB | FAB hanya di merge |

---

## 5. File Structure

### index-merge.htm — 2629 lines

| Bagian | Line Range | Deskripsi |
|--------|-----------|-----------|
| ABAP preamble | 1-21 | Server-side user info |
| HTML head | 22-50 | Meta, fonts, title |
| CSS | 31-907 | Single `<style>` block, §1-§19 |
| HTML body | 908-1104 | Header, sidebar, main, FAB, modals, overlay |
| First `<script>` | 1105-2439 | JavaScript: state, helpers, sidebar, render, history, pagination, expand, detail, select |
| Second `<script>` | 2440-2629 | JavaScript: modals, approve/reject, processAction, init() |
| Closing HTML | ~2629 | `</body></html>` |

### Duplicate Code
File memiliki **duplicate function definitions** karena hasil merge. Fungsi di **first set** (line ~1105-1525) dioverride oleh **second set** (line ~1527-1978) via JavaScript hoisting. Fungsi yang **hanya ada di second set** (unik):
- `renderHistTable()` (1991)
- `buildHistTable()` (2037)
- `onHistSearch()` (2142)
- `renderPagination()` (2170)
- `goPage()` (2225)
- `changePageSize()` (2235)
- `onSearchInput()` (2242)
- `toggleExpand()` (2253)
- `expandAll()` (2262)
- `collapseAll()` (2277)
- `loadDetail()` (2288)
- `toggleSelect()` (2367)
- `toggleSelectAll()` (2378)
- `syncCheckboxes()` (2418)
- `updateFabInfo()` (2429)
- `showModalApprove()` (2444)
- `showModalReject()` (2463)
- `confirmApprove()` (2483)
- `confirmReject()` (2493)
- `processAction()` (2505)

---

## 6. Key Reference Files

| File | Path |
|------|------|
| Main file (merge) | `D:\DEV\Breakdown ROTO SAP\ZPR_REL_BSP\Page with FLow Logic\index-merge.htm` |
| Original read-only | `D:\DEV\Breakdown ROTO SAP\ZPR_REL_BSP\Page with FLow Logic\index.htm` |
| Copy reference | `D:\DEV\Breakdown ROTO SAP\ZPR_REL_BSP_jasa_copy\Page with FLow Logic\index.htm` |
| Backend page (same both) | `ZPR_REL_BSP\Page with FLow Logic\main.htm` |

---

## 7. Next Steps (Saran)

1. Selaraskan 9 remaining visual differences (section 4.1)
2. Opsional: bersihkan duplicate function definitions (first set line ~1105-1525 bisa dihapus setelah verifikasi)
3. Opsional: tambah kolom Kategori di history table jika dibutuhkan (butuh `getBsartLabel()`)
