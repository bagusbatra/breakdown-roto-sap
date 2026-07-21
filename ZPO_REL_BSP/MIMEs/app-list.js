/* ================================================================
   app-list.js — ZPO_REL_BSP
   Modul daftar PO pending-release: fetchList (GET_LIST), filter,
   search, page-size, getFiltered, renderList.

   PORT dari ZPR_REL_BSP/MIMEs/app-list.js, diremap ke domain PO
   (lihat .superpowers/sdd/zpo-data-schema.md untuk field mapping):
   - Kunci kartu `banfn` -> `ebeln`; `werks` -> `plant`; `waers` ->
     `waerk`; `ernam`/`ernam_full` (pembuat PR) -> `name1` (vendor PO).
   - `totals[]` (array multi-currency ZPR) -> `totpr`+`waerk` tunggal
     (ZPO satu PO = satu currency) — dirender inline dgn
     formatAmount() (app-core.js), BUKAN renderCardAmount(totals)
     ZPR (fungsi itu tak ada & tak relevan di app-core.js ZPO).
   - `item_count` (dikirim backend ZPR) -> dihitung sendiri dari
     ALL_DATA2 (ZPO GET_LIST tak mengirim count, lihat schema).
   - Filter `estkz`/MRP (ZPR) DIBUANG — data PO ZPO tak punya field
     estkz (keputusan Task 5, konsisten di sini).
   - Filter plant-sub (ZPR, utk sidebar multi-werks per grup) DIBUANG
     — POTYPE_MAP/BSART_POTYPE_MAP (app-ui.js) ZPO tak punya
     pengelompokan multi-plant seperti CATEGORY_DEF ZPR (lihat
     komentar header app-ui.js); curPlant SUDAH satu werks pasti,
     jadi tak ada sub-plant lagi utk difilter dalam satu kartu list.
     `curPlantSub`/`buildPlantSubSelect`/`onPlantSubFilter` ZPR tidak
     di-port (dead filter bila dipaksakan).
   - Gate `isApprover` (ZPR, PR punya alur approve terpisah dari
     lihat) DIBUANG — app release PO ini satu peran (user yg akses
     = yg berwenang release), sama seperti app-detail.js Task 10
     nanti; app lama (main.htm renderCardListOnly) juga selalu
     menampilkan checkbox tanpa gate. Checkbox & grup aksi massal
     toolbar SELALU tampil (bukan kondisional).
   - Approve -> Release: `showModalApprove()` ZPR -> `showModalRelease()`
     (nama sudah dipakai `index.htm` Task 2, lihat #fab & toolbar).
   - Sort: ZPO data1 TIDAK punya field tanggal (beda dari `badat` PR
     ZPR). Nomor PO (ebeln) SAP terbit sekuensial naik, jadi dipakai
     sbg proksi urutan waktu (ebeln lebih besar = PO lebih baru).
   - Push notification / deep-link (ZPR app-push: `deepLink`,
     `indexOfBanfn`, `applyDeepLink`) DIBUANG — di luar scope (lihat
     app-ui.js header & plan Global Constraints).

   Integrasi sidebar (Task 5 sengaja menyerahkan ke Task 7):
   app-ui.js `renderSidebar()` membaca `sbCounts.pending[plant][potype]`.
   `fetchList()` di sini mengisi ulang `sbCounts.pending` dari
   `ALL_DATA1` (dikelompokkan plant -> potype via BSART_POTYPE_MAP),
   lalu memanggil `renderSidebar()` supaya badge akurat.

   GET_LIST param `plant`/`potype` (Task 6, main.htm) DIBACA backend
   tapi TIDAK DIPAKAI memfilter — FM `Z_FM_YMMR068` selalu dipanggil
   utk KEDUA plant (1200 & 1300) tanpa syarat (lihat main.htm baris
   ~1048-1071 & ~1232-1290: lt_data1_1200/lt_data1_1300 selalu
   diisi, lv_plant/lv_potype tak pernah direferensikan lagi setelah
   dibaca). Jadi `fetchList()` mengambil SEMUA PO pending kedua
   plant sekali panggil, dan `getFiltered()` DI SINI yang memfilter
   ke plant+potype (bsart) yang sedang aktif di sidebar (client-side).
   Parameter plant/potype tetap dikirim (kontrak API, siap bila
   backend kelak benar-benar memfilter) meski saat ini diabaikan.

   Forward-refs (Task 10, app-detail.js — pagination, expand/collapse
   kartu, loadDetail, seleksi): `renderPagination`, `toggleExpand`,
   `toggleExpandAll`, `loadDetail`, `toggleSelect`, `toggleSelectAll`,
   `updateFabInfo`, `changePageSize`, `onSearchTrigger`. Aman dipanggil
   krn hanya terpicu interaksi user setelah semua <script> (termasuk
   app-detail.js, dimuat SETELAH app-list.js) selesai load.
   ================================================================ */
'use strict';

/* ================================================================
   STATE — dimiliki modul ini (app-core.js/app-ui.js ZPO tak
   mendeklarasikannya, beda dari app-core.js ZPR). `filteredData`
   dipakai lintas modul oleh Task 10 (pagination/expand/select
   bekerja atas potongan halaman aktif) — deklarasi DI SINI aman
   krn app-list.js dimuat sebelum app-detail.js (lihat urutan
   <script> index.htm).
   ================================================================ */
var pageSize     = 10;
var filteredData = [];

/* ================================================================
   ICON HELPER — app-core.js `svgIcon(id,cls)` mengikuti kontrak
   kanonis ZPR: `id` adalah id LENGKAP simbol sprite TERMASUK prefix
   'i-' (mis. 'i-cart'), `cls` opsional untuk kelas ukuran
   (ico-sm/ico-lg/ico-xl). Output selalu class="ico ..." (cocok
   dengan style.css). `getCategoryDef()` (app-ui.js) sudah
   mengembalikan icon berprefix 'i-' — dioper langsung ke svgIcon()
   tanpa pelucutan prefix.
   ================================================================ */

/* ================================================================
   FETCH LIST — PO Pending (satu panggilan, kedua plant sekaligus)
   ================================================================ */
function fetchList() {
  showSkeleton();
  apiPost('GET_LIST', { plant: curPlant, potype: curCategory })
    .then(function(res) {
      if (res.status !== 'S') {
        showEmpty(res.message || 'Gagal memuat data');
        return;
      }
      window.ALL_DATA1 = res.data1 || [];
      window.ALL_DATA2 = res.data2 || [];
      buildSbCounts();
      renderSidebar();
      renderList();
    })
    .catch(function() {
      showEmpty('Gagal memuat data');
    });
}

/* Kelompokkan ALL_DATA1 (plant -> potype, via BSART_POTYPE_MAP
   reverse-lookup bsart->potype dari app-ui.js) lalu isi ulang
   sbCounts.pending supaya badge sidebar akurat. PO dgn bsart yang
   tak dikenali POTYPE_MAP (tak ada di BSART_POTYPE_MAP) dilewati —
   tak masuk kategori sidebar manapun, konsisten dgn getCategoryDef
   yang hanya tahu bsart terdaftar. */
function buildSbCounts() {
  var raw = {};
  (ALL_DATA1 || []).forEach(function(d) {
    var info = BSART_POTYPE_MAP[d.bsart];
    if (!info) return;
    if (!raw[d.plant]) raw[d.plant] = {};
    raw[d.plant][info.potype] = (raw[d.plant][info.potype] || 0) + 1;
  });
  ['1200', '1300'].forEach(function(w) {
    sbCounts.pending[w] = normalizeCatCounts(raw, w);
  });
}

/* Hitung jumlah item (ALL_DATA2) per ebeln — ZPO GET_LIST tak
   mengirim item_count siap pakai (beda dari ZPR), lihat schema. */
function buildItemCountMap() {
  var map = {};
  (ALL_DATA2 || []).forEach(function(it) {
    map[it.ebeln] = (map[it.ebeln] || 0) + 1;
  });
  return map;
}

/* ================================================================
   SORT FILTER
   ================================================================ */
function onSortFilter(val) {
  curSort = val;
  curPage = 1;
  filterPanelOpen = false;
  renderList();
}

/* ================================================================
   FILTER PANEL — tombol Filter di toolbar list pending, membungkus
   filter sekunder (saat ini hanya Urutkan, sejak plant-sub & estkz
   dibuang) dalam satu dropdown supaya toolbar tetap ringkas.
   Dipakai bersama app-history.js (Task 8, id #filterPanel/#btnFilter
   & var filterPanelOpen sama) — listener document di bawah ini
   CUKUP SEKALI (jangan diduplikasi di app-history.js).
   ================================================================ */
function setFilterPanel(open) {
  filterPanelOpen = open;
  var panel = document.getElementById('filterPanel');
  var btn   = document.getElementById('btnFilter');
  if (panel) panel.classList.toggle('open', open);
  if (btn)   btn.setAttribute('aria-expanded', open ? 'true' : 'false');
}

function toggleFilterPanel(e) {
  if (e) e.stopPropagation();
  setFilterPanel(!filterPanelOpen);
}

document.addEventListener('click', function(e) {
  var panel = document.getElementById('filterPanel');
  var btn   = document.getElementById('btnFilter');
  if (panel && btn && !btn.contains(e.target) && !panel.contains(e.target)) {
    setFilterPanel(false);
  }
});

document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape' && filterPanelOpen && !modalStack.length) {
    setFilterPanel(false);
    var btn = document.getElementById('btnFilter');
    if (btn) btn.focus();
  }
});

function resetPoFilters() {
  curSort = 'newest';
  curPage = 1;
  filterPanelOpen = false;
  renderList();
}

/* ================================================================
   TOOLBAR — potongan dipakai bersama list & (nanti) history.
   ================================================================ */
function buildSearchBox(id, handler, value, placeholder) {
  return '<div class="search-wrap">' +
    svgIcon('i-search') +
    '<input type="text" id="' + id + '"' +
    ' aria-label="' + escHtml(placeholder) + '"' +
    ' placeholder="' + escHtml(placeholder) + '"' +
    ' value="' + escHtml(value) + '"' +
    ' onkeydown="if(event.key===\'Enter\')' + handler + '(this.value)"' +
    ' onblur="' + handler + '(this.value)">' +
    '</div>';
}

function buildPageSizeSelect(sizes, current, handler) {
  var html = '<select class="select" aria-label="Jumlah baris per halaman"' +
    ' onchange="' + handler + '(parseInt(this.value))">';
  sizes.forEach(function(s) {
    html += '<option value="' + s + '"' + (current === s ? ' selected' : '') + '>' +
      (s === 0 ? 'Semua' : s + ' per halaman') + '</option>';
  });
  return html + '</select>';
}

function buildFilterButton(count) {
  return '<button type="button" class="btn btn-outline btn-filter"' +
    ' id="btnFilter" aria-expanded="' + (filterPanelOpen ? 'true' : 'false') + '"' +
    ' aria-controls="filterPanel" onclick="toggleFilterPanel(event)">' +
    svgIcon('i-filter') + ' Filter' +
    (count > 0 ? '<span class="filter-badge">' + count + '</span>' : '') +
    '</button>';
}

function buildExpandButton(id, expanded, handler) {
  return '<button type="button" class="btn btn-ghost" id="' + id + '"' +
    ' onclick="' + handler + '()">' +
    svgIcon('i-chevron-down') + ' ' +
    (expanded ? 'Tutup Semua' : 'Buka Semua') +
    '</button>';
}

/* ================================================================
   GET FILTERED (client-side: plant + potype (bsart) + search + sort)
   ================================================================ */
function getFiltered() {
  var bsartList = curBsart ? curBsart.split(',') : null;

  var arr = (ALL_DATA1 || []).filter(function(d) {
    if (d.plant !== curPlant) return false;
    if (bsartList && bsartList.indexOf(d.bsart) === -1) return false;
    return true;
  });

  if (searchKw) {
    var kw = searchKw.toLowerCase();
    arr = arr.filter(function(d) {
      return (d.ebeln && d.ebeln.toLowerCase().indexOf(kw) > -1) ||
        (d.name1 && d.name1.toLowerCase().indexOf(kw) > -1) ||
        (d.stats && d.stats.toLowerCase().indexOf(kw) > -1);
    });
  }

  if (curSort === 'oldest')
    arr.sort(function(a, b) { return (a.ebeln || '').localeCompare(b.ebeln || ''); });
  else
    arr.sort(function(a, b) { return (b.ebeln || '').localeCompare(a.ebeln || ''); });

  return arr;
}

/* ================================================================
   RENDER LIST — PO Pending
   ================================================================ */
function renderList() {
  filteredData = getFiltered();
  var total      = filteredData.length;
  var totalPages = pageSize === 0 ? 1 : Math.ceil(total / pageSize) || 1;
  if (curPage > totalPages) curPage = 1;

  var start = pageSize === 0 ? 0 : (curPage - 1) * pageSize;
  var end   = pageSize === 0 ? total : Math.min(start + pageSize, total);
  var pageData = filteredData.slice(start, end);

  var catDef = getCategoryDef(curPlant, curCategory);
  var catIcon = catDef ? catDef.icon : 'i-cart';
  var catLbl  = catDef ? catDef.label : 'PO';

  var itemCountMap = buildItemCountMap();

  var html = '';

  /* Header + toolbar sebagai satu blok sticky */
  html += '<div class="page-sticky">';

  html += '<div class="pg-hdr">' +
        '<h1 class="pg-title">' + svgIcon(catIcon) +
        escHtml(catLbl) + ' &mdash; ' + escHtml(getPlantLabel(curPlant)) + '</h1>' +
        '<div class="pg-sub">' + total + ' PO menunggu release</div>';
  html += '</div>';

  html += '<div class="toolbar">';

  html += '<button type="button" class="btn btn-outline" id="btnSelAll"' +
        ' onclick="toggleSelectAll()">' +
        svgIcon('i-check') + ' Pilih Semua</button>';

  /* Grup aksi massal duduk di sebelah "Pilih Semua" — hanya tampil
     saat ada PO terpilih (dinyalakan/dipadamkan oleh updateFabInfo()
     di app-detail.js, Task 10). index.htm juga masih punya #fab
     (Task 2, identik struktur ZPR) berisi tombol yang sama; keduanya
     dipertahankan spy markup konsisten dgn ZPR — lihat komentar
     updateFabInfo() ZPR yang sengaja membiarkan #fab padam & memakai
     grup toolbar ini sbg UI aksi massal yang sesungguhnya. */
  html += '<div class="sel-actions" id="selActions">' +
        '<span class="sel-count"><b id="selCount">0</b> dipilih</span>' +
        '<button type="button" class="btn btn-success"' +
        ' onclick="showModalRelease()">' +
        svgIcon('i-check') + ' Release</button>' +
        '<button type="button" class="btn btn-danger"' +
        ' onclick="showModalReject()">' +
        svgIcon('i-trash') + ' Reject</button>' +
        '</div>';

  html += buildSearchBox('searchInp', 'onSearchTrigger', searchKw,
        'Cari No PO, Vendor...');
  html += buildPageSizeSelect([10, 20, 50, 0], pageSize, 'changePageSize');

  var poFiltCnt = (curSort !== 'newest' ? 1 : 0);
  html += '<div class="filter-wrap">';
  html += buildFilterButton(poFiltCnt);
  html += '<div class="filter-panel' + (filterPanelOpen ? ' open' : '') + '" id="filterPanel">';

  html += '<div class="filter-panel-row">' +
        '<span class="filter-panel-lbl">Urutkan</span>' +
        '<select class="select select--accent select--block"' +
        ' aria-label="Urutkan" onchange="onSortFilter(this.value)">' +
        '<option value="newest"' + (curSort === 'newest' ? ' selected' : '') +
        '>&#8595; No. PO Terbaru</option>' +
        '<option value="oldest"' + (curSort === 'oldest' ? ' selected' : '') +
        '>&#8593; No. PO Terlama</option>' +
        '</select></div>';

  if (poFiltCnt > 0)
    html += '<button type="button" class="filter-panel-reset"' +
          ' onclick="resetPoFilters()">Reset Filter</button>';
  html += '</div></div>';

  html += buildExpandButton('btnToggleExpand', allExpanded, 'toggleExpandAll');

  html += '<div class="pg-count">' +
        (total !== (ALL_DATA1 || []).length
          ? total + ' dari ' + (ALL_DATA1 || []).length : total) +
        ' PO</div>';

  html += '</div></div>'; /* toolbar + page-sticky */

  /* Kartu */
  html += '<div id="cardContainer">';

  if (total === 0) {
    html += '<div class="empty empty--inline">' +
          '<div class="empty-ico">' + svgIcon('i-search') + '</div>' +
          '<div class="empty-txt">Tidak ada ' + escHtml(catLbl) + ' pending</div>' +
          '</div>';
  } else {
    pageData.forEach(function(d) {
      var typeInfo = BSART_POTYPE_MAP[d.bsart] ||
        { label: d.bsart || '-', color: '#374151', bg: '#f3f4f6' };
      var itCnt = itemCountMap[d.ebeln] || 0;
      var sel   = !!(typeof selEbelns !== 'undefined' && selEbelns[d.ebeln]);

      html += '<div class="po-card' +
            (allExpanded ? ' expanded' : '') +
            (sel ? ' selected' : '') +
            '" id="card_' + d.ebeln + '"' +
            ' onclick="toggleExpand(\'' + d.ebeln + '\')">';

      html += '<div class="card-top">';

      html += '<input type="checkbox" class="card-cb"' +
            ' data-ebeln="' + d.ebeln + '"' +
            ' aria-label="Pilih PO ' + d.ebeln + '"' +
            (sel ? ' checked' : '') +
            ' onclick="event.stopPropagation();' +
            'toggleSelect(\'' + d.ebeln + '\')">';

      html += '<div class="card-main">';
      html += '<div class="card-head">' +
            '<span class="card-num">' + escHtml(d.ebeln) + '</span>' +
            '<button type="button" class="btn btn-ghost btn-xs"' +
            ' onclick="event.stopPropagation();showItemTextModal(\'' + d.ebeln + '\')">' +
            svgIcon('i-file-text') + ' Lihat Teks</button>' +
            '</div>';

      html += '<div class="card-badges">';
      html += '<span class="badge b-pending">Pending</span>';
      html += '<span class="badge b-plant">' + escHtml(d.plant) + ' ' +
            escHtml(getPlantLabel(d.plant)) + '</span>';
      html += '<span class="badge" style="color:' + typeInfo.color +
            ';background:' + typeInfo.bg + '">' + escHtml(typeInfo.label) + '</span>';
      if (itCnt > 0)
        html += '<span class="badge b-items">' + itCnt + ' item</span>';
      html += '</div>'; /* card-badges */
      html += '</div>'; /* card-main */

      html += '<div class="card-amount">' +
            '<span class="card-amount-val">' + formatAmount(d.totpr, d.waerk) + '</span>' +
            '<span class="card-amount-cur">Total Amount</span>' +
            '</div>';

      html += '<button type="button" class="card-expand"' +
            ' aria-expanded="' + (allExpanded ? 'true' : 'false') + '"' +
            ' aria-controls="det_' + d.ebeln + '"' +
            ' aria-label="Tampilkan detail item PO ' + d.ebeln + '"' +
            ' onclick="event.stopPropagation();toggleExpand(\'' + d.ebeln + '\')">' +
            svgIcon('i-chevron-down') + '</button>';

      html += '</div>'; /* card-top */

      html += '<div class="card-meta">';
      html += '<div><div class="meta-lbl">Vendor</div>' +
            '<div class="meta-val">' + escHtml(d.name1 || '-') + '</div></div>';
      html += '<div><div class="meta-lbl">Status</div>' +
            '<div class="meta-val">' + escHtml(d.stats || '-') + '</div></div>';
      html += '<div><div class="meta-lbl">Release Code</div>' +
            '<div class="meta-val">' + escHtml(d.frgco || '-') + '</div></div>';
      html += '<div><div class="meta-lbl">Currency</div>' +
            '<div class="meta-val">' + escHtml(d.waerk || '-') + '</div></div>';
      html += '</div>'; /* card-meta */

      html += '<div class="card-detail" id="det_' + d.ebeln + '"' +
            ' onclick="event.stopPropagation()">';
      html += '<div id="detContent_' + d.ebeln + '">' +
            '<div class="card-detail-msg">' +
            '<div class="lo-spin lo-spin-sm"></div>' +
            'Memuat detail item...</div>';
      html += '</div></div>';
      html += '</div>'; /* po-card */
    });
  }

  html += '</div>'; /* cardContainer */

  document.getElementById('mainContent').innerHTML = html;

  /* Pagination & seleksi = forward-ref app-detail.js (Task 10). */
  setPager(total > 0 ? renderPagination(total, totalPages, start, end) : '');
  setActionBar(total > 0);

  if (total > 0) updateFabInfo();

  if (allExpanded) {
    pageData.forEach(function(d) {
      loadDetail(d.ebeln);
    });
  }
}
