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
      renderHistTable(
        res.data||[],
        'approve'
      );
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
      renderHistTable(
        res.data||[],
        'reject'
      );
    })
    .catch(function(e){
      showEmpty('Error: '+e.message);
    });
}

/* ================================================================
   ESTKZ FILTER
   ================================================================ */
function onEstkzFilter(val) {
  curEstkzFilter=val;
  selBanfns={};
  showLoading();
  fetchList(val);
}

function onPlantSubFilter(val) {
  curPlantSub=val;
  curPage=1;
  renderList();
}

function onHistPlantSubFilter(val) {
  histPlantSub=val;
  histCurPage=1;
  renderHistContent();
}

/* ================================================================
   FILTER PANEL — tombol Filter di toolbar pending & history,
   membungkus filter sekunder (ESTKZ + plant) jadi satu dropdown
   supaya toolbar tetap ringkas.
   ================================================================ */
function toggleFilterPanel(e) {
  if (e) e.stopPropagation();
  filterPanelOpen=!filterPanelOpen;
  var panel=document.getElementById('filterPanel');
  var btn  =document.getElementById('btnFilter');
  if (panel) panel.classList.toggle('open',filterPanelOpen);
  if (btn)   btn.classList.toggle('active',filterPanelOpen);
}

document.addEventListener('click', function(e){
  var panel=document.getElementById('filterPanel');
  var btn  =document.getElementById('btnFilter');
  if (panel && btn && !btn.contains(e.target) && !panel.contains(e.target)){
    panel.classList.remove('open');
    btn.classList.remove('active');
    filterPanelOpen=false;
  }
});

function resetPrFilters() {
  curPlantSub='';
  curPage=1;
  if (curEstkzFilter){
    curEstkzFilter='';
    selBanfns={};
    showLoading();
    fetchList('');
  } else {
    renderList();
  }
}

function resetHistFilters() {
  histPlantSub='';
  histDateFilter=currentMonthYM();
  histCurPage=1;
  renderHistContent();
}

function onHistDateFilter(val) {
  histDateFilter=val;
  histCurPage=1;
  renderHistContent();
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
  var catIcon=catDef?catDef.icon:'&#128203;';
  var catLbl =catDef?catDef.label:'PR';

  var html='';

  /* Sticky header */
  html+='<div class="sticky-top">'+
        '<div class="pg-hdr">'+
        '<div class="pg-title">'+
        catIcon+' '+catLbl+' &mdash; '+
        getPlantLabel(curPlant)+'</div>'+
        '<div class="pg-sub">'+
        total+' PR menunggu approval';
  if (curEstkzFilter==='MRP')
    html+=' &mdash; <span style="color:#1d4ed8;'+
          'font-weight:600;">MRP only</span>';
  else if (curEstkzFilter==='NONMRP')
    html+=' &mdash; <span style="color:#b45309;'+
          'font-weight:600;">Non-MRP only</span>';
  html+='</div></div></div>';


  /* Sticky toolbar */
  html+='<div class="sticky-toolbar">'+
        '<div class="toolbar">';

  if (isApprover)
    html+='<button class="btn-selall"'+
          ' id="btnSelAll"'+
          ' onclick="toggleSelectAll()">'+
          '&#9744; Select All</button>';

  html+='<div class="search-wrap">'+
        '<span>&#128269;</span>'+
        '<input type="text" id="searchInp"'+
        ' placeholder="Cari No PR, Pembuat..."'+
        ' value="'+escHtml(searchKw)+'"'+
        ' onkeydown="if(event.key===\'Enter\')'+
        'onSearchTrigger(this.value)"'+
        ' onblur="onSearchTrigger(this.value)">'+
        '</div>';

  html+='<select class="page-size-select"'+
        ' onchange="changePageSize('+
        'parseInt(this.value))">';
  [10,20,50,0].forEach(function(s){
    html+='<option value="'+s+'"'+
          (pageSize===s?' selected':'')+'>'+
          (s===0?'All':s+' per page')+
          '</option>';
  });
  html+='</select>';

  html+='<select class="sort-select"'+
        ' onchange="onSortChange(this.value)">';
  html+='<option value="newest"'+
        (curSort==='newest'?' selected':'')+
        '>&#8595; Terbaru</option>';
  html+='<option value="oldest"'+
        (curSort==='oldest'?' selected':'')+
        '>&#8593; Terlama</option>';
  html+='</select>';

  var prFiltCnt=(curEstkzFilter?1:0)+(curPlantSub?1:0);
  html+='<div class="filter-wrap">';
  html+='<button class="btn-filter'+(filterPanelOpen?' active':'')+'"'+
        ' id="btnFilter" onclick="toggleFilterPanel(event)">'+
        '&#9881; Filter'+(prFiltCnt>0?'<span class="filter-badge">'+prFiltCnt+'</span>':'')+
        '</button>';
  html+='<div class="filter-panel'+(filterPanelOpen?' open':'')+'" id="filterPanel">';
  html+='<div class="filter-panel-row"><span class="filter-panel-lbl">Jenis PR</span>';
  html+='<select class="estkz-select"'+
        ' onchange="onEstkzFilter(this.value)">';
  html+='<option value=""'+
        (curEstkzFilter===''?' selected':'')+
        '>Semua PR</option>';
  html+='<option value="MRP"'+
        (curEstkzFilter==='MRP'?' selected':'')+
        '>MRP saja (B)</option>';
  html+='<option value="NONMRP"'+
        (curEstkzFilter==='NONMRP'
          ?' selected':'')+
        '>Non-MRP saja</option>';
  html+='</select></div>';
  html+='<div class="filter-panel-row"><span class="filter-panel-lbl">Plant</span>';
  html+='<select class="estkz-select" onchange="onPlantSubFilter(this.value)">';
  html+='<option value=""'+(curPlantSub===''?' selected':'')+'>Semua Plant</option>';
  getSidebarWerks(primaryPlant).forEach(function(w){
    html+='<option value="'+w+'"'+(curPlantSub===w?' selected':'')+'>Plant '+w+'</option>';
  });
  html+='</select></div>';
  if (prFiltCnt>0) html+='<div class="filter-panel-reset" onclick="resetPrFilters()">Reset Filter</div>';
  html+='</div></div>';

  html+='<div class="expand-bar">'+
        '<button class="btn-exp"'+
        ' id="btnToggleExpand"'+
        ' onclick="toggleExpandAll()">'+
        (allExpanded?'&#9650; Collapse':'&#9660; Expand')+
        '</button></div>';

  html+='<div class="pg-count">'+
        (total!==allData.length
          ?total+' of '+allData.length:total)+
        ' PR</div>';

  html+='</div></div>';

  /* Cards */
  html+='<div id="cardContainer">';

  if (total===0) {
    html+='<div class="empty"'+
          ' style="padding:40px 20px;">'+
          '<div class="empty-ico">&#128270;</div>'+
          '<div class="empty-txt">'+
          (curEstkzFilter
            ?'Tidak ada PR '+
              (curEstkzFilter==='MRP'
                ?'MRP':'Non-MRP')+' pending'
            :'Tidak ada '+catLbl+' pending')+
          '</div></div>';
  } else {
    pageData.forEach(function(pr){
      var isMRP  =(pr.estkz==='B');
      var ecls   =isMRP?'b-mrp':'b-nonmrp';
      var elbl   =getEstkzLabel(pr.estkz);
      var itCnt  =parseInt(pr.item_count)||0;

      html+='<div class="po-card'+
            (allExpanded?' expanded':'')+
            '" id="card_'+pr.banfn+'"'+
            ' onclick="toggleExpand(\''+
            pr.banfn+'\')">';

      html+='<div class="card-top">';
      if (isApprover)
        html+='<input type="checkbox"'+
              ' class="card-cb"'+
              ' data-banfn="'+pr.banfn+'"'+
              (selBanfns[pr.banfn]?' checked':'')+
              ' onclick="event.stopPropagation();'+
              'toggleSelect(\''+pr.banfn+'\')">';

      html+='<span class="card-num">'+
            pr.banfn+'</span>';
      html+='<button class="btn-exp" style="height:28px;padding:0 10px;font-size:11.5px;"'+
            ' onclick="event.stopPropagation();showItemTextModal(\''+pr.banfn+'\')">'+
            '&#128196; Lihat Teks</button>';
      html+='<span class="badge b-pending">'+
            '&#9679; Pending</span>';
      html+='<span class="badge b-plant">'+
            escHtml(pr.werks)+' '+
            escHtml(PLANT_LABELS[pr.werks]||'')+
            '</span>';
      html+='<span class="badge '+ecls+'">'+
            escHtml(elbl)+'</span>';
      if (itCnt>0)
        html+='<span class="badge b-items">'+
              itCnt+' item</span>';

      html+=renderCardAmount(pr.totals);

      html+='</div>'; /* card-top */

      html+='<div class="card-meta">';
      html+='<div><div class="meta-lbl">'+
            'Dibuat Oleh</div>'+
            '<div class="meta-val">'+
            escHtml(pr.ernam_full||pr.ernam)+
            '</div></div>';
      html+='<div><div class="meta-lbl">'+
            'Deskripsi</div>'+
            '<div class="meta-val"'+
            ' style="font-size:12px;">'+
            escHtml(pr.txz01||'-')+
            '</div></div>';
      html+='<div><div class="meta-lbl">'+
            'Purch. Group</div>'+
            '<div class="meta-val">'+
            escHtml(pr.ekgrp||'-')+
            '</div></div>';
      html+='<div><div class="meta-lbl">'+
            'Tgl PR</div>'+
            '<div class="meta-val">'+
            escHtml(pr.badat||'-')+
            '</div></div>';
      html+='</div>'; /* card-meta */

      html+='<div class="card-detail"'+
            ' id="det_'+pr.banfn+'"'+
            ' onclick="event.stopPropagation()">';
      html+='<div id="detContent_'+pr.banfn+'">';
      html+='<div style="padding:16px;'+
            'text-align:center;'+
            'color:var(--muted);font-size:13px;">'+
            '<div class="lo-spin"'+
            ' style="width:16px;height:16px;'+
            'border-width:2px;'+
            'margin:0 auto 8px;"></div>'+
            'Expand untuk memuat detail...</div>';
      html+='</div></div>';
      html+='</div>'; /* po-card */
    });
  }

  html+='</div>'; /* cardContainer */
  html+=renderPagination(
    total,totalPages,start,end);

  document.getElementById('mainContent')
    .innerHTML=html;

  if (isApprover&&total>0){
    document.getElementById('fab').className=
      'fab show';
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

