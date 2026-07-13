# Rencana: Tombol Download PDF

Status: **spec, belum dikerjakan**
Tanggal: 13 Juli 2026
Aplikasi: `ZPR_REL_BSP` (Release Purchasing Requisition)

---

## 1. Tujuan

Menambahkan tombol **Download PDF** di empat halaman:

1. **PR Pending** (daftar PR menunggu approval)
2. **Belum PO** (PR sudah di-approve, belum jadi PO)
3. **History Approve**
4. **History Reject**

PDF berisi ringkasan per PR **beserta tabel itemnya**, dan isinya **persis sama
dengan yang sedang tampil di layar** — mengikuti filter yang aktif.

---

## 2. Keputusan yang sudah diambil

| # | Keputusan | Alasan |
|---|---|---|
| K1 | PDF dibuat lewat **`window.print()` + `@media print`**, bukan jsPDF | Nol dependensi, nol KB tambahan, jalan tanpa internet. Lihat §3. |
| K2 | **`main.htm` TIDAK disentuh.** Nol perubahan ABAP. | Semua data yang dibutuhkan sudah ada di browser. Lihat §4. |
| K3 | Isi PDF = **ringkasan per PR + tabel item** | Diminta. Item untuk History & Belum PO sudah tersedia gratis; hanya PR Pending yang butuh panggilan tambahan. Lihat §7.1. |
| K4 | **PDF = apa yang kamu lihat** — mengikuti seluruh filter layar | Kalau tercetak beda dari yang dilihat, itu sumber kebingungan klasik. |
| K5 | PDF memuat **SELURUH baris hasil filter**, bukan hanya halaman aktif | Pagination itu urusan layar, bukan urusan laporan. |
| K6 | Aturan periode **berbeda per halaman** | Lihat §5 — ini keputusan paling penting di dokumen ini. |

### Yang sempat dipertimbangkan lalu DIBATALKAN

> **Rencana awal:** keempat halaman dipotong "sejak tanggal 1 bulan berjalan".
>
> **Dibatalkan**, karena untuk **Belum PO** aturan itu **berbahaya**: halaman
> tersebut ADA justru untuk menyorot PR yang menua. PR "tertua 30 hari" itu
> di-approve **bulan lalu**, jadi ia akan lenyap dari PDF — laporannya akan
> menyembunyikan persis kasus terburuk yang ingin dipantau.
>
> Hal serupa berlaku untuk **PR Pending**: PR yang sudah menunggu sejak Juni
> justru yang paling mendesak, tapi akan hilang dari PDF Juli.
>
> Aturan "sejak tanggal 1" **tetap dipakai untuk History** — di sana ia memang
> cocok, dan memang sudah begitu perilakunya sekarang.

---

## 3. Kenapa `window.print()`, bukan jsPDF atau ABAP

| Pendekatan | Biaya | Putusan |
|---|---|---|
| **`window.print()` + `@media print`** | 0 KB | **DIPILIH** |
| jsPDF di-self-host | +~300 KB di MIMEs (dari 261 KB jadi ~560 KB); font DM Sans harus dikonversi ke format vfs jsPDF atau menyerah ke Helvetica; library di-maintain manual tanpa npm | Ditolak |
| Generate PDF di ABAP (SmartForms / `CONVERT_OTF`) | Objek SAP baru + `main.htm` berubah | Ditolak — melanggar K2 |

Aplikasi ini **tanpa build tool, tanpa CDN, dan berjalan di jaringan internal
tanpa akses internet** (itu sebabnya font pun di-self-host di MIMEs). Menambah
library 300 KB yang harus dirawat manual adalah beban yang tidak sepadan untuk
sebuah tombol cetak.

**Konsekuensi yang harus diterima:** user menekan tombol → dialog cetak Chrome
terbuka → user memilih **Destination: Save as PDF** → Save. Ada **satu langkah
ekstra** dibanding unduhan langsung. Ini trade-off yang disadari.

---

## 4. Yang TIDAK berubah

- **`main.htm` — nol perubahan.** Tidak ada action baru, tidak ada parameter baru.
- **Tidak ada ABAP yang disentuh.**

Ini mungkin karena **seluruh data yang dibutuhkan sudah ada di browser**:

| Halaman | Data sudah ada? |
|---|---|
| PR Pending | `allData` (dari `GET_LIST`) — **header saja**, item perlu `GET_DETAIL` |
| Belum PO | `poData` (dari `GET_APP_PO`) — **sudah per-item**, tinggal dikelompokkan |
| History Approve | `histData` (dari `GET_HIST_APP`) — **sudah per-item** |
| History Reject | `histData` (dari `GET_HIST_REJ`) — **sudah per-item** |

Perlu dicatat: `main.htm` **tidak menerima parameter tanggal sama sekali**.
Seluruh filter periode yang ada sekarang dikerjakan di browser. Jadi PDF pun
tidak butuh dukungan backend apa pun.

Satu-satunya panggilan tambahan adalah `GET_DETAIL` untuk PR Pending — **action
yang sudah ada**, dipakai apa adanya.

---

## 5. Aturan periode per halaman

Inilah bagian yang paling mudah salah. Baca dua kali.

| Halaman | Batas periode | Difilter berdasarkan | Alasan |
|---|---|---|---|
| **PR Pending** | **TIDAK ADA** | — | Semua PR yang masih pending ikut, tak peduli kapan dibuat. PR yang menunggu sejak bulan lalu justru yang paling mendesak — ia **tidak boleh** hilang dari laporan. |
| **Belum PO** | **TIDAK ADA** | — | Semua PR yang masih `po_status = OPEN` ikut, tak peduli kapan di-approve. Halaman ini ada untuk menyorot yang menua; memotongnya akan menyembunyikan yang mangkrak paling lama. |
| **History Approve** | Bulan yang dipilih di dropdown Periode | `app_at` | Sudah jadi perilaku aplikasi sekarang (`histDateFilter`). Tanggal 1 s/d akhir bulan tersebut. |
| **History Reject** | Bulan yang dipilih di dropdown Periode | `del_at` | Sama, berdasarkan `del_at`. |

> Untuk History, "bulan tersebut" berarti **bulan yang sedang dipilih user di
> dropdown**, bukan selalu bulan berjalan. Dropdown-nya menawarkan 3 bulan
> terakhir (lihat `getHistMonthOptions()` di `app-ui.js`). Kalau user memilih
> "Jun 2026", PDF-nya berisi Juni — bukan Juli. Ini konsisten dengan K4
> (PDF = apa yang kamu lihat).

---

## 6. Isi & tata letak PDF

### 6.1 Kepala dokumen (halaman pertama)

```
[logo]  PT. Kayu Mebel Indonesia
        Release Purchasing Requisition

        DAFTAR PR MENUNGGU APPROVAL
        Surabaya · PR Maintenance

        Filter aktif : Plant 2000 · MRP saja · cari "bearing"
        Periode      : (tanpa batas periode)
        Jumlah       : 9 PR
        Dicetak      : 13.07.2026 14:22 oleh KMI-BOD
```

Baris **Filter aktif** wajib ada. Tanpa itu, pembaca laporan tidak tahu bahwa
yang di tangannya bukan data lengkap. Kalau tidak ada filter aktif, tulis
`(tanpa filter)`.

### 6.2 Blok per PR

```
0010000107   BEARING SKF 6308                      10.500.000 IDR
2000 Surabaya · PR Maintenance · MRP · Dewi Lestari · Tgl PR 29.06.2026

  Item  Material      Deskripsi              Jumlah  Satuan   Harga/Unit        Total
  ────  ────────────  ─────────────────────  ──────  ──────  ───────────  ───────────
  00010 10004530      BEARING SKF 6308 2Z C3      20      PC      245.000    4.900.000
  00020 10004531      SEAL OIL TC 45X62X8         30      PC       45.000    1.350.000
```

Kolom yang ditampilkan menyesuaikan halamannya:

| Halaman | Kolom item |
|---|---|
| PR Pending | Item, Material, Deskripsi, Jumlah, Satuan, Harga/Unit, Total, Mata Uang, Tgl Butuh |
| Belum PO | Item, Deskripsi, Qty, Satuan, **Status PO, No. PO, Vendor, Umur** |
| History Approve | Item, Deskripsi, Jumlah, Satuan, Harga, Total, Mata Uang, Grup Pemb. |
| History Reject | sama seperti Approve, **+ blok "Alasan" di bawah header PR** |

Untuk History & Belum PO, kolom-kolom ini **persis sama** dengan tabel yang sudah
dirender `buildHistCards()` / `buildPoCards()` — jangan mengarang kolom baru.

### 6.3 Kaki dokumen

```
──────────────────────────────────────────────────────────────
TOTAL   IDR   39.500.000        Halaman 1 dari 3
        USD        2.900
```

**Total dijumlahkan PER MATA UANG, tidak pernah lintas mata uang.** Aplikasi ini
sudah punya PR multi-currency (lihat `renderCardAmount()` di `app-core.js` yang
sengaja menumpuk per currency). Menjumlahkan IDR + USD jadi satu angka adalah
bug yang akan lolos diam-diam sampai ada yang menyadarinya berbulan-bulan kemudian.

---

## 7. Arsitektur

### 7.1 File baru

**`MIMEs/app-print.js`** — seluruh logika cetak hidup di sini.

```
buildPrintButton()          -> potongan HTML tombol, dipanggil dari toolbar
onPrintClick()              -> entry point; menentukan view aktif dari curMode
printPending()              -> ambil detail item, lalu cetak
printPo()                   -> cetak dari poData
printHist()                 -> cetak dari histData
buildPrintDoc(opts)         -> merangkai <div id="printDoc">
doPrint(title)              -> set document.title, window.print(), cleanup
```

### 7.2 File yang diubah

| File | Perubahan |
|---|---|
| `MIMEs/style.css` | Blok `@media print` baru (§8) |
| `MIMEs/app-list.js` | Sisipkan `buildPrintButton()` di toolbar `renderList()` |
| `MIMEs/app-history.js` | Sisipkan `buildPrintButton()` di toolbar `renderHistContent()` |
| `MIMEs/app-po.js` | Sisipkan `buildPrintButton()` di toolbar `renderPoContent()` |
| `Page with FLow Logic/index.htm` | Daftarkan `<script src="app-print.js?v=<%=lv_ver%>">` **+ naikkan `lv_ver`** |

> `app-print.js` boleh dimuat di mana saja **sebelum `app-action.js`**, karena ia
> hanya mendefinisikan fungsi (tidak memasang observer seperti `app-reveal.js`).
> Taruh saja tepat sebelum `app-reveal.js`.

### 7.3 Kenapa membangun DOM cetak terpisah, bukan mencetak layar apa adanya

Menjadikan `@media print` bekerja langsung di atas DOM layar **tidak akan cukup**:

- Layar hanya memuat **kartu halaman aktif** (pagination). PDF butuh semua.
- `.card-detail` **tersembunyi** kecuali kartunya di-expand, dan untuk PR Pending
  isinya bahkan **belum dimuat** (`loadDetail()` bersifat lazy).
- Kartu layar penuh dengan chrome yang tak relevan di kertas: checkbox, tombol
  "Lihat Teks", chevron expand.

Jadi: bangun `<div id="printDoc">` sendiri, isi, cetak, lalu buang.

### 7.4 Alur

```
klik "Download PDF"
   |
   +-- curMode === 'pending'
   |      ambil daftar terfilter  : getFiltered()          (app-list.js)
   |      tampilkan overlay #lo   : "Menyiapkan PDF 3/12..."
   |      untuk tiap PR: fetch GET_DETAIL&banfn=...        (action LAMA)
   |      -> tunggu semua selesai
   |
   +-- curMode === 'po'
   |      ambil daftar terfilter  : groupPo(getFilteredPo())  (app-po.js)
   |      item sudah ada. tanpa fetch.
   |
   +-- curMode === 'hist_app' | 'hist_rej'
          ambil daftar terfilter  : groupHistByBanfn(getFilteredHist())
          item sudah ada. tanpa fetch.
   |
   v
buildPrintDoc()  -> <div id="printDoc"> ditempel ke <body>
   |
   v
document.title = "PR-Pending_Surabaya_MTN_2026-07"   <-- lihat §9.1
window.print()
   |
   v
window.onafterprint -> hapus #printDoc, kembalikan document.title
```

Keempat fungsi filter (`getFiltered`, `getFilteredPo`, `groupPo`,
`getFilteredHist`, `groupHistByBanfn`) **sudah ada sebagai global** dan dipakai
apa adanya. Itulah yang membuat K4 (PDF = apa yang kamu lihat) hampir gratis:
kita memakai fungsi yang sama persis dengan yang merender layar.

> **Catatan soal `curMode`.** Nilainya bisa `''` (dashboard), `'pending'`,
> `'hist_app'`, `'hist_rej'`, atau `'po'`. Yang `'po'` di-set di `openPoView()`
> (`app-po.js:75`), sedangkan tiga lainnya di-set `switchView()` lewat parameter
> `mode`. Saat ini **belum ada satu pun kode yang membandingkan
> `curMode === 'po'`** — belum pernah ada yang perlu membedakannya. Dispatch di
> atas adalah pemakaian pertamanya, dan itu sah.

---

## 8. Blok `@media print`

```css
@media print {
  /* Sembunyikan seluruh aplikasi. */
  .hdr, .sidebar, .sb-backdrop, .main,
  .actionbar, .modal, #lo, .toast { display: none !important; }

  /* Hanya dokumen cetak yang tampil. */
  #printDoc { display: block !important; }

  /* Kaca & bayangan tidak ada artinya di kertas. */
  * { backdrop-filter: none !important; box-shadow: none !important; }

  /* Jangan potong satu PR jadi dua halaman. */
  .pr-block { break-inside: avoid; page-break-inside: avoid; }

  /* Kepala tabel diulang di tiap halaman. */
  thead { display: table-header-group; }

  @page { size: A4 portrait; margin: 14mm 12mm; }
}

/* Di layar, dokumen cetak tidak boleh terlihat. */
#printDoc { display: none; }
```

**Belum PO** kolomnya lebih banyak — pertimbangkan `size: A4 landscape` khusus
halaman itu (`@page` bisa di-scope lewat named page, atau lebih sederhana:
perkecil font).

---

## 9. Masalah yang sudah diketahui

### 9.1 Nama file PDF diambil dari `document.title`

Chrome menamai file hasil "Save as PDF" berdasarkan **`document.title`**, bukan
dari parameter apa pun. Judul aplikasi sekarang adalah
`"Release Purchasing Requisition - PT. Kayu Mebel Indonesia"` — kalau dibiarkan,
semua PDF akan bernama itu, apa pun isinya.

**Solusi:** ganti `document.title` tepat sebelum `window.print()`, kembalikan di
`onafterprint`.

Konvensi nama yang disarankan:

```
PR-Pending_Surabaya_PR-Maintenance_2026-07-13
Belum-PO_Semarang_2026-07-13
History-Approve_Surabaya_2026-07
History-Reject_Surabaya_2026-07
```

### 9.2 Chrome tidak mencetak warna latar secara default

Latar berwarna (badge, chip) **tidak akan tercetak** kecuali user mencentang
"Background graphics" di dialog cetak. Jangan bergantung padanya.

**Solusi:** rancang tata letak cetak yang **tidak bergantung pada warna latar** —
pakai teks, garis, dan tebal-tipis huruf. Kalaupun warna dipakai (misal merah
untuk umur ≥14 hari), pakai **warna teks**, bukan warna latar. Warna teks tetap
tercetak.

### 9.3 PR Pending butuh N panggilan `GET_DETAIL`

12 PR = 12 panggilan berurutan. Perlu overlay progres (`#lo` + `setLoadingText()`
sudah ada, dipakai `processAction()` di `app-action.js` — tiru polanya).

Kalau daftarnya panjang (page size "Semua", bisa 50+ PR), ini terasa lambat.
**Batasi**: kalau hasil filter > 100 PR, tolak dengan toast
`"Terlalu banyak PR (150). Persempit filter dulu."` — daripada menggantung browser.

### 9.4 Multi-currency

Sudah dibahas di §6.3. **Jangan pernah menjumlahkan lintas mata uang.**

### 9.5 Animasi reveal

`app-reveal.js` memakai Web Animations API. Ia hanya menyentuh elemen di dalam
`#mainContent`, dan `#printDoc` ada di luar itu — jadi **tidak akan bentrok**.
Tetap perlu diuji.

### 9.6 `window.print()` memblokir

Di sebagian browser `window.print()` menghentikan eksekusi sampai dialog ditutup.
Bersihkan `#printDoc` di `onafterprint`, **jangan** di baris setelah
`window.print()` — di sebagian kasus baris itu berjalan sebelum dialognya sempat
melukis, dan hasilnya PDF kosong.

---

## 10. Kriteria selesai

Fitur dianggap selesai kalau semua ini terbukti:

- [ ] Tombol muncul di keempat halaman, konsisten dengan gaya toolbar yang ada
- [ ] PDF PR Pending berisi **semua** PR pending hasil filter, termasuk yang
      dibuat bulan-bulan sebelumnya
- [ ] PDF Belum PO berisi **semua** PR `OPEN`, termasuk yang di-approve bulan lalu
      (uji khusus: PR "tertua 30 hari" **harus** muncul)
- [ ] PDF History mengikuti bulan yang dipilih di dropdown, bukan selalu bulan ini
- [ ] Filter layar (search, plant, MRP, status PO, urutan) tercermin di PDF, dan
      tertulis di kepala dokumen
- [ ] PDF memuat **seluruh** hasil filter, bukan hanya halaman aktif
- [ ] Total dijumlahkan **per mata uang**; uji dengan PR multi-currency
      (`0010000104` di data dummy punya IDR + USD)
- [ ] Satu PR tidak terpotong jadi dua halaman
- [ ] Nama file PDF sesuai konvensi §9.1
- [ ] `main.htm` **nol perubahan** (`git diff` harus kosong)
- [ ] `lv_ver` di `index.htm` sudah dinaikkan
- [ ] Empty state: klik Download saat 0 baris → toast, bukan PDF kosong

---

## 11. Sengaja TIDAK dikerjakan

- **Excel/CSV export** — tidak diminta.
- **Kirim PDF via email** — butuh backend, di luar lingkup.
- **Preview PDF di dalam aplikasi** — dialog cetak Chrome sudah punya preview.
- **Filter periode di layar untuk PR Pending & Belum PO** — sempat dipertimbangkan
  untuk menyelaraskan layar & PDF, lalu tidak jadi karena §2 (keputusan
  membatalkan potong tanggal untuk kedua halaman itu) membuatnya tidak perlu.
- **Logo di kepala PDF** — `logo.png` di MIMEs saat ini **0 byte**. Kalau logo
  aslinya belum ada di server, lewati dulu; jangan menunda fitur ini karenanya.

---

## 12. Perkiraan

| Pekerjaan | Perkiraan |
|---|---|
| `app-print.js` (4 varian dokumen) | paling besar |
| Blok `@media print` di `style.css` | sedang |
| Sisipkan tombol di 3 file render | kecil |
| `index.htm` (1 script + `lv_ver`) | kecil |

Tidak ada perubahan ABAP, tidak ada objek SAP baru, tidak ada transport tambahan
selain MIMEs + `index.htm`.
