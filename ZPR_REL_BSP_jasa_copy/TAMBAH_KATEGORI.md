# Panduan Aktivasi Kategori PR — RSBT, RSB8, RSM8

Aplikasi saat ini hanya menampilkan 2 kategori aktif:
- **ROTO** (PR Maintenance) — Plant 1200 & 1300
- **RSB7** (PR RND) — Plant 1200 & 1300

Tiga kategori berikut sudah ada di backend/frontend tapi **di-hide**:
- **RSBT** (PR Tools) — hanya Plant 1200
- **RSB8** (PR Rawat & Projek) — hanya Plant 1200
- **RSM8** (PR Rawat & Projek) — hanya Plant 1300

Gunakan panduan ini untuk mengaktifkannya kembali.

---

## Cara Aktivasi

### 1. `index.htm` — Frontend

#### 1a. `PR_CATEGORIES` (~line 811)
Tambah entry kategori yang ingin diaktifkan:
```js
var PR_CATEGORIES = {
  'ROTO': { label:'PR Maintenance', short:'Maintenance', icon:'&#128203;' },
  'RSB7': { label:'PR RND',         short:'RND',         icon:'&#128736;' },
  // ↑ Aktifkan dengan menambah di bawah ini:
  'RSBT': { label:'PR Tools',          short:'Tools',          icon:'&#128296;' },
  'RSB8': { label:'PR Rawat & Projek', short:'Rawat & Projek', icon:'&#127959;' },
  'RSM8': { label:'PR Rawat & Projek', short:'Rawat & Projek', icon:'&#127959;' },
};
```

#### 1b. `sbCounts.pending` (~line 799)
Tambah key per plant:
```js
var sbCounts = {
  pending:  { '1200':{ROTO:0, RSB7:0, RSBT:0, RSB8:0},
              '1300':{ROTO:0, RSB7:0, RSM8:0} },
  ...
};
```

#### 1c. `PLANT_CATEGORIES` (~line 829)
Tambah ke array plant masing-masing:
```js
var PLANT_CATEGORIES = {
  '1200': ['ROTO', 'RSB7', 'RSBT', 'RSB8'],
  '1300': ['ROTO', 'RSB7', 'RSM8']
};
```

#### 1d. `loadSidebarData()` — mapping response (~line 1029)
Tambah parsing untuk tiap kategori:
```js
sbCounts.pending['1200'] = {
  ROTO: parseInt(o1200.ROTO)||0,
  RSB7: parseInt(o1200.RSB7)||0,
  RSBT: parseInt(o1200.RSBT)||0,
  RSB8: parseInt(o1200.RSB8)||0
};

sbCounts.pending['1300'] = {
  ROTO: parseInt(o1300.ROTO)||0,
  RSB7: parseInt(o1300.RSB7)||0,
  RSM8: parseInt(o1300.RSM8)||0
};
```

---

### 2. `main.htm` — Backend ABAP

#### 2a. Whitelist validasi di `GET_LIST` (~line 323)
Tambah ke kondisi `NE`:
```abap
ELSEIF lv_bsart NE 'ROTO'
   AND lv_bsart NE 'RSB7'
   AND lv_bsart NE 'RSBT'
   AND lv_bsart NE 'RSB8'
   AND lv_bsart NE 'RSM8'.
```

#### 2b. `GET_SIDEBAR` — deklarasi variabel (~line 221)
Tambah variabel string untuk tiap kategori:
```abap
DATA: lv_s_1200_roto TYPE string,
      lv_s_1200_rsb7 TYPE string,
      lv_s_1200_rsbt TYPE string,
      lv_s_1200_rsb8 TYPE string,
      lv_s_1300_roto TYPE string,
      lv_s_1300_rsb7 TYPE string,
      lv_s_1300_rsm8 TYPE string,
```

#### 2c. `GET_SIDEBAR` — `count_pending` (~line 239)
Tambah pemanggilan macro:
```abap
count_pending 'ROTO' '1200' lv_s_1200_roto.
count_pending 'RSB7' '1200' lv_s_1200_rsb7.
count_pending 'RSBT' '1200' lv_s_1200_rsbt.
count_pending 'RSB8' '1200' lv_s_1200_rsb8.
count_pending 'ROTO' '1300' lv_s_1300_roto.
count_pending 'RSB7' '1300' lv_s_1300_rsb7.
count_pending 'RSM8' '1300' lv_s_1300_rsm8.
```

#### 2d. `GET_SIDEBAR` — output JSON (~line 289)
Tambah di objek JSON pending:
```abap
'"1200":{'
  '"ROTO":' lv_s_1200_roto ','
  '"RSB7":' lv_s_1200_rsb7 ','
  '"RSBT":' lv_s_1200_rsbt ','
  '"RSB8":' lv_s_1200_rsb8
'},'
'"1300":{'
  '"ROTO":' lv_s_1300_roto ','
  '"RSB7":' lv_s_1300_rsb7 ','
  '"RSM8":' lv_s_1300_rsm8
'}'
```

---

### 3. Verifikasi

Setelah semua perubahan, pastikan:
- [ ] Sidebar menampilkan menu untuk kategori yang diaktifkan
- [ ] Badge pending muncul per kategori
- [ ] Klik menu → fetch list dengan `bsart` sesuai
- [ ] Whitelist backend menerima kategori tersebut
- [ ] History menampilkan data dengan label kategori yang benar
- [ ] Approve/reject tetap berfungsi (BSART dari EBAN, bukan hardcode)

> **Catatan:** RSBT & RSB8 hanya untuk Plant 1200 (Surabaya).
> RSM8 hanya untuk Plant 1300 (Semarang).
> Pastikan tidak ada duplikasi `DATA` di `WHEN` berbeda dan sintaks ABAP klasik.

---

*Dibuat: 2026-06-18 — Panduan aktivasi kategori RSBT, RSB8, RSM8*
