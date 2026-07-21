/* ================================================================
   app-history.js — ZPO_REL_BSP
   Modul riwayat aksi release/reject PO.

   PORT dari ZPR_REL_BSP/MIMEs/app-history.js, diremap ke domain PO
   (lihat .superpowers/sdd/zpo-data-schema.md, bagian "History
   endpoints (Task 8)"). Backend GET_HISTORY_REL/REJ/COUNT/ITEMS
   (main.htm) TIDAK diubah.

   PERBEDAAN STRUKTUR DATA vs ZPR (penting, hasil baca langsung
   main.htm — bukan sekadar rename field):
   - ZPR: satu ROW GET_HIST_APP/REJ = satu ITEM PR (header PR
     diulang di tiap row items-nya) -> groupHistByBanfn() mengelompokkan
     banyak row jadi satu kartu per PR, lalu render tabel item dari
     field-field row itu sendiri (bnfpo/txz01/menge/...), dan total
     kartu dihitung dgn menjumlah field `total` tiap row.
   - ZPO: satu ROW GET_HISTORY_REL/REJ = satu EVENT release/reject
     (1 row = 1 ebeln, TANPA rincian item, TANPA field total/status
     — lihat main.htm:88-98/260-270, ty_rel_log/ty_rej_log memang
     tidak punya field itu). Item PO (untuk tabel expand) HANYA
     tersedia lewat endpoint terpisah GET_HISTORY_ITEMS (ebelns),
     dipanggil lazy saat kartu di-expand — bukan dihitung dari data
     GET_HISTORY_REL/REJ. Karena itu:
       * TIDAK ADA fungsi group/dedup di sini (beda dari ZPR yang
         group by banfn krn 1 row ZPR = 1 item). buildHistCards()
         me-render SATU KARTU PER ROW histData langsung (persis
         legacy main.htm renderHistoryPage/histData.forEach — lihat
         catatan detail di dekat buildHistCards() di bawah), krn
         satu PO dgn release bertingkat bisa punya BEBERAPA row
         (=BEBERAPA event, ebeln sama) dalam satu halaman; dedup by
         ebeln akan MENGHILANGKAN event lama dari tampilan (regresi
         audit-trail) walau histTotal/paginasi tetap benar. Kartu
         TIDAK menampilkan total nilai (field `total`/`status` yg
         disebut di draft skema zpo-data-schema.md TIDAK ADA di
         response asli main.htm — dicek langsung ke kode ABAP, bukan
         diasumsikan); nilai per item (netpr/netwr) baru muncul di
         tabel detail setelah expand (via GET_HISTORY_ITEMS),
         formatnya formatNumHist seperti history ZPR.
   - Search & filter tanggal SUDAH dilakukan backend (param search/
     date_from/date_to dibaca & diproses di main.htm) — beda dari
     ZPR yang fetch semua lalu filter di klien. Jadi getFilteredHist()
     ZPR (client-side filter) TIDAK di-port; setiap perubahan
     pencarian/tanggal/halaman/ukuran halaman di sini men-trigger
     RE-FETCH ke server (lihat renderHistContent/fetchHistPage),
     BUKAN slice/filter array klien.
   - histPlantSub / buildPlantSubSelect (ZPR, filter sub-plant utk
     sidebar multi-werks) DIBUANG — sama seperti keputusan Task 7 di
     app-list.js: curPlant ZPO sudah satu werks pasti, tak ada
     sub-plant lagi. Filter panel history di sini hanya berisi
     "Periode".
   - Page-size "0 = Semua" (ZPR) DIBUANG utk history — backend
     memperlakukan limit=0 sebagai "pakai default 20"
     (main.htm: `IF lv_hr_limit = 0. lv_hr_limit = 20. ENDIF.`),
     BUKAN "tanpa batas" seperti konvensi pageSize=0 di app-list.js.
     Menawarkan opsi itu di sini akan menyesatkan (UI bilang "Semua",
     server diam-diam memotong ke 20). Pilihan yg ditawarkan: 10/25/50.
   - Wording "Approve"->"Release" (aturan yg sama dipakai app-list.js
     Task 7: showModalApprove->showModalRelease, sbLink "History
     Release"): badge & judul di sini pakai "Released"/"History
     Release", BUKAN "Approved"/"History Approve" ala ZPR. Nama
     variabel/fungsi internal tetap pakai 'approve' (histType) supaya
     konsisten dgn mode 'hist_app' punya app-ui.js — hanya teks
     tampilan yang disesuaikan.
   - Badge sidebar sbCounts.hist_app/hist_rej: GET_HISTORY_COUNT
     mengembalikan angka DATAR per werks (count_rel/count_rej), tanpa
     breakdown per potype (beda dari sbCounts.pending Task 7 yang
     memang berasal dari data per-bsart). Karena app-ui.js
     `sumCounts()` menjumlah sbCounts[group][werks][kode] utk semua
     kode potype plant tsb, dan yang ditampilkan di sidebar cuma
     SATU badge total (bukan per potype), angka backend disimpan
     di SATU kode potype pertama (getPoTypeCodes(werks)[0]) supaya
     sumCounts() tetap menjumlahkan dgn benar tanpa perlu breakdown
     asli yang memang tidak ada. Lihat setHistCountBadge().
   - SATU KARTU PER ROW (bukan per ebeln): GET_HISTORY_REL/REJ
     mengembalikan SATU ROW PER CHANGE DOCUMENT (cdhdr) — PO dgn
     release bertingkat (multi-level) menghasilkan BEBERAPA row
     dgn ebeln yang SAMA dalam satu halaman (mis. direlease level 1,
     lalu level 2 -> 2 row terpisah, masing2 event release-nya
     sendiri). Legacy main.htm (renderHistoryPage,
     `histData.forEach(function(d, idx){...})`) me-render SATU KARTU
     PER ROW, DOM id `hcard_<idx>` (index array, bukan ebeln) —
     TIDAK pernah dedup/group by ebeln. Port di sini MENGIKUTI
     semantik itu persis: histData di-iterate langsung (tanpa
     grouping), id kartu `histCard_<idx>`, supaya audit trail
     (setiap event release/reject) tetap utuh & terlihat semua,
     bukan hanya event terakhir per PO. Item PO (utk tabel expand)
     tetap HANYA tersedia lewat GET_HISTORY_ITEMS (ebelns), lazy per
     kartu — cache-nya boleh tetap per ebeln (isi item sama utk ebeln
     yg sama terlepas dari event mana), tapi target DOM update-nya
     SELALU per-idx (`histItemsBody_<idx>`) supaya kartu2 dgn ebeln
     sama tetap expand independen satu sama lain.
   ================================================================ */
'use strict';

/* ================================================================
   STATE — dimiliki modul ini. histCurPage/histSearchKw/
   histAllExpanded/histDateFilter SUDAH dideklarasikan & di-reset
   oleh app-ui.js (switchView) — TIDAK dideklarasikan ulang di sini
   (beda dgn ZPR yg app-core.js-nya tak memilikinya). histPlantSub
   juga sudah dideklarasikan di app-ui.js tapi SENGAJA tidak dipakai
   di modul ini (fitur sub-plant dibuang, lihat komentar header).
   ================================================================ */
var histData        = [];   // rows mentah dari fetch terakhir (1 halaman server)
var histType         = 'approve'; // 'approve' | 'reject' — diturunkan dari curMode
var histTotal        = 0;   // total row (server), dasar hitung paginasi
var histPageSize     = 10;
var histItemsCache   = {};  // ebeln -> array item (GET_HISTORY_ITEMS), lazy per-expand

/* ================================================================
   TANGGAL — histDateFilter (YYYYMM) -> {date_from,date_to} YYYYMMDD
   utk parameter backend GET_HISTORY_REL/REJ/COUNT.
   ================================================================ */
function histDateRangeParams() {
  var ym = histDateFilter || currentMonthYM();
  var y  = parseInt(ym.substr(0,4),10);
  var m  = parseInt(ym.substr(4,2),10);
  var lastDay = new Date(y,m,0).getDate();
  return {
    date_from: ym+'01',
    date_to:   ym+(lastDay<10?'0':'')+lastDay
  };
}

/* ================================================================
   ITEM TABLE (expand) — dari GET_HISTORY_ITEMS. netpr/netwr EKPO
   diformat via formatNumHist (app-core.js) — bukan formatAmount,
   krn nilai sudah mentah dari DB (lihat komentar formatNumHist).
   ================================================================ */
function renderHistItemTable(items) {
  if (!items || !items.length) {
    return '<div class="card-detail-msg">Tidak ada item.</div>';
  }
  var html = '<div class="card-detail-scroll"><table><thead><tr>'+
    '<th>Item</th><th>Deskripsi</th>'+
    '<th class="num">Jumlah</th><th>Satuan</th>'+
    '<th class="num">Harga</th><th class="num">Total</th>'+
    '<th>Mata Uang</th></tr></thead><tbody>';
  items.forEach(function(it){
    var w = it.waers||'';
    html+='<tr>';
    html+='<td class="cell-mono">'+escHtml(it.ebelp)+'</td>';
    html+='<td>'+escHtml(it.maktx||it.txz01||'-')+'</td>';
    html+='<td class="num">'+formatNumHist(it.menge)+'</td>';
    html+='<td>'+escHtml(it.meins||'-')+'</td>';
    html+='<td class="num">'+formatNumHist(it.netpr,w)+'</td>';
    html+='<td class="num">'+formatNumHist(it.netwr,w)+'</td>';
    html+='<td>'+escHtml(w||'-')+'</td>';
    html+='</tr>';
  });
  html+='</tbody></table></div>';
  return html;
}

/* ================================================================
   BUILD HISTORY CARDS — SATU KARTU PER ROW (satu event release/
   reject, bisa >1 kartu utk ebeln yg sama — lihat catatan header
   file). DOM id kartu dikunci ke INDEX row (histCard_<idx>), BUKAN
   ebeln, persis pola legacy main.htm (hcard_<idx>).
   ================================================================ */
function buildHistCards(rows,type) {
  var isApp=(type==='approve');

  if (rows.length===0){
    return '<div class="empty empty--inline">'+
           '<div class="empty-ico">'+svgIcon('i-search','ico-xl')+'</div>'+
           '<div class="empty-txt">Tidak ada history '+
           (isApp?'release':'reject')+'</div></div>';
  }

  var byCls=isApp?'meta-val--app':'meta-val--rej';
  var html='';

  rows.forEach(function(pr,idx){
    html+='<div class="po-card no-cb'+
          (histAllExpanded?' expanded':'')+
          '" id="histCard_'+idx+'" data-ebeln="'+escHtml(pr.ebeln)+'"'+
          ' data-idx="'+idx+'"'+
          ' onclick="toggleHistExpand('+idx+')">';

    html+='<div class="card-top card-top--nocb">';

    html+='<div class="card-main">';
    html+='<div class="card-head">'+
          '<span class="card-num">'+escHtml(pr.ebeln)+'</span>'+
          '<button type="button" class="btn btn-ghost btn-xs"'+
          ' onclick="event.stopPropagation();showItemTextModal(\''+pr.ebeln+'\')">'+
          svgIcon('i-file-text','ico-sm')+' Lihat Teks</button>'+
          '</div>';

    html+='<div class="card-badges">';
    html+='<span class="badge '+(isApp?'b-app':'b-rej')+'">'+
          svgIcon(isApp?'i-check':'i-x','ico-sm')+' '+
          (isApp?'Released':'Rejected')+'</span>';
    html+='<span class="badge b-plant">'+escHtml(pr.werks)+' '+
          escHtml(getPlantLabel(pr.werks))+'</span>';
    html+='<span class="badge b-cat">'+
          escHtml(getCategoryLabelByBsart(pr.werks,pr.bsart))+'</span>';
    html+='</div>'; /* card-badges */
    html+='</div>'; /* card-main */

    html+='<button type="button" class="card-expand"'+
          ' aria-expanded="'+(histAllExpanded?'true':'false')+'"'+
          ' aria-controls="histDet_'+idx+'"'+
          ' aria-label="Tampilkan detail item PO '+pr.ebeln+'"'+
          ' onclick="event.stopPropagation();toggleHistExpand('+idx+')">'+
          svgIcon('i-chevron-down')+'</button>';

    html+='</div>'; /* card-top */

    html+='<div class="card-meta">';
    html+='<div><div class="meta-lbl">Vendor</div>'+
          '<div class="meta-val">'+escHtml(pr.name1||'-')+'</div></div>';
    html+='<div><div class="meta-lbl">Kode Vendor</div>'+
          '<div class="meta-val">'+escHtml(pr.lifnr||'-')+'</div></div>';
    if (isApp){
      html+='<div><div class="meta-lbl">Direlease Oleh</div>'+
            '<div class="meta-val '+byCls+'">'+escHtml(pr.uname||'-')+'</div></div>';
      html+='<div><div class="meta-lbl">Release Code</div>'+
            '<div class="meta-val">'+escHtml(pr.frgco||'-')+'</div></div>';
    } else {
      html+='<div><div class="meta-lbl">Direject Oleh</div>'+
            '<div class="meta-val '+byCls+'">'+escHtml(pr.uname||'-')+'</div></div>';
    }
    html+='<div><div class="meta-lbl">Tanggal &amp; Waktu</div>'+
          '<div class="meta-val">'+escHtml(formatDate(pr.udate))+' '+
          escHtml(formatTime(pr.utime))+'</div></div>';
    html+='</div>'; /* card-meta */

    if (!isApp)
      html+='<div class="card-reason"><b>Alasan:</b> '+
            (pr.comment?escHtml(pr.comment):'<i>(Tidak ada komentar)</i>')+
            '</div>';

    html+='<div class="card-detail" id="histDet_'+idx+'"'+
          ' onclick="event.stopPropagation()">';
    html+='<div id="histItemsBody_'+idx+'">'+
          '<div class="card-detail-msg">Buka kartu untuk memuat item.</div>'+
          '</div>';
    html+='</div>'; /* card-detail */

    html+='</div>'; /* po-card */
  });

  return html;
}

/* ================================================================
   SEARCH / DATE / PAGE-SIZE TRIGGERS — semuanya RE-FETCH ke server
   (bukan filter/slice array klien), krn history server-paginated.
   ================================================================ */
function onHistSearchTrigger(val) {
  histSearchKw=val.trim(); histCurPage=1;
  renderHistContent();
}

function onHistDateFilter(val) {
  histDateFilter=val; histCurPage=1;
  filterPanelOpen=false;
  renderHistContent();
}

function resetHistFilters() {
  histDateFilter=currentMonthYM(); histCurPage=1;
  filterPanelOpen=false;
  renderHistContent();
}

/* ================================================================
   FETCH — GET_HISTORY_REL / GET_HISTORY_REJ (server search + date +
   paginasi). Dipanggil oleh renderHistContent() (entry point yg
   dipanggil switchView utk mode hist_app/hist_rej, app-ui.js) dan
   oleh histGoPage/histChangePageSize/onHistSearchTrigger/
   onHistDateFilter/resetHistFilters di atas.
   ================================================================ */
function renderHistContent() {
  histType = (curMode==='hist_app') ? 'approve' : 'reject';
  showSkeleton();
  fetchHistPage();
}

function fetchHistPage() {
  var range  = histDateRangeParams();
  var action = (histType==='approve') ? 'GET_HISTORY_REL' : 'GET_HISTORY_REJ';
  var limit  = histPageSize || 10;
  var offset = (histCurPage-1)*limit;

  apiPost(action, {
    werks:     curPlant,
    date_from: range.date_from,
    date_to:   range.date_to,
    search:    histSearchKw,
    offset:    offset,
    limit:     limit
  }).then(function(res){
    if (res.status!=='S'){
      showEmpty(res.message||'Gagal memuat history');
      return;
    }
    histTotal = parseInt(res.total,10)||0;
    histData  = res.data||[];
    renderHistTable();
    fetchHistCounts();
  }).catch(function(){
    showEmpty('Gagal memuat history');
  });
}

/* ================================================================
   BADGE SIDEBAR — GET_HISTORY_COUNT per plant (lihat catatan header
   file ttg bentuk data & alasan disimpan di satu kode potype).
   ================================================================ */
function setHistCountBadge(werks,group,total) {
  var codes=getPoTypeCodes(werks);
  var obj={};
  codes.forEach(function(c){ obj[c]=0; });
  if (codes.length) obj[codes[0]]=total;
  sbCounts[group][werks]=obj;
}

function fetchHistCounts() {
  var range=histDateRangeParams();
  ['1200','1300'].forEach(function(w){
    apiPost('GET_HISTORY_COUNT',{
      werks:w, date_from:range.date_from, date_to:range.date_to
    }).then(function(res){
      if (res.status!=='S') return;
      setHistCountBadge(w,'hist_app',parseInt(res.count_rel,10)||0);
      setHistCountBadge(w,'hist_rej',parseInt(res.count_rej,10)||0);
      renderSidebar();
    }).catch(function(){});
  });
}

/* ================================================================
   RENDER — membangun halaman dari histData/histTotal (hasil fetch
   terakhir), TANPA memfilter/mem-slice ulang di klien.
   ================================================================ */
function renderHistTable() {
  var isApp = (histType==='approve');

  var totalPages = histPageSize>0 ? (Math.ceil(histTotal/histPageSize)||1) : 1;
  if (histCurPage>totalPages) histCurPage=totalPages;
  var start = (histCurPage-1)*histPageSize;
  var end   = Math.min(start+histPageSize,histTotal);

  var html='';
  html+='<div class="page-sticky">';

  html+='<div class="pg-hdr">'+
        '<h1 class="pg-title '+(isApp?'pg-title--app':'pg-title--rej')+'">'+
        svgIcon(isApp?'i-check':'i-trash','ico-lg')+
        'History '+(isApp?'Release':'Reject')+' &mdash; '+
        escHtml(getPlantLabel(curPlant))+'</h1>'+
        '<div class="pg-sub">'+histTotal+' log '+
        (isApp?'release':'reject')+
        ' &mdash; <span class="pg-sub-em">'+
        escHtml(getHistPeriodLabel())+'</span></div></div>';

  html+='<div class="toolbar">';
  html+=buildSearchBox('histSearchInp','onHistSearchTrigger',histSearchKw,
        'Cari No PO, Vendor...');
  html+=buildPageSizeSelect([10,25,50],histPageSize,'histChangePageSize');

  var histFiltCnt=(histDateFilter!==currentMonthYM()?1:0);
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

  if (histFiltCnt>0)
    html+='<button type="button" class="filter-panel-reset"'+
          ' onclick="resetHistFilters()">Reset Filter</button>';
  html+='</div></div>';

  html+=buildExpandButton('histBtnToggleExpand',histAllExpanded,'toggleHistExpandAll');

  html+='<div class="pg-count">'+histTotal+' log</div>';
  html+='</div></div>'; /* toolbar + page-sticky */

  html+='<div id="histTableWrap">';
  html+=buildHistCards(histData,histType);
  html+='</div>';

  document.getElementById('mainContent').innerHTML=html;

  /* Paginasi server-side: total/totalPages berasal dari histTotal
     (row mentah, dikirim backend). Sekarang SATU kartu dirender per
     row histData (tidak ada dedup by ebeln lagi), jadi jumlah kartu
     di halaman ini = histData.length, dan totalnya menjumlah persis
     ke histTotal lintas halaman — pg-sub/pg-count (histTotal) sudah
     konsisten dgn jumlah kartu yang benar2 dirender. */
  var pager='';
  if (histTotal>0){
    pager=(totalPages>1)
      ?renderHistPagination(histTotal,totalPages,start,end,histCurPage)
      :'<div class="pagination-bar"><span class="pg-info">'+
       'Menampilkan semua '+histTotal+' log</span></div>';
  }
  setPager(pager);
  setActionBar(histTotal>0);

  /* History tidak punya aksi massal. */
  document.getElementById('fab').className='fab';

  /* Halaman baru (search/paginasi) tapi mode "Buka Semua" masih
     aktif dari sebelumnya -> muat ulang item kartu yg baru tampil. */
  if (histAllExpanded) histExpandAll();
}

/* buildPagination = forward-ref ke app-detail.js (Task 10), pola yg
   sama persis dipakai app-list.js (Task 7) utk renderPagination/
   goPage, dan sudah dipakai ZPR sendiri di app-history.js aslinya
   (buildPagination hidup di app-detail.js ZPR juga). Aman krn
   renderHistPagination hanya terpanggil dari renderHistTable(), yang
   hanya terpanggil lewat interaksi user setelah semua <script>
   (termasuk app-detail.js, dimuat setelah app-history.js) selesai load. */
function renderHistPagination(total,totalPages,start,end,curPg) {
  return buildPagination(total,totalPages,start,end,curPg,'histGoPage');
}

function histGoPage(pg) {
  var tp=histPageSize>0?(Math.ceil(histTotal/histPageSize)||1):1;
  if (pg<1) pg=1;
  if (pg>tp) pg=tp;
  histCurPage=pg;
  renderHistContent();
  window.scrollTo(0,0);
}

function histChangePageSize(val) {
  histPageSize=val||10; histCurPage=1;
  renderHistContent();
}

/* ================================================================
   HISTORY EXPAND / COLLAPSE — item dimuat lazy per KARTU (idx) via
   GET_HISTORY_ITEMS. Cache isi item tetap boleh per ebeln
   (histItemsCache) krn konten item PO sama utk ebeln yg sama
   terlepas dari event mana yg memicu expand — tapi target DOM yang
   di-update SELALU node per-idx (histItemsBody_<idx>), supaya >1
   kartu dgn ebeln sama (multi-level release, lihat catatan header
   file) tetap expand/collapse independen satu sama lain.
   ================================================================ */
function loadHistItems(idx,ebeln) {
  var body=document.getElementById('histItemsBody_'+idx);
  if (!body) return;
  if (histItemsCache[ebeln]){
    body.innerHTML=renderHistItemTable(histItemsCache[ebeln]);
    return;
  }
  body.innerHTML='<div class="card-detail-msg">'+
    '<div class="lo-spin lo-spin-sm"></div>Memuat item...</div>';
  apiPost('GET_HISTORY_ITEMS',{ebelns:ebeln})
    .then(function(res){
      var items=(res.status==='S')?(res.data||[]):[];
      histItemsCache[ebeln]=items;
      var b=document.getElementById('histItemsBody_'+idx);
      if (b) b.innerHTML=renderHistItemTable(items);
    })
    .catch(function(){
      var b=document.getElementById('histItemsBody_'+idx);
      if (b) b.innerHTML='<div class="card-detail-msg">Gagal memuat item.</div>';
    });
}

function toggleHistExpand(idx) {
  var card=document.getElementById('histCard_'+idx);
  if (!card) return;
  var wasExp=card.classList.contains('expanded');
  setCardExpanded(card,!wasExp);
  if (!wasExp) {
    var ebeln=card.getAttribute('data-ebeln');
    loadHistItems(idx,ebeln);
  }
}

/* Expand semua kartu halaman aktif — item yg belum ada di cache
   di-fetch SEKALI lewat GET_HISTORY_ITEMS dgn ebelns gabungan UNIK
   (comma-separated, sesuai kontrak endpoint), bukan satu request
   per kartu. Krn >1 kartu bisa berbagi ebeln yg sama (multi-level
   release), idxByEbeln mengumpulkan SEMUA idx kartu yg perlu
   di-update dari satu hasil fetch per ebeln. */
function histExpandAll() {
  histAllExpanded=true;
  var toFetch=[];
  var idxByEbeln={};
  document.querySelectorAll('#histTableWrap .po-card').forEach(function(c){
    setCardExpanded(c,true);
    var idx=c.getAttribute('data-idx');
    var ebeln=c.getAttribute('data-ebeln');
    if (idx===null || !ebeln) return;
    if (!idxByEbeln[ebeln]) idxByEbeln[ebeln]=[];
    idxByEbeln[ebeln].push(idx);
    if (histItemsCache[ebeln]){
      var b0=document.getElementById('histItemsBody_'+idx);
      if (b0) b0.innerHTML=renderHistItemTable(histItemsCache[ebeln]);
      return;
    }
    if (toFetch.indexOf(ebeln)===-1) toFetch.push(ebeln);
    var b1=document.getElementById('histItemsBody_'+idx);
    if (b1) b1.innerHTML='<div class="card-detail-msg">'+
      '<div class="lo-spin lo-spin-sm"></div>Memuat item...</div>';
  });
  if (!toFetch.length) return;

  apiPost('GET_HISTORY_ITEMS',{ebelns:toFetch.join(',')})
    .then(function(res){
      var items=(res.status==='S')?(res.data||[]):[];
      var byEbeln={};
      toFetch.forEach(function(e){ byEbeln[e]=[]; });
      items.forEach(function(it){
        if (!byEbeln[it.ebeln]) byEbeln[it.ebeln]=[];
        byEbeln[it.ebeln].push(it);
      });
      toFetch.forEach(function(e){
        histItemsCache[e]=byEbeln[e]||[];
        (idxByEbeln[e]||[]).forEach(function(idx){
          var b=document.getElementById('histItemsBody_'+idx);
          if (b) b.innerHTML=renderHistItemTable(histItemsCache[e]);
        });
      });
    })
    .catch(function(){
      toFetch.forEach(function(e){
        (idxByEbeln[e]||[]).forEach(function(idx){
          var b=document.getElementById('histItemsBody_'+idx);
          if (b) b.innerHTML='<div class="card-detail-msg">Gagal memuat item.</div>';
        });
      });
    });
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
