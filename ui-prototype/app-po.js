/* ================================================================
   MONITORING STATUS PO — PR yang di-approve lewat sistem ini,
   dilacak apakah sudah dijadikan PO (action GET_APP_PO di main.htm).

   Data seluruh plant di-fetch sekali (lazy, setelah dashboard tampil)
   lalu di-cache di poData. Tile dashboard dan view daftar keduanya
   membaca dari cache ini — klik tile tidak memicu query ulang.
   ================================================================ */
var poData    = [];      // seluruh item approved + status PO (semua plant)
var poLoaded  = false;
var poFetching= false;
var poCbs     = [];      // callback menunggu data selesai dimuat

/* Seluruh werks yang tampil di dashboard (Surabaya + Semarang). */
var PO_ALL_WERKS = '1200,2000,1000,1001,1100,1300,3000';

/* State view daftar PO */
var poCurGroup   = '';   // plant induk aktif: '1200' atau '1300'
var poSearchKw   = '';
var poPageSize   = 10;
var poCurPage    = 1;
var poAllExpanded= false;
var poPlantSub   = '';
var poStatusFilter = '';  // '', 'OPEN', 'PARTIAL', 'DONE', 'DEL'

function loadPoData(cb) {
  if (poLoaded) { if (cb) cb(); return; }
  if (cb) poCbs.push(cb);
  if (poFetching) return;
  poFetching = true;

  fetch(API_URL+'?action=GET_APP_PO'+
        '&werks='+encodeURIComponent(PO_ALL_WERKS)+'&bsart=ALL')
    .then(function(r){ return r.json(); })
    .then(function(res){
      poData   = (res && res.status==='S') ? (res.data||[]) : [];
      poLoaded = true; poFetching = false;
      var cbs = poCbs; poCbs = [];
      cbs.forEach(function(f){ f(); });
    })
    .catch(function(){
      poFetching = false;
      var cbs = poCbs; poCbs = [];
      cbs.forEach(function(f){ f(); });
    });
}

/* Approve/reject mengubah data approved -> tandai cache basi supaya
   dashboard/daftar berikutnya memuat ulang. Dipanggil app-action.js. */
function invalidatePoData() {
  poLoaded = false; poData = [];
}

/* ── Tile dashboard: jumlah PR (banfn unik) yang punya >=1 item OPEN
   (benar-benar belum ada PO) per grup plant. ── */
function fillPoTiles() {
  loadPoData(function(){
    ['1200','1300'].forEach(function(primary){
      var el=document.getElementById('dashPoVal_'+primary);
      if (!el) return;
      var werks=getSidebarWerks(primary), seen={};
      poData.forEach(function(h){
        if (werks.indexOf(h.werks)>-1 && h.po_status==='OPEN')
          seen[h.banfn]=true;
      });
      el.textContent=Object.keys(seen).length;
    });
  });
}

/* ================================================================
   BUKA VIEW DAFTAR (dari klik tile dashboard)
   ================================================================ */
function openPoView(primary) {
  curMode        = 'po';
  curPlant       = getEffectiveWerks(primary);
  curCategory    = '';
  poCurGroup     = primary;
  poSearchKw     = '';
  poCurPage      = 1;
  poAllExpanded  = false;
  poPlantSub     = '';
  /* Dibuka dari tile "Belum PO" -> tampilkan hanya yang OPEN.
     Pengguna tetap bisa melihat status lain lewat dropdown filter. */
  poStatusFilter = 'OPEN';
  filterPanelOpen= false;
  selBanfns      = {};

  renderSidebar();
  closeSidebarMobile();

  if (poLoaded) {
    renderPoContent();
  } else {
    showSkeleton();
    loadPoData(function(){ renderPoContent(); });
  }
}

/* ================================================================
   FILTER & GROUPING
   ================================================================ */
function getFilteredPo() {
  var werks = getSidebarWerks(poCurGroup);
  var kw    = poSearchKw.toLowerCase();
  return poData.filter(function(h){
    if (werks.indexOf(h.werks)===-1) return false;
    if (poPlantSub && h.werks!==poPlantSub) return false;
    if (poStatusFilter && h.po_status!==poStatusFilter) return false;
    if (!kw) return true;
    return h.banfn.toLowerCase().indexOf(kw)>-1||
      (h.txz01&&h.txz01.toLowerCase().indexOf(kw)>-1)||
      (h.ernam&&h.ernam.toLowerCase().indexOf(kw)>-1)||
      (h.ekgrp&&h.ekgrp.toLowerCase().indexOf(kw)>-1)||
      (h.ebeln&&h.ebeln.toLowerCase().indexOf(kw)>-1)||
      (h.vendor&&h.vendor.toLowerCase().indexOf(kw)>-1);
  });
}

function groupPo(rows) {
  var map={}, order=[];
  rows.forEach(function(h){
    if (!map[h.banfn]){
      map[h.banfn]={
        banfn:h.banfn, werks:h.werks, bsart:h.bsart,
        ernam:h.ernam, ernam_full:h.ernam_full, erdat:h.erdat,
        app_by:h.app_by, app_at:h.app_at, app_tm:h.app_tm,
        ekgrp:h.ekgrp, waers:h.waers,
        items:[], totals:[],
        nopen:0, npartial:0, ndone:0, ndel:0, maxage:0
      };
      order.push(h.banfn);
    }
    var g=map[h.banfn];
    g.items.push(h);
    var w=h.waers||'IDR';
    var t=g.totals.filter(function(x){ return x.waers===w; })[0];
    if (!t){ t={waers:w, total:0}; g.totals.push(t); }
    t.total += parseNum(h.total)||0;

    if      (h.po_status==='OPEN')    g.nopen++;
    else if (h.po_status==='PARTIAL') g.npartial++;
    else if (h.po_status==='DONE')    g.ndone++;
    else if (h.po_status==='DEL')     g.ndel++;

    var age=parseInt(h.age)||0;
    if ((h.po_status==='OPEN'||h.po_status==='PARTIAL') && age>g.maxage)
      g.maxage=age;
  });
  return order.map(function(b){ return map[b]; });
}

/* Status "terburuk"/paling perlu tindakan untuk badge ringkasan kartu. */
function poWorstStatus(g) {
  if (g.nopen>0)    return 'OPEN';
  if (g.npartial>0) return 'PARTIAL';
  if (g.ndone>0)    return 'DONE';
  return 'DEL';
}

var PO_STATUS_LABEL = {
  OPEN:'Belum PO', PARTIAL:'Sebagian', DONE:'Sudah PO', DEL:'PR dihapus'
};
var PO_STATUS_CLASS = {
  OPEN:'b-po-open', PARTIAL:'b-po-partial', DONE:'b-po-done', DEL:'b-po-del'
};

function poStatusBadge(st) {
  return '<span class="badge '+(PO_STATUS_CLASS[st]||'b-po-del')+'">'+
         escHtml(PO_STATUS_LABEL[st]||st)+'</span>';
}

function poAgeBadge(days) {
  if (!days) return '';
  var cls = days>=14 ? 'b-age-crit' : (days>=7 ? 'b-age-warn' : 'b-age');
  return '<span class="badge '+cls+'">'+svgIcon('i-clock','ico-sm')+
         ' '+days+' hari</span>';
}

/* ================================================================
   RENDER KARTU
   ================================================================ */
function buildPoCards(groups) {
  if (groups.length===0){
    return '<div class="empty empty--inline">'+
           '<div class="empty-ico">'+svgIcon('i-cart','ico-xl')+'</div>'+
           '<div class="empty-txt">Tidak ada data untuk filter ini</div></div>';
  }

  var html='';
  groups.forEach(function(pr){
    var worst=poWorstStatus(pr);

    html+='<div class="po-card no-cb'+
          (poAllExpanded?' expanded':'')+
          '" id="poCard_'+pr.banfn+'"'+
          ' onclick="togglePoExpand(\''+pr.banfn+'\')">';

    html+='<div class="card-top card-top--nocb">';

    html+='<div class="card-main">';
    html+='<div class="card-head">'+
          '<span class="card-num">'+escHtml(pr.banfn)+'</span>'+
          '<button type="button" class="btn btn-ghost btn-xs"'+
          ' onclick="event.stopPropagation();showItemTextModal(\''+pr.banfn+'\')">'+
          svgIcon('i-file-text','ico-sm')+' Lihat Teks</button>'+
          '</div>';

    html+='<div class="card-badges">';
    html+=poStatusBadge(worst);
    if (worst==='OPEN' && pr.nopen>0 && pr.items.length>pr.nopen)
      html+='<span class="badge b-po-open">'+pr.nopen+' dari '+
            pr.items.length+' item</span>';
    html+=poAgeBadge(pr.maxage);
    html+='<span class="badge b-plant">'+escHtml(pr.werks)+' '+
          escHtml(PLANT_LABELS[pr.werks]||'')+'</span>';
    html+='<span class="badge b-cat">'+
          escHtml(getCategoryLabelByBsart(pr.werks,pr.bsart))+'</span>';
    html+='</div>'; /* card-badges */
    html+='</div>'; /* card-main */

    html+=renderCardAmount(pr.totals);

    html+='<button type="button" class="card-expand"'+
          ' aria-expanded="'+(poAllExpanded?'true':'false')+'"'+
          ' aria-controls="poDet_'+pr.banfn+'"'+
          ' aria-label="Tampilkan detail item PR '+pr.banfn+'"'+
          ' onclick="event.stopPropagation();togglePoExpand(\''+pr.banfn+'\')">'+
          svgIcon('i-chevron-down')+'</button>';

    html+='</div>'; /* card-top */

    html+='<div class="card-meta">';
    html+='<div><div class="meta-lbl">Dibuat Oleh</div>'+
          '<div class="meta-val">'+escHtml(pr.ernam_full||pr.ernam)+'</div></div>';
    html+='<div><div class="meta-lbl">Diapprove Oleh</div>'+
          '<div class="meta-val meta-val--app">'+escHtml(pr.app_by||'-')+'</div></div>';
    html+='<div><div class="meta-lbl">Tgl Approve</div>'+
          '<div class="meta-val">'+escHtml(pr.app_at||'-')+'</div></div>';
    html+='<div><div class="meta-lbl">Ringkasan</div>'+
          '<div class="meta-val meta-val--sm">'+
          poSummaryText(pr)+'</div></div>';
    html+='</div>'; /* card-meta */

    html+='<div class="card-detail" id="poDet_'+pr.banfn+'"'+
          ' onclick="event.stopPropagation()">';
    html+='<div class="card-detail-scroll"><table><thead><tr>'+
          '<th>Item</th><th>Deskripsi</th>'+
          '<th class="num">Qty</th><th>Satuan</th>'+
          '<th>Status</th><th>No. PO</th><th>Vendor</th>'+
          '<th class="num">Umur</th>'+
          '</tr></thead><tbody>';
    pr.items.forEach(function(h){
      var age=parseInt(h.age)||0;
      var showAge=(h.po_status==='OPEN'||h.po_status==='PARTIAL');
      html+='<tr>';
      html+='<td class="cell-item">'+escHtml(h.bnfpo)+'</td>';
      html+='<td>'+escHtml(h.txz01||'-')+'</td>';
      html+='<td class="num">'+fmtQty(h.menge)+'</td>';
      html+='<td>'+escHtml(h.meins||'-')+'</td>';
      html+='<td>'+poStatusBadge(h.po_status)+'</td>';
      html+='<td class="cell-mono">'+(h.ebeln?escHtml(h.ebeln):'-')+'</td>';
      html+='<td>'+(h.vendor?escHtml(h.vendor):'-')+'</td>';
      html+='<td class="num'+(showAge&&age>=14?' cell-age-crit':'')+'">'+
            (showAge?age+' hr':'-')+'</td>';
      html+='</tr>';
    });
    html+='</tbody></table></div>';
    html+='</div>'; /* card-detail */

    html+='</div>'; /* po-card */
  });

  return html;
}

/* Teks ringkas komposisi status item PR untuk kolom meta. */
function poSummaryText(pr) {
  var parts=[];
  if (pr.nopen>0)    parts.push(pr.nopen+' belum PO');
  if (pr.npartial>0) parts.push(pr.npartial+' sebagian');
  if (pr.ndone>0)    parts.push(pr.ndone+' sudah PO');
  if (pr.ndel>0)     parts.push(pr.ndel+' dihapus');
  return escHtml(parts.join(' · ')||'-');
}

/* ================================================================
   RENDER VIEW
   ================================================================ */
function renderPoContent() {
  var primaryPlant=poCurGroup;

  var filtered=getFilteredPo();
  var groups  =groupPo(filtered);

  var total=groups.length;
  var totalPages=poPageSize===0?1:Math.ceil(total/poPageSize)||1;
  if (poCurPage>totalPages) poCurPage=1;
  var start=poPageSize===0?0:(poCurPage-1)*poPageSize;
  var end  =poPageSize===0?total:Math.min(start+poPageSize,total);
  var pageGroups=groups.slice(start,end);

  /* Subjudul menyesuaikan filter status yang sedang aktif. Tanpa
     filter: ringkasan berapa yang belum jadi PO. Dengan filter:
     nama status + jumlah PR yang cocok. */
  var subHtml;
  if (poStatusFilter) {
    subHtml='Status: <span class="pg-sub-em">'+
            escHtml(PO_STATUS_LABEL[poStatusFilter]||poStatusFilter)+
            '</span> &mdash; '+total+' PR';
  } else {
    var openPr=0;
    groups.forEach(function(g){ if (g.nopen>0) openPr++; });
    subHtml=total+' PR approved &mdash; '+
            '<span class="pg-sub-em">'+openPr+' belum jadi PO</span>';
  }

  var html='';
  html+='<div class="page-sticky">';
  html+='<div class="pg-hdr">'+
        '<h1 class="pg-title">'+svgIcon('i-cart','ico-lg')+
        'Status PO &mdash; '+escHtml(getPlantLabel(curPlant))+'</h1>'+
        '<div class="pg-sub">'+subHtml+'</div></div>';

  html+='<div class="toolbar">';
  html+=buildSearchBox('poSearchInp','onPoSearchTrigger',poSearchKw,
        'Cari No PR, No PO, Vendor...');
  html+=buildPageSizeSelect([10,25,50,0],poPageSize,'poChangePageSize');

  var poFiltCnt=(poStatusFilter?1:0)+(poPlantSub?1:0);
  html+='<div class="filter-wrap">';
  html+=buildFilterButton(poFiltCnt);
  html+='<div class="filter-panel'+(filterPanelOpen?' open':'')+'" id="filterPanel">';

  html+='<div class="filter-panel-row">'+
        '<span class="filter-panel-lbl">Status</span>'+
        '<select class="select select--accent select--block"'+
        ' aria-label="Filter status PO" onchange="onPoStatusFilter(this.value)">'+
        '<option value=""'+(poStatusFilter===''?' selected':'')+'>Semua Status</option>'+
        '<option value="OPEN"'+(poStatusFilter==='OPEN'?' selected':'')+'>Belum PO</option>'+
        '<option value="PARTIAL"'+(poStatusFilter==='PARTIAL'?' selected':'')+'>Sebagian</option>'+
        '<option value="DONE"'+(poStatusFilter==='DONE'?' selected':'')+'>Sudah PO</option>'+
        '<option value="DEL"'+(poStatusFilter==='DEL'?' selected':'')+'>PR dihapus</option>'+
        '</select></div>';

  html+='<div class="filter-panel-row">'+
        '<span class="filter-panel-lbl">Plant</span>'+
        buildPlantSubSelect(primaryPlant,poPlantSub,'onPoPlantSubFilter')+
        '</div>';

  if (poFiltCnt>0)
    html+='<button type="button" class="filter-panel-reset"'+
          ' onclick="resetPoFilters()">Reset Filter</button>';
  html+='</div></div>';

  html+=buildExpandButton('poBtnToggleExpand',poAllExpanded,'togglePoExpandAll');
  html+='<div class="pg-count">'+total+' PR</div>';
  html+='</div></div>'; /* toolbar + page-sticky */

  html+='<div id="poTableWrap">';
  html+=buildPoCards(pageGroups);
  html+='</div>';

  document.getElementById('mainContent').innerHTML=html;

  var pager='';
  if (total>0){
    pager=(poPageSize!==0 && totalPages>1)
      ?buildPagination(total,totalPages,start,end,poCurPage,'poGoPage')
      :'<div class="pagination-bar"><span class="pg-info">'+
       'Menampilkan semua '+total+' PR</span></div>';
  }
  setPager(pager);
  setActionBar(total>0);
  document.getElementById('fab').className='fab';   /* tanpa aksi massal */
}

/* ================================================================
   HANDLER
   ================================================================ */
function onPoSearchTrigger(val) {
  poSearchKw=val.trim(); poCurPage=1;
  renderPoContent();
}
function onPoStatusFilter(val) {
  poStatusFilter=val; poCurPage=1; filterPanelOpen=false;
  renderPoContent();
}
function onPoPlantSubFilter(val) {
  poPlantSub=val; poCurPage=1; filterPanelOpen=false;
  renderPoContent();
}
function resetPoFilters() {
  poStatusFilter=''; poPlantSub=''; poCurPage=1; filterPanelOpen=false;
  renderPoContent();
}
function poGoPage(pg) {
  var total=groupPo(getFilteredPo()).length;
  var tp=poPageSize===0?1:Math.ceil(total/poPageSize)||1;
  if (pg<1) pg=1;
  if (pg>tp) pg=tp;
  poCurPage=pg;
  renderPoContent(); window.scrollTo(0,0);
}
function poChangePageSize(val) {
  poPageSize=val; poCurPage=1;
  renderPoContent();
}
function togglePoExpand(banfn) {
  var card=document.getElementById('poCard_'+banfn);
  setCardExpanded(card,!card.classList.contains('expanded'));
}
function poExpandAll() {
  poAllExpanded=true;
  document.querySelectorAll('#poTableWrap .po-card')
    .forEach(function(c){ setCardExpanded(c,true); });
}
function poCollapseAll() {
  poAllExpanded=false;
  document.querySelectorAll('#poTableWrap .po-card')
    .forEach(function(c){ setCardExpanded(c,false); });
}
function togglePoExpandAll() {
  if (poAllExpanded) poCollapseAll(); else poExpandAll();
  var btn=document.getElementById('poBtnToggleExpand');
  if (btn) btn.innerHTML=svgIcon('i-chevron-down')+' '+
    (poAllExpanded?'Tutup Semua':'Buka Semua');
}
