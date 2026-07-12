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

/* ================================================================
   ACTION BAR — bar tetap di bawah berisi pagination + aksi massal.
   Hanya ditampilkan bila view yang aktif memang punya baris data.
   ================================================================ */
function setActionBar(show) {
  var bar=document.getElementById('actionBar');
  if (bar) bar.classList.toggle('show',!!show);
}

function setPager(html) {
  var slot=document.getElementById('pagerSlot');
  if (slot) slot.innerHTML=html||'';
}

function hideActionBar() {
  setPager('');
  setActionBar(false);
  document.getElementById('fab').className='fab';
}

function showEmpty(msg) {
  document.getElementById('mainContent').innerHTML =
    '<div class="empty">' +
    '<div class="empty-ico">'+svgIcon('i-inbox','ico-xl')+'</div>' +
    '<div class="empty-txt">'+escHtml(msg)+'</div></div>';
  hideActionBar();
}

/* ================================================================
   SKELETON — placeholder saat fetch list/history. Geometrinya
   sengaja meniru kartu asli supaya tidak ada pergeseran layout
   ketika data tiba (menggantikan spinner "Loading..." lama).
   ================================================================ */
function skeletonCard() {
  var meta='';
  for (var i=0;i<4;i++){
    meta+='<div><div class="skel skel-lbl"></div>'+
          '<div class="skel skel-line"></div></div>';
  }
  return '<div class="po-card no-cb skel-card">'+
    '<div class="card-top card-top--nocb">'+
      '<div class="card-main">'+
        '<div class="card-head">'+
          '<div class="skel skel-num"></div>'+
          '<div class="skel skel-pill skel-pill-b"></div>'+
        '</div>'+
        '<div class="card-badges">'+
          '<div class="skel skel-pill skel-pill-a"></div>'+
          '<div class="skel skel-pill skel-pill-b"></div>'+
          '<div class="skel skel-pill skel-pill-c"></div>'+
        '</div>'+
      '</div>'+
      '<div class="card-amount">'+
        '<div class="skel skel-amt"></div>'+
        '<div class="skel skel-amt-sub"></div>'+
      '</div>'+
    '</div>'+
    '<div class="card-meta">'+meta+'</div>'+
  '</div>';
}

function showSkeleton(count) {
  var el=document.getElementById('mainContent');
  if (!el) return;
  hideActionBar();
  var n=count||5, cards='';
  for (var i=0;i<n;i++) cards+=skeletonCard();

  el.innerHTML =
    '<div class="page-sticky" aria-hidden="true">'+
      '<div class="pg-hdr">'+
        '<div class="skel skel-title"></div>'+
        '<div class="skel skel-sub"></div>'+
      '</div>'+
    '</div>'+
    '<div role="status" class="visually-hidden">Memuat data...</div>'+
    cards;
}

/* ================================================================
   HEADER / SIDEBAR TOGGLE
   ================================================================ */
function isMobileView() {
  return window.matchMedia('(max-width:1024px)').matches;
}

/* Di desktop sidebar di-collapse (konten melebar); di mobile ia
   menjadi drawer di atas konten dengan backdrop. Dulu kedua kelas
   di-toggle sekaligus sehingga perilakunya tumpang tindih. */
function toggleSidebar() {
  if (isMobileView())
    document.body.classList.toggle('sb-mobile-open');
  else
    document.body.classList.toggle('sb-collapsed');
  updateSidebarAria();
}

function closeSidebarMobile() {
  document.body.classList.remove('sb-mobile-open');
  updateSidebarAria();
}

function updateSidebarAria() {
  var btn=document.getElementById('btnToggleSb');
  if (!btn) return;
  var open = isMobileView()
    ? document.body.classList.contains('sb-mobile-open')
    : !document.body.classList.contains('sb-collapsed');
  btn.setAttribute('aria-expanded', open?'true':'false');
}

window.addEventListener('resize', updateSidebarAria);

function toggleUserMenu(e) {
  if (e) e.stopPropagation();
  var m=document.getElementById('userMenu');
  var b=document.getElementById('btnUserMenu');
  var open=m.classList.toggle('open');
  if (b) b.setAttribute('aria-expanded', open?'true':'false');
}

function closeUserMenu() {
  var m=document.getElementById('userMenu');
  var b=document.getElementById('btnUserMenu');
  if (m) m.classList.remove('open');
  if (b) b.setAttribute('aria-expanded','false');
}

document.addEventListener('click',function(e){
  var u=document.querySelector('.hdr-user');
  if (u && !u.contains(e.target)) closeUserMenu();
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
  var ok=(type==='S');
  var el=document.createElement('div');
  el.id='toastMsg';
  el.className='toast toast-'+(ok?'s':'e');
  /* status = diumumkan tanpa menyela; alert = menyela, untuk error. */
  el.setAttribute('role', ok?'status':'alert');
  el.innerHTML=svgIcon(ok?'i-check-circle':'i-alert-circle')+
    '<span>'+escHtml(msg)+'</span>';
  document.body.appendChild(el);
  setTimeout(function(){
    if (el.parentNode) el.remove();
  },4500);
}

/* ================================================================
   MODAL — dengan focus trap, Esc untuk menutup, dan fokus yang
   dikembalikan ke elemen pemicu setelah ditutup.
   ================================================================ */
var modalStack = [];

function focusableIn(root) {
  var sel='button,[href],input,select,textarea,'+
          '[tabindex]:not([tabindex="-1"])';
  return Array.prototype.slice.call(root.querySelectorAll(sel))
    .filter(function(el){
      return !el.disabled && el.offsetParent!==null;
    });
}

function openModal(id) {
  var m=document.getElementById(id);
  if (!m) return;
  modalStack.push({ id:id, opener:document.activeElement });
  m.classList.add('show');
  var f=focusableIn(m);
  if (f.length) f[0].focus();
}

function closeModal(id) {
  var m=document.getElementById(id);
  if (!m) return;
  m.classList.remove('show');
  for (var i=modalStack.length-1;i>=0;i--){
    if (modalStack[i].id===id){
      var opener=modalStack[i].opener;
      modalStack.splice(i,1);
      if (opener && opener.focus) opener.focus();
      break;
    }
  }
}

document.addEventListener('keydown',function(e){
  if (!modalStack.length) return;
  var top=modalStack[modalStack.length-1];
  var m=document.getElementById(top.id);
  if (!m) return;

  if (e.key==='Escape'){
    e.preventDefault();
    closeModal(top.id);
    return;
  }
  if (e.key!=='Tab') return;

  var f=focusableIn(m);
  if (!f.length) return;
  var first=f[0], last=f[f.length-1];
  if (e.shiftKey && document.activeElement===first){
    e.preventDefault(); last.focus();
  } else if (!e.shiftKey && document.activeElement===last){
    e.preventDefault(); first.focus();
  }
});

/* Modal Item Text — ambil long-text item pertama (BNFPO terkecil)
   dari PR &1 via action GET_ITEM_TEXT, lalu tampilkan di modal. */
function showItemTextModal(banfn) {
  var meta = document.getElementById('itemTextMeta');
  var body = document.getElementById('itemTextBody');

  meta.innerHTML = 'PR <b>'+escHtml(banfn)+'</b>';
  body.innerHTML = '<div class="lo-spin lo-spin-sm"></div>';
  openModal('modalItemText');

  fetch(API_URL+'?action=GET_ITEM_TEXT&banfn='+encodeURIComponent(banfn))
    .then(function(r){return r.json();})
    .then(function(res){
      if (res.status!=='S'){
        body.innerHTML='<div class="item-text-empty">'+
          escHtml(res.message||'Gagal memuat teks.')+'</div>';
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
          body.innerHTML = '<div class="item-text-empty">'+
            'Item ini tidak memiliki data Work Order.</div>';
        }
        return;
      }
      // Creator lain: perilaku long-text seperti biasa.
      if (!res.has_text){
        body.innerHTML = '<div class="item-text-empty">'+
          'Item ini tidak memiliki teks.</div>';
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
  updateSidebarAria();
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
      landing();
    })
    .catch(function(){
      renderSidebar();
      landing();
    });
}

/* Setelah sidebar siap: buka PR tujuan bila datang dari deep-link
   notifikasi; selain itu tampilkan dashboard sebagai halaman awal. */
function landing() {
  if (deepLink) openDeepLinkView();
  else renderDashboard();
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
   RENDER SIDEBAR — datar. Nama plant adalah label seksi (bukan
   tombol), dan seluruh menu selalu tampil tanpa accordion.
   ================================================================ */
function sumCounts(group,plantCode) {
  var codes=getSidebarWerks(plantCode);
  var total=0;
  codes.forEach(function(w){
    var cats=CATEGORY_DEF[w]||[];
    cats.forEach(function(c){
      total+=parseInt((sbCounts[group][w]||{})[c.code])||0;
    });
  });
  return total;
}

function sbBadge(cls,count) {
  if (!count) return '';
  return '<span class="sb-badge '+cls+'">'+count+'</span>';
}

function sbLink(opts) {
  return '<button type="button" class="sb-link"'+
    (opts.tone?' data-tone="'+opts.tone+'"':'')+
    (opts.active?' aria-current="page"':'')+
    ' onclick="switchView(\''+opts.werks+'\',\''+opts.category+'\',\''+opts.mode+'\')">'+
    '<span class="sb-link-label">'+svgIcon(opts.icon)+
    '<span>'+escHtml(opts.label)+'</span></span>'+
    sbBadge(opts.badgeCls,opts.count)+
    '</button>';
}

function renderSidebar() {
  var plants=[
    {code:'1200',name:'Surabaya',img:'surabaya.png'},
    {code:'1300',name:'Semarang',img:'semarang.png'}
  ];
  var primary=curPlant.split(',')[0];
  var html='';

  plants.forEach(function(p){
    var cats     =CATEGORY_DEF[p.code]||[];
    var effWerks =getEffectiveWerks(p.code);
    var pendTot  =getPlantTotalPending(p.code);
    var isPlant  =(primary===p.code);

    html+='<div class="sb-section">';

    html+='<div class="sb-plant-hdr">'+
          '<span class="sb-plant-left">'+
          '<img src="'+p.img+'" alt="">'+
          escHtml(p.name)+'</span>'+
          sbBadge('sb-badge-total',pendTot)+
          '</div>';

    /* A. PR pending per kategori */
    cats.forEach(function(cat){
      var pend=0;
      getSidebarWerks(p.code).forEach(function(w){
        pend+=parseInt((sbCounts.pending[w]||{})[cat.code])||0;
      });
      html+=sbLink({
        werks:effWerks, category:cat.code, mode:'pending',
        icon:cat.icon, label:cat.label,
        badgeCls:'sb-badge-pending', count:pend,
        active:(isPlant && curCategory===cat.code && curMode==='pending')
      });
    });

    html+='<div class="sb-hist-sep"></div>';

    /* B. History approve */
    html+=sbLink({
      werks:effWerks, category:'ALL', mode:'hist_app', tone:'app',
      icon:'i-check', label:'History Approve',
      badgeCls:'sb-badge-app', count:sumCounts('hist_app',p.code),
      active:(isPlant && curMode==='hist_app')
    });

    /* C. History reject */
    html+=sbLink({
      werks:effWerks, category:'ALL', mode:'hist_rej', tone:'rej',
      icon:'i-trash', label:'History Reject',
      badgeCls:'sb-badge-rej', count:sumCounts('hist_rej',p.code),
      active:(isPlant && curMode==='hist_rej')
    });

    html+='</div>';
  });

  document.getElementById('sidebar').innerHTML=html;
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
  curSort        = 'newest';

  renderSidebar();
  closeSidebarMobile();
  showSkeleton();

  if      (mode==='pending')  fetchList('');
  else if (mode==='hist_app') fetchHistApp();
  else if (mode==='hist_rej') fetchHistRej();
}
