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
        ernam:h.ernam, ernam_full:h.ernam_full, erdat:h.erdat, waers:h.waers, ekgrp:h.ekgrp,
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
    return '<div class="empty"'+
           ' style="padding:40px 20px;">'+
           '<div class="empty-ico">'+
           '&#128270;</div>'+
           '<div class="empty-txt">'+
           'Tidak ada history '+
           (isApp?'approve':'reject')+
           '</div></div>';
  }

  var byColor=isApp
    ?'color:var(--success);'
    :'color:var(--danger);';

  var html='';
  groups.forEach(function(pr){
    var itCnt =pr.items.length;

    html+='<div class="po-card'+
          (histAllExpanded?' expanded':'')+
          '" id="histCard_'+pr.banfn+'"'+
          ' onclick="toggleHistExpand(\''+
          pr.banfn+'\')">';

    html+='<div class="card-top">';
    html+='<span class="card-num">'+
          escHtml(pr.banfn)+'</span>';
    html+='<button class="btn-exp" style="height:28px;padding:0 10px;font-size:11.5px;"'+
          ' onclick="event.stopPropagation();showItemTextModal(\''+pr.banfn+'\')">'+
          '&#128196; Lihat Teks</button>';
    html+='<span class="badge"'+
          ' style="background:'+
          (isApp?'#d1fae5;color:var(--success)'
                :'#fee2e2;color:var(--danger)')+
          ';">'+
          (isApp?'&#10003; Approved':'&#10007; Rejected')+
          '</span>';
    html+='<span class="badge b-plant">'+
          escHtml(pr.werks)+' '+
          escHtml(PLANT_LABELS[pr.werks]||'')+
          '</span>';
    html+='<span class="badge b-mrp">'+
          escHtml(getCategoryLabelByBsart(pr.werks,pr.bsart))+
          '</span>';
    if (itCnt>0)
      html+='<span class="badge b-items">'+
            itCnt+' item</span>';

    html+=renderCardAmount(pr.totals);
    html+='</div>'; /* card-top */

    html+='<div class="card-meta">';
    html+='<div><div class="meta-lbl">'+
          'Dibuat Oleh</div>'+
          '<div class="meta-val">'+
          escHtml(pr.ernam_full||pr.ernam)+'</div></div>';
    html+='<div><div class="meta-lbl">'+
          'Tgl PR</div>'+
          '<div class="meta-val">'+
          escHtml(pr.erdat||'-')+'</div></div>';
    if (isApp){
      html+='<div><div class="meta-lbl">'+
            'Diapprove Oleh</div>'+
            '<div class="meta-val" style="'+byColor+'">'+
            escHtml(pr.app_by||'-')+'</div></div>';
      html+='<div><div class="meta-lbl">'+
            'Tgl Approve</div>'+
            '<div class="meta-val">'+
            escHtml(pr.app_at||'-')+
            (pr.app_tm?' '+escHtml(pr.app_tm):'')+
            '</div></div>';
    } else {
      html+='<div><div class="meta-lbl">'+
            'Direject Oleh</div>'+
            '<div class="meta-val" style="'+byColor+'">'+
            escHtml(pr.del_by||'-')+'</div></div>';
      html+='<div><div class="meta-lbl">'+
            'Tgl Reject</div>'+
            '<div class="meta-val">'+
            escHtml(pr.del_at||'-')+
            (pr.del_tm?' '+escHtml(pr.del_tm):'')+
            '</div></div>';
    }
    html+='</div>'; /* card-meta */

    if (!isApp&&pr.reason)
      html+='<div style="padding:0 18px 14px 46px;'+
            'font-size:12px;color:var(--muted);">'+
            '<b>Alasan:</b> '+escHtml(pr.reason)+
            '</div>';

    html+='<div class="card-detail"'+
          ' onclick="event.stopPropagation()">';
    html+='<div style="overflow-x:auto;">'+
          '<table><thead><tr>'+
          '<th>Item</th><th>Deskripsi</th>'+
          '<th class="num">Qty</th><th>UoM</th>'+
          '<th class="num">Harga</th>'+
          '<th class="num">Total</th>'+
          '<th>Curr</th><th>PGrp</th>'+
          '</tr></thead><tbody>';
    pr.items.forEach(function(h){
      var w=h.waers||pr.waers||'IDR';
      html+='<tr>';
      html+='<td style="font-family:\'DM Mono\','+
            'monospace;font-size:12px;">'+
            escHtml(h.bnfpo)+'</td>';
      html+='<td>'+escHtml(h.txz01||'-')+'</td>';
      html+='<td class="num">'+
            fmtQty(h.menge)+'</td>';
      html+='<td>'+escHtml(h.meins||'-')+'</td>';
      html+='<td class="num">'+
            fmtAmt(h.preis,w)+'</td>';
      html+='<td class="num">'+
            fmtAmt(h.total,w)+'</td>';
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

/* search, pagination & expand di history */
var histPageSize=10;
var histCurPage=1;
var histSearchKw='';
var histAllExpanded=false;
var histPlantSub='';  // filter sub-plant (werks asli) dlm grup sidebar
var histDateFilter=(function(){ var d=new Date(),m=d.getMonth()+1; return ''+d.getFullYear()+(m<10?'0':'')+m; }()); // YYYYMM bulan ini (default)

function onHistSearchTrigger(val) {
  histSearchKw=val.trim(); histCurPage=1;
  renderHistContent();
}

/* Sama konsepnya dengan getFiltered() di list pending: cari di
   semua field yang relevan/terlihat di tabel, termasuk Plant dan
   Kategori yang sekarang ditampilkan sebagai kolom. */
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
  var title=isApp
    ?'&#10003; History Approve &mdash; '
    :'&#128465; History Reject &mdash; ';
  var color=isApp
    ?'var(--success)':'var(--danger)';
  var primaryPlant=curPlant.split(',')[0];
  var catDef=getCategoryDef(primaryPlant,curCategory);
  var catLbl=catDef?catDef.label:(curCategory==='ALL'?'All PR':'PR');

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
  html+='<div class="sticky-top">'+
        '<div class="pg-hdr">'+
        '<div class="pg-title"'+
        ' style="color:'+color+';">'+
        title+getPlantLabel(curPlant)+
        ' &middot; '+catLbl+'</div>'+
        '<div class="pg-sub">'+
        total+' PR '+
        (isApp?'approved':'rejected')+
        ' &mdash; <span style="color:var(--primary-d);font-weight:700;">'+
        escHtml(getHistPeriodLabel())+'</span>'+
        '</div></div></div>';

  html+='<div style="margin-bottom:14px;'+
        ' display:flex;align-items:center;'+
        ' gap:10px;flex-wrap:wrap;">'+
        '<div class="search-wrap"'+
        ' style="max-width:340px;">'+
        '<span>&#128269;</span>'+
        '<input type="text"'+
        ' id="histSearchInp"'+
        ' placeholder="Cari No PR, Pembuat, ..."'+
        ' value="'+escHtml(histSearchKw)+'"'+
        ' onkeydown="if(event.key===\'Enter\')'+
        'onHistSearchTrigger(this.value)"'+
        ' onblur="onHistSearchTrigger(this.value)">'+
        '</div>'+
        '<select class="page-size-select"'+
        ' onchange="histChangePageSize('+
        'parseInt(this.value))">';
  [10,25,50,0].forEach(function(s){
    html+='<option value="'+s+'"'+
          (histPageSize===s?' selected':'')+'>'+
          (s===0?'All':s+' per page')+
          '</option>';
  });
  html+='</select>';

  var histFiltCnt=histPlantSub?1:0;
  html+='<div class="filter-wrap">';
  html+='<button class="btn-filter'+(filterPanelOpen?' active':'')+'"'+
        ' id="btnFilter" onclick="toggleFilterPanel(event)">'+
        '&#9881; Filter'+(histFiltCnt>0?'<span class="filter-badge">'+histFiltCnt+'</span>':'')+
        '</button>';
  html+='<div class="filter-panel'+(filterPanelOpen?' open':'')+'" id="filterPanel">';
  html+='<div class="filter-panel-row"><span class="filter-panel-lbl">Periode</span>';
  html+='<select class="estkz-select" onchange="onHistDateFilter(this.value)">';
  getHistMonthOptions().forEach(function(opt){
    html+='<option value="'+opt.value+'"'+(histDateFilter===opt.value?' selected':'')+'>'+escHtml(opt.label)+'</option>';
  });
  html+='</select></div>';
  html+='<div class="filter-panel-row"><span class="filter-panel-lbl">Plant</span>';
  html+='<select class="estkz-select" onchange="onHistPlantSubFilter(this.value)">';
  html+='<option value=""'+(histPlantSub===''?' selected':'')+'>Semua Plant</option>';
  getSidebarWerks(primaryPlant).forEach(function(w){
    html+='<option value="'+w+'"'+(histPlantSub===w?' selected':'')+'>Plant '+w+'</option>';
  });
  html+='</select></div>';
  if (histFiltCnt>0) html+='<div class="filter-panel-reset" onclick="resetHistFilters()">Reset Filter</div>';
  html+='</div></div>';

  html+='<div class="expand-bar">'+
        '<button class="btn-exp"'+
        ' id="histBtnToggleExpand"'+
        ' onclick="toggleHistExpandAll()">'+
        (histAllExpanded?'&#9650; Collapse':'&#9660; Expand')+
        '</button></div>';
  html+='</div>';

  html+='<div id="histTableWrap">';
  html+=buildHistCards(pageGroups,histType);
  html+='</div>';

  if (histPageSize!==0&&totalPages>1){
    html+=renderHistPagination(total,totalPages,start,end,histCurPage);
  } else {
    html+='<div class="pagination-bar">'+
          '<span class="pg-info">'+
          'Showing all '+total+' records</span></div>';
  }

  document.getElementById('mainContent').innerHTML=html;
  document.getElementById('fab').className='fab';
}

function renderHistPagination(total,totalPages,start,end,curPg) {
  var html='<div class="pagination-bar">';
  html+='<button class="pg-btn"'+
        ' onclick="histGoPage(1)"'+
        (curPg<=1?' disabled':'')+
        '>&#171;</button>';
  html+='<button class="pg-btn"'+
        ' onclick="histGoPage('+(curPg-1)+')"'+
        (curPg<=1?' disabled':'')+
        '>&#8249;</button>';

  var sp=Math.max(1,curPg-2);
  var ep=Math.min(totalPages,curPg+2);

  if (sp>1){
    html+='<button class="pg-btn"'+
          ' onclick="histGoPage(1)">1</button>';
    if (sp>2)
      html+='<span class="pg-info">...</span>';
  }
  for (var i=sp;i<=ep;i++){
    html+='<button class="pg-btn'+
          (i===curPg?' active':'')+'"'+
          ' onclick="histGoPage('+i+')">'+
          i+'</button>';
  }
  if (ep<totalPages){
    if (ep<totalPages-1)
      html+='<span class="pg-info">...</span>';
    html+='<button class="pg-btn"'+
          ' onclick="histGoPage('+totalPages+')">'+
          totalPages+'</button>';
  }
  html+='<button class="pg-btn"'+
        ' onclick="histGoPage('+(curPg+1)+')"'+
        (curPg>=totalPages?' disabled':'')+
        '>&#8250;</button>';
  html+='<button class="pg-btn"'+
        ' onclick="histGoPage('+totalPages+')"'+
        (curPg>=totalPages?' disabled':'')+
        '>&#187;</button>';
  html+='<span class="pg-info">'+
        (start+1)+'&ndash;'+end+
        ' of '+total+'</span>';
  html+='</div>';
  return html;
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
  card.classList.toggle('expanded');
}

function histExpandAll() {
  histAllExpanded=true;
  document.querySelectorAll('#histTableWrap .po-card')
    .forEach(function(c){ c.classList.add('expanded'); });
}

function histCollapseAll() {
  histAllExpanded=false;
  document.querySelectorAll('#histTableWrap .po-card')
    .forEach(function(c){ c.classList.remove('expanded'); });
}

function toggleHistExpandAll() {
  if (histAllExpanded) { histCollapseAll(); }
  else { histExpandAll(); }
  var btn=document.getElementById('histBtnToggleExpand');
  if (btn) btn.innerHTML=
    histAllExpanded?'&#9650; Collapse':'&#9660; Expand';
}

