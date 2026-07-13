/* ================================================================
   DASHBOARD — halaman awal (monitoring).

   Halaman ini menjawab SATU pertanyaan: "apa yang menunggu keputusan
   saya hari ini?" Semua yang lain sekunder, dan tata letaknya disusun
   menurut SIAPA YANG HARUS BERTINDAK:

     1. Antrean   -> menunggu Anda (BOD)
     2. Belum PO  -> sudah Anda approve, kini menunggu Purchasing
     3. Riwayat   -> sudah selesai, tidak menuntut apa pun

   Versi lama menampilkan empat tile berwarna (Pending/Approved/
   Rejected/Belum PO) DI ATAS tabel rincian per kategori — padahal
   tile itu tak lain adalah JUMLAH KOLOM dari tabel di bawahnya.
   Data yang sama dirender dua kali, dua-duanya berwarna penuh: 26
   angka berwarna setara dalam satu layar. Sekarang tiap angka hanya
   hidup di satu tempat.

   Seluruhnya dibangun dari sbCounts yang sudah dimuat GET_SIDEBAR,
   jadi tidak ada permintaan backend tambahan. Satu-satunya data yang
   dimuat belakangan adalah status PO (lihat fillDashPo di bawah).
   ================================================================ */

var DASH_PLANTS = [
  { code:'1200', name:'Surabaya', img:'surabaya.png' },
  { code:'1300', name:'Semarang', img:'semarang.png' }
];

/* Agregasi per plant induk: jumlahkan tiap kategori (MTN/RND/SVC)
   lintas seluruh werks anggota grup. */
function dashPlantData(primary) {
  var cats      = CATEGORY_DEF[primary] || [];
  var werksList = getSidebarWerks(primary);
  var rows = cats.map(function(cat){
    var p=0, a=0, r=0;
    werksList.forEach(function(w){
      p += parseInt((sbCounts.pending[w] ||{})[cat.code]) || 0;
      a += parseInt((sbCounts.hist_app[w]||{})[cat.code]) || 0;
      r += parseInt((sbCounts.hist_rej[w]||{})[cat.code]) || 0;
    });
    return { code:cat.code, label:cat.label, icon:cat.icon,
             pending:p, app:a, rej:r };
  });
  var tot = { pending:0, app:0, rej:0 };
  rows.forEach(function(c){ tot.pending+=c.pending; tot.app+=c.app; tot.rej+=c.rej; });
  return { rows:rows, tot:tot, werks:werksList };
}

/* ================================================================
   1. HERO — tesis halaman. Satu angka besar, bukan empat tile setara.
   ================================================================ */
function dashHeroHtml(data) {
  var total = 0, parts = [];
  DASH_PLANTS.forEach(function(p){
    var d = data[p.code];
    total += d.tot.pending;
    parts.push(escHtml(p.name)+' <b>'+d.tot.pending+'</b>');
  });

  var lbl = total > 0
    ? 'PR menunggu keputusan Anda'
    : 'Tidak ada PR yang menunggu keputusan Anda';

  return '<section class="dash-hero">'+
    '<div class="dash-hero-num">'+total+'</div>'+
    '<div class="dash-hero-txt">'+
      '<div class="dash-hero-lbl">'+lbl+'</div>'+
      '<div class="dash-hero-split">'+parts.join(' &middot; ')+'</div>'+
    '</div>'+
  '</section>';
}

/* ================================================================
   2. ANTREAN — satu kartu per plant, satu baris per kategori.
   Inilah SATU-SATUNYA tempat angka pending hidup.
   ================================================================ */
function dashQueueHtml(p, d) {
  var eff = getEffectiveWerks(p.code);

  var html = '<section class="dash-card">';

  html += '<div class="dash-card-hdr">'+
    '<img class="dash-plant-img" src="'+p.img+'" alt="">'+
    '<div class="dash-plant-id">'+
      '<div class="dash-plant-name">'+escHtml(p.name)+'</div>'+
      '<div class="dash-plant-meta">'+d.werks.length+
        ' plant &middot; '+escHtml(d.werks.join(', '))+'</div>'+
    '</div>'+
    '<span class="dash-plant-tot">'+d.tot.pending+'</span>'+
  '</div>';

  html += '<div class="dash-cats">';
  d.rows.forEach(function(c){
    /* Kategori kosong TIDAK disembunyikan — ketiadaan antrean juga
       informasi, dan menyembunyikannya membuat kartu tiap plant
       berbeda-beda strukturnya tanpa alasan. */
    html += '<button type="button" class="dash-cat'+(c.pending?'':' is-empty')+'"'+
      ' onclick="switchView(\''+eff+'\',\''+c.code+'\',\'pending\')">'+
      '<span class="dash-cat-ico">'+svgIcon(c.icon)+'</span>'+
      '<span class="dash-cat-name">'+escHtml(c.label)+'</span>'+
      '<span class="dash-cat-val">'+c.pending+'</span>'+
      svgIcon('i-chevron-right','ico-sm dash-cat-go')+
      '</button>';
  });
  html += '</div>';

  html += '</section>';
  return html;
}

/* ================================================================
   3. BELUM PO — sudah di-approve, kini menunggu Purchasing.
   Bukan tugas BOD, tapi PR yang menganggur berminggu-minggu adalah
   kegagalan proses — jadi yang ditonjolkan UMURNYA, bukan sekadar
   jumlahnya. Angka umur ini sudah ada di data (field `age`) tapi
   dulu tidak pernah muncul di dashboard sama sekali.

   Diisi belakangan karena butuh query EKPO (action GET_APP_PO).
   ================================================================ */
function dashPoHtml(p) {
  return '<button type="button" class="dash-po" id="dashPo_'+p.code+'"'+
    ' onclick="openPoView(\''+p.code+'\')">'+
    '<span class="dash-po-ico">'+svgIcon('i-cart')+'</span>'+
    '<span class="dash-po-txt">'+
      '<span class="dash-po-main" id="dashPoMain_'+p.code+'">'+
        '<span class="dash-dot"></span></span>'+
      '<span class="dash-po-sub" id="dashPoSub_'+p.code+'">'+
        escHtml(p.name)+'</span>'+
    '</span>'+
    svgIcon('i-chevron-right','ico-sm dash-cat-go')+
    '</button>';
}

/* Memakai loadPoData() + poData dari app-po.js APA ADANYA, jadi file
   itu tidak perlu diubah sama sekali. (Akibatnya fillPoTiles() di
   sana kini tidak dipanggil lagi — lihat CATATAN_REINTEGRASI.md.) */
function fillDashPo() {
  if (typeof loadPoData !== 'function') return;

  loadPoData(function(){
    DASH_PLANTS.forEach(function(p){
      var werks = getSidebarWerks(p.code);
      var seen = {}, maxAge = 0;

      poData.forEach(function(h){
        if (werks.indexOf(h.werks) === -1) return;
        if (h.po_status !== 'OPEN') return;
        seen[h.banfn] = true;
        var age = parseInt(h.age) || 0;
        if (age > maxAge) maxAge = age;
      });

      var cnt = 0, k;
      for (k in seen) { if (seen.hasOwnProperty(k)) cnt++; }

      var main = document.getElementById('dashPoMain_'+p.code);
      if (main) main.innerHTML = '<b>'+cnt+'</b> PR belum jadi PO';

      var sub = document.getElementById('dashPoSub_'+p.code);
      if (sub) {
        if (cnt === 0) {
          sub.innerHTML = escHtml(p.name)+' &middot; semua sudah jadi PO';
        } else {
          sub.innerHTML = escHtml(p.name)+' &middot; '+
            '<span class="dash-age">tertua '+maxAge+' hari</span>';
        }
      }

      /* Kartu ditandai merah SERAGAM (lihat .dash-po di style.css).
         Satu-satunya keadaan yang melepas merahnya: tidak ada sisa
         sama sekali — tidak ada yang perlu ditandai. */
      var card = document.getElementById('dashPo_'+p.code);
      if (card) card.classList.toggle('is-clear', cnt === 0);
    });
  });
}

/* ================================================================
   4. RIWAYAT — arsip. Sudah selesai, jadi sengaja mundur ke belakang:
   angka abu, tanpa tile berwarna. Perlakuan yang sama dengan blok
   "Riwayat" di sidebar.
   ================================================================ */
function dashArchiveHtml(p, d) {
  var eff = getEffectiveWerks(p.code);
  return '<div class="dash-arc-row">'+
    '<span class="dash-arc-plant">'+escHtml(p.name)+'</span>'+
    '<button type="button" class="dash-arc-link"'+
      ' onclick="switchView(\''+eff+'\',\'ALL\',\'hist_app\')">'+
      '<b>'+d.tot.app+'</b> approve</button>'+
    '<button type="button" class="dash-arc-link"'+
      ' onclick="switchView(\''+eff+'\',\'ALL\',\'hist_rej\')">'+
      '<b>'+d.tot.rej+'</b> reject</button>'+
  '</div>';
}

/* ================================================================
   RENDER
   ================================================================ */
function renderDashboard() {
  var data = {};
  DASH_PLANTS.forEach(function(p){ data[p.code] = dashPlantData(p.code); });

  var html = '<div class="dash">';

  html += dashHeroHtml(data);

  /* Eyebrow tiap seksi menyatakan SIAPA yang harus bertindak — itu
     hal yang benar tentang isinya, bukan judul hiasan. */
  html += '<div class="dash-sec">'+
          '<div class="dash-sec-lbl">Antrean &mdash; menunggu keputusan Anda</div>'+
          '<div class="dash-grid">';
  DASH_PLANTS.forEach(function(p){ html += dashQueueHtml(p, data[p.code]); });
  html += '</div></div>';

  html += '<div class="dash-sec">'+
          '<div class="dash-sec-lbl">Sudah di-approve &mdash; menunggu Purchasing</div>'+
          '<div class="dash-grid">';
  DASH_PLANTS.forEach(function(p){ html += dashPoHtml(p); });
  html += '</div></div>';

  html += '<div class="dash-sec">'+
          '<div class="dash-sec-lbl">Riwayat &mdash; '+
          escHtml(getHistPeriodLabel())+'</div>'+
          '<div class="dash-arc">';
  DASH_PLANTS.forEach(function(p){ html += dashArchiveHtml(p, data[p.code]); });
  html += '</div></div>';

  html += '</div>';

  document.getElementById('mainContent').innerHTML = html;
  hideActionBar();

  fillDashPo();
}

/* Kembali ke dashboard dari header (logo/judul). State view direset
   agar sidebar tidak menyisakan menu aktif. */
function showDashboard() {
  curPlant       = '';
  curCategory    = '';
  curBsart       = '';
  curMode        = '';
  selBanfns      = {};
  filterPanelOpen= false;
  renderSidebar();
  closeSidebarMobile();
  renderDashboard();
}
