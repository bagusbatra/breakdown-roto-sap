/* ================================================================
   FETCH LIST — PR Pending
   ================================================================ */
function fetchList(estkz) {
  fetch(API_URL+'?action=GET_LIST'+
        '&werks='+encodeURIComponent(curPlant)+
        '&bsart='+encodeURIComponent(curBsart)+
        '&estkz='+encodeURIComponent(estkz||''))
    .then(function(r){return r.json();})
    .then(function(res){
      if (res.status!=='S'){
        showEmpty(res.message||'Gagal memuat');
        return;
      }
      allData=res.data||[];
      curPage=1;
      renderList();
    })
    .catch(function(e){
      showEmpty('Error: '+e.message);
    });
}

/* ================================================================
   FETCH HISTORY APPROVE
   ================================================================ */
function fetchHistApp() {
  fetch(API_URL+'?action=GET_HIST_APP'+
        '&werks='+encodeURIComponent(curPlant)+
        '&bsart='+encodeURIComponent(curBsart))
    .then(function(r){return r.json();})
    .then(function(res){
      renderHistTable(res.data||[],'approve');
    })
    .catch(function(e){
      showEmpty('Error: '+e.message);
    });
}

/* ================================================================
   FETCH HISTORY REJECT
   ================================================================ */
function fetchHistRej() {
  fetch(API_URL+'?action=GET_HIST_REJ'+
        '&werks='+encodeURIComponent(curPlant)+
        '&bsart='+encodeURIComponent(curBsart))
    .then(function(r){return r.json();})
    .then(function(res){
      renderHistTable(res.data||[],'reject');
    })
    .catch(function(e){
      showEmpty('Error: '+e.message);
    });
}

/* ================================================================
   ESTKZ FILTER
   ================================================================ */
/* Setiap filter yang diterapkan menutup panelnya. Cukup mematikan
   flag sebelum render, karena toolbar dibangun ulang dari
   filterPanelOpen. onEstkzFilter merender skeleton dulu, jadi
   panelnya pun ikut hilang bersama toolbar lama. */
function onEstkzFilter(val) {
  curEstkzFilter=val;
  selBanfns={};
  filterPanelOpen=false;
  showSkeleton();
  fetchList(val);
}

function onPlantSubFilter(val) {
  curPlantSub=val;
  curPage=1;
  filterPanelOpen=false;
  renderList();
}

function onSortFilter(val) {
  curSort=val;
  curPage=1;
  filterPanelOpen=false;
  renderList();
}

function onHistPlantSubFilter(val) {
  histPlantSub=val;
  histCurPage=1;
  filterPanelOpen=false;
  renderHistContent();
}

/* ================================================================
   FILTER PANEL — tombol Filter di toolbar pending & history,
   membungkus filter sekunder (ESTKZ + plant) jadi satu dropdown
   supaya toolbar tetap ringkas.
   ================================================================ */
function setFilterPanel(open) {
  filterPanelOpen=open;
  var panel=document.getElementById('filterPanel');
  var btn  =document.getElementById('btnFilter');
  if (panel) panel.classList.toggle('open',open);
  if (btn)   btn.setAttribute('aria-expanded',open?'true':'false');
}

function toggleFilterPanel(e) {
  if (e) e.stopPropagation();
  setFilterPanel(!filterPanelOpen);
}

document.addEventListener('click', function(e){
  var panel=document.getElementById('filterPanel');
  var btn  =document.getElementById('btnFilter');
  if (panel && btn && !btn.contains(e.target) && !panel.contains(e.target)){
    setFilterPanel(false);
  }
});

document.addEventListener('keydown', function(e){
  if (e.key==='Escape' && filterPanelOpen && !modalStack.length){
    setFilterPanel(false);
    var btn=document.getElementById('btnFilter');
    if (btn) btn.focus();
  }
});

function resetPrFilters() {
  curPlantSub='';
  curSort='newest';
  curPage=1;
  filterPanelOpen=false;
  if (curEstkzFilter){
    curEstkzFilter='';
    selBanfns={};
    showSkeleton();
    fetchList('');
  } else {
    renderList();
  }
}

function resetHistFilters() {
  histPlantSub='';
  histDateFilter=currentMonthYM();
  histCurPage=1;
  filterPanelOpen=false;
  renderHistContent();
}

function onHistDateFilter(val) {
  histDateFilter=val;
  histCurPage=1;
  filterPanelOpen=false;
  renderHistContent();
}

/* ================================================================
   TOOLBAR — potongan yang dipakai bersama oleh list & history.
   ================================================================ */
function buildSearchBox(id,handler,value,placeholder) {
  return '<div class="search-wrap">'+
    svgIcon('i-search')+
    '<input type="text" id="'+id+'"'+
    ' aria-label="'+escHtml(placeholder)+'"'+
    ' placeholder="'+escHtml(placeholder)+'"'+
    ' value="'+escHtml(value)+'"'+
    ' onkeydown="if(event.key===\'Enter\')'+handler+'(this.value)"'+
    ' onblur="'+handler+'(this.value)">'+
    '</div>';
}

function buildPageSizeSelect(sizes,current,handler) {
  var html='<select class="select" aria-label="Jumlah baris per halaman"'+
    ' onchange="'+handler+'(parseInt(this.value))">';
  sizes.forEach(function(s){
    html+='<option value="'+s+'"'+(current===s?' selected':'')+'>'+
      (s===0?'Semua':s+' per halaman')+'</option>';
  });
  return html+'</select>';
}

function buildFilterButton(count) {
  return '<button type="button" class="btn btn-outline btn-filter"'+
    ' id="btnFilter" aria-expanded="'+(filterPanelOpen?'true':'false')+'"'+
    ' aria-controls="filterPanel" onclick="toggleFilterPanel(event)">'+
    svgIcon('i-filter')+' Filter'+
    (count>0?'<span class="filter-badge">'+count+'</span>':'')+
    '</button>';
}

function buildExpandButton(id,expanded,handler) {
  return '<button type="button" class="btn btn-ghost" id="'+id+'"'+
    ' onclick="'+handler+'()">'+
    svgIcon('i-chevron-down')+' '+
    (expanded?'Tutup Semua':'Buka Semua')+
    '</button>';
}

function buildPlantSubSelect(primaryPlant,current,handler) {
  var html='<select class="select select--accent select--block"'+
    ' aria-label="Filter plant" onchange="'+handler+'(this.value)">';
  html+='<option value=""'+(current===''?' selected':'')+'>Semua Plant</option>';
  getSidebarWerks(primaryPlant).forEach(function(w){
    html+='<option value="'+w+'"'+(current===w?' selected':'')+'>Plant '+w+'</option>';
  });
  return html+'</select>';
}

/* ================================================================
   GET FILTERED (client-side search)
   ================================================================ */
function getFiltered() {
  var arr=searchKw
    ?allData.filter(function(d){
        var kw=searchKw.toLowerCase();
        return d.banfn.toLowerCase().indexOf(kw)>-1||
          (d.ernam_full&&
           d.ernam_full.toLowerCase().indexOf(kw)>-1)||
          (d.ernam&&
           d.ernam.toLowerCase().indexOf(kw)>-1)||
          (d.txz01&&
           d.txz01.toLowerCase().indexOf(kw)>-1)||
          (d.ekgrp&&
           d.ekgrp.toLowerCase().indexOf(kw)>-1)||
          (d.estkz&&
           getEstkzLabel(d.estkz)
             .toLowerCase().indexOf(kw)>-1);
      })
    :allData.slice();
  if (curPlantSub)
    arr=arr.filter(function(d){ return d.werks===curPlantSub; });
  if (curSort==='oldest')
    arr.sort(function(a,b){
      return (a.badat||'').localeCompare(b.badat||'');
    });
  else
    arr.sort(function(a,b){
      return (b.badat||'').localeCompare(a.badat||'');
    });
  return arr;
}

/* ================================================================
   RENDER LIST — PR Pending
   ================================================================ */
function renderList() {
  filteredData  =getFiltered();
  var total     =filteredData.length;
  var totalPages=pageSize===0
    ?1:Math.ceil(total/pageSize)||1;
  if (curPage>totalPages) curPage=1;

  /* Deep-link: lompat ke halaman yang memuat PR tujuan. */
  if (deepLink && pageSize>0){
    var dIdx=indexOfBanfn(filteredData,deepLink.banfn);
    if (dIdx>=0) curPage=Math.floor(dIdx/pageSize)+1;
  }

  var start =pageSize===0?0:(curPage-1)*pageSize;
  var end   =pageSize===0?total
    :Math.min(start+pageSize,total);
  var pageData=filteredData.slice(start,end);

  var primaryPlant=curPlant.split(',')[0];
  var catDef =getCategoryDef(curPlant,curCategory);
  var catIcon=catDef?catDef.icon:'i-clipboard';
  var catLbl =catDef?catDef.label:'PR';

  var html='';

  /* Header + toolbar sebagai satu blok sticky */
  html+='<div class="page-sticky">';

  html+='<div class="pg-hdr">'+
        '<h1 class="pg-title">'+svgIcon(catIcon,'ico-lg')+
        escHtml(catLbl)+' &mdash; '+escHtml(getPlantLabel(curPlant))+'</h1>'+
        '<div class="pg-sub">'+total+' PR menunggu approval';
  if (curEstkzFilter==='MRP')
    html+=' &mdash; <span class="pg-sub-mrp">Hanya MRP</span>';
  else if (curEstkzFilter==='NONMRP')
    html+=' &mdash; <span class="pg-sub-nonmrp">Hanya Non-MRP</span>';
  html+='</div></div>';

  html+='<div class="toolbar">';

  if (isApprover)
    html+='<button type="button" class="btn btn-outline" id="btnSelAll"'+
          ' onclick="toggleSelectAll()">'+
          svgIcon('i-check')+' Pilih Semua</button>';

  html+=buildSearchBox('searchInp','onSearchTrigger',searchKw,
        'Cari No PR, Pembuat...');
  html+=buildPageSizeSelect([10,20,50,0],pageSize,'changePageSize');

  /* Urutan ikut dihitung sebagai filter aktif bila bukan default. */
  var prFiltCnt=(curEstkzFilter?1:0)+(curPlantSub?1:0)+
                (curSort!=='newest'?1:0);
  html+='<div class="filter-wrap">';
  html+=buildFilterButton(prFiltCnt);
  html+='<div class="filter-panel'+(filterPanelOpen?' open':'')+'" id="filterPanel">';

  html+='<div class="filter-panel-row">'+
        '<span class="filter-panel-lbl">Urutkan</span>'+
        '<select class="select select--accent select--block"'+
        ' aria-label="Urutkan" onchange="onSortFilter(this.value)">'+
        '<option value="newest"'+(curSort==='newest'?' selected':'')+
        '>&#8595; Terbaru</option>'+
        '<option value="oldest"'+(curSort==='oldest'?' selected':'')+
        '>&#8593; Terlama</option>'+
        '</select></div>';

  html+='<div class="filter-panel-row">'+
        '<span class="filter-panel-lbl">Jenis PR</span>'+
        '<select class="select select--accent select--block"'+
        ' aria-label="Filter jenis PR" onchange="onEstkzFilter(this.value)">'+
        '<option value=""'+(curEstkzFilter===''?' selected':'')+'>Semua PR</option>'+
        '<option value="MRP"'+(curEstkzFilter==='MRP'?' selected':'')+'>MRP saja (B)</option>'+
        '<option value="NONMRP"'+(curEstkzFilter==='NONMRP'?' selected':'')+'>Non-MRP saja</option>'+
        '</select></div>';

  html+='<div class="filter-panel-row">'+
        '<span class="filter-panel-lbl">Plant</span>'+
        buildPlantSubSelect(primaryPlant,curPlantSub,'onPlantSubFilter')+
        '</div>';

  if (prFiltCnt>0)
    html+='<button type="button" class="filter-panel-reset"'+
          ' onclick="resetPrFilters()">Reset Filter</button>';
  html+='</div></div>';

  html+=buildExpandButton('btnToggleExpand',allExpanded,'toggleExpandAll');

  html+='<div class="pg-count">'+
        (total!==allData.length
          ?total+' dari '+allData.length:total)+
        ' PR</div>';

  html+='</div></div>'; /* toolbar + page-sticky */

  /* Kartu */
  html+='<div id="cardContainer">';

  if (total===0) {
    html+='<div class="empty empty--inline">'+
          '<div class="empty-ico">'+svgIcon('i-search','ico-xl')+'</div>'+
          '<div class="empty-txt">'+
          (curEstkzFilter
            ?'Tidak ada PR '+
              (curEstkzFilter==='MRP'?'MRP':'Non-MRP')+' pending'
            :'Tidak ada '+escHtml(catLbl)+' pending')+
          '</div></div>';
  } else {
    pageData.forEach(function(pr){
      var isMRP =(pr.estkz==='B');
      var ecls  =isMRP?'b-mrp':'b-nonmrp';
      var elbl  =getEstkzLabel(pr.estkz);
      var itCnt =parseInt(pr.item_count)||0;
      var sel   =!!selBanfns[pr.banfn];

      html+='<div class="po-card'+
            (allExpanded?' expanded':'')+
            (sel?' selected':'')+
            (isApprover?'':' no-cb')+
            '" id="card_'+pr.banfn+'"'+
            ' onclick="toggleExpand(\''+pr.banfn+'\')">';

      html+='<div class="card-top'+(isApprover?'':' card-top--nocb')+'">';

      if (isApprover)
        html+='<input type="checkbox" class="card-cb"'+
              ' data-banfn="'+pr.banfn+'"'+
              ' aria-label="Pilih PR '+pr.banfn+'"'+
              (sel?' checked':'')+
              ' onclick="event.stopPropagation();'+
              'toggleSelect(\''+pr.banfn+'\')">';

      html+='<div class="card-main">';
      html+='<div class="card-head">'+
            '<span class="card-num">'+escHtml(pr.banfn)+'</span>'+
            '<button type="button" class="btn btn-ghost btn-xs"'+
            ' onclick="event.stopPropagation();showItemTextModal(\''+pr.banfn+'\')">'+
            svgIcon('i-file-text','ico-sm')+' Lihat Teks</button>'+
            '</div>';

      html+='<div class="card-badges">';
      html+='<span class="badge b-pending">Pending</span>';
      html+='<span class="badge b-plant">'+escHtml(pr.werks)+' '+
            escHtml(PLANT_LABELS[pr.werks]||'')+'</span>';
      html+='<span class="badge '+ecls+'">'+escHtml(elbl)+'</span>';
      if (itCnt>0)
        html+='<span class="badge b-items">'+itCnt+' item</span>';
      html+='</div>'; /* card-badges */
      html+='</div>'; /* card-main */

      html+=renderCardAmount(pr.totals);

      html+='<button type="button" class="card-expand"'+
            ' aria-expanded="'+(allExpanded?'true':'false')+'"'+
            ' aria-controls="det_'+pr.banfn+'"'+
            ' aria-label="Tampilkan detail item PR '+pr.banfn+'"'+
            ' onclick="event.stopPropagation();toggleExpand(\''+pr.banfn+'\')">'+
            svgIcon('i-chevron-down')+'</button>';

      html+='</div>'; /* card-top */

      html+='<div class="card-meta">';
      html+='<div><div class="meta-lbl">Dibuat Oleh</div>'+
            '<div class="meta-val">'+
            escHtml(pr.ernam_full||pr.ernam)+'</div></div>';
      html+='<div><div class="meta-lbl">Deskripsi</div>'+
            '<div class="meta-val meta-val--sm">'+
            escHtml(pr.txz01||'-')+'</div></div>';
      html+='<div><div class="meta-lbl">Purch. Group</div>'+
            '<div class="meta-val">'+escHtml(pr.ekgrp||'-')+'</div></div>';
      html+='<div><div class="meta-lbl">Tgl PR</div>'+
            '<div class="meta-val">'+escHtml(pr.badat||'-')+'</div></div>';
      html+='</div>'; /* card-meta */

      html+='<div class="card-detail" id="det_'+pr.banfn+'"'+
            ' onclick="event.stopPropagation()">';
      html+='<div id="detContent_'+pr.banfn+'">'+
            '<div class="card-detail-msg">'+
            '<div class="lo-spin lo-spin-sm"></div>'+
            'Memuat detail item...</div>';
      html+='</div></div>';
      html+='</div>'; /* po-card */
    });
  }

  html+='</div>'; /* cardContainer */

  document.getElementById('mainContent').innerHTML=html;

  /* Pagination hidup di action bar, bukan di alur konten. */
  setPager(total>0?renderPagination(total,totalPages,start,end):'');
  setActionBar(total>0);

  if (isApprover&&total>0){
    document.getElementById('fab').className='fab show';
    updateFabInfo();
  } else {
    document.getElementById('fab').className='fab';
  }

  if (allExpanded){
    pageData.forEach(function(pr){
      loadDetail(pr.banfn);
    });
  }

  if (deepLink) applyDeepLink();
}
