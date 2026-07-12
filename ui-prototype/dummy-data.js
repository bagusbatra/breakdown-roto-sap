/* ================================================================
   DUMMY DATA — PROTOTYPE ONLY. JANGAN di-copy ke SAP.

   Isi file ini meniru PERSIS bentuk JSON yang dikirim main.htm.
   Aturan yang ditaati (sama seperti output ABAP):

   1. SEMUA nilai adalah STRING, termasuk angka.
      contoh: "total":"15000.00", "item_count":"3", "age":"12"
      Pengecualian: is_approver / has_text / is_svc / has_wo = boolean.
   2. Tanggal berformat "DD.MM.YYYY" (hasil makro fmt_date).
   3. Jam berformat "HH:MM:SS" (hasil CONCATENATE app_tm+0(2) ':' ...).
   4. Nilai uang IDR memakai skala INTERNAL SAP (TCURX): nilai rupiah
      sebenarnya dibagi 100. fmtAmt() di app-core.js yang mengalikan
      balik 100 untuk mata uang 0-desimal (IDR/JPY/KRW/VND).
      Jadi preis "1500.00" akan TAMPIL sebagai Rp 150.000.
      USD tidak diskalakan: preis "125.50" tampil 125,50.

   Tanggal dibuat RELATIF terhadap hari ini, bukan hardcode. Alasannya:
   filter periode di History default-nya bulan berjalan
   (currentMonthYM() di app-ui.js), jadi tanggal hardcode akan membuat
   History tampil KOSONG dan terlihat seperti bug.
   ================================================================ */

/* Ganti ke false untuk melihat tampilan non-approver:
   checkbox kartu, tombol "Pilih Semua", dan FAB Approve/Reject
   semuanya hilang. Refresh halaman setelah mengubah. */
var DUMMY_IS_APPROVER = true;

/* Jeda buatan (ms) sebelum mock API menjawab, supaya skeleton
   loading & spinner tetap kelihatan. 0 = instan. */
var DUMMY_LATENCY_MS = 260;

/* ── helper tanggal ──────────────────────────────────────────────
   dAgo(n)   : n hari lalu -> "DD.MM.YYYY"
   dAhead(n) : n hari depan -> "DD.MM.YYYY"
   dThisMon(day) : tanggal <day> pada bulan berjalan
   dPrevMon(day) : tanggal <day> pada bulan lalu (untuk tes filter periode) */
function _dd(dt) {
  var d = ('0' + dt.getDate()).slice(-2);
  var m = ('0' + (dt.getMonth() + 1)).slice(-2);
  return d + '.' + m + '.' + dt.getFullYear();
}
function dAgo(n)   { var t = new Date(); t.setDate(t.getDate() - n); return _dd(t); }
function dAhead(n) { var t = new Date(); t.setDate(t.getDate() + n); return _dd(t); }
function dThisMon(day) {
  var t = new Date();
  return _dd(new Date(t.getFullYear(), t.getMonth(), day));
}
function dPrevMon(day) {
  var t = new Date();
  return _dd(new Date(t.getFullYear(), t.getMonth() - 1, day));
}

/* ================================================================
   DETAIL ITEM PER PR  —  bentuk response GET_DETAIL:
   {"status":"S","message":"OK","data":[ ...baris di bawah... ]}
   ================================================================ */
var DUMMY_DETAIL = {

  /* ---------- SURABAYA · PR Maintenance (ROTO) ---------- */
  '0010000101': [
    { bnfpo:'00010', matnr:'000000000010004521', txz01:'BEARING SKF 6205 2RS',
      maktx:'BEARING SKF 6205 2RS', menge:'12.000', meins:'PC',
      preis:'1850.00', peinh:'1', waers:'IDR', total:'22200.00', lfdat:dAhead(14) },
    { bnfpo:'00020', matnr:'000000000010004522', txz01:'V-BELT B-52',
      maktx:'V-BELT TIPE B-52', menge:'6.000', meins:'PC',
      preis:'1250.00', peinh:'1', waers:'IDR', total:'7500.00', lfdat:dAhead(14) },
    { bnfpo:'00030', matnr:'', txz01:'JASA BUBUT POROS ROTARY',
      maktx:'JASA BUBUT POROS ROTARY', menge:'1.000', meins:'AU',
      preis:'35000.00', peinh:'1', waers:'IDR', total:'35000.00', lfdat:dAhead(21) }
  ],
  '0010000102': [
    { bnfpo:'00010', matnr:'000000000010007781', txz01:'OLI HIDROLIK SHELL TELLUS 46',
      maktx:'OLI HIDROLIK SHELL TELLUS S2 M46 209L', menge:'2.000', meins:'DR',
      preis:'48500.00', peinh:'1', waers:'IDR', total:'97000.00', lfdat:dAhead(10) }
  ],
  '0010000103': [
    { bnfpo:'00010', matnr:'000000000010003310', txz01:'MOTOR LISTRIK 5.5KW',
      maktx:'MOTOR LISTRIK 3 PHASE 5.5KW 1450RPM', menge:'1.000', meins:'PC',
      preis:'112500.00', peinh:'1', waers:'IDR', total:'112500.00', lfdat:dAhead(30) },
    { bnfpo:'00020', matnr:'000000000010003311', txz01:'KONTAKTOR LC1D18',
      maktx:'KONTAKTOR SCHNEIDER LC1D18 220V', menge:'4.000', meins:'PC',
      preis:'6250.00', peinh:'1', waers:'IDR', total:'25000.00', lfdat:dAhead(30) }
  ],
  /* PR MULTI-CURRENCY — menguji blok .card-amount-multi (renderCardAmount) */
  '0010000104': [
    { bnfpo:'00010', matnr:'000000000010009001', txz01:'SENSOR PROXIMITY OMRON',
      maktx:'SENSOR PROXIMITY OMRON E2E-X10ME1', menge:'8.000', meins:'PC',
      preis:'62.75', peinh:'1', waers:'USD', total:'502.00', lfdat:dAhead(45) },
    { bnfpo:'00020', matnr:'000000000010009002', txz01:'KABEL NYYHY 4x2.5',
      maktx:'KABEL NYYHY 4 X 2.5 MM', menge:'50.000', meins:'M',
      preis:'285.00', peinh:'1', waers:'IDR', total:'14250.00', lfdat:dAhead(20) }
  ],
  '0010000105': [
    { bnfpo:'00010', matnr:'000000000010005512', txz01:'GEARBOX SEW 1:30',
      maktx:'GEARBOX SEW EURODRIVE RATIO 1:30', menge:'1.000', meins:'PC',
      preis:'187500.00', peinh:'1', waers:'IDR', total:'187500.00', lfdat:dAhead(60) }
  ],
  '0010000106': [
    { bnfpo:'00010', matnr:'', txz01:'PERBAIKAN PANEL MCC LINE 3',
      maktx:'PERBAIKAN PANEL MCC LINE 3', menge:'1.000', meins:'AU',
      preis:'75000.00', peinh:'1', waers:'IDR', total:'75000.00', lfdat:dAhead(7) }
  ],
  '0010000107': [
    { bnfpo:'00010', matnr:'000000000010004530', txz01:'BEARING SKF 6308',
      maktx:'BEARING SKF 6308 2Z C3', menge:'20.000', meins:'PC',
      preis:'2450.00', peinh:'1', waers:'IDR', total:'49000.00', lfdat:dAhead(12) },
    { bnfpo:'00020', matnr:'000000000010004531', txz01:'SEAL OIL 45x62x8',
      maktx:'SEAL OIL TC 45 X 62 X 8', menge:'30.000', meins:'PC',
      preis:'450.00', peinh:'1', waers:'IDR', total:'13500.00', lfdat:dAhead(12) },
    { bnfpo:'00030', matnr:'000000000010004532', txz01:'GREASE SHELL GADUS 18KG',
      maktx:'GREASE SHELL GADUS S2 V220 2 18KG', menge:'2.000', meins:'PL',
      preis:'19500.00', peinh:'1', waers:'IDR', total:'39000.00', lfdat:dAhead(18) },
    { bnfpo:'00040', matnr:'000000000010004533', txz01:'BAUT HEX M12x60',
      maktx:'BAUT HEX M12 X 60 GALVANIS', menge:'100.000', meins:'PC',
      preis:'35.00', peinh:'1', waers:'IDR', total:'3500.00', lfdat:dAhead(18) }
  ],
  '0010000108': [
    { bnfpo:'00010', matnr:'000000000010006620', txz01:'INVERTER 7.5KW',
      maktx:'INVERTER MITSUBISHI FR-E740 7.5KW', menge:'2.000', meins:'PC',
      preis:'145000.00', peinh:'1', waers:'IDR', total:'290000.00', lfdat:dAhead(35) }
  ],
  '0010000109': [
    { bnfpo:'00010', matnr:'000000000010001120', txz01:'AMPLAS ROLL P120',
      maktx:'AMPLAS ROLL P120 LEBAR 100MM', menge:'15.000', meins:'ROL',
      preis:'3250.00', peinh:'1', waers:'IDR', total:'48750.00', lfdat:dAhead(9) }
  ],
  '0010000110': [
    { bnfpo:'00010', matnr:'000000000010008840', txz01:'POMPA AIR 3 INCH',
      maktx:'POMPA AIR SENTRIFUGAL 3 INCH 3HP', menge:'1.000', meins:'PC',
      preis:'92500.00', peinh:'1', waers:'IDR', total:'92500.00', lfdat:dAhead(25) },
    { bnfpo:'00020', matnr:'000000000010008841', txz01:'PIPA PVC 3 INCH',
      maktx:'PIPA PVC AW 3 INCH X 4M', menge:'12.000', meins:'BTG',
      preis:'1150.00', peinh:'1', waers:'IDR', total:'13800.00', lfdat:dAhead(25) }
  ],
  '0010000111': [
    { bnfpo:'00010', matnr:'000000000010002250', txz01:'LAMPU LED HIGHBAY 150W',
      maktx:'LAMPU LED HIGHBAY 150W IP65', menge:'24.000', meins:'PC',
      preis:'8750.00', peinh:'1', waers:'IDR', total:'210000.00', lfdat:dAhead(40) }
  ],
  '0010000112': [
    { bnfpo:'00010', matnr:'', txz01:'KALIBRASI TIMBANGAN GUDANG',
      maktx:'KALIBRASI TIMBANGAN GUDANG 2 UNIT', menge:'2.000', meins:'AU',
      preis:'22500.00', peinh:'1', waers:'IDR', total:'45000.00', lfdat:dAhead(15) }
  ],

  /* ---------- SURABAYA · PR RND (RSBR / PRK9) ---------- */
  '0010000201': [
    { bnfpo:'00010', matnr:'000000000020001100', txz01:'RESIN EPOXY SAMPEL',
      maktx:'RESIN EPOXY BENING UNTUK SAMPEL RND', menge:'5.000', meins:'KG',
      preis:'4850.00', peinh:'1', waers:'IDR', total:'24250.00', lfdat:dAhead(11) },
    { bnfpo:'00020', matnr:'000000000020001101', txz01:'HARDENER EPOXY',
      maktx:'HARDENER EPOXY TIPE H-200', menge:'2.500', meins:'KG',
      preis:'6200.00', peinh:'1', waers:'IDR', total:'15500.00', lfdat:dAhead(11) }
  ],
  '0010000202': [
    { bnfpo:'00010', matnr:'', txz01:'UJI LAB KEKUATAN TARIK',
      maktx:'UJI LAB KEKUATAN TARIK 10 SAMPEL', menge:'10.000', meins:'AU',
      preis:'8500.00', peinh:'1', waers:'IDR', total:'85000.00', lfdat:dAhead(28) }
  ],
  '0010000203': [
    { bnfpo:'00010', matnr:'000000000020003300', txz01:'PIGMENT WARNA WALNUT',
      maktx:'PIGMENT WARNA WALNUT PROTOTIPE', menge:'3.000', meins:'KG',
      preis:'95.40', peinh:'1', waers:'USD', total:'286.20', lfdat:dAhead(50) }
  ],

  /* ---------- SURABAYA · PR Service (PRKS) ---------- */
  '0010000301': [
    { bnfpo:'00010', matnr:'', txz01:'SERVICE AC KANTOR 12 UNIT',
      maktx:'SERVICE AC KANTOR 12 UNIT', menge:'12.000', meins:'AU',
      preis:'1750.00', peinh:'1', waers:'IDR', total:'21000.00', lfdat:dAhead(6) }
  ],
  '0010000302': [
    { bnfpo:'00010', matnr:'', txz01:'OVERHAUL COMPRESSOR SCREW',
      maktx:'OVERHAUL COMPRESSOR SCREW 75HP', menge:'1.000', meins:'AU',
      preis:'325000.00', peinh:'1', waers:'IDR', total:'325000.00', lfdat:dAhead(45) }
  ],

  /* ---------- SEMARANG · PR Maintenance (ROTO) ---------- */
  '0010000401': [
    { bnfpo:'00010', matnr:'000000000010004521', txz01:'BEARING SKF 6205 2RS',
      maktx:'BEARING SKF 6205 2RS', menge:'8.000', meins:'PC',
      preis:'1850.00', peinh:'1', waers:'IDR', total:'14800.00', lfdat:dAhead(13) }
  ],
  '0010000402': [
    { bnfpo:'00010', matnr:'000000000010007790', txz01:'OLI GEAR SAE 140',
      maktx:'OLI GEAR SAE 140 20L', menge:'4.000', meins:'PL',
      preis:'12500.00', peinh:'1', waers:'IDR', total:'50000.00', lfdat:dAhead(16) },
    { bnfpo:'00020', matnr:'000000000010007791', txz01:'FILTER OLI',
      maktx:'FILTER OLI HIDROLIK 10 MICRON', menge:'6.000', meins:'PC',
      preis:'2850.00', peinh:'1', waers:'IDR', total:'17100.00', lfdat:dAhead(16) }
  ],
  '0010000403': [
    { bnfpo:'00010', matnr:'000000000010005520', txz01:'RANTAI ROLLER RS80',
      maktx:'RANTAI ROLLER RS80 X 10FT', menge:'3.000', meins:'PC',
      preis:'27500.00', peinh:'1', waers:'IDR', total:'82500.00', lfdat:dAhead(22) }
  ],
  '0010000404': [
    { bnfpo:'00010', matnr:'', txz01:'PERBAIKAN ATAP GUDANG BOCOR',
      maktx:'PERBAIKAN ATAP GUDANG BOCOR AREA B', menge:'1.000', meins:'AU',
      preis:'56000.00', peinh:'1', waers:'IDR', total:'56000.00', lfdat:dAhead(8) }
  ]
};

/* ================================================================
   PR PENDING  —  bentuk response GET_LIST:
   {"status":"S","message":"OK","data":[ ...baris di bawah... ]}

   CATATAN: field "item_count" dan "totals" SENGAJA tidak ditulis
   manual — keduanya dihitung ulang dari DUMMY_DETAIL oleh
   recalcPending() di bawah, supaya tidak pernah meleset dari isi
   tabel detail. Bentuk & tipe datanya tetap identik dengan main.htm:
     "item_count":"3", "totals":[{"waers":"IDR","total":"64700.00"}]
   ================================================================ */
var DUMMY_PENDING = [
  /* SURABAYA — MTN / ROTO (12 PR, cukup untuk menguji pagination) */
  { banfn:'0010000101', badat:dAgo(3),  werks:'1200', bsart:'ROTO', txz01:'BEARING SKF 6205 2RS',
    ernam:'ANDIKA',  ernam_full:'Andika Pratama',    ekgrp:'M01', estkz:'R' },
  { banfn:'0010000102', badat:dAgo(5),  werks:'1200', bsart:'ROTO', txz01:'OLI HIDROLIK SHELL TELLUS 46',
    ernam:'SITIN',   ernam_full:'Siti Nurhaliza',    ekgrp:'M01', estkz:'B' },
  { banfn:'0010000103', badat:dAgo(6),  werks:'1200', bsart:'ROTO', txz01:'MOTOR LISTRIK 5.5KW',
    ernam:'BUDIS',   ernam_full:'Budi Setiawan',     ekgrp:'M02', estkz:'B' },
  { banfn:'0010000104', badat:dAgo(8),  werks:'1200', bsart:'ROTO', txz01:'SENSOR PROXIMITY OMRON',
    ernam:'ANDIKA',  ernam_full:'Andika Pratama',    ekgrp:'M02', estkz:'D' },
  { banfn:'0010000105', badat:dAgo(9),  werks:'1200', bsart:'ROTO', txz01:'GEARBOX SEW 1:30',
    ernam:'RIZKYH',  ernam_full:'Rizky Hidayat',     ekgrp:'M01', estkz:'F' },
  { banfn:'0010000106', badat:dAgo(11), werks:'1200', bsart:'ROTO', txz01:'PERBAIKAN PANEL MCC LINE 3',
    ernam:'BUDIS',   ernam_full:'Budi Setiawan',     ekgrp:'M03', estkz:'R' },
  { banfn:'0010000107', badat:dAgo(13), werks:'2000', bsart:'ROTO', txz01:'BEARING SKF 6308',
    ernam:'DEWIL',   ernam_full:'Dewi Lestari',      ekgrp:'M01', estkz:'B' },
  { banfn:'0010000108', badat:dAgo(15), werks:'2000', bsart:'ROTO', txz01:'INVERTER 7.5KW',
    ernam:'RIZKYH',  ernam_full:'Rizky Hidayat',     ekgrp:'M02', estkz:'U' },
  { banfn:'0010000109', badat:dAgo(17), werks:'2000', bsart:'ROTO', txz01:'AMPLAS ROLL P120',
    ernam:'DEWIL',   ernam_full:'Dewi Lestari',      ekgrp:'M01', estkz:'B' },
  { banfn:'0010000110', badat:dAgo(19), werks:'1000', bsart:'ROTO', txz01:'POMPA AIR 3 INCH',
    ernam:'AGUSW',   ernam_full:'Agus Wijaya',       ekgrp:'M03', estkz:'R' },
  { banfn:'0010000111', badat:dAgo(22), werks:'1000', bsart:'ROTO', txz01:'LAMPU LED HIGHBAY 150W',
    ernam:'AGUSW',   ernam_full:'Agus Wijaya',       ekgrp:'M03', estkz:'D' },
  { banfn:'0010000112', badat:dAgo(26), werks:'1100', bsart:'ROTO', txz01:'KALIBRASI TIMBANGAN GUDANG',
    ernam:'SITIN',   ernam_full:'Siti Nurhaliza',    ekgrp:'M01', estkz:'R' },

  /* SURABAYA — RND / RSBR + PRK9 (dua doc type dalam satu kategori) */
  { banfn:'0010000201', badat:dAgo(4),  werks:'1200', bsart:'RSBR', txz01:'RESIN EPOXY SAMPEL',
    ernam:'LINDAK',  ernam_full:'Linda Kusuma',      ekgrp:'R01', estkz:'R' },
  { banfn:'0010000202', badat:dAgo(10), werks:'1200', bsart:'PRK9', txz01:'UJI LAB KEKUATAN TARIK',
    ernam:'LINDAK',  ernam_full:'Linda Kusuma',      ekgrp:'R01', estkz:'R' },
  { banfn:'0010000203', badat:dAgo(20), werks:'1001', bsart:'RSBR', txz01:'PIGMENT WARNA WALNUT',
    ernam:'FAJARN',  ernam_full:'Fajar Nugroho',     ekgrp:'R02', estkz:'D' },

  /* SURABAYA — SVC / PRKS */
  { banfn:'0010000301', badat:dAgo(2),  werks:'1200', bsart:'PRKS', txz01:'SERVICE AC KANTOR 12 UNIT',
    ernam:'HENDRAP', ernam_full:'Hendra Permana',    ekgrp:'S01', estkz:'R' },
  { banfn:'0010000302', badat:dAgo(12), werks:'2000', bsart:'PRKS', txz01:'OVERHAUL COMPRESSOR SCREW',
    ernam:'SVC_MAINT', ernam_full:'Service Maintenance', ekgrp:'S01', estkz:'F' },

  /* SEMARANG — MTN / ROTO */
  { banfn:'0010000401', badat:dAgo(1),  werks:'1300', bsart:'ROTO', txz01:'BEARING SKF 6205 2RS',
    ernam:'JOKOP',   ernam_full:'Joko Purnomo',      ekgrp:'M01', estkz:'B' },
  { banfn:'0010000402', badat:dAgo(7),  werks:'1300', bsart:'ROTO', txz01:'OLI GEAR SAE 140',
    ernam:'JOKOP',   ernam_full:'Joko Purnomo',      ekgrp:'M01', estkz:'B' },
  { banfn:'0010000403', badat:dAgo(14), werks:'3000', bsart:'ROTO', txz01:'RANTAI ROLLER RS80',
    ernam:'MAYAS',   ernam_full:'Maya Sari',         ekgrp:'M02', estkz:'R' },
  { banfn:'0010000404', badat:dAgo(24), werks:'3000', bsart:'ROTO', txz01:'PERBAIKAN ATAP GUDANG BOCOR',
    ernam:'MAYAS',   ernam_full:'Maya Sari',         ekgrp:'M03', estkz:'R' }

  /* SEMARANG — SVC / PRKS : SENGAJA KOSONG.
     Ini skenario EMPTY STATE. Klik "PR Service" di bawah Semarang
     untuk melihat tampilan "Tidak ada PR Service pending". */
];

/* ================================================================
   HISTORY APPROVE  —  bentuk response GET_HIST_APP:
   {"status":"S","message":"OK","data":[ ...baris di bawah... ]}
   Satu BARIS = satu ITEM PR (bukan satu PR). app-history.js yang
   mengelompokkannya per banfn lewat groupHistByBanfn().
   ================================================================ */
var DUMMY_HIST_APP = [
  /* PR 0010000151 — 2 item, SURABAYA 1200 ROTO, bulan berjalan */
  { banfn:'0010000151', bnfpo:'00010', werks:'1200', bsart:'ROTO',
    txz01:'FILTER UDARA COMPRESSOR', ernam:'ANDIKA', ernam_full:'Andika Pratama',
    erdat:dAgo(40), menge:'10.000', meins:'PC', preis:'3250.00', peinh:'1',
    waers:'IDR', total:'32500.00', ekgrp:'M01',
    app_by:'KMI-BOD', app_at:dThisMon(3), app_tm:'09:14:22' },
  { banfn:'0010000151', bnfpo:'00020', werks:'1200', bsart:'ROTO',
    txz01:'FILTER OLI COMPRESSOR', ernam:'ANDIKA', ernam_full:'Andika Pratama',
    erdat:dAgo(40), menge:'10.000', meins:'PC', preis:'2100.00', peinh:'1',
    waers:'IDR', total:'21000.00', ekgrp:'M01',
    app_by:'KMI-BOD', app_at:dThisMon(3), app_tm:'09:14:22' },

  /* PR 0010000152 — 1 item, SURABAYA 2000 ROTO */
  { banfn:'0010000152', bnfpo:'00010', werks:'2000', bsart:'ROTO',
    txz01:'BELT CONVEYOR 600MM', ernam:'DEWIL', ernam_full:'Dewi Lestari',
    erdat:dAgo(38), menge:'25.000', meins:'M', preis:'4750.00', peinh:'1',
    waers:'IDR', total:'118750.00', ekgrp:'M02',
    app_by:'KMI-BOD', app_at:dThisMon(5), app_tm:'14:02:51' },

  /* PR 0010000153 — 3 item, SURABAYA 1200 RSBR (RND) */
  { banfn:'0010000153', bnfpo:'00010', werks:'1200', bsart:'RSBR',
    txz01:'CAT PRIMER SAMPEL', ernam:'LINDAK', ernam_full:'Linda Kusuma',
    erdat:dAgo(35), menge:'4.000', meins:'KG', preis:'5500.00', peinh:'1',
    waers:'IDR', total:'22000.00', ekgrp:'R01',
    app_by:'KMI-BOD', app_at:dThisMon(8), app_tm:'10:31:07' },
  { banfn:'0010000153', bnfpo:'00020', werks:'1200', bsart:'RSBR',
    txz01:'THINNER SPESIAL', ernam:'LINDAK', ernam_full:'Linda Kusuma',
    erdat:dAgo(35), menge:'8.000', meins:'L', preis:'1850.00', peinh:'1',
    waers:'IDR', total:'14800.00', ekgrp:'R01',
    app_by:'KMI-BOD', app_at:dThisMon(8), app_tm:'10:31:07' },
  { banfn:'0010000153', bnfpo:'00030', werks:'1200', bsart:'RSBR',
    txz01:'KUAS SET SAMPEL', ernam:'LINDAK', ernam_full:'Linda Kusuma',
    erdat:dAgo(35), menge:'3.000', meins:'SET', preis:'950.00', peinh:'1',
    waers:'IDR', total:'2850.00', ekgrp:'R01',
    app_by:'KMI-BOD', app_at:dThisMon(8), app_tm:'10:31:07' },

  /* PR 0010000154 — 1 item USD, SURABAYA 1001 PRKS (SVC) */
  { banfn:'0010000154', bnfpo:'00010', werks:'1001', bsart:'PRKS',
    txz01:'LISENSI SOFTWARE CAD 1 TAHUN', ernam:'FAJARN', ernam_full:'Fajar Nugroho',
    erdat:dAgo(33), menge:'2.000', meins:'AU', preis:'1450.00', peinh:'1',
    waers:'USD', total:'2900.00', ekgrp:'S02',
    app_by:'KMI-BOD', app_at:dThisMon(11), app_tm:'16:45:19' },

  /* PR 0010000155 — 2 item, SEMARANG 1300 ROTO */
  { banfn:'0010000155', bnfpo:'00010', werks:'1300', bsart:'ROTO',
    txz01:'KOMPRESOR ANGIN 10 BAR', ernam:'JOKOP', ernam_full:'Joko Purnomo',
    erdat:dAgo(30), menge:'1.000', meins:'PC', preis:'215000.00', peinh:'1',
    waers:'IDR', total:'215000.00', ekgrp:'M01',
    app_by:'KMI-BOD', app_at:dThisMon(6), app_tm:'08:22:40' },
  { banfn:'0010000155', bnfpo:'00020', werks:'1300', bsart:'ROTO',
    txz01:'SELANG ANGIN 1/2 INCH', ernam:'JOKOP', ernam_full:'Joko Purnomo',
    erdat:dAgo(30), menge:'30.000', meins:'M', preis:'420.00', peinh:'1',
    waers:'IDR', total:'12600.00', ekgrp:'M01',
    app_by:'KMI-BOD', app_at:dThisMon(6), app_tm:'08:22:40' },

  /* PR 0010000156 — 1 item, SEMARANG 3000 PRKS (SVC) */
  { banfn:'0010000156', bnfpo:'00010', werks:'3000', bsart:'PRKS',
    txz01:'SERVICE FORKLIFT 3 TON', ernam:'MAYAS', ernam_full:'Maya Sari',
    erdat:dAgo(28), menge:'1.000', meins:'AU', preis:'88000.00', peinh:'1',
    waers:'IDR', total:'88000.00', ekgrp:'S01',
    app_by:'KMI-BOD', app_at:dThisMon(12), app_tm:'11:05:33' },

  /* ── BULAN LALU — untuk menguji filter Periode di panel Filter.
     Baris ini TIDAK muncul di tampilan default (default = bulan ini). ── */
  { banfn:'0010000157', bnfpo:'00010', werks:'1200', bsart:'ROTO',
    txz01:'HOIST ELEKTRIK 2 TON', ernam:'BUDIS', ernam_full:'Budi Setiawan',
    erdat:dAgo(60), menge:'1.000', meins:'PC', preis:'320000.00', peinh:'1',
    waers:'IDR', total:'320000.00', ekgrp:'M02',
    app_by:'KMI-BOD', app_at:dPrevMon(18), app_tm:'13:40:11' },
  { banfn:'0010000158', bnfpo:'00010', werks:'1300', bsart:'ROTO',
    txz01:'TROLLEY BARANG 500KG', ernam:'MAYAS', ernam_full:'Maya Sari',
    erdat:dAgo(58), menge:'4.000', meins:'PC', preis:'18500.00', peinh:'1',
    waers:'IDR', total:'74000.00', ekgrp:'M01',
    app_by:'KMI-BOD', app_at:dPrevMon(22), app_tm:'15:12:08' }
];

/* ================================================================
   HISTORY REJECT  —  bentuk response GET_HIST_REJ.
   Sama seperti HIST_APP, tapi app_by/app_at/app_tm diganti
   del_by/del_at/del_tm, DITAMBAH field "reason".

   CATATAN: hanya berisi PR SURABAYA. History reject SEMARANG
   SENGAJA KOSONG (skenario EMPTY STATE).
   ================================================================ */
var DUMMY_HIST_REJ = [
  /* PR 0010000171 — 2 item, SURABAYA 1200 ROTO */
  { banfn:'0010000171', bnfpo:'00010', werks:'1200', bsart:'ROTO',
    txz01:'AC SPLIT 2PK RUANG SERVER', ernam:'HENDRAP', ernam_full:'Hendra Permana',
    erdat:dAgo(36), menge:'2.000', meins:'PC', preis:'62500.00', peinh:'1',
    waers:'IDR', total:'125000.00', ekgrp:'M03',
    del_by:'KMI-BOD', del_at:dThisMon(4), del_tm:'10:18:05',
    reason:'Budget maintenance kuartal ini sudah habis. Ajukan ulang di kuartal berikutnya.' },
  { banfn:'0010000171', bnfpo:'00020', werks:'1200', bsart:'ROTO',
    txz01:'BRACKET AC OUTDOOR', ernam:'HENDRAP', ernam_full:'Hendra Permana',
    erdat:dAgo(36), menge:'2.000', meins:'PC', preis:'2250.00', peinh:'1',
    waers:'IDR', total:'4500.00', ekgrp:'M03',
    del_by:'KMI-BOD', del_at:dThisMon(4), del_tm:'10:18:05',
    reason:'Budget maintenance kuartal ini sudah habis. Ajukan ulang di kuartal berikutnya.' },

  /* PR 0010000172 — 1 item, SURABAYA 2000 RSBR (RND) */
  { banfn:'0010000172', bnfpo:'00010', werks:'2000', bsart:'RSBR',
    txz01:'MESIN UJI KELEMBABAN', ernam:'LINDAK', ernam_full:'Linda Kusuma',
    erdat:dAgo(32), menge:'1.000', meins:'PC', preis:'475000.00', peinh:'1',
    waers:'IDR', total:'475000.00', ekgrp:'R01',
    del_by:'KMI-BOD', del_at:dThisMon(9), del_tm:'09:02:47',
    reason:'Spesifikasi belum jelas, minta dilengkapi dulu proposal teknisnya.' },

  /* PR 0010000173 — 1 item TANPA alasan (reason kosong) —
     menguji kartu history reject tanpa blok .card-reason */
  { banfn:'0010000173', bnfpo:'00010', werks:'1200', bsart:'PRKS',
    txz01:'SEWA GENSET 100KVA', ernam:'AGUSW', ernam_full:'Agus Wijaya',
    erdat:dAgo(29), menge:'1.000', meins:'AU', preis:'135000.00', peinh:'1',
    waers:'IDR', total:'135000.00', ekgrp:'S01',
    del_by:'KMI-BOD', del_at:dThisMon(13), del_tm:'17:29:14',
    reason:'' }
];

/* ================================================================
   MONITORING STATUS PO  —  bentuk response GET_APP_PO.
   Field HIST_APP + po_status / ebeln / lifnr / vendor / po_date /
   ordqty / age.

   po_status: OPEN (belum PO) | PARTIAL (sebagian) | DONE (sudah PO)
              | DEL (PR dihapus)
   age      : umur hari sejak approve; app-po.js memberi badge
              kuning >=7 hari dan merah >=14 hari.
   ================================================================ */
var DUMMY_APP_PO = [
  /* PR 0010000151 — 1 item DONE + 1 item OPEN => status kartu PARTIAL-ish
     (poWorstStatus = OPEN karena nopen>0), badge "1 dari 2 item" */
  { banfn:'0010000151', bnfpo:'00010', werks:'1200', bsart:'ROTO',
    txz01:'FILTER UDARA COMPRESSOR', ernam:'ANDIKA', ernam_full:'Andika Pratama',
    erdat:dAgo(40), menge:'10.000', meins:'PC', preis:'3250.00', peinh:'1',
    waers:'IDR', total:'32500.00', ekgrp:'M01',
    app_by:'KMI-BOD', app_at:dThisMon(3), app_tm:'09:14:22',
    po_status:'DONE', ebeln:'4500012345', lifnr:'0000101201',
    vendor:'PT Sumber Teknik Jaya', po_date:dThisMon(5), ordqty:'10.000', age:'0' },
  { banfn:'0010000151', bnfpo:'00020', werks:'1200', bsart:'ROTO',
    txz01:'FILTER OLI COMPRESSOR', ernam:'ANDIKA', ernam_full:'Andika Pratama',
    erdat:dAgo(40), menge:'10.000', meins:'PC', preis:'2100.00', peinh:'1',
    waers:'IDR', total:'21000.00', ekgrp:'M01',
    app_by:'KMI-BOD', app_at:dThisMon(3), app_tm:'09:14:22',
    po_status:'OPEN', ebeln:'', lifnr:'', vendor:'', po_date:'', ordqty:'0.000', age:'9' },

  /* PR 0010000152 — OPEN, umur 21 hari => badge merah (>=14) */
  { banfn:'0010000152', bnfpo:'00010', werks:'2000', bsart:'ROTO',
    txz01:'BELT CONVEYOR 600MM', ernam:'DEWIL', ernam_full:'Dewi Lestari',
    erdat:dAgo(38), menge:'25.000', meins:'M', preis:'4750.00', peinh:'1',
    waers:'IDR', total:'118750.00', ekgrp:'M02',
    app_by:'KMI-BOD', app_at:dThisMon(5), app_tm:'14:02:51',
    po_status:'OPEN', ebeln:'', lifnr:'', vendor:'', po_date:'', ordqty:'0.000', age:'21' },

  /* PR 0010000153 — campuran DONE / PARTIAL / OPEN */
  { banfn:'0010000153', bnfpo:'00010', werks:'1200', bsart:'RSBR',
    txz01:'CAT PRIMER SAMPEL', ernam:'LINDAK', ernam_full:'Linda Kusuma',
    erdat:dAgo(35), menge:'4.000', meins:'KG', preis:'5500.00', peinh:'1',
    waers:'IDR', total:'22000.00', ekgrp:'R01',
    app_by:'KMI-BOD', app_at:dThisMon(8), app_tm:'10:31:07',
    po_status:'DONE', ebeln:'4500012350', lifnr:'0000101305',
    vendor:'CV Kimia Nusantara', po_date:dThisMon(10), ordqty:'4.000', age:'0' },
  { banfn:'0010000153', bnfpo:'00020', werks:'1200', bsart:'RSBR',
    txz01:'THINNER SPESIAL', ernam:'LINDAK', ernam_full:'Linda Kusuma',
    erdat:dAgo(35), menge:'8.000', meins:'L', preis:'1850.00', peinh:'1',
    waers:'IDR', total:'14800.00', ekgrp:'R01',
    app_by:'KMI-BOD', app_at:dThisMon(8), app_tm:'10:31:07',
    po_status:'PARTIAL', ebeln:'4500012350', lifnr:'0000101305',
    vendor:'CV Kimia Nusantara', po_date:dThisMon(10), ordqty:'5.000', age:'6' },
  { banfn:'0010000153', bnfpo:'00030', werks:'1200', bsart:'RSBR',
    txz01:'KUAS SET SAMPEL', ernam:'LINDAK', ernam_full:'Linda Kusuma',
    erdat:dAgo(35), menge:'3.000', meins:'SET', preis:'950.00', peinh:'1',
    waers:'IDR', total:'2850.00', ekgrp:'R01',
    app_by:'KMI-BOD', app_at:dThisMon(8), app_tm:'10:31:07',
    po_status:'OPEN', ebeln:'', lifnr:'', vendor:'', po_date:'', ordqty:'0.000', age:'6' },

  /* PR 0010000154 — DONE semua (USD) */
  { banfn:'0010000154', bnfpo:'00010', werks:'1001', bsart:'PRKS',
    txz01:'LISENSI SOFTWARE CAD 1 TAHUN', ernam:'FAJARN', ernam_full:'Fajar Nugroho',
    erdat:dAgo(33), menge:'2.000', meins:'AU', preis:'1450.00', peinh:'1',
    waers:'USD', total:'2900.00', ekgrp:'S02',
    app_by:'KMI-BOD', app_at:dThisMon(11), app_tm:'16:45:19',
    po_status:'DONE', ebeln:'4500012361', lifnr:'0000102010',
    vendor:'PT Digital Solusi Indonesia', po_date:dThisMon(12), ordqty:'2.000', age:'0' },

  /* PR 0010000155 — SEMARANG, 1 DONE + 1 OPEN umur 12 hari (badge kuning) */
  { banfn:'0010000155', bnfpo:'00010', werks:'1300', bsart:'ROTO',
    txz01:'KOMPRESOR ANGIN 10 BAR', ernam:'JOKOP', ernam_full:'Joko Purnomo',
    erdat:dAgo(30), menge:'1.000', meins:'PC', preis:'215000.00', peinh:'1',
    waers:'IDR', total:'215000.00', ekgrp:'M01',
    app_by:'KMI-BOD', app_at:dThisMon(6), app_tm:'08:22:40',
    po_status:'DONE', ebeln:'4500012377', lifnr:'0000103100',
    vendor:'PT Mesin Andalan', po_date:dThisMon(9), ordqty:'1.000', age:'0' },
  { banfn:'0010000155', bnfpo:'00020', werks:'1300', bsart:'ROTO',
    txz01:'SELANG ANGIN 1/2 INCH', ernam:'JOKOP', ernam_full:'Joko Purnomo',
    erdat:dAgo(30), menge:'30.000', meins:'M', preis:'420.00', peinh:'1',
    waers:'IDR', total:'12600.00', ekgrp:'M01',
    app_by:'KMI-BOD', app_at:dThisMon(6), app_tm:'08:22:40',
    po_status:'OPEN', ebeln:'', lifnr:'', vendor:'', po_date:'', ordqty:'0.000', age:'12' },

  /* PR 0010000156 — SEMARANG 3000, PR sudah dihapus setelah approve */
  { banfn:'0010000156', bnfpo:'00010', werks:'3000', bsart:'PRKS',
    txz01:'SERVICE FORKLIFT 3 TON', ernam:'MAYAS', ernam_full:'Maya Sari',
    erdat:dAgo(28), menge:'1.000', meins:'AU', preis:'88000.00', peinh:'1',
    waers:'IDR', total:'88000.00', ekgrp:'S01',
    app_by:'KMI-BOD', app_at:dThisMon(12), app_tm:'11:05:33',
    po_status:'DEL', ebeln:'', lifnr:'', vendor:'', po_date:'', ordqty:'0.000', age:'0' },

  /* PR 0010000157 — bulan lalu, OPEN 30 hari (paling merah) */
  { banfn:'0010000157', bnfpo:'00010', werks:'1200', bsart:'ROTO',
    txz01:'HOIST ELEKTRIK 2 TON', ernam:'BUDIS', ernam_full:'Budi Setiawan',
    erdat:dAgo(60), menge:'1.000', meins:'PC', preis:'320000.00', peinh:'1',
    waers:'IDR', total:'320000.00', ekgrp:'M02',
    app_by:'KMI-BOD', app_at:dPrevMon(18), app_tm:'13:40:11',
    po_status:'OPEN', ebeln:'', lifnr:'', vendor:'', po_date:'', ordqty:'0.000', age:'30' },

  /* PR 0010000158 — bulan lalu, sudah PO */
  { banfn:'0010000158', bnfpo:'00010', werks:'1300', bsart:'ROTO',
    txz01:'TROLLEY BARANG 500KG', ernam:'MAYAS', ernam_full:'Maya Sari',
    erdat:dAgo(58), menge:'4.000', meins:'PC', preis:'18500.00', peinh:'1',
    waers:'IDR', total:'74000.00', ekgrp:'M01',
    app_by:'KMI-BOD', app_at:dPrevMon(22), app_tm:'15:12:08',
    po_status:'DONE', ebeln:'4500012288', lifnr:'0000103400',
    vendor:'UD Karya Logam', po_date:dPrevMon(25), ordqty:'4.000', age:'0' }
];

/* ================================================================
   TEKS ITEM  —  bentuk response GET_ITEM_TEXT:
   {"status":"S","message":"OK","banfn":"...","item":"00010",
    "text":"...","has_text":true,"is_svc":false,"has_wo":false,
    "wo_list":[]}

   Tiga skenario yang bisa dites dari tombol "Lihat Teks":
   a. PR biasa PUNYA long-text          -> has_text:true
   b. PR biasa TANPA long-text          -> has_text:false  (empty state)
   c. PR dibuat SVC_MAINT               -> is_svc:true, tampil tabel
                                           Work Order (IW33)
   PR yang tidak terdaftar di sini otomatis dianggap skenario (b).
   ================================================================ */
var DUMMY_ITEM_TEXT = {
  '0010000101': {
    item:'00010', has_text:true, is_svc:false, has_wo:false, wo_list:[],
    text:'Penggantian bearing pada rotary dryer line 2.\n' +
         'Bearing existing sudah mengeluarkan bunyi abnormal sejak\n' +
         'inspeksi mingguan tanggal 12 dan suhu housing terukur 78 C\n' +
         '(normal 45-55 C).\n\n' +
         'Merk WAJIB SKF, tidak menerima merk substitusi.\n' +
         'Pengiriman paling lambat 2 minggu sejak PO terbit.'
  },
  '0010000103': {
    item:'00010', has_text:true, is_svc:false, has_wo:false, wo_list:[],
    text:'Motor existing terbakar pada tanggal 3 (winding short).\n' +
         'Sudah dicek oleh tim elektrik, tidak ekonomis untuk rewinding.\n' +
         'Spesifikasi pengganti: 5.5KW / 3 Phase / 380V / 1450 RPM /\n' +
         'Frame 132M / Mounting B3.'
  },
  '0010000107': {
    item:'00010', has_text:true, is_svc:false, has_wo:false, wo_list:[],
    text:'Stok bearing 6308 di gudang habis (MRP run).\n' +
         'Dipakai rutin untuk conveyor line 1 s/d 4.\n' +
         'Minta pengadaan sekaligus untuk kebutuhan 3 bulan.'
  },
  '0010000201': {
    item:'00010', has_text:true, is_svc:false, has_wo:false, wo_list:[],
    text:'Bahan untuk trial coating produk meja seri WALNUT-2026.\n' +
         'Target: uji ketahanan gores minimal 3H.\n' +
         'Hasil trial akan direview tim RND akhir bulan.'
  },
  /* PR dari creator SVC_MAINT -> selalu tampilkan Work Order, long-text
     diabaikan (lihat cabang res.is_svc di showItemTextModal, app-ui.js) */
  '0010000302': {
    item:'00010', has_text:false, is_svc:true, has_wo:true,
    text:'',
    wo_list:[
      { aufnr:'800001234', equnr:'10000451', eqktx:'COMPRESSOR SCREW 75HP - LINE 2' },
      { aufnr:'800001235', equnr:'10000452', eqktx:'AIR DRYER REFRIGERATED 10 BAR' }
    ]
  },
  /* PR SVC_MAINT TANPA Work Order -> empty state versi SVC */
  '0010000301': {
    item:'00010', has_text:false, is_svc:false, has_wo:false, wo_list:[],
    text:''
  }
};

/* ================================================================
   DERIVASI — item_count & totals pada baris GET_LIST.

   Di SAP kedua field ini dihitung di ABAP (COLLECT per waers, lihat
   lt_gl_curr di main.htm). Di sini dihitung dari DUMMY_DETAIL supaya
   tidak pernah beda dengan isi tabel detailnya. Hasilnya tetap STRING,
   persis seperti output ABAP.
   ================================================================ */
function recalcPending(rows) {
  rows.forEach(function(pr){
    var items = DUMMY_DETAIL[pr.banfn] || [];
    var totals = [];
    items.forEach(function(it){
      var w = it.waers || 'IDR';
      var t = totals.filter(function(x){ return x.waers === w; })[0];
      if (!t) { t = { waers:w, _n:0 }; totals.push(t); }
      t._n += parseFloat(it.total) || 0;
    });
    if (!totals.length) totals.push({ waers:'IDR', _n:0 });
    pr.totals     = totals.map(function(t){
      return { waers:t.waers, total:t._n.toFixed(2) };
    });
    pr.item_count = String(items.length);
  });
  return rows;
}
recalcPending(DUMMY_PENDING);
