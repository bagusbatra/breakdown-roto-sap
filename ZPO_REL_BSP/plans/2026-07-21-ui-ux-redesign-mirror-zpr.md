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
- `ZPO_REL_BSP/MIMEs/app-core.js` — utilitas, format (verbatim ZPO), fetch helper (`apiPost`), `svgIcon`.
- `ZPO_REL_BSP/MIMEs/app-ui.js` — **shell controller** (mirror ZPR app-ui): sidebar, `switchView`, `init`, toast, modal, skeleton, user-menu, `doLogout`, label kategori/plant (POTYPE_MAP).
- `ZPO_REL_BSP/MIMEs/app-list.js` — view list PO pending-release (mirror ZPR app-list): `fetchList`→GET_LIST, filter, search, page-size, `getFiltered`, `renderList`.
- `ZPO_REL_BSP/MIMEs/app-history.js` — view history (mirror ZPR app-history): tabel/kartu, group by `ebeln`, filter, pagination, expand, item lazy-load.
- `ZPO_REL_BSP/MIMEs/app-detail.js` — pagination + expand + `loadDetail` + seleksi + `updateFabInfo` (mirror ZPR app-detail).
- `ZPO_REL_BSP/MIMEs/app-action.js` — modal Release/Reject + `processAction`→BULK_REL/BULK_REJ (mirror ZPR app-action). Logout ada di app-ui.

> **Catatan grounding (2026-07-21):** pembagian modul frontend di atas **meniru struktur ZPR yang sebenarnya** (bukan verbatim JS ZPO lama). ZPO lama terikat DOM/CSS lama; UI di-*port* dari modul ZPR lalu diremap ke data PO. Data-format functions tetap verbatim dari ZPO (akurasi). Lihat blok GROUNDING di tiap Task 5/7/8/10/11.
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
- Reference: `ZPR_REL_BSP/MIMEs/manifest.json` (untuk manifest saja)

> **KOREKSI (2026-07-21):** `sw.js` ZPR ternyata **murni push-notification** (tak ada precache/offline). Karena push di luar scope, `sw.js` ZPO **ditulis dari nol** sebagai offline-shell SW — BUKAN disalin dari ZPR. Keputusan user: precache aset statis saja, `main.htm` selalu network.

**Interfaces:**
- Consumes: icon dari Task 1.
- Produces: app installable + offline shell; cache di-*bust* lewat `lv_ver`.

- [ ] **Step 1: Salin & sesuaikan `manifest.json`**

Salin dari `ZPR_REL_BSP/MIMEs/manifest.json`; ubah `name` → "Release PO ROTO - KMI", `short_name` → "Release PO", `description` → "Release Purchase Order ROTO untuk KMI-BOD", `start_url` = `index.htm`, `scope` = `./`. Icon tetap `icon-192.png`/`icon-512.png`. `theme_color`/`background_color` boleh ikut ZPR.

- [ ] **Step 2: Tulis `sw.js` offline-shell dari nol (tanpa kode push)**

Buat `sw.js` baru berisi HANYA offline-shell caching. Naikkan `CACHE_NAME` per versi agar aktivasi membersihkan cache lama. **Jangan** ada kode `push`/`notificationclick`. **Jangan** pernah cache `main.htm` (data PO dinamis → harus selalu network agar akurat).

```javascript
/* sw.js — offline-shell Service Worker ZPO_REL_BSP (tanpa push).
 * Host sejajar index.htm: .../sap/bc/bsp/sap/zpo_rel_bsp/sw.js */
var CACHE_NAME = 'zpo-shell-v1';
var SHELL_ASSETS = [
  'index.htm',
  'style.css', 'app-core.js', 'app-ui.js', 'app-list.js',
  'app-history.js', 'app-detail.js', 'app-action.js',
  'DMSans.woff2', 'DMMono.woff2', 'icon-192.png', 'icon-512.png'
];

self.addEventListener('install', function (event) {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(SHELL_ASSETS);
    })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        if (k !== CACHE_NAME) { return caches.delete(k); }
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (event) {
  var req = event.request;
  if (req.method !== 'GET') { return; }
  var url = new URL(req.url);

  // main.htm (JSON API & data) — SELALU network, jangan pernah di-cache.
  if (url.pathname.indexOf('main.htm') !== -1) {
    return; // biarkan browser fetch normal ke network
  }

  // Navigasi (index.htm) — network dulu, fallback ke shell yang di-precache
  // bila offline. caches.match mengembalikan Promise, jadi resolve dulu.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(function () { return caches.match('index.htm'); })
    );
    return;
  }

  // Aset statis — cache-first.
  event.respondWith(
    caches.match(req).then(function (hit) { return hit || fetch(req); })
  );
});
```

- [ ] **Step 3: Tambah `<link rel="manifest">` + registrasi SW di `index.htm`**

Kembalikan link manifest di `<head>`:
```html
<link rel="manifest" href="manifest.json" crossorigin="use-credentials">
```
Tambah registrasi SW (ZPR tak punya registrasi untuk disalin — tulis inline di `index.htm` sebelum `</body>` atau di boot `app-core.js`):
```html
<script>
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('sw.js').catch(function (e) {
      console.log('SW register gagal', e);
    });
  });
}
</script>
```
Pastikan path relatif benar untuk URL BSP ZPO.

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

### Task 5: `app-ui.js` — shell controller (PORT dari ZPR app-ui.js, remap PO)

> **GROUNDING (2026-07-21):** `app-ui.js` ZPR **bukan** kumpulan primitif kecil — ia shell controller (sidebar + `switchView` + `init` + toast + modal + skeleton + user-menu + label kategori/plant). Task ini **mem-port `ZPR_REL_BSP/MIMEs/app-ui.js`** lalu remap PR→PO, BUKAN menyalin JS lama ZPO (yang terikat DOM/CSS lama). Verifikasi = statis (`node -c` + grep); paritas visual = user.

**Files:**
- Create/Fill: `ZPO_REL_BSP/MIMEs/app-ui.js`
- Port source: `ZPR_REL_BSP/MIMEs/app-ui.js` (569 baris — titik awal, disalin lalu diremap)
- PO config source (pindahkan verbatim dari monolit): `main.htm:2076-2130` — `ENABLE_OGR`, `POTYPE_MAP`, `PLANT_LABELS`, `BSART_POTYPE_MAP` + builder + `colorMap`.

**Interfaces (tiru nama & signature ZPR):**
- Consumes dari app-core: `escHtml`, `svgIcon`, `fmtAmt`/`formatAmount`, `apiPost`.
- Produces: `getCategoryDef(werks,category)`, `getPlantLabel(werks)`, `getCategoryLabelByBsart(werks,bsart)`, `setActionBar(show)`, `setPager(html)`, `hideActionBar()`, `showEmpty(msg)`, `skeletonCard()`, `showSkeleton(count)`, `isMobileView()`, `toggleSidebar()`, `closeSidebarMobile()`, `updateSidebarAria()`, `toggleUserMenu(e)`, `closeUserMenu()`, `doLogout()`, `showToast(type,msg)`, `focusableIn(root)`, `openModal(id)`, `closeModal(id)`, `renderSidebar()`, `switchView(plant,category,mode)`, `init()`, `loadSidebarData()`, `landing()` + helper sidebar (`normalizeCatCounts`, `sumCounts`, `sbBadge`, `sbLink`).
- Forward-refs (didefinisikan Task 7/8/10, dipanggil `switchView`): `renderList()`, `renderHistContent()`, `loadDetail()`. Aman karena `init()` jalan setelah semua `<script>` termuat.

- [ ] **Step 1: Salin `ZPR_REL_BSP/MIMEs/app-ui.js` sebagai basis**

Salin isinya ke `ZPO_REL_BSP/MIMEs/app-ui.js` (pertahankan header comment + `'use strict';`).

- [ ] **Step 2: Pindahkan config PO dari `main.htm` ke `app-ui.js`**

Salin VERBATIM dari `main.htm:2076-2130`: `ENABLE_OGR`, `POTYPE_MAP`, `PLANT_LABELS`, dan blok IIFE `buildBsartMap` yang mengisi `BSART_POTYPE_MAP` (termasuk `colorMap`). Ini config presentasi (bukan logic bisnis). Taruh dekat atas file. **Jangan** hapus dari `main.htm` (app lama masih pakai sampai Task 12).

- [ ] **Step 3: Remap PR→PO pada fungsi hasil port**

- Ganti sumber kategori/plant: `getCategoryDef`/`getPlantLabel`/`getCategoryLabelByBsart` dibaca dari `POTYPE_MAP`/`PLANT_LABELS`/`BSART_POTYPE_MAP` (bukan config PR ZPR). Warna badge dari `colorMap`.
- Buang view "sudah PO" (ZPR `app-po`) dan filter khusus PR yang **tidak ada** di data PO. Cek field data PO (dari GET_LIST Task 6 / `ALL_DATA1`): bila ZPO tak punya `estkz`/MRP, hapus cabang filter MRP/`onEstkzFilter`; bila punya, pertahankan. Catat keputusan di report.
- `doLogout()`: arahkan ke `/sap/bc/bsp/sap/zpo_rel_bsp/index.htm` (URL BSP ZPO).
- Wording user-facing PR→PO ("Approve"→"Release"); item menu notifikasi sudah dihapus di index.htm — pastikan `toggleUserMenu` tak merujuk elemen notif yang tak ada.
- `switchView`: batasi ke view ZPO (list PO pending-release + history rel/rej). Panggil `renderList()`/`renderHistContent()` (Task 7/8).

- [ ] **Step 4: Verifikasi statis**

`node -c ZPO_REL_BSP/MIMEs/app-ui.js` (sintaks OK). Grep pastikan tak ada sisa PR-only: `estkz` (bila diputuskan dibuang), `app-po`/`fetchHistApp` bila tak dipakai, `BAPI_REQUISITION`, `banfn` di string user-facing (→`ebeln`/"No PO"). Pastikan `openModal`/`closeModal` menyasar id yang ADA di `index.htm` (`modalRelease`, `modalReject`, `modalItemText`). Paritas visual/interaksi = verifikasi user.

- [ ] **Step 5: Commit**

```bash
git add ZPO_REL_BSP/MIMEs/app-ui.js
git commit -m "feat(zpo): app-ui.js shell controller (port ZPR, remap PO)"
```

---

## FASE 2 — LIST PO

### Task 6: Backend `WHEN 'GET_LIST'` (bungkus serialisasi lama, tanpa ubah logic)

**Files:**
- Modify: `ZPO_REL_BSP/Page with FLow Logic/main.htm` (tambah handler sebelum blok HTML `%>` di 1336)
- Reference: FM call `main.htm:1050-1060`, serialisasi `main.htm:1230-1335`

**Interfaces:**
- Produces: response JSON `{"status":"S","data1":[...],"data2":[...]}` untuk `action=GET_LIST&plant=<p>&potype=<t>`, di mana `data1`/`data2` = `lv_json1`/`lv_json2` yang **persis sama** dengan `ALL_DATA1`/`ALL_DATA2` lama.

- [ ] **Step 1: Sisipkan short-circuit GET_LIST setelah serialisasi yang ADA**

> **PENYEDERHANAAN (verified 2026-07-21):** blok `Z_FM_YMMR068` (main.htm:1048-1071) + build `lv_json1` (1230-1292) + `lv_json2` (1295-1335) **sudah jalan tanpa syarat** sebelum HTML (untuk di-inject sebagai ALL_DATA1/2). Jadi **TIDAK perlu duplikasi FM**. Cukup sisipkan short-circuit **tepat setelah baris 1335** (`CONCATENATE lv_json2 ']' INTO lv_json2.`) dan **sebelum `%>` (1336)**, memakai `lv_json1`/`lv_json2` yang sudah terisi — output otomatis identik dengan ALL_DATA1/2.

```abap
IF lv_action = 'GET_LIST'.
  CONCATENATE '{"status":"S","data1":' lv_json1
              ',"data2":' lv_json2 '}' INTO lv_output.
  response->append_cdata( lv_output ).
  _m_navigation->response_complete( ).
  EXIT.
ENDIF.
```

Catatan: `GET_LIST` tidak tercegat handler lebih awal (GET_HISTORY_*/GET_OGR meng-EXIT untuk action-nya sendiri), jadi ia jatuh ke FETCH DATA → skip BULK (action≠BULK_*) → build json → short-circuit ini. **Tanpa duplikasi, tanpa ubah logic.** (Konsolidasi di Task 12 tidak lagi diperlukan untuk GET_LIST.)

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

### Task 7: `app-list.js` — view list PO pending-release (PORT ZPR app-list.js, remap PO)

> **GROUNDING:** mirror `ZPR_REL_BSP/MIMEs/app-list.js` = view list + filter + search + page-size + `getFiltered` + `renderList`. Sidebar ada di `app-ui` (Task 5), seleksi & pagination di `app-detail` (Task 10) — **sama seperti pembagian ZPR**. Task ini TIDAK memuat sidebar/seleksi.

**Files:**
- Create/Fill: `ZPO_REL_BSP/MIMEs/app-list.js`
- Port source: `ZPR_REL_BSP/MIMEs/app-list.js`

**Interfaces (tiru ZPR):**
- Consumes: `apiPost`, `formatAmount`/`fmtAmt`, `escHtml`, `svgIcon` (core); `getCategoryDef`/`getCategoryLabelByBsart`/`showSkeleton`/`showEmpty`/`setActionBar`/`setPager`/`getPlantLabel` (ui, Task 5); state `ALL_DATA1`/`ALL_DATA2`; `toggleSelect`/`updateFabInfo` (detail, Task 10).
- Produces (tiru nama ZPR): `fetchList(...)`, `onPlantSubFilter(val)`, `onSortFilter(val)`, `setFilterPanel(open)`, `toggleFilterPanel(e)`, `resetPrFilters()` (→ ganti nama sesuai domain, mis. `resetPoFilters`), `buildSearchBox(id,handler,value,placeholder)`, `buildPageSizeSelect(...)`, `buildFilterButton(count)`, `buildPlantSubSelect(...)`, `getFiltered()`, `renderList()`.

- [ ] **Step 1: Salin `ZPR_REL_BSP/MIMEs/app-list.js` sebagai basis**

- [ ] **Step 2: `fetchList` → GET_LIST, isi state klien**

Ubah `fetchList` agar memanggil `apiPost('GET_LIST', {plant:curPlant, potype:...})` lalu isi `window.ALL_DATA1 = res.data1; window.ALL_DATA2 = res.data2;` dan panggil `renderList()`. (ZPR memanggil GET_LIST/GET_SIDEBAR terpisah; ZPO satu GET_LIST mengembalikan `data1`+`data2`.) Pertahankan pola loading (`showSkeleton()`), error (`showEmpty()`), dan `credentials` seperti ZPR.

- [ ] **Step 3: `getFiltered` + `renderList` — remap ke kartu PO**

Adaptasi kartu ZPR: field `banfn`→`ebeln` (No PO), badge kategori via `getCategoryLabelByBsart`/potype + warna `colorMap`, total nilai via `formatAmount`/`renderCardAmount`, jumlah item (`item_count`). Checkbox seleksi memanggil `toggleSelect(ebeln)` (app-detail). Filter: potype (dari `switchView`/sidebar), plant-sub, sort, search. **Buang** cabang filter `estkz`/MRP bila Task 5 memutuskan ZPO tak punya field itu (konsisten dengan keputusan Task 5).

- [ ] **Step 4: Verifikasi statis**

`node -c ZPO_REL_BSP/MIMEs/app-list.js`. Grep: kartu memakai `ebeln` (bukan `banfn`), tak ada sisa `fetchHistApp`/`app-po`/`estkz` (bila dibuang), tak ada string "PR" user-facing. Paritas side-by-side (jumlah PO/potype, total, urutan) = **verifikasi user** (butuh SAP).

- [ ] **Step 5: Commit**

```bash
git add ZPO_REL_BSP/MIMEs/app-list.js
git commit -m "feat(zpo): app-list.js view list PO (port ZPR, data via GET_LIST)"
```

---

## FASE 3 — HISTORY

### Task 8: `app-history.js` — view history (PORT ZPR app-history.js, remap PO)

> **GROUNDING:** mirror `ZPR_REL_BSP/MIMEs/app-history.js` = `renderHistTable`/`groupHistByBanfn`/`buildHistCards`/`getFilteredHist`/`renderHistContent`/pagination/expand. Backend history ZPO **sudah JSON & tidak diubah**.

**Files:**
- Create/Fill: `ZPO_REL_BSP/MIMEs/app-history.js`
- Port source: `ZPR_REL_BSP/MIMEs/app-history.js`
- Endpoint existing (JANGAN ubah): `GET_HISTORY_REL` (main.htm:68), `GET_HISTORY_REJ` (240), `GET_HISTORY_COUNT` (444), `GET_HISTORY_ITEMS` (552).

**Interfaces (tiru ZPR, remap `banfn`→`ebeln`):**
- Consumes: `apiPost`, `formatDate`/`formatTime`/`formatNumHist` (core), ui helpers, endpoint `GET_HISTORY_*`.
- Produces: `renderHistTable(data,type)`, `groupHistByEbeln(rows)` (ex-`groupHistByBanfn`), `buildHistCards(groups,type)`, `onHistSearchTrigger(val)`, `getFilteredHist()`, `renderHistContent()`, `renderHistPagination(...)`, `histGoPage(pg)`, `histChangePageSize(val)`, `toggleHistExpand(ebeln)`, `histExpandAll()`, `histCollapseAll()`, `toggleHistExpandAll()`.

- [ ] **Step 1: Salin `ZPR_REL_BSP/MIMEs/app-history.js` sebagai basis**

- [ ] **Step 2: Sambungkan ke endpoint history ZPO existing**

Panggil `apiPost('GET_HISTORY_REL', {werks, date_from, date_to, search, offset, limit})` & `GET_HISTORY_REJ` dengan **parameter yang sudah dibaca handler** (main.htm:76-83) — jangan tambah/ubah param. Badge count via `GET_HISTORY_COUNT`. Item saat expand via `GET_HISTORY_ITEMS` (cache per `ebeln`, pola `main.htm:2161`).

- [ ] **Step 3: Remap tampilan PR→PO**

`groupHistByBanfn`→group by `ebeln`; kolom/kartu remap ke PO (`ebeln`, potype badge, tanggal `formatDate`, nilai `formatNumHist`). Markup & kelas mengikuti ZPR.

- [ ] **Step 4: Verifikasi statis**

`node -c`. Grep: group/kolom pakai `ebeln`, tak ada param backend baru, tak ada string "PR" user-facing. Paritas side-by-side (baris, nilai, badge, item) = **verifikasi user**.

- [ ] **Step 5: Commit**

```bash
git add ZPO_REL_BSP/MIMEs/app-history.js
git commit -m "feat(zpo): app-history.js view history (port ZPR, GET_HISTORY_* existing)"
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

### Task 10: `app-detail.js` — pagination + expand detail + seleksi (PORT ZPR app-detail.js, remap PO)

> **GROUNDING:** mirror `ZPR_REL_BSP/MIMEs/app-detail.js` = pagination + expand kartu + `loadDetail` + seleksi + `updateFabInfo`. (Di ZPR, pagination & seleksi memang di modul ini.) Detail item PO diambil dari state klien `ALL_DATA2` (GET_LIST) bila lengkap; bila tidak, Task 9 (`GET_DETAIL`) mengisinya.

**Files:**
- Create/Fill: `ZPO_REL_BSP/MIMEs/app-detail.js`
- Port source: `ZPR_REL_BSP/MIMEs/app-detail.js`
- Item-text: handler READ_TEXT existing (main.htm:937) — **jangan ubah**.

**Interfaces (tiru ZPR, remap `banfn`→`ebeln`):**
- Consumes: state `ALL_DATA2` (atau GET_DETAIL Task 9), `apiPost`, `formatAmount`/`formatNum`, `openModal('modalItemText')`/`showItemTextModal` (ui), `renderList` (list), `updateFabInfo` konsumen `showModalRelease/Reject` (action).
- Produces: `pgBtn(...)`, `buildPagination(...)`, `renderPagination(...)`, `goPage(pg)`, `changePageSize(val)`, `onSearchTrigger(val)`, `setCardExpanded(card,on)`, `toggleExpand(ebeln)`, `expandAll()`, `collapseAll()`, `toggleExpandAll()`, `currencyChipClass(w)`, `loadDetail(ebeln)`, `toggleSelect(ebeln)`, `toggleSelectAll()`, `syncCheckboxes()`, `updateFabInfo()`. State seleksi global (mis. `selEbelns`).

- [ ] **Step 1: Salin `ZPR_REL_BSP/MIMEs/app-detail.js` sebagai basis**

- [ ] **Step 2: `loadDetail` — sumber item PO**

`loadDetail(ebeln)`: filter `ALL_DATA2` by `ebeln` (client state dari GET_LIST). Bila item PO tidak lengkap di `ALL_DATA2`, panggil `apiPost('GET_DETAIL',{ebeln})` (Task 9). Render tabel item markup detail ZPR (qty `formatNum`, harga `formatAmount`, currency chip).

- [ ] **Step 3: Seleksi + FAB**

`toggleSelect(ebeln)`/`toggleSelectAll`/`syncCheckboxes`/`updateFabInfo` remap `banfn`→`ebeln`; `updateFabInfo` menampilkan "N PO dipilih" (id `fabInfo`). Modal item-text via `showItemTextModal` (ui) yang memanggil READ_TEXT existing.

- [ ] **Step 4: Verifikasi statis**

`node -c`. Grep: seleksi/detail pakai `ebeln`, FAB teks "PO", tak ada string "PR". Paritas detail item + item-text = **verifikasi user**.

- [ ] **Step 5: Commit**

```bash
git add ZPO_REL_BSP/MIMEs/app-detail.js
git commit -m "feat(zpo): app-detail.js pagination+seleksi+detail PO (port ZPR)"
```

---

## FASE 5 — BULK ACTION

### Task 11: `app-action.js` — modal Release/Reject + processAction (PORT ZPR, paling sensitif)

> **GROUNDING:** mirror `ZPR_REL_BSP/MIMEs/app-action.js` = `showModalApprove`/`showModalReject`/`confirmApprove`/`confirmReject`/`setLoadingText`/`processAction`. Remap Approve→Release. **Logout ADA di `app-ui` (`doLogout`, Task 5)** — tidak diduplikasi di sini. `index.htm` sudah memakai `showModalRelease()`/`confirmRelease()` (Task 2 fix) — definisikan nama itu.

**Files:**
- Create/Fill: `ZPO_REL_BSP/MIMEs/app-action.js`
- Port source: `ZPR_REL_BSP/MIMEs/app-action.js`
- Handler existing (JANGAN ubah logic): `BULK_REL` (main.htm:1092), `BULK_REJ` (1132).

**Interfaces (tiru ZPR, remap PO):**
- Consumes: state seleksi `selEbelns`/`getSelected` (detail), modal `#modalRelease`/`#modalReject`/`#rejectNotes` (index.htm), `apiPost`, `showToast`, `closeModal`, `fetchList`/`renderList` (refresh).
- Produces: `showModalRelease()` (ex-`showModalApprove`), `showModalReject()`, `confirmRelease()` (ex-`confirmApprove`), `confirmReject()`, `setLoadingText(txt)`, `processAction(ebelns, action, notes)`.

- [ ] **Step 1: Salin `ZPR_REL_BSP/MIMEs/app-action.js` sebagai basis; remap nama**

`showModalApprove`→`showModalRelease`, `confirmApprove`→`confirmRelease` (cocok dgn `index.htm`). Modal id `modalApprove`→`modalRelease`. Teks "Approve"→"Release".

- [ ] **Step 2: `processAction` → BULK_REL / BULK_REJ**

`processAction(ebelns, action, notes)`: `action` 'REL'→`apiPost('BULK_REL',{selected:ebelns.join(','), ...})`, 'REJ'→`apiPost('BULK_REJ',{selected:..., notes:notes})`. **Nama parameter (`selected`/`notes`) harus persis yang dibaca handler lama** (cek main.htm:1092/1132 & parsing `lt_selected`). Setelah sukses: `showToast`, tutup modal, refresh via `fetchList()`.

- [ ] **Step 3: Cek handler backend mengembalikan JSON saat dipanggil via fetch**

Baca `BULK_REL`/`BULK_REJ` (main.htm:1092/1132). Bila sudah `append_cdata` JSON + `response_complete` + `EXIT` → **tak diubah**. Bila masih menyatu render HTML lama, tambah cabang JSON **tanpa mengubah pemanggilan `Z_PO_RELEASE2`/`Z_PO_REJECT`/`BAPI_TRANSACTION_COMMIT`** (hanya bungkus `BAPIRET2`/`BAPIRETURN` → JSON). Sintaks ABAP klasik.

- [ ] **Step 4: Verifikasi**

Statis: `node -c`; seleksi pakai `ebeln`; param `selected`/`notes` cocok handler. **KRITIS (user, di PO UJI):** Release 1 PO uji via app baru, bandingkan `BAPIRET2`/`BAPIRETURN` + commit dgn app lama; ulangi Reject+catatan. **Efek di SAP harus identik.** Jangan PO produksi.

- [ ] **Step 5: Commit**

```bash
git add ZPO_REL_BSP/MIMEs/app-action.js "ZPO_REL_BSP/Page with FLow Logic/main.htm"
git commit -m "feat(zpo): app-action.js modal Release/Reject + processAction (port ZPR)"
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
