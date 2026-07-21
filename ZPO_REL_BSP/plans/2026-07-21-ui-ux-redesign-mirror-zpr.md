# Redesign UI/UX ZPO_REL_BSP (mirror ZPR) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign UI/UX ZPO_REL_BSP agar identik dengan ZPR_REL_BSP (shell modular + JSON API + PWA), user-friendly & load cepat, tanpa mengubah logic sistem apa pun.

**Architecture:** In-place per view. `main.htm` yang sekarang me-*render* HTML + inject `ALL_DATA1/2` diubah bertahap menjadi JSON API (`CASE lv_action`), frontend dipecah ke `index.htm` shell + modul `app-*.js` + `style.css` di MIMEs (mirror ZPR). Blok ABAP lama **disalin apa adanya** ke handler `WHEN`, bukan ditulis ulang.

**Tech Stack:** BSP (ABAP klasik) + HTML/CSS/JS vanilla (tanpa framework), PWA (manifest + service worker). Referensi: `ZPR_REL_BSP`.

## Global Constraints

Setiap task tunduk pada seluruh butir ini (disalin verbatim dari spec `ZPO_REL_BSP/specs/2026-07-21-ui-ux-redesign-mirror-zpr-design.md`):

- **TANPA mengubah logic.** Terkunci, dipindah apa adanya (bukan tulis ulang): FM/BAPI `Z_FM_YMMR068`, `Z_PO_RELEASE2`, `Z_PO_REJECT`, `Z_PO_COMMENT_UPDATE`, `BAPI_TRANSACTION_COMMIT`, `READ_TEXT`; query history `CDHDR`/`CDPOS` (`objectclas=EINKBELEG`, `tabname=EKKO`); semua `WHERE`, aturan plant 1200/1300, aturan bisa/tidaknya release-reject; struktur `ztymmr068`/`ztymmr068po` + seluruh field JSON.
- **Boleh berubah HANYA:** pengemasan/pengiriman data (inject → JSON API), pemecahan frontend ke modul, dan tampilan (CSS/markup).
- **SE80 copy-paste ready:** semua file BSP harus utuh, ABAP klasik **tanpa sintaks 7.40+** (tanpa `VALUE #`, `NEW`, string template `|...|`, inline `DATA(...)`, `@`-escaping), langsung bisa di-paste ke SE80 tanpa error.
- **Verifikasi = golden-JSON diff + side-by-side** (tidak ada test otomatis di BSP). Setiap task yang memindah data wajib membuktikan output baru **identik** dengan yang lama sebelum jalur lama dihapus.
- **Migrasi in-place per view, commit per fase.** App produksi tetap berfungsi di akhir setiap task.
- **Di luar scope:** push notification, dashboard/OGR (tetap feature-flag off).
- **Referensi UI/UX:** ZPR_REL_BSP. Remap terminologi: PR→PO, Approve/Reject→Release/Reject, `banfn`→`ebeln`, `bsart`→`potype`, "X PR dipilih"→"X PO dipilih". Hapus item menu "Aktifkan Notifikasi".

## Catatan verifikasi (dipakai di banyak task)

**Golden-JSON diff** = sebelum mengubah, rekam output lama; sesudah, rekam output baru; bandingkan. Karena serialisasi disalin verbatim, string JSON harus sama byte-per-byte.

Cara rekam praktis (tanpa tool khusus):
1. Buka app lama, di DevTools Console jalankan `copy(JSON.stringify(ALL_DATA1))` dan `copy(JSON.stringify(ALL_DATA2))`, simpan ke file `golden_data1.json` / `golden_data2.json` di scratchpad.
2. Setelah handler baru jadi, panggil endpoint (mis. `fetch('main.htm',{method:'POST',body:new URLSearchParams({action:'GET_LIST',plant:'1200',potype:'ALL'})}).then(r=>r.text()).then(copy)`), simpan `new_getlist.json`.
3. Bandingkan field `data1`/`data2` di `new_getlist.json` dengan golden. Harus identik (urutan, field, format angka/tanggal).

**Side-by-side** = jalankan app lama & baru berdampingan (branch/URL berbeda), cocokkan angka yang terlihat user: jumlah PO per plant & potype, total nilai, urutan kartu, badge history.

---

## File Structure

**Dibuat baru:**
- `ZPO_REL_BSP/Page with FLow Logic/index.htm` — shell page (head, sprite ikon, DOM landmark, script includes).
- `ZPO_REL_BSP/MIMEs/style.css` — CSS (adopsi ZPR + token warna potype).
- `ZPO_REL_BSP/MIMEs/app-core.js` — utilitas, format, fetch helper, boot.
- `ZPO_REL_BSP/MIMEs/app-ui.js` — toast, modal, confirm, loading, skeleton, FAB, sticky, empty state.
- `ZPO_REL_BSP/MIMEs/app-list.js` — sidebar, toolbar, pagination, kartu PO.
- `ZPO_REL_BSP/MIMEs/app-history.js` — history sidebar, filter, tabel item, counts.
- `ZPO_REL_BSP/MIMEs/app-detail.js` — detail PO + item text.
- `ZPO_REL_BSP/MIMEs/app-action.js` — bulk release/reject + logoff.
- `ZPO_REL_BSP/MIMEs/manifest.json`, `ZPO_REL_BSP/MIMEs/sw.js`, `icon-192.png`, `icon-512.png`, `DMSans.woff2`, `DMMono.woff2` — PWA + font (copy dari ZPR).

**Dimodifikasi:**
- `ZPO_REL_BSP/Page with FLow Logic/main.htm` — tambah handler `WHEN 'GET_LIST'` & `WHEN 'GET_DETAIL'` (fase 2/4), blok HTML+inline JS dipensiunkan di fase 6.

**Tidak disentuh (logic):** seluruh `CALL FUNCTION`, blok SELECT `CDHDR/CDPOS`, serialisasi `lv_json1/lv_json2` (dipindah, tidak diedit).

---

## FASE 0 — FONDASI

### Task 1: Bawa aset statis ZPR ke MIMEs ZPO

**Files:**
- Create: `ZPO_REL_BSP/MIMEs/style.css`, `DMSans.woff2`, `DMMono.woff2`, `icon-192.png`, `icon-512.png`
- Reference: `ZPR_REL_BSP/MIMEs/style.css` (sumber salin)

**Interfaces:**
- Produces: kelas CSS ZPR (`.hdr`, `.sidebar`, `.main`, `.actionbar`, `.fab`, `.modal`, `.card`, `.toast`, `.skeleton`, dll) tersedia untuk task frontend berikutnya.

- [ ] **Step 1: Salin aset biner & CSS dari ZPR**

```bash
cd "d:/DEV/Breakdown ROTO SAP"
cp ZPR_REL_BSP/MIMEs/DMSans.woff2      ZPO_REL_BSP/MIMEs/
cp ZPR_REL_BSP/MIMEs/DMMono-Medium.woff2 "ZPO_REL_BSP/MIMEs/DMMono.woff2"
cp ZPR_REL_BSP/MIMEs/icon-192.png      ZPO_REL_BSP/MIMEs/
cp ZPR_REL_BSP/MIMEs/icon-512.png      ZPO_REL_BSP/MIMEs/
cp ZPR_REL_BSP/MIMEs/style.css         ZPO_REL_BSP/MIMEs/
```

- [ ] **Step 2: Sesuaikan token warna potype PO di `style.css`**

Buka `ZPO_REL_BSP/MIMEs/style.css`, cari blok token warna kategori (di ZPR untuk `bsart`). Tambah/ubah variabel warna untuk potype PO yang dipakai ZPO. Ambil daftar potype & warnanya dari fungsi reverse-lookup di `main.htm:2100` (`bsart → potype label & color`). Salin nilai warna itu sebagai CSS custom properties, mis:

```css
/* Token warna potype PO — nilai diambil verbatim dari main.htm:2100 */
:root{
  --po-type-a: #2563eb;  /* ganti sesuai label/warna di main.htm:2100 */
  --po-type-b: #059669;
}
```

- [ ] **Step 3: Verifikasi**

Buka `style.css` di browser lewat path MIMEs BSP; pastikan tidak 404 dan font `@font-face` mengarah ke `DMSans.woff2`/`DMMono.woff2` yang baru disalin. Tidak ada error konsol.

- [ ] **Step 4: Commit**

```bash
git add ZPO_REL_BSP/MIMEs/
git commit -m "feat(zpo): bawa aset statis (css/font/icon) dari ZPR ke MIMEs"
```

---

### Task 2: Buat `index.htm` shell (mirror struktur ZPR)

**Files:**
- Create: `ZPO_REL_BSP/Page with FLow Logic/index.htm`
- Reference: `ZPR_REL_BSP/Page with FLow Logic/index.htm`

**Interfaces:**
- Consumes: `style.css` (Task 1).
- Produces: DOM landmark dengan id tetap — `#sidebar`, `#mainContent`, `#actionBar`, `#fab`, `#fabInfo`, `#lo`, modal `#modalRelease`/`#modalReject`/`#modalItemText`, `<%=lv_ver%>` cache-busting. Semua `app-*.js` di-include (stub kosong dulu).

- [ ] **Step 1: Salin kerangka `index.htm` ZPR sebagai basis**

Salin `ZPR_REL_BSP/Page with FLow Logic/index.htm` ke lokasi ZPO. Pertahankan blok ABAP atas (`BAPI_USER_GET_DETAIL`, `lv_ver`) apa adanya — ini bukan logic bisnis, hanya ambil nama user & versi aset.

- [ ] **Step 2: Remap teks & judul ke domain PO**

Ubah verbatim: `<title>` → "Release Purchase Order - PT. Kayu Mebel Indonesia"; teks bantuan "PR akan di-release via BAPI_REQUISITION_RELEASE" → "PO akan di-release via Z_PO_RELEASE2"; **hapus** elemen menu notifikasi (`#notifMenuItem`, `#notifMenuLabel`) dan `<link rel="manifest">`/push meta bila belum siap (dikembalikan di Task 3). Ganti modal `#modalApprove` → `#modalRelease`, teks "Approve PR" → "Release PO", FAB "0 PR dipilih" → "0 PO dipilih".

- [ ] **Step 3: Sesuaikan daftar `<script src>`**

Sisakan hanya modul dalam scope (buang `app-push.js`, `app-po.js`, `app-dashboard.js`, `app-reveal.js`):

```html
<script src="app-core.js?v=<%=lv_ver%>"></script>
<script src="app-ui.js?v=<%=lv_ver%>"></script>
<script src="app-list.js?v=<%=lv_ver%>"></script>
<script src="app-history.js?v=<%=lv_ver%>"></script>
<script src="app-detail.js?v=<%=lv_ver%>"></script>
<script src="app-action.js?v=<%=lv_ver%>"></script>
```

- [ ] **Step 4: Buat stub kosong tiap `app-*.js`**

Buat 6 file di MIMEs berisi hanya komentar header + `'use strict';` agar `<script>` tidak 404. (Diisi di task berikutnya.)

- [ ] **Step 5: Verifikasi**

Buka `index.htm` via URL BSP. Shell (header, sidebar kosong, main kosong) tampil dengan CSS ZPR, nama user muncul di header, **nol error konsol**. App lama (`main.htm`) masih berfungsi normal — belum diubah.

- [ ] **Step 6: Commit**

```bash
git add "ZPO_REL_BSP/Page with FLow Logic/index.htm" ZPO_REL_BSP/MIMEs/app-*.js
git commit -m "feat(zpo): index.htm shell mirror ZPR + stub modul app-*"
```

---

### Task 3: PWA (manifest + service worker)

**Files:**
- Create: `ZPO_REL_BSP/MIMEs/manifest.json`, `ZPO_REL_BSP/MIMEs/sw.js`
- Modify: `ZPO_REL_BSP/Page with FLow Logic/index.htm` (registrasi sw + link manifest)
- Reference: `ZPR_REL_BSP/MIMEs/manifest.json`, `ZPR_REL_BSP/MIMEs/sw.js`

**Interfaces:**
- Consumes: icon dari Task 1.
- Produces: app installable + offline shell; cache di-*bust* lewat `lv_ver`.

- [ ] **Step 1: Salin & sesuaikan `manifest.json`**

Salin dari ZPR; ubah `name`/`short_name` → "Release PO" / "Release Purchase Order", `start_url` ke path BSP ZPO, warna tema sesuai ZPO. Icon tetap `icon-192.png`/`icon-512.png`.

- [ ] **Step 2: Salin `sw.js` & sesuaikan daftar precache**

Salin `sw.js` ZPR. Ubah daftar aset yang di-precache jadi milik ZPO: `style.css`, `app-core.js`, `app-ui.js`, `app-list.js`, `app-history.js`, `app-detail.js`, `app-action.js`, font, icon. **Jangan** precache `main.htm` (data dinamis).

- [ ] **Step 3: Kembalikan `<link rel="manifest">` + registrasi SW di `index.htm`**

```html
<link rel="manifest" href="manifest.json" crossorigin="use-credentials">
```
Registrasi (salin pola dari ZPR, biasanya di `app-core.js` boot atau inline). Pastikan URL `sw.js` benar untuk path BSP ZPO.

- [ ] **Step 4: Verifikasi**

DevTools → Application: manifest terbaca, SW `activated`, app bisa "Install". Matikan network → shell tetap termuat (data view menampilkan state offline, bukan crash).

- [ ] **Step 5: Commit**

```bash
git add ZPO_REL_BSP/MIMEs/manifest.json ZPO_REL_BSP/MIMEs/sw.js "ZPO_REL_BSP/Page with FLow Logic/index.htm"
git commit -m "feat(zpo): PWA manifest + service worker offline shell"
```

---

## FASE 1 — PRIMITIVES

### Task 4: `app-core.js` — utilitas, format, fetch helper, boot

**Files:**
- Create/Fill: `ZPO_REL_BSP/MIMEs/app-core.js`
- Reference (sumber salin): `ZPO_REL_BSP/Page with FLow Logic/main.htm:2180-2290` (util & format lama)

**Interfaces:**
- Produces: `todayStr()`, `toInputDate(dats)`, `fromInputDate(val)`, `formatDate(dats)`, `formatTime(tims)`, `escHtml(s)`, `parseAbapNum(rawStr)`, `formatAmount(rawStr,currency)`, `formatNum(rawStr,currency)`, `formatNumHist(rawStr,currency)`, `svgIcon(name)`, dan `apiPost(action, params)` (fetch helper). Dipakai semua modul lain.

- [ ] **Step 1: Salin fungsi util & format VERBATIM dari `main.htm`**

Pindahkan fungsi di `main.htm:2180-2290` (`todayStr` … `formatNumHist`) ke `app-core.js` **tanpa mengubah isi** — output format angka/tanggal harus identik dengan app lama (ini bagian dari akurasi data).

- [ ] **Step 2: Tambah helper `svgIcon` & `apiPost` (baru)**

```javascript
function svgIcon(name){
  return '<svg class="icon" aria-hidden="true"><use href="#i-'+name+'"></use></svg>';
}
function apiPost(action, params){
  var body = new URLSearchParams();
  body.append('action', action);
  if (params){ for (var k in params){ if (params.hasOwnProperty(k)) body.append(k, params[k]); } }
  return fetch('main.htm', { method:'POST', body:body, credentials:'include' })
    .then(function(r){ return r.json(); });
}
```

- [ ] **Step 3: Verifikasi paritas format**

Di Console app lama & baru, panggil fungsi yang sama dengan input identik, mis. `formatAmount('1234.5','IDR')`, `formatDate('20260721')`. Output **harus sama persis**.

- [ ] **Step 4: Commit**

```bash
git add ZPO_REL_BSP/MIMEs/app-core.js
git commit -m "feat(zpo): app-core.js util/format (verbatim) + svgIcon/apiPost"
```

---

### Task 5: `app-ui.js` — komponen UI primitif

**Files:**
- Create/Fill: `ZPO_REL_BSP/MIMEs/app-ui.js`
- Reference: `main.htm` blok `TOAST` (1793), `LOADING OVERLAY` (1832), `MODAL` (1850), `CONFIRM DIALOG` (1875), `FAB` (1755), `STICKY` (1901), `EMPTY STATE` (1934), `SKELETON` (1946), `A11Y FOCUS` (1939); pola interaksi dari `ZPR_REL_BSP/MIMEs/app-ui.js`.

**Interfaces:**
- Consumes: `escHtml`, `svgIcon` (app-core).
- Produces: `showToast(msg,type)`, `showLoading()`/`hideLoading()`, `openModal(id)`/`closeModal(id)`, `confirmDialog(opts)`, `renderSkeleton(target,rows)`, `showEmpty(target,msg)`, `updateFab(count)`. Dipakai list/history/detail/action.

- [ ] **Step 1: Pindahkan komponen VERBATIM dari `main.htm` ke `app-ui.js`**

Salin fungsi toast/loading/modal/confirm/FAB/sticky/empty/skeleton dari blok di atas. Sesuaikan hanya selector jika id berubah di shell baru (mis. `#lo`, `#fab`, `#fabInfo`) agar cocok dengan `index.htm` Task 2.

- [ ] **Step 2: Selaraskan kelas CSS ke ZPR**

Pastikan markup yang dihasilkan memakai kelas ZPR (`.toast`, `.modal`, `.fab`, `.skeleton`) dari `style.css` Task 1, bukan kelas lama ZPO.

- [ ] **Step 3: Verifikasi**

Di `index.htm`, dari Console panggil `showToast('tes','success')`, `showLoading()`, `openModal('modalRelease')`, `updateFab(3)`. Setiap komponen tampil sesuai gaya ZPR, tanpa error.

- [ ] **Step 4: Commit**

```bash
git add ZPO_REL_BSP/MIMEs/app-ui.js
git commit -m "feat(zpo): app-ui.js komponen UI (toast/modal/fab/skeleton) gaya ZPR"
```

---

## FASE 2 — LIST PO

### Task 6: Backend `WHEN 'GET_LIST'` (bungkus serialisasi lama, tanpa ubah logic)

**Files:**
- Modify: `ZPO_REL_BSP/Page with FLow Logic/main.htm` (tambah handler sebelum blok HTML `%>` di 1336)
- Reference: FM call `main.htm:1050-1060`, serialisasi `main.htm:1230-1335`

**Interfaces:**
- Produces: response JSON `{"status":"S","data1":[...],"data2":[...]}` untuk `action=GET_LIST&plant=<p>&potype=<t>`, di mana `data1`/`data2` = `lv_json1`/`lv_json2` yang **persis sama** dengan `ALL_DATA1`/`ALL_DATA2` lama.

- [ ] **Step 1: Tambah handler GET_LIST yang membungkus blok serialisasi yang ADA**

Sisipkan sebelum baris `%>` (main.htm:1336) sebuah blok `IF lv_action = 'GET_LIST'.` yang: (a) memanggil `Z_FM_YMMR068` untuk plant 1200 & 1300 **memakai blok kode yang sudah ada** (1050-1060, dipindah/di-*share*, tidak diubah), (b) membangun `lv_json1`/`lv_json2` dengan **blok 1230-1335 apa adanya**, lalu:

```abap
IF lv_action = 'GET_LIST'.
  " ... (blok Z_FM_YMMR068 + build lv_json1/lv_json2 yang SUDAH ADA,
  "      dipindah ke sini tanpa perubahan logic) ...
  CONCATENATE '{"status":"S","data1":' lv_json1
              ',"data2":' lv_json2 '}' INTO lv_output.
  response->append_cdata( lv_output ).
  _m_navigation->response_complete( ).
  EXIT.
ENDIF.
```

Catatan: karena blok FM+serialisasi juga masih dipakai oleh render HTML lama (yang belum dihapus sampai Task 12), untuk sementara **duplikasikan pemanggilan**-nya di dalam handler GET_LIST (salin, jangan pindahkan) agar app lama tetap utuh. Konsolidasi dilakukan di Task 12.

- [ ] **Step 2: Verifikasi golden-JSON diff**

Rekam `golden_data1.json`/`golden_data2.json` dari app lama (lihat "Catatan verifikasi"). Panggil GET_LIST plant 1200 & 1300, bandingkan `data1`/`data2`. **Harus identik byte-per-byte** (field, urutan, format). Jika beda → hentikan, cari penyebab (jangan ubah logic; kemungkinan salah salin).

- [ ] **Step 3: Cek ABAP klasik**

Pastikan handler baru tidak memakai sintaks 7.40+ (`VALUE #`, `NEW`, `|...|`, inline `DATA(...)`). Harus paste-able ke SE80.

- [ ] **Step 4: Commit**

```bash
git add "ZPO_REL_BSP/Page with FLow Logic/main.htm"
git commit -m "feat(zpo): endpoint GET_LIST (bungkus serialisasi lama, output identik)"
```

---

### Task 7: `app-list.js` — sidebar, toolbar, pagination, kartu PO

**Files:**
- Create/Fill: `ZPO_REL_BSP/MIMEs/app-list.js`
- Reference: template kartu/sidebar `ZPR_REL_BSP/MIMEs/app-list.js`; logika hitung sidebar `main.htm:2295-2327`; reverse-lookup potype `main.htm:2100`.

**Interfaces:**
- Consumes: `apiPost` (core), `showLoading/hideLoading/showEmpty/renderSkeleton/updateFab` (ui), GET_LIST (Task 6).
- Produces: `loadList(plant,potype)`, `renderSidebar()`, `renderCards(list)`, `toggleSelect(ebeln)`, state global `ALL_DATA1`/`ALL_DATA2` (diisi dari GET_LIST), `getSelected()`. Dipakai detail & action.

- [ ] **Step 1: Muat data via GET_LIST, isi state**

```javascript
function loadList(plant, potype){
  showLoading();
  return apiPost('GET_LIST', { plant:plant, potype:potype||'ALL' })
    .then(function(res){
      window.ALL_DATA1 = res.data1 || [];
      window.ALL_DATA2 = res.data2 || [];
      hideLoading();
      renderSidebar();
      renderCards(filterByPotype(ALL_DATA1, potype));
    });
}
```

- [ ] **Step 2: Sidebar counts — salin logika hitung VERBATIM**

Pindahkan `buildSidebarCounts`/`countByBsart`/`countTotalByPlant` (main.htm:2299-2327) ke sini tanpa ubah rumus. Render memakai markup sidebar ZPR (kelas `.sb-*`).

- [ ] **Step 3: Kartu PO — pakai template ZPR, isi field PO**

Adaptasi `renderCards` dari `app-list.js` ZPR. Ganti field: `banfn`→`ebeln`, label kategori pakai reverse-lookup potype (`main.htm:2100`, salin map-nya). Tampilkan nomor PO, potype badge, total nilai (pakai `formatAmount`), jumlah item. Checkbox seleksi → `toggleSelect(ebeln)` → `updateFab(getSelected().length)`.

- [ ] **Step 4: Toolbar + pagination**

Salin pola page-size & pagination dari `app-list.js` ZPR (kelas ZPR). Sumber data = state lokal `ALL_DATA1` (client-side paging, sama seperti perilaku lama).

- [ ] **Step 5: Verifikasi side-by-side**

Buka app lama & baru untuk plant 1200 & 1300. Cocokkan: jumlah PO per potype di sidebar, jumlah kartu, total nilai tiap PO, urutan. **Harus sama.**

- [ ] **Step 6: Commit**

```bash
git add ZPO_REL_BSP/MIMEs/app-list.js
git commit -m "feat(zpo): app-list.js kartu PO + sidebar gaya ZPR (data via GET_LIST)"
```

---

## FASE 3 — HISTORY

### Task 8: `app-history.js` — sidebar history, filter, tabel item, counts

**Files:**
- Create/Fill: `ZPO_REL_BSP/MIMEs/app-history.js`
- Reference: `app-history.js` ZPR; handler existing `GET_HISTORY_REL` (main.htm:68), `GET_HISTORY_REJ` (240), `GET_HISTORY_COUNT` (444), `GET_HISTORY_ITEMS` (552) — **sudah JSON, tidak diubah**.

**Interfaces:**
- Consumes: `apiPost` (core), komponen ui, endpoint `GET_HISTORY_*` (existing).
- Produces: `loadHistory(kind,plant,filter)`, `renderHistBadges(plant)`, `renderHistTable(rows)`, `loadHistItems(ebeln)`.

- [ ] **Step 1: Ambil history via endpoint existing**

`apiPost('GET_HISTORY_REL', {werks:plant, date_from, date_to, search, offset, limit})` dan `GET_HISTORY_REJ` serupa. Parameter mengikuti yang sudah dibaca handler (main.htm:76-83). **Tidak menambah/mengubah parameter backend.**

- [ ] **Step 2: Render tabel & badge pakai markup ZPR**

Adaptasi tampilan history ZPR; remap field ke PO (`ebeln`, `bsart`→potype, tanggal via `formatDate`, nilai via `formatNumHist`). Badge count via `GET_HISTORY_COUNT`.

- [ ] **Step 3: Lazy-load item history**

Saat baris di-expand → `apiPost('GET_HISTORY_ITEMS',{ebeln:ebeln})`, render tabel item (kelas ZPR). Cache per `ebeln` di memori (pola cache lama `main.htm:2161`).

- [ ] **Step 4: Verifikasi side-by-side**

Bandingkan history REL & REJ (plant + rentang tanggal sama) app lama vs baru: jumlah baris, nilai, badge count, item saat expand. **Harus sama.**

- [ ] **Step 5: Commit**

```bash
git add ZPO_REL_BSP/MIMEs/app-history.js
git commit -m "feat(zpo): app-history.js (konsumsi GET_HISTORY_* existing)"
```

---

## FASE 4 — DETAIL

### Task 9: Backend `WHEN 'GET_DETAIL'` (repackage item dari serialisasi yang ada)

**Files:**
- Modify: `ZPO_REL_BSP/Page with FLow Logic/main.htm`
- Reference: serialisasi item `lv_json2` (main.htm:1295-1335); item-text `READ_TEXT` existing (main.htm:937).

**Interfaces:**
- Produces: `{"status":"S","data":[...]}` berisi baris item untuk satu `ebeln` — subset `lv_json2` yang sudah ada, difilter by `ebeln`. Logic/READ_TEXT tidak berubah.

- [ ] **Step 1: Tambah handler GET_DETAIL**

Sisipkan `IF lv_action = 'GET_DETAIL'.` yang membaca `lv_po_ebeln = request->get_form_field('ebeln')`, memanggil `Z_FM_YMMR068` (blok existing) lalu membangun `lv_json2` **memakai blok 1295-1335 apa adanya** tetapi hanya untuk item milik `ebeln` tsb (filter di loop yang sudah ada, tanpa mengubah pembentukan field), lalu:

```abap
IF lv_action = 'GET_DETAIL'.
  " ... panggil FM + build lv_json2 (blok existing) untuk ebeln ini ...
  CONCATENATE '{"status":"S","data":' lv_json2 '}' INTO lv_output.
  response->append_cdata( lv_output ).
  _m_navigation->response_complete( ).
  EXIT.
ENDIF.
```

Jika lebih aman, GET_DETAIL boleh tidak dibuat dan detail diambil dari state `ALL_DATA2` di klien (sudah ada dari GET_LIST). **Keputusan:** pakai `ALL_DATA2` klien bila item PO sudah lengkap di GET_LIST → lewati Step ini, detail murni frontend. Konfirmasi dari data GET_LIST apakah `ALL_DATA2` memuat semua item semua PO (di app lama: ya). Jika ya, **skip Task 9 backend**, cukup filter klien.

- [ ] **Step 2: Verifikasi**

Bila handler dibuat: golden-diff item satu `ebeln` vs subset `ALL_DATA2` lama. Bila pakai state klien: pastikan `ALL_DATA2` memuat item untuk PO yang dibuka (cocokkan dengan app lama).

- [ ] **Step 3: Commit**

```bash
git add "ZPO_REL_BSP/Page with FLow Logic/main.htm"
git commit -m "feat(zpo): detail PO (repackage item existing / state klien)"
```

---

### Task 10: `app-detail.js` — panel detail + modal item text

**Files:**
- Create/Fill: `ZPO_REL_BSP/MIMEs/app-detail.js`
- Reference: `app-detail.js` ZPR; blok `ADD INFO` (main.htm:1684), item-text handler existing.

**Interfaces:**
- Consumes: state `ALL_DATA2` / GET_DETAIL, `apiPost`, komponen ui, `openModal('modalItemText')`.
- Produces: `openDetail(ebeln)`, `renderDetailItems(ebeln)`, `showItemText(ebeln,item)`.

- [ ] **Step 1: Render item detail dari state/endpoint**

Filter `ALL_DATA2` by `ebeln` (atau GET_DETAIL), render tabel item memakai markup detail ZPR (remap field PO: qty via `formatNum`, harga via `formatAmount`, dll).

- [ ] **Step 2: Modal item text**

Adaptasi modal item-text ZPR (`#modalItemText`). Sumber teks = handler READ_TEXT existing (jangan ubah). Tampilkan meta + body teks.

- [ ] **Step 3: Verifikasi side-by-side**

Buka detail beberapa PO, bandingkan daftar item + item text vs app lama. **Sama.**

- [ ] **Step 4: Commit**

```bash
git add ZPO_REL_BSP/MIMEs/app-detail.js
git commit -m "feat(zpo): app-detail.js detail PO + modal item text gaya ZPR"
```

---

## FASE 5 — BULK ACTION

### Task 11: `app-action.js` — bulk release/reject + logoff (paling sensitif)

**Files:**
- Create/Fill: `ZPO_REL_BSP/MIMEs/app-action.js`
- Reference: handler existing `BULK_REL` (main.htm:1092), `BULK_REJ` (1132), logoff (main.htm:4211/4320); modal reject lama.

**Interfaces:**
- Consumes: `getSelected()` (list), modal `#modalRelease`/`#modalReject`, `apiPost`, `showToast`.
- Produces: `doRelease()`, `doReject(notes)`, `doLogoff()`, refresh list setelah aksi.

- [ ] **Step 1: Pastikan BULK_REL/BULK_REJ mengembalikan JSON**

Cek handler existing (main.htm:1092/1132): jika sudah `append_cdata` JSON + `response_complete` + `EXIT`, **tidak diubah**. Jika masih menyatu dengan render HTML lama, tambahkan cabang JSON untuk saat dipanggil via `apiPost` **tanpa mengubah pemanggilan `Z_PO_RELEASE2`/`Z_PO_REJECT`/`BAPI_TRANSACTION_COMMIT`** — hanya bungkus hasil `BAPIRET2`/`BAPIRETURN` ke JSON. Verifikasi terpisah di Step 3.

- [ ] **Step 2: Wire FAB → modal → aksi → refresh**

```javascript
function doRelease(){
  var sel = getSelected();
  if (!sel.length){ showToast('Pilih PO dulu','info'); return; }
  showLoading();
  apiPost('BULK_REL', { selected: sel.join(',') }).then(function(res){
    hideLoading();
    showToast(res.message || 'Selesai', res.status==='S'?'success':'error');
    loadList(currentPlant, currentPotype); // refresh dari server
  });
}
```
`doReject(notes)` serupa dengan `action:'BULK_REJ'` + `notes` (dari `#rejectNotes`). Parameter `selected`/`notes` harus **sama nama** dengan yang dibaca handler lama.

- [ ] **Step 3: Verifikasi di PO UJI (kritis)**

Di client uji: pilih 1 PO uji, Release. Bandingkan `BAPIRET2`/`BAPIRETURN` & status commit dengan app lama untuk PO serupa. Ulangi untuk Reject + catatan. **Hasil & efek di SAP harus identik.** Jangan pakai PO produksi.

- [ ] **Step 4: Logoff**

Salin pola logoff (main.htm:4320) ke `doLogoff()`; sesuaikan URL BSP ZPO (`/sap/bc/bsp/sap/zpo_rel_bsp/index.htm`).

- [ ] **Step 5: Commit**

```bash
git add ZPO_REL_BSP/MIMEs/app-action.js "ZPO_REL_BSP/Page with FLow Logic/main.htm"
git commit -m "feat(zpo): app-action.js bulk release/reject + logoff (efek SAP identik)"
```

---

## FASE 6 — POLISH & PENSIUNKAN KODE LAMA

### Task 12: Retire render HTML lama + konsolidasi + polish

**Files:**
- Modify: `ZPO_REL_BSP/Page with FLow Logic/main.htm` (hapus blok HTML+inline JS 1337-akhir & inject `ALL_DATA1/2`), hapus duplikasi FM di GET_LIST (konsolidasi Task 6 Step 1)
- Modify: modul `app-*.js` untuk polish visual final

**Interfaces:**
- Produces: `main.htm` menjadi **JSON API murni** (mirror ZPR `main.htm`); `index.htm` satu-satunya entry UI.

- [ ] **Step 1: Regression side-by-side penuh SEBELUM menghapus**

Jalankan checklist gabungan (list, sidebar counts, history REL/REJ + items, detail + item text, bulk di PO uji) app lama vs baru. Semua **harus sama**. Simpan hasil sebagai bukti sebelum menghapus jalur lama.

- [ ] **Step 2: Hapus blok HTML + inline JS lama**

Hapus dari `main.htm`: blok `%>...<!DOCTYPE...>` sampai akhir (mulai 1336/1337), termasuk `var ALL_DATA1/2 = ...` (2068-2069) dan seluruh fungsi render inline. Konsolidasikan pemanggilan `Z_FM_YMMR068`+serialisasi agar hanya dipakai handler `GET_LIST`/`GET_DETAIL` (hilangkan duplikasi Task 6). **Blok FM/serialisasi tetap tidak diubah isinya.**

- [ ] **Step 3: Buang flag/parameter verifikasi sementara**

Jika ada flag toggle lama/baru yang ditambah saat verifikasi, hapus.

- [ ] **Step 4: Polish visual final**

Rapikan spacing, state kosong, skeleton, transisi — samakan rasa dengan ZPR. Naikkan `lv_ver` di `index.htm` agar cache aset ter-*bust*.

- [ ] **Step 5: Verifikasi akhir**

Buka `index.htm` bersih (hard reload). Semua view berfungsi lewat shell baru; `main.htm` diakses langsung tanpa `action` tidak lagi merender UI penuh (hanya API). Nol error konsol. SW meng-cache versi baru.

- [ ] **Step 6: Commit**

```bash
git add "ZPO_REL_BSP/Page with FLow Logic/main.htm" "ZPO_REL_BSP/Page with FLow Logic/index.htm" ZPO_REL_BSP/MIMEs/
git commit -m "refactor(zpo): pensiunkan render HTML lama, main.htm jadi JSON API murni + polish"
```

---

## Self-Review (hasil)

- **Spec coverage:** Guardrail→Global Constraints; arsitektur mirror ZPR→Task 2/5/7/8/10; PWA→Task 3; fase 0–6→Task 1–12; remap PR→PO→Task 2/7/8/10/11; verifikasi golden-JSON/side-by-side→tiap task data; non-goal push/dashboard→dikecualikan di Task 2 Step 3. Tidak ada gap.
- **Placeholder scan:** tidak ada "TBD/TODO". Blok ABAP besar dirujuk lewat rentang baris eksak + instruksi "salin verbatim, jangan ubah" (bukan placeholder — kodenya sudah ada di repo).
- **Type/nama konsisten:** `apiPost`, `loadList`, `getSelected`, `updateFab`, `ALL_DATA1/2`, `GET_LIST`/`GET_DETAIL`/`GET_HISTORY_*` dipakai konsisten lintas task.
- **Catatan:** Task 9 punya cabang keputusan (backend GET_DETAIL vs filter state klien) — ditentukan saat eksekusi berdasarkan apakah `ALL_DATA2` sudah memuat semua item (di app lama: ya, sehingga kemungkinan besar backend GET_DETAIL di-skip).
