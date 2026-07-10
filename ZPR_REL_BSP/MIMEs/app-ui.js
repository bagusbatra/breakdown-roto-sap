function getEstkzLabel(e) {
  if (!e) return '-';
  return ESTKZ_MAP[e] || e;
}

function getCategoryDef(werks,category) {
  var list=CATEGORY_DEF[werks]||[];
  for (var i=0;i<list.length;i++){
    if (list[i].code===category) return list[i];
  }
  return null;
}

function getEffectiveWerks(werks) {
  if (werks === '1200') return '1200,2000,1000,1001,1100';
  if (werks === '1300') return '1300,3000';
  return werks;
}

function getSidebarWerks(werks) {
  if (werks === '1200') return ['1200','2000','1000','1001','1100'];
  if (werks === '1300') return ['1300','3000'];
  return [werks];
}

function getPlantLabel(werks) {
  var primary = (werks||'').split(',')[0];
  return PLANT_LABELS[primary]||primary;
}

function getCategoryLabelByBsart(werks,bsart) {
  var list=CATEGORY_DEF[werks]||[];
  for (var i=0;i<list.length;i++){
    if (list[i].bsart.split(',').indexOf(bsart)>-1)
      return list[i].label;
  }
  return bsart||'-';
}

/* ── History Date Filter helpers ──
   parseDateYM       : "DD.MM.YYYY" -> YYYYMM sebagai angka
   currentMonthYM    : YYYYMM bulan ini sebagai string (default filter)
   getHistMonthOptions : 3 opsi bulan terakhir (bulan ini s/d bulan ini-2)
   getHistPeriodLabel  : label teks bulan yg sedang dipilih            */
function parseDateYM(s) {
  if (!s || s==='-') return 0;
  var p=s.split('.');
  if (p.length!==3) return 0;
  return parseInt(p[2],10)*100+parseInt(p[1],10);
}

function currentMonthYM() {
  var d=new Date(), m=d.getMonth()+1;
  return ''+d.getFullYear()+(m<10?'0':'')+m;
}

function getHistMonthOptions() {
  var ML=['Jan','Feb','Mar','Apr','Mei','Jun',
          'Jul','Agt','Sep','Okt','Nov','Des'];
  var opts=[], now=new Date();
  for (var i=0;i<3;i++){
    var d=new Date(now.getFullYear(),now.getMonth()-i,1);
    var y=d.getFullYear(), m=d.getMonth()+1;
    opts.push({ value:''+y+(m<10?'0':'')+m, label:ML[d.getMonth()]+' '+y });
  }
  return opts;
}

function getHistPeriodLabel() {
  var ML=['Jan','Feb','Mar','Apr','Mei','Jun',
          'Jul','Agt','Sep','Okt','Nov','Des'];
  var ym=parseInt(histDateFilter,10);
  if (!ym) return '';
  return ML[(ym%100)-1]+' '+Math.floor(ym/100);
}

function getPlantTotalPending(werks) {
  var codes = getSidebarWerks(werks);
  var total=0;
  codes.forEach(function(w){
    var cats = CATEGORY_DEF[w]||[];
    cats.forEach(function(c){
      total+=parseInt(
        (sbCounts.pending[w]||{})[c.code])||0;
    });
  });
  return total;
}

function showEmpty(msg) {
  document.getElementById('mainContent').innerHTML =
    '<div class="empty">' +
    '<div class="empty-ico">&#128203;</div>' +
    '<div class="empty-txt">' +
    escHtml(msg)+'</div></div>';
  document.getElementById('fab').className='fab';
}

function showLoading() {
  var el=document.getElementById('mainContent');
  if (el) el.innerHTML =
    '<div style="text-align:center;padding:60px;' +
    'color:var(--muted);">' +
    '<div class="lo-spin"' +
    ' style="margin:0 auto 12px;"></div>' +
    'Loading...</div>';
}

/* ================================================================
   HEADER / SIDEBAR TOGGLE
   ================================================================ */
function toggleSidebar() {
  document.body.classList.toggle('sb-collapsed');
  document.getElementById('sidebar')
    .classList.toggle('open');
}

function toggleUserMenu() {
  var m=document.getElementById('userMenu');
  m.style.display=
    m.style.display==='none'?'block':'none';
}

document.addEventListener('click',function(e){
  var m=document.getElementById('userMenu');
  var u=document.querySelector('.hdr-user');
  if (m&&u&&!u.contains(e.target))
    m.style.display='none';
});

/* ================================================================
   LOGOUT
   ================================================================ */
function doLogout() {
  if (!confirm('Yakin ingin logout?')) return;
  sessionStorage.setItem('logged_out','1');
  fetch('/sap/public/bc/icf/logoff',
        {credentials:'include'})
    .finally(function(){
      var xhr=new XMLHttpRequest();
      xhr.open('GET',
        '/sap/bc/bsp/sap/zpr_rel_bsp/index.htm',
        true,'logout','logout');
      xhr.onreadystatechange=function(){
        if (xhr.readyState===4)
          window.location.replace(
            '/sap/bc/bsp/sap/zpr_rel_bsp/index.htm');
      };
      xhr.send();
    });
}

window.addEventListener('pageshow',function(e){
  if (e.persisted &&
      sessionStorage.getItem('logged_out')==='1'){
    sessionStorage.removeItem('logged_out');
    window.location.replace(
      '/sap/public/bc/icf/logoff');
  }
});

/* ================================================================
   TOAST
   ================================================================ */
function showToast(type,msg) {
  var old=document.getElementById('toastMsg');
  if (old) old.remove();
  var el=document.createElement('div');
  el.id='toastMsg';
  el.className='toast toast-'+
    (type==='S'?'s':'e');
  el.innerHTML=
    (type==='S'?'&#10003; ':'&#10007; ')+
    escHtml(msg);
  document.body.appendChild(el);
  setTimeout(function(){
    if (el.parentNode) el.remove();
  },4500);
}

/* ================================================================
   MODAL
   ================================================================ */
function closeModal(id) {
  document.getElementById(id)
    .classList.remove('show');
}

/* Modal Item Text — ambil long-text item pertama (BNFPO terkecil)
   dari PR &1 via action GET_ITEM_TEXT, lalu tampilkan di modal. */
function showItemTextModal(banfn) {
  var modal = document.getElementById('modalItemText');
  var meta  = document.getElementById('itemTextMeta');
  var body  = document.getElementById('itemTextBody');

  meta.innerHTML = 'PR <b>'+escHtml(banfn)+'</b>';
  body.innerHTML = '<div class="lo-spin" style="width:20px;height:20px;border-width:2.5px;margin:0 auto;"></div>';
  modal.classList.add('show');

  fetch(API_URL+'?action=GET_ITEM_TEXT&banfn='+encodeURIComponent(banfn))
    .then(function(r){return r.json();})
    .then(function(res){
      if (res.status!=='S'){
        body.innerHTML='<div class="item-text-empty">'+escHtml(res.message||'Gagal memuat teks.')+'</div>';
        return;
      }
      // PR SVC_MAINT: selalu tampilkan Work Order (abaikan long-text).
      if (res.is_svc){
        meta.innerHTML = 'PR <b>'+escHtml(banfn)+'</b>';
        if (res.has_wo && res.wo_list && res.wo_list.length){
          var h = '<div class="wo-note">Data Work Order terkait (IW33):</div>'+
            '<table class="wo-tbl"><thead><tr>'+
            '<th>No. Work Order</th><th>No. Equipment</th>'+
            '<th>Keterangan Equipment</th></tr></thead><tbody>';
          res.wo_list.forEach(function(w){
            h += '<tr><td>'+escHtml(w.aufnr||'-')+'</td>'+
              '<td>'+escHtml(w.equnr||'-')+'</td>'+
              '<td>'+escHtml(w.eqktx||'-')+'</td></tr>';
          });
          h += '</tbody></table>';
          body.innerHTML = h;
        } else {
          body.innerHTML = '<div class="item-text-empty">Item ini tidak memiliki data Work Order.</div>';
        }
        return;
      }
      // Creator lain: perilaku long-text seperti biasa.
      if (!res.has_text){
        body.innerHTML = '<div class="item-text-empty">Item ini tidak memiliki teks.</div>';
        return;
      }
      meta.innerHTML = 'PR <b>'+escHtml(banfn)+'</b> &middot; Item '+escHtml(res.item);
      body.innerHTML = escHtml(res.text);
    })
    .catch(function(){
      body.innerHTML='<div class="item-text-empty">Gagal memuat teks.</div>';
    });
}

/* ================================================================
   INIT
   ================================================================ */
function init() {
  readDeepLink();
  loadSidebarData();
  initPush();
}

/* ================================================================
   LOAD SIDEBAR
   ================================================================ */
function loadSidebarData() {
  fetch(API_URL+'?action=GET_SIDEBAR')
    .then(function(r){return r.json();})
    .then(function(res){
      if (res.status==='S'){
        isApprover=(res.is_approver===true);
        ['1200','1300','2000','1000','1001','1100','3000'].forEach(function(w){
          sbCounts.pending[w] =
            normalizeCatCounts(res.pending,w);
          sbCounts.hist_app[w] =
            normalizeCatCounts(res.hist_app,w);
          sbCounts.hist_rej[w] =
            normalizeCatCounts(res.hist_rej,w);
        });
      }
      renderSidebar();
      openDeepLinkView();
    })
    .catch(function(){
      renderSidebar();
      openDeepLinkView();
    });
}

/* Ambil object {MTN:1,RND:2,...} dari response GET_SIDEBAR untuk
   satu plant, dengan fallback aman jika werks/kategori tidak ada. */
function normalizeCatCounts(group,werks) {
  var src=(group&&group[werks])||{};
  var out={};
  var cats=CATEGORY_DEF[werks]||[];
  cats.forEach(function(c){
    out[c.code]=parseInt(src[c.code])||0;
  });
  return out;
}

/* ================================================================
   RENDER SIDEBAR (Flat Doc Types & Global History per Plant)
   ================================================================ */
function renderSidebar() {
  var plants=[
    {code:'1200',name:'Surabaya',
     img:'surabaya.png'},
    {code:'1300',name:'Semarang',
     img:'semarang.png'}
  ];
  var html='';

  plants.forEach(function(p,pi){
    if (pi>0)
      html+='<div class="sb-divider"></div>';

    var cats    =CATEGORY_DEF[p.code]||[];
    var primary = curPlant.split(',')[0];
    var isOpen  =(primary===p.code)||
                 (openSections[p.code]===true);
    var pendTot =getPlantTotalPending(p.code);
    var effWerks = getEffectiveWerks(p.code);

    html+='<div class="sb-section'+
          (isOpen?' open':'')+
          '" id="sbSec_'+p.code+'">';

    /* Plant header */
    html+='<div class="sb-plant"'+
          ' onclick="toggleSection(\''+
          p.code+'\')">';
    html+='<span class="sb-plant-left">';
    html+='<img src="'+p.img+'"'+
          ' alt="'+p.name+'"'+
          ' style="width:18px;height:18px;'+
          'object-fit:cover;border-radius:3px;">';
    html+=p.name+'</span>';
    html+='<span style="display:flex;'+
          'align-items:center;gap:6px;">';
    if (pendTot>0)
      html+='<span class="sb-badge sb-badge-total">'+
            pendTot+'</span>';
    html+='<span class="sb-plant-chevron">'+
          '&#9660;</span>';
    html+='</span></div>';

    /* Submenu internal Plant */
    html+='<div class="sb-submenu">';

    /* A. TOMBOL PENDING SESUAI DOC TYPE */
    cats.forEach(function(cat){
      var codes = getSidebarWerks(p.code);
      var pend = 0;
      codes.forEach(function(w){
        pend += parseInt((sbCounts.pending[w]||{})[cat.code])||0;
      });
      var isPendActive=(primary===p.code && curCategory===cat.code && curMode==='pending');

      html+='<a class="sb-link'+(isPendActive?' active':'')+'" style="padding-left:20px;" '+
            'onclick="switchView(\''+effWerks+'\',\''+cat.code+'\',\'pending\')">';
      html+='<span style="display:flex;align-items:center;gap:7px;">'+cat.icon+' '+cat.label+'</span>';
      if (pend>0) html+='<span class="sb-badge sb-badge-pending">'+pend+'</span>';
      html+='</a>';
    });

    /* B. TOMBOL HISTORY APPROVE */
    var codes = getSidebarWerks(p.code);
    var happTot=0;
    cats.forEach(function(c){
      codes.forEach(function(w){
        happTot+=parseInt((sbCounts.hist_app[w]||{})[c.code])||0;
      });
    });
    var isAppActive=(primary===p.code && curMode==='hist_app');

    html+='<a class="sb-link'+(isAppActive?' active-app':'')+'" style="padding-left:20px; border-top:1px dashed #e5e7eb;" '+
          'onclick="switchView(\''+effWerks+'\',\'ALL\',\'hist_app\')">';
    html+='<span style="display:flex;align-items:center;gap:7px;">&#10003; History Approve</span>';
    if (happTot>0) html+='<span class="sb-badge sb-badge-app">'+happTot+'</span>';
    html+='</a>';

    /* C. TOMBOL HISTORY REJECT */
    var hrejTot=0;
    cats.forEach(function(c){
      codes.forEach(function(w){
        hrejTot+=parseInt((sbCounts.hist_rej[w]||{})[c.code])||0;
      });
    });
    var isRejActive=(primary===p.code && curMode==='hist_rej');

    html+='<a class="sb-link'+(isRejActive?' active-rej':'')+'" style="padding-left:20px;" '+
          'onclick="switchView(\''+effWerks+'\',\'ALL\',\'hist_rej\')">';
    html+='<span style="display:flex;align-items:center;gap:7px;">&#128465; History Reject</span>';
    if (hrejTot>0) html+='<span class="sb-badge sb-badge-rej">'+hrejTot+'</span>';
    html+='</a>';

    html+='</div>'; /* sb-submenu */
    html+='</div>'; /* sb-section */
  });

  document.getElementById('sidebar').innerHTML=html;
}

function toggleSection(plantCode) {
  var sec=document.getElementById(
    'sbSec_'+plantCode);
  if (!sec) return;
  sec.classList.toggle('open');
  openSections[plantCode]=
    sec.classList.contains('open');
}

function toggleCategory(catKey) {
  var sec=document.getElementById(
    'sbCat_'+catKey);
  if (!sec) return;
  sec.classList.toggle('open');
  openCategories[catKey]=
    sec.classList.contains('open');
}

/* ================================================================
   SWITCH VIEW
   ================================================================ */
function switchView(plant,category,mode) {
  var primaryPlant = plant.split(',')[0];
  var catDef = getCategoryDef(primaryPlant,category);

  curPlant       = plant;
  curCategory    = category;
  curBsart       = (category==='ALL')?'':(catDef?catDef.bsart:'');
  curMode        = mode;
  curPage        = 1;
  selBanfns      = {};
  searchKw       = '';
  allExpanded    = false;
  curEstkzFilter = '';
  curPlantSub    = '';
  filterPanelOpen= false;
  histCurPage    = 1;
  histSearchKw   = '';
  histAllExpanded= false;
  histPlantSub   = '';
  histDateFilter = currentMonthYM();

  document.getElementById('fab').className='fab';
  renderSidebar();
  showLoading();

  if      (mode==='pending')  fetchList('');
  else if (mode==='hist_app') fetchHistApp();
  else if (mode==='hist_rej') fetchHistRej();
}

