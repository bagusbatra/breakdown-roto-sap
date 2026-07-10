/* ================================================================
   STATE & CONSTANTS
   ================================================================ */
var API_URL        = 'main.htm';
var curPlant       = '';
var curMode        = '';
var curCategory    = '';
var curBsart       = '';
var isApprover     = false;
var openSections   = {};
var openCategories = {};
var curEstkzFilter = '';
var curSort      = 'newest';
var curPlantSub  = '';  // filter sub-plant (werks asli) dlm grup sidebar
var filterPanelOpen = false; // panel "Filter" (ESTKZ + plant), shared pending & history

var allData      = [];
var selBanfns    = {};
var pageSize     = 10;
var curPage      = 1;
var searchKw     = '';
var allExpanded  = false;
var filteredData = [];

/* Daftar kategori PR per plant. bsart bisa berisi lebih dari satu
   doc type dipisah koma (contoh 'RSBR,PRK9') — backend akan
   menjumlahkan/menggabungkan filter-nya jadi satu kategori. Daftar
   ini HARUS selalu sinkron dengan lt_cat_def di main.htm. */
var CATEGORY_DEF = {
  '1200':[
    {code:'MTN',label:'PR Maintenance',bsart:'ROTO',
     icon:'&#128203;'},
    {code:'RND',label:'PR RND',bsart:'RSBR,PRK9',
     icon:'&#128300;'},
    {code:'SVC',label:'PR Service',bsart:'PRKS',
     icon:'&#128736;'}
  ],
  '1300':[
    {code:'MTN',label:'PR Maintenance',bsart:'ROTO',
     icon:'&#128203;'},
    {code:'SVC',label:'PR Service',bsart:'PRKS',
     icon:'&#128736;'}
  ],
  '2000':[
    {code:'MTN',label:'PR Maintenance',bsart:'ROTO',
     icon:'&#128203;'},
    {code:'RND',label:'PR RND',bsart:'RSBR,PRK9',
     icon:'&#128300;'},
    {code:'SVC',label:'PR Service',bsart:'PRKS',
     icon:'&#128736;'}
  ],
  '1000':[
    {code:'MTN',label:'PR Maintenance',bsart:'ROTO',
     icon:'&#128203;'},
    {code:'RND',label:'PR RND',bsart:'RSBR,PRK9',
     icon:'&#128300;'},
    {code:'SVC',label:'PR Service',bsart:'PRKS',
     icon:'&#128736;'}
  ],
  '1001':[
    {code:'MTN',label:'PR Maintenance',bsart:'ROTO',
     icon:'&#128203;'},
    {code:'RND',label:'PR RND',bsart:'RSBR,PRK9',
     icon:'&#128300;'},
    {code:'SVC',label:'PR Service',bsart:'PRKS',
     icon:'&#128736;'}
  ],
  '1100':[
    {code:'MTN',label:'PR Maintenance',bsart:'ROTO',
     icon:'&#128203;'},
    {code:'RND',label:'PR RND',bsart:'RSBR,PRK9',
     icon:'&#128300;'},
    {code:'SVC',label:'PR Service',bsart:'PRKS',
     icon:'&#128736;'}
  ],
  '3000':[
    {code:'MTN',label:'PR Maintenance',bsart:'ROTO',
     icon:'&#128203;'},
    {code:'SVC',label:'PR Service',bsart:'PRKS',
     icon:'&#128736;'}
  ]
};

var sbCounts = {
  pending:  { '1200':{}, '1300':{}, '2000':{}, '1000':{}, '1001':{}, '1100':{}, '3000':{} },
  hist_app: { '1200':{}, '1300':{}, '2000':{}, '1000':{}, '1001':{}, '1100':{}, '3000':{} },
  hist_rej: { '1200':{}, '1300':{}, '2000':{}, '1000':{}, '1001':{}, '1100':{}, '3000':{} }
};

var PLANT_LABELS = {
  '1200':'Surabaya',
  '1300':'Semarang',
  '2000':'Surabaya',
  '1000':'Surabaya',
  '1001':'Surabaya',
  '1100':'Surabaya',
  '3000':'Semarang'
};

var ESTKZ_MAP = {
  'B':'MRP',        'D':'Direct',
  'F':'Prod.Order', 'G':'Store Order',
  'R':'Manual',     'U':'Planned Order',
  'V':'SD Doc',     'M':'Monthly',
  'Y':'Annual',     'A':'SAP APO',
  'I':'SAP IBP',    'T':'S4CRM',
  'S':'Self-Svc',   'E':'External'
};

/* ================================================================
   UTILITY
   ================================================================ */
function escHtml(s) {
  if (!s) return '';
  return String(s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function parseNum(s) {
  if (!s || s==='') return NaN;
  var str = s.toString().trim();
  var dc  = (str.match(/\./g)||[]).length;
  if (dc > 1)
    return parseFloat(
      str.replace(/\./g,'').replace(',','.'));
  return parseFloat(str);
}

function fmtAmt(raw, waers) {
  var n = parseNum(raw);
  if (isNaN(n)) return '0';
  var w  = (waers||'').toUpperCase();
  var zd = ['IDR','JPY','KRW','VND'].indexOf(w)>-1;
  if (zd)
    return Math.round(n*100).toLocaleString('id-ID',
      {minimumFractionDigits:0,
       maximumFractionDigits:0});
  return n.toLocaleString('id-ID',
    {minimumFractionDigits:2,
     maximumFractionDigits:2});
}

/* Render blok total di card-top. totals = [{waers,total},...] —
   1 currency = tampilan lama (1 baris besar), >1 currency = ditumpuk
   per baris supaya tidak salah jumlah lintas mata uang. */
function renderCardAmount(totals) {
  if (!totals || !totals.length) totals = [{waers:'IDR', total:0}];
  if (totals.length === 1) {
    var t = totals[0];
    return '<div class="card-amount">'+fmtAmt(t.total,t.waers)+
           '<span class="card-amount-lbl">'+escHtml(t.waers||'IDR')+
           ' Total</span></div>';
  }
  var html = '<div class="card-amount card-amount-multi">';
  totals.forEach(function(t){
    html += '<div class="card-amount-row">'+
            '<span class="card-amount-row-val">'+fmtAmt(t.total,t.waers)+'</span>'+
            '<span class="card-amount-row-lbl">'+escHtml(t.waers||'IDR')+'</span></div>';
  });
  html += '</div>';
  return html;
}

function fmtQty(raw) {
  var n = parseNum(raw);
  if (isNaN(n)) return '0';
  if (n%1===0)
    return n.toLocaleString('id-ID',
      {minimumFractionDigits:0,
       maximumFractionDigits:0});
  return n.toLocaleString('id-ID',
    {minimumFractionDigits:3,
     maximumFractionDigits:3});
}

function postOpts(body) {
  return {
    method:'POST',
    headers:{
      'Content-Type':
        'application/x-www-form-urlencoded'
    },
    body:body
  };
}

