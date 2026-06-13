# Panduan Menambah Kategori PR Baru

> Dokumen ini untuk menambah kategori PR baru ke aplikasi Release PR multi-kategori.
> Cukup beri perintah: **"Tambah kategori PR [KODE_BSART] dengan label [Label]"**
>
> **PENTING:** Setiap kategori bisa punya field penting yang **berbeda** di tampilan web.
> AI WAJIB melakukan **analisis field** terlebih dahulu sebelum coding.
>
> **SAP System:** S/4HANA on-premise **version 1.8.0.9** (SAP NetWeaver AS ABAP).
> Field reference: cek tabel `EBAN`, `MAKT`, `ESLL`, `MARA`, `T024`, `USR21`, `ADRP`, `CDHDR`, `CDPOS`
> sesuai versi S/4HANA tersebut — struktur bisa berbeda dengan ECC.

---

## ⚠️ FASE 0: ANALISIS FIELD (WAJIB)

**JANGAN LANGSUNG CODING.** Setiap kategori PR bisa punya karakteristik data berbeda.
AI harus cari tahu dulu field apa yang relevan.

### Cara analisis:

1. **Cek definisi BSART di SAP** — lihat tabel `T161` atau `T16FS` untuk karakteristik dokumen.
   (Jika tidak bisa akses SAP, tanya user atau cek dokumen bisnis.)
2. **Cek tabel EBAN** — field apa saja yang relevan untuk kategori ini:
   - Material PR (`ROTO`-like): `matnr`, `maktx`, `menge`, `meins`, `preis`, `peinh`, `waers`, `lfdat`, `estkz`
   - Service PR (`RSB7`-like): `packno`, `srvpos`, `txz01` (deskripsi jasa), harga satuan
   - Capex PR: `anln1` (asset), `kostl` (cost center), `sakto` (GL account)
   - Consumable: `knttp` (account assignment category), `sakto`, `kostl`
3. **Cek tabel terkait** — apakah perlu JOIN ke tabel lain?
   - `MAKT` → material description (untuk material PR)
   - `ESLL` → service lines (untuk service PR)
   - `MARA` → material group
   - `T024` → purchasing group name
4. **Tanya user** — jika ragu, tanya field apa yang penting ditampilkan.
5. **Jika sudah paham, tanya user untuk izin memulai development** — jangan asal mulai coding tanpa persetujuan saya.
6. **Catat Perubahan dan Penambahan** — buat file dengan nama [kategori].md untuk tracking dan menyimpan histori apa yang dilakukan oleh ai.

### Output analisis (dokumentasi sebelum coding):
```
Kategori: [KODE]
Tipe: [Material / Service / Capex / Consumable / dll]
Field header penting: [field1, field2, ...]
Field item penting:   [field1, field2, ...]
Tabel JOIN tambahan:  [MAKT, ESLL, ...]
Perbedaan logic:      [harga dari ESLL, grouping by paket, dll]
```

---

## FASE 1: Konstanta & Struktur Kategori

Setelah analisis field selesai, tambahkan entry di frontend dan backend.

### A. Frontend — `index.htm`

#### 1a. `PR_CATEGORIES` map (baris ~811)
```js
var PR_CATEGORIES = {
  'ROTO': { label:'PR One Time Off', short:'One Time Off', icon:'&#128203;' },
  'RSB7': { label:'PR Jasa',         short:'Jasa',         icon:'&#128736;' },
  // ↑ TAMBAH DI SINI
  'KODEBARU': { label:'PR Label Baru', short:'Label', icon:'&#128XXX;' },
};
```

| Properti | Fungsi |
|----------|--------|
| `label` | Nama lengkap tampil di sidebar & judul halaman |
| `short` | Nama pendek untuk title tab browser |
| `icon` | Emoji/HTML entity (cari kode di [htmlsymbols.xyz](https://htmlsymbols.xyz)) |

#### 1b. `sbCounts.pending` initial state (baris ~799)
```js
var sbCounts = {
  pending:  { '1200':{ROTO:0, RSB7:0 /* + KODEBARU:0 */},
              '1300':{ROTO:0, RSB7:0 /* + KODEBARU:0 */} },
  hist_app: { '1200':0, '1300':0 },
  hist_rej: { '1200':0, '1300':0 }
};
```

### B. Backend — `main.htm`

#### 1c. Validasi whitelist di `GET_LIST` (baris ~310)
```abap
ELSEIF lv_bsart NE 'ROTO' AND lv_bsart NE 'RSB7' AND lv_bsart NE 'KODEBARU'.
  lv_output = '{"status":"E","message":"bsart tidak valid","data":[]}'.
```

#### 1d. `GET_SIDEBAR` — tambah macro `count_pending` (baris ~234)
```abap
count_pending 'KODEBARU' '1200' lv_s_1200_kodebaru.
count_pending 'KODEBARU' '1300' lv_s_1300_kodebaru.
```
+ deklarasi variabel baru: `lv_s_1200_kodebaru TYPE string`, `lv_s_1300_kodebaru TYPE string`.

#### 1e. `GET_SIDEBAR` — output JSON (baris ~281)
```abap
'"1200":{"ROTO":' lv_s_1200_roto ',"RSB7":' lv_s_1200_rsb7 ',"KODEBARU":' lv_s_1200_kodebaru '},'
'"1300":{"ROTO":' lv_s_1300_roto ',"RSB7":' lv_s_1300_rsb7 ',"KODEBARU":' lv_s_1300_kodebaru '}'
```

---

## FASE 2: Sesuaikan SELECT & Output JSON per Kategori

Ini bagian yang **paling kritis** dan tergantung hasil analisis field (Fase 0).

### A. `GET_LIST` — query header (baris ~322)

Jika field headernya sama dengan ROTO/RSB7, tidak perlu ubah SELECT.
Jika ada field tambahan → tambah field di SELECT dan di output JSON.

```abap
SELECT banfn badat werks bsart txz01 ernam ekgrp
       frgkz frgzu loekz estkz
       " + field_tambahan_1 field_tambahan_2     ← TAMBAH
  FROM eban
  INTO CORRESPONDING FIELDS OF TABLE lt_head
  WHERE bsart = lv_bsart ...
```

Output JSON di loop header (baris ~480):
Tambahkan field baru di CONCATENATE JSON:
```abap
CONCATENATE lv_json lv_sep
  '{"banfn":"'      ls_head-banfn    '",'
  '"badat":"'       lv_gl_bdat       '",'
  ...
  '"field_baru":"'  lv_field_baru    '",'     ← TAMBAH
  '}' INTO lv_json.
```

### B. `GET_DETAIL` — query items (baris ~514)

Jika item punya field tambahan → tambah di SELECT dan output JSON.
Jika kategori baru perlu JOIN ke tabel lain (misal `ESLL` untuk service):

```abap
" Contoh: JOIN ke ESLL untuk service lines
SELECT ... FROM eban AS e
  LEFT JOIN esll AS s ON s~packno = e~packno
  INTO CORRESPONDING FIELDS OF TABLE lt_items
  WHERE e~banfn = lv_banfn_e ...
```

### C. Frontend — render card & detail (index.htm)

Jika kategori baru punya field tambahan yang perlu ditampilkan:

#### Card header (`renderList` baris ~1387)
Tambah field tambahan di HTML card jika perlu:
```js
html += '<div class="meta-val">' + escHtml(pr.field_baru || '-') + '</div>';
```

#### Detail table (`loadDetail` baris ~1845)
Tambah kolom baru di table detail jika perlu:
```js
html += '<th>Field Baru</th>';
html += '<td>' + escHtml(it.field_baru || '-') + '</td>';
```

#### History table (`buildHistTable` baris ~1543)
Tambah kolom baru di history jika perlu.

---

## FASE 3: Aturan Penting

### Release Code
Semua kategori PR saat ini menggunakan **`P2`** (baris 856 `main.htm`).
Jika kategori baru butuh release code berbeda → ubah di `WHEN 'PROCESS'`:
```abap
CALL FUNCTION 'BAPI_REQUISITION_RELEASE'
  EXPORTING
    number   = lv_banfn_e
    rel_code = 'P2'    " ← GANTI JIKA BEDA
    item     = ls_item-bnfpo
```

### Approver
Semua kategori menggunakan approver **`KMI-BOD`** (baris 137 `main.htm`).
Jika kategori baru butuh approver beda → ubah logika:
```abap
IF lv_uname = 'KMI-BOD' OR ( lv_bsart = 'KODEBARU' AND lv_uname = 'APPROVER-LAIN' ).
  lv_is_approver = abap_true.
```

### Perhitungan Total Harga
- **Material PR** (`ROTO`): `menge * preis` dari EBAN
- **Service PR** (`RSB7`): bisa dari `menge * preis` EBAN, atau dari `ESLL` (service lines)
- **Kategori lain**: sesuaikan dengan sumber datanya

Jika logic perhitungan berbeda, ubah di `GET_LIST` (loop header) dan `GET_DETAIL`:
```abap
" Contoh: service PR ambil harga dari ESLL
SELECT SUM( netwr ) FROM esll INTO lv_gl_totpr
  WHERE packno IN lt_packno.
```

### History
Semua kategori memakai tabel **`ZROTO_APP_HIST`** / **`ZROTO_REJ_HIST`** yang sudah ada.
Kolom `BSART` otomatis terisi dari field `EBAN-BSART` saat proses approve/reject.
**Tidak perlu tabel baru** — tapi pastikan kolom di tabel history mencukupi untuk field penting kategori baru. Jika tidak → tambah kolom di SE11 (tapi ini perubahan konfigurasi, perlu approval).

### Plant
Saat ini hanya `1200` (Surabaya) dan `1300` (Semarang). Jika ada plant baru:
- Tambah di `PLANT_LABELS` (`index.htm` baris ~806)
- Tambah di `renderSidebar()` (`index.htm` baris ~1039) — render loop sudah generik, cukup tambah data array
- Tambah semua `count_pending` dan SELECT history di `GET_SIDEBAR` (`main.htm`)

---

## FASE 4: Checklist Lengkap

### Analisis (Fase 0)
- [ ] Tentukan tipe kategori (Material/Service/Capex/dll)
- [ ] Identifikasi field header penting dari EBAN
- [ ] Identifikasi field item penting dari EBAN (atau tabel lain)
- [ ] Cek tabel JOIN tambahan (MAKT, ESLL, dll)
- [ ] Cek logic perhitungan total harga
- [ ] Dokumen hasil analisis sebelum coding

### index.htm (Frontend)
- [ ] `PR_CATEGORIES` — tambah entry baru
- [ ] `sbCounts.pending` — tambah key per plant
- [ ] Sidebar loop `Object.keys(PR_CATEGORIES)` → otomatis render
- [ ] `fetchList()` kirim `curBsart` → otomatis
- [ ] Card header — tambah field baru jika ada
- [ ] Detail table — tambah kolom baru jika ada
- [ ] History table — tambah kolom baru jika ada

### main.htm (Backend)
- [ ] Validasi whitelist di `GET_LIST`
- [ ] `GET_SIDEBAR` — deklarasi + `count_pending` + output JSON
- [ ] `GET_LIST` — SELECT header: tambah field baru jika ada
- [ ] `GET_LIST` — output JSON header: tambah field baru
- [ ] `GET_DETAIL` — SELECT item: tambah field / JOIN tabel baru
- [ ] `GET_DETAIL` — output JSON item: tambah field baru
- [ ] `GET_HIST_APP` / `GET_HIST_REJ` — tambah field jika perlu
- [ ] (Opsional) Release code berbeda
- [ ] (Opsional) Approver berbeda
- [ ] (Opsional) Logic hitung total harga berbeda

### Syarat SE80 (WAJIB)
- [ ] ABAP **klasik** — tanpa `DATA(...)` inline, `VALUE`, string template `|...|`
- [ ] Nama variabel **unik** — tidak boleh duplikat `DATA` di `WHEN` berbeda
- [ ] JS **ES5** — `var`, `function`, string `+` concatenation; tanpa `const`, `let`, arrow, template literal

---

## Contoh Prompt + Proses

> "Tambah kategori PR `ZSV` dengan label 'PR Service Non-ROTO'"

AI akan:
1. **Fase 0 — Analisis:**
   - Tanya user / cek referensi → apakah `ZSV` mirip `RSB7` (service) atau beda?
   - Identifikasi field: `packno`, `srvpos`, `txz01`, `menge`, `meins`, `preis`, `peinh`, `waers`
   - Cek apakah perlu JOIN ke `ESLL` untuk detail service line
   - Cek apakah release code sama (`P2`) atau beda
   - **Tanya user jika ragu** — jangan asumsi

2. **Fase 1 — Konstanta:**
   - Tambah `'ZSV'` di `PR_CATEGORIES`, `sbCounts`, whitelist, `count_pending`, JSON sidebar

3. **Fase 2 — SELECT & Output:**
   - Jika field sama dengan RSB7 → reuse SELECT yang ada (filter `bsart = 'ZSV'`)
   - Jika field tambahan → ubah SELECT + CONCATENATE JSON
   - Jika ada JOIN ke ESLL → tambah logic baru di `GET_DETAIL`

4. **Fase 3 — Aturan:**
   - Release code, approver, history — ikuti existing atau ubah sesuai kebutuhan

5. **Fase 4 — Verifikasi:**
   - Cek duplikasi DATA, syntax ABAP klasik, JS ES5

---
*Dibuat: 2026-06-13 — Revisi dengan fase analisis field per kategori.*
