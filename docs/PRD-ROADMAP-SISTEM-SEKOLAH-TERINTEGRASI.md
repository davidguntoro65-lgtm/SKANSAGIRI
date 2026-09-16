# PRD & Roadmap Final
## Sistem Sekolah Terintegrasi: Portal Publik, LMS AI, Akademik, Absensi, Keuangan, dan Portofolio

**Dokumen:** Product Requirements Document dan roadmap implementasi  
**Versi:** 1.0.0-FINAL  
**Tanggal:** 16 September 2026  
**Status:** Disetujui untuk menjadi baseline implementasi  
**Target platform:** Web responsive  
**Arsitektur:** Modular monolith, satu aplikasi terintegrasi  
**Routing:** Custom router yang sudah digunakan project (Pilihan A)  
**Bahasa antarmuka utama:** Bahasa Indonesia  
**Database:** PostgreSQL melalui Prisma ORM  

---

## 1. Ringkasan Eksekutif

Project saat ini adalah portal publik dan admin panel SMK Negeri 1 Wonogiri. Dokumen ini menetapkan pengembangan project menjadi satu sistem sekolah terintegrasi yang tetap mempertahankan portal publik, tetapi menambahkan fondasi akun, data akademik, dan modul operasional sekolah.

Modul target:

1. Portal publik sekolah.
2. Admin utama dan CMS.
3. Portal guru.
4. Portal siswa.
5. LMS berbasis Kurikulum Merdeka.
6. Assessment dan analisis pembelajaran berbasis AI.
7. Absensi.
8. Keuangan.
9. Portofolio siswa dan guru.
10. Integrasi Google Drive per akun pengguna.
11. Pelaporan, notifikasi, audit, dan pengaturan terpusat.

Sistem dibangun sebagai **modular monolith**:

- satu repository,
- satu aplikasi web,
- satu backend Express,
- satu database PostgreSQL,
- satu sistem identity,
- domain bisnis dipisahkan secara tegas dalam kode dan database.

Microservices, migrasi workspace, dan penggantian stack yang ada **tidak termasuk** dalam baseline ini.

---

## 2. Keputusan Arsitektur yang Dikunci

| Keputusan | Ketetapan |
|---|---|
| Routing | Custom router existing dipertahankan; tidak mengganti seluruh aplikasi dengan router baru |
| Struktur aplikasi | Satu sistem internal terintegrasi dengan modul/domain terpisah |
| Backend | Express + TypeScript tetap digunakan |
| Frontend | React + Vite + TypeScript tetap digunakan |
| Styling | Tailwind CSS dan komponen visual existing dapat digunakan kembali |
| Database | PostgreSQL + Prisma tetap digunakan |
| Penyimpanan data | Semua write operation melalui service backend dan Prisma |
| Identity | Satu sistem user, role, session, dan permission lintas modul |
| File | Abstraksi file storage; Google Drive menjadi provider per user, bukan akun global |
| AI | AI provider diakses melalui service adapter, tidak dipanggil langsung dari komponen UI |
| Vector search | Abstraksi vector store; default awal PostgreSQL + pgvector jika tersedia |
| API | Endpoint baru menggunakan namespace `/api/v1/<domain>/...` |
| Kompatibilitas | Route dan fitur portal publik lama tidak boleh rusak |
| Migrasi | Bertahap, backward-compatible, tanpa menghapus data lama secara langsung |

---

## 3. Tujuan Produk

### 3.1 Tujuan utama

1. Menyediakan satu akun dan satu pengalaman digital untuk warga sekolah.
2. Menghubungkan data siswa, guru, kelas, mapel, dan tahun ajaran ke seluruh modul.
3. Membantu guru mengubah dokumen kurikulum menjadi materi dan struktur pembelajaran yang dapat dipakai.
4. Membantu siswa belajar melalui progres berbasis kompetensi, skill tree, assessment, dan AI tutor.
5. Menyediakan data operasional sekolah yang konsisten untuk absensi, keuangan, dan portofolio.
6. Menyediakan integrasi file pribadi melalui akun Google masing-masing pengguna.
7. Memungkinkan modul baru ditambahkan tanpa membuat sistem login dan database terpisah.

### 3.2 Sasaran pengguna

- Siswa SMK.
- Guru mata pelajaran.
- Wali kelas.
- Operator sekolah.
- Admin sistem.
- Bendahara.
- Kepala sekolah.
- Pengelola konten portal publik.

### 3.3 Non-goals versi baseline

Hal-hal berikut tidak menjadi bagian dari baseline awal:

- Aplikasi mobile native.
- Sistem informasi akademik nasional penuh.
- Payroll dan penggajian pegawai.
- Payment gateway otomatis untuk seluruh jenis tagihan.
- Video conference.
- Marketplace materi.
- Microservices.
- Migrasi ke stack monorepo baru.
- Penggantian database PostgreSQL yang sudah digunakan.

---

## 4. Prinsip Produk dan Teknis

1. **Data identity tunggal:** satu orang tidak boleh memiliki akun berbeda untuk setiap modul.
2. **Server sebagai sumber kebenaran:** status, nilai, XP, akses, dan permission dihitung server-side.
3. **Least privilege:** setiap role hanya mendapatkan data dan tindakan yang dibutuhkan.
4. **Backward compatibility:** portal publik dan admin lama tetap dapat digunakan selama migrasi.
5. **AI membantu, bukan menentukan secara tidak transparan:** scoring objektif dilakukan oleh backend; AI memberikan penjelasan dan rekomendasi.
6. **File tidak disimpan sebagai base64 besar di database:** gunakan storage abstraction dan metadata.
7. **Modul terisolasi secara domain:** perubahan LMS tidak boleh merusak keuangan atau portal publik.
8. **Semua proses panjang memiliki status:** upload, parsing, embedding, dan sinkronisasi tidak boleh bergantung pada request yang tidak terbatas.
9. **Observability sejak awal:** operasi penting memiliki audit log, status, error yang dapat ditelusuri, dan metrik.
10. **Responsive-first:** fungsi utama harus dapat digunakan pada layar mobile, tablet, dan desktop.

---

## 5. Kondisi Existing dan Strategi Kompatibilitas

### 5.1 Existing yang dipertahankan

- Portal publik sekolah.
- Halaman berita, profil, OSIS, tracer study, aduan publik, dan kontak.
- Admin panel existing.
- PostgreSQL dan Prisma 7.
- Session server-side existing selama masa transisi.
- Sistem branding dan tema existing.
- Custom navigation melalui `src/App.tsx` dan `src/utils/navigation.ts`.

### 5.2 Existing yang perlu berevolusi

| Area | Kondisi existing | Target |
|---|---|---|
| Auth | Satu credential admin | User, role, session, permission lintas modul |
| Session | Token session admin | Session terhubung ke user dan role |
| Routing | Hardcoded route publik | Route publik + layout guru/siswa/admin |
| Backend | Banyak logic di `server.ts` | Domain service dan route module |
| Database | CMS dan OSIS | Core identity + domain LMS/operasional |
| File | Image/base64 use case | Storage abstraction dan external file reference |
| AI | Dependency tersedia | AI gateway, RAG, structured output, quota |
| API | `/api/...` | Existing tetap; modul baru `/api/v1/<domain>/...` |

### 5.3 Strategi migrasi admin

1. Tambahkan model `User`, `Role`, dan `UserRole`.
2. Buat satu user admin dari `AdminCredential` existing.
3. Session baru menyimpan `userId` dan role.
4. Endpoint lama tetap mengenali session lama selama periode transisi.
5. Admin panel existing dipindahkan bertahap ke middleware permission baru.
6. `AdminCredential` hanya dipertahankan sampai seluruh alur admin menggunakan user identity.
7. Setelah migrasi tervalidasi, credential lama dinonaktifkan, bukan langsung dihapus.

---

## 6. Peta Modul dan Batas Domain

```text
Sistem Sekolah Terintegrasi
├── Public Portal
│   ├── Homepage
│   ├── Berita
│   ├── Profil sekolah
│   ├── OSIS
│   ├── Tracer study
│   ├── Aduan publik
│   └── Contact
├── Core Platform
│   ├── Identity
│   ├── Role & Permission
│   ├── Session
│   ├── Master Akademik
│   ├── File Storage
│   ├── Audit Log
│   ├── Notification
│   └── Reporting
├── LMS
│   ├── Curriculum Module
│   ├── Ingestion
│   ├── RAG
│   ├── Question Bank
│   ├── Assessment
│   ├── Skill Tree
│   ├── AI Tutor
│   └── Gamification
├── Absensi
├── Keuangan
├── Portofolio
└── Integrations
    └── Google Drive per user
```

Setiap modul wajib memiliki:

- route module,
- service layer,
- validation schema,
- permission policy,
- database model yang jelas,
- audit event untuk tindakan sensitif,
- error contract yang konsisten.

---

## 7. Role dan Permission

### 7.1 Role baseline

| Role | Deskripsi |
|---|---|
| `ADMIN` | Pengaturan sistem, user, role, dan seluruh domain |
| `OPERATOR` | Operasional data akademik dan administrasi sesuai scope |
| `GURU` | Mengelola modul, kelas yang diampu, assessment, dan progres pembelajaran |
| `WALI_KELAS` | Melihat dan mengelola ringkasan kelas yang menjadi tanggung jawabnya |
| `SISWA` | Belajar, mengerjakan assessment, melihat progres, absensi, keuangan milik sendiri, dan portofolio |
| `BENDAHARA` | Mengelola tagihan, pembayaran, dan laporan keuangan |
| `KEPALA_SEKOLAH` | Melihat dashboard agregat dan laporan lintas domain |
| `EDITOR_PUBLIC` | Mengelola konten portal publik tanpa akses ke data privat LMS |

Satu user dapat memiliki beberapa role.

### 7.2 Aturan akses inti

- Siswa hanya dapat membaca dan mengubah data miliknya sendiri, kecuali data yang dipublikasikan.
- Guru hanya dapat mengelola modul dan kelas yang menjadi scope assignment-nya.
- Wali kelas dapat melihat data operasional siswa di kelasnya sesuai permission.
- Bendahara tidak otomatis memiliki akses ke isi chat AI atau portofolio privat.
- Editor publik tidak dapat mengakses data akademik privat.
- Admin dapat mengakses seluruh domain, tetapi semua akses sensitif dicatat.
- `guruId`, `siswaId`, dan `nisn` tidak boleh dipercaya dari body request sebagai identitas caller.

---

## 8. Peta Routing Final

Custom router existing dipertahankan. Route matcher perlu mendukung static segment dan dynamic segment.

### 8.1 Public portal

```text
/
/berita
/tentang/kepala-sekolah
/tentang/manajemen-sekolah
/tentang/visi-misi
/tracer-studi
/hubungi-kami
/modul-integrasi
/suara-skansagiri
/aduan-publik
/osis
```

### 8.2 Admin

```text
/adm-panel
/admin/tracer-studi
/admin/suara-skansagiri
/admin/aduan-publik
/osis/adm-panel
/admin/akademik
/admin/users
/admin/integrations
/admin/audit-log
/admin/reports
```

### 8.3 Guru

```text
/guru
/guru/dashboard
/guru/modul
/guru/modul/upload
/guru/modul/preview/:modulId
/guru/bank-soal
/guru/kelas
/guru/kelas/:kelasId
/guru/assessment
/guru/absensi
/guru/portofolio
/guru/settings
```

### 8.4 Siswa

```text
/siswa
/siswa/dashboard
/siswa/skill-tree
/siswa/learn/:nodeId
/siswa/exam/:nodeId
/siswa/progress
/siswa/absensi
/siswa/keuangan
/siswa/portofolio
/siswa/integrations/google
/siswa/settings
```

### 8.5 Layout

- `PublicLayout`: navbar, footer, theme, public content.
- `AdminLayout`: sidebar admin, permission-aware menu.
- `GuruLayout`: sidebar guru, class/module context.
- `SiswaLayout`: dashboard navigation, progress header, mobile navigation.

---

## 9. Requirement Fungsional

### 9.1 Core identity dan master akademik

#### FR-CORE-001 — User dan role

Sistem harus dapat membuat, menonaktifkan, dan memperbarui user beserta role-nya.

**Acceptance criteria:**

- User memiliki status aktif/nonaktif.
- User dapat memiliki lebih dari satu role.
- User nonaktif tidak dapat membuat session baru.
- Perubahan role dicatat dalam audit log.
- Penghapusan user tidak menghapus histori akademik secara cascading tanpa prosedur khusus.

#### FR-CORE-002 — Profil guru dan siswa

Sistem harus memisahkan identity login dari profil guru/siswa.

**Acceptance criteria:**

- Satu user dapat terhubung ke satu profil guru atau siswa.
- NIP dan NISN unik dalam scope sekolah.
- NISN tidak digunakan sebagai credential utama.
- Data profil memiliki status aktif dan tahun ajaran.

#### FR-CORE-003 — Master akademik

Sistem harus menyediakan data tahun ajaran, jurusan, kelas, mapel, assignment guru, dan enrollment siswa.

**Acceptance criteria:**

- Siswa hanya dapat terdaftar pada kelas yang valid untuk tahun ajaran.
- Guru hanya dapat mengelola mapel/kelas sesuai assignment.
- Perubahan kelas tidak menghapus histori periode sebelumnya.

#### FR-CORE-004 — Session dan permission

Sistem harus menerapkan authentication dan authorization server-side untuk semua endpoint privat.

**Acceptance criteria:**

- Endpoint privat menolak request tanpa session valid.
- Role tidak dapat ditentukan dari parameter URL atau body.
- Session memiliki expiry dan dapat dicabut.
- Logout mencabut session aktif.

### 9.2 LMS guru

#### FR-LMS-GURU-001 — Manajemen modul

Guru dapat membuat, melihat, memperbarui, mengarsipkan, dan menerbitkan modul yang berada dalam scope-nya.

**Acceptance criteria:**

- Modul memiliki mapel, fase, elemen, tahun ajaran, owner, dan status.
- Modul draft tidak tampil kepada siswa.
- Modul archived tidak dapat digunakan untuk assessment baru.
- Semua perubahan penting dicatat.

#### FR-LMS-GURU-002 — Upload dokumen

Guru dapat mengunggah PDF atau DOCX dengan ukuran maksimum 15 MB per file.

**Acceptance criteria:**

- MIME type dan ekstensi divalidasi server-side.
- File yang gagal validasi tidak disimpan.
- Upload menghasilkan job ingestion.
- Response awal menggunakan status `202 Accepted`.
- Guru dapat melihat status job.

#### FR-LMS-GURU-003 — Preview parser

Guru dapat meninjau hasil JSON parser sebelum modul dipublikasikan.

**Acceptance criteria:**

- JSON divalidasi terhadap schema.
- Field fase, mapel, elemen, dan ATP wajib tersedia.
- Guru dapat mengubah hasil ekstraksi.
- Node ATP belum aktif untuk siswa sebelum guru melakukan publish.

#### FR-LMS-GURU-004 — Bank soal

Guru dapat membuat, mengedit, mengarsipkan, dan mengelompokkan soal berdasarkan modul, node, tingkat kesulitan, dan tipe.

**Acceptance criteria:**

- Jawaban benar tidak dikirim ke browser siswa sebelum submission.
- Soal memiliki status draft/published/archived.
- Soal yang telah digunakan menyimpan histori referensi.

### 9.3 LMS siswa

#### FR-LMS-SISWA-001 — Dashboard siswa

Dashboard siswa menampilkan progres, XP, level, streak, node aktif, dan rekomendasi belajar.

**Acceptance criteria:**

- Semua data dihitung dari session siswa.
- Siswa tidak dapat melihat progres siswa lain.
- Data kosong memiliki empty state yang jelas.

#### FR-LMS-SISWA-002 — Skill tree

Sistem menampilkan node ATP dan status pembelajaran siswa.

State resmi:

```text
LOCKED
UNLOCKED
COMPLETED
```

**Acceptance criteria:**

- Status dihitung server-side.
- Prerequisite yang belum terpenuhi mengunci node.
- Desktop mendukung pan, zoom, minimap, dan hover card.
- Mobile menampilkan accordion/list terurut.

#### FR-LMS-SISWA-003 — Assessment

Siswa dapat mengerjakan assessment pada node yang berstatus `UNLOCKED`.

**Acceptance criteria:**

- Attempt disimpan.
- Jawaban disimpan setelah submit.
- Skor objektif dihitung backend.
- Nilai minimum kelulusan baseline adalah 75 dan dapat dikonfigurasi per assessment.
- Siswa dapat melihat feedback setelah submission sesuai aturan ujian.

#### FR-LMS-SISWA-004 — Progress dan XP

Sistem memperbarui progres dan reward secara idempotent.

**Acceptance criteria:**

- Completion pertama pada node memberi XP sesuai konfigurasi.
- Retry tidak menggandakan reward completion.
- Skor terbaik, skor terakhir, dan histori attempt dapat dibedakan.
- Aturan remedial terdokumentasi dan konsisten.

### 9.4 AI dan RAG

#### FR-AI-001 — Ingestion pipeline

Pipeline harus mengikuti urutan:

```text
Upload
→ Text extraction/OCR
→ LLM structured parsing
→ Human preview
→ Publish
→ Chunking
→ Embedding
→ Vector index
```

**Acceptance criteria:**

- Setiap tahap memiliki status dan error message.
- Job dapat di-retry tanpa membuat duplikasi data.
- Dokumen gagal tidak dianggap indexed.
- Guru dapat melihat tahap terakhir yang berhasil.

#### FR-AI-002 — Socratic tutor

Siswa dapat melakukan chat kontekstual berdasarkan node dan materi yang diizinkan.

**Acceptance criteria:**

- Retrieval dibatasi maksimal 3 chunk relevan.
- Input context dibatasi maksimal 1.200 token sebelum prompt system.
- AI diarahkan untuk membimbing, bukan langsung memberikan seluruh jawaban.
- Chat tersimpan pada session node milik siswa.
- Sistem memiliki rate limit dan batas penggunaan.

#### FR-AI-003 — Deep explainer

Setelah assessment, sistem dapat menghasilkan analisis terstruktur.

Output minimum:

```json
{
  "soalId": "string",
  "isCorrect": false,
  "userAnswer": "B",
  "correctAnswer": "C",
  "aiAnalysis": {
    "miskonsepsi": "string",
    "penjelasanKonsep": "string",
    "referensiKurikulum": {
      "kodeTp": "string",
      "halamanModul": 4,
      "kutipanMateri": "string"
    },
    "rekomendasiAksi": "string"
  }
}
```

**Acceptance criteria:**

- Output divalidasi schema.
- Skor tidak bergantung pada keberhasilan AI.
- Jika AI gagal, hasil benar/salah tetap tersedia.
- Referensi AI hanya berasal dari context yang berhasil diambil.

### 9.5 Google Drive dan portofolio

#### FR-DRIVE-001 — OAuth per user

Setiap guru dan siswa dapat menghubungkan akun Google-nya sendiri.

**Acceptance criteria:**

- OAuth menggunakan state yang tervalidasi.
- Token disimpan terenkripsi server-side.
- Token tidak pernah dikirim kembali ke client.
- User dapat disconnect.
- Sistem mendeteksi token expired/revoked dan meminta reconnect.

#### FR-DRIVE-002 — File reference

Sistem dapat menyimpan referensi file Google Drive tanpa menggandakan isi file secara default.

**Acceptance criteria:**

- Metadata file menyimpan provider file ID, MIME type, nama, dan owner.
- Akses file diverifikasi melalui koneksi user.
- File yang tidak lagi dapat diakses ditandai broken/requires reconnect.
- Permission portofolio tidak sama dengan permission Drive secara otomatis.

#### FR-PORT-001 — Portofolio siswa dan guru

User dapat membuat item portofolio dengan deskripsi, kategori, file, status review, dan visibility.

Visibility baseline:

```text
PRIVATE
CLASS
SCHOOL
PUBLIC
```

**Acceptance criteria:**

- Default visibility adalah `PRIVATE`.
- Guru hanya dapat mereview portofolio pada scope yang diizinkan.
- Item dapat menggunakan file Google Drive atau storage internal.
- Penghapusan file eksternal tidak menghapus histori metadata portofolio.

### 9.6 Absensi

#### FR-ATT-001 — Jadwal dan sesi absensi

Guru dapat membuat sesi absensi berdasarkan kelas, mapel, tanggal, dan jam.

#### FR-ATT-002 — Detail kehadiran

Status baseline:

```text
HADIR
IZIN
SAKIT
ALPA
TERLAMBAT
```

#### FR-ATT-003 — Rekap

- Siswa melihat histori miliknya.
- Guru melihat kelas yang diampu.
- Wali kelas melihat rekap kelas.
- Kepala sekolah melihat agregat.

### 9.7 Keuangan

#### FR-FIN-001 — Jenis dan tagihan

Bendahara dapat membuat jenis tagihan, periode, nominal, tanggal jatuh tempo, dan status tagihan siswa.

#### FR-FIN-002 — Pembayaran

Pembayaran harus menyimpan nominal, waktu, metode, bukti, dan status verifikasi.

#### FR-FIN-003 — Privasi

- Siswa/wali hanya melihat data tagihan miliknya.
- Guru tidak otomatis melihat detail keuangan.
- Laporan agregat dapat dilihat role yang ditentukan.
- Semua perubahan pembayaran dicatat.

---

## 10. Model Domain Canonical

### 10.1 Core identity

```text
User
Role
UserRole
Session
AuditLog
Notification
```

### 10.2 Master akademik

```text
Guru
Siswa
Jurusan
Kelas
TahunAjaran
Mapel
GuruMapel
KelasSiswa
WaliKelas
Jadwal
```

### 10.3 LMS

```text
KurikulumModul
ModulAsset
NodeATP
NodePrerequisite
VectorChunk
IngestionJob
BankSoal
Assessment
AssessmentQuestion
AssessmentAttempt
AssessmentAnswer
ProgresSiswa
XPEvent
AIMemorySession
AIInteraction
```

### 10.4 Absensi

```text
AttendanceSession
AttendanceRecord
```

### 10.5 Keuangan

```text
FeeType
StudentCharge
Payment
PaymentVerification
```

### 10.6 Portofolio

```text
Portfolio
PortfolioItem
PortfolioAsset
PortfolioReview
PortfolioPermission
```

### 10.7 Integrasi

```text
ExternalAccount
GoogleDriveFile
IntegrationSyncJob
```

### 10.8 Aturan schema

- Gunakan foreign key pada relasi internal.
- Jangan menggunakan NISN sebagai satu-satunya foreign key di semua tabel.
- Simpan `externalId` untuk sumber data akademik eksternal jika diperlukan.
- Semua entitas bisnis yang memiliki histori tidak boleh dihapus secara cascading tanpa kebijakan eksplisit.
- Field status menggunakan enum atau validasi terpusat.
- PII tidak boleh dimasukkan ke log aplikasi biasa.
- Vector embedding menggunakan pgvector atau provider vector yang dipilih; `Bytes` bukan default pencarian cosine.

---

## 11. Kontrak API

### 11.1 Konvensi umum

```text
/api/v1/<domain>/<resource>
```

Response sukses:

```json
{
  "success": true,
  "data": {},
  "meta": {}
}
```

Response error:

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

### 11.2 Endpoint core

```text
GET    /api/v1/me
POST   /api/v1/auth/login
POST   /api/v1/auth/logout
GET    /api/v1/auth/session
POST   /api/v1/auth/change-password
```

### 11.3 Endpoint akademik

```text
GET    /api/v1/akademik/tahun-ajaran
GET    /api/v1/akademik/kelas
GET    /api/v1/akademik/mapel
GET    /api/v1/akademik/guru/:guruId/classes
GET    /api/v1/akademik/siswa/:siswaId
```

### 11.4 Endpoint guru/LMS

```text
GET    /api/v1/lms/guru/dashboard
GET    /api/v1/lms/guru/modul
POST   /api/v1/lms/guru/modul/ingest
GET    /api/v1/lms/guru/modul/:modulId
GET    /api/v1/lms/guru/modul/:modulId/preview
PATCH  /api/v1/lms/guru/modul/:modulId/preview
POST   /api/v1/lms/guru/modul/:modulId/publish
GET    /api/v1/lms/guru/ingestion/:jobId
GET    /api/v1/lms/guru/bank-soal
POST   /api/v1/lms/guru/bank-soal
PATCH  /api/v1/lms/guru/bank-soal/:soalId
```

`guruId` tidak dikirim sebagai sumber identitas utama; server mengambilnya dari session.

### 11.5 Endpoint siswa/LMS

```text
GET    /api/v1/lms/siswa/dashboard
GET    /api/v1/lms/siswa/skill-tree/:mapelId
GET    /api/v1/lms/siswa/node/:nodeId
GET    /api/v1/lms/siswa/exam/:nodeId
POST   /api/v1/lms/siswa/exam/:nodeId/attempt
POST   /api/v1/lms/siswa/attempt/:attemptId/submit
GET    /api/v1/lms/siswa/progress
POST   /api/v1/lms/siswa/chat/socratic
GET    /api/v1/lms/siswa/ai-sessions/:nodeId
```

Identitas siswa diambil dari session, bukan dari `nisn` pada body request.

### 11.6 Endpoint Google Drive

```text
GET    /api/v1/integrations/google/connect
GET    /api/v1/integrations/google/callback
GET    /api/v1/integrations/google/status
GET    /api/v1/integrations/google/drive/files
POST   /api/v1/integrations/google/disconnect
```

### 11.7 Endpoint portofolio

```text
GET    /api/v1/portfolio
POST   /api/v1/portfolio
GET    /api/v1/portfolio/:portfolioId
PATCH  /api/v1/portfolio/:portfolioId
DELETE /api/v1/portfolio/:portfolioId
POST   /api/v1/portfolio/:portfolioId/assets
POST   /api/v1/portfolio/:portfolioId/review
```

### 11.8 Endpoint absensi dan keuangan

```text
GET    /api/v1/attendance/sessions
POST   /api/v1/attendance/sessions
PATCH  /api/v1/attendance/sessions/:id
GET    /api/v1/attendance/student/:studentId

GET    /api/v1/finance/charges
POST   /api/v1/finance/charges
GET    /api/v1/finance/payments
POST   /api/v1/finance/payments
POST   /api/v1/finance/payments/:id/verify
```

---

## 12. Ingestion dan AI Architecture

### 12.1 Status ingestion

```text
QUEUED
UPLOADING
EXTRACTING
PARSING
NEEDS_REVIEW
PUBLISHED
CHUNKING
EMBEDDING
INDEXED
FAILED
```

### 12.2 Pipeline

```text
PDF/DOCX upload
    ↓
File validation and storage
    ↓
Text extraction
    ↓
OCR fallback when required
    ↓
Structured LLM parsing
    ↓
Zod/JSON schema validation
    ↓
Guru preview and correction
    ↓
Publish module and ATP nodes
    ↓
Chunk length target: 400 tokens
Overlap target: 10%
    ↓
Embedding
    ↓
Vector index
```

### 12.3 AI safety and reliability

- Provider key hanya tersedia di server.
- Prompt system disimpan versioned.
- AI output harus divalidasi.
- AI response diberi timeout.
- Retry menggunakan batas maksimum.
- Error provider tidak boleh menghapus jawaban atau nilai yang sudah tersimpan.
- Semua interaction AI dapat diberi `model`, `promptVersion`, `latencyMs`, dan token usage untuk observability.
- Data chat siswa tidak digunakan untuk training eksternal tanpa kebijakan dan persetujuan yang jelas.

### 12.4 Semantic cache

Cache hanya digunakan jika:

- context dan permission user setara,
- query berada dalam domain/node yang sama,
- cache belum expired,
- response tidak mengandung data privat siswa lain.

Exact hash SHA-256 dapat digunakan untuk cache exact match. Semantic cache membutuhkan embedding query dan vector similarity; hash saja tidak dapat menghasilkan semantic similarity.

---

## 13. Google Drive Integration Specification

### 13.1 Prinsip

- OAuth per user.
- Scope minimum.
- Token server-side.
- Refresh token terenkripsi.
- Tidak ada global Google Drive account untuk semua user.
- Disconnect menghapus credential lokal, tetapi tidak menghapus file user.

### 13.2 Lifecycle

```text
NOT_CONNECTED
CONNECTED
TOKEN_EXPIRED
REQUIRES_REAUTH
DISCONNECTED
```

### 13.3 Minimum data connection

```text
userId
provider
providerSubject
email
encryptedAccessToken
encryptedRefreshToken
expiresAt
scopes
status
lastVerifiedAt
connectedAt
disconnectedAt
```

### 13.4 Security requirements

- Validasi OAuth `state`.
- Validasi issuer dan audience token.
- Jangan menyimpan access token pada localStorage.
- Jangan log token.
- Encrypt token at rest.
- Revoke atau hapus token ketika user disconnect.
- Refresh token hanya digunakan server-side.
- Setiap file access diverifikasi berdasarkan `userId` dan permission domain.

---

## 14. UI dan Responsive Requirements

| Fitur | Desktop (>=1024px) | Tablet (768–1023px) | Mobile (<768px) |
|---|---|---|---|
| Guru upload | Split workspace 40/60 | Vertical stack | Tab upload/preview |
| Guru dashboard | Sidebar + metrics + table | Collapsible sidebar | Card/list |
| Skill tree | Canvas pan/zoom/minimap | SVG graph | Accordion/list |
| Learning | Reader kiri + chat kanan | Vertical split | Chat penuh + drawer materi |
| Exam | Soal kiri + feedback kanan | Tab soal/analisis | Bottom sheet |
| Absensi | Table + filters | Horizontal scroll/table card | Per siswa/per hari |
| Keuangan | Summary + table | Card + table | Summary + detail |
| Portofolio | Grid + review panel | Grid 2 kolom | Single column |

### UI quality gates

- Semua route memiliki loading, error, dan empty state.
- Semua form memiliki validasi client dan server.
- Navigasi keyboard dasar tersedia.
- Kontras teks memenuhi standar aksesibilitas yang wajar.
- Tidak ada data privat ditampilkan sebelum permission selesai diverifikasi.
- Mobile tidak bergantung pada hover.

---

## 15. Security, Privacy, dan Compliance Baseline

### Wajib

- Password menggunakan Argon2id atau bcrypt.
- Session memiliki expiry dan revocation.
- Rate limit login dan endpoint AI.
- Validasi input menggunakan schema.
- Validasi MIME dan ukuran file.
- Security headers dipertahankan.
- PII tidak ditulis ke log biasa.
- Audit log untuk perubahan role, nilai, absensi, pembayaran, dan koneksi eksternal.
- Authorization dilakukan pada setiap request privat.
- NISN tidak diletakkan pada URL.
- Google token terenkripsi.
- Database backup dan restore diuji.
- Data siswa memiliki retention policy.

### Data sensitif

Kategori data yang perlu perlindungan lebih tinggi:

- NISN, NIP, kontak.
- Nilai dan jawaban assessment.
- Riwayat AI chat.
- Absensi.
- Tagihan dan pembayaran.
- File portofolio.
- Google OAuth token.

---

## 16. Non-functional Requirements dan SLA

### Performance target

| Area | Target |
|---|---|
| Initial portal page | p95 <= 3 detik pada koneksi normal |
| Skill tree API | p95 <= 500 ms untuk dataset kelas normal |
| Exact AI cache hit | p95 <= 300 ms |
| Socratic response | p95 <= 2,5 detik jika provider tersedia |
| Upload acknowledgment | <= 2 detik setelah validasi |
| Ingestion | asynchronous; p95 <= 15 detik untuk dokumen target yang disepakati |
| API error response | p95 <= 1 detik untuk error validasi/auth |

Target ingestion 15 detik berlaku untuk dokumen dengan batas halaman dan ukuran yang ditetapkan. Jika melewati batas, sistem tetap harus memberikan status job yang dapat dipantau, bukan menunggu request tanpa batas.

### Reliability

- Tidak ada data hilang ketika provider AI gagal.
- Job dapat dilanjutkan atau diulang.
- Write penting menggunakan transaksi.
- Reward XP idempotent.
- Pembayaran dan perubahan nilai memiliki audit trail.

### Observability

Minimum metrik:

- login success/failure,
- request latency,
- error rate,
- ingestion duration,
- ingestion failure rate,
- embedding duration,
- AI latency,
- AI provider error,
- cache hit rate,
- Google token refresh failure,
- attendance/payment update count.

---

## 17. Roadmap Implementasi Final

### Asumsi roadmap

- Satu sprint = dua minggu.
- Urutan berikut adalah baseline sequencing, bukan janji kalender.
- Paralelisasi dapat memperpendek durasi, tetapi tidak boleh menghilangkan quality gate.
- Setiap fase menghasilkan perubahan yang dapat diverifikasi.

---

### Wave 0 — Arsitektur dan kontrak

#### Sprint 0 — Finalisasi baseline teknis

**Durasi:** 1 sprint  
**Dependensi:** tidak ada

**Deliverables:**

- Dokumen PRD ini menjadi baseline.
- Domain boundary dan naming convention.
- API error contract.
- Role/permission matrix.
- Keputusan sumber master data akademik.
- Keputusan storage abstraction.
- Keputusan vector storage.
- Keputusan provider AI.
- Rencana migrasi admin existing.

**Exit criteria:**

- Tidak ada domain baru yang menggunakan identity berbeda.
- Semua modul memiliki owner dan permission.
- Risiko data source dan Google OAuth sudah dicatat.

---

### Wave 1 — Core platform

#### Sprint 1–2 — Identity, session, dan role

**Durasi:** 2 sprint  
**Dependensi:** Sprint 0

**Deliverables:**

- `User`, `Role`, `UserRole`, `Session`.
- Password hashing.
- Login/logout/session verification.
- Permission middleware.
- Migration admin existing.
- Endpoint `/api/v1/me`.
- Audit event untuk login dan role change.

**Exit criteria:**

- Admin lama tetap dapat login.
- User nonaktif ditolak.
- Role tidak dapat dipalsukan dari client.
- Existing public pages tetap berjalan.

#### Sprint 3 — Master akademik

**Durasi:** 1 sprint  
**Dependensi:** Sprint 1–2

**Deliverables:**

- Guru, siswa, kelas, jurusan, mapel, tahun ajaran.
- Assignment guru-mapel.
- Enrollment siswa-kelas.
- Wali kelas.
- Seed data development.

**Exit criteria:**

- Siswa dan guru dapat ditemukan berdasarkan identity.
- Query scope kelas/mapel dapat diuji.
- Histori tahun ajaran tidak tertimpa.

#### Sprint 4 — Layout dan custom routing terintegrasi

**Durasi:** 1 sprint  
**Dependensi:** Sprint 1–3

**Deliverables:**

- Route matcher static/dynamic.
- `GuruLayout`, `SiswaLayout`, `AdminLayout`.
- Route guard dan role guard.
- Navigation menu berbasis permission.
- Loading/error/empty state dasar.

**Exit criteria:**

- `/guru` dan `/siswa` dapat dibuka sesuai role.
- User yang salah role mendapat redirect/403.
- Portal lama tidak mengalami regresi route.

**Gate 1 — Core platform ready**

Tidak boleh memulai fitur LMS privat sebelum Gate 1 terpenuhi.

---

### Wave 2 — LMS content dan ingestion

#### Sprint 5 — Modul kurikulum dan asset

**Durasi:** 1 sprint  
**Dependensi:** Gate 1

**Deliverables:**

- `KurikulumModul`.
- `ModulAsset`.
- Status draft/processing/review/published/archived.
- List/detail modul guru.
- Permission owner dan assignment.

**Exit criteria:**

- Guru tidak dapat mengakses modul di luar scope.
- Modul draft tidak tampil ke siswa.

#### Sprint 6–7 — Upload dan ingestion job

**Durasi:** 2 sprint  
**Dependensi:** Sprint 5

**Deliverables:**

- Multipart upload PDF/DOCX.
- File validation.
- Storage adapter.
- `IngestionJob`.
- Status pipeline.
- Retry dan failure handling.
- Text extraction dasar.

**Exit criteria:**

- File invalid ditolak sebelum diproses.
- Job asynchronous.
- Status dapat dipantau.
- Retry tidak menggandakan modul.

#### Sprint 8 — Structured parser dan preview ATP

**Durasi:** 1 sprint  
**Dependensi:** Sprint 6–7

**Deliverables:**

- JSON schema KurikulumModulParsed.
- LLM parser adapter.
- Validasi structured output.
- Preview tree.
- Edit hasil ekstraksi.
- Publish flow.

**Exit criteria:**

- Guru dapat memperbaiki hasil parser.
- Node ATP hanya aktif setelah publish.
- Error schema tampil sebagai error yang dapat ditindaklanjuti.

**Gate 2 — Content ingestion ready**

Pada gate ini guru sudah dapat mengunggah dan memvalidasi modul tanpa AI tutor siswa.

---

### Wave 3 — Assessment dan siswa

#### Sprint 9–10 — Bank soal dan assessment engine

**Durasi:** 2 sprint  
**Dependensi:** Gate 2

**Deliverables:**

- `BankSoal`.
- `Assessment`.
- `AssessmentQuestion`.
- `AssessmentAttempt`.
- `AssessmentAnswer`.
- Scoring deterministic.
- Draft/published/archived question.

**Exit criteria:**

- Correct answer tidak bocor ke client sebelum submit.
- Attempt dapat diulang.
- Skor tersimpan permanen.
- Skor terbaik dan terakhir dapat dibedakan.

#### Sprint 11 — Progress, prerequisite, dan XP

**Durasi:** 1 sprint  
**Dependensi:** Sprint 9–10

**Deliverables:**

- `NodeATP`.
- `NodePrerequisite`.
- `ProgresSiswa`.
- `XPEvent`.
- State machine LOCKED/UNLOCKED/COMPLETED.
- Reward idempotency.

**Exit criteria:**

- Node terkunci jika prerequisite belum memenuhi syarat.
- Nilai >= 75 dapat mengubah status sesuai aturan.
- XP tidak terduplikasi pada retry.

#### Sprint 12 — Portal siswa dan skill tree

**Durasi:** 1 sprint  
**Dependensi:** Sprint 11

**Deliverables:**

- Dashboard siswa.
- Skill tree desktop.
- Accordion mobile.
- Progress summary.
- Exam flow responsive.

**Exit criteria:**

- Siswa hanya melihat data milik sendiri.
- Desktop/tablet/mobile memenuhi matrix UI.
- Loading, empty, error state tersedia.

**Gate 3 — LMS deterministic ready**

LMS sudah dapat digunakan tanpa ketergantungan pada AI generatif.

---

### Wave 4 — AI dan RAG

#### Sprint 13 — Chunking, embedding, dan retrieval

**Durasi:** 1 sprint  
**Dependensi:** Gate 3

**Deliverables:**

- `VectorChunk`.
- Chunking 400 token dengan overlap 10% sebagai default.
- Embedding adapter.
- Vector store adapter.
- Top-3 retrieval.
- Metadata source page/kode TP.

**Exit criteria:**

- Modul published dapat di-index.
- Retrieval mengembalikan source yang dapat ditelusuri.
- Modul belum indexed tidak digunakan sebagai context.

#### Sprint 14 — Socratic tutor

**Durasi:** 1 sprint  
**Dependensi:** Sprint 13

**Deliverables:**

- `AIMemorySession`.
- Chat service.
- Prompt Socratic.
- Rate limit.
- Context token budget.
- Suggested prompts.

**Exit criteria:**

- Chat hanya menggunakan context yang diizinkan.
- Chat gagal tidak merusak progres siswa.
- Chat siswa tidak tercampur dengan siswa lain.

#### Sprint 15 — Deep explainer dan semantic cache

**Durasi:** 1 sprint  
**Dependensi:** Sprint 14

**Deliverables:**

- Structured AI feedback.
- Miskonsepsi dan rekomendasi aksi.
- Exact cache.
- Semantic cache bila vector infrastructure siap.
- AI observability.

**Exit criteria:**

- Nilai objektif tetap tersedia tanpa AI.
- AI response tervalidasi.
- Cache tidak membocorkan context privat.

**Gate 4 — AI LMS ready**

AI tersedia sebagai lapisan bantuan yang dapat gagal dengan aman, bukan single point of failure penilaian.

---

### Wave 5 — Google Drive dan portofolio

#### Sprint 16 — Google OAuth per user

**Durasi:** 1 sprint  
**Dependensi:** Gate 1

**Deliverables:**

- OAuth connect/callback.
- State validation.
- Encrypted token storage.
- Status connected/expired/disconnected.
- Disconnect flow.

**Exit criteria:**

- Dua user dapat menghubungkan akun Google berbeda.
- Token tidak muncul di browser atau log.
- Reconnect dapat dilakukan setelah revoke.

#### Sprint 17 — Drive file browser dan portofolio

**Durasi:** 1 sprint  
**Dependensi:** Sprint 16

**Deliverables:**

- File listing dengan scope minimum.
- `Portfolio`, `PortfolioItem`, `PortfolioAsset`.
- Visibility.
- Review guru.
- Broken file state.

**Exit criteria:**

- Siswa hanya dapat memilih file dari koneksi miliknya.
- Guru hanya melihat portofolio sesuai scope.
- Disconnect tidak menghapus histori portofolio.

**Gate 5 — Personal files ready**

Google Drive dan portofolio siap digunakan tanpa akun global bersama.

---

### Wave 6 — Operasional sekolah

#### Sprint 18–19 — Absensi

**Durasi:** 2 sprint  
**Dependensi:** Master akademik dan identity

**Deliverables:**

- Jadwal.
- Attendance session.
- Attendance record.
- Input guru.
- Riwayat siswa.
- Rekap wali kelas.
- Export laporan.

**Exit criteria:**

- Scope guru/wali kelas benar.
- Koreksi absensi tercatat.
- Laporan per siswa, kelas, mapel, dan periode tersedia.

#### Sprint 20–22 — Keuangan

**Durasi:** 3 sprint  
**Dependensi:** Identity dan master siswa

**Deliverables:**

- Jenis tagihan.
- Tagihan per siswa/periode.
- Input pembayaran.
- Upload bukti.
- Verifikasi bendahara.
- Ringkasan siswa.
- Laporan agregat.

**Exit criteria:**

- Role non-keuangan tidak dapat membuka detail privat.
- Pembayaran tidak dapat diverifikasi dua kali tanpa audit.
- Total tagihan dan pembayaran konsisten.
- Koreksi memiliki alasan dan histori.

**Gate 6 — Operational modules ready**

Absensi dan keuangan dapat digunakan dengan permission, audit, dan laporan yang memadai.

---

### Wave 7 — Hardening dan release

#### Sprint 23–24 — Security, performance, dan release readiness

**Durasi:** 2 sprint  
**Dependensi:** Gate 4, Gate 5, Gate 6

**Deliverables:**

- Security review.
- Authorization matrix test.
- Migration rehearsal.
- Backup/restore test.
- Load test endpoint utama.
- Mobile regression.
- Error monitoring.
- Deployment runbook.
- User guide singkat.

**Exit criteria:**

- Tidak ada critical/high authorization finding yang terbuka.
- Migration dapat dijalankan pada database salinan.
- Restore database berhasil diuji.
- Semua gate sebelumnya tetap lulus.
- Rollback procedure tersedia.

---

## 18. Release Strategy

### Release 1 — Core + LMS deterministic

Termasuk:

- identity,
- master akademik,
- portal guru,
- portal siswa,
- upload modul,
- parser preview,
- bank soal,
- assessment,
- progres,
- skill tree.

### Release 2 — AI learning

Termasuk:

- RAG,
- Socratic tutor,
- deep explainer,
- AI memory,
- cache dan observability.

### Release 3 — Personal files dan portofolio

Termasuk:

- Google OAuth per user,
- Drive file browser,
- portofolio siswa,
- portofolio guru,
- review dan visibility.

### Release 4 — Operasional

Termasuk:

- absensi,
- rekap,
- keuangan,
- pembayaran,
- laporan,
- audit dan hardening lanjutan.

---

## 19. Quality Gates

Setiap feature dianggap selesai hanya jika:

1. UI tersedia untuk role yang relevan.
2. Endpoint memiliki validasi server-side.
3. Permission diuji untuk role yang diizinkan dan ditolak.
4. Data persistence menggunakan Prisma.
5. Loading, empty, error, dan success state tersedia.
6. Tidak ada identitas user yang dipercaya dari body request.
7. Audit event tersedia untuk operasi sensitif.
8. Responsive layout diuji pada desktop, tablet, dan mobile.
9. Migration dapat dijalankan ulang pada database salinan.
10. Tidak merusak route portal existing.

---

## 20. Risiko dan Mitigasi

| Risiko | Dampak | Mitigasi |
|---|---|---|
| Sumber data akademik belum siap | Tinggi | Tetapkan kontrak master data di Wave 0 |
| Schema terlalu besar sejak awal | Tinggi | Migrasi per bounded context |
| Auth lama bercampur dengan auth baru | Tinggi | Unified session dengan compatibility layer |
| AI provider lambat/gagal | Sedang | Scoring deterministic, async explainer, retry |
| Vector provider tidak tersedia | Tinggi | Gunakan vector adapter dan fallback yang jelas |
| File besar membebani server | Tinggi | Storage abstraction, size limit, async job |
| Google token dicabut user | Sedang | Status reauth dan broken file state |
| Data keuangan terbuka ke role salah | Tinggi | Permission matrix dan authorization test |
| Custom router semakin sulit dirawat | Sedang | Route registry dan layout/module separation |
| Migrasi admin merusak portal lama | Tinggi | Backward-compatible migration dan rollback |
| Scope project melebar | Tinggi | Ikuti release wave dan gate; jangan mengerjakan semua modul paralel |

---

## 21. Keputusan yang Harus Ditutup Sebelum Sprint 0 Selesai

1. Apakah master siswa/guru berasal dari database internal atau sistem eksternal?
2. Provider PostgreSQL yang dipakai mendukung `pgvector` atau perlu vector database terpisah?
3. Provider AI final dan batas budget per bulan.
4. Storage internal untuk file non-Google Drive.
5. Scope Google Drive minimum yang disetujui.
6. Kebijakan retention chat AI dan data siswa.
7. Aturan remedial dan skor yang digunakan untuk completion.
8. Aturan streak dan XP.
9. Apakah wali/orang tua akan menjadi role pada fase lanjutan.
10. Metode pembayaran keuangan pada fase pertama.

Keputusan yang belum tertutup tidak boleh diselesaikan dengan asumsi diam-diam di kode. Harus dicatat sebagai decision record.

---

## 22. Definition of Done Produk Baseline

Sistem dianggap siap untuk pilot internal apabila:

- admin, guru, dan siswa dapat login melalui identity yang sama;
- guru dapat mengunggah dan memvalidasi modul;
- siswa dapat melihat skill tree dan mengerjakan assessment;
- progres dan XP tersimpan konsisten;
- AI tutor dapat digunakan dengan fallback aman;
- dua user dapat menghubungkan akun Google berbeda;
- portofolio dapat mereferensikan file Drive;
- absensi dasar dapat dicatat dan direkap;
- tagihan dan pembayaran dasar dapat dikelola role keuangan;
- permission lintas role telah diuji;
- portal publik existing tetap berjalan;
- backup, restore, audit, dan rollback dasar telah diverifikasi.

---

## 23. Referensi Implementasi Project Saat Ini

File yang menjadi titik integrasi utama:

```text
src/App.tsx
src/utils/navigation.ts
src/db.ts
src/dataStore.ts
src/components/AdminPanel.tsx
server.ts
prisma/schema.prisma
prisma/migrations/
vite.config.ts
package.json
replit.md
```

Aturan implementasi:

- Tidak memindahkan project ke workspace baru.
- Tidak mengganti Express + React monorepo.
- Tidak menghapus model portal publik tanpa migration plan.
- Tidak menyimpan token atau secret di source code.
- Tidak membuat akun Google global untuk semua siswa/guru.
- Tidak membuat modul baru dengan sistem login terpisah.

---

## 24. Status Dokumen

Dokumen ini menjadi baseline final untuk:

- perencanaan database,
- breakdown task,
- implementasi frontend,
- implementasi backend,
- integrasi AI,
- integrasi Google Drive,
- acceptance testing,
- dan evaluasi perubahan scope.

Perubahan terhadap keputusan arsitektur, identity, data ownership, atau strategi storage harus dibuat sebagai revisi PRD/decision record sebelum implementasi dilanjutkan.