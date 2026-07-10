/* ================================================================
   WEB PUSH NOTIFICATION (khusus KMI-BOD)
   ================================================================ */
var PUSH_SW_URL = 'sw.js';
var pushSupported =
  ('serviceWorker' in navigator) &&
  ('PushManager' in window) &&
  ('Notification' in window);

function getDeviceId(){
  var id = localStorage.getItem('push_device_id');
  if (!id){
    if (window.crypto && crypto.randomUUID){
      id = crypto.randomUUID();
    } else {
      id = 'dev-'+Date.now()+'-'+
        Math.random().toString(16).slice(2);
    }
    localStorage.setItem('push_device_id', id);
  }
  return id;
}

function urlB64ToUint8Array(base64String){
  var padding = '='.repeat((4 - base64String.length % 4) % 4);
  var base64 = (base64String + padding)
    .replace(/-/g,'+').replace(/_/g,'/');
  var raw = window.atob(base64);
  var out = new Uint8Array(raw.length);
  for (var i=0;i<raw.length;i++){ out[i]=raw.charCodeAt(i); }
  return out;
}

function setNotifLabel(txt){
  var el=document.getElementById('notifMenuLabel');
  if (el) el.innerHTML=txt;
}

/* Cek status saat load, set label tombol. */
function initPush(){
  if (!document.getElementById('notifMenuItem')) return; /* bukan KMI-BOD */
  if (!pushSupported){
    setNotifLabel('&#128277; Notifikasi tak didukung');
    return;
  }
  navigator.serviceWorker.register(PUSH_SW_URL)
    .then(function(reg){ return reg.pushManager.getSubscription(); })
    .then(function(sub){
      if (sub && Notification.permission==='granted'){
        setNotifLabel('&#128277; Matikan Notifikasi');
      } else {
        setNotifLabel('&#128276; Aktifkan Notifikasi');
      }
    })
    .catch(function(){
      setNotifLabel('&#128276; Aktifkan Notifikasi');
    });
}

/* Toggle aktif/matikan dari menu. */
function toggleNotif(){
  if (!pushSupported){
    alert('Perangkat/browser ini tidak mendukung notifikasi.');
    return;
  }
  navigator.serviceWorker.register(PUSH_SW_URL)
    .then(function(reg){
      return reg.pushManager.getSubscription()
        .then(function(sub){
          if (sub && Notification.permission==='granted'){
            return disableNotif(sub);
          }
          return enableNotif(reg);
        });
    })
    .catch(function(e){
      alert('Gagal memproses notifikasi: '+e);
    });
}

function enableNotif(reg){
  return Notification.requestPermission().then(function(perm){
    if (perm!=='granted'){
      alert('Izin notifikasi ditolak. Aktifkan lewat setelan browser.');
      return;
    }
    return fetch(API_URL+'?action=GET_VAPID_KEY')
      .then(function(r){return r.json();})
      .then(function(res){
        if (!res.vapid_public) throw 'VAPID key kosong';
        return reg.pushManager.subscribe({
          userVisibleOnly:true,
          applicationServerKey:urlB64ToUint8Array(res.vapid_public)
        });
      })
      .then(function(sub){
        var j=sub.toJSON();
        var body=
          'action=SAVE_SUB'+
          '&device_id='+encodeURIComponent(getDeviceId())+
          '&endpoint='+encodeURIComponent(sub.endpoint)+
          '&p256dh='+encodeURIComponent(j.keys.p256dh)+
          '&auth='+encodeURIComponent(j.keys.auth);
        return fetch(API_URL,postOpts(body))
          .then(function(r){return r.json();});
      })
      .then(function(res){
        if (res && res.status==='S'){
          setNotifLabel('&#128277; Matikan Notifikasi');
          alert('Notifikasi aktif di perangkat ini.');
        } else {
          alert('Gagal menyimpan: '+((res&&res.message)||'unknown'));
        }
      });
  });
}

function disableNotif(sub){
  var devId=getDeviceId();
  return sub.unsubscribe().then(function(){
    var body='action=DELETE_SUB&device_id='+
      encodeURIComponent(devId);
    return fetch(API_URL,postOpts(body))
      .then(function(r){return r.json();});
  }).then(function(){
    setNotifLabel('&#128276; Aktifkan Notifikasi');
    alert('Notifikasi dimatikan di perangkat ini.');
  });
}

/* ================================================================
   DEEP-LINK DARI NOTIFIKASI
   URL: index.htm?banfn=<PR>&werks=<plant>&bsart=<doc type>
   Dikirim report ZPUSH_PR_NOTIF, dibuka lewat sw.js saat notif diklik.
   ================================================================ */
var deepLink = null;

/* Bandingkan nomor PR tanpa memedulikan leading zero. */
function sameBanfn(a,b){
  return String(a).replace(/^0+/,'') ===
         String(b).replace(/^0+/,'');
}

function indexOfBanfn(arr,banfn){
  for (var i=0;i<arr.length;i++){
    if (sameBanfn(arr[i].banfn,banfn)) return i;
  }
  return -1;
}

function readDeepLink(){
  var q=location.search;
  if (!q || q.indexOf('banfn=')===-1) return;

  var p={};
  q.replace(/^\?/,'').split('&').forEach(function(kv){
    var i=kv.indexOf('=');
    if (i>0){
      p[decodeURIComponent(kv.slice(0,i))]=
        decodeURIComponent(kv.slice(i+1));
    }
  });
  if (!p.banfn) return;

  deepLink={
    banfn:p.banfn,
    werks:(p.werks||'').replace(/\s+$/,''),
    bsart:(p.bsart||'').replace(/\s+$/,'')
  };

  /* Buang query agar refresh tidak mengulang deep-link. */
  if (window.history && history.replaceState){
    history.replaceState(null,'',location.pathname);
  }
}

/* Sidebar hanya punya 2 plant induk; sisanya anak grup. */
function deepLinkGroup(werks){
  if (werks==='1300' || werks==='3000') return '1300';
  return '1200';
}

/* Cari kategori (MTN/RND/SVC) yang memuat bsart PR ini. Bila doc type
   tidak terdaftar di plant tsb, jatuh ke 'ALL' (tanpa filter bsart)
   supaya PR-nya tetap ketemu, bukan ke kategori yang salah. */
function deepLinkCategory(group,bsart){
  var list=CATEGORY_DEF[group]||[];
  for (var i=0;i<list.length;i++){
    var codes=list[i].bsart.split(',');
    for (var j=0;j<codes.length;j++){
      if (codes[j]===bsart) return list[i].code;
    }
  }
  return 'ALL';
}

/* Dipanggil setelah sidebar siap: buka view yang memuat PR tsb. */
function openDeepLinkView(){
  if (!deepLink) return;
  var group=deepLinkGroup(deepLink.werks);
  var cat  =deepLinkCategory(group,deepLink.bsart);
  if (!cat){ deepLink=null; return; }

  openSections[group]=true;
  switchView(getEffectiveWerks(group),cat,'pending');
}

/* Dipanggil di akhir renderList(): expand + scroll ke kartu PR. */
function applyDeepLink(){
  var target=deepLink;
  deepLink=null;                    /* sekali pakai */

  var idx=indexOfBanfn(filteredData,target.banfn);
  if (idx<0){
    alert('PR '+target.banfn.replace(/^0+/,'')+
          ' sudah tidak ada di daftar pending.');
    return;
  }

  var banfn=filteredData[idx].banfn;
  var card =document.getElementById('card_'+banfn);
  if (!card) return;

  if (!card.classList.contains('expanded')){
    card.classList.add('expanded');
    loadDetail(banfn);
  }
  card.scrollIntoView({behavior:'smooth',block:'center'});
  card.style.boxShadow='0 0 0 3px var(--brand,#0a4d8c)';
  setTimeout(function(){ card.style.boxShadow=''; },2500);
}

