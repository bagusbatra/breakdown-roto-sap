/* ================================================================
   app-core.js — ZPO_REL_BSP
   Modul inti: state global, konstanta, dan helper dasar aplikasi
   Release Purchase Order. Diisi pada task berikutnya.
   ================================================================ */
'use strict';

var ZERO_DEC_CURRENCIES = [
  'IDR','JPY','KRW','VND','BIF','CLP','GNF',
  'ISK','KMF','MGA','PYG','RWF','UGX','XAF','XOF','XPF'
];

/* ================================================================
   UTILITY FUNCTIONS
   ================================================================ */
function todayStr() {
  var d  = new Date();
  var mm = ('0' + (d.getMonth() + 1)).slice(-2);
  var dd = ('0' + d.getDate()).slice(-2);
  return d.getFullYear() + '' + mm + '' + dd;
}

function toInputDate(dats) {
  if (!dats || dats.length < 8) return '';
  return dats.substr(0,4) + '-' + dats.substr(4,2) + '-' + dats.substr(6,2);
}

function fromInputDate(val) {
  if (!val) return '';
  return val.replace(/-/g, '');
}

function formatDate(dats) {
  if (!dats || dats.length < 8) return '-';
  return dats.substr(6,2) + '/' + dats.substr(4,2) + '/' + dats.substr(0,4);
}

function formatTime(tims) {
  if (!tims) return '-';
  var s = tims.toString().replace(/\s/g,'').padStart(6,'0');
  return s.substr(0,2) + ':' + s.substr(2,2) + ':' + s.substr(4,2);
}

function escHtml(s) {
  if (!s) return '';
  return String(s)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;');
}

function parseAbapNum(rawStr) {
  if (!rawStr || rawStr === '') return NaN;
  var s = rawStr.toString().trim();
  var dotCount = (s.match(/\./g) || []).length;
  if (dotCount > 1) {
    return parseFloat(s.replace(/\./g,'').replace(',','.'));
  }
  return parseFloat(s);
}

function formatAmount(rawStr, currency) {
  if (!rawStr || rawStr === '' || rawStr === '0')
    return '0 ' + (currency || '');
  var num  = parseAbapNum(rawStr);
  if (isNaN(num)) return escHtml(rawStr) + ' ' + (currency || '');
  var curr = (currency || '').toUpperCase();
  var isZD = ZERO_DEC_CURRENCIES.indexOf(curr) > -1;
  var fmt;
  if (isZD) {
    fmt = Math.round(num * 100)
      .toLocaleString('id-ID',
        { minimumFractionDigits:0, maximumFractionDigits:0 });
  } else {
    fmt = num.toLocaleString('id-ID',
      { minimumFractionDigits:2, maximumFractionDigits:2 });
  }
  return fmt + (currency ? ' ' + currency : '');
}

function formatNum(rawStr, currency) {
  if (!rawStr || rawStr === '' || rawStr === '0') return '0';
  var num  = parseAbapNum(rawStr);
  if (isNaN(num)) return escHtml(rawStr);
  var curr = (currency || '').toUpperCase();
  if (currency && ZERO_DEC_CURRENCIES.indexOf(curr) > -1) {
    return Math.round(num * 100)
      .toLocaleString('id-ID',
        { minimumFractionDigits:0, maximumFractionDigits:0 });
  }
  if (currency && ZERO_DEC_CURRENCIES.indexOf(curr) === -1) {
    return num.toLocaleString('id-ID',
      { minimumFractionDigits:2, maximumFractionDigits:2 });
  }
  if (num % 1 === 0) {
    return num.toLocaleString('id-ID',
      { minimumFractionDigits:0, maximumFractionDigits:0 });
  }
  return num.toLocaleString('id-ID',
    { minimumFractionDigits:3, maximumFractionDigits:3 });
}

function formatNumHist(rawStr, currency) {
  /* Khusus history: netpr & netwr dari EKPO
     tidak perlu dikali 100 karena langsung dari DB */
  if (!rawStr || rawStr === '' || rawStr === '0') return '0';
  var num  = parseAbapNum(rawStr);
  if (isNaN(num)) return escHtml(rawStr);
  var curr = (currency || '').toUpperCase();
  if (currency && ZERO_DEC_CURRENCIES.indexOf(curr) > -1) {
    return Math.round(num)
      .toLocaleString('id-ID',
        { minimumFractionDigits:0, maximumFractionDigits:0 });
  }
  if (currency && ZERO_DEC_CURRENCIES.indexOf(curr) === -1) {
    return num.toLocaleString('id-ID',
      { minimumFractionDigits:2, maximumFractionDigits:2 });
  }
  if (num % 1 === 0) {
    return num.toLocaleString('id-ID',
      { minimumFractionDigits:0, maximumFractionDigits:0 });
  }
  return num.toLocaleString('id-ID',
    { minimumFractionDigits:3, maximumFractionDigits:3 });
}

/* ================================================================
   UI / FETCH HELPERS
   ================================================================ */
function svgIcon(name){
  return '<svg class="icon" aria-hidden="true"><use href="#i-'+name+'"></use></svg>';
}
function apiPost(action, params){
  var body = new URLSearchParams();
  body.append('action', action);
  if (params){ for (var k in params){ if (params.hasOwnProperty(k)) body.append(k, params[k]); } }
  return fetch('main.htm', { method:'POST', body:body, credentials:'include' })
    .then(function(r){ return r.json(); });
}
