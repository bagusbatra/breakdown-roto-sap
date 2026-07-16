# ZPO_REL_BSP — Optimalisasi Performa & UI Polish: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mempercepat render frontend dan mem-polish UI/UX `main.htm` tanpa mengubah logika program sedikit pun.

**Architecture:** Satu file BSP `main.htm` (ABAP + CSS + HTML + JS). Semua perubahan hanya di blok CSS (`<style>`, baris ±1344–1874), HTML shell (±1876–1946), dan JS (`<script>`, ±1947–4096). Blok ABAP (baris 1–1343) TIDAK BOLEH disentuh. Optimasi = index map + cache + lazy render dengan output identik; polish = CSS + komponen dialog/toast/feedback seleksi.

**Tech Stack:** SAP BSP, ABAP klasik (tidak diubah), HTML/CSS, JavaScript ES5-style (`var`, function declaration — TANPA arrow function, template literal, `let`/`const`).

**Spec:** `ZPO_REL_BSP/specs/2026-07-16-ui-perf-polish-design.md`

## Global Constraints

- HANYA boleh membaca/mengubah file di dalam `ZPO_REL_BSP/`.
- Blok ABAP `main.htm` baris 1–1343 (dari `<%@page language="abap"%>` sampai sebelum `<style>`) tidak boleh berubah satu karakter pun.
- Logika program tidak berubah: endpoint, parameter POST, format angka/tanggal, alur filter/search/pagination/history/OGR identik.
- Gaya JS mengikuti existing: ES5 (`var`, string concat `+`), tanpa sintaks modern.
- Hasil akhir tetap satu file `main.htm` utuh siap paste ke SE80.
- Fungsi existing tidak boleh berganti nama/signature (`getItemsForPO`, `getRemarkForPO`, `countByBsart`, `countTotalByPlant`, `showToast`, `submitAction`, `toggleCard`, `expandAll`, `toggleAll`, `doLogout`).
- Verifikasi tiap task: `node "ZPO_REL_BSP/tools/check-js.js"` harus output `JS SYNTAX OK`.
- Working directory semua perintah: `D:\DEV\Breakdown ROTO SAP` (repo root). Path mengandung spasi — selalu pakai tanda kutip.
- Setiap commit diakhiri trailer: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`

**Catatan nomor baris:** nomor baris yang disebut adalah posisi SEBELUM perubahan apa pun. Gunakan anchor teks (old code) — bukan nomor baris — saat mengedit, karena posisi bergeser antar task.

---

### Task 1: Tool verifikasi sintaks JS + Index map item & remark (spec 1a)

**Files:**
- Create: `ZPO_REL_BSP/tools/check-js.js`
- Modify: `ZPO_REL_BSP/Page with FLow Logic/main.htm` (fungsi `getItemsForPO`/`getRemarkForPO` ±baris 3491–3501; `init` ±4057; callback `submitAction` ±3932)

**Interfaces:**
- Consumes: `ALL_DATA2` (array global existing, field `ebeln`, `text`, dll.)
- Produces: `buildDataIndexes()` (tanpa parameter, mengisi global `ITEM_INDEX` dan `REMARK_INDEX`); `getItemsForPO(ebeln)` → array (signature tetap); `getRemarkForPO(ebeln)` → string (signature tetap). Task 4 memakai `getItemsForPO`/`getRemarkForPO`; Task 2 menumpang titik pemanggilan `buildDataIndexes()`.

- [ ] **Step 1: Buat tool verifikasi sintaks**

Buat file `ZPO_REL_BSP/tools/check-js.js`:

```js
/* Ekstrak blok <script> utama main.htm, stub placeholder ABAP,
   lalu cek sintaks JS. Exit 0 = OK. */
var fs   = require('fs');
var path = require('path');

var file = path.join(__dirname, '..', 'Page with FLow Logic', 'main.htm');
var src  = fs.readFileSync(file, 'utf8');

var start = src.indexOf('<script>');
var end   = src.lastIndexOf('</script>');
if (start < 0 || end < 0 || end <= start) {
  console.error('script block not found');
  process.exit(1);
}

var js = src.slice(start + '<script>'.length, end);
/* <%= lv_json1 %> dsb. bukan JS — ganti stub array kosong */
js = js.replace(/<%=[\s\S]*?%>/g, '[]');

try {
  new Function(js);
  console.log('JS SYNTAX OK');
} catch (e) {
  console.error('JS SYNTAX ERROR: ' + e.message);
  process.exit(1);
}
```

- [ ] **Step 2: Jalankan tool pada file yang belum diubah (baseline)**

Run: `node "ZPO_REL_BSP/tools/check-js.js"`
Expected: `JS SYNTAX OK` (memastikan tool bekerja sebelum ada perubahan).

- [ ] **Step 3: Ganti getItemsForPO/getRemarkForPO dengan versi index**

Di `main.htm`, cari dan ganti (old → new):

Old:
```js
function getItemsForPO(ebeln) {
  return ALL_DATA2.filter(function(d) { return d.ebeln === ebeln; });
}

function getRemarkForPO(ebeln) {
  var items = getItemsForPO(ebeln);
  for (var i = 0; i < items.length; i++) {
    if (items[i].text && items[i].text.trim() !== '') return items[i].text;
  }
  return '';
}
```

New:
```js
/* Index ebeln -> items / remark. Dibangun sekali (init) dan
   di-rebuild setelah bulk action. Output identik dgn filter lama. */
var ITEM_INDEX   = {};
var REMARK_INDEX = {};

function buildDataIndexes() {
  ITEM_INDEX   = {};
  REMARK_INDEX = {};
  for (var i = 0; i < ALL_DATA2.length; i++) {
    var it = ALL_DATA2[i];
    if (!ITEM_INDEX[it.ebeln]) ITEM_INDEX[it.ebeln] = [];
    ITEM_INDEX[it.ebeln].push(it);
    if (!REMARK_INDEX[it.ebeln] &&
        it.text && it.text.trim() !== '') {
      REMARK_INDEX[it.ebeln] = it.text;
    }
  }
}

function getItemsForPO(ebeln) {
  return ITEM_INDEX[ebeln] || [];
}

function getRemarkForPO(ebeln) {
  return REMARK_INDEX[ebeln] || '';
}
```

Catatan kesetaraan: urutan item per PO mengikuti urutan `ALL_DATA2` (sama dengan `filter`); remark = teks non-kosong pertama dalam urutan yang sama (identik dengan loop lama).

- [ ] **Step 4: Panggil buildDataIndexes() di init**

Old:
```js
(function init() {
  renderSidebar();
```

New:
```js
(function init() {
  buildDataIndexes();
  renderSidebar();
```

- [ ] **Step 5: Rebuild index setelah bulk action**

Di callback sukses `submitAction` (dalam `setTimeout`), old:

```js
        ALL_DATA2 = ALL_DATA2.filter(function(d) {
          return processed.indexOf(d.ebeln) === -1;
        });
```

New:
```js
        ALL_DATA2 = ALL_DATA2.filter(function(d) {
          return processed.indexOf(d.ebeln) === -1;
        });

        buildDataIndexes();
```

- [ ] **Step 6: Verifikasi sintaks**

Run: `node "ZPO_REL_BSP/tools/check-js.js"`
Expected: `JS SYNTAX OK`

- [ ] **Step 7: Commit**

```bash
git add "ZPO_REL_BSP/tools/check-js.js" "ZPO_REL_BSP/Page with FLow Logic/main.htm" "ZPO_REL_BSP/specs/2026-07-16-ui-perf-polish-design.md" "ZPO_REL_BSP/plans/2026-07-16-ui-perf-polish.md"
git commit -m "perf: index map item & remark PO (O(1) lookup) + tool cek sintaks JS

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: Cache count sidebar (spec 1b)

**Files:**
- Modify: `ZPO_REL_BSP/Page with FLow Logic/main.htm` (fungsi `countByBsart`/`countTotalByPlant` ±2178–2188; `init`; callback `submitAction`)

**Interfaces:**
- Consumes: `ALL_DATA1` (global existing, field `plant`, `bsart`); titik panggil `buildDataIndexes()` dari Task 1.
- Produces: `buildSidebarCounts()` (tanpa parameter, mengisi global `SIDEBAR_COUNTS`); `countByBsart(bsartList, plant)` → number dan `countTotalByPlant(plantCode)` → number (signature tetap, kini baca cache).

- [ ] **Step 1: Ganti fungsi count dengan versi cache**

Old:
```js
function countByBsart(bsartList, plant) {
  return ALL_DATA1.filter(function(d) {
    return d.plant === plant && bsartList.indexOf(d.bsart) > -1;
  }).length;
}

function countTotalByPlant(plantCode) {
  return ALL_DATA1.filter(function(d) {
    return d.plant === plantCode;
  }).length;
}
```

New:
```js
/* Cache count sidebar — dibangun sekali dari satu loop ALL_DATA1,
   di-rebuild hanya setelah bulk action. Hasil identik dgn filter lama. */
var SIDEBAR_COUNTS = { total: {}, byBsart: {} };

function buildSidebarCounts() {
  SIDEBAR_COUNTS = { total: {}, byBsart: {} };
  for (var i = 0; i < ALL_DATA1.length; i++) {
    var d  = ALL_DATA1[i];
    var pl = d.plant;
    if (!SIDEBAR_COUNTS.total[pl]) SIDEBAR_COUNTS.total[pl] = 0;
    SIDEBAR_COUNTS.total[pl]++;
    if (!SIDEBAR_COUNTS.byBsart[pl]) SIDEBAR_COUNTS.byBsart[pl] = {};
    if (!SIDEBAR_COUNTS.byBsart[pl][d.bsart]) {
      SIDEBAR_COUNTS.byBsart[pl][d.bsart] = 0;
    }
    SIDEBAR_COUNTS.byBsart[pl][d.bsart]++;
  }
}

function countByBsart(bsartList, plant) {
  var m = SIDEBAR_COUNTS.byBsart[plant] || {};
  var n = 0;
  for (var i = 0; i < bsartList.length; i++) {
    n += m[bsartList[i]] || 0;
  }
  return n;
}

function countTotalByPlant(plantCode) {
  return SIDEBAR_COUNTS.total[plantCode] || 0;
}
```

- [ ] **Step 2: Build cache di init**

Old:
```js
(function init() {
  buildDataIndexes();
  renderSidebar();
```

New:
```js
(function init() {
  buildDataIndexes();
  buildSidebarCounts();
  renderSidebar();
```

- [ ] **Step 3: Rebuild cache setelah bulk action**

Old (hasil Task 1 Step 5):
```js
        buildDataIndexes();
```

New:
```js
        buildDataIndexes();
        buildSidebarCounts();
```

- [ ] **Step 4: Verifikasi sintaks**

Run: `node "ZPO_REL_BSP/tools/check-js.js"`
Expected: `JS SYNTAX OK`

- [ ] **Step 5: Commit**

```bash
git add "ZPO_REL_BSP/Page with FLow Logic/main.htm"
git commit -m "perf: cache count sidebar dari satu loop ALL_DATA1

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: Badge history tanpa re-render sidebar penuh (spec 1c)

**Files:**
- Modify: `ZPO_REL_BSP/Page with FLow Logic/main.htm` (`renderSidebar` bagian badge history ±2282–2298; `loadHistoryCounts` ±2193–2211)

**Interfaces:**
- Consumes: `histCounts` (global existing), `renderSidebar()` (existing).
- Produces: `updateHistBadges(plantCode)` — update `textContent`/visibilitas badge `#sbCntRel_<plant>` dan `#sbCntRej_<plant>`; fallback `renderSidebar()` bila elemen belum ada.

- [ ] **Step 1: Badge selalu dirender dengan id stabil**

Di `renderSidebar`, old:
```js
    html += '<a class="sb-link' + (isRelActive ? ' active-rel' : '') +
            '" onclick="switchHistory(\'' + p.code + '\',\'REL\')">' +
            '<span style="display:flex;align-items:center;gap:6px;">' +
            '&#10003; History Release</span>';
    if (cntRel > 0) {
      html += '<span class="sb-cnt-rel">' + cntRel + '</span>';
    }
    html += '</a>';

    html += '<a class="sb-link' + (isRejActive ? ' active-rej' : '') +
            '" onclick="switchHistory(\'' + p.code + '\',\'REJ\')">' +
            '<span style="display:flex;align-items:center;gap:6px;">' +
            '&#10007; History Reject</span>';
    if (cntRej > 0) {
      html += '<span class="sb-cnt-rej">' + cntRej + '</span>';
    }
    html += '</a>';
```

New:
```js
    html += '<a class="sb-link' + (isRelActive ? ' active-rel' : '') +
            '" onclick="switchHistory(\'' + p.code + '\',\'REL\')">' +
            '<span style="display:flex;align-items:center;gap:6px;">' +
            '&#10003; History Release</span>';
    html += '<span class="sb-cnt-rel" id="sbCntRel_' + p.code + '"' +
            (cntRel > 0 ? '' : ' style="display:none;"') + '>' +
            cntRel + '</span>';
    html += '</a>';

    html += '<a class="sb-link' + (isRejActive ? ' active-rej' : '') +
            '" onclick="switchHistory(\'' + p.code + '\',\'REJ\')">' +
            '<span style="display:flex;align-items:center;gap:6px;">' +
            '&#10007; History Reject</span>';
    html += '<span class="sb-cnt-rej" id="sbCntRej_' + p.code + '"' +
            (cntRej > 0 ? '' : ' style="display:none;"') + '>' +
            cntRej + '</span>';
    html += '</a>';
```

(Tampilan akhir identik: badge count 0 tersembunyi via `display:none`.)

- [ ] **Step 2: loadHistoryCounts update badge saja**

Old:
```js
      histCounts[plantCode] = {
        rel: parseInt(res.count_rel) || 0,
        rej: parseInt(res.count_rej) || 0
      };
      renderSidebar();
```

New:
```js
      histCounts[plantCode] = {
        rel: parseInt(res.count_rel) || 0,
        rej: parseInt(res.count_rej) || 0
      };
      updateHistBadges(plantCode);
```

- [ ] **Step 3: Tambah fungsi updateHistBadges**

Sisipkan tepat SETELAH penutup fungsi `loadHistoryCounts` (setelah `}` yang mengakhirinya):

```js
/* Update badge history di tempat; fallback render penuh bila
   sidebar belum pernah dirender. */
function updateHistBadges(plantCode) {
  var elRel = document.getElementById('sbCntRel_' + plantCode);
  var elRej = document.getElementById('sbCntRej_' + plantCode);
  if (!elRel || !elRej) { renderSidebar(); return; }
  elRel.textContent   = histCounts[plantCode].rel;
  elRel.style.display = histCounts[plantCode].rel > 0 ? '' : 'none';
  elRej.textContent   = histCounts[plantCode].rej;
  elRej.style.display = histCounts[plantCode].rej > 0 ? '' : 'none';
}
```

- [ ] **Step 4: Verifikasi sintaks**

Run: `node "ZPO_REL_BSP/tools/check-js.js"`
Expected: `JS SYNTAX OK`

- [ ] **Step 5: Commit**

```bash
git add "ZPO_REL_BSP/Page with FLow Logic/main.htm"
git commit -m "perf: update badge history in-place tanpa re-render sidebar penuh

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 4: Lazy render detail kartu (spec 1d)

**Files:**
- Modify: `ZPO_REL_BSP/Page with FLow Logic/main.htm` (`renderCardListOnly` ±3566–3655; `toggleCard`/`expandAll` ±3742–3751)

**Interfaces:**
- Consumes: `getItemsForPO(ebeln)`, `getRemarkForPO(ebeln)` (Task 1), `escHtml`, `formatNum` (existing).
- Produces: `buildCardDetailHtml(ebeln)` → string HTML isi `.card-detail` (markup identik dengan yang sekarang); `ensureCardDetail(cardEl)` — render isi detail sekali per kartu (idempoten, ditandai `data-rendered="1"`).

- [ ] **Step 1: Hapus prefetch items/remark di renderCardListOnly**

Old:
```js
      var items         = getItemsForPO(d.ebeln);
      var remark        = getRemarkForPO(d.ebeln);
      var amountDisplay = formatAmount(d.totpr, d.waerk);
```

New:
```js
      var amountDisplay = formatAmount(d.totpr, d.waerk);
```

- [ ] **Step 2: Tambah data-ebeln pada kartu**

Old:
```js
      html += '<div class="po-card" id="card_' + d.ebeln + '">';
```

New:
```js
      html += '<div class="po-card" id="card_' + d.ebeln +
              '" data-ebeln="' + d.ebeln + '">';
```

- [ ] **Step 3: Ganti blok detail dengan placeholder kosong**

Old (satu blok utuh di dalam loop `pageData.forEach`):
```js
      html += '<div class="card-detail">';
      html += '<table><thead><tr>';
      html += '<th>Item</th><th>Description</th>';
      html += '<th>Qty</th><th>Unit</th>';
      html += '<th class="num-col">Net Price</th>';
      html += '<th class="num-col">Total</th><th>Curr</th>';
      html += '</tr></thead><tbody>';
      items.forEach(function(it) {
        html += '<tr>';
        html += '<td>' + escHtml(it.ebelp) + '</td>';
        html += '<td>' + escHtml(it.maktx) + '</td>';
        html += '<td class="num-col">' + formatNum(it.menge, '') + '</td>';
        html += '<td>' + escHtml(it.meins) + '</td>';
        html += '<td class="num-col">' +
                formatNum(it.nettt, it.waerk) + '</td>';
        html += '<td class="num-col">' +
                formatNum(it.netwr, it.waerk) + '</td>';
        html += '<td>' + escHtml(it.waerk) + '</td>';
        html += '</tr>';
      });
      html += '</tbody></table>';

      html += '<div class="add-info">';
      html += '<span class="add-info-icon">&#9432;</span><div>';
      html += '<div class="add-info-lbl">Additional Information</div>';
      if (remark) {
        html += '<div class="add-info-txt">' + escHtml(remark) + '</div>';
      } else {
        html += '<div class="add-info-empty">' +
                '(No description / comment available)</div>';
      }
      html += '</div></div>';
      html += '</div>';
```

New:
```js
      html += '<div class="card-detail" data-rendered=""></div>';
```

- [ ] **Step 4: Tambah buildCardDetailHtml + ensureCardDetail**

Sisipkan tepat SEBELUM `function toggleCard(ebeln) {`:

```js
/* Lazy render isi detail kartu — markup identik dgn render lama,
   dibuat saat kartu pertama kali di-expand. */
function buildCardDetailHtml(ebeln) {
  var items  = getItemsForPO(ebeln);
  var remark = getRemarkForPO(ebeln);
  var html   = '';
  html += '<table><thead><tr>';
  html += '<th>Item</th><th>Description</th>';
  html += '<th>Qty</th><th>Unit</th>';
  html += '<th class="num-col">Net Price</th>';
  html += '<th class="num-col">Total</th><th>Curr</th>';
  html += '</tr></thead><tbody>';
  items.forEach(function(it) {
    html += '<tr>';
    html += '<td>' + escHtml(it.ebelp) + '</td>';
    html += '<td>' + escHtml(it.maktx) + '</td>';
    html += '<td class="num-col">' + formatNum(it.menge, '') + '</td>';
    html += '<td>' + escHtml(it.meins) + '</td>';
    html += '<td class="num-col">' +
            formatNum(it.nettt, it.waerk) + '</td>';
    html += '<td class="num-col">' +
            formatNum(it.netwr, it.waerk) + '</td>';
    html += '<td>' + escHtml(it.waerk) + '</td>';
    html += '</tr>';
  });
  html += '</tbody></table>';

  html += '<div class="add-info">';
  html += '<span class="add-info-icon">&#9432;</span><div>';
  html += '<div class="add-info-lbl">Additional Information</div>';
  if (remark) {
    html += '<div class="add-info-txt">' + escHtml(remark) + '</div>';
  } else {
    html += '<div class="add-info-empty">' +
            '(No description / comment available)</div>';
  }
  html += '</div></div>';
  return html;
}

function ensureCardDetail(card) {
  if (!card) return;
  var det = card.querySelector('.card-detail');
  if (!det || det.getAttribute('data-rendered') === '1') return;
  det.innerHTML = buildCardDetailHtml(card.getAttribute('data-ebeln'));
  det.setAttribute('data-rendered', '1');
}
```

- [ ] **Step 5: toggleCard & expandAll memanggil ensureCardDetail**

Old:
```js
function toggleCard(ebeln) {
  var c = document.getElementById('card_' + ebeln);
  if (c) c.classList.toggle('expanded');
}

function expandAll() {
  document.querySelectorAll('.po-card').forEach(function(c) {
    c.classList.add('expanded');
  });
}
```

New:
```js
function toggleCard(ebeln) {
  var c = document.getElementById('card_' + ebeln);
  if (!c) return;
  ensureCardDetail(c);
  c.classList.toggle('expanded');
}

function expandAll() {
  document.querySelectorAll('.po-card').forEach(function(c) {
    ensureCardDetail(c);
    c.classList.add('expanded');
  });
}
```

- [ ] **Step 6: Verifikasi sintaks**

Run: `node "ZPO_REL_BSP/tools/check-js.js"`
Expected: `JS SYNTAX OK`

- [ ] **Step 7: Commit**

```bash
git add "ZPO_REL_BSP/Page with FLow Logic/main.htm"
git commit -m "perf: lazy render detail kartu PO saat pertama di-expand

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 5: Feedback seleksi — highlight kartu + counter FAB (spec 2a)

**Files:**
- Modify: `ZPO_REL_BSP/Page with FLow Logic/main.htm` (CSS section PO CARDS ±1611 & FAB ±1751; HTML FAB ±1921; `renderCardListOnly`; `toggleAll` ±3759; `submitAction` ±3873)

**Interfaces:**
- Consumes: `parseAbapNum`, `ZERO_DEC_CURRENCIES`, `escHtml` (existing); struktur checkbox `.card-cb` dengan `data-amount`/`data-curr` (existing).
- Produces: `computeSelectedTotals()` → `{ count: number, totals: { CURR: number } }` (dipakai Task 6); `updateFabCount()`; `onCardCbChange(cb)`; `cardTopClick(ev, ebeln)`.

- [ ] **Step 1: Tambah CSS seleksi & chip FAB**

Sisipkan setelah rule `.po-card:hover { ... }` di section PO CARDS:

```css
.po-card.selected { border-color:var(--primary); background:#f8faff; }
```

Sisipkan setelah rule `.fab.show { display:flex; }` di section FAB:

```css
.fab-count {
  display:flex; flex-direction:column; justify-content:center;
  padding:0 10px; max-width:230px;
}
.fab-count-n { font-size:13px; font-weight:700; color:var(--text); white-space:nowrap; }
.fab-count-t {
  font-size:11px; color:var(--muted);
  white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
}
.fab.none-selected .fab-count-n { color:var(--muted); }
.fab.none-selected .fab-btn { opacity:.55; }
```

- [ ] **Step 2: Tambah chip counter di HTML FAB**

Old:
```html
<div class="fab" id="fab">
  <input type="text" id="commentInput" placeholder="Reject reason...">
```

New:
```html
<div class="fab" id="fab">
  <div class="fab-count" id="fabCount">
    <span class="fab-count-n">0 dipilih</span>
    <span class="fab-count-t">&nbsp;</span>
  </div>
  <input type="text" id="commentInput" placeholder="Reject reason...">
```

- [ ] **Step 3: Tambah helper seleksi**

Sisipkan tepat SEBELUM `function buildCardDetailHtml(ebeln) {` (dari Task 4):

```js
/* ── Feedback seleksi ── */
function computeSelectedTotals() {
  var cbs    = document.querySelectorAll('.card-cb:checked');
  var totals = {};
  cbs.forEach(function(cb) {
    var rawAmt = cb.dataset.amount || '0';
    var curr   = (cb.dataset.curr || '').toUpperCase();
    var a      = parseAbapNum(rawAmt) || 0;
    if (ZERO_DEC_CURRENCIES.indexOf(curr) > -1) a = Math.round(a * 100);
    if (!totals[curr]) totals[curr] = 0;
    totals[curr] += a;
  });
  return { count: cbs.length, totals: totals };
}

function updateFabCount() {
  var fab = document.getElementById('fab');
  var el  = document.getElementById('fabCount');
  if (!fab || !el) return;
  var sel    = computeSelectedTotals();
  var tParts = [];
  for (var c in sel.totals) {
    tParts.push(c + ' ' + sel.totals[c].toLocaleString('id-ID',
      { minimumFractionDigits:0, maximumFractionDigits:0 }));
  }
  el.querySelector('.fab-count-n').textContent = sel.count + ' dipilih';
  el.querySelector('.fab-count-t').innerHTML =
    tParts.length ? escHtml(tParts.join(' · ')) : '&nbsp;';
  fab.classList.toggle('none-selected', sel.count === 0);
}

function onCardCbChange(cb) {
  var card = cb.closest('.po-card');
  if (card) card.classList.toggle('selected', cb.checked);
  updateFabCount();
}

function cardTopClick(ev, ebeln) {
  var card = document.getElementById('card_' + ebeln);
  if (!card) return;
  var cb = card.querySelector('.card-cb');
  if (!cb) return;
  cb.checked = !cb.checked;
  onCardCbChange(cb);
}
```

- [ ] **Step 4: Pasang handler di markup kartu (renderCardListOnly)**

Edit 4a — card-top dapat area klik seleksi. Old:
```js
      html += '<div class="card-top">';
```
New:
```js
      html += '<div class="card-top" onclick="cardTopClick(event,\'' +
              d.ebeln + '\')">';
```

Edit 4b — checkbox dapat onchange. Old:
```js
      html += '<input type="checkbox" class="card-cb"' +
              ' data-ebeln="' + d.ebeln + '"' +
              ' data-amount="' + escHtml(d.totpr) + '"' +
              ' data-curr="' + escHtml(d.waerk) + '"' +
              ' onclick="event.stopPropagation()">';
```
New:
```js
      html += '<input type="checkbox" class="card-cb"' +
              ' data-ebeln="' + d.ebeln + '"' +
              ' data-amount="' + escHtml(d.totpr) + '"' +
              ' data-curr="' + escHtml(d.waerk) + '"' +
              ' onclick="event.stopPropagation()"' +
              ' onchange="onCardCbChange(this)">';
```

Edit 4c — chevron tidak bubble ke card-top. Old:
```js
      html += '<span class="card-chevron"' +
              ' onclick="toggleCard(\'' + d.ebeln + '\')">&#8964;</span>';
```
New:
```js
      html += '<span class="card-chevron"' +
              ' onclick="event.stopPropagation();toggleCard(\'' +
              d.ebeln + '\')">&#8964;</span>';
```

(Nomor PO `card-num` sudah `stopPropagation` — tidak berubah.)

- [ ] **Step 5: Sinkronkan FAB pada setiap render list**

Di akhir `renderCardListOnly`, old:
```js
  var countEl = document.querySelector('.pg-count');
  if (countEl) {
    countEl.textContent = filteredData.length !== curData.length
      ? filteredData.length + ' of ' + curData.length + ' Purchase Orders'
      : curData.length + ' Purchase Orders';
  }
}
```
New:
```js
  var countEl = document.querySelector('.pg-count');
  if (countEl) {
    countEl.textContent = filteredData.length !== curData.length
      ? filteredData.length + ' of ' + curData.length + ' Purchase Orders'
      : curData.length + ' Purchase Orders';
  }

  updateFabCount();
}
```

- [ ] **Step 6: toggleAll ikut update highlight + counter**

Old:
```js
function toggleAll() {
  selAll = !selAll;
  document.querySelectorAll('.card-cb').forEach(function(cb) {
    var card = cb.closest('.po-card');
    if (card && card.style.display !== 'none') cb.checked = selAll;
  });
  var btn = document.getElementById('btnSelAll');
  if (btn) btn.innerHTML = selAll
    ? '&#9745; Deselect All'
    : '&#9744; Select All';
}
```

New:
```js
function toggleAll() {
  selAll = !selAll;
  document.querySelectorAll('.card-cb').forEach(function(cb) {
    var card = cb.closest('.po-card');
    if (card && card.style.display !== 'none') {
      cb.checked = selAll;
      card.classList.toggle('selected', selAll);
    }
  });
  var btn = document.getElementById('btnSelAll');
  if (btn) btn.innerHTML = selAll
    ? '&#9745; Deselect All'
    : '&#9744; Select All';
  updateFabCount();
}
```

- [ ] **Step 7: submitAction pakai helper totals (hasil identik)**

Old:
```js
  var totals = {};
  cbs.forEach(function(cb) {
    var rawAmt = cb.dataset.amount || '0';
    var curr   = (cb.dataset.curr || '').toUpperCase();
    var a      = parseAbapNum(rawAmt) || 0;
    if (ZERO_DEC_CURRENCIES.indexOf(curr) > -1) a = Math.round(a * 100);
    if (!totals[curr]) totals[curr] = 0;
    totals[curr] += a;
  });
```

New:
```js
  var totals = computeSelectedTotals().totals;
```

- [ ] **Step 8: Verifikasi sintaks**

Run: `node "ZPO_REL_BSP/tools/check-js.js"`
Expected: `JS SYNTAX OK`

- [ ] **Step 9: Commit**

```bash
git add "ZPO_REL_BSP/Page with FLow Logic/main.htm"
git commit -m "feat(ui): highlight kartu terpilih + counter seleksi live di FAB

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 6: Dialog konfirmasi custom (spec 2b)

**Files:**
- Modify: `ZPO_REL_BSP/Page with FLow Logic/main.htm` (CSS setelah section MODAL ±1835; HTML setelah `#poModal` ±1939; `submitAction`; `doLogout` ±4001)

**Interfaces:**
- Consumes: pola `.modal`/`.modal-box` (existing), `showToast` (existing), `computeSelectedTotals` (Task 5).
- Produces: `showConfirm(opts, onYes)` dengan `opts = { title, bodyHtml, yesLabel, yesClass }` (`yesClass`: `'rel'`|`'rej'`|`''`); `closeConfirm()`; `confirmYes()`; `doBulkSubmit(action, cbs)` (berisi kode submit lama tanpa perubahan); `doLogoutNow()` (berisi kode logout lama tanpa perubahan).

- [ ] **Step 1: Tambah CSS dialog konfirmasi**

Sisipkan setelah rule `.modal-title { ... }` (akhir section MODAL):

```css
/* ── CONFIRM DIALOG ── */
.confirm-title { font-size:16px; font-weight:700; margin-bottom:12px; }
.confirm-body  { font-size:13px; color:#374151; margin-bottom:18px; }
.confirm-body table { width:100%; border-collapse:collapse; margin-top:8px; }
.confirm-body td {
  padding:6px 8px; border-bottom:1px solid #f3f4f6; font-size:13px;
}
.confirm-body td.num { text-align:right; font-weight:700; }
.confirm-actions { display:flex; justify-content:flex-end; gap:8px; }
.btn-confirm-cancel {
  height:38px; padding:0 16px; border:1px solid var(--border);
  background:#fff; border-radius:8px; font-family:inherit;
  font-size:13px; font-weight:600; color:#374151; cursor:pointer;
  transition:background .12s;
}
.btn-confirm-cancel:hover { background:#f9fafb; }
.btn-confirm-yes {
  height:38px; padding:0 18px; border:none; border-radius:8px;
  font-family:inherit; font-size:13px; font-weight:600;
  color:#fff; cursor:pointer; background:var(--primary);
  transition:opacity .15s;
}
.btn-confirm-yes.rel { background:var(--success); }
.btn-confirm-yes.rej { background:var(--danger); }
.btn-confirm-yes:hover { opacity:.88; }
```

- [ ] **Step 2: Tambah HTML dialog**

Sisipkan setelah penutup `#poModal`, old:
```html
<div class="modal" id="poModal"
     onclick="if(event.target===this)closeModal()">
  <div class="modal-box">
    <button class="modal-close" onclick="closeModal()">&#10005;</button>
    <div id="modalBody"></div>
  </div>
</div>
```
New:
```html
<div class="modal" id="poModal"
     onclick="if(event.target===this)closeModal()">
  <div class="modal-box">
    <button class="modal-close" onclick="closeModal()">&#10005;</button>
    <div id="modalBody"></div>
  </div>
</div>

<div class="modal" id="confirmModal"
     onclick="if(event.target===this)closeConfirm()">
  <div class="modal-box" style="max-width:420px;">
    <div class="confirm-title" id="confirmTitle"></div>
    <div class="confirm-body" id="confirmBody"></div>
    <div class="confirm-actions">
      <button type="button" class="btn-confirm-cancel"
              onclick="closeConfirm()">Batal</button>
      <button type="button" class="btn-confirm-yes"
              id="confirmYesBtn" onclick="confirmYes()">Ya</button>
    </div>
  </div>
</div>
```

- [ ] **Step 3: Tambah API showConfirm**

Sisipkan tepat SEBELUM `function showToast(type, message) {`:

```js
/* ── Confirm dialog generik (pengganti window.confirm) ── */
var confirmCallback = null;

function showConfirm(opts, onYes) {
  confirmCallback = onYes;
  document.getElementById('confirmTitle').innerHTML =
    opts.title || 'Konfirmasi';
  document.getElementById('confirmBody').innerHTML =
    opts.bodyHtml || '';
  var yesBtn = document.getElementById('confirmYesBtn');
  yesBtn.textContent = opts.yesLabel || 'Ya';
  yesBtn.className   = 'btn-confirm-yes' +
                       (opts.yesClass ? ' ' + opts.yesClass : '');
  document.getElementById('confirmModal').classList.add('show');
}

function closeConfirm() {
  confirmCallback = null;
  document.getElementById('confirmModal').classList.remove('show');
}

function confirmYes() {
  var cb = confirmCallback;
  closeConfirm();
  if (cb) cb();
}
```

- [ ] **Step 4: Ganti validasi alert dengan toast di submitAction**

Old:
```js
  var cbs = document.querySelectorAll('.card-cb:checked');
  if (cbs.length === 0) { alert('Select at least one PO.'); return; }

  if (action === 'BULK_REJ') {
    var cm = document.getElementById('commentInput').value.trim();
    if (!cm) { alert('Please enter a reject reason.'); return; }
  }
```

New:
```js
  var cbs = document.querySelectorAll('.card-cb:checked');
  if (cbs.length === 0) {
    showToast('E', 'Select at least one PO.');
    return;
  }

  if (action === 'BULK_REJ') {
    var cm = document.getElementById('commentInput').value.trim();
    if (!cm) {
      showToast('E', 'Please enter a reject reason.');
      return;
    }
  }
```

- [ ] **Step 5: Ganti confirm(msg) dengan dialog + pecah doBulkSubmit**

Old:
```js
  var msg = 'Selected: ' + cbs.length + ' PO\nTotal Amount:\n';
  for (var c in totals) {
    msg += c + ' : ' +
      totals[c].toLocaleString('id-ID',
        { minimumFractionDigits:0, maximumFractionDigits:0 }) + '\n';
  }
  msg += '\nProceed with ' +
         (action === 'BULK_REL' ? 'RELEASE' : 'REJECT') + '?';
  if (!confirm(msg)) return;

  var formData = new FormData();
```

New:
```js
  var body = '<div>Selected: <b>' + cbs.length + ' PO</b></div>' +
             '<table>';
  for (var c in totals) {
    body += '<tr><td>' + escHtml(c) + '</td><td class="num">' +
            totals[c].toLocaleString('id-ID',
              { minimumFractionDigits:0, maximumFractionDigits:0 }) +
            '</td></tr>';
  }
  body += '</table>';

  showConfirm({
    title:    action === 'BULK_REL'
              ? 'Release PO terpilih?'
              : 'Reject PO terpilih?',
    bodyHtml: body,
    yesLabel: action === 'BULK_REL' ? 'Ya, Release' : 'Ya, Reject',
    yesClass: action === 'BULK_REL' ? 'rel' : 'rej'
  }, function() { doBulkSubmit(action, cbs); });
}

function doBulkSubmit(action, cbs) {
  var formData = new FormData();
```

(Seluruh sisa isi `submitAction` lama — dari `var formData` sampai `xhr.send(formData);` — kini menjadi isi `doBulkSubmit` TANPA perubahan apa pun selain dua penggantian alert di Step 6.)

- [ ] **Step 6: Ganti alert error XHR dengan toast**

Old:
```js
    var resp;
    try { resp = JSON.parse(xhr.responseText); }
    catch(e) { alert('Error parsing server response.'); return; }
```
New:
```js
    var resp;
    try { resp = JSON.parse(xhr.responseText); }
    catch(e) {
      showToast('E', 'Error parsing server response.');
      return;
    }
```

Old:
```js
  xhr.onerror = function() {
    document.getElementById('lo').classList.remove('show');
    alert('Network error. Please try again.');
  };
```
New:
```js
  xhr.onerror = function() {
    document.getElementById('lo').classList.remove('show');
    showToast('E', 'Network error. Please try again.');
  };
```

- [ ] **Step 7: Logout pakai dialog**

Old:
```js
function doLogout() {
  if (!confirm('Yakin ingin logout?')) return;
  sessionStorage.setItem('logged_out', '1');
```

New:
```js
function doLogout() {
  showConfirm({
    title:    'Logout',
    bodyHtml: 'Yakin ingin logout?',
    yesLabel: 'Ya, Logout',
    yesClass: 'rej'
  }, doLogoutNow);
}

function doLogoutNow() {
  sessionStorage.setItem('logged_out', '1');
```

(Sisa isi `doLogout` lama — fetch logoff + XHR re-login + redirect — menjadi isi `doLogoutNow` tanpa perubahan.)

- [ ] **Step 8: Verifikasi sintaks**

Run: `node "ZPO_REL_BSP/tools/check-js.js"`
Expected: `JS SYNTAX OK`

Cek juga tidak ada `alert(`/`confirm(` tersisa di blok JS:
Run: `grep -n "alert(\|confirm(" "ZPO_REL_BSP/Page with FLow Logic/main.htm"`
Expected: hanya hasil `showConfirm(`/`closeConfirm(`/`confirmYes(`/`confirmModal` — tidak ada `window.confirm`/`alert` murni.

- [ ] **Step 9: Commit**

```bash
git add "ZPO_REL_BSP/Page with FLow Logic/main.htm"
git commit -m "feat(ui): dialog konfirmasi custom pengganti alert/confirm bawaan

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 7: Toast animasi keluar + transisi expand + focus-visible (spec 2c)

**Files:**
- Modify: `ZPO_REL_BSP/Page with FLow Logic/main.htm` (CSS section TOAST ±1778–1792 & PO CARDS ±1662; `showToast` ±3849–3859)

**Interfaces:**
- Consumes: `escHtml` (existing).
- Produces: `showToast(type, message)` — signature & timing tetap (auto-hide 4 detik), kini dengan ikon, progress bar, dan animasi keluar.

- [ ] **Step 1: CSS toast baru**

Old:
```css
.toast {
  position:fixed; top:70px; right:20px; background:#fff;
  border-radius:10px; padding:13px 18px;
  box-shadow:0 4px 20px rgba(0,0,0,.13);
  font-size:14px; font-weight:600;
  display:flex; align-items:center; gap:10px;
  z-index:9999; max-width:360px; animation:slideIn .28s ease;
}
.toast-s { border-left:4px solid var(--success); color:var(--success); }
.toast-e { border-left:4px solid var(--danger);  color:var(--danger);  }
@keyframes slideIn {
  from { opacity:0; transform:translateX(16px); }
  to   { opacity:1; transform:translateX(0); }
}
```

New:
```css
.toast {
  position:fixed; top:70px; right:20px; background:#fff;
  border-radius:10px; padding:13px 18px;
  box-shadow:0 4px 20px rgba(0,0,0,.13);
  font-size:14px; font-weight:600;
  display:flex; align-items:center; gap:10px;
  z-index:9999; max-width:360px; animation:slideIn .28s ease;
  overflow:hidden;
}
.toast-s { border-left:4px solid var(--success); color:var(--success); }
.toast-e { border-left:4px solid var(--danger);  color:var(--danger);  }
.toast.hide { animation:slideOut .3s ease forwards; }
.toast-ico {
  width:20px; height:20px; border-radius:50%; flex-shrink:0;
  display:flex; align-items:center; justify-content:center;
  font-size:11px; color:#fff;
}
.toast-s .toast-ico { background:var(--success); }
.toast-e .toast-ico { background:var(--danger); }
.toast-bar {
  position:absolute; left:0; bottom:0; height:3px;
  background:currentColor; opacity:.35;
  animation:toastBar 4s linear forwards;
}
@keyframes slideIn {
  from { opacity:0; transform:translateX(16px); }
  to   { opacity:1; transform:translateX(0); }
}
@keyframes slideOut {
  from { opacity:1; transform:translateX(0); }
  to   { opacity:0; transform:translateX(16px); }
}
@keyframes toastBar { from { width:100%; } to { width:0; } }
```

- [ ] **Step 2: showToast dengan ikon + progress + animasi keluar**

Old:
```js
function showToast(type, message) {
  var existing = document.getElementById('toastMsg');
  if (existing) existing.remove();
  var toast       = document.createElement('div');
  toast.id        = 'toastMsg';
  toast.className = 'toast ' + (type === 'S' ? 'toast-s' : 'toast-e');
  toast.innerHTML = (type === 'S' ? '&#10003; ' : '&#10007; ') +
                    escHtml(message);
  document.body.appendChild(toast);
  setTimeout(function() { toast.style.display = 'none'; }, 4000);
}
```

New:
```js
function showToast(type, message) {
  var existing = document.getElementById('toastMsg');
  if (existing) existing.remove();
  var toast       = document.createElement('div');
  toast.id        = 'toastMsg';
  toast.className = 'toast ' + (type === 'S' ? 'toast-s' : 'toast-e');
  toast.innerHTML =
    '<span class="toast-ico">' +
    (type === 'S' ? '&#10003;' : '&#10007;') + '</span>' +
    '<span>' + escHtml(message) + '</span>' +
    '<span class="toast-bar"></span>';
  document.body.appendChild(toast);
  setTimeout(function() {
    toast.classList.add('hide');
    setTimeout(function() { toast.remove(); }, 300);
  }, 4000);
}
```

- [ ] **Step 3: Transisi expand detail kartu**

Old:
```css
.po-card.expanded .card-detail { display:block; }
```

New:
```css
.po-card.expanded .card-detail { display:block; animation:detailIn .18s ease; }
@keyframes detailIn {
  from { opacity:0; transform:translateY(-4px); }
  to   { opacity:1; transform:translateY(0); }
}
```

- [ ] **Step 4: Focus-visible ring**

Sisipkan di akhir `<style>` (sebelum `</style>`):

```css
/* ── A11Y FOCUS ── */
button:focus-visible, input:focus-visible,
select:focus-visible, a:focus-visible {
  outline:2px solid var(--primary);
  outline-offset:2px;
}
```

- [ ] **Step 5: Verifikasi sintaks**

Run: `node "ZPO_REL_BSP/tools/check-js.js"`
Expected: `JS SYNTAX OK`

- [ ] **Step 6: Commit**

```bash
git add "ZPO_REL_BSP/Page with FLow Logic/main.htm"
git commit -m "feat(ui): toast dengan ikon/progress/exit animation, transisi expand, focus ring

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 8: Detail kecil — skeleton, clear search, scrollbar, hover (spec 2d)

**Files:**
- Modify: `ZPO_REL_BSP/Page with FLow Logic/main.htm` (CSS; `switchHistory` ±2407–2415; `renderCardListOnly` bagian empty state; fungsi baru `renderHistSkeleton`/`clearSearch`)

**Interfaces:**
- Consumes: `renderCardListOnly()` (existing), elemen `#searchPO`, `#histContainer`.
- Produces: `renderHistSkeleton()` → string HTML skeleton; `clearSearch()` — kosongkan input search & render ulang.

- [ ] **Step 1: CSS skeleton + scrollbar**

Sisipkan di akhir `<style>` (setelah blok A11Y FOCUS dari Task 7):

```css
/* ── SKELETON ── */
.skel-card {
  background:#fff; border:1px solid var(--border);
  border-radius:12px; margin-bottom:10px; padding:16px 18px;
}
.skel-line {
  height:12px; border-radius:6px;
  background:linear-gradient(90deg,#f3f4f6 25%,#e9eaef 37%,#f3f4f6 63%);
  background-size:400% 100%;
  animation:skelShimmer 1.2s ease infinite;
  margin-bottom:10px;
}
.skel-line:last-child { margin-bottom:0; }
@keyframes skelShimmer {
  from { background-position:100% 0; }
  to   { background-position:-100% 0; }
}

/* ── THIN SCROLLBAR ── */
.sidebar::-webkit-scrollbar, .modal-box::-webkit-scrollbar { width:8px; }
.sidebar::-webkit-scrollbar-thumb, .modal-box::-webkit-scrollbar-thumb {
  background:#d1d5db; border-radius:4px;
}
.sidebar::-webkit-scrollbar-thumb:hover,
.modal-box::-webkit-scrollbar-thumb:hover { background:#9ca3af; }
.sidebar::-webkit-scrollbar-track,
.modal-box::-webkit-scrollbar-track { background:transparent; }
```

- [ ] **Step 2: Hover kartu lebih halus**

Old:
```css
.po-card {
  background:#fff; border:1px solid var(--border);
  border-radius:12px; margin-bottom:10px; overflow:hidden;
  transition: box-shadow .18s, opacity .3s, max-height .4s;
}
.po-card:hover { box-shadow:0 3px 14px rgba(0,0,0,.07); }
```

New:
```css
.po-card {
  background:#fff; border:1px solid var(--border);
  border-radius:12px; margin-bottom:10px; overflow:hidden;
  transition: box-shadow .18s, opacity .3s, max-height .4s, transform .18s;
}
.po-card:hover {
  box-shadow:0 4px 16px rgba(17,24,39,.06);
  transform:translateY(-1px);
}
```

- [ ] **Step 3: Skeleton untuk loading history**

Di `switchHistory`, old:
```js
    '<div id="histContainer">' +
    '<div style="text-align:center;padding:60px;color:var(--muted);">' +
    '<div class="lo-spin" style="margin:0 auto 12px;"></div>' +
    'Loading data...</div></div>';
```

New:
```js
    '<div id="histContainer">' +
    renderHistSkeleton() +
    '</div>';
```

Lalu sisipkan fungsi baru tepat SEBELUM `function switchHistory(plant, mode) {`:

```js
/* Skeleton shimmer untuk state loading history */
function renderHistSkeleton() {
  var html = '';
  for (var i = 0; i < 3; i++) {
    html += '<div class="skel-card">' +
            '<div class="skel-line" style="width:40%;"></div>' +
            '<div class="skel-line" style="width:70%;"></div>' +
            '<div class="skel-line" style="width:55%;"></div>' +
            '</div>';
  }
  return html;
}
```

(Loading OGR ±baris 2440–2444 TIDAK diubah — fitur nonaktif, di luar scope.)

- [ ] **Step 4: Tombol bersihkan pencarian di empty state**

Di `renderCardListOnly`, old:
```js
    html += '<div class="empty" style="padding:40px 20px;">';
    html += '<div class="empty-ico">&#128270;</div>';
    html += '<div class="empty-txt">No results found</div></div>';
```

New:
```js
    html += '<div class="empty" style="padding:40px 20px;">';
    html += '<div class="empty-ico">&#128270;</div>';
    html += '<div class="empty-txt">No results found</div>';
    html += '<button type="button" class="btn-exp"' +
            ' style="margin:14px auto 0;"' +
            ' onclick="clearSearch()">Bersihkan pencarian</button>';
    html += '</div>';
```

Lalu sisipkan fungsi baru tepat SETELAH penutup fungsi `onSearchChange` (setelah `}` yang mengakhirinya):

```js
function clearSearch() {
  var el = document.getElementById('searchPO');
  if (el) el.value = '';
  currentPage = 1;
  renderCardListOnly();
}
```

- [ ] **Step 5: Verifikasi sintaks**

Run: `node "ZPO_REL_BSP/tools/check-js.js"`
Expected: `JS SYNTAX OK`

- [ ] **Step 6: Commit**

```bash
git add "ZPO_REL_BSP/Page with FLow Logic/main.htm"
git commit -m "feat(ui): skeleton loading history, clear search, scrollbar tipis, hover halus

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 9: Update dokumentasi + verifikasi akhir

**Files:**
- Modify: `ZPO_REL_BSP/doc.md` (section 5.4 dan 11)

**Interfaces:**
- Consumes: seluruh fungsi baru dari Task 1–8.
- Produces: dokumentasi ter-update; tidak ada API baru.

- [ ] **Step 1: Tambah fungsi baru ke doc.md section 5.4**

Tambahkan tabel baru setelah tabel "Utility" di section 5.4:

```markdown
#### Optimalisasi & UI (ditambahkan 2026-07-16)
| Fungsi | Deskripsi |
|---|---|
| `buildDataIndexes()` | Bangun `ITEM_INDEX`/`REMARK_INDEX` (ebeln → items/remark) sekali; dipanggil saat init & setelah bulk action |
| `buildSidebarCounts()` | Bangun cache `SIDEBAR_COUNTS` untuk badge sidebar dari satu loop `ALL_DATA1` |
| `updateHistBadges(plant)` | Update badge history release/reject in-place tanpa re-render sidebar |
| `buildCardDetailHtml(ebeln)` | Bangun HTML detail kartu (tabel item + remark) — dipakai lazy render |
| `ensureCardDetail(card)` | Render isi detail kartu sekali saat pertama di-expand |
| `computeSelectedTotals()` | Hitung jumlah PO terpilih + total per currency dari checkbox |
| `updateFabCount()` | Update chip counter seleksi di FAB |
| `onCardCbChange(cb)` | Handler perubahan checkbox: highlight kartu + update FAB |
| `cardTopClick(ev, ebeln)` | Klik area atas kartu men-toggle checkbox |
| `showConfirm(opts, onYes)` | Dialog konfirmasi custom (pengganti `window.confirm`) |
| `closeConfirm()` / `confirmYes()` | Tutup / eksekusi callback dialog konfirmasi |
| `doBulkSubmit(action, cbs)` | Kirim bulk release/reject (isi lama `submitAction` setelah konfirmasi) |
| `doLogoutNow()` | Eksekusi logout (isi lama `doLogout` setelah konfirmasi) |
| `renderHistSkeleton()` | Skeleton shimmer untuk loading history |
| `clearSearch()` | Kosongkan input search & render ulang daftar |
```

- [ ] **Step 2: Tambah catatan di doc.md section 11**

Tambahkan bullet berikut di akhir section "11. Catatan Pengembangan":

```markdown
- Optimalisasi 2026-07-16: lookup item/remark memakai index map (`ITEM_INDEX`/`REMARK_INDEX`), count sidebar memakai cache (`SIDEBAR_COUNTS`) — keduanya di-rebuild setelah bulk action; detail kartu di-render lazy saat pertama kali expand; badge history di-update in-place. Konfirmasi bulk action & logout memakai dialog custom (bukan `confirm()` browser); notifikasi validasi memakai toast (bukan `alert()`).
- Tool pendukung: `tools/check-js.js` (Node) — validasi sintaks blok `<script>` main.htm sebelum paste ke SE80.
```

- [ ] **Step 3: Verifikasi akhir menyeluruh**

Run: `node "ZPO_REL_BSP/tools/check-js.js"`
Expected: `JS SYNTAX OK`

Pastikan blok ABAP tidak tersentuh:
Run: `git diff main -- "ZPO_REL_BSP/Page with FLow Logic/main.htm" | head -50` — atau bandingkan: seluruh hunk diff harus berada di baris > 1343 (CSS/HTML/JS). Tidak boleh ada hunk pada baris 1–1343.

Checklist manual SE80 (dari spec, dijalankan user setelah paste):
1. Buka tiap potype kedua plant → daftar & count sidebar benar.
2. Expand satu kartu & Expand All → tabel item + remark benar.
3. Search, page size, pagination → hasil identik.
4. Centang PO → highlight + counter FAB akurat; klik area kartu men-toggle.
5. Bulk Release & Reject via dialog baru → PO hilang, count update, expand kartu lain tetap benar.
6. History Release/Reject: skeleton tampil, filter/search/pagination/expand normal.
7. Logout via dialog baru.
8. Badge history muncul tanpa flicker sidebar.

- [ ] **Step 4: Commit**

```bash
git add "ZPO_REL_BSP/doc.md"
git commit -m "docs: dokumentasikan fungsi optimalisasi & UI polish baru

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```
