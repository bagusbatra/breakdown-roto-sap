# Planning — Fallback Work Order / Equipment pada Modal "Teks Item"

Aplikasi: **ZPR_REL_BSP** (`Page with FLow Logic/index.htm` + `main.htm`)
Tanggal: 2026-07-07

---

## 1. Tujuan

Memperbarui logic `showItemTextModal(banfn)`. Perilaku saat ini: jika item PR
tidak memiliki long-text, modal hanya menampilkan teks statis
*"Item ini tidak memiliki teks."*

Perilaku baru: **bila item tidak memiliki teks**, modal menampilkan data dari
maintenance order (tcode IW33) yang terkait dengan PR tersebut:

- **Nomor Work Order** (`AUFNR`)
- **Nomor Equipment** (`EQUNR`)
- **Keterangan Equipment** (`EQKT-EQKTX`)

Jika item **punya** teks → perilaku lama tetap (tampilkan teks). Fitur ini
**hanya** aktif pada cabang "tidak ada teks".

---

## 2. Keputusan yang sudah disepakati

| # | Topik | Keputusan |
|---|-------|-----------|
| 1 | Jalur link PR → WO | **EBKN-AUFNR** → **AFIH** → **EQKT** (account assignment standar SAP PM) |
| 2 | Fallback bila equipment kosong | **Equipment saja** — tidak menarik Functional Location. Kosong ditampilkan `-` |
| 3 | Bahasa deskripsi equipment | **`sy-langu`** (bahasa login), fallback ke `'E'` bila tidak ada |
| 4 | Cakupan item | **Semua item** PR → daftar Work Order / Equipment **unik** |
| 5 | Syarat tampil | **Hanya bila `EBAN-ERNAM = 'SVC_MAINT'`** (PR auto dari maintenance order). Creator lain → pesan "tidak ada teks" |

---

## 3. Model data & rantai query

| Langkah | Tabel | Kunci | Ambil |
|---|---|---|---|
| 1. Item PR → Order | `EBKN` | `BANFN` (semua item), `AUFNR <> space` | `AUFNR` (unik) |
| 2. Order → Equipment | `AFIH` | `AUFNR` | `EQUNR` |
| 3. Equipment → Keterangan | `EQKT` | `EQUNR` + `SPRAS = sy-langu` (fallback `'E'`) | `EQKTX` |

Catatan:
- `AUFNR` (12) & `EQUNR` (18) tersimpan dengan **leading zeros**; IW33
  menampilkannya tanpa nol depan → strip dengan
  `SHIFT ... LEFT DELETING LEADING '0'` sebelum dikirim ke frontend.
- `EBKN` bisa punya beberapa baris `ZEKKN` (split akun) & beberapa item bisa
  menunjuk order sama → kumpulkan `AUFNR` lalu `SORT` + `DELETE ADJACENT
  DUPLICATES`.
- Item PR yang bukan account-assignment order (cost center dsb.) → `AUFNR`
  kosong → otomatis terlewat oleh filter `AUFNR <> space`.

---

## 4. Kontrak JSON (action `GET_ITEM_TEXT`)

Field lama dipertahankan; ditambah `has_wo` + `wo_list`.

```json
{
  "status": "S",
  "message": "OK",
  "banfn": "0012345678",
  "item": "00010",
  "text": "",
  "has_text": false,
  "has_wo": true,
  "wo_list": [
    { "aufnr": "4000123", "equnr": "10000045", "eqktx": "MOTOR POMPA ROTO 01" },
    { "aufnr": "4000130", "equnr": "",         "eqktx": "" }
  ]
}
```

- Blok WO **hanya diisi saat `has_text = false`** → tidak membebani kasus
  normal (teks ada). Satu action, satu round-trip (tanpa fetch kedua).
- `has_wo = false` bila daftar kosong (PR tanpa order) → frontend jatuh ke
  pesan lama *"Item ini tidak memiliki teks."*

---

## 5. Rancangan backend (`main.htm`, blok `WHEN 'GET_ITEM_TEXT'`)

Sisipkan **setelah** `lv_has_text` ditetapkan (~line 947), **sebelum**
`CONCATENATE ... lv_output`. Gaya ABAP klasik (tanpa sintaks 7.40+),
siap paste ke SE80.

Deklarasi tambahan (tipe di seksi TYPES, data di seksi DATA / dalam blok):

```abap
TYPES: BEGIN OF ty_wo,
         aufnr TYPE ebkn-aufnr,
         equnr TYPE afih-equnr,
         eqktx TYPE eqkt-eqktx,
       END OF ty_wo.

DATA: lt_aufnr   TYPE STANDARD TABLE OF ebkn-aufnr,
      lv_aufnr   TYPE ebkn-aufnr,
      lt_wo      TYPE STANDARD TABLE OF ty_wo,
      ls_wo      TYPE ty_wo,
      lv_equnr   TYPE afih-equnr,
      lv_eqktx   TYPE eqkt-eqktx,
      lv_has_wo  TYPE string,
      lv_wo_json TYPE string,
      lv_wo_sep  TYPE string,
      lv_aufnr_d TYPE string,
      lv_equnr_d TYPE string,
      lv_eqktx_e TYPE string.
```

Logika inti:

```abap
CLEAR: lt_aufnr, lt_wo, lv_wo_json, lv_wo_sep, lv_has_wo.

IF lv_has_text = 'false'.
  " Kumpulkan semua order dari SELURUH item PR (unik)
  SELECT aufnr FROM ebkn
    INTO TABLE lt_aufnr
    WHERE banfn = lv_banfn_e
      AND aufnr <> space.
  SORT lt_aufnr.
  DELETE ADJACENT DUPLICATES FROM lt_aufnr.

  LOOP AT lt_aufnr INTO lv_aufnr.
    CLEAR: ls_wo, lv_equnr, lv_eqktx.
    ls_wo-aufnr = lv_aufnr.

    " Equipment dari header order PM
    SELECT SINGLE equnr FROM afih INTO lv_equnr
      WHERE aufnr = lv_aufnr.
    ls_wo-equnr = lv_equnr.

    " Keterangan equipment (bahasa login -> fallback 'E')
    IF lv_equnr IS NOT INITIAL.
      SELECT SINGLE eqktx FROM eqkt INTO lv_eqktx
        WHERE equnr = lv_equnr AND spras = sy-langu.
      IF sy-subrc <> 0.
        SELECT SINGLE eqktx FROM eqkt INTO lv_eqktx
          WHERE equnr = lv_equnr AND spras = 'E'.
      ENDIF.
      ls_wo-eqktx = lv_eqktx.
    ENDIF.

    APPEND ls_wo TO lt_wo.
  ENDLOOP.
ENDIF.

IF lt_wo IS INITIAL.
  lv_has_wo = 'false'.
ELSE.
  lv_has_wo = 'true'.
ENDIF.

" Susun array wo_list
LOOP AT lt_wo INTO ls_wo.
  lv_aufnr_d = ls_wo-aufnr.
  SHIFT lv_aufnr_d LEFT DELETING LEADING '0'.
  lv_equnr_d = ls_wo-equnr.
  SHIFT lv_equnr_d LEFT DELETING LEADING '0'.
  lv_eqktx_e = ls_wo-eqktx.
  escape_json lv_eqktx_e.

  CONCATENATE lv_wo_json lv_wo_sep
    '{"aufnr":"' lv_aufnr_d '",'
    '"equnr":"'  lv_equnr_d '",'
    '"eqktx":"'  lv_eqktx_e '"}'
    INTO lv_wo_json.
  lv_wo_sep = ','.
ENDLOOP.
```

Ubah `CONCATENATE ... INTO lv_output` menjadi:

```abap
CONCATENATE
  '{"status":"S","message":"OK","banfn":"' lv_banfn_e '",'
  '"item":"'     lv_first_bnfpo '",'
  '"text":"'     lv_item_text   '",'
  '"has_text":'  lv_has_text    ','
  '"has_wo":'    lv_has_wo      ','
  '"wo_list":['  lv_wo_json     ']}'
  INTO lv_output.
```

---

## 6. Rancangan frontend (`index.htm`, `showItemTextModal`)

Ganti cabang `if (!res.has_text)` (~line 1295):

```js
if (!res.has_text){
  meta.innerHTML = 'PR <b>'+escHtml(banfn)+'</b>';
  if (res.has_wo && res.wo_list && res.wo_list.length){
    var h = '<div class="wo-note">Item tidak memiliki teks. '
          + 'Data Work Order terkait (IW33):</div>'
          + '<table class="wo-tbl"><thead><tr>'
          + '<th>No. Work Order</th><th>No. Equipment</th>'
          + '<th>Keterangan Equipment</th></tr></thead><tbody>';
    res.wo_list.forEach(function(w){
      h += '<tr><td>'+escHtml(w.aufnr||'-')+'</td>'
         + '<td>'+escHtml(w.equnr||'-')+'</td>'
         + '<td>'+escHtml(w.eqktx||'-')+'</td></tr>';
    });
    h += '</tbody></table>';
    body.innerHTML = h;
  } else {
    body.innerHTML =
      '<div class="item-text-empty">Item ini tidak memiliki teks.</div>';
  }
  return;
}
```

CSS tambahan (dekat `.item-text-empty`, ~line 661):

```css
.wo-note { color:var(--muted); font-size:12px; margin-bottom:8px; }
.wo-tbl { width:100%; border-collapse:collapse; font-size:13px; }
.wo-tbl th, .wo-tbl td { border:1px solid var(--border);
  padding:6px 8px; text-align:left; }
.wo-tbl th { background:var(--bg-soft); font-weight:600; }
```
> Sesuaikan nama variabel CSS (`--border`, `--bg-soft`) dengan yang sudah ada
> di file; cek dulu sebelum implementasi.

---

## 7. Edge cases

- PR **bukan** dibuat `SVC_MAINT` → lookup dilewati → `has_wo=false` → pesan lama.
- PR tanpa order sama sekali (`lt_wo` kosong) → `has_wo=false` → pesan lama.
- Order tanpa equipment (`AFIH-EQUNR` kosong) → baris tetap tampil, kolom
  equipment & keterangan `-` (sesuai keputusan #2).
- Equipment tanpa deskripsi di `sy-langu` **dan** `'E'` → keterangan `-`.
- Beberapa item menunjuk order sama → tampil sekali (dedup by `AUFNR`).
- `banfn` kosong / item tidak ditemukan → tetap pakai guard existing.

---

## 8. Langkah implementasi

1. `main.htm` — tambah TYPES `ty_wo` + DATA baru.
2. `main.htm` — sisip blok lookup WO di dalam `WHEN 'GET_ITEM_TEXT'`.
3. `main.htm` — perluas `CONCATENATE lv_output` dengan `has_wo` + `wo_list`.
4. `index.htm` — update cabang `!res.has_text` + CSS `.wo-*`.
5. Uji di SE80/browser.

## 9. Rencana pengujian

- PR item **ada** teks → tampil teks (tidak berubah).
- PR item **tanpa** teks, punya 1 order + equipment → tabel 1 baris lengkap.
- PR multi-item, order berbeda → tabel multi-baris, unik.
- PR tanpa order → pesan *"Item ini tidak memiliki teks."*
- Order dengan equipment kosong → baris dengan `-`.
- Verifikasi nomor WO & equipment tampil **tanpa** leading zeros, cocok IW33.

---

## 10. Catatan terbuka

- Perlu konfirmasi nama variabel CSS aktual di `index.htm` untuk styling tabel.
- Bila nantinya diinginkan menampilkan Functional Location saat equipment
  kosong, cukup tambah lookup `AFIH-TPLNR` + `IFLOTX-PLTXT` (di luar scope
  sekarang).
