/* ================================================================
   REVEAL — konten muncul bertahap, satu per satu.

   CARA KERJANYA
   Semua view di aplikasi ini dirender dengan cara yang sama:
   menimpa innerHTML dari #mainContent (renderDashboard, renderList,
   renderHistContent, renderPoContent). Jadi alih-alih menyisipkan
   panggilan animasi ke dalam KEEMPAT fungsi itu, file ini memasang
   SATU MutationObserver di #mainContent. Siapa pun yang merender,
   observer-nya menangkap — dan tidak ada satu baris pun di
   app-list.js / app-history.js / app-po.js / app-dashboard.js yang
   perlu diubah.

   Animasinya memakai Web Animations API (element.animate), BUKAN
   class CSS. Konsekuensinya: tidak ada class yang perlu dipasang lalu
   dilepas, tidak ada inline style yang tertinggal, dan tidak ada
   bentrok dengan `transition` yang sudah ada di .po-card.

   `fill:'backwards'` itu kuncinya: selama masa tunggu (delay), elemen
   MENAHAN keyframe pertama (opacity 0). Tanpa itu, semua kartu akan
   berkedip tampil dulu sebelum menghilang lagi untuk dianimasikan.

   Callback MutationObserver berjalan sebagai microtask — yakni SEBELUM
   browser sempat melukis. Jadi kartu tidak pernah sempat terlihat
   sebelum animasinya dimulai. Tidak ada kedipan.
   ================================================================ */
(function () {

  var STEP = 38;   /* jeda antar item (ms) */
  var DUR  = 280;  /* durasi tiap item (ms) */
  var CAP  = 12;   /* batas antrean: item ke-13 dst tidak menunggu lebih
                      lama lagi. Tanpa ini, daftar "Semua" berisi 50 PR
                      butuh 2 detik penuh sebelum kartu terakhir muncul. */

  /* Urutannya mengikuti urutan DOM, jadi cukup satu querySelectorAll.
     .page-sticky ikut dianimasikan supaya judul & toolbar tidak
     mendahului kartunya secara mendadak. */
  var SEL = '.dash-hero, .dash-sec, .page-sticky, .po-card, .empty';

  var EASE = 'cubic-bezier(.4,0,.2,1)';  /* sama dengan --ease di style.css */

  function reducedMotion() {
    return window.matchMedia &&
           window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function canAnimate(el) {
    return el && typeof el.animate === 'function';
  }

  function revealIn(root) {
    if (!root) return;

    /* Skeleton punya animasi shimmer-nya sendiri dan memang sedang
       menunggu data — jangan diganggu. Begitu data tiba, innerHTML
       ditimpa lagi dan barulah reveal yang asli jalan. */
    if (root.querySelector('.skel-card')) return;

    var items = root.querySelectorAll(SEL);
    if (!items.length) return;

    if (reducedMotion() || !canAnimate(items[0])) return;

    for (var i = 0; i < items.length; i++) {
      var el   = items[i];
      var wait = (i < CAP ? i : CAP) * STEP;

      /* .page-sticky sengaja TIDAK digeser, hanya dipudarkan.
         Menaruh transform pada elemen position:sticky membuatnya jadi
         containing block baru dan bisa mengacaukan perilaku lengketnya.
         Memudar saja sudah cukup untuk toolbar. */
      var slide = !el.classList.contains('page-sticky');

      var from = slide ? { opacity:0, transform:'translateY(8px)' }
                       : { opacity:0 };
      var to   = slide ? { opacity:1, transform:'none' }
                       : { opacity:1 };

      el.animate([from, to], {
        duration: DUR,
        delay:    wait,
        easing:   EASE,
        fill:     'backwards'
      });
    }
  }

  /* Sidebar hanya dianimasikan SEKALI, saat halaman pertama dimuat.
     renderSidebar() dipanggil ulang setiap kali berpindah view — kalau
     ikut dianimasikan terus, sidebar akan berkedip tiap kali user
     mengklik menu, dan itu melelahkan. */
  var sidebarDone = false;

  function revealSidebarOnce(sb) {
    if (sidebarDone || !sb) return;
    var secs = sb.querySelectorAll('.sb-section');
    if (!secs.length) return;
    sidebarDone = true;

    if (reducedMotion() || !canAnimate(secs[0])) return;

    for (var i = 0; i < secs.length; i++) {
      secs[i].animate(
        [ { opacity:0, transform:'translateX(-6px)' },
          { opacity:1, transform:'none' } ],
        { duration:DUR, delay:i * STEP, easing:EASE, fill:'backwards' }
      );
    }
  }

  function watch(el, fn) {
    if (!el || typeof MutationObserver !== 'function') return;
    /* childList tanpa subtree: hanya perubahan anak LANGSUNG yang
       dihitung. Jadi loadDetail() yang menulis ke dalam #detContent_x,
       dan fillDashPo() yang menulis ke dalam #dashPoMain_x, TIDAK ikut
       memicu reveal — keduanya menulis ke elemen yang bersarang. */
    new MutationObserver(function (muts) {
      for (var i = 0; i < muts.length; i++) {
        if (muts[i].addedNodes.length) { fn(el); return; }
      }
    }).observe(el, { childList: true });
  }

  function start() {
    var main = document.getElementById('mainContent');
    var sb   = document.getElementById('sidebar');

    watch(main, revealIn);
    watch(sb,   revealSidebarOnce);
  }

  /* Script ini dimuat sebelum app-action.js (yang memanggil init()),
     jadi observer-nya sudah terpasang sebelum render pertama terjadi.
     Pengecekan readyState hanya jaring pengaman bila urutan muat
     berubah di kemudian hari. */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }

}());
