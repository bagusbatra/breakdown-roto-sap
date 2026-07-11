/* ================================================================
   SHOW MODAL APPROVE
   ================================================================ */
function showModalApprove() {
  if (!isApprover) return;
  var cnt=Object.keys(selBanfns).length;
  if (cnt===0){
    showToast('E','Pilih minimal 1 PR terlebih dahulu');
    return;
  }
  var desc=document.getElementById('modalApproveDesc');
  if (desc) desc.textContent='Approve '+cnt+' PR yang dipilih?';
  openModal('modalApprove');
}

/* ================================================================
   SHOW MODAL REJECT
   ================================================================ */
function showModalReject() {
  if (!isApprover) return;
  var cnt=Object.keys(selBanfns).length;
  if (cnt===0){
    showToast('E','Pilih minimal 1 PR terlebih dahulu');
    return;
  }
  var desc=document.getElementById('modalRejectDesc');
  if (desc) desc.textContent='Reject & Delete '+cnt+' PR yang dipilih?';
  document.getElementById('rejectNotes').value='';
  openModal('modalReject');
}

/* ================================================================
   CONFIRM APPROVE
   ================================================================ */
function confirmApprove() {
  closeModal('modalApprove');
  var banfns=Object.keys(selBanfns);
  if (banfns.length===0) return;
  processAction(banfns,'approve','');
}

/* ================================================================
   CONFIRM REJECT
   ================================================================ */
function confirmReject() {
  closeModal('modalReject');
  var banfns=Object.keys(selBanfns);
  if (banfns.length===0) return;
  var notes=document.getElementById('rejectNotes').value||'';
  processAction(banfns,'delete',notes);
}

/* ================================================================
   PROCESS ACTION — sequential one by one
   ================================================================ */
function setLoadingText(txt) {
  var lo   =document.getElementById('lo');
  var loBox=lo?lo.querySelector('.lo-box'):null;
  if (loBox) loBox.innerHTML=escHtml(txt)+'<div class="lo-spin"></div>';
}

function processAction(banfns,action,notes) {
  if (!isApprover) return;

  var total =banfns.length;
  var ok    =0;
  var errs  =[];
  var proc  =0;
  var lo    =document.getElementById('lo');

  if (lo) lo.classList.add('show');
  setLoadingText('Memproses 0 dari '+total+'...');

  /* Simpan state untuk reload setelah selesai */
  var savedPlant    =curPlant;
  var savedCategory =curCategory;
  var savedBsart    =curBsart;
  var savedMode     =curMode;
  var savedEstkz    =curEstkzFilter;

  function doNext(idx) {
    if (idx>=banfns.length){

      /* Semua selesai */
      if (lo) lo.classList.remove('show');

      /* Toast result */
      if (ok>0){
        var lbl=action==='approve'?'approve':'reject & delete';
        showToast('S',ok+' PR berhasil di-'+lbl);
      }
      if (errs.length>0){
        showToast('E',
          errs.slice(0,3).join(' | ')+
          (errs.length>3?' (+'+(errs.length-3)+' lagi)':''));
      }

      /* Reset selection */
      selBanfns={};

      /* Data monitoring PO ikut berubah (ada approved baru / PR
         terhapus) — tandai cache basi agar dimuat ulang. */
      if (typeof invalidatePoData==='function') invalidatePoData();

      /* Reload sidebar counts */
      loadSidebarData();

      /* Reload view setelah delay */
      setTimeout(function(){
        curPlant       =savedPlant;
        curCategory    =savedCategory;
        curBsart       =savedBsart;
        curMode        =savedMode;
        curEstkzFilter =savedEstkz;
        curPage        =1;
        allExpanded    =false;
        showSkeleton();

        if (savedMode==='pending'){
          fetchList(savedEstkz);
        } else if (savedMode==='hist_app'){
          fetchHistApp();
        } else {
          fetchHistRej();
        }
      },700);

      return;
    }

    proc++;
    setLoadingText('Memproses '+proc+' dari '+total+'...');

    var banfn=banfns[idx];
    var body =
      'action=PROCESS'+
      '&banfn='+encodeURIComponent(banfn)+
      '&pr_action='+encodeURIComponent(action)+
      '&notes='+encodeURIComponent(notes);

    fetch(API_URL,postOpts(body))
      .then(function(r){return r.json();})
      .then(function(res){
        if (res.status==='S'){
          ok++;
          /* Kartu menyusut & memudar. Transisinya ada di .removing
             (style.css) sehingga ikut dimatikan oleh
             prefers-reduced-motion. */
          var card=document.getElementById('card_'+banfn);
          if (card) card.classList.add('removing');
        } else {
          errs.push(banfn+': '+(res.message||'Unknown error'));
        }
        doNext(idx+1);
      })
      .catch(function(){
        errs.push(banfn+': Connection error');
        doNext(idx+1);
      });
  }

  doNext(0);
}

/* ================================================================
   INIT
   ================================================================ */
init();
