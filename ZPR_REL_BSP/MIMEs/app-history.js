/* ================================================================
   STATE — search, pagination & expand di history
   ================================================================ */
var histData        = [];
var histType        = 'approve';
var histPageSize    = 10;
var histCurPage     = 1;
var histSearchKw    = '';
var histAllExpanded = false;
var histPlantSub    = '';  // filter sub-plant (werks asli) dlm grup sidebar
/* YYYYMM bulan ini — default filter periode. */
var histDateFilter  = (function(){
  var d=new Date(), m=d.getMonth()+1;
  return ''+d.getFullYear()+(m<10?'0':'')+m;
}());

/* ================================================================
   RENDER HISTORY TABLE (approve & reject)
   ================================================================ */
function renderHistTable(data,type) {
  histData=data;
  histType=type;
  histCurPage=1;
  histSearchKw='';
  renderHistContent();
}

/* ================================================================
   BUILD HISTORY CARDS — dikelompokkan per No PR, expand/collapse
   per card (konsep sama dengan po-card di list pending), karena
   satu PR history bisa punya banyak item.
   ================================================================ */
function groupHistByBanfn(rows) {
  var map={}, order=[];
  rows.forEach(function(h){
    if (!map[h.banfn]){
      map[h.banfn]={
        banfn:h.banfn, werks:h.werks, bsart:h.bsart,
        ernam:h.ernam, ernam_full:h.ernam_full, erdat:h.erdat,
        waers:h.waers, ekgrp:h.ekgrp,
        app_by:h.app_by, app_at:h.app_at, app_tm:h.app_tm,
        del_by:h.del_by, del_at:h.del_at, del_tm:h.del_tm,
        reason:h.reason,
        items:[], totals:[]
      };
      order.push(h.banfn);
    }
    var grp = map[h.banfn];
    grp.items.push(h);
    var w = (h.waers||grp.waers||'IDR');
    var t = grp.totals.filter(function(x){ return x.waers===w; })[0];
    if (!t) { t={waers:w, total:0}; grp.totals.push(t); }
    t.total += parseNum(h.total)||0;
  });
  return order.map(function(b){ return map[b]; });
}

function buildHistCards(groups,type) {
  var isApp=(type==='approve');

  if (groups.length===0){
    return '<div class="empty empty--inline">'+
           '<div class="empty-ico">'+svgIcon('i-search','ico-xl')+'</div>'+
           '<div class="empty-txt">Tidak ada history '+
           (isApp?'approve':'reject')+'</div></div>';
  }

  var byCls=isApp?'meta-val--app':'meta-val--rej';
  var html='';

  groups.forEach(function(pr){
    var itCnt=pr.items.length;

    html+='<div class="po-card no-cb'+
          (histAllExpanded?' expanded':'')+
          '" id="histCard_'+pr.banfn+'"'+
          ' onclick="toggleHistExpand(\''+pr.banfn+'\')">';

    html+='<div class="card-top card-top--nocb">';

    html+='<div class="card-main">';
    html+='<div class="card-head">'+
          '<span class="card-num">'+escHtml(pr.banfn)+'</span>'+
          '<button type="button" class="btn btn-ghost btn-xs"'+
          ' onclick="event.stopPropagation();showItemTextModal(\''+pr.banfn+'\')">'+
          svgIcon('i-file-text','ico-sm')+' Lihat Teks</button>'+
          '</div>';

    html+='<div class="card-badges">';
    html+='<span class="badge '+(isApp?'b-app':'b-rej')+'">'+
          svgIcon(isApp?'i-check':'i-x','ico-sm')+' '+
          (isApp?'Approved':'Rejected')+'</span>';
    html+='<span class="badge b-plant">'+escHtml(pr.werks)+' '+
          escHtml(PLANT_LABELS[pr.werks]||'')+'</span>';
    html+='<span class="badge b-cat">'+
          escHtml(getCategoryLabelByBsart(pr.werks,pr.bsart))+'</span>';
    if (itCnt>0)
      html+='<span class="badge b-items">'+itCnt+' item</span>';
    html+='</div>'; /* card-badges */
    html+='</div>'; /* card-main */

    html+=renderCardAmount(pr.totals);

    html+='<button type="button" class="card-expand"'+
          ' aria-expanded="'+(histAllExpanded?'true':'false')+'"'+
          ' aria-controls="histDet_'+pr.banfn+'"'+
          ' aria-label="Tampilkan detail item PR '+pr.banfn+'"'+
          ' onclick="event.stopPropagation();toggleHistExpand(\''+pr.banfn+'\')">'+
          svgIcon('i-chevron-down')+'</button>';

    html+='</div>'; /* card-top */

    html+='<div class="card-meta">';
    html+='<div><div class="meta-lbl">Dibuat Oleh</div>'+
          '<div class="meta-val">'+escHtml(pr.ernam_full||pr.ernam)+'</div></div>';
    html+='<div><div class="meta-lbl">Tgl PR</div>'+
          '<div class="meta-val">'+escHtml(pr.erdat||'-')+'</div></div>';
    if (isApp){
      html+='<div><div class="meta-lbl">Diapprove Oleh</div>'+
            '<div class="meta-val '+byCls+'">'+escHtml(pr.app_by||'-')+'</div></div>';
      html+='<div><div class="meta-lbl">Tgl Approve</div>'+
            '<div class="meta-val">'+escHtml(pr.app_at||'-')+
            (pr.app_tm?' '+escHtml(pr.app_tm):'')+'</div></div>';
    } else {
      html+='<div><div class="meta-lbl">Direject Oleh</div>'+
            '<div class="meta-val '+byCls+'">'+escHtml(pr.del_by||'-')+'</div></div>';
      html+='<div><div class="meta-lbl">Tgl Reject</div>'+
            '<div class="meta-val">'+escHtml(pr.del_at||'-')+
            (pr.del_tm?' '+escHtml(pr.del_tm):'')+'</div></div>';
    }
    html+='</div>'; /* card-meta */

    if (!isApp && pr.reason)
      html+='<div class="card-reason"><b>Alasan:</b> '+
            escHtml(pr.reason)+'</div>';

    html+='<div class="card-detail" id="histDet_'+pr.banfn+'"'+
          ' onclick="event.stopPropagation()">';
    html+='<div class="card-detail-scroll">'+
          '<table><thead><tr>'+
          '<th>Item</th><th>Deskripsi</th>'+
          '<th class="num">Jumlah</th><th>Satuan</th>'+
          '<th class="num">Harga</th>'+
          '<th class="num">Total</th>'+
          '<th>Mata Uang</th><th>Grup Pemb.</th>'+
          '</tr></thead><tbody>';
    pr.items.forEach(function(h){
      var w=h.waers||pr.waers||'IDR';
      html+='<tr>';
      html+='<td class="cell-mono">'+escHtml(h.bnfpo)+'</td>';
      html+='<td>'+escHtml(h.txz01||'-')+'</td>';
      html+='<td class="num">'+fmtQty(h.menge)+'</td>';
      html+='<td>'+escHtml(h.meins||'-')+'</td>';
      html+='<td class="num">'+fmtAmt(h.preis,w)+'</td>';
      html+='<td class="num">'+fmtAmt(h.total,w)+'</td>';
      html+='<td>'+escHtml(w)+'</td>';
      html+='<td>'+escHtml(h.ekgrp||'-')+'</td>';
      html+='</tr>';
    });
    html+='</tbody></table></div>';
    html+='</div>'; /* card-detail */

    html+='</div>'; /* po-card */
  });

  return html;
}

function onHistSearchTrigger(val) {
  histSearchKw=val.trim(); histCurPage=1;
  renderHistContent();
}

/* Sama konsepnya dengan getFiltered() di list pending: cari di
   semua field yang relevan/terlihat di kartu, termasuk Plant dan
   Kategori. */
function getFilteredHist() {
  var kw=histSearchKw.toLowerCase();
  return histData.filter(function(h){
    if (histPlantSub && h.werks!==histPlantSub) return false;
    if (histDateFilter) {
      var dt=h.app_at||h.del_at||'';
      if (parseDateYM(dt)!==parseInt(histDateFilter,10)) return false;
    }
    if (!kw) return true;
    return h.banfn.toLowerCase().indexOf(kw)>-1||
      (h.txz01&&h.txz01.toLowerCase().indexOf(kw)>-1)||
      (h.ernam&&h.ernam.toLowerCase().indexOf(kw)>-1)||
      (h.ekgrp&&h.ekgrp.toLowerCase().indexOf(kw)>-1)||
      ((h.app_by||h.del_by)&&
       (h.app_by||h.del_by).toLowerCase().indexOf(kw)>-1)||
      ((PLANT_LABELS[h.werks]||'')
        .toLowerCase().indexOf(kw)>-1)||
      (getCategoryLabelByBsart(h.werks,h.bsart)
        .toLowerCase().indexOf(kw)>-1);
  });
}

function renderHistContent() {
  var isApp=(histType==='approve');
  var primaryPlant=curPlant.split(',')[0];
  var catDef=getCategoryDef(primaryPlant,curCategory);
  var catLbl=catDef?catDef.label:(curCategory==='ALL'?'Semua PR':'PR');

  var filtered=getFilteredHist();
  var groups  =groupHistByBanfn(filtered);

  var total=groups.length;
  var totalPages=histPageSize===0
    ?1:Math.ceil(total/histPageSize)||1;
  if (histCurPage>totalPages) histCurPage=1;
  var start=histPageSize===0
    ?0:(histCurPage-1)*histPageSize;
  var end=histPageSize===0
    ?total:Math.min(start+histPageSize,total);
  var pageGroups=groups.slice(start,end);

  var html='';
  html+='<div class="page-sticky">';

  html+='<div class="pg-hdr">'+
        '<h1 class="pg-title '+(isApp?'pg-title--app':'pg-title--rej')+'">'+
        svgIcon(isApp?'i-check':'i-trash','ico-lg')+
        'History '+(isApp?'Approve':'Reject')+' &mdash; '+
        escHtml(getPlantLabel(curPlant))+' &middot; '+escHtml(catLbl)+'</h1>'+
        '<div class="pg-sub">'+total+' PR '+
        (isApp?'approved':'rejected')+
        ' &mdash; <span class="pg-sub-em">'+
        escHtml(getHistPeriodLabel())+'</span></div></div>';

  html+='<div class="toolbar">';
  html+=buildSearchBox('histSearchInp','onHistSearchTrigger',histSearchKw,
        'Cari No PR, Pembuat...');
  html+=buildPageSizeSelect([10,25,50,0],histPageSize,'histChangePageSize');

  var histFiltCnt=(histPlantSub?1:0);
  html+='<div class="filter-wrap">';
  html+=buildFilterButton(histFiltCnt);
  html+='<div class="filter-panel'+(filterPanelOpen?' open':'')+'" id="filterPanel">';

  html+='<div class="filter-panel-row">'+
        '<span class="filter-panel-lbl">Periode</span>'+
        '<select class="select select--accent select--block"'+
        ' aria-label="Filter periode" onchange="onHistDateFilter(this.value)">';
  getHistMonthOptions().forEach(function(opt){
    html+='<option value="'+opt.value+'"'+
      (histDateFilter===opt.value?' selected':'')+'>'+
      escHtml(opt.label)+'</option>';
  });
  html+='</select></div>';

  html+='<div class="filter-panel-row">'+
        '<span class="filter-panel-lbl">Plant</span>'+
        buildPlantSubSelect(primaryPlant,histPlantSub,'onHistPlantSubFilter')+
        '</div>';

  if (histFiltCnt>0)
    html+='<button type="button" class="filter-panel-reset"'+
          ' onclick="resetHistFilters()">Reset Filter</button>';
  html+='</div></div>';

  html+=buildExpandButton('histBtnToggleExpand',histAllExpanded,'toggleHistExpandAll');

  html+='<div class="pg-count">'+total+' PR</div>';
  html+='</div></div>'; /* toolbar + page-sticky */

  html+='<div id="histTableWrap">';
  html+=buildHistCards(pageGroups,histType);
  html+='</div>';

  if (histPageSize!==0 && totalPages>1){
    html+=renderHistPagination(total,totalPages,start,end,histCurPage);
  } else {
    html+='<div class="pagination-bar">'+
          '<span class="pg-info">Menampilkan semua '+total+' PR</span></div>';
  }

  document.getElementById('mainContent').innerHTML=html;
  document.getElementById('fab').className='fab';
}

function renderHistPagination(total,totalPages,start,end,curPg) {
  return buildPagination(total,totalPages,start,end,curPg,'histGoPage');
}

function histGoPage(pg) {
  var total=groupHistByBanfn(getFilteredHist()).length;
  var tp=histPageSize===0
    ?1:Math.ceil(total/histPageSize)||1;
  if (pg<1) pg=1;
  if (pg>tp) pg=tp;
  histCurPage=pg;
  renderHistContent();
}

function histChangePageSize(val) {
  histPageSize=val; histCurPage=1;
  renderHistContent();
}

/* ================================================================
   HISTORY EXPAND / COLLAPSE — per card & toggle semua (konsep
   sama dengan expandAll/collapseAll di list pending)
   ================================================================ */
function toggleHistExpand(banfn) {
  var card=document.getElementById('histCard_'+banfn);
  if (!card) return;
  setCardExpanded(card,!card.classList.contains('expanded'));
}

function histExpandAll() {
  histAllExpanded=true;
  document.querySelectorAll('#histTableWrap .po-card')
    .forEach(function(c){ setCardExpanded(c,true); });
}

function histCollapseAll() {
  histAllExpanded=false;
  document.querySelectorAll('#histTableWrap .po-card')
    .forEach(function(c){ setCardExpanded(c,false); });
}

function toggleHistExpandAll() {
  if (histAllExpanded) { histCollapseAll(); }
  else { histExpandAll(); }
  var btn=document.getElementById('histBtnToggleExpand');
  if (btn) btn.innerHTML=
    svgIcon('i-chevron-down')+' '+
    (histAllExpanded?'Tutup Semua':'Buka Semua');
}
