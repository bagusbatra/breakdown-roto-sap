# Panduan Aktivasi / Penambahan Kategori PR

Aplikasi saat ini memiliki 4 kategori aktif:
- **ROTO** (PR Maintenance) — Plant 1200, 2000, 1000, 1001, 1100, 1300, 3000
- **PRK9** (PR RND) — Plant 1200, 2000, 1000, 1001, 1100
- **RSBR** (PR RND, alias dari PRK9) — Plant 1200, 2000, 1000, 1001, 1100
- **PRKS** (PR Service) — Plant 1200, 2000, 1000, 1001, 1100, 1300, 3000

Gunakan panduan ini untuk menambah kategori baru.

---

## Cara Aktivasi (Menambah Kategori Baru)

### 1. `index.htm` — Frontend

#### 1a. `CATEGORY_DEF` (~line 1024)
Tambah entry kategori baru:
```js
var CATEGORY_DEF = {
  'ROTO': { label:'PR Maintenance', short:'Maintenance', icon:'&#128203;' },
  'PRK9': { label:'PR RND',         short:'RND',         icon:'&#128736;' },
  'RSBR': { label:'PR RND',         short:'RND',         icon:'&#128736;' },
  'PRKS': { label:'PR Service',     short:'Service',     icon:'&#128295;' },
  // ↑ Tambah kategori baru di sini:
  'XXX':  { label:'PR Baru',         short:'Baru',        icon:'&#128000;' },
};
```

#### 1b. `PLANT_DEF` (~line 1010)
Tambah kategori ke array plant yang sesuai:
```js
var PLANT_DEF = {
  '1200': { label:'Surabaya', categories:['ROTO','PRK9','PRKS'] },
  '1300': { label:'Semarang', categories:['ROTO','PRKS'] },
  ...
  // Tambah kategori baru ke array categories plant yg relevan
};
```

#### 1c. `sbCounts.pending` (~line 1078)
Tambah key kategori di setiap plant terkait:
```js
sbCounts = {
  pending:  { '1200':{ROTO:0,PRK9:0,PRKS:0, XXX:0}, '1300':{ROTO:0,PRKS:0, XXX:0} },
  hist_app: { ... },
  hist_rej: { ... }
};
```

---

### 2. `main.htm` — Backend ABAP

#### 2a. Whitelist validasi di `GET_LIST`
Tambah ke kondisi `NE`:
```abap
ELSEIF lv_bsart NE 'ROTO'
   AND lv_bsart NE 'PRK9'
   AND lv_bsart NE 'RSBR'
   AND lv_bsart NE 'PRKS'.
*  AND lv_bsart NE 'XXX'.   " <-- tambah kategori baru
```

#### 2b. `GET_SIDEBAR` — deklarasi variabel
Tambah variabel string untuk tiap kategori per plant:
```abap
DATA: lv_s_1200_roto  TYPE string,
      lv_s_1200_prk9  TYPE string,
      lv_s_1200_prks  TYPE string,
      lv_s_1300_roto  TYPE string,
      lv_s_1300_prks  TYPE string.
*     lv_s_1200_xxx   TYPE string.   " <-- tambah
```

#### 2c. `GET_SIDEBAR` — `count_pending`
Tambah pemanggilan macro untuk tiap plant:
```abap
count_pending 'ROTO' '1200' lv_s_1200_roto.
count_pending 'PRK9' '1200' lv_s_1200_prk9.
count_pending 'PRKS' '1200' lv_s_1200_prks.
count_pending 'ROTO' '1300' lv_s_1300_roto.
count_pending 'PRKS' '1300' lv_s_1300_prks.
*count_pending 'XXX' '1200' lv_s_1200_xxx.   " <-- tambah
```

#### 2d. `GET_SIDEBAR` — output JSON
Tambah di objek JSON pending:
```abap
'"1200":{'
  '"ROTO":' lv_s_1200_roto ','
  '"PRK9":' lv_s_1200_prk9 ','
  '"PRKS":' lv_s_1200_prks
* ','"XXX":' lv_s_1200_xxx   " <-- tambah
'},'
```

---

### 3. Verifikasi

Setelah semua perubahan, pastikan:
- [ ] Sidebar menampilkan menu untuk kategori yang ditambah
- [ ] Badge pending muncul per kategori
- [ ] Klik menu → fetch list dengan `bsart` sesuai
- [ ] Whitelist backend menerima kategori tersebut
- [ ] History menampilkan data dengan label kategori yang benar
- [ ] Approve/reject tetap berfungsi (BSART dari EBAN, bukan hardcode)

> **Catatan:** Pastikan category key konsisten antara `CATEGORY_DEF`,
> `PLANT_DEF`, `sbCounts`, dan whitelist backend. Karena pendekatan
> ZBSP_PRCH_APP masih hardcode per kombinasi plant×kategori (tidak
> like `lt_cat_def` loop ZPR_REL_BSP), setiap kategori baru perlu
> ditambah di 3-4 tempat.

---

*Panduan aktivasi/penambahan kategori — diperbarui 23 Juni 2026*
