/* ================================================================
   app-ui.js — ZPO_REL_BSP
   Shell controller: sidebar, switchView, init, toast, modal,
   skeleton, user-menu, doLogout, label kategori/plant (POTYPE_MAP).

   PORT dari ZPR_REL_BSP/MIMEs/app-ui.js, diremap ke domain PO:
   - banfn -> ebeln, werks -> plant/werks (kode plant tunggal, ZPO
     tidak punya pengelompokan multi-plant seperti ZPR).
   - Kategori PR (CATEGORY_DEF) -> tipe PO (POTYPE_MAP/BSART_POTYPE_MAP).
   - Filter estkz/MRP (ZPR) DIBUANG — data PO ZPO tidak punya field
     estkz (lihat zpo-data-schema.md).
   - View "sudah jadi PO" (ZPR app-po) & dashboard (ZPR app-dashboard)
     DIBUANG — di luar scope redesign ZPO (lihat plan Global
     Constraints: "dashboard/OGR tetap feature-flag off").
   - Push notification / deep-link (ZPR app-push) DIBUANG — di luar
     scope (lihat plan Global Constraints).
   ================================================================ */
'use strict';

/* ================================================================
   PO CONFIG — dipindahkan VERBATIM dari
   ZPO_REL_BSP/Page with FLow Logic/main.htm:2076-2130. Config
   presentasi (bukan logic bisnis); TIDAK dihapus dari main.htm
   (app lama masih memakainya sampai Task 12).
   ================================================================ */
/* Feature flag: set true untuk mengaktifkan kembali menu Outstanding GR.
   Backend GET_OGR & fungsi render-nya sengaja dibiarkan utuh. */
var ENABLE_OGR = false;

var POTYPE_MAP = {
  '1200': {
    'JASA':      { label: 'PO Jasa',                          bsart: ['PSB7'] },
    'JASA_PROD': { label: 'PO Jasa Production',               bsart: ['POK1'] },
    'BAHAN':     { label: 'PO Bahan Baku',                    bsart: ['PSB1','PSB3','PSB4'] },
    'PENUNJANG': { label: 'PO Bahan Baku Penunjang',          bsart: ['PSB2'] },
    'SPAREPART': { label: 'PO Sparepart &amp; Tools',         bsart: ['PSB8','PSB9','PSBT'] },
    'UTILITY':   { label: 'PO Bahan Penunjang &amp; Utility', bsart: ['PSB5','PSB6'] },
    'EXIM':      { label: 'PO Exim',                          bsart: ['PSBI','POK9'] },
    'PKIT':        { label: 'PO KITE',                            bsart: ['PKIT'] }
  },
  '1300': {
    'JASA':      { label: 'PO Jasa',                          bsart: ['PSM7'] },
    'BAHAN':     { label: 'PO Bahan Baku',                    bsart: ['PSM1','PSM3','PSM4'] },
    'PENUNJANG': { label: 'PO Bahan Baku Penunjang',          bsart: ['PSM2'] },
    'SPAREPART': { label: 'PO Sparepart &amp; Tools',         bsart: ['PSM8','PSM9','PSMT'] },
    'UTILITY':   { label: 'PO Bahan Penunjang &amp; Utility', bsart: ['PSM5','PSM6'] },
    'EXIM':      { label: 'PO Exim',                          bsart: ['PSMI','POK9'] }
  }
};

var PLANT_LABELS = { '1200': 'Surabaya', '1300': 'Semarang' };
/* Reverse lookup bsart → potype label & color */
var BSART_POTYPE_MAP = {};
(function buildBsartMap() {
  var colorMap = {
    'JASA':      { label: 'PO Jasa',             color: '#7c3aed', bg: '#ede9fe' },
    'JASA_PROD': { label: 'PO Jasa Production',  color: '#7c3aed', bg: '#ede9fe' },
    'BAHAN':     { label: 'PO Bahan Baku',        color: '#057a55', bg: '#def7ec' },
    'PENUNJANG': { label: 'PO Bahan Penunjang',   color: '#0369a1', bg: '#e0f2fe' },
    'SPAREPART': { label: 'PO Sparepart & Tools', color: '#b45309', bg: '#fef3c7' },
    'UTILITY':   { label: 'PO Utility',           color: '#0891b2', bg: '#cffafe' },
    'EXIM':      { label: 'PO Exim',              color: '#c81e1e', bg: '#fde8e8' },
    'PKIT':        { label: 'PO KITE',                color: '#4f46e5', bg: '#e0e7ff' }
  };
  ['1200','1300'].forEach(function(plant) {
    var map = POTYPE_MAP[plant];
    for (var pt in map) {
      var info = colorMap[pt] || { label: pt, color: '#374151', bg: '#f3f4f6' };
      map[pt].bsart.forEach(function(bs) {
        if (!BSART_POTYPE_MAP[bs]) {
          BSART_POTYPE_MAP[bs] = {
            potype: pt,
            label:  info.label,
            color:  info.color,
            bg:     info.bg
          };
        }
      });
    }
  });
})();

/* ================================================================
   STATE VARIABLES — dipakai lintas modul app-*.js (switchView di
   file ini adalah satu-satunya tempat yang mereset semuanya).
   Catatan: `selEbelns` (seleksi kartu) SENGAJA TIDAK dideklarasikan
   di sini — pemiliknya app-detail.js (Task 10), lihat komentar di
   switchView() di bawah. `ALL_DATA1`/`ALL_DATA2` diisi app-list.js
   (Task 7) via GET_LIST; diinisialisasi array kosong di sini supaya
   fungsi yang membaca duluan (mis. showItemTextModal) tidak error.
   ================================================================ */
var curPlant        = '';
var curCategory     = '';
var curBsart        = '';
var curMode         = '';
var curPage         = 1;
var searchKw        = '';
var allExpanded     = false;
var curPlantSub     = '';
var filterPanelOpen = false;
var histCurPage     = 1;
var histSearchKw    = '';
var histAllExpanded = false;
var histPlantSub    = '';
var histDateFilter  = '';
var curSort         = 'newest';
var sbCounts        = { pending:{}, hist_app:{}, hist_rej:{} };
var ALL_DATA1       = window.ALL_DATA1 || [];
var ALL_DATA2       = window.ALL_DATA2 || [];

/* ================================================================
   KATEGORI / PLANT — sumber POTYPE_MAP/PLANT_LABELS/BSART_POTYPE_MAP
   di atas (bukan CATEGORY_DEF PR ZPR). POTYPE_MAP adalah object
   (potype->info), bukan array seperti CATEGORY_DEF ZPR, jadi
   getPoTypeCodes() dipakai untuk mengambil daftar kode potype per
   plant secara berurutan (urutan deklarasi di POTYPE_MAP).
   ================================================================ */
function getPoTypeCodes(werks) {
  var map = POTYPE_MAP[werks] || {};
  var out = [];
  for (var k in map) { if (map.hasOwnProperty(k)) out.push(k); }
  return out;
}

function getCategoryDef(werks,category) {
  var map  = POTYPE_MAP[werks] || {};
  var info = map[category];
  if (!info) return null;
  /* POTYPE_MAP tidak punya field icon per kategori (beda dgn
     CATEGORY_DEF ZPR) — pakai ikon keranjang generik untuk semua
     tipe PO di sidebar. */
  return { code: category, label: info.label, bsart: info.bsart.join(','), icon: 'i-cart' };
}

function getPlantLabel(werks) {
  return PLANT_LABELS[werks] || werks;
}

/* BSART_POTYPE_MAP sudah berupa reverse-lookup bsart->potype lintas
   kedua plant (dengan dedup "first wins" di buildBsartMap), jadi
   dipakai langsung tanpa perlu menyisir POTYPE_MAP[werks] satu per
   satu seperti CATEGORY_DEF ZPR. */
function getCategoryLabelByBsart(werks,bsart) {
  var info = BSART_POTYPE_MAP[bsart];
  if (info) return info.label;
  return bsart||'-';
}

/* ── History Date Filter helpers ──
   parseDateYM       : "DD.MM.YYYY" -> YYYYMM sebagai angka
   currentMonthYM    : YYYYMM bulan ini sebagai string (default filter)
   getHistMonthOptions : 3 opsi bulan terakhir (bulan ini s/d bulan ini-2)
   getHistPeriodLabel  : label teks bulan yg sedang dipilih
   Fungsi generik (tak menyentuh field PR/PO apa pun) — dipertahankan
   apa adanya dari ZPR untuk dipakai app-history.js (Task 8). */
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

/* Total PO pending satu plant, dijumlah lintas seluruh tipe PO
   (potype) plant tsb — dipakai badge total di header plant sidebar. */
function getPlantTotalPending(werks) {
  var codes = getPoTypeCodes(werks);
  var total=0;
  codes.forEach(function(c){
    total+=parseInt((sbCounts.pending[werks]||{})[c])||0;
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
        '/sap/bc/bsp/sap/zpo_rel_bsp/index.htm',
        true,'logout','logout');
      xhr.onreadystatechange=function(){
        if (xhr.readyState===4)
          window.location.replace(
            '/sap/bc/bsp/sap/zpo_rel_bsp/index.htm');
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

/* Modal Item Text — tampilkan long-text item pertama (EBELP terkecil)
   PO &1 di #modalItemText.
   Remap dari ZPR: ZPR mengambil teks via fetch async ke action
   GET_ITEM_TEXT dan punya cabang khusus PR SVC_MAINT (Work
   Order/IW33). Untuk ZPO, teks item (field `text`, hasil READ_TEXT)
   SUDAH IKUT di data2/ALL_DATA2 dari GET_LIST (lihat
   zpo-data-schema.md) — jadi di sini cukup baca dari state klien,
   TANPA request jaringan baru dan TANPA cabang Work Order (konsep
   itu tak berlaku untuk PO). ALL_DATA2 diisi app-list.js (Task 7)
   lewat GET_LIST; forward-ref yang aman karena fungsi ini hanya
   dipanggil lewat interaksi user setelah data termuat. */
/* Teks item di-lazy-load: svc.htm GET_LIST tidak lagi mengirim teks
   (menghindari READ_TEXT per baris). Teks diambil on-demand di sini
   lewat GET_ITEM_TEXT saat user membuka modal. */
function showItemTextModal(ebeln) {
  var meta = document.getElementById('itemTextMeta');
  var body = document.getElementById('itemTextBody');

  meta.innerHTML = 'PO <b>'+escHtml(ebeln)+'</b>';
  body.innerHTML = '<div class="item-text-empty">Memuat teks&hellip;</div>';
  openModal('modalItemText');

  apiPost('GET_ITEM_TEXT', { ebeln: ebeln }).then(function(res){
    if (res && res.status === 'S' && res.text){
      body.innerHTML = escHtml(res.text);
    } else {
      body.innerHTML = '<div class="item-text-empty">'+
        'Item ini tidak memiliki teks.</div>';
    }
  }).catch(function(){
    body.innerHTML = '<div class="item-text-empty">'+
      'Gagal memuat teks.</div>';
  });
}

/* ================================================================
   INIT
   ================================================================ */
/* Boot: fetchList() (app-list.js, Task 7) mengambil GET_LIST utk
   KEDUA plant sekaligus (server tidak memfilter plant/potype, lihat
   komentar header app-list.js), sehingga satu panggilan ini
   membangun ALL_DATA1/ALL_DATA2 -> buildSbCounts() -> renderSidebar()
   -> renderList() (badge pending + list awal langsung terisi,
   walau curPlant/curCategory masih '' saat boot; getFiltered()
   difilter user via klik sidebar seperti biasa). fetchHistCounts()
   (app-history.js, Task 8) dipanggil terpisah krn GET_HISTORY_COUNT
   endpoint sendiri (bukan bagian GET_LIST) — mengisi badge
   sbCounts.hist_app/hist_rej lalu renderSidebar() lagi. Kedua fungsi
   forward-ref aman: init() (lewat app-action.js) baru jalan setelah
   SEMUA <script> (termasuk app-list.js/app-history.js) selesai
   dimuat (lihat urutan <script> index.htm). */
function init() {
  updateSidebarAria();
  /* Boot: hanya tarik HITUNGAN badge (ringan) — bukan data list penuh.
     loadSidebarData() -> GET_SIDEBAR (pending), fetchHistCounts() ->
     GET_HISTORY_COUNT (history). Data list plant baru ditarik saat user
     klik (switchView->fetchList). Landing dipanggil di loadSidebarData. */
  loadSidebarData();
  fetchHistCounts();
}

/* ================================================================
   LOAD SIDEBAR
   ================================================================ */
/* ZPR memuat hitungan sidebar (pending/hist_app/hist_rej) lewat
   action GET_SIDEBAR. ZPO TIDAK punya endpoint itu (di luar scope
   plan redesign ZPO — lihat plans/2026-07-21-...md, tidak ada Task
   yang membuat GET_SIDEBAR). Jadi di sini sbCounts diinisialisasi
   nol untuk kedua plant (badge tidak tampil selama masih nol, lihat
   sbBadge()), sidebar tetap dirender agar navigasi berfungsi, dan
   landing() ditampilkan. Task 7 (pending, dari GET_LIST) dan Task 8
   (history, dari GET_HISTORY_COUNT) BOLEH mengisi ulang
   sbCounts.pending[werks]/hist_app[werks]/hist_rej[werks] lalu
   panggil renderSidebar() lagi begitu data asli tersedia, supaya
   badge angka akurat. */
function loadSidebarData() {
  ['1200','1300'].forEach(function(w){
    sbCounts.pending[w]  = normalizeCatCounts(null,w);
    sbCounts.hist_app[w] = normalizeCatCounts(null,w);
    sbCounts.hist_rej[w] = normalizeCatCounts(null,w);
  });
  renderSidebar();
  landing();
  /* Badge count PENDING selalu tampil sejak boot: svc.htm GET_SIDEBAR
     mengembalikan hitungan (per grup-plant + bsart) dgn kriteria sama
     seperti GET_LIST — ringan (hanya angka, tanpa data list penuh). */
  apiPost('GET_SIDEBAR', {}).then(function(res){
    if (!res || res.status !== 'S') { return; }
    var raw = {};
    (res.counts||[]).forEach(function(c){
      var info = BSART_POTYPE_MAP[c.bsart];
      if (!info) { return; }
      if (!raw[c.plant]) { raw[c.plant] = {}; }
      raw[c.plant][info.potype] =
        (raw[c.plant][info.potype] || 0) + (parseInt(c.cnt, 10) || 0);
    });
    ['1200','1300'].forEach(function(w){
      sbCounts.pending[w] = normalizeCatCounts(raw, w);
    });
    renderSidebar();
  });
}

/* Halaman awal. ZPR menampilkan dashboard agregat (app-dashboard.js)
   atau membuka PR dari deep-link notifikasi; keduanya di luar scope
   ZPO (lihat header file ini). Di sini landing cukup menampilkan
   pesan kosong yang mengarahkan user memilih menu sidebar — landing()
   sendiri tidak memanggil renderList()/renderHistContent() (tidak
   menebak plant/kategori default mana yang "benar", keputusan
   produk, bukan keputusan port UI). Sejak Task 12, init() memanggil
   fetchList() tepat setelah loadSidebarData(), jadi pesan placeholder
   ini langsung tertimpa showSkeleton()/renderList() pada boot —
   landing() efektif hanya terlihat lagi lewat showDashboard() (klik
   logo/judul, reset eksplisit ke keadaan awal). */
function landing() {
  showEmpty('Pilih plant dan kategori PO pada sidebar untuk memulai.');
}

/* Dipanggil dari header (logo/judul, onclick="showDashboard()" di
   index.htm — sudah ada sejak Task 2, di-port apa adanya dari ZPR).
   ZPO tidak punya halaman dashboard sungguhan, jadi di sini artinya
   "kembali ke keadaan awal": reset state view supaya sidebar tidak
   menyisakan menu aktif, lalu tampilkan landing(). Didefinisikan di
   sini (bukan dihapus) supaya onclick di index.htm tidak memanggil
   fungsi yang tidak ada. */
function showDashboard() {
  curPlant        = '';
  curCategory     = '';
  curBsart        = '';
  curMode         = '';
  selEbelns       = {};
  filterPanelOpen = false;
  renderSidebar();
  closeSidebarMobile();
  landing();
}

/* Ambil object {JASA:1,BAHAN:2,...} untuk satu plant, dengan
   fallback aman jika werks/kategori tidak ada. `group` boleh null —
   dipakai loadSidebarData() saat belum ada sumber data hitungan
   nyata (lihat catatan di atas); Task 7/8 boleh memanggil ulang
   dengan `group` nyata begitu tersedia. */
function normalizeCatCounts(group,werks) {
  var src=(group&&group[werks])||{};
  var out={};
  var codes=getPoTypeCodes(werks);
  codes.forEach(function(c){
    out[c]=parseInt(src[c])||0;
  });
  return out;
}

/* ================================================================
   RENDER SIDEBAR — datar. Nama plant adalah label seksi (bukan
   tombol), dan seluruh menu selalu tampil tanpa accordion.
   ================================================================ */
function sumCounts(group,plantCode) {
  var codes=getPoTypeCodes(plantCode);
  var total=0;
  codes.forEach(function(c){
    total+=parseInt((sbCounts[group][plantCode]||{})[c])||0;
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
  var html='';

  plants.forEach(function(p){
    var codes    =getPoTypeCodes(p.code);
    var pendTot  =getPlantTotalPending(p.code);
    var isPlant  =(curPlant===p.code);

    html+='<div class="sb-section">';

    html+='<div class="sb-plant-hdr">'+
          '<span class="sb-plant-left">'+
          '<img src="'+p.img+'" alt="">'+
          escHtml(p.name)+'</span>'+
          sbBadge('sb-badge-total',pendTot)+
          '</div>';

    /* A. PO pending per tipe (potype) */
    codes.forEach(function(code){
      var def  = getCategoryDef(p.code,code);
      var pend = parseInt((sbCounts.pending[p.code]||{})[code])||0;
      html+=sbLink({
        werks:p.code, category:code, mode:'pending',
        icon:def?def.icon:'i-cart', label:def?def.label:code,
        badgeCls:'sb-badge-pending', count:pend,
        active:(isPlant && curCategory===code && curMode==='pending')
      });
    });

    html+='<div class="sb-hist-sep"></div>';

    /* B. History release (mode internal tetap 'hist_app', label
       user-facing "Release" mengikuti aturan wording Approve->Release) */
    html+=sbLink({
      werks:p.code, category:'ALL', mode:'hist_app', tone:'app',
      icon:'i-check', label:'History Release',
      badgeCls:'sb-badge-app', count:sumCounts('hist_app',p.code),
      active:(isPlant && curMode==='hist_app')
    });

    /* C. History reject */
    html+=sbLink({
      werks:p.code, category:'ALL', mode:'hist_rej', tone:'rej',
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
  var catDef = getCategoryDef(plant,category);

  curPlant       = plant;
  curCategory    = category;
  curBsart       = (category==='ALL')?'':(catDef?catDef.bsart:'');
  curMode        = mode;
  curPage        = 1;
  /* selEbelns: variabel seleksi kartu dideklarasikan di app-detail.js
     (Task 10, lihat plan "state seleksi global (mis. selEbelns)").
     Aman direset tanpa `var` di sini — switchView() hanya pernah
     dipanggil lewat klik user setelah SEMUA <script> (termasuk
     app-detail.js) selesai dimuat, jadi `selEbelns` sudah ada di
     scope global saat baris ini jalan. */
  selEbelns      = {};
  searchKw       = '';
  allExpanded    = false;
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

  /* fetchList()/renderHistContent() = forward-ref ke Task 7/8. Aman
     karena init() (satu-satunya jalur switchView bisa terpanggil
     otomatis) baru jalan setelah semua <script> termuat; di luar itu
     switchView hanya dipicu klik user, jauh setelah boot selesai.
     Mode 'pending' HARUS memanggil fetchList() (bukan renderList()
     langsung) — renderList() hanya membaca window.ALL_DATA1 yang
     sudah ada di memori; ia tidak melakukan fetch sendiri, jadi
     dipanggil langsung di sini list akan selalu kosong sampai ada
     fetchList() lain (mis. dari init()) mengisi ALL_DATA1 lebih
     dulu. fetchList() sendiri yang memanggil renderList() setelah
     GET_LIST selesai (lihat app-list.js). */
  if      (mode==='pending')  fetchList();
  else if (mode==='hist_app') renderHistContent();
  else if (mode==='hist_rej') renderHistContent();
}
