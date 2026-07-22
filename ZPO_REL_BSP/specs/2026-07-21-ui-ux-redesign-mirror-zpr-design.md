# Spec Desain — Redesign UI/UX ZPO_REL_BSP (mirror ZPR_REL_BSP)

| Atribut | Nilai |
|---|---|
| **Tanggal** | 2026-07-21 |
| **Program** | ZPO_REL_BSP (PO Release System) |
| **Referensi** | ZPR_REL_BSP (PR Release System) |
| **Tujuan** | Redesign UI/UX agar user-friendly, modular, dan load halaman cepat — dengan data tetap akurat dan **tanpa mengubah logic sistem apa pun** |
| **Strategi migrasi** | In-place, per view, commit per tahap |

---

## 1. Tujuan & Non-Tujuan

### Tujuan
- UI/UX ZPO **sama dengan ZPR**: kerangka DOM, CSS, dan pola interaksi ZPR dipakai apa adanya, data PO dimasukkan ke dalamnya.
- Frontend **modular**: dipecah dari satu `main.htm` monolitik (4.416 baris) menjadi shell `index.htm` + modul `app-*.js` + `style.css` di MIMEs, mengikuti struktur ZPR.
- **Load cepat**: shell render instan, data dimuat per view sebagai JSON API (bukan inject seluruh data saat page load).
- **PWA**: installable + offline shell (manifest, service worker, cache-busting versi aset).

### Non-Tujuan (dibuang dari scope)
- **Push notification** — tidak diadopsi (tidak ada `app-push.js`, `ZPUSH_PR_NOTIF`, `ZPUSH_LOG`, server web-push).
- **Dashboard / Outstanding GR (OGR)** — tetap dalam kondisi *feature-flag off* seperti sekarang; tidak diadopsi dari ZPR.
- Modul ZPR `app-po.js`, `app-dashboard.js`, `app-reveal.js` (kecuali reveal dipakai untuk animasi, dievaluasi saat fase visual).
- Perubahan apa pun pada logic bisnis (lihat Guardrail).

---

## 2. Guardrail — Definisi "Tanpa Mengubah Logic"

Semua elemen berikut **DIPINDAH APA ADANYA** ke dalam handler `WHEN lv_action`, bukan ditulis ulang. Output field & nilai harus identik.

**Function module / BAPI yang tidak boleh disentuh:**
- `Z_FM_YMMR068` (ambil data PO header & item, per plant 1200 & 1300)
- `Z_PO_RELEASE2` (release PO)
- `Z_PO_REJECT` (reject PO)
- `Z_PO_COMMENT_UPDATE` (update komentar)
- `BAPI_TRANSACTION_COMMIT`
- `READ_TEXT` (item text EKPO)

**Query & aturan yang tidak boleh diubah:**
- History release/reject dari `CDHDR`/`CDPOS`, `objectclas = 'EINKBELEG'`, `tabname = 'EKKO'`
- Kondisi `WHERE`, aturan plant 1200 (Surabaya) / 1300 (Semarang)
- Aturan penentuan bisa/tidaknya PO di-release / reject
- Struktur `ztymmr068` / `ztymmr068po` dan seluruh field JSON yang dihasilkan

**Yang berubah HANYA:** pengemasan & pengiriman data (dari inject `ALL_DATA1/2` sekaligus → JSON API `CASE lv_action`), pemecahan frontend ke modul, dan tampilan (CSS/markup).

---

## 3. Arsitektur Target (mirror ZPR)

```
ZPO_REL_BSP/
  Page with FLow Logic/
    index.htm      Shell: <head>, sprite ikon SVG, versi aset (lv_ver),
                   BAPI_USER_GET_DETAIL untuk nama user. Muat modul app-*.js.
    main.htm       ABAP-only JSON API. CASE lv_action WHEN
                   'GET_LIST' / 'GET_HISTORY_REL' / 'GET_HISTORY_REJ' /
                   'GET_HISTORY_COUNT' / 'GET_HISTORY_ITEMS' /
                   'GET_DETAIL' / 'BULK_REL' / 'BULK_REJ'.
  MIMEs/
    style.css                    Adopsi dari ZPR + token warna potype PO.
    DMSans.woff2 / DMMono.woff2  Reuse dari ZPR (self-host, tanpa Google Fonts).
    icon-192.png / icon-512.png  PWA.
    manifest.json / sw.js        PWA shell + cache-busting.
    logo.png / background.png / surabaya.png / semarang.png  Aset ZPO yang ada.
    app-core.js      Utilitas + boot (format tanggal/angka/mata uang, escHtml, fetch helper).
    app-ui.js        Toast, modal, confirm dialog, loading overlay, skeleton, FAB, sticky, empty state, a11y focus.
    app-list.js      Kartu PO, toolbar, page-size, pagination, sidebar counts.
    app-history.js   Sidebar history, filter bar, tabel item history, badge counts.
    app-detail.js    Detail PO + add-info + item text (modal).
    app-action.js    BULK_REL / BULK_REJ / logoff.
```

### Kerangka UI/UX (disalin dari ZPR)
- `<header class="hdr">` — tombol toggle sidebar + menu user. **Item "Aktifkan Notifikasi" dihapus.**
- `<aside class="sidebar">` — navigasi plant 1200/1300 + kategori, dirender JS.
- `<main id="mainContent">` — konten view (list kartu + toolbar + pagination).
- `<div class="actionbar">` + `<div class="fab">` — seleksi bulk ("X PO dipilih").
- Modal: konfirmasi release, konfirmasi reject (dengan textarea catatan), item-text.
- `<div id="lo">` — loading overlay.

---

## 4. Remap Domain PR → PO (label & field saja, bukan logic)

| Elemen ZPR (PR) | Jadi di ZPO (PO) |
|---|---|
| "Approve / Reject PR" | "Release / Reject PO" |
| Nomor `banfn` (PR) | Nomor `ebeln` (PO) |
| Kategori `bsart` di sidebar | Kategori `potype` |
| Sumber data `eban` (SELECT langsung) | `Z_FM_YMMR068` (FM yang ada) |
| History dari tabel `zroto_app_hist` / `zroto_rej_hist` | History dari `CDHDR` / `CDPOS` (logic ZPO tetap) |
| Modal item text via `GET_ITEM_TEXT` (eban) | via `READ_TEXT` EKPO (logic ZPO tetap) |
| FAB "X PR dipilih" | FAB "X PO dipilih" |

---

## 5. Urutan Pengerjaan (in-place, per view, commit per tahap)

| Fase | Isi | Alasan urutan |
|---|---|---|
| **0 — Fondasi** | `index.htm` shell + `style.css` + font/icon dari ZPR + `lv_ver` + PWA (manifest/sw). App masih render seperti lama. | Fondasi tanpa menyentuh data. |
| **1 — Primitives** | Ekstrak util & UI primitives → `app-core.js` + `app-ui.js` (copy 1:1 dari inline). | Nol perubahan perilaku; risiko verifikasi rendah. |
| **2 — List PO** | Tambah `WHEN 'GET_LIST'` (bungkus `Z_FM_YMMR068` yang ada) → `app-list.js` fetch JSON + kartu gaya ZPR. | View paling sering dibuka → dampak "load cepat" terbesar. |
| **3 — History** | `WHEN 'GET_HISTORY_*'` (sudah action-based, tinggal dipindah) → `app-history.js`. | Paling mudah karena sudah pola action. |
| **4 — Detail PO** | Detail + item text → `app-detail.js`. | Bergantung pada list. |
| **5 — Bulk action** | `BULK_REL` / `BULK_REJ` + logoff → `app-action.js`. | Paling sensitif; diverifikasi paling ketat, dikerjakan terakhir. |
| **6 — Polish** | Redesign visual final + polish PWA + hapus sisa kode inline lama. | Setelah fungsional stabil. |

Setiap fase = commit sendiri. App produksi tetap berfungsi di akhir setiap fase.

---

## 6. Strategi Verifikasi "Data Tetap Akurat"

Tidak ada unit test otomatis untuk BSP, jadi verifikasi manual terstruktur per fase yang memindah data, **sebelum** jalur lama dihapus:

1. **Golden-JSON diff**: rekam output data lama (`ALL_DATA1` / `ALL_DATA2` yang di-inject) untuk PO & plant tertentu → bandingkan field-per-field dengan output `GET_LIST` baru untuk PO & plant yang sama. Harus identik.
2. **Berdampingan (side-by-side)**: karena in-place, sediakan flag/parameter sementara agar jalur lama & baru bisa dijalankan berdampingan saat pembandingan. Cocokkan:
   - Jumlah PO per plant & per kategori (potype)
   - Total nilai per PO / mata uang
   - Urutan kartu
   - Badge history count
3. **Bulk action (fase 5)**: uji di **PO uji** dulu; bandingkan isi `BAPIRET2` / `BAPIRETURN` dan hasil commit lama vs baru — harus sama persis.
4. Flag/parameter verifikasi sementara **dihapus di fase 6**.

---

## 7. Reuse dari ZPR

Disalin lalu disesuaikan (label/warna PO):
- `style.css` (token warna, layout, komponen kartu, sidebar, modal, FAB, toast, skeleton)
- Font `DMSans.woff2` / `DMMono.woff2` (self-host)
- Icon sprite SVG (`<symbol id="i-*">`)
- Kerangka `manifest.json` / `sw.js` + pola `lv_ver` cache-busting
- Pola `CASE lv_action` + helper `escape_json` di `main.htm`
- Struktur `index.htm` (header/sidebar/main/actionbar/modal/loading)

Estimasi: fase 0–1 sangat terbantu karena mayoritas CSS & kerangka bisa dipakai ulang; kerja utama ada di remap data PO ke template ZPR + memindah blok ABAP ZPO ke pola action.

---

## 8. Risiko & Mitigasi

| Risiko | Mitigasi |
|---|---|
| Output `GET_LIST` beda tipis dari inject lama (format angka/tanggal) | Golden-JSON diff wajib per fase; helper format disalin 1:1 dari kode ZPO lama, bukan dari ZPR. |
| History `CDHDR/CDPOS` berat bila dimuat awal | Tetap lazy-load per view (sudah action-based di ZPO). |
| Bulk action salah target PO setelah refactor | Fase 5 diuji di PO uji + bandingkan BAPIRET2; dikerjakan terakhir saat pola sudah stabil. |
| Cache aset lama tersaji browser | Pola `lv_ver` cache-busting dari ZPR di seluruh `.js`/`.css`. |
| Sisa kode inline lama bentrok dengan modul baru | Kode lama baru dihapus di fase 6 setelah tiap view terverifikasi. |
