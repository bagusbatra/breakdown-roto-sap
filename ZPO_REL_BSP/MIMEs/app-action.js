/* ================================================================
   app-action.js — ZPO_REL_BSP
   Modul aksi massal: Release/Reject PO + inisialisasi aplikasi
   (init()) — dimuat PALING AKHIR (lihat urutan <script> index.htm),
   makanya panggilan init() ada di baris terakhir file ini.

   PORT dari ZPR_REL_BSP/MIMEs/app-action.js, diremap ke domain PO
   (lihat .superpowers/sdd/zpo-data-schema.md, "Bulk action contract
   (Task 11)"):
   - `showModalApprove`/`confirmApprove` -> `showModalRelease`/
     `confirmRelease` (nama SUDAH dipakai index.htm #fab & toolbar
     aksi massal app-list.js, Task 2/7 — index.htm TIDAK diubah di
     sini).
   - Modal id `modalApprove` -> `modalRelease` (index.htm Task 2).
   - Gate `isApprover` (ZPR) DIBUANG — app release PO ini satu peran,
     sama seperti keputusan Task 7/10 (app-list.js/app-detail.js).
   - Seleksi: `selBanfns` (ZPR, app-core.js) -> `selEbelns` (ZPO,
     dimiliki app-detail.js, Task 10).
   - PERBEDAAN BESAR dari ZPR: ZPR memproses PR satu per satu secara
     sequential (`action=PROCESS&banfn=...&pr_action=...&notes=...`,
     satu fetch per PR, loop `doNext(idx)`). Backend ZPO (main.htm,
     BULK_REL baris ~1092 / BULK_REJ baris ~1132, TIDAK diubah di
     sini) sudah menerima SEMUA ebeln terpilih dalam SATU request —
     baca via `DO 500 TIMES` field `po_selected_1..N` (main.htm baris
     ~1078-1087), lalu proses semuanya dalam satu LOOP ABAP dan balas
     SATU JSON `{"status":"S|E","message":"...","processed":[...]}`
     (main.htm baris ~1190-1224). Jadi `processAction()` di sini
     mengirim SATU fetch (bukan sequential per-item seperti ZPR).
   - Param bulk (dikonfirmasi langsung ke main.htm, BUKAN ditebak dari
     brief lama yang menyebut `selected`/`notes` koma — itu sudah
     digantikan kontrak `po_selected_N`, lihat zpo-data-schema.md):
       action  = 'BULK_REL' | 'BULK_REJ'   (apiPost menambahkan ini)
       plant   = curPlant
       potype  = curCategory               (variabel potype ZPO,
                                             lihat app-list.js fetchList)
       comment = alasan reject (BULK_REJ) | '' (BULK_REL)
       po_selected_1, po_selected_2, ... po_selected_N = SATU ebeln
         per key (1-based). BUKAN `selected` koma-separated.
     `apiPost(action, params)` (app-core.js) SUDAH menambahkan key
     `action` sendiri (`body.append('action', action)`) — params yang
     dioper ke sini TIDAK BOLEH punya key `action` lagi (double-add).
   - BULK_REJ backend mensyaratkan `lv_comment IS NOT INITIAL`
     (main.htm baris ~1132-1134) supaya benar-benar diproses — kalau
     kosong, backend tidak masuk cabang BULK_REJ sama sekali (PO tidak
     ter-reject meski request "berhasil" secara HTTP). Makanya
     `confirmReject()` di sini WAJIB validasi notes non-kosong SEBELUM
     kirim, modal tetap terbuka + toast error kalau kosong (jangan
     percaya label "(opsional)" di textarea index.htm — itu teks lama,
     index.htm TIDAK disentuh di task ini).
   - Refresh setelah aksi: ZPR reload list/riwayat lewat cache
     `invalidatePoData()`+`fetchList(savedEstkz)` per mode tersimpan.
     ZPO lebih sederhana — hanya ada satu view "pending" yang punya
     aksi massal (history read-only, tak ada tombol release/reject di
     sana), jadi cukup `fetchList()` (app-list.js, Task 7) yang
     memuat ulang ALL_DATA1/ALL_DATA2 + render ulang sidebar & kartu.
   ================================================================ */
'use strict';

/* ================================================================
   SHOW MODAL RELEASE
   ================================================================ */
function showModalRelease() {
  var cnt = Object.keys(selEbelns).length;
  if (cnt === 0) {
    showToast('E', 'Pilih minimal 1 PO terlebih dahulu');
    return;
  }
  var desc = document.getElementById('modalReleaseDesc');
  if (desc) desc.textContent = 'Release ' + cnt + ' PO yang dipilih?';
  openModal('modalRelease');
}

/* ================================================================
   SHOW MODAL REJECT
   ================================================================ */
function showModalReject() {
  var cnt = Object.keys(selEbelns).length;
  if (cnt === 0) {
    showToast('E', 'Pilih minimal 1 PO terlebih dahulu');
    return;
  }
  var desc = document.getElementById('modalRejectDesc');
  if (desc) desc.textContent = 'Reject & Delete ' + cnt + ' PO yang dipilih?';
  var notes = document.getElementById('rejectNotes');
  if (notes) notes.value = '';
  openModal('modalReject');
}

/* ================================================================
   CONFIRM RELEASE
   ================================================================ */
function confirmRelease() {
  var ebelns = Object.keys(selEbelns);
  if (ebelns.length === 0) return;
  closeModal('modalRelease');
  processAction(ebelns, 'BULK_REL', '');
}

/* ================================================================
   CONFIRM REJECT — validasi notes non-kosong SEBELUM menutup modal
   (backend BULK_REJ mensyaratkan comment terisi, lihat header file).
   ================================================================ */
function confirmReject() {
  var ebelns = Object.keys(selEbelns);
  if (ebelns.length === 0) return;

  var notesEl = document.getElementById('rejectNotes');
  var notes   = notesEl ? (notesEl.value || '').trim() : '';
  if (!notes) {
    showToast('E', 'Alasan reject wajib diisi');
    return;
  }

  closeModal('modalReject');
  processAction(ebelns, 'BULK_REJ', notes);
}

/* ================================================================
   LOADING OVERLAY TEXT
   ================================================================ */
function setLoadingText(txt) {
  var lo    = document.getElementById('lo');
  var loBox = lo ? lo.querySelector('.lo-box') : null;
  if (loBox) loBox.innerHTML = escHtml(txt) + '<div class="lo-spin"></div>';
}

/* ================================================================
   PROCESS ACTION — satu request bulk (bukan sequential per-item,
   lihat catatan header file). `ebelns` array nomor PO terpilih,
   `action` 'BULK_REL'|'BULK_REJ', `notes` alasan reject ('' utk
   release).
   ================================================================ */
function processAction(ebelns, action, notes) {
  var total = ebelns.length;
  var lo    = document.getElementById('lo');

  if (lo) lo.classList.add('show');
  setLoadingText('Memproses ' + total + ' PO...');

  var params = {
    plant:   curPlant,
    potype:  curCategory,
    comment: notes || ''
  };
  ebelns.forEach(function(ebeln, idx) {
    params['po_selected_' + (idx + 1)] = ebeln;
  });

  /* apiPost(action, params) (app-core.js) menambahkan key `action`
     sendiri — params di atas SENGAJA tidak punya key `action` supaya
     tidak dobel. */
  apiPost(action, params)
    .then(function(resp) {
      if (lo) lo.classList.remove('show');
      showToast(resp.status, resp.message);

      /* Reset seleksi & muat ulang daftar pending — PO yang sudah
         di-release/reject otomatis hilang dari hasil GET_LIST
         berikutnya. fetchList(true) = paksa ambil dari server (abaikan
         cache lama) + perbarui cache plant dgn data segar. */
      selEbelns = {};
      fetchList(true);
    })
    .catch(function() {
      if (lo) lo.classList.remove('show');
      showToast('E', 'Gagal memproses. Cek koneksi lalu coba lagi.');
    });
}

/* ================================================================
   INIT
   ================================================================ */
init();
