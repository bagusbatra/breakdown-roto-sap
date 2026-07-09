REPORT zpush_pr_notif.

*&---------------------------------------------------------------------*
*& ZPUSH_PR_NOTIF
*& Job berkala (SM36) yang mengecek PR pending release di EBAN, lalu
*& mengirim push notification ke semua device KMI-BOD yang subscribe.
*&
*& Sumber device : ZPUSH_LOG baris REC_TYPE = 'D'
*& Dedup per PR  : ZPUSH_LOG baris REC_TYPE = 'P'
*& Kurir         : server Debian (web-push) via HTTP POST /kirim-notif
*&
*& Idempotensi: PR yang sudah pernah dinotif ditandai baris REC_TYPE='P',
*& sehingga tidak dikirim ulang tiap job jalan. Penanda ditulis + COMMIT
*& WORK segera setelah kirim, supaya job yang dump di tengah loop tidak
*& menyebabkan notifikasi dobel pada run berikutnya.
*&
*& PR yang GAGAL kirim ke semua device sengaja TIDAK ditandai 'P', agar
*& dicoba lagi pada run berikutnya (mis. server Debian sedang mati).
*&
*& CATATAN: interval job diatur di SM36, BUKAN di kode ini.
*&---------------------------------------------------------------------*

*----------------------------------------------------------------------*
* KONFIGURASI
*----------------------------------------------------------------------*
CONSTANTS:
  " Alamat server Debian yang DAPAT DIJANGKAU dari SAP (backend->backend).
  " Boleh HTTP internal (mis. IP:port 3002).
  gc_push_url     TYPE string
    VALUE 'http://192.168.254.167:3002/kirim-notif',

  " Harus SAMA PERSIS dengan PUSH_SECRET di .env server Debian.
  gc_push_secret  TYPE string
    VALUE 'a6df29a9d9f981ceb8d76982e1b0860d88b67297fc5ccf265804a2f027953827',

  " URL yang dibuka saat notif diklik (detail PR di BSP, via domain HTTPS).
  gc_click_base   TYPE string
    VALUE 'https://approval-pr.kayumebel.net/sap(bD1lbiZjPTMwMA==)/bc/bsp/sap/zpr_rel_bsp/index.htm?banfn=',

  " Timeout tiap HTTP call ke Debian (detik). Cegah job menggantung lama
  " bila server push mati / tidak merespons.
  gc_http_timeout TYPE i VALUE 15,

  " Maksimum PR yang dinotif dalam SATU run. Sisanya diproses run
  " berikutnya. Mencegah banjir notifikasi bila tiba-tiba ada backlog
  " besar. Naikkan bila perlu.
  gc_max_per_run  TYPE i VALUE 50,

  " Berapa kali kegagalan koneksi beruntun sebelum job menyerah.
  " Tanpa ini, Debian mati = ratusan HTTP call sia-sia tiap run.
  gc_max_conn_err TYPE i VALUE 5.

*----------------------------------------------------------------------*
* TYPES
*----------------------------------------------------------------------*
TYPES: BEGIN OF ty_pending,
         banfn TYPE eban-banfn,
         bnfpo TYPE eban-bnfpo,
         txz01 TYPE eban-txz01,
         werks TYPE eban-werks,
         bsart TYPE eban-bsart,
       END OF ty_pending.

TYPES: BEGIN OF ty_dev,
         device_id     TYPE zpush_log-device_id,
         sub_endpoint  TYPE zpush_log-sub_endpoint,
         sub_endpoint2 TYPE zpush_log-sub_endpoint2,
         sub_p256dh    TYPE zpush_log-sub_p256dh,
         sub_auth      TYPE zpush_log-sub_auth,
       END OF ty_dev.

*----------------------------------------------------------------------*
* DATA
*----------------------------------------------------------------------*
DATA: lt_pending  TYPE STANDARD TABLE OF ty_pending,
      ls_pending  TYPE ty_pending,
      lt_dev      TYPE STANDARD TABLE OF ty_dev,
      ls_dev      TYPE ty_dev,
      lv_exist    TYPE zpush_log-banfn,
      lv_any_ok   TYPE abap_bool,
      lv_code     TYPE i,
      lv_tabix    TYPE sy-tabix,
      ls_sent     TYPE zpush_log,
      lv_abort    TYPE abap_bool,
      lv_conn_err TYPE i,
      lv_c_new    TYPE i,
      lv_c_skip   TYPE i,
      lv_c_nodev  TYPE i,
      lv_c_fail   TYPE i,
      lv_c_left   TYPE i.

*----------------------------------------------------------------------*
* 1. AMBIL SEMUA PR PENDING (kriteria sama dgn GET_LIST di main.htm)
*    WERKS + BSART ikut diambil untuk membangun URL deep-link notif.
*----------------------------------------------------------------------*
SELECT banfn bnfpo txz01 werks bsart
  FROM eban
  INTO TABLE lt_pending
  WHERE frgkz = 'X'
    AND frgzu = ' '
    AND loekz = ' '.

" Sort by banfn+bnfpo -> item pertama tiap PR yang dipakai sbg wakil.
SORT lt_pending BY banfn bnfpo.
DELETE ADJACENT DUPLICATES FROM lt_pending COMPARING banfn.

IF lt_pending IS INITIAL.
  WRITE: / 'Tidak ada PR pending. Job selesai tanpa aksi.'.
  RETURN.
ENDIF.

*----------------------------------------------------------------------*
* 2. AMBIL SEMUA DEVICE KMI-BOD SEKALI (REC_TYPE='D')
*----------------------------------------------------------------------*
SELECT device_id sub_endpoint sub_endpoint2 sub_p256dh sub_auth
  FROM zpush_log
  INTO TABLE lt_dev
  WHERE rec_type = 'D'
    AND sub_endpoint <> space.

*----------------------------------------------------------------------*
* 3. LOOP PR: skip yang sudah dinotif (REC_TYPE='P'), kirim yang baru
*----------------------------------------------------------------------*
CLEAR: lv_c_new, lv_c_skip, lv_c_nodev, lv_c_fail, lv_c_left,
       lv_abort, lv_conn_err.

LOOP AT lt_pending INTO ls_pending.

  " ---- Batas kirim per run tercapai -> sisanya run berikutnya ----
  IF lv_c_new >= gc_max_per_run.
    lv_c_left = lv_c_left + 1.
    CONTINUE.
  ENDIF.

  " ---- Server push tidak bisa dihubungi -> hentikan job ----
  IF lv_abort = abap_true.
    lv_c_left = lv_c_left + 1.
    CONTINUE.
  ENDIF.

  " ---- Sudah pernah dinotif? ----
  CLEAR lv_exist.
  SELECT SINGLE banfn
    FROM zpush_log
    INTO lv_exist
    WHERE rec_type = 'P'
      AND banfn    = ls_pending-banfn.
  IF sy-subrc = 0.
    lv_c_skip = lv_c_skip + 1.
    CONTINUE.
  ENDIF.

  " ---- Siapkan penanda "sudah diproses" (REC_TYPE='P') ----
  CLEAR ls_sent.
  ls_sent-rec_type = 'P'.
  ls_sent-banfn    = ls_pending-banfn.
  CLEAR ls_sent-device_id.
  GET TIME STAMP FIELD ls_sent-sent_at.

  " ---- Tidak ada device subscribe sama sekali ----
  " Tetap ditandai 'P' supaya PR lama tidak membanjiri device yang
  " subscribe di kemudian hari.
  IF lt_dev IS INITIAL.
    ls_sent-sent_stat = 'N'.
    ls_sent-sent_msg  = 'Tidak ada device subscribe'.
    MODIFY zpush_log FROM ls_sent.
    COMMIT WORK.
    lv_c_nodev = lv_c_nodev + 1.
    CONTINUE.
  ENDIF.

  " ---- Kirim ke tiap device ----
  CLEAR lv_any_ok.
  LOOP AT lt_dev INTO ls_dev.
    lv_tabix = sy-tabix.
    CLEAR lv_code.

    PERFORM send_push USING ls_pending
                            ls_dev
                   CHANGING lv_code.

    IF lv_code = 200.
      lv_any_ok = abap_true.
      CLEAR lv_conn_err.

    ELSEIF lv_code = 410.
      " Subscription mati (device uninstall/expired) -> hapus device.
      CLEAR lv_conn_err.
      DELETE FROM zpush_log
        WHERE rec_type  = 'D'
          AND device_id = ls_dev-device_id.
      COMMIT WORK.
      " Tandai baris in-memory supaya tidak dikirimi lagi di PR berikutnya.
      CLEAR ls_dev-sub_endpoint.
      MODIFY lt_dev FROM ls_dev INDEX lv_tabix.

    ELSEIF lv_code = 0.
      " 0 = gagal membangun/menyelesaikan koneksi (bukan jawaban server).
      lv_conn_err = lv_conn_err + 1.
      IF lv_conn_err >= gc_max_conn_err.
        lv_abort = abap_true.
        EXIT.
      ENDIF.

    ELSE.
      " 401 (secret salah) / 500 (VAPID salah) / lainnya.
      CLEAR lv_conn_err.
    ENDIF.
  ENDLOOP.

  " Buang device mati dari daftar in-memory.
  DELETE lt_dev WHERE sub_endpoint = space.

  IF lv_abort = abap_true.
    lv_c_left = lv_c_left + 1.
    CONTINUE.
  ENDIF.

  " ---- Semua device baru saja terhapus (410) -> perlakukan spt no-device --
  IF lt_dev IS INITIAL AND lv_any_ok = abap_false.
    ls_sent-sent_stat = 'N'.
    ls_sent-sent_msg  = 'Semua device kedaluwarsa (410)'.
    MODIFY zpush_log FROM ls_sent.
    COMMIT WORK.
    lv_c_nodev = lv_c_nodev + 1.
    CONTINUE.
  ENDIF.

  " ---- Gagal ke semua device -> JANGAN tandai 'P', coba lagi run depan --
  IF lv_any_ok = abap_false.
    lv_c_fail = lv_c_fail + 1.
    CONTINUE.
  ENDIF.

  " ---- Sukses -> tandai 'P' dan commit segera ----
  ls_sent-sent_stat = 'S'.
  ls_sent-sent_msg  = 'Terkirim ke minimal 1 device'.
  MODIFY zpush_log FROM ls_sent.
  COMMIT WORK.
  lv_c_new = lv_c_new + 1.

ENDLOOP.

*----------------------------------------------------------------------*
* 4. RINGKASAN (masuk spool job SM37)
*----------------------------------------------------------------------*
WRITE: / 'Job selesai.'.
WRITE: / 'PR baru dinotif      :', lv_c_new.
WRITE: / 'PR di-skip (sudah)   :', lv_c_skip.
WRITE: / 'PR tanpa device      :', lv_c_nodev.
WRITE: / 'PR gagal kirim       :', lv_c_fail, '(akan dicoba lagi)'.
WRITE: / 'PR ditunda ke run brk:', lv_c_left.

IF lv_abort = abap_true.
  WRITE: / 'PERINGATAN: server push tidak dapat dihubungi.',
           'Job dihentikan lebih awal. Cek pm2 & jaringan.'.
ENDIF.


*&---------------------------------------------------------------------*
*&      Form  SEND_PUSH
*&  Kirim 1 push ke 1 device via HTTP POST ke server Debian.
*&  CHANGING pv_code = HTTP status:
*&    200 = ok, 410 = subscription mati, 401/500 = konfigurasi salah,
*&    0   = koneksi gagal (server mati / firewall / timeout).
*&---------------------------------------------------------------------*
FORM send_push USING    ps_pr  TYPE ty_pending
                        ps_dev TYPE ty_dev
               CHANGING pv_code TYPE i.

  DATA: lo_client   TYPE REF TO if_http_client,
        lv_json     TYPE string,
        lv_endpoint TYPE string,
        lv_title    TYPE string,
        lv_body     TYPE string,
        lv_url      TYPE string,
        lv_txz01_e  TYPE string,
        lv_banfn_c  TYPE string.

  pv_code = 0.

  " Gabung endpoint dari 2 kolom (CONCATENATE membuang trailing spaces).
  CONCATENATE ps_dev-sub_endpoint ps_dev-sub_endpoint2 INTO lv_endpoint.

  " Escape sederhana untuk teks yang masuk JSON.
  lv_txz01_e = ps_pr-txz01.
  REPLACE ALL OCCURRENCES OF '\' IN lv_txz01_e WITH '\\'.
  REPLACE ALL OCCURRENCES OF '"' IN lv_txz01_e WITH '\"'.

  " Nomor PR tanpa leading zero untuk tampilan.
  lv_banfn_c = ps_pr-banfn.
  SHIFT lv_banfn_c LEFT DELETING LEADING '0'.

  lv_title = 'PR Baru Menunggu Approval'.
  CONCATENATE 'PR' lv_banfn_c '-' lv_txz01_e
    INTO lv_body SEPARATED BY space.

  " URL deep-link: banfn + werks + bsart supaya index.htm bisa langsung
  " membuka view yang benar dan meng-expand kartu PR-nya.
  CONCATENATE gc_click_base ps_pr-banfn
              '&werks=' ps_pr-werks
              '&bsart=' ps_pr-bsart
    INTO lv_url.

  CONCATENATE
    '{'
      '"endpoint":"' lv_endpoint       '",'
      '"p256dh":"'   ps_dev-sub_p256dh '",'
      '"auth":"'     ps_dev-sub_auth   '",'
      '"title":"'    lv_title          '",'
      '"body":"'     lv_body           '",'
      '"url":"'      lv_url            '"'
    '}'
    INTO lv_json.

  " ---- HTTP POST ke server Debian ----
  cl_http_client=>create_by_url(
    EXPORTING
      url                = gc_push_url
    IMPORTING
      client             = lo_client
    EXCEPTIONS
      argument_not_found = 1
      plugin_not_active  = 2
      internal_error     = 3
      OTHERS             = 4 ).
  IF sy-subrc <> 0.
    RETURN.
  ENDIF.

  " Jangan pernah munculkan popup logon di background job.
  lo_client->propertytype_logon_popup = if_http_client=>co_disabled.

  lo_client->request->set_method( 'POST' ).
  lo_client->request->set_content_type( 'application/json; charset=utf-8' ).
  lo_client->request->set_header_field(
    name  = 'X-Push-Secret'
    value = gc_push_secret ).
  lo_client->request->set_cdata( lv_json ).

  CALL METHOD lo_client->send
    EXPORTING
      timeout                    = gc_http_timeout
    EXCEPTIONS
      http_communication_failure = 1
      http_invalid_state         = 2
      http_processing_failed     = 3
      OTHERS                     = 4.
  IF sy-subrc <> 0.
    lo_client->close( ).
    RETURN.
  ENDIF.

  lo_client->receive(
    EXCEPTIONS
      http_communication_failure = 1
      http_invalid_state         = 2
      http_processing_failed     = 3
      OTHERS                     = 4 ).
  IF sy-subrc <> 0.
    lo_client->close( ).
    RETURN.
  ENDIF.

  lo_client->response->get_status( IMPORTING code = pv_code ).
  lo_client->close( ).

ENDFORM.
