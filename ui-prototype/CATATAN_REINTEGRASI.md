# Catatan Reintegrasi — dari `ui-prototype/` kembali ke SAP

Dokumen ini menjelaskan **apa yang harus di-copy balik ke `ZPR_REL_BSP/`
setelah redesign selesai, dan apa yang WAJIB diabaikan.**

Prototype ini dibangun agar kode aplikasi **sebisa mungkin tidak disentuh**:
`app-*.js` dipakai apa adanya, dan yang membuatnya jalan tanpa SAP hanyalah dua
file tambahan (`dummy-data.js` + `mock-api.js`) yang mencegat `window.fetch`.

Selama redesign hanya menyangkut tampilan, **`style.css` adalah satu-satunya
file yang perlu di-copy balik**. Begitu ada perubahan PERILAKU, JS ikut berubah
— dan file yang berubah itu wajib ikut di-copy. Status terkini ada di tabel
bawah; selalu verifikasi ulang dengan skrip di bagian 4 sebelum transport.

---

## 1. Ringkasan: file mana ke mana

| File di `ui-prototype/` | Tujuan saat reintegrasi | Catatan |
|---|---|---|
| `style.css` | **COPY** → `ZPR_REL_BSP/MIMEs/style.css` | Hasil utama redesign. Timpa langsung. |
| `app-list.js` | **COPY** → `ZPR_REL_BSP/MIMEs/app-list.js` | **Berubah.** Aksi massal pindah ke toolbar — lihat bagian 2b. |
| `app-detail.js` | **COPY** → `ZPR_REL_BSP/MIMEs/app-detail.js` | **Berubah.** `updateFabInfo()` kini juga menyalakan grup toolbar. |
| `index.html` | **MERGE MANUAL** → `ZPR_REL_BSP/Page with FLow Logic/index.htm` | Jangan ditimpa mentah! Lihat bagian 2. |
| `app-core.js`, `app-push.js`, `app-ui.js`, `app-dashboard.js`, `app-history.js`, `app-po.js`, `app-action.js` | **JANGAN DI-COPY** | Masih identik byte-per-byte dengan produksi. |
| `dummy-data.js` | **BUANG** | Data palsu. Tidak ada padanannya di SAP. |
| `mock-api.js` | **BUANG** | Pengganti `fetch`. Di SAP harus kembali ke `main.htm` asli. |
| `logo.png`, `surabaya.png`, `semarang.png`, `background.png` | **BUANG** | Placeholder buatan. Lihat peringatan di bagian 5. |
| `DMSans.woff2`, `DMMono-Medium.woff2` | **BUANG** | Sudah ada di `MIMEs/`, identik. |
| `CATATAN_REINTEGRASI.md` | **BUANG** | File ini. |

> `app-list.js` dan `app-detail.js` **tidak mengandung ABAP apa pun** — keduanya
> murni MIME. Jadi cukup ditimpa langsung, tidak perlu merge manual seperti
> `index.htm`.

---

## 2. `index.html` → `index.htm` : yang harus dikembalikan

`index.html` adalah `index.htm` asli **dikurangi ABAP**. Kalau kamu mengubah
struktur HTML saat redesign, jangan copy seluruh file — **kembalikan dulu 6 hal
berikut**, karena semuanya hilang di prototype:

### a. Blok scriptlet ABAP di paling atas
Prototype tidak punya ini sama sekali. Kembalikan **persis** dari file asli:

```abap
<%@page language="abap"%>
<%
DATA: lv_uname2    TYPE syuname,
      lv_username2 TYPE bapibname-bapibname,
      lv_address2  TYPE bapiaddr3,
      lv_fullname2 TYPE bapiaddr3-fullname,
      lt_ret2      TYPE STANDARD TABLE OF bapiret2.

DATA: lv_ver TYPE string VALUE '20260711c'.
...
%>
```

> **Naikkan `lv_ver`** (mis. `20260711c` → `20260712a`) setiap kali `style.css`
> berubah. Kalau lupa, browser user akan menyajikan CSS lama dari cache dan
> redesign-mu **tidak akan kelihatan**.

### b. Cache-buster `?v=` di semua `<link>` dan `<script>`
Prototype memakai path polos. Asli:

```html
<link rel="stylesheet" href="style.css?v=<%=lv_ver%>">
...
<script src="app-core.js?v=<%=lv_ver%>"></script>
```

### c. Nama & avatar user (3 titik)
| Prototype (statis) | Asli (ABAP) |
|---|---|
| `<span class="hdr-avatar" aria-hidden="true">K</span>` | `<%=lv_uname2(1)%>` |
| `<span class="hdr-user-name">Budi Santoso (Dummy)</span>` | `<%=lv_fullname2%>` |
| `<div class="usermenu-name">KMI-BOD</div>` | `<%=lv_uname2%>` |

### d. Pembungkus `IF` di menu notifikasi
Di prototype tombol notifikasi **selalu** tampil. Di asli dibungkus:

```abap
<% IF lv_uname2 = 'KMI-BOD'. %>
      <button type="button" class="usermenu-item" id="notifMenuItem" ...>
<% ENDIF. %>
```

Ini bukan kosmetik — `initPush()` di `app-push.js` memakai keberadaan
`#notifMenuItem` untuk mendeteksi "user ini KMI-BOD atau bukan".

### e. Tag PWA di `<head>`
Dihapus di prototype (butuh MIMEs asli + HTTPS). Kembalikan:

```html
<link rel="manifest" href="manifest.json" crossorigin="use-credentials">
<link rel="apple-touch-icon" href="icon-192.png">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="Release PR">
```

### f. Buang 2 baris `<script>` prototype
```html
<!-- ▼▼▼ PROTOTYPE ONLY — HAPUS 2 BARIS INI SAAT REINTEGRASI ▼▼▼ -->
<script src="dummy-data.js"></script>
<script src="mock-api.js"></script>
```

> **Cara paling aman:** buka `index.htm` asli, lalu pindahkan **hanya potongan
> markup yang kamu ubah** dari `index.html`. Jangan copy seluruh file.

---

## 2b. Perubahan perilaku: aksi massal pindah ke toolbar

Ini **bukan** perubahan kosmetik, jadi diberi bagian sendiri.

**Dulu:** tombol Approve/Reject hidup di `#fab` dalam `#actionBar` (fixed di
pojok kanan bawah). Ia **selalu** tampil untuk approver selama ada baris —
termasuk saat 0 PR dipilih — dan baru menolak lewat toast *setelah* diklik.
Untuk mengeksekusi, kursor harus menyeberang dari "Pilih Semua" (kiri atas)
ke pojok kanan bawah.

**Sekarang:** grup aksi (`#selActions`) dirender **di dalam toolbar, tepat di
sebelah "Pilih Semua"**, dan hanya muncul saat ada ≥1 PR terpilih. `.toolbar`
ada di dalam `.page-sticky` yang `position:sticky`, jadi tombolnya tetap
terjangkau walau daftar di-scroll jauh ke bawah. Action bar bawah kini hanya
memuat pagination.

Yang berubah, persis:

| File | Perubahan |
|---|---|
| `app-list.js` | Di `renderList()`: blok `if (isApprover)` kini juga merender `#selActions` (berisi `#selCount` + tombol Approve/Reject). Di akhir fungsi, `#fab` **selalu** dipadamkan (`className='fab'`) dan `updateFabInfo()` dipanggil. |
| `app-detail.js` | `updateFabInfo()` kini juga meng-toggle `.show` pada `#selActions` dan mengisi `#selCount`. |
| `style.css` | Kelas baru `.sel-actions`, `.sel-actions.show`, `.sel-count`, keyframe `selActionsIn`. |

**Elemen `#fab`, `#fabInfo`, dan `#actionBar` di `index.htm` SENGAJA
DIPERTAHANKAN** dan tidak dihapus. Alasannya: `hideActionBar()` (`app-ui.js`),
`renderHistContent()` (`app-history.js`), dan `renderPoContent()` (`app-po.js`)
semuanya masih memadamkan `#fab` dengan `className='fab'`. Kalau elemennya
dihapus dari HTML, ketiga fungsi itu akan melempar `TypeError` — dan ketiganya
**tidak** ikut diubah. Jadi biarkan markup-nya; ia hanya tidak pernah menyala lagi.

Kalau nanti kamu ingin membersihkannya betul-betul, ketiga fungsi itu harus ikut
diubah untuk menjaga `null`-nya lebih dulu.

---

## 3. Aturan yang bikin JS tetap kompatibel

`style.css` bebas kamu ubah total. Tapi JS membangun HTML lewat string dan
mencari elemen lewat `id`/`class`, jadi **selama redesign jangan menghapus atau
mengganti nama hal-hal berikut** (boleh di-restyle, boleh dipindah posisinya):

**`id` yang dicari `getElementById()` — hilang = fitur mati:**
`sidebar`, `mainContent`, `actionBar`, `pagerSlot`, `fab`, `fabInfo`,
`btnToggleSb`, `btnUserMenu`, `userMenu`, `sbBackdrop`, `lo`,
`modalApprove`, `modalApproveDesc`, `modalReject`, `modalRejectDesc`,
`rejectNotes`, `modalItemText`, `itemTextMeta`, `itemTextBody`,
`notifMenuItem`, `notifMenuLabel`, `filterPanel`, `btnFilter`,
`btnSelAll`, `btnToggleExpand`, `histBtnToggleExpand`, `poBtnToggleExpand`,
`cardContainer`, `histTableWrap`, `poTableWrap`,
`searchInp`, `histSearchInp`, `poSearchInp`,
`selActions`, `selCount` (grup aksi massal di toolbar — lihat bagian 2b)

**`id` berpola (dibentuk dari nomor PR):**
`card_<banfn>`, `det_<banfn>`, `detContent_<banfn>`,
`histCard_<banfn>`, `histDet_<banfn>`, `poCard_<banfn>`, `poDet_<banfn>`,
`dashPoVal_1200`, `dashPoVal_1300`

**`class` yang di-query / di-toggle JS:**
`.po-card`, `.expanded`, `.selected`, `.removing`, `.highlight`, `.no-cb`,
`.card-cb` (+ `data-banfn`), `.card-expand`, `.fab`, `.show`, `.open`,
`.sb-mobile-open`, `.sb-collapsed`, `.hdr-user`, `.lo-box`

**Sprite SVG:** semua `<symbol id="i-...">` dipakai `svgIcon()` lewat
`<use href="#i-nama">`. Kalau ganti ikon, **ganti isi `<symbol>`-nya, jangan
ganti `id`-nya** — `id` ikon juga tertulis di `CATEGORY_DEF` (`app-core.js`).

**Breakpoint `1024px`** dipakai `isMobileView()` di `app-ui.js`
(`window.matchMedia('(max-width:1024px)')`). Kalau kamu ganti breakpoint
sidebar di CSS, **JS-nya harus ikut diganti** atau drawer mobile jadi kacau.

---

## 4. Kalau kamu terpaksa mengubah `app-*.js`

Idealnya tidak. Tapi kalau redesign butuh perubahan JS (mis. menambah elemen),
**verifikasi dulu file mana saja yang berubah** sebelum copy balik:

```powershell
# jalankan dari root repo
$a="ZPR_REL_BSP\MIMEs"; $b="ui-prototype"
Get-ChildItem $b -Filter app-*.js | ForEach-Object {
  $h1=(Get-FileHash "$a\$($_.Name)").Hash
  $h2=(Get-FileHash "$b\$($_.Name)").Hash
  "{0,-20} {1}" -f $_.Name, $(if($h1-eq$h2){'sama'}else{'BERUBAH -> perlu di-copy'})
}
```

Copy balik **hanya** yang statusnya `BERUBAH`. Jangan copy `dummy-data.js` /
`mock-api.js` apa pun yang terjadi.

---

## 5. Peringatan penting

**Garis hijau di tepi kiri kartu** dipasang lewat `.po-card::before`
(absolut), **bukan** `border-left`. Ini disengaja: `.po-card:hover`,
`.po-card.selected`, dan `.po-card.highlight` memakai shorthand `border-color`
yang menimpa keempat sisi sekaligus — kalau garisnya dibuat dengan
`border-left`, warnanya akan mati begitu kursor lewat di atas kartu. Jangan
diubah jadi `border-left` saat redesign lanjutan.

**Gambar di repo kosong (0 byte).** `logo.png`, `surabaya.png`, `semarang.png`,
dan `background.png` di `ZPR_REL_BSP/MIMEs/` **berukuran 0 byte** — file
placeholder, bukan gambar asli. Yang ada di `ui-prototype/` adalah **gambar
buatan** supaya prototype bisa dirender. **Jangan copy balik ke `MIMEs/`** —
gambar produksi yang asli hanya ada di server SAP.

**Tanggal di dummy data dibuat relatif terhadap hari ini**, bukan hardcode.
Sengaja: filter periode di History default-nya bulan berjalan
(`currentMonthYM()` di `app-ui.js`), jadi tanggal hardcode akan membuat History
tampil kosong dan terlihat seperti bug.

**`DUMMY_FAIL_BANFNS` di `mock-api.js`** membuat PR `0010000112` selalu gagal
saat di-approve — itu **disengaja**, untuk menguji toast error merah.

---

## 6. Bug di kode ASLI yang ketemu saat clone (belum diperbaiki)

Ini ada di `app-list.js` asli, **bukan** akibat prototype. Sengaja tidak
diperbaiki supaya file tetap identik dengan produksi — tapi sebaiknya
diperbaiki sekalian saat redesign.

**Sorting "Terbaru / Terlama" salah urut.** `getFiltered()` mengurutkan
`badat` sebagai **string** `"DD.MM.YYYY"`:

```js
arr.sort(function(a,b){ return (b.badat||'').localeCompare(a.badat||''); });
```

Karena string diurut dari kiri, yang dibandingkan duluan adalah **tanggal
(DD)**, bukan tahun. Akibatnya `29.06.2026` dianggap "lebih baru" daripada
`09.07.2026`. Terlihat jelas di prototype: pilih PR Maintenance Surabaya,
urutan default "Terbaru" menaruh PR bulan Juni di atas PR bulan Juli.

Perbaikannya: bandingkan sebagai `YYYYMMDD`, mis.

```js
function ymd(s){ var p=(s||'').split('.'); return p.length===3 ? p[2]+p[1]+p[0] : ''; }
// terbaru:
arr.sort(function(a,b){ return ymd(b.badat).localeCompare(ymd(a.badat)); });
```

---

## 7. Checklist singkat sebelum transport ke SAP

- [ ] `style.css` sudah di-copy ke `MIMEs/`
- [ ] `app-list.js` dan `app-detail.js` sudah di-copy ke `MIMEs/`
      (kalau lupa: grup Approve/Reject di toolbar tidak akan pernah muncul)
- [ ] Skrip cek hash di bagian 4 sudah dijalankan — tidak ada file `BERUBAH`
      yang tertinggal
- [ ] `lv_ver` di `index.htm` **sudah dinaikkan**
- [ ] Blok ABAP, `?v=<%=lv_ver%>`, `<%=lv_uname2%>`, `<%=lv_fullname2%>`,
      `IF lv_uname2 = 'KMI-BOD'`, dan tag PWA sudah kembali di `index.htm`
- [ ] `<script src="dummy-data.js">` dan `<script src="mock-api.js">`
      **sudah dihapus** dari `index.htm`
- [ ] Urutan 9 `<script src="app-*.js">` masih sama, `app-action.js` **terakhir**
      (dia yang memanggil `init()`)
- [ ] Semua `id`/`class` di bagian 3 masih ada
- [ ] Gambar 0-byte **tidak** ikut ter-copy ke `MIMEs/`
