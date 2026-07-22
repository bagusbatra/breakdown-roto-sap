/* ================================================================
   app-detail.js — ZPO_REL_BSP
   Modul pagination + expand/collapse kartu + detail item PO +
   seleksi + FAB. Ini modul LYNCHPIN: app-list.js (Task 7) dan
   app-history.js (Task 8) sudah memanggil fungsi-fungsi di sini
   sebagai forward-ref (aman krn app-detail.js dimuat PALING AKHIR
   di antara ketiganya, lihat urutan <script> index.htm — semua
   forward-ref hanya terpicu lewat interaksi user setelah boot
   selesai).

   PORT dari ZPR_REL_BSP/MIMEs/app-detail.js, diremap ke domain PO
   (lihat .superpowers/sdd/zpo-data-schema.md):
   - `banfn` -> `ebeln` di seluruh modul (seleksi, pagination,
     expand/collapse, loadDetail).
   - `selBanfns` -> `selEbelns`. Beda dari ZPR (yang mendeklarasikan
     `selBanfns` di app-core.js): app-ui.js ZPO SENGAJA TIDAK
     mendeklarasikan `selEbelns` (lihat komentar switchView() di
     sana) — modul ini adalah pemiliknya, dideklarasikan `var` SEKALI
     di bawah. switchView() me-reset `selEbelns={}` tanpa `var`
     (assignment ke variabel global yang sudah ada di scope saat itu).
   - Gate `isApprover` (ZPR) DIBUANG — app release PO ini satu peran
     (user yang bisa akses = yang berwenang release), sama seperti
     keputusan Task 7 di app-list.js (checkbox & grup aksi massal
     SELALU tampil, tidak kondisional). `toggleSelect`/`toggleSelectAll`
     jadi tanpa guard `if (!isApprover) return;`.
   - `pageSize`/`filteredData`/`curPage` TIDAK dideklarasikan ulang
     di sini — sudah dideklarasikan `var pageSize`/`var filteredData`
     di app-list.js dan `var curPage` di app-ui.js (dimuat sebelum
     modul ini), dipakai langsung sbg referensi ke variabel global yg
     sama (persis pola ZPR: pageSize/filteredData/curPage juga bukan
     milik app-detail.js ZPR, melainkan app-core.js ZPR).
   - `loadDetail(ebeln)`: Task 9 (GET_DETAIL) DISKIP (lihat
     zpo-data-schema.md, "Task 9 GET_DETAIL — DISKIP"). ZPR
     melakukan `fetch(API_URL+'?action=GET_DETAIL&banfn=...')`
     (network call terpisah tiap expand). ZPO TIDAK — `ALL_DATA2`
     (state klien, diisi app-list.js via GET_LIST) SUDAH memuat
     SEMUA item semua PO sekaligus (identik array inject lama
     `ALL_DATA2` main.htm), jadi di sini cukup FILTER client-side,
     tanpa call jaringan apa pun, tanpa flag `dataset.loaded` yang
     mem-block re-render (state ALL_DATA2 tidak berubah selama satu
     sesi list, jadi re-filter murah & selalu konsisten).
   - Kolom tabel detail item ZPR (`bnfpo`,`matnr`,`maktx`/`txz01`,
     `menge`,`meins`,`preis`,`total`,`waers`,`lfdat`) DIGANTI kolom
     data2 PO yang sesungguhnya ada (lihat zpo-data-schema.md &
     verifikasi langsung ke serialisasi `lv_json2` main.htm baris
     ~1321-1330): `ebelp`,`maktx`,`menge`,`meins`,`nettt`,`netwr`,
     `waerk`. TIDAK ADA `matnr` (material code) atau tanggal butuh
     (`lfdat`) di data2 ZPO — kolom itu DIBUANG (bukan diisi '-').
     `nettt`=harga per unit, `netwr`=total baris (dikonfirmasi dari
     legacy `buildCardDetailHtml()` main.htm baris ~3958-3978, pola
     port yang sama & terverifikasi: `formatNum(it.nettt,it.waerk)`
     lalu `formatNum(it.netwr,it.waerk)`, currency ditampilkan
     terpisah lewat kolom/chip sendiri — makanya dipakai `formatNum`
     BUKAN `formatAmount` di sini, supaya angka tidak dobel-tampil
     currency-nya (formatAmount menambahkan suffix currency sendiri).
   - Item text (long-text) TIDAK dirender inline di tabel detail
     (ZPR juga tidak) — sudah difasilitasi `showItemTextModal(ebeln)`
     (app-ui.js, Task 2/5) yang membaca `ALL_DATA2[].text` lewat
     modal terpisah `#modalItemText`; TIDAK diredefinisikan di sini.
   - `renderPagination()`: teks "Menampilkan semua N PR" (ZPR) ->
     "Menampilkan semua N PO".
   - `updateFabInfo()`: teks "N PR dipilih" (ZPR) -> "N PO dipilih".
   ================================================================ */
'use strict';

/* ================================================================
   STATE — dimiliki modul ini. app-ui.js `switchView()` me-reset
   `selEbelns={}` (assignment tanpa `var`, lihat komentar di sana)
   setiap kali pindah plant/kategori/mode; aman krn switchView hanya
   dipicu klik user setelah semua <script> (termasuk file ini)
   selesai dimuat.
   ================================================================ */
var selEbelns = {};

/* ================================================================
   PAGINATION — satu pembangun dipakai bersama oleh list pending
   (goPage) dan history (histGoPage, app-history.js).
   ================================================================ */
function pgBtn(handler, page, label, icon, disabled, current) {
  var inner = icon ? svgIcon(icon, 'ico-sm') : label;
  return '<button type="button" class="pg-btn"' +
    (current ? ' aria-current="page"' : '') +
    (disabled ? ' disabled' : '') +
    (icon ? ' aria-label="' + escHtml(label) + '"' : '') +
    ' onclick="' + handler + '(' + page + ')">' + inner + '</button>';
}

function buildPagination(total, totalPages, start, end, curPg, handler) {
  var html = '<div class="pagination-bar">';

  html += pgBtn(handler, 1, 'Halaman pertama', 'i-chevrons-left', curPg <= 1, false);
  html += pgBtn(handler, curPg - 1, 'Halaman sebelumnya', 'i-chevron-left', curPg <= 1, false);

  var sp = Math.max(1, curPg - 2);
  var ep = Math.min(totalPages, curPg + 2);

  if (sp > 1) {
    html += pgBtn(handler, 1, '1', null, false, false);
    if (sp > 2) html += '<span class="pg-info">...</span>';
  }
  for (var i = sp; i <= ep; i++) {
    html += pgBtn(handler, i, '' + i, null, false, i === curPg);
  }
  if (ep < totalPages) {
    if (ep < totalPages - 1) html += '<span class="pg-info">...</span>';
    html += pgBtn(handler, totalPages, '' + totalPages, null, false, false);
  }

  html += pgBtn(handler, curPg + 1, 'Halaman berikutnya', 'i-chevron-right', curPg >= totalPages, false);
  html += pgBtn(handler, totalPages, 'Halaman terakhir', 'i-chevrons-right', curPg >= totalPages, false);

  html += '<span class="pg-info">' + (start + 1) + '&ndash;' + end + ' dari ' + total + '</span>';
  html += '</div>';
  return html;
}

function renderPagination(total, totalPages, start, end) {
  if (pageSize === 0 || totalPages <= 1) {
    return '<div class="pagination-bar">' +
           '<span class="pg-info">Menampilkan semua ' + total + ' PO</span></div>';
  }
  return buildPagination(total, totalPages, start, end, curPage, 'goPage');
}

function goPage(pg) {
  var tp = pageSize === 0 ? 1
    : Math.ceil(filteredData.length / pageSize) || 1;
  if (pg < 1) pg = 1;
  if (pg > tp) pg = tp;
  curPage = pg; selEbelns = {};
  renderList(); window.scrollTo(0, 0);
}

function changePageSize(val) {
  pageSize = val; curPage = 1;
  selEbelns = {}; renderList();
}

function onSearchTrigger(val) {
  searchKw = val.trim(); curPage = 1;
  selEbelns = {}; renderList();
}

/* ================================================================
   EXPAND / COLLAPSE
   ================================================================ */
/* Satu-satunya tempat kelas .expanded diubah, supaya aria-expanded
   pada tombol chevron tidak pernah tertinggal dari kondisi visual.
   Dipakai juga oleh app-history.js (toggleHistExpand/histExpandAll/
   histCollapseAll). */
function setCardExpanded(card, on) {
  if (!card) return;
  card.classList.toggle('expanded', on);
  var btn = card.querySelector('.card-expand');
  if (btn) btn.setAttribute('aria-expanded', on ? 'true' : 'false');
}

function toggleExpand(ebeln) {
  var card = document.getElementById('card_' + ebeln);
  if (!card) return;
  var wasExp = card.classList.contains('expanded');
  setCardExpanded(card, !wasExp);
  if (!wasExp) loadDetail(ebeln);
}

function expandAll() {
  allExpanded = true;
  var s = pageSize === 0 ? 0 : (curPage - 1) * pageSize;
  var e = pageSize === 0 ? filteredData.length
    : Math.min(s + pageSize, filteredData.length);
  for (var i = s; i < e; i++) {
    var card = document.getElementById('card_' + filteredData[i].ebeln);
    if (card) {
      setCardExpanded(card, true);
      loadDetail(filteredData[i].ebeln);
    }
  }
}

function collapseAll() {
  allExpanded = false;
  document.querySelectorAll('#cardContainer .po-card')
    .forEach(function(c) { setCardExpanded(c, false); });
}

function toggleExpandAll() {
  if (allExpanded) { collapseAll(); }
  else { expandAll(); }
  var btn = document.getElementById('btnToggleExpand');
  if (btn) btn.innerHTML =
    svgIcon('i-chevron-down') + ' ' +
    (allExpanded ? 'Tutup Semua' : 'Buka Semua');
}

/* ================================================================
   LOAD DETAIL — item PO dari state klien ALL_DATA2 (GET_LIST, Task
   6/7). Task 9 (GET_DETAIL) DISKIP: ALL_DATA2 sudah memuat SEMUA
   item semua PO, jadi di sini cukup filter by ebeln, TANPA network
   call (lihat komentar header file & zpo-data-schema.md).
   ================================================================ */
function currencyChipClass(w) {
  if (w === 'IDR') return 'chip chip-cur';
  if (w === 'USD') return 'chip chip-cur chip-cur--usd';
  return 'chip chip-cur chip-cur--alt';
}

function loadDetail(ebeln) {
  var el = document.getElementById('detContent_' + ebeln);
  if (!el) return;

  var items = (ALL_DATA2 || []).filter(function(it) {
    return it.ebeln === ebeln;
  });

  if (items.length === 0) {
    el.innerHTML = '<div class="card-detail-msg">Tidak ada item.</div>';
    return;
  }

  items = items.slice().sort(function(a, b) {
    return (parseInt(a.ebelp, 10) || 0) - (parseInt(b.ebelp, 10) || 0);
  });

  var html =
    '<div class="card-detail-scroll">' +
    '<table><thead><tr>' +
    '<th>Item</th>' +
    '<th>Deskripsi</th>' +
    '<th class="num">Jumlah</th>' +
    '<th>Satuan</th>' +
    '<th class="num">Harga/Unit</th>' +
    '<th class="num">Total</th>' +
    '<th>Mata Uang</th>' +
    '</tr></thead><tbody>';

  items.forEach(function(it) {
    var w = it.waerk || '';
    html += '<tr>';
    html += '<td class="cell-item">' + escHtml(it.ebelp) + '</td>';
    html += '<td class="cell-strong">' + escHtml(it.maktx || '-') + '</td>';
    html += '<td class="num">' + formatNum(it.menge) + '</td>';
    html += '<td><span class="chip chip-uom">' + escHtml(it.meins || '-') + '</span></td>';
    html += '<td class="num">' + formatNum(it.nettt, w) + '</td>';
    html += '<td class="num cell-total">' + formatNum(it.netwr, w) + '</td>';
    html += '<td><span class="' + currencyChipClass(w) + '">' + escHtml(w || '-') + '</span></td>';
    html += '</tr>';
  });
  html += '</tbody></table></div>';
  el.innerHTML = html;
}

/* ================================================================
   SELECT / DESELECT — gate `isApprover` (ZPR) DIBUANG, lihat
   komentar header file: checkbox & aksi massal SELALU tampil.
   ================================================================ */
function toggleSelect(ebeln) {
  if (selEbelns[ebeln]) delete selEbelns[ebeln];
  else selEbelns[ebeln] = true;
  updateFabInfo(); syncCheckboxes();
}

function toggleSelectAll() {
  var s = pageSize === 0 ? 0 : (curPage - 1) * pageSize;
  var e = pageSize === 0 ? filteredData.length
    : Math.min(s + pageSize, filteredData.length);

  var allSel = true;
  for (var i = s; i < e; i++) {
    if (!selEbelns[filteredData[i].ebeln]) { allSel = false; break; }
  }
  for (var j = s; j < e; j++) {
    var bn = filteredData[j].ebeln;
    if (allSel) delete selEbelns[bn];
    else selEbelns[bn] = true;
  }

  var btn = document.getElementById('btnSelAll');
  if (btn) btn.innerHTML = svgIcon(allSel ? 'i-check' : 'i-x') + ' ' +
    (allSel ? 'Pilih Semua' : 'Batal Pilih');

  updateFabInfo(); syncCheckboxes();
}

/* Checkbox dan penanda kartu (.selected) selalu disinkronkan bersama. */
function syncCheckboxes() {
  document.querySelectorAll('.card-cb').forEach(function(cb) {
    var on = !!selEbelns[cb.dataset.ebeln];
    cb.checked = on;
    var card = document.getElementById('card_' + cb.dataset.ebeln);
    if (card) card.classList.toggle('selected', on);
  });
}

/* Satu-satunya tempat jumlah PO terpilih diterjemahkan jadi UI.
   Dipanggil dari toggleSelect(), toggleSelectAll(), dan renderList()
   (app-list.js). */
function updateFabInfo() {
  var cnt = Object.keys(selEbelns).length;

  var el = document.getElementById('fabInfo');
  if (el) el.textContent = cnt + ' PO dipilih';

  /* Grup aksi di toolbar (#selActions, app-list.js) hanya tampil
     saat memang ada yang dipilih — tombol yang tidak bisa dipakai
     sebaiknya memang tidak ada. */
  var sa = document.getElementById('selActions');
  if (sa) sa.classList.toggle('show', cnt > 0);

  var sc = document.getElementById('selCount');
  if (sc) sc.textContent = cnt;
}
