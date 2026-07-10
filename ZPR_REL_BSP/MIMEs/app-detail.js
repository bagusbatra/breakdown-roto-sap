/* ================================================================
   PAGINATION
   ================================================================ */
function renderPagination(total,totalPages,
                          start,end) {
  if (pageSize===0||totalPages<=1){
    return '<div class="pagination-bar">'+
           '<span class="pg-info">'+
           'Showing all '+total+' PR</span></div>';
  }

  var html='<div class="pagination-bar">';
  html+='<button class="pg-btn"'+
        ' onclick="goPage(1)"'+
        (curPage<=1?' disabled':'')+
        '>&#171;</button>';
  html+='<button class="pg-btn"'+
        ' onclick="goPage('+(curPage-1)+')"'+
        (curPage<=1?' disabled':'')+
        '>&#8249;</button>';

  var sp=Math.max(1,curPage-2);
  var ep=Math.min(totalPages,curPage+2);

  if (sp>1){
    html+='<button class="pg-btn"'+
          ' onclick="goPage(1)">1</button>';
    if (sp>2)
      html+='<span class="pg-info">...</span>';
  }
  for (var i=sp;i<=ep;i++){
    html+='<button class="pg-btn'+
          (i===curPage?' active':'')+'"'+
          ' onclick="goPage('+i+')">'+
          i+'</button>';
  }
  if (ep<totalPages){
    if (ep<totalPages-1)
      html+='<span class="pg-info">...</span>';
    html+='<button class="pg-btn"'+
          ' onclick="goPage('+totalPages+')">'+
          totalPages+'</button>';
  }
  html+='<button class="pg-btn"'+
        ' onclick="goPage('+(curPage+1)+')"'+
        (curPage>=totalPages?' disabled':'')+
        '>&#8250;</button>';
  html+='<button class="pg-btn"'+
        ' onclick="goPage('+totalPages+')"'+
        (curPage>=totalPages?' disabled':'')+
        '>&#187;</button>';
  html+='<span class="pg-info">'+
        (start+1)+'&ndash;'+end+
        ' of '+total+'</span>';
  html+='</div>';
  return html;
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

function onSortChange(val) {
  curSort=val; curPage=1;
  renderList();
}

/* ================================================================
   EXPAND / COLLAPSE
   ================================================================ */
function toggleExpand(banfn) {
  var card=document.getElementById(
    'card_'+banfn);
  if (!card) return;
  var wasExp=card.classList.contains('expanded');
  card.classList.toggle('expanded');
  if (!wasExp) loadDetail(banfn);
}

function expandAll() {
  allExpanded=true;
  var s=pageSize===0?0:(curPage-1)*pageSize;
  var e=pageSize===0?filteredData.length
    :Math.min(s+pageSize,filteredData.length);
  for (var i=s;i<e;i++){
    var card=document.getElementById(
      'card_'+filteredData[i].banfn);
    if (card){
      card.classList.add('expanded');
      loadDetail(filteredData[i].banfn);
    }
  }
}

function collapseAll() {
  allExpanded=false;
  document.querySelectorAll('.po-card')
    .forEach(function(c){
      c.classList.remove('expanded');
    });
}

function toggleExpandAll() {
  if (allExpanded) { collapseAll(); }
  else { expandAll(); }
  var btn=document.getElementById('btnToggleExpand');
  if (btn) btn.innerHTML=
    allExpanded?'&#9650; Collapse':'&#9660; Expand';
}

/* ================================================================
   LOAD DETAIL
   ================================================================ */
function loadDetail(banfn) {
  var el=document.getElementById(
    'detContent_'+banfn);
  if (!el||el.dataset.loaded==='1') return;
  el.dataset.loaded='1';

  fetch(API_URL+'?action=GET_DETAIL'+
        '&banfn='+encodeURIComponent(banfn))
    .then(function(r){return r.json();})
    .then(function(res){
      var items=res.data||[];
      if (items.length===0){
        el.innerHTML=
          '<div style="padding:12px;'+
          'font-size:13px;color:var(--muted);'+
          'text-align:center;">'+
          'Tidak ada item.</div>';
 return;
  }
  var waers=items[0].waers||'IDR';
  var html=
    '<div style="overflow-x:auto;">'+
    '<table><thead><tr>'+
    '<th>Item</th><th>Material</th>'+
    '<th>Deskripsi</th>'+
    '<th class="num">Qty</th>'+
    '<th>UoM</th>'+
    '<th class="num">Harga/Unit</th>'+
    '<th class="num">Total</th>'+
    '<th>Curr</th>'+
    '<th>Tgl Butuh</th>'+
    '</tr></thead><tbody>';

  items.forEach(function(it){
    var w=it.waers||waers;
    var cs=w==='IDR'
      ?'background:#f1f5f9;color:#475569;'
      :w==='USD'
        ?'background:#dbeafe;color:#1d4ed8;'
        :'background:#fef9c3;color:#854d0e;';
    html+='<tr>';
    html+='<td style="font-family:\'DM Mono\','+
          'monospace;font-weight:600;'+
          'color:var(--primary);">'+
          escHtml(it.bnfpo)+'</td>';
    html+='<td style="font-family:\'DM Mono\','+
          'monospace;font-size:12px;">'+
          escHtml(it.matnr||'-')+'</td>';
    html+='<td style="font-weight:500;">'+
          escHtml(it.maktx||it.txz01||'-')+
          '</td>';
    html+='<td class="num">'+
          fmtQty(it.menge)+'</td>';
    html+='<td><span style="background:#f1f5f9;'+
          'padding:2px 6px;border-radius:4px;'+
          'font-size:11px;">'+
          escHtml(it.meins)+'</span></td>';
    html+='<td class="num">'+
          fmtAmt(it.preis,w)+'</td>';
    html+='<td class="num"'+
          ' style="font-weight:700;">'+
          fmtAmt(it.total,w)+'</td>';
    html+='<td><span style="padding:2px 6px;'+
          'border-radius:4px;font-size:11px;'+
          'font-weight:600;'+cs+'">'+
          escHtml(w)+'</span></td>';
    html+='<td style="color:var(--muted);">'+
          escHtml(it.lfdat||'-')+'</td>';
    html+='</tr>';
  });
  html+='</tbody></table></div>';
  el.innerHTML=html;
})
.catch(function(){
  el.innerHTML=
    '<div style="padding:12px;'+
    'font-size:13px;color:var(--danger);'+
    'text-align:center;">'+
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

if (!selBanfns[filteredData[i].banfn]){

allSel=false; break;

}

}

for (var i=s;i<e;i++){

var bn=filteredData[i].banfn;

if (allSel) delete selBanfns[bn];

else selBanfns[bn]=true;

}
var btn=document.getElementById('btnSelAll');

if (btn) btn.innerHTML=allSel

?'☐ Select All'

:'☑ Deselect All';
updateFabInfo(); syncCheckboxes();

}
function syncCheckboxes() {

document.querySelectorAll('.card-cb')

.forEach(function(cb){

cb.checked=!!selBanfns[cb.dataset.banfn];

});

}
function updateFabInfo() {

var cnt=Object.keys(selBanfns).length;

var el=document.getElementById('fabInfo');

if (el) el.textContent=cnt+' PR dipilih';

}

