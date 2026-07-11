/* ================================================================
   DASHBOARD — halaman awal (monitoring). Dua kolom: Surabaya kiri,
   Semarang kanan. Seluruhnya dibangun dari sbCounts yang sudah
   dimuat GET_SIDEBAR, jadi tidak ada permintaan backend tambahan.
   Angka = jumlah PR (pending, serta approve/reject bulan berjalan).
   ================================================================ */

/* Agregasi per plant induk: jumlahkan tiap kategori (MTN/RND/SVC)
   lintas seluruh werks anggota grup. */
function dashPlantData(primary) {
  var cats     = CATEGORY_DEF[primary] || [];
  var werksList= getSidebarWerks(primary);
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

function dashStat(cls, val, lbl, onclick) {
  return '<button type="button" class="dash-stat '+cls+'" onclick="'+onclick+'">'+
    '<span class="dash-stat-val">'+val+'</span>'+
    '<span class="dash-stat-lbl">'+lbl+'</span>'+
    '</button>';
}

function dashMetric(kind, val, lbl) {
  return '<span class="dash-metric dash-metric--'+kind+'">'+
    '<span class="dash-metric-val">'+val+'</span>'+
    '<span class="dash-metric-lbl">'+lbl+'</span>'+
    '</span>';
}

function dashPlantHtml(p) {
  var d   = dashPlantData(p.code);
  var eff = getEffectiveWerks(p.code);

  /* Klik tile Pending menuju kategori dengan pending terbanyak —
     ke tempat pekerjaan menumpuk. Fallback: kategori pertama. */
  var target=null;
  d.rows.forEach(function(c){ if (!target || c.pending>target.pending) target=c; });
  var pendCat = (target && target.pending>0) ? target.code
              : (d.rows[0] ? d.rows[0].code : 'MTN');

  var html='<section class="dash-plant">';

  html+='<div class="dash-plant-hdr">'+
        '<img class="dash-plant-img" src="'+p.img+'" alt="">'+
        '<div class="dash-plant-id">'+
        '<div class="dash-plant-name">'+escHtml(p.name)+'</div>'+
        '<div class="dash-plant-meta">'+d.werks.length+
        ' plant &middot; '+escHtml(d.werks.join(', '))+'</div>'+
        '</div></div>';

  html+='<div class="dash-stats">'+
        dashStat('dash-stat--pending', d.tot.pending, 'Pending',
                 "switchView('"+eff+"','"+pendCat+"','pending')")+
        dashStat('dash-stat--app', d.tot.app, 'Approved',
                 "switchView('"+eff+"','ALL','hist_app')")+
        dashStat('dash-stat--rej', d.tot.rej, 'Rejected',
                 "switchView('"+eff+"','ALL','hist_rej')")+
        '</div>';

  html+='<div class="dash-cats-wrap">'+
        '<div class="dash-cats-lbl">Rincian per Kategori</div>'+
        '<div class="dash-cats">';
  d.rows.forEach(function(c){
    html+='<button type="button" class="dash-cat" '+
          'onclick="switchView(\''+eff+'\',\''+c.code+'\',\'pending\')">'+
          '<span class="dash-cat-ico">'+svgIcon(c.icon)+'</span>'+
          '<span class="dash-cat-name">'+escHtml(c.label)+'</span>'+
          '<span class="dash-cat-metrics">'+
            dashMetric('pending', c.pending, 'Pending')+
            dashMetric('app', c.app, 'Approve')+
            dashMetric('rej', c.rej, 'Reject')+
          '</span></button>';
  });
  html+='</div></div>';

  html+='</section>';
  return html;
}

function renderDashboard() {
  var plants=[
    {code:'1200', name:'Surabaya', img:'surabaya.png'},
    {code:'1300', name:'Semarang', img:'semarang.png'}
  ];

  var html='<div class="dash">';
  html+='<div class="dash-head">'+
        '<h1 class="dash-title">'+svgIcon('i-inbox','ico-lg')+
        'Dashboard Monitoring PR</h1>'+
        '<div class="dash-sub">Pending saat ini, serta history approve &amp; reject '+
        'periode <span class="dash-sub-em">'+escHtml(getHistPeriodLabel())+
        '</span></div></div>';

  html+='<div class="dash-grid">';
  plants.forEach(function(p){ html+=dashPlantHtml(p); });
  html+='</div>';

  html+='</div>';

  document.getElementById('mainContent').innerHTML=html;
  hideActionBar();
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
