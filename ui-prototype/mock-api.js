/* ================================================================
   MOCK API — PROTOTYPE ONLY. JANGAN di-copy ke SAP.

   Tujuan file ini: membuat kesembilan app-*.js bisa dipakai APA
   ADANYA (byte-per-byte sama dengan ZPR_REL_BSP/MIMEs/) tanpa satu
   baris pun diedit.

   Caranya: window.fetch DIGANTI di sini. Setiap panggilan ke
   'main.htm?action=...' dicegat dan dijawab dari dummy-data.js.
   Tidak ada request yang benar-benar keluar ke jaringan.

   File ini WAJIB dimuat SEBELUM app-action.js, karena app-action.js
   memanggil init() begitu ia selesai di-parse.

   Yang di-override:
     1. window.fetch  -> router aksi (lihat handleAction di bawah)
     2. doLogout()    -> aslinya redirect ke /sap/bc/bsp/... (app-ui.js)
     3. toggleNotif() -> aslinya butuh service worker + VAPID (app-push.js)
   Ketiganya di-redeclare SETELAH file aslinya dimuat, jadi versi di
   sini yang menang. Kode aslinya tidak disentuh sama sekali.
   ================================================================ */

/* Daftar nomor PR yang SENGAJA dibuat gagal saat di-approve/reject,
   untuk menguji toast error merah dan pesan "sebagian gagal".
   Kosongkan array ini kalau tidak perlu. */
var DUMMY_FAIL_BANFNS = ['0010000112'];

/* ── helper ──────────────────────────────────────────────────── */
function mockToday() {
  var t = new Date();
  return ('0' + t.getDate()).slice(-2) + '.' +
         ('0' + (t.getMonth() + 1)).slice(-2) + '.' + t.getFullYear();
}
function mockNow() {
  var t = new Date();
  return ('0' + t.getHours()).slice(-2) + ':' +
         ('0' + t.getMinutes()).slice(-2) + ':' +
         ('0' + t.getSeconds()).slice(-2);
}

/* 'a,b,c' -> ['a','b','c']; string kosong -> [] (artinya: tanpa filter) */
function mockSplit(s) {
  if (!s) return [];
  return s.split(',').map(function(x){ return x.trim(); })
          .filter(function(x){ return x !== ''; });
}

/* bsart -> kode kategori (MTN/RND/SVC) menurut CATEGORY_DEF di
   app-core.js. Ini cerminan lt_b2c / lt_cat_def di main.htm. */
function mockCategoryOf(werks, bsart) {
  var list = CATEGORY_DEF[werks] || [];
  for (var i = 0; i < list.length; i++) {
    if (list[i].bsart.split(',').indexOf(bsart) > -1) return list[i].code;
  }
  return null;
}

/* ================================================================
   GET_SIDEBAR
   Bentuk asli:
   {"status":"S","is_approver":true,
    "pending" :{"1200":{"MTN":6,"RND":2,"SVC":1}, ...},
    "hist_rej":{...},
    "hist_app":{...}}

   Angka = jumlah PR (banfn unik), bukan jumlah item. Dihitung ulang
   dari data dummy setiap kali dipanggil, supaya sidebar & dashboard
   langsung ikut berubah setelah approve/reject.
   ================================================================ */
function mockSidebar() {
  var out = { pending:{}, hist_app:{}, hist_rej:{} };

  Object.keys(CATEGORY_DEF).forEach(function(w){
    out.pending[w]  = {};
    out.hist_app[w] = {};
    out.hist_rej[w] = {};
    CATEGORY_DEF[w].forEach(function(c){
      out.pending[w][c.code]  = 0;
      out.hist_app[w][c.code] = 0;
      out.hist_rej[w][c.code] = 0;
    });
  });

  /* pending: satu baris = satu PR */
  DUMMY_PENDING.forEach(function(pr){
    var cat = mockCategoryOf(pr.werks, pr.bsart);
    if (cat && out.pending[pr.werks]) out.pending[pr.werks][cat]++;
  });

  /* history: satu baris = satu ITEM, jadi hitung banfn unik */
  function countHist(rows, target) {
    var seen = {};
    rows.forEach(function(h){
      var key = h.werks + '|' + h.banfn;
      if (seen[key]) return;
      seen[key] = true;
      var cat = mockCategoryOf(h.werks, h.bsart);
      if (cat && target[h.werks]) target[h.werks][cat]++;
    });
  }
  countHist(DUMMY_HIST_APP, out.hist_app);
  countHist(DUMMY_HIST_REJ, out.hist_rej);

  return {
    status:      'S',
    is_approver: DUMMY_IS_APPROVER,
    pending:     out.pending,
    hist_rej:    out.hist_rej,
    hist_app:    out.hist_app
  };
}

/* ================================================================
   GET_LIST — filter werks (daftar), bsart (daftar), estkz
   estkz: '' = semua | 'MRP' = hanya estkz 'B' | 'NONMRP' = selain 'B'
   ================================================================ */
function mockList(p) {
  var werks = mockSplit(p.werks);
  var bsart = mockSplit(p.bsart);
  var estkz = p.estkz || '';

  if (!werks.length)
    return { status:'E', message:'werks harus diisi', data:[] };
  if (!bsart.length)
    return { status:'E', message:'Kategori PR (bsart) belum dipilih', data:[] };

  var rows = DUMMY_PENDING.filter(function(pr){
    if (werks.indexOf(pr.werks) === -1) return false;
    if (bsart.indexOf(pr.bsart) === -1) return false;
    if (estkz === 'MRP'    && pr.estkz !== 'B') return false;
    if (estkz === 'NONMRP' && pr.estkz === 'B') return false;
    return true;
  });

  return { status:'S', message:'OK', data:rows };
}

/* GET_DETAIL — item satu PR */
function mockDetail(p) {
  if (!p.banfn) return { status:'E', message:'banfn kosong', data:[] };
  return { status:'S', message:'OK', data:(DUMMY_DETAIL[p.banfn] || []) };
}

/* GET_HIST_APP / GET_HIST_REJ.
   bsart kosong (kategori 'ALL' dari sidebar) = tanpa filter doc type. */
function mockHist(rows, p) {
  var werks = mockSplit(p.werks);
  var bsart = mockSplit(p.bsart);

  if (!werks.length)
    return { status:'E', message:'werks kosong', data:[] };

  var data = rows.filter(function(h){
    if (werks.indexOf(h.werks) === -1) return false;
    if (bsart.length && bsart.indexOf(h.bsart) === -1) return false;
    return true;
  });

  return { status:'S', message:'OK', data:data };
}

/* GET_APP_PO — dipanggil sekali untuk SEMUA plant (bsart=ALL). */
function mockAppPo(p) {
  var werks = mockSplit(p.werks);
  var data  = DUMMY_APP_PO.filter(function(h){
    return !werks.length || werks.indexOf(h.werks) > -1;
  });
  return { status:'S', message:'OK', data:data };
}

/* GET_ITEM_TEXT — PR yang tidak terdaftar di DUMMY_ITEM_TEXT
   dianggap "tidak punya teks" (has_text:false). */
function mockItemText(p) {
  var t = DUMMY_ITEM_TEXT[p.banfn];
  if (!t) {
    return { status:'S', message:'OK', banfn:p.banfn, item:'00010',
             text:'', has_text:false, is_svc:false, has_wo:false, wo_list:[] };
  }
  return {
    status:'S', message:'OK', banfn:p.banfn,
    item:     t.item,
    text:     t.text,
    has_text: t.has_text,
    is_svc:   t.is_svc,
    has_wo:   t.has_wo,
    wo_list:  t.wo_list || []
  };
}

/* ================================================================
   PROCESS — approve / delete.

   Ini BENAR-BENAR memutasi data dummy: PR hilang dari daftar pending
   dan muncul di History (serta di monitoring PO untuk approve), lalu
   badge sidebar & angka dashboard ikut berubah. Jadi alurnya bisa
   dites utuh, bukan cuma tampilan.

   Bentuk balasan asli main.htm:
     sukses : {"status":"S","message":"PR 0010000101 berhasil di-approve (3 item)"}
     gagal  : {"status":"E","message":"<pesan error BAPI>"}
   ================================================================ */
function mockProcess(p) {
  var banfn  = p.banfn || '';
  var action = p.pr_action || '';
  var notes  = p.notes || '';

  var idx = -1;
  for (var i = 0; i < DUMMY_PENDING.length; i++) {
    if (DUMMY_PENDING[i].banfn === banfn) { idx = i; break; }
  }
  if (idx === -1)
    return { status:'E', message:'PR tidak ditemukan / sudah diproses' };

  if (DUMMY_FAIL_BANFNS.indexOf(banfn) > -1) {
    return { status:'E',
             message:'PR ' + banfn + ' terkunci user lain (simulasi error)' };
  }

  var pr    = DUMMY_PENDING[idx];
  var items = DUMMY_DETAIL[banfn] || [];
  var today = mockToday();
  var now   = mockNow();

  if (action === 'approve') {
    items.forEach(function(it){
      var row = {
        banfn:pr.banfn, bnfpo:it.bnfpo, werks:pr.werks, bsart:pr.bsart,
        txz01:it.txz01, ernam:pr.ernam, ernam_full:pr.ernam_full,
        erdat:pr.badat, menge:it.menge, meins:it.meins,
        preis:it.preis, peinh:it.peinh, waers:it.waers, total:it.total,
        ekgrp:pr.ekgrp,
        app_by:'KMI-BOD', app_at:today, app_tm:now
      };
      DUMMY_HIST_APP.push(row);

      /* PR yang baru di-approve otomatis masuk monitoring PO
         sebagai OPEN (belum jadi PO), umur 0 hari. */
      var po = {};
      Object.keys(row).forEach(function(k){ po[k] = row[k]; });
      po.po_status = 'OPEN'; po.ebeln = ''; po.lifnr = '';
      po.vendor = ''; po.po_date = ''; po.ordqty = '0.000'; po.age = '0';
      DUMMY_APP_PO.push(po);
    });

    DUMMY_PENDING.splice(idx, 1);
    return { status:'S',
             message:'PR ' + banfn + ' berhasil di-approve (' +
                     items.length + ' item)' };
  }

  if (action === 'delete') {
    items.forEach(function(it){
      DUMMY_HIST_REJ.push({
        banfn:pr.banfn, bnfpo:it.bnfpo, werks:pr.werks, bsart:pr.bsart,
        txz01:it.txz01, ernam:pr.ernam, ernam_full:pr.ernam_full,
        erdat:pr.badat, menge:it.menge, meins:it.meins,
        preis:it.preis, peinh:it.peinh, waers:it.waers, total:it.total,
        ekgrp:pr.ekgrp,
        del_by:'KMI-BOD', del_at:today, del_tm:now, reason:notes
      });
    });

    DUMMY_PENDING.splice(idx, 1);
    return { status:'S',
             message:'PR ' + banfn + ' berhasil di-reject/delete' };
  }

  return { status:'E', message:'pr_action tidak valid' };
}

/* ================================================================
   ROUTER
   ================================================================ */
function mockHandleAction(p) {
  switch (p.action) {
    case 'GET_SIDEBAR':   return mockSidebar();
    case 'GET_LIST':      return mockList(p);
    case 'GET_DETAIL':    return mockDetail(p);
    case 'GET_HIST_APP':  return mockHist(DUMMY_HIST_APP, p);
    case 'GET_HIST_REJ':  return mockHist(DUMMY_HIST_REJ, p);
    case 'GET_APP_PO':    return mockAppPo(p);
    case 'GET_ITEM_TEXT': return mockItemText(p);
    case 'PROCESS':       return mockProcess(p);

    /* Web push: distub supaya tidak ada request keluar. */
    case 'GET_VAPID_KEY': return { status:'S', vapid_public:'' };
    case 'SAVE_SUB':      return { status:'S', message:'OK (dummy)' };
    case 'DELETE_SUB':    return { status:'S', message:'OK (dummy)' };

    default:
      return { status:'E', message:'action tidak dikenal: ' + p.action };
  }
}

/* Ambil parameter dari query string (GET) maupun body
   x-www-form-urlencoded (POST) — dua-duanya dipakai app-*.js. */
function mockParseParams(url, opts) {
  var p = {};

  var q = String(url).indexOf('?');
  if (q > -1) {
    String(url).slice(q + 1).split('&').forEach(function(kv){
      var i = kv.indexOf('=');
      if (i > 0) p[decodeURIComponent(kv.slice(0, i))] =
                   decodeURIComponent(kv.slice(i + 1).replace(/\+/g, ' '));
    });
  }

  if (opts && opts.body) {
    String(opts.body).split('&').forEach(function(kv){
      var i = kv.indexOf('=');
      if (i > 0) p[decodeURIComponent(kv.slice(0, i))] =
                   decodeURIComponent(kv.slice(i + 1).replace(/\+/g, ' '));
    });
  }

  return p;
}

/* ================================================================
   PENGGANTI window.fetch

   Hanya URL yang mengandung 'main.htm' yang dicegat — itu satu-satunya
   endpoint yang dipakai app-*.js (var API_URL di app-core.js).
   URL lain (kalau ada) ditolak dengan jelas, bukan diam-diam gagal.
   ================================================================ */
var mockRealFetch = window.fetch ? window.fetch.bind(window) : null;

window.fetch = function (url, opts) {
  var u = String(url);

  if (u.indexOf('main.htm') === -1) {
    console.warn('[mock-api] request non-main.htm diblokir:', u);
    return Promise.reject(new Error('Mock API: hanya main.htm yang dilayani'));
  }

  var params = mockParseParams(u, opts);
  var res;

  try {
    res = mockHandleAction(params);
  } catch (e) {
    console.error('[mock-api] error saat menangani', params.action, e);
    res = { status:'E', message:'Mock API error: ' + e.message };
  }

  console.log('[mock-api]', params.action || '(tanpa action)', params, '->', res);

  /* Objek Response tiruan: app-*.js hanya memakai .json() */
  var fake = {
    ok:     true,
    status: 200,
    json:   function () { return Promise.resolve(res); },
    text:   function () { return Promise.resolve(JSON.stringify(res)); }
  };

  return new Promise(function (resolve) {
    if (DUMMY_LATENCY_MS > 0) setTimeout(function(){ resolve(fake); }, DUMMY_LATENCY_MS);
    else resolve(fake);
  });
};

/* ================================================================
   OVERRIDE FUNGSI YANG MENYENTUH SAP LANGSUNG

   Keduanya dideklarasikan ulang di sini. Karena file ini dimuat
   SETELAH app-ui.js & app-push.js, deklarasi di bawah yang berlaku.
   Definisi aslinya di app-*.js TIDAK diubah — jadi saat reintegrasi
   cukup buang file ini, perilaku asli otomatis kembali.
   ================================================================ */

/* Asli (app-ui.js): logoff ICF + redirect ke /sap/bc/bsp/sap/zpr_rel_bsp/ */
function doLogout() {
  if (!confirm('Yakin ingin logout?')) return;
  showToast('S', 'Logout (dummy) — di SAP asli halaman akan di-redirect.');
  closeUserMenu();
}

/* Asli (app-push.js): service worker + VAPID + subscribe ke server push */
function toggleNotif() {
  showToast('S', 'Toggle notifikasi (dummy) — butuh service worker + HTTPS di SAP asli.');
  closeUserMenu();
}

console.log('[mock-api] aktif — semua fetch ke main.htm dilayani dummy-data.js. ' +
            'is_approver=' + DUMMY_IS_APPROVER);
