/* ================================================================
   app-dashboard.js — ZPO_REL_BSP
   Dashboard laporan yang tampil saat index.htm dibuka pertama kali
   (dan saat klik logo header -> showDashboard()).

   3 bagian:
   1. PENDING  — total PO pending + per plant + per kategori.
                 Sumber: sbCounts.pending (dari GET_SIDEBAR, app-ui.js).
   2. RINGKASAN HISTORY — jumlah Release & Reject pada rentang tanggal
                 terpilih (default bulan berjalan). Sumber: field `total`
                 dari GET_HISTORY_REL / GET_HISTORY_REJ.
   3. AKTIVITAS TERBARU — ~10 PO terakhir yang di-release/reject dalam
                 rentang. Sumber: field `data` dari endpoint yang sama.

   Rentang tanggal bisa diubah user (2 input date) -> memuat ulang
   bagian 2 & 3 saja (bagian pending tak terpengaruh tanggal).

   Endpoint history via apiPost() -> main.htm (routing di app-core.js).
   Tidak menyentuh main.htm/svc.htm (endpoint sudah ada).
   ================================================================ */
'use strict';

var dashFrom = '';   /* YYYYMMDD */
var dashTo   = '';
var DASH_ACT_LIMIT = 10;

/* Rentang default: tanggal 1 bulan berjalan s/d hari ini. */
function dashInitRange() {
  var d  = new Date();
  var y  = d.getFullYear();
  var m  = d.getMonth() + 1;
  var mm = (m < 10 ? '0' : '') + m;
  var dd = (d.getDate() < 10 ? '0' : '') + d.getDate();
  dashFrom = '' + y + mm + '01';
  dashTo   = '' + y + mm + dd;
}
function dashToInput(s) {   /* YYYYMMDD -> YYYY-MM-DD (utk <input date>) */
  if (!s || s.length !== 8) { return ''; }
  return s.substr(0,4) + '-' + s.substr(4,2) + '-' + s.substr(6,2);
}
function dashFromInput(v) { /* YYYY-MM-DD -> YYYYMMDD */
  return (v || '').replace(/-/g, '');
}

/* ---------------------------------------------------------------
   RENDER — kerangka dashboard + isi bagian pending, lalu muat
   bagian history (async).
   --------------------------------------------------------------- */
function renderDashboard() {
  curMode = 'dashboard';
  if (!dashFrom) { dashInitRange(); }
  renderSidebar();            /* bersihkan highlight menu aktif */
  closeSidebarMobile();

  var main = document.getElementById('mainContent');
  if (!main) { return; }

  main.innerHTML =
    '<div class="dash">' +
      '<div class="dash-head">' +
        '<h1 class="dash-title">' + svgIcon('i-clipboard','ico-lg') +
          ' Dashboard</h1>' +
        '<div class="dash-sub">Ringkasan PO pending &amp; aktivitas release/reject</div>' +
      '</div>' +

      '<div class="dash-section-h">PO Menunggu Release</div>' +
      '<div id="dashPending"></div>' +

      '<div class="dash-section-h dash-section-h2">' +
        'Ringkasan Aktivitas' +
        '<span class="dash-range">' +
          '<label>Dari <input type="date" id="dashFrom" value="' +
            dashToInput(dashFrom) + '"></label>' +
          '<label>s/d <input type="date" id="dashTo" value="' +
            dashToInput(dashTo) + '"></label>' +
        '</span>' +
      '</div>' +
      '<div id="dashSummary" class="dash-tiles"></div>' +

      '<div class="dash-section-h">Aktivitas Terbaru</div>' +
      '<div id="dashActivity"></div>' +
    '</div>';

  var f = document.getElementById('dashFrom');
  var t = document.getElementById('dashTo');
  if (f) { f.onchange = function(){ dashFrom = dashFromInput(f.value); dashLoadHistory(); }; }
  if (t) { t.onchange = function(){ dashTo   = dashFromInput(t.value); dashLoadHistory(); }; }

  dashRenderPending();
  dashLoadHistory();
}

/* ---------------------------------------------------------------
   BAGIAN 1 — PENDING (dari sbCounts.pending, tanpa fetch tambahan)
   --------------------------------------------------------------- */
function dashPlantPendingTotal(werks) {
  var obj = sbCounts.pending[werks] || {};
  var n = 0, k;
  for (k in obj) { if (obj.hasOwnProperty(k)) { n += parseInt(obj[k],10) || 0; } }
  return n;
}

function dashRenderPending() {
  var el = document.getElementById('dashPending');
  if (!el) { return; }

  var plants = ['1200','1300'];
  var grand = 0;
  plants.forEach(function(w){ grand += dashPlantPendingTotal(w); });

  var html = '<div class="dash-tiles">' +
    '<div class="dash-tile dash-tile-lg">' +
      '<div class="dash-tile-num">' + grand + '</div>' +
      '<div class="dash-tile-lbl">Total PO Pending</div>' +
    '</div>';
  plants.forEach(function(w){
    html += '<div class="dash-tile">' +
      '<div class="dash-tile-num">' + dashPlantPendingTotal(w) + '</div>' +
      '<div class="dash-tile-lbl">' + escHtml(getPlantLabel(w)) + '</div>' +
    '</div>';
  });
  html += '</div>';

  /* Rincian per kategori (potype) per plant */
  html += '<div class="dash-plant-grid">';
  plants.forEach(function(w){
    html += '<div class="dash-cat-card">' +
      '<div class="dash-cat-head">' + escHtml(getPlantLabel(w)) + '</div>';
    var map = POTYPE_MAP[w] || {};
    var counts = sbCounts.pending[w] || {};
    var any = false, code;
    for (code in map) {
      if (!map.hasOwnProperty(code)) { continue; }
      var cnt = parseInt(counts[code],10) || 0;
      if (cnt <= 0) { continue; }
      any = true;
      html += '<div class="dash-cat-row" onclick="switchView(\'' + w +
        '\',\'' + code + '\',\'pending\')" role="button" tabindex="0">' +
        '<span class="dash-cat-lbl">' + escHtml(map[code].label) + '</span>' +
        '<span class="dash-cat-cnt">' + cnt + '</span>' +
      '</div>';
    }
    if (!any) {
      html += '<div class="dash-cat-empty">Tidak ada PO pending.</div>';
    }
    html += '</div>';
  });
  html += '</div>';

  el.innerHTML = html;
}

/* ---------------------------------------------------------------
   BAGIAN 2 & 3 — HISTORY (ringkasan + aktivitas), sesuai rentang
   --------------------------------------------------------------- */
function dashLoadHistory() {
  var sum = document.getElementById('dashSummary');
  var act = document.getElementById('dashActivity');
  if (sum) { sum.innerHTML = dashTileLoading('Release') + dashTileLoading('Reject'); }
  if (act) { act.innerHTML = '<div class="dash-act-empty">Memuat&hellip;</div>'; }

  var params = function(w, off, lim){
    return { werks:w, date_from:dashFrom, date_to:dashTo,
             search:'', offset:off, limit:lim };
  };

  var calls = [
    apiPost('GET_HISTORY_REL', params('1200',0,DASH_ACT_LIMIT)),
    apiPost('GET_HISTORY_REL', params('1300',0,DASH_ACT_LIMIT)),
    apiPost('GET_HISTORY_REJ', params('1200',0,DASH_ACT_LIMIT)),
    apiPost('GET_HISTORY_REJ', params('1300',0,DASH_ACT_LIMIT))
  ];

  Promise.all(calls).then(function(res){
    var relTot = dashTotal(res[0]) + dashTotal(res[1]);
    var rejTot = dashTotal(res[2]) + dashTotal(res[3]);

    if (sum) {
      sum.innerHTML =
        '<div class="dash-tile dash-tile-rel">' +
          '<div class="dash-tile-num">' + relTot + '</div>' +
          '<div class="dash-tile-lbl">' + svgIcon('i-check-circle') +
            ' PO di-Release</div></div>' +
        '<div class="dash-tile dash-tile-rej">' +
          '<div class="dash-tile-num">' + rejTot + '</div>' +
          '<div class="dash-tile-lbl">' + svgIcon('i-x') +
            ' PO di-Reject</div></div>';
    }

    /* Gabung aktivitas rel+rej, urut terbaru, ambil DASH_ACT_LIMIT */
    var rows = [];
    dashPush(rows, res[0], 'REL');
    dashPush(rows, res[1], 'REL');
    dashPush(rows, res[2], 'REJ');
    dashPush(rows, res[3], 'REJ');
    rows.sort(function(a,b){
      var ka = (a.udate||'') + (a.utime||'');
      var kb = (b.udate||'') + (b.utime||'');
      if (ka < kb) { return 1; }
      if (ka > kb) { return -1; }
      return 0;
    });
    rows = rows.slice(0, DASH_ACT_LIMIT);
    if (act) { act.innerHTML = dashActivityHtml(rows); }
  }).catch(function(){
    if (sum) { sum.innerHTML = '<div class="dash-act-empty">Gagal memuat ringkasan.</div>'; }
    if (act) { act.innerHTML = ''; }
  });
}

function dashTotal(res){ return (res && res.status==='S') ? (parseInt(res.total,10)||0) : 0; }
function dashPush(rows, res, kind){
  if (!res || res.status!=='S' || !res.data) { return; }
  res.data.forEach(function(r){ r._kind = kind; rows.push(r); });
}
function dashTileLoading(lbl){
  return '<div class="dash-tile"><div class="dash-tile-num">&hellip;</div>' +
         '<div class="dash-tile-lbl">' + lbl + '</div></div>';
}

function dashActivityHtml(rows) {
  if (!rows.length) {
    return '<div class="dash-act-empty">Tidak ada aktivitas pada rentang ini.</div>';
  }
  var html = '<div class="dash-act-scroll"><table class="dash-act">' +
    '<thead><tr><th>Aksi</th><th>No PO</th><th>Plant</th>' +
    '<th>User</th><th>Tanggal</th><th>Jam</th></tr></thead><tbody>';
  rows.forEach(function(r){
    var isRel = (r._kind === 'REL');
    var badge = isRel
      ? '<span class="dash-b dash-b-rel">Release</span>'
      : '<span class="dash-b dash-b-rej">Reject</span>';
    html += '<tr>' +
      '<td>' + badge + '</td>' +
      '<td class="mono">' + escHtml(r.ebeln||'') + '</td>' +
      '<td>' + escHtml(getPlantLabel(r.werks)||r.werks||'') + '</td>' +
      '<td>' + escHtml(r.uname||'') + '</td>' +
      '<td>' + escHtml(formatDate(r.udate)) + '</td>' +
      '<td>' + escHtml(formatTime(r.utime)) + '</td>' +
    '</tr>';
  });
  html += '</tbody></table></div>';
  return html;
}
