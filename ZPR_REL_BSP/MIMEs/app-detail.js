/* ================================================================
   PAGINATION — satu pembangun dipakai bersama oleh list pending
   (goPage) dan history (histGoPage).
   ================================================================ */
function pgBtn(handler,page,label,icon,disabled,current) {
  var inner = icon ? svgIcon(icon,'ico-sm') : label;
  return '<button type="button" class="pg-btn"'+
    (current?' aria-current="page"':'')+
    (disabled?' disabled':'')+
    (icon?' aria-label="'+escHtml(label)+'"':'')+
    ' onclick="'+handler+'('+page+')">'+inner+'</button>';
}

function buildPagination(total,totalPages,start,end,curPg,handler) {
  var html='<div class="pagination-bar">';

  html+=pgBtn(handler,1,'Halaman pertama','i-chevrons-left',curPg<=1,false);
  html+=pgBtn(handler,curPg-1,'Halaman sebelumnya','i-chevron-left',curPg<=1,false);

  var sp=Math.max(1,curPg-2);
  var ep=Math.min(totalPages,curPg+2);

  if (sp>1){
    html+=pgBtn(handler,1,'1',null,false,false);
    if (sp>2) html+='<span class="pg-info">...</span>';
  }
  for (var i=sp;i<=ep;i++){
    html+=pgBtn(handler,i,''+i,null,false,i===curPg);
  }
  if (ep<totalPages){
    if (ep<totalPages-1) html+='<span class="pg-info">...</span>';
    html+=pgBtn(handler,totalPages,''+totalPages,null,false,false);
  }

  html+=pgBtn(handler,curPg+1,'Halaman berikutnya','i-chevron-right',curPg>=totalPages,false);
  html+=pgBtn(handler,totalPages,'Halaman terakhir','i-chevrons-right',curPg>=totalPages,false);

  html+='<span class="pg-info">'+(start+1)+'&ndash;'+end+' dari '+total+'</span>';
  html+='</div>';
  return html;
}

function renderPagination(total,totalPages,start,end) {
  if (pageSize===0||totalPages<=1){
    return '<div class="pagination-bar">'+
           '<span class="pg-info">Menampilkan semua '+total+' PR</span></div>';
  }
  return buildPagination(total,totalPages,start,end,curPage,'goPage');
}

function goPage(pg) {
  var tp=pageSize===0?1
    :Math.ceil(filteredData.length/pageSize)||1;
  if (pg<1) pg=1;
  if (pg>tp) pg=tp;
  curPage=pg; selBanfns={};
  renderList(); window.scrollTo(0,0);
}

function changePageSize(val) {
  pageSize=val; curPage=1;
  selBanfns={}; renderList();
}

function onSearchTrigger(val) {
  searchKw=val.trim(); curPage=1;
  selBanfns={}; renderList();
}

/* ================================================================
   EXPAND / COLLAPSE
   ================================================================ */
/* Satu-satunya tempat kelas .expanded diubah, supaya aria-expanded
   pada tombol chevron tidak pernah tertinggal dari kondisi visual. */
function setCardExpanded(card,on) {
  if (!card) return;
  card.classList.toggle('expanded',on);
  var btn=card.querySelector('.card-expand');
  if (btn) btn.setAttribute('aria-expanded',on?'true':'false');
}

function toggleExpand(banfn) {
  var card=document.getElementById('card_'+banfn);
  if (!card) return;
  var wasExp=card.classList.contains('expanded');
  setCardExpanded(card,!wasExp);
  if (!wasExp) loadDetail(banfn);
}

function expandAll() {
  allExpanded=true;
  var s=pageSize===0?0:(curPage-1)*pageSize;
  var e=pageSize===0?filteredData.length
    :Math.min(s+pageSize,filteredData.length);
  for (var i=s;i<e;i++){
    var card=document.getElementById('card_'+filteredData[i].banfn);
    if (card){
      setCardExpanded(card,true);
      loadDetail(filteredData[i].banfn);
    }
  }
}

function collapseAll() {
  allExpanded=false;
  document.querySelectorAll('#cardContainer .po-card')
    .forEach(function(c){ setCardExpanded(c,false); });
}

function toggleExpandAll() {
  if (allExpanded) { collapseAll(); }
  else { expandAll(); }
  var btn=document.getElementById('btnToggleExpand');
  if (btn) btn.innerHTML=
    svgIcon('i-chevron-down')+' '+
    (allExpanded?'Tutup Semua':'Buka Semua');
}

/* ================================================================
   LOAD DETAIL
   ================================================================ */
function currencyChipClass(w) {
  if (w==='IDR') return 'chip chip-cur';
  if (w==='USD') return 'chip chip-cur chip-cur--usd';
  return 'chip chip-cur chip-cur--alt';
}

function loadDetail(banfn) {
  var el=document.getElementById('detContent_'+banfn);
  if (!el||el.dataset.loaded==='1') return;
  el.dataset.loaded='1';

  fetch(API_URL+'?action=GET_DETAIL'+
        '&banfn='+encodeURIComponent(banfn))
    .then(function(r){return r.json();})
    .then(function(res){
      var items=res.data||[];
      if (items.length===0){
        el.innerHTML='<div class="card-detail-msg">Tidak ada item.</div>';
        return;
      }

      var waers=items[0].waers||'IDR';
      var html=
        '<div class="card-detail-scroll">'+
        '<table><thead><tr>'+
        '<th>Item</th><th>Material</th>'+
        '<th>Deskripsi</th>'+
        '<th class="num">Jumlah</th>'+
        '<th>Satuan</th>'+
        '<th class="num">Harga/Unit</th>'+
        '<th class="num">Total</th>'+
        '<th>Mata Uang</th>'+
        '<th>Tgl Butuh</th>'+
        '</tr></thead><tbody>';

      items.forEach(function(it){
        var w=it.waers||waers;
        html+='<tr>';
        html+='<td class="cell-item">'+escHtml(it.bnfpo)+'</td>';
        html+='<td class="cell-mono">'+escHtml(it.matnr||'-')+'</td>';
        html+='<td class="cell-strong">'+
              escHtml(it.maktx||it.txz01||'-')+'</td>';
        html+='<td class="num">'+fmtQty(it.menge)+'</td>';
        html+='<td><span class="chip chip-uom">'+escHtml(it.meins)+'</span></td>';
        html+='<td class="num">'+fmtAmt(it.preis,w)+'</td>';
        html+='<td class="num cell-total">'+fmtAmt(it.total,w)+'</td>';
        html+='<td><span class="'+currencyChipClass(w)+'">'+escHtml(w)+'</span></td>';
        html+='<td class="cell-muted">'+escHtml(it.lfdat||'-')+'</td>';
        html+='</tr>';
      });
      html+='</tbody></table></div>';
      el.innerHTML=html;
    })
    .catch(function(){
      el.innerHTML='<div class="card-detail-msg card-detail-msg--error">'+
        'Gagal memuat detail.</div>';
    });
}

/* ================================================================
   SELECT / DESELECT
   ================================================================ */
function toggleSelect(banfn) {
  if (!isApprover) return;
  if (selBanfns[banfn]) delete selBanfns[banfn];
  else selBanfns[banfn]=true;
  updateFabInfo(); syncCheckboxes();
}

function toggleSelectAll() {
  if (!isApprover) return;
  var s=pageSize===0?0:(curPage-1)*pageSize;
  var e=pageSize===0?filteredData.length
    :Math.min(s+pageSize,filteredData.length);

  var allSel=true;
  for (var i=s;i<e;i++){
    if (!selBanfns[filteredData[i].banfn]){ allSel=false; break; }
  }
  for (var j=s;j<e;j++){
    var bn=filteredData[j].banfn;
    if (allSel) delete selBanfns[bn];
    else selBanfns[bn]=true;
  }

  var btn=document.getElementById('btnSelAll');
  if (btn) btn.innerHTML=svgIcon(allSel?'i-check':'i-x')+' '+
    (allSel?'Pilih Semua':'Batal Pilih');

  updateFabInfo(); syncCheckboxes();
}

/* Checkbox dan penanda kartu (.selected) selalu disinkronkan bersama:
   sebelumnya PR terpilih tidak punya penanda apa pun pada kartunya. */
function syncCheckboxes() {
  document.querySelectorAll('.card-cb').forEach(function(cb){
    var on=!!selBanfns[cb.dataset.banfn];
    cb.checked=on;
    var card=document.getElementById('card_'+cb.dataset.banfn);
    if (card) card.classList.toggle('selected',on);
  });
}

function updateFabInfo() {
  var cnt=Object.keys(selBanfns).length;
  var el=document.getElementById('fabInfo');
  if (el) el.textContent=cnt+' PR dipilih';
}
