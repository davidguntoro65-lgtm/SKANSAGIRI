# PRD Presisi Tinggi — Core Platform Sistem Sekolah Terintegrasi

**Produk:** Core Platform SMKN 1 Wonogiri  
**Dokumen:** Product Requirements Document (PRD)  
**Versi:** 1.0.0  
**Tanggal:** 16 September 2026  
**Status:** Baseline implementasi Wave 1  
**Pemilik produk:** Sekolah / Tim Pengembang  
**Bahasa antarmuka:** Bahasa Indonesia  
**Target platform:** Web responsive  
**Arsitektur:** Modular monolith  
**Stack terkunci:** React + Vite + TypeScript, Express + TypeScript, PostgreSQL + Prisma  

> Dokumen ini adalah spesifikasi teknis-produk khusus Core Platform. Dokumen
> `docs/PRD-ROADMAP-SISTEM-SEKOLAH-TERINTEGRASI.md` tetap menjadi dokumen induk
> untuk LMS, absensi, keuangan, portofolio, dan integrasi eksternal.

---

## 1. Ringkasan Eksekutif

Core Platform adalah fondasi data dan akses untuk seluruh sistem sekolah. Modul
ini memastikan bahwa identitas pengguna, role, tahun ajaran, jurusan, mata
pelajaran, kelas, guru, siswa, assignment guru, dan enrollment siswa memiliki
referensi yang konsisten sebelum LMS dan modul operasional dibuka.

Masalah utama yang diselesaikan:

1. Backend existing masih berpusat pada satu login admin dan CMS portal publik.
2. Belum ada identity tunggal untuk guru dan siswa.
3. Belum ada master akademik terpusat dengan tahun ajaran sebagai konteks.
4. Data guru dan siswa perlu diimpor dari XLS/XLSX secara aman dan dapat diaudit.
5. Guru perlu dapat mengusulkan mapel/kelas tanpa memperoleh akses sebelum
   operator menyetujuinya.
6. Assignment resmi harus menjadi sumber izin untuk LMS, absensi, nilai, dan
   portofolio siswa.

Keputusan produk utama:

- **Admin-first:** assignment resmi dapat dimuat melalui import atau input
  operator dan langsung menjadi akses aktif.
- **Teacher-request:** guru dapat memilih mapel/kelas pada login pertama, tetapi
  pilihan tersebut menjadi pengajuan dan bukan akses.
- Semua import bersifat **preview-first**, tervalidasi, idempotent, dan commit
  dalam satu transaksi database.
- Data lama tidak dihapus otomatis ketika file import baru tidak memuat baris
  tertentu.
- NIP, NISN, kode mapel, kode kelas, kode jurusan, dan kode tahun ajaran adalah
  identifier stabil; nama bukan kunci relasi.

---

## 2. Status Implementasi dan Batas Dokumen

### 2.1 Fondasi yang sudah tersedia di repository

Baseline implementasi saat dokumen ini dibuat sudah mencakup:

- Model Prisma identity dan master akademik.
- Model role, profil guru/siswa, assignment, selection request, enrollment,
  import job, dan audit log.
- Migration PostgreSQL Core Platform.
- Route `/api/v1/akademik`.
- Dashboard `/admin/akademik`.
- Template XLSX terpisah untuk delapan jenis data.
- Preview import dengan validasi header, field, referensi, email, tanggal, dan
  duplikat di dalam file.
- Commit import transaksional dengan checksum file.
- Review pengajuan assignment guru oleh admin/operator.
- Dokumentasi entry point dan endpoint di `replit.md`.

### 2.2 Bagian yang menjadi target lanjutan

Bagian berikut adalah target PRD, tetapi tidak dianggap selesai hanya karena
model datanya sudah tersedia:

- Login multi-role berbasis `CoreUser`, bukan hanya login admin existing.
- Aktivasi akun guru/siswa dengan invitation dan pembuatan password sendiri.
- Form CRUD manual master data.
- Portal guru untuk login pertama dan pemilihan assignment.
- Portal siswa.
- Integrasi assignment ke guard LMS, absensi, nilai, dan portofolio.
- Test regression khusus parser dan transaksi import.
- Notification untuk invitation, revisi, persetujuan, dan penolakan.

### 2.3 Non-goals

Tidak termasuk dalam Core Platform v1:

- Pembuatan modul LMS, bank soal, assessment, atau AI tutor.
- Perhitungan nilai rapor nasional.
- Payroll pegawai.
- Payment gateway dan rekonsiliasi bank.
- Aplikasi mobile native.
- Microservices atau migrasi ke monorepo baru.
- Penggantian PostgreSQL, Prisma, Express, atau custom router existing.
- Sinkronisasi otomatis dengan sistem akademik eksternal tanpa kontrak
  integrasi yang disetujui.

---

## 3. Tujuan Produk dan Outcome

### 3.1 Tujuan

1. Menyediakan satu sumber kebenaran untuk data akademik.
2. Menyediakan akses berbasis role dan assignment, bukan parameter dari client.
3. Mengurangi input manual berulang melalui import XLS yang terstruktur.
4. Mencegah data invalid masuk database tanpa laporan.
5. Menjaga histori ketika siswa naik kelas, pindah jurusan, atau guru berganti
   assignment.
6. Menyiapkan kontrak data yang dapat dipakai LMS, absensi, keuangan, dan
   portofolio.

### 3.2 Indikator keberhasilan

| Indikator | Target v1 |
|---|---:|
| Import memiliki preview sebelum commit | 100% |
| Commit import memakai transaksi | 100% |
| Baris dengan error masuk database | 0 |
| Import file identik menggandakan guru/siswa | 0 |
| Assignment aktif tanpa guru, mapel, kelas, dan tahun yang valid | 0 |
| Perubahan penting memiliki audit event | 100% |
| Akses guru di luar assignment aktif | 0 |
| Identifier relasi bergantung pada nama | 0 |

### 3.3 Prinsip desain

1. **Server sebagai sumber kebenaran.** Status, role, ownership, dan akses
   tidak boleh ditentukan dari body request.
2. **Least privilege.** Pengguna hanya melihat data sesuai role dan scope.
3. **Tahun ajaran eksplisit.** Semua hubungan kelas, assignment, dan enrollment
   yang bersifat periodik memiliki `academicYearId`.
4. **Preview sebelum mutasi.** Upload tidak sama dengan commit.
5. **Idempotent.** Pengulangan file tidak membuat data ganda.
6. **Soft state, bukan hard delete.** Histori akademik dipertahankan melalui
   status `INACTIVE` atau `ARCHIVED`.
7. **Auditability.** Operasi sensitif dapat ditelusuri tanpa menyimpan PII
   berlebihan di log aplikasi.
8. **Backward compatibility.** Portal publik dan login admin lama tetap berjalan
   selama migrasi.

---

## 4. Pengguna, Role, dan Permission

### 4.1 Persona

| Persona | Kebutuhan utama |
|---|---|
| Admin | Konfigurasi sistem, seluruh master data, role, audit, dan recovery |
| Operator | Import dan koreksi data akademik sesuai scope operasional |
| Guru | Aktivasi akun, melihat assignment, mengajukan perubahan, mengakses kelas resmi |
| Wali kelas | Ringkasan dan data operasional kelas yang ditugaskan |
| Siswa | Mengakses data, LMS, absensi, dan portofolio milik sendiri |
| Kepala sekolah | Melihat ringkasan dan laporan agregat |
| Bendahara | Mengelola domain keuangan tanpa akses otomatis ke data LMS privat |
| Editor publik | Mengelola CMS tanpa akses ke data akademik privat |

### 4.2 Role baseline

| Role | Scope |
|---|---|
| `ADMIN` | Semua domain dan semua school scope |
| `OPERATOR` | Master akademik, import, enrollment, assignment sesuai scope |
| `GURU` | Mapel/kelas dari `TeachingAssignment` aktif |
| `SISWA` | Profil dan data milik sendiri; data belajar yang dibuka untuknya |
| `WALI_KELAS` | Ringkasan kelas dari `homeroom` aktif |
| `BENDAHARA` | Tagihan, pembayaran, dan laporan keuangan |
| `KEPALA_SEKOLAH` | Dashboard agregat dan laporan yang diizinkan |
| `EDITOR_PUBLIC` | Konten portal publik saja |

### 4.3 Aturan otorisasi wajib

- Satu `CoreUser` dapat memiliki lebih dari satu role.
- User `DISABLED` tidak dapat membuat session baru.
- `ADMIN` dan `OPERATOR` dapat menjalankan import; role lain tidak.
- `GURU` hanya dapat mengelola data dari assignment dengan:
  - `status = ACTIVE`;
  - `academicYearId` sesuai konteks aktif;
  - `teacherId` berasal dari session, bukan dari body.
- `SISWA` tidak boleh menerima `studentId` dari request sebagai sumber identitas
  utama; server mengambil profil dari session.
- NIP dan NISN tidak boleh digunakan sebagai password default.
- `EDITOR_PUBLIC` tidak mendapat akses ke route `/api/v1/akademik`.
- Perubahan role, status user, assignment, dan approval wajib diaudit.

---

## 5. Urutan dan Dependency Master Data

Urutan canonical:

```text
Tahun Ajaran
    ↓
Jurusan / Program Keahlian
    ↓
Mata Pelajaran
    ↓
Kelas
    ↓
Guru
    ↓
Siswa
    ↓
Assignment Guru
    ↓
Enrollment Siswa
    ↓
Modul / LMS / Absensi / Nilai / Portofolio
```

### 5.1 Aturan dependency

| Entitas | Bergantung pada | Dampak jika referensi belum ada |
|---|---|---|
| Tahun Ajaran | Tidak ada | Dapat dibuat pertama |
| Jurusan | Tidak ada | Dapat dibuat sebelum tahun ajaran |
| Mapel | Jurusan opsional | `kodeJurusan` invalid harus ditolak |
| Kelas | Tahun ajaran; jurusan opsional | Wajib memiliki tahun valid |
| Guru | Tidak ada | Dapat diimport sebelum assignment |
| Siswa | Kelas dan tahun | Wajib memiliki kelas/tahun valid |
| Assignment | Guru, mapel, kelas, tahun | Semua referensi wajib valid |
| Enrollment | Siswa, kelas, tahun | Semua referensi wajib valid |

### 5.2 Tahun ajaran aktif

- Hanya satu tahun ajaran boleh `isActive = true` dalam satu school scope.
- Pergantian tahun ajaran tidak menghapus histori periode sebelumnya.
- Semua request guru baru memakai tahun ajaran aktif secara default.
- Import dengan `kodeTahunAjaran` nonaktif tetap dapat diproses bila referensinya
  valid, tetapi tidak otomatis menjadi konteks aktif.

---

## 6. Model Domain Canonical

### 6.1 Identity

#### `CoreUser`

| Field | Tipe | Aturan |
|---|---|---|
| `id` | UUID | Primary key internal |
| `email` | string | Unique; dinormalisasi lowercase |
| `fullName` | string | Wajib |
| `status` | enum | `INVITED`, `ACTIVE`, `DISABLED` |
| `activatedAt` | datetime? | Diisi ketika aktivasi berhasil |
| `createdAt` | datetime | Server-owned |
| `updatedAt` | datetime | Server-owned |

`CoreUser` menyimpan identitas login, bukan seluruh profil akademik. Relasi
opsionalnya adalah satu `CoreTeacher` atau satu `CoreStudent`.

#### `CoreRole` dan `CoreUserRole`

- `CoreRole.name` unique.
- Kombinasi `userId + roleId` unique.
- Pencabutan role tidak menghapus histori audit.

#### `Session`

Session existing tetap dipertahankan selama migrasi. Target final:

- session mengacu pada `CoreUser`;
- memiliki expiry;
- dapat dicabut;
- logout mencabut token aktif;
- session lama admin diterima hanya selama compatibility window.

### 6.2 Master akademik

#### `AcademicYear`

| Field | Aturan |
|---|---|
| `code` | Unique, contoh `2026/2027` |
| `name` | Label tampilan |
| `isActive` | Maksimal satu aktif |
| `status` | `ACTIVE`, `INACTIVE`, `ARCHIVED` |

#### `Department`

| Field | Aturan |
|---|---|
| `code` | Unique, contoh `PPLG` |
| `name` | Nama program keahlian |
| `status` | Status lifecycle |

#### `Subject`

| Field | Aturan |
|---|---|
| `code` | Unique, contoh `PWEB` |
| `name` | Nama mapel |
| `departmentId` | Nullable; FK ke jurusan |
| `status` | Status lifecycle |

#### `AcademicClass`

| Field | Aturan |
|---|---|
| `code` | Unique dan stabil, contoh `X-PPLG-1-2627` |
| `name` | Label tampilan, contoh `X PPLG 1` |
| `grade` | `X`, `XI`, atau `XII` |
| `academicYearId` | Wajib |
| `departmentId` | Nullable |
| `homeroomId` | Nullable; FK guru |
| `status` | Status lifecycle |

#### `CoreTeacher`

| Field | Aturan |
|---|---|
| `nip` | Unique; identifier utama guru |
| `fullName` | Wajib |
| `email` | Nullable pada import awal; unique jika diisi |
| `phone` | Nullable |
| `status` | Status lifecycle |
| `userId` | Nullable sampai akun dibuat |

#### `CoreStudent`

| Field | Aturan |
|---|---|
| `nisn` | Unique; identifier utama siswa |
| `fullName` | Wajib |
| `email` | Nullable |
| `phone` | Nullable |
| `gender` | Nilai terkontrol bila digunakan |
| `birthPlace` | Nullable |
| `birthDate` | Nullable, tanggal valid |
| `status` | Status lifecycle |
| `userId` | Nullable sampai akun dibuat |

### 6.3 Relasi akademik

#### `TeacherSubject`

Menunjukkan mapel yang dikuasai atau diizinkan untuk diajarkan guru. Relasi ini
tidak otomatis memberi akses kelas.

Kunci:

```text
teacherId + subjectId
```

#### `TeachingAssignment`

Menunjukkan hak akses resmi guru:

```text
teacherId + subjectId + classId + academicYearId
```

Field status:

- `ACTIVE`: dapat dipakai sebagai authorization scope.
- `INACTIVE`: tidak dipakai untuk akses baru, histori tetap ada.
- `ARCHIVED`: periode atau assignment historis.

Field source:

- `ADMIN_IMPORT`
- `ADMIN_MANUAL`
- `TEACHER_REQUEST`

#### `TeacherSelectionRequest`

Header pengajuan guru:

| Field | Aturan |
|---|---|
| `teacherId` | Server-owned dari user guru |
| `academicYearId` | Tahun ajaran aktif atau eksplisit |
| `status` | State machine pengajuan |
| `submittedAt` | Diisi saat submit |
| `reviewedBy` | User operator/admin |
| `reviewedAt` | Diisi saat review |
| `reviewNote` | Wajib untuk reject/revisi |

`TeacherSelectionItem` menyimpan kombinasi `subjectId + classId` yang dipilih.

#### `StudentEnrollment`

Kombinasi unique:

```text
studentId + academicYearId
```

Artinya satu siswa memiliki maksimal satu enrollment aktif pada satu tahun
ajaran. Perpindahan kelas dilakukan dengan update enrollment dan audit event,
bukan membuat histori palsu atau menghapus siswa.

### 6.4 Import dan audit

#### `CoreImportJob`

| Field | Aturan |
|---|---|
| `templateType` | Salah satu dari delapan template |
| `fileName` | Nama file asli untuk laporan |
| `fileChecksum` | SHA-256 file |
| `status` | `PREVIEWED`, `COMMITTED`, `FAILED` |
| `totalRows` | Total baris data, tanpa header |
| `successRows` | Baris yang committed |
| `errorRows` | Baris invalid/duplicate |
| `errors` | Error per baris, bukan password/secret |
| `uploadedBy` | Actor/session reference |
| `createdAt` | Server-owned |
| `committedAt` | Nullable sampai commit |

#### `CoreAuditLog`

Event minimal:

- `IMPORT_PREVIEW`
- `IMPORT_COMMIT`
- `IMPORT_FAILED`
- `MASTER_CREATE`
- `MASTER_UPDATE`
- `MASTER_ARCHIVE`
- `TEACHER_REQUEST_SUBMIT`
- `TEACHER_REQUEST_REVIEW`
- `ASSIGNMENT_CREATE`
- `ASSIGNMENT_STATUS_CHANGE`
- `ROLE_CHANGE`
- `USER_STATUS_CHANGE`

Audit tidak boleh menyimpan password, token, file base64, atau data sensitif
lebih banyak dari yang diperlukan untuk penelusuran.

---

## 7. State Machine

### 7.1 User

```text
INVITED ── activate ──> ACTIVE
ACTIVE ── disable ────> DISABLED
DISABLED ── re-enable > ACTIVE
```

Aturan:

- `INVITED` hanya dapat login melalui token aktivasi, bukan password default.
- `DISABLED` tidak dapat login.
- Reactivation wajib diaudit.

### 7.2 TeacherSelectionRequest

```text
DRAFT ── submit ───────> SUBMITTED
SUBMITTED ── approve ──> APPROVED
SUBMITTED ── reject ───> REJECTED
SUBMITTED ── revise ───> NEEDS_REVISION
NEEDS_REVISION ── edit ─> DRAFT
```

Aturan:

- `APPROVED` membuat atau mengaktifkan `TeachingAssignment`.
- `REJECTED` tidak membuat assignment.
- `NEEDS_REVISION` tidak memberi akses.
- Review `REJECTED` atau `NEEDS_REVISION` wajib memiliki `reviewNote`.
- Review dan pembuatan assignment dilakukan dalam satu transaction.

### 7.3 TeachingAssignment

```text
ACTIVE ── deactivate ──> INACTIVE
INACTIVE ── reactivate > ACTIVE
INACTIVE ── archive ───> ARCHIVED
ACTIVE ── archive ─────> ARCHIVED
```

Assignment `INACTIVE` dan `ARCHIVED` tidak menjadi authorization scope aktif.

### 7.4 Import

```text
upload
  ↓
PREVIEWED
  ├── invalid rows ──> tetap PREVIEWED, tidak dapat commit
  └── all valid ─────> COMMITTED
parse/transaction error ──> FAILED
```

File dengan checksum berbeda dari preview tidak boleh di-commit menggunakan
`jobId` yang sama.

---

## 8. Spesifikasi Import XLS/XLSX

### 8.1 Aturan umum file

- Format yang didukung: `.xlsx` dan `.xls`.
- Ukuran maksimum request: 10 MB untuk Core Platform.
- Sheet pertama digunakan.
- Baris pertama harus berisi header canonical.
- Header bersifat case-sensitive pada baseline; UI template resmi menjadi acuan.
- Baris kosong diabaikan.
- Kolom tambahan boleh ditolak atau diabaikan hanya jika perilaku itu
  terdokumentasi pada template; baseline mengabaikan kolom tambahan.
- Semua nilai dibersihkan dari whitespace di boundary parser.
- Password plain text tidak boleh ada di template mana pun.

### 8.2 Template 01 — Tahun Ajaran

Nama file rekomendasi: `01-template-tahun-ajaran.xlsx`

| Kolom | Wajib | Aturan |
|---|---:|---|
| `code` | Ya | Unique, contoh `2026/2027` |
| `name` | Ya | Label tampilan |
| `isActive` | Tidak | `YA/TRUE/1` mengaktifkan; hanya satu aktif |

### 8.3 Template 02 — Jurusan

Nama file rekomendasi: `02-template-jurusan.xlsx`

| Kolom | Wajib | Aturan |
|---|---:|---|
| `code` | Ya | Unique, contoh `PPLG` |
| `name` | Ya | Nama program keahlian |

### 8.4 Template 03 — Mata Pelajaran

Nama file rekomendasi: `03-template-mapel.xlsx`

| Kolom | Wajib | Aturan |
|---|---:|---|
| `code` | Ya | Unique, contoh `PWEB` |
| `name` | Ya | Nama mapel |
| `kodeJurusan` | Tidak | Harus cocok jika diisi |

### 8.5 Template 04 — Kelas

Nama file rekomendasi: `04-template-kelas.xlsx`

| Kolom | Wajib | Aturan |
|---|---:|---|
| `code` | Ya | Unique dan stabil |
| `name` | Ya | Label kelas |
| `tingkat` | Ya | `X`, `XI`, `XII` |
| `kodeJurusan` | Tidak | Harus cocok jika diisi |
| `kodeTahunAjaran` | Ya | Wajib sudah ada |

### 8.6 Template 05 — Guru

Nama file rekomendasi: `05-template-guru.xlsx`

| Kolom | Wajib | Aturan |
|---|---:|---|
| `nip` | Ya | Unique, identifier utama |
| `namaLengkap` | Ya | Nama tampilan |
| `email` | Tidak | Format email valid jika diisi |
| `noHp` | Tidak | Disimpan sebagai string |
| `status` | Tidak | Default `ACTIVE` |

Import guru boleh membuat `CoreUser` berstatus `INVITED` bila email tersedia.
Import tidak boleh membuat password bersama.

### 8.7 Template 06 — Siswa

Nama file rekomendasi: `06-template-siswa.xlsx`

| Kolom | Wajib | Aturan |
|---|---:|---|
| `nisn` | Ya | Unique, identifier utama |
| `namaLengkap` | Ya | Nama tampilan |
| `email` | Tidak | Format email valid jika diisi |
| `noHp` | Tidak | String |
| `jenisKelamin` | Tidak | Nilai terkontrol bila digunakan |
| `tempatLahir` | Tidak | String |
| `tanggalLahir` | Tidak | Tanggal valid |
| `kodeKelas` | Ya | Referensi aktif/valid |
| `kodeTahunAjaran` | Ya | Referensi valid |
| `status` | Tidak | Default `ACTIVE` |

### 8.8 Template 07 — Assignment Guru

Nama file rekomendasi: `07-template-assignment-guru.xlsx`

| Kolom | Wajib | Aturan |
|---|---:|---|
| `nip` | Ya | Guru harus sudah ada |
| `kodeMapel` | Ya | Mapel harus sudah ada |
| `kodeKelas` | Ya | Kelas harus sudah ada |
| `kodeTahunAjaran` | Ya | Tahun harus sudah ada |
| `status` | Tidak | Default `ACTIVE` |

### 8.9 Template 08 — Enrollment Siswa

Nama file rekomendasi: `08-template-enrollment-siswa.xlsx`

| Kolom | Wajib | Aturan |
|---|---:|---|
| `nisn` | Ya | Siswa harus sudah ada |
| `kodeKelas` | Ya | Kelas harus sudah ada |
| `kodeTahunAjaran` | Ya | Tahun harus sudah ada |
| `status` | Tidak | Default `ACTIVE` |

### 8.10 Kategori error per baris

Error report minimal memuat:

| Kategori | Contoh |
|---|---|
| `HEADER_INVALID` | `kodeMapel` tidak ada pada header |
| `REQUIRED_FIELD` | `nisn` kosong |
| `FORMAT_INVALID` | Email atau tanggal invalid |
| `REFERENCE_NOT_FOUND` | `X-PPLG-9` tidak ditemukan |
| `DUPLICATE_IN_FILE` | NIP sama muncul dua kali |
| `DUPLICATE_EXISTING` | Kunci sudah ada dan konflik |
| `CONFLICT` | Satu siswa memiliki dua enrollment tahun yang sama |
| `SYSTEM_ERROR` | Parser/database gagal |

Error response harus menunjuk baris spreadsheet, misalnya:

```json
{
  "row": 18,
  "status": "ERROR",
  "errors": [
    {
      "code": "REFERENCE_NOT_FOUND",
      "field": "kodeKelas",
      "message": "Kode kelas X-PPLG-9 tidak ditemukan."
    }
  ]
}
```

### 8.11 Idempotency dan sinkronisasi

Jika file yang sama diupload dua kali:

- guru/siswa tidak digandakan;
- assignment/enrollment tidak digandakan;
- perubahan nilai yang diizinkan menghasilkan `UPDATED`;
- baris tanpa perubahan menghasilkan `UNCHANGED`;
- file identik setelah commit boleh ditolak sebagai sudah diproses atau
  menghasilkan laporan `UNCHANGED`.

Jika record lama tidak muncul pada file baru:

- jangan menghapus;
- jangan otomatis menonaktifkan pada baseline;
- opsi sinkronisasi penuh harus menjadi aksi terpisah dengan konfirmasi eksplisit
  dan audit.

---

## 9. Alur Produk

### 9.1 Setup pertama kali oleh operator

1. Operator login.
2. Membuat/import tahun ajaran.
3. Menetapkan satu tahun ajaran aktif.
4. Import jurusan.
5. Import mapel.
6. Import kelas.
7. Import guru.
8. Import siswa.
9. Import assignment guru.
10. Import enrollment siswa.
11. Memeriksa overview, error report, dan audit log.
12. Membuka akses modul lanjutan.

Setiap langkah harus dapat dilakukan terpisah. Gagal pada satu template tidak
boleh menghapus hasil commit dari template lain.

### 9.2 Guru dengan assignment resmi

```text
Import guru
  ↓
Import master mapel/kelas/tahun
  ↓
Import assignment guru
  ↓
Aktivasi akun guru
  ↓
Login pertama
  ↓
Guru mengonfirmasi profil dan assignment
  ↓
Dashboard guru aktif
```

Guru dapat mengajukan koreksi jika assignment resmi tidak sesuai. Koreksi tidak
mengubah assignment aktif sampai operator menyetujuinya.

### 9.3 Guru tanpa assignment resmi

```text
Aktivasi akun
  ↓
Login pertama
  ↓
Konfirmasi profil
  ↓
Pilih satu atau beberapa mapel
  ↓
Pilih kelas dari master aktif
  ↓
Review
  ↓
Submit
  ↓
Dashboard terbatas / menunggu
  ↓
Operator approve, reject, atau minta revisi
  ↓
Jika approve: TeachingAssignment dibuat aktif
```

Saat menunggu, guru boleh:

- melihat dan melengkapi profil;
- melihat status pengajuan;
- mengedit pengajuan bila diminta revisi;
- menghubungkan integrasi pribadi jika tersedia.

Saat menunggu, guru tidak boleh:

- melihat daftar siswa penuh;
- melihat nilai siswa;
- membuat assessment;
- mengubah absensi;
- membuka portofolio siswa di luar scope.

### 9.4 Approval operator

Operator melihat:

| Kolom | Isi |
|---|---|
| Guru | Nama guru dan NIP |
| Tahun ajaran | Konteks pengajuan |
| Mapel | Satu atau beberapa |
| Kelas | Satu atau beberapa |
| Status | `SUBMITTED`, `NEEDS_REVISION`, dll. |
| Waktu | `submittedAt` |

Aksi:

- **Setujui:** membuat/aktifkan semua assignment item dalam satu transaksi.
- **Tolak:** menyimpan alasan; tidak membuat assignment.
- **Minta revisi:** menyimpan catatan; status menjadi `NEEDS_REVISION`.
- **Sesuaikan:** operator mengubah item sebelum approve; perubahan wajib diaudit.

---

## 10. Dashboard Admin Core Platform

Route UI:

```text
/admin/akademik
```

### 10.1 Navigasi

1. Ringkasan
2. Master Data
3. Import XLS
4. Permintaan Guru
5. Assignment Guru
6. Audit Log (target lanjutan)

### 10.2 Ringkasan minimum

Dashboard menampilkan:

- Tahun ajaran aktif.
- Total guru aktif.
- Total siswa aktif.
- Total mapel aktif.
- Total kelas aktif.
- Jumlah assignment menunggu.
- Import terakhir, status, dan jumlah error.

### 10.3 Import UI

State UI:

```text
EMPTY
FILE_SELECTED
PARSING
PREVIEW_READY
HAS_ERRORS
READY_TO_COMMIT
COMMITTING
COMMITTED
FAILED
```

Aturan UI:

- Tombol commit disabled jika preview belum ada.
- Tombol commit disabled jika ada error.
- Preview menampilkan maksimal 200 baris pertama dan ringkasan total.
- Error report tetap dapat diakses/download untuk file besar.
- Setelah commit sukses, form reset dan overview/master di-refetch.
- Setelah session berubah atau expired, state privat dibersihkan.

### 10.4 Empty, loading, dan partial state

- Loading menampilkan skeleton atau progress, bukan tabel kosong yang ambigu.
- Master kosong menjelaskan urutan dependency berikutnya.
- Error jaringan memiliki retry.
- Partial data tidak boleh menyebabkan akses ke `undefined`.
- Import yang gagal menampilkan apakah gagal saat parse, validasi, atau commit.

---

## 11. Kontrak API

### 11.1 Konvensi response

Sukses:

```json
{
  "success": true,
  "data": {},
  "meta": {}
}
```

Error:

```json
{
  "success": false,
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "Data tidak ditemukan.",
    "fields": {}
  }
}
```

Semua endpoint privat:

- membutuhkan session valid;
- mengambil actor dari session;
- tidak mempercayai role atau identity dari body;
- mengembalikan `401` jika tidak terautentikasi;
- mengembalikan `403` jika role tidak berwenang.

### 11.2 Endpoint identity target

```text
POST   /api/v1/auth/login
POST   /api/v1/auth/logout
GET    /api/v1/auth/session
GET    /api/v1/me
POST   /api/v1/auth/activate
POST   /api/v1/auth/change-password
POST   /api/v1/auth/request-password-reset
```

### 11.3 Endpoint overview dan master

```text
GET    /api/v1/akademik/overview
GET    /api/v1/akademik/master
GET    /api/v1/akademik/tahun-ajaran
POST   /api/v1/akademik/tahun-ajaran
PATCH  /api/v1/akademik/tahun-ajaran/:id
GET    /api/v1/akademik/jurusan
POST   /api/v1/akademik/jurusan
PATCH  /api/v1/akademik/jurusan/:id
GET    /api/v1/akademik/mapel
POST   /api/v1/akademik/mapel
PATCH  /api/v1/akademik/mapel/:id
GET    /api/v1/akademik/kelas
POST   /api/v1/akademik/kelas
PATCH  /api/v1/akademik/kelas/:id
GET    /api/v1/akademik/guru
GET    /api/v1/akademik/siswa
```

### 11.4 Endpoint import

```text
GET    /api/v1/akademik/import/templates
GET    /api/v1/akademik/import/templates/:type
POST   /api/v1/akademik/import/:type/preview
POST   /api/v1/akademik/import/:type/commit
GET    /api/v1/akademik/import/jobs/:jobId
GET    /api/v1/akademik/import/jobs/:jobId/errors
```

Payload preview baseline:

```json
{
  "fileName": "05-template-guru.xlsx",
  "fileBase64": "data:application/vnd.openxmlformats-officedocument..."
}
```

Response preview:

```json
{
  "success": true,
  "data": {
    "jobId": "uuid",
    "templateType": "guru",
    "fileName": "05-template-guru.xlsx",
    "totalRows": 120,
    "validRows": 112,
    "errorRows": 8,
    "rows": []
  }
}
```

Payload commit:

```json
{
  "jobId": "uuid",
  "fileBase64": "file-yang-sama-dengan-preview"
}
```

Commit wajib memeriksa ulang:

1. `jobId` ada dan berstatus `PREVIEWED`;
2. `templateType` sama;
3. SHA-256 file sama;
4. semua row valid;
5. transaction berhasil.

### 11.5 Endpoint assignment

```text
GET    /api/v1/akademik/assignments
POST   /api/v1/akademik/assignments
PATCH  /api/v1/akademik/assignments/:id
GET    /api/v1/akademik/teacher-requests
POST   /api/v1/akademik/teacher-requests
PATCH  /api/v1/akademik/teacher-requests/:id
PATCH  /api/v1/akademik/teacher-requests/:id/review
```

`POST /teacher-requests` untuk guru harus mengambil `teacherId` dari session.
Client hanya mengirim `academicYearId` dan item mapel/kelas.

---

## 12. Keamanan, Privasi, dan Compliance

### 12.1 Authentication

- Session disimpan server-side.
- Token tidak ditaruh di response selain saat login/aktivasi yang diperlukan.
- Password disimpan menggunakan hash pada target identity final.
- Password tidak boleh berasal langsung dari kolom XLS.
- Login memiliki rate limit dan expiry.
- Logout mencabut session.

### 12.2 Authorization

- Check role dilakukan di server.
- Check scope guru dilakukan melalui `TeachingAssignment`.
- Check scope wali kelas dilakukan melalui `homeroom`.
- Check kepemilikan siswa dilakukan melalui `CoreUser.student`.
- URL `:guruId`, `:siswaId`, `:nisn` bukan bukti akses.

### 12.3 File dan PII

- Validasi MIME type dan ekstensi.
- Jangan menyimpan file base64 besar sebagai data permanen di PostgreSQL.
- Base64 hanya menjadi transport sementara pada baseline endpoint saat ini.
- Target file storage memakai abstraction dan metadata.
- Error report tidak boleh memuat credential atau token.
- Log aplikasi biasa tidak boleh mencetak NIP/NISN/email lengkap tanpa kebutuhan.

### 12.4 Audit

Minimal simpan:

- actor;
- waktu;
- action;
- entity;
- entity id;
- checksum untuk import;
- ringkasan jumlah baris;
- status sebelum/sesudah jika relevan.

Audit tidak boleh dapat diedit melalui UI biasa.

---

## 13. Non-functional Requirements

### 13.1 Reliability

- Commit menggunakan transaction.
- Kegagalan satu commit melakukan rollback seluruh batch.
- Retry request tidak menggandakan record.
- Endpoint mengembalikan error contract konsisten.
- Database migration harus dapat dijalankan ulang dengan aman melalui pipeline.

### 13.2 Performance

- Overview memuat agregat tanpa mengambil seluruh record.
- Master list mendukung pagination untuk dataset besar.
- Preview tidak mengirim seluruh file kembali ke browser.
- Import besar dipindahkan ke job asynchronous pada fase lanjutan.
- Query assignment menggunakan index tahun ajaran/status.

### 13.3 Accessibility dan responsive

- Semua aksi penting dapat digunakan keyboard.
- Label form eksplisit.
- Status tidak hanya dibedakan melalui warna.
- Tabel berubah menjadi card/list di mobile.
- Error per field dibaca jelas oleh screen reader.

### 13.4 Observability

- Health check mencerminkan status database.
- Import job menyimpan status parse/validation/commit.
- Error server memiliki correlation/reference id pada target lanjutan.
- Dashboard menampilkan import terakhir dan error count.

---

## 14. Acceptance Criteria

### AC-CORE-001 — Master tahun ajaran

- Admin/operator dapat membuat tahun ajaran dengan `code` unik.
- Sistem menolak duplicate code.
- Hanya satu tahun ajaran dapat aktif.
- Menonaktifkan tahun lama tidak menghapus histori assignment/enrollment.

### AC-CORE-002 — Master referensi

- Mapel dengan `kodeJurusan` invalid ditolak.
- Kelas tanpa tahun ajaran valid ditolak.
- Siswa dengan kelas/tahun invalid ditolak.
- Assignment dengan guru/mapel/kelas/tahun invalid ditolak.

### AC-CORE-003 — Import preview

- Upload tidak mengubah master database.
- Header wajib yang hilang menghasilkan error.
- Error ditampilkan dengan nomor baris.
- Duplicate di file terdeteksi sebelum commit.
- Referensi invalid dilaporkan sebelum commit.

### AC-CORE-004 — Import commit

- Commit hanya menerima `jobId` preview yang belum diproses.
- Checksum file harus sama.
- Batch invalid tidak menyimpan baris valid secara diam-diam.
- Batch valid disimpan dalam satu transaction.
- `CoreImportJob` menyimpan total, berhasil, gagal, actor, file, status, dan waktu.
- Audit `IMPORT_COMMIT` tercatat.

### AC-CORE-005 — Idempotency

- Import guru dua kali dengan NIP sama tidak menggandakan guru.
- Import siswa dua kali dengan NISN sama tidak menggandakan siswa.
- Assignment dan enrollment dengan kombinasi kunci sama di-upsert.
- Perubahan data yang diizinkan menghasilkan update dan audit.

### AC-CORE-006 — Assignment guru

- Guru tidak memperoleh akses hanya dengan memilih checkbox.
- Pengajuan guru dapat `DRAFT`, `SUBMITTED`, `NEEDS_REVISION`,
  `REJECTED`, atau `APPROVED`.
- `APPROVED` membuat assignment aktif dalam transaction.
- `REJECTED` dan `NEEDS_REVISION` tidak membuat akses.
- Assignment aktif menjadi dasar scope modul berikutnya.

### AC-CORE-007 — Identity

- User invited tidak memakai password bersama.
- User disabled tidak dapat membuat session.
- User dapat memiliki beberapa role.
- Perubahan role dan status diaudit.

### AC-CORE-008 — Backward compatibility

- Portal publik existing tetap dapat dibuka.
- Admin CMS existing tetap dapat login selama masa transisi.
- Database lama tidak di-reset.
- Migration baru dapat diterapkan tanpa menghapus tabel existing.

---

## 15. Test Plan

### 15.1 Unit test

Parser/validator harus menguji:

- header valid dan header hilang;
- baris kosong;
- whitespace;
- email invalid;
- tanggal invalid;
- duplicate NIP/NISN;
- duplicate assignment;
- status invalid;
- semua jenis referensi invalid;
- file kosong;
- file di atas batas ukuran.

### 15.2 Integration test

Database test harus menguji:

- upsert guru;
- upsert siswa + enrollment;
- upsert assignment;
- satu tahun aktif;
- review approve membuat assignment;
- review reject tidak membuat assignment;
- transaction rollback.

### 15.3 Contract test

Setiap endpoint harus menguji:

- response success envelope;
- response error envelope;
- 401 tanpa session;
- 403 role tidak sesuai;
- field output sesuai consumer UI.

### 15.4 End-to-end smoke test

Skenario minimal:

1. Login admin.
2. Buka `/admin/akademik`.
3. Download template guru.
4. Upload file valid.
5. Lihat preview.
6. Commit.
7. Refresh halaman.
8. Pastikan total guru berubah dan import terakhir tampil.
9. Upload file invalid.
10. Pastikan commit disabled dan database tidak berubah.

---

## 16. Migrasi dari Sistem Existing

### Tahap 0 — Compatibility

- Pertahankan `AdminCredential` dan session existing.
- Tambahkan Core Platform sebagai route/domain baru.
- Jangan mengubah route CMS publik.

### Tahap 1 — Schema

- Apply migration Core Platform.
- Generate Prisma Client.
- Seed role baseline bila diperlukan.
- Verifikasi foreign key, unique index, dan index query.

### Tahap 2 — Master data

- Import tahun ajaran, jurusan, mapel, kelas.
- Validasi sample dan jumlah record dengan operator.

### Tahap 3 — Identity profiles

- Import guru/siswa.
- Buat user invited hanya bila data identity memenuhi aturan.
- Tidak membuat password otomatis yang sama.

### Tahap 4 — Access

- Import assignment/enrollment.
- Integrasikan guard assignment ke modul guru.
- Jalankan pilot satu jurusan atau satu tahun ajaran.

### Tahap 5 — Cutover

- Pindahkan login guru/siswa ke `CoreUser`.
- Pertahankan compatibility admin sampai acceptance sign-off.
- Nonaktifkan credential lama setelah seluruh endpoint admin memakai identity
  baru; jangan langsung menghapus data lama.

---

## 17. Roadmap Implementasi

### Wave 1A — Foundation

- [x] Schema identity dan master akademik.
- [x] Migration PostgreSQL.
- [x] Overview dan master read API.
- [x] Template XLSX.
- [x] Preview/validation.
- [x] Transactional commit.
- [x] Import audit.
- [x] Admin dashboard baseline.

### Wave 1B — Operator operations

- [ ] CRUD manual master data.
- [ ] Pagination dan search master data.
- [ ] Export error report.
- [ ] Audit log UI.
- [ ] Import history/detail.
- [ ] Re-run/recovery policy.

### Wave 1C — Identity

- [ ] Invitation token.
- [ ] Aktivasi akun.
- [ ] Password hash dan reset.
- [ ] Session terhubung ke `CoreUser`.
- [ ] Role/permission middleware.
- [ ] Migrasi admin ke identity baru.

### Wave 1D — Teacher request

- [ ] Portal login pertama guru.
- [ ] Konfirmasi profil.
- [ ] Pemilihan mapel dan kelas dari master.
- [ ] Submit/revisi pengajuan.
- [ ] Notification dan review operator.
- [ ] Assignment scope guard.

### Wave 2 — Consumer modules

- [ ] Portal guru.
- [ ] Portal siswa.
- [ ] LMS.
- [ ] Absensi.
- [ ] Nilai/assessment.
- [ ] Portofolio.

---

## 18. Decision Log

### D-001 — Assignment guru bersifat hybrid

**Keputusan:** Dukung import assignment resmi dan pengajuan guru.  
**Alasan:** Import memberi efisiensi operasional, sedangkan pengajuan memberi
fleksibilitas tanpa membuka akses secara otomatis.

### D-002 — Identifier stabil, bukan nama

**Keputusan:** Relasi menggunakan kode/NIP/NISN dan foreign key internal.  
**Alasan:** Nama dapat berubah; identifier stabil menjaga integritas dan
idempotency.

### D-003 — Template dipisah

**Keputusan:** Satu template untuk satu domain data.  
**Alasan:** Dependency, validasi, error report, dan recovery lebih mudah
dikelola daripada satu workbook besar.

### D-004 — Preview wajib

**Keputusan:** Tidak ada direct upload-to-database.  
**Alasan:** Operator perlu melihat error, duplicate, perubahan, dan referensi
invalid sebelum data menjadi sumber kebenaran.

### D-005 — Tidak menghapus otomatis

**Keputusan:** Baris yang hilang dari file baru tidak langsung dihapus.  
**Alasan:** File import dapat parsial dan penghapusan otomatis berisiko merusak
histori akademik.

### D-006 — Modular monolith dipertahankan

**Keputusan:** Core Platform menjadi domain module dalam repository existing.  
**Alasan:** Meminimalkan risiko migrasi dan mempertahankan kompatibilitas portal
publik, Express, React, dan PostgreSQL yang sudah berjalan.

---

## 19. Definition of Done

Core Platform v1 dianggap selesai jika:

- seluruh acceptance criteria AC-CORE-001 sampai AC-CORE-008 lulus;
- operator dapat melakukan setup delapan template dari kondisi database kosong;
- invalid row tidak pernah tersimpan melalui jalur import;
- import dapat diulang tanpa duplikasi;
- audit dapat menjawab siapa, kapan, file apa, dan hasilnya;
- guru tanpa assignment tidak dapat melihat data kelas;
- guru dengan assignment resmi mendapatkan scope yang benar;
- identity baru dan session server-side sudah aktif;
- portal publik existing tidak mengalami regresi;
- migration, lint, build, contract test, dan smoke test lulus;
- operator sekolah menyetujui sample data dan laporan hasil import.

---

## 20. Lampiran — Checklist Operasional Import

### Sebelum upload

- [ ] Tahun ajaran target sudah ada.
- [ ] Jurusan target sudah ada.
- [ ] Mapel target sudah ada.
- [ ] Kelas target sudah ada.
- [ ] File menggunakan template resmi.
- [ ] Tidak ada password di file.
- [ ] Kode menggunakan identifier canonical.

### Saat preview

- [ ] Header valid.
- [ ] Total baris sesuai ekspektasi.
- [ ] Error referensi kosong.
- [ ] Duplicate ditinjau.
- [ ] Perubahan data ditinjau.
- [ ] Jumlah valid/error dicatat.

### Saat commit

- [ ] File yang di-commit sama dengan file preview.
- [ ] Operator mengonfirmasi hasil.
- [ ] Commit berhasil.
- [ ] Import job berstatus `COMMITTED`.
- [ ] Audit event tersedia.
- [ ] Overview/master di-refresh.

### Setelah commit

- [ ] Sample guru/siswa dapat ditemukan.
- [ ] Assignment memiliki scope yang benar.
- [ ] Enrollment menunjuk kelas dan tahun yang benar.
- [ ] Tidak ada data lama yang hilang tanpa prosedur.
- [ ] Error report disimpan untuk tindak lanjut.
