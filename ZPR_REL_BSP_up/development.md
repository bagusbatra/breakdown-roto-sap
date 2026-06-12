# Development Plan — PR Jasa (ZPR_REL_BSP_up)

## 1. Tujuan

Mengembangkan aplikasi **Release PR Jasa** di folder `ZPR_REL_BSP_up` dengan
mengadaptasi kode existing `ZPR_REL_BSP` (PR ROTO). Target: BOD bisa approve/
reject PR Jasa dengan workflow serupa.

## 2. Runtime Environment

| Komponen | Keterangan |
|----------|-----------|
| Platform | SAP NetWeaver AS ABAP (BSP/ICF Service) |
| Frontend | HTML + CSS + JS (vanilla, `index.htm`) |
| Backend | ABAP scriptlet (`main.htm`) |
| Komunikasi | `fetch()` → `main.htm?action=...` |
| BAPI | `BAPI_REQUISITION_RELEASE`, `BAPI_REQUISITION_DELETE` |
| Tabel history | **Baru** per kategori (mis. `ZJASA_APP_HIST`, `ZJASA_REJ_HIST`) |

## 3. Arsitektur (Tetap Sama)

```
Browser (index.htm)
  │ fetch('main.htm?action=...')
  ▼
main.htm (ABAP, CASE lv_action)
  │ SELECT / CALL BAPI
  ▼
SAP Tables: EBAN, MAKT, USR21, ADRP,
           ZJASA_APP_HIST, ZJASA_REJ_HIST (baru)
```

## 4. Perubahan dari ROTO ke Jasa

| Item | ROTO (existing) | Jasa (target) | Keterangan |
|------|-----------------|---------------|-----------|
| BSART | `ROTO` | `JASA` (tbd) | Document type PR |
| Nama Aplikasi | Release PR ROTO | Release PR Jasa | Title di `index.htm` |
| Tabel history | `ZROTO_APP_HIST`, `ZROTO_REJ_HIST` | `ZJASA_APP_HIST`, `ZJASA_REJ_HIST` | Struktur sama, nama beda |
| Release code | `P2` | TBD (cek di SAP) | Kode release strategy |
| Approver | `KMI-BOD` | TBD (mungkin sama) | User/role approver |
| Plant | `1200`, `1300` | TBD (mungkin sama) | Perlu konfirmasi |
| Filter ESTKZ | MRP/Non-MRP | Mungkin tidak relevan | PR Jasa biasanya manual |
| Sidebar label | "PR One Time Off" | "PR Jasa" | Label UI |

## 5. Task Checklist

- [ ] **Konfirmasi BSART** untuk PR Jasa (transaksi `ME5AN`/`ME53N`)
- [ ] **Cek Release Strategy** PR Jasa di SAP (transaksi `OMGQ`) — kode release
- [ ] **Buat tabel custom** `ZJASA_APP_HIST` dan `ZJASA_REJ_HIST` (copy struktur `ZROTO_*`)
- [ ] **Update `index.htm`**:
  - Title aplikasi
  - Label sidebar ("PR Jasa")
  - Label ESTKZ jika berbeda
  - Plant list jika berbeda
- [ ] **Update `main.htm`**:
  - Ganti `BSART = 'ROTO'` → `BSART = 'JASA'`
  - Ganti nama tabel history (`zroto_*` → `zjasa_*`)
  - Ganti release code jika berbeda
  - Ganti approver jika berbeda
  - Plant list jika berbeda
- [ ] **Test**:
  - Login approver vs non-approver
  - Approve 1 PR Jasa
  - Reject 1 PR Jasa
  - Cek isi tabel history
  - Cek search/filter

## 6. Catatan Penting

- Jangan ubah `ZPR_REL_BSP` (original) — itu baseline.
- Semua pengembangan dilakukan di `ZPR_REL_BSP_up`.
- Backup tabel custom dulu sebelum testing di SAP production.
- Untuk multi-level release strategy, logic `FRGKZ='X' AND FRGZU=' '` mungkin
  perlu disesuaikan (lihat `notes/investigation.md` §6.2).
