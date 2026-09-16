# Roadmap Implementasi Final
## Sistem Sekolah Terintegrasi

**Versi:** 1.0.0-FINAL  
**Tanggal:** 16 September 2026  
**Status:** Baseline implementasi  
**PRD utama:** `docs/PRD-ROADMAP-SISTEM-SEKOLAH-TERINTEGRASI.md`  
**Arsitektur:** Modular monolith  
**Routing:** Custom router existing  
**Satuan waktu:** 1 sprint = 2 minggu  

---

## 1. Tujuan Roadmap

Roadmap ini mengubah PRD final menjadi urutan delivery yang dapat dikerjakan, diverifikasi, dan dirilis secara bertahap.

Urutan dibuat untuk memastikan:

1. Identity dan permission selesai sebelum fitur privat LMS dibuat.
2. Master data akademik menjadi sumber data bersama untuk LMS, absensi, keuangan, dan portofolio.
3. LMS deterministic dapat digunakan tanpa bergantung pada AI.
4. AI ditambahkan setelah data kurikulum dan assessment stabil.
5. Integrasi Google Drive memakai akun masing-masing guru/siswa.
6. Portal publik existing tetap berjalan selama seluruh migrasi.
7. Modul absensi dan keuangan tidak membuat sistem login atau database terpisah.

Roadmap ini adalah sequencing teknis dan produk. Durasi aktual dapat berubah berdasarkan jumlah engineer, keputusan provider, dan kesiapan data akademik.

---

## 2. Prinsip Delivery

- Satu repository dan satu aplikasi tetap dipertahankan.
- Semua write operation menggunakan service backend dan Prisma.
- Semua modul baru menggunakan identity dan permission bersama.
- Tidak ada fitur privat yang hanya dilindungi oleh pengecekan di frontend.
- Tidak ada migration destructive tanpa backup dan rollback plan.
- Setiap sprint menghasilkan perubahan yang dapat diuji.
- Setiap fase memiliki exit criteria.
- Fase berikutnya tidak dimulai jika gate keamanan/data pada fase sebelumnya belum lulus.
- Fitur AI tidak boleh menjadi single point of failure untuk nilai atau progres siswa.

---

## 3. Target Release

### Release 1 — Core Platform dan LMS Deterministic

Mencakup:

- identity,
- user dan role,
- master data akademik,
- portal guru,
- portal siswa,
- upload modul,
- parser preview,
- Node ATP,
- bank soal,
- assessment,
- progres,
- skill tree,
- XP dasar.

### Release 2 — AI Learning

Mencakup:

- chunking,
- embedding,
- vector retrieval,
- Socratic tutor,
- deep explainer,
- AI memory,
- semantic/exact cache,
- AI observability.

### Release 3 — Google Drive dan Portofolio

Mencakup:

- OAuth Google per user,
- koneksi dan disconnect,
- browser file Drive,
- portofolio siswa,
- portofolio guru,
- review,
- visibility,
- broken file state.

### Release 4 — Operasional Sekolah

Mencakup:

- jadwal,
- absensi,
- rekap absensi,
- jenis tagihan,
- tagihan siswa,
- pembayaran,
- verifikasi,
- laporan,
- audit dan hardening.

---

## 4. Ringkasan Sprint

| Sprint | Fokus | Output utama | Gate |
|---|---|---|---|
| 0 | Arsitektur dan kontrak | Baseline teknis dan decision record | — |
| 1–2 | Identity dan session | User, role, session, permission | — |
| 3 | Master akademik | Guru, siswa, kelas, mapel, tahun ajaran | — |
| 4 | Routing dan layout | Portal guru/siswa/admin terproteksi | Gate 1 |
| 5 | Modul kurikulum | Modul, asset, status publish | — |
| 6–7 | Upload dan ingestion | File upload, job, extraction | — |
| 8 | Parser dan preview | JSON ATP tervalidasi dan dapat dikoreksi | Gate 2 |
| 9–10 | Assessment | Bank soal, attempt, scoring | — |
| 11 | Progress dan gamification | State node, prerequisite, XP | — |
| 12 | Portal siswa | Dashboard dan skill tree | Gate 3 |
| 13 | Vector retrieval | Chunk, embedding, index | — |
| 14 | Socratic tutor | Chat kontekstual dan memory | — |
| 15 | Deep explainer | Feedback AI terstruktur dan cache | Gate 4 |
| 16 | Google OAuth | Koneksi Google per user | — |
| 17 | Portofolio | Drive file reference dan review | Gate 5 |
| 18–19 | Absensi | Sesi, detail, rekap | — |
| 20–22 | Keuangan | Tagihan, pembayaran, verifikasi | Gate 6 |
| 23–24 | Hardening dan release | Security, performance, backup, release | Final |

Estimasi baseline: **24 sprint / 48 minggu** jika dikerjakan berurutan oleh satu tim. Dengan paralelisasi yang aman, beberapa sprint dapat berjalan overlap setelah fondasi identity dan master data selesai.

---

## 5. Wave 0 — Arsitektur dan Kontrak

### Sprint 0 — Finalisasi baseline teknis

**Durasi:** 1 sprint  
**Dependensi:** Tidak ada  
**Release:** Internal planning  

### Tujuan

Mengunci keputusan yang apabila berubah di tengah implementasi akan menyebabkan migration ulang atau rework besar.

### Deliverables

- PRD final disetujui sebagai baseline.
- Domain boundary:
  - core,
  - akademik,
  - LMS,
  - absensi,
  - keuangan,
  - portofolio,
  - integrations.
- Role dan permission matrix.
- API error contract.
- Naming convention database.
- Keputusan sumber master data siswa/guru.
- Keputusan storage abstraction.
- Keputusan vector storage.
- Keputusan provider AI.
- Strategi migrasi `AdminCredential` ke `User`.
- Strategi audit log dan retention.
- Decision record untuk keputusan yang masih bergantung pada provider.

### Exit criteria

- Semua modul memiliki owner dan permission.
- Tidak ada modul yang mendefinisikan user/account sendiri.
- Sumber data akademik tertulis.
- Provider file, AI, dan vector memiliki fallback/risiko terdokumentasi.
- Tidak ada keputusan kritis yang hanya tersimpan dalam percakapan.

---

## 6. Wave 1 — Core Platform

### Sprint 1–2 — Identity, session, dan role

**Durasi:** 2 sprint  
**Dependensi:** Sprint 0  
**Release:** Internal alpha  

### Deliverables

- Model `User`.
- Model `Role`.
- Model `UserRole`.
- Model `Session`.
- Password hashing Argon2id atau bcrypt.
- Login, logout, session verification.
- Session expiry dan revocation.
- Permission middleware.
- Endpoint `/api/v1/me`.
- Audit event login, logout, role change.
- Backward compatibility untuk admin existing.

### Migration strategy

1. Buat tabel identity baru.
2. Buat user admin dari credential existing.
3. Berikan role `ADMIN`.
4. Tambahkan session baru yang terhubung ke user.
5. Biarkan endpoint lama berjalan melalui compatibility layer.
6. Migrasikan komponen admin secara bertahap.
7. Nonaktifkan jalur credential lama setelah seluruh alur tervalidasi.

### Exit criteria

- Admin lama tetap dapat login.
- User nonaktif ditolak.
- Role tidak dapat dipalsukan dari request.
- Logout mencabut session.
- Session expired ditolak.
- Existing public routes tetap berjalan.

---

### Sprint 3 — Master data akademik

**Durasi:** 1 sprint  
**Dependensi:** Sprint 1–2  
**Release:** Internal alpha  

### Deliverables

- `Guru`.
- `Siswa`.
- `Jurusan`.
- `Kelas`.
- `TahunAjaran`.
- `Mapel`.
- `GuruMapel`.
- `KelasSiswa`.
- `WaliKelas`.
- Seed data development.
- Scope query berdasarkan kelas dan mapel.

### Exit criteria

- User dapat terhubung ke profil guru atau siswa.
- NIP dan NISN unik.
- Siswa dapat ditempatkan pada kelas dan tahun ajaran.
- Guru dapat ditempatkan pada mapel/kelas.
- Histori tahun ajaran tidak tertimpa.
- Query siswa dan guru terfilter berdasarkan permission.

---

### Sprint 4 — Custom routing dan layout portal

**Durasi:** 1 sprint  
**Dependensi:** Sprint 1–3  
**Release:** Internal alpha  

### Deliverables

- Route registry untuk static dan dynamic route.
- Matcher `/guru/...`, `/siswa/...`, dan `/admin/...`.
- `PublicLayout`.
- `AdminLayout`.
- `GuruLayout`.
- `SiswaLayout`.
- Route guard.
- Role guard.
- Menu berbasis permission.
- Loading, error, dan empty state dasar.

### Exit criteria

- `/guru` hanya dapat dibuka role yang sesuai.
- `/siswa` hanya dapat dibuka siswa aktif.
- Admin tetap dapat membuka admin panel existing.
- Dynamic path seperti `/siswa/learn/:nodeId` dapat dipetakan.
- Tidak ada regresi pada route publik.

## Gate 1 — Core Platform Ready

Gate lulus jika:

- identity terpadu berjalan;
- permission server-side berjalan;
- master data akademik dapat digunakan;
- route dan layout portal tersedia;
- migration admin existing dapat diulang pada database salinan;
- tidak ada critical authorization issue.

---

## 7. Wave 2 — LMS Content dan Ingestion

### Sprint 5 — Modul kurikulum dan asset

**Durasi:** 1 sprint  
**Dependensi:** Gate 1  
**Release:** Release 1  

### Deliverables

- `KurikulumModul`.
- `ModulAsset`.
- Relasi guru, mapel, fase, elemen, dan tahun ajaran.
- Status:
  - `DRAFT`,
  - `PROCESSING`,
  - `NEEDS_REVIEW`,
  - `PUBLISHED`,
  - `ARCHIVED`.
- List dan detail modul guru.
- Ownership dan permission modul.

### Exit criteria

- Guru hanya melihat modul sesuai scope.
- Modul draft tidak terlihat siswa.
- Modul archived tidak dapat digunakan untuk assessment baru.
- Perubahan owner/status tercatat.

---

### Sprint 6–7 — Upload dan ingestion job

**Durasi:** 2 sprint  
**Dependensi:** Sprint 5  
**Release:** Release 1  

### Deliverables

- Multipart upload.
- Validasi PDF/DOCX.
- Batas ukuran 15 MB per file.
- MIME validation.
- Storage adapter.
- `IngestionJob`.
- Status:
  - `QUEUED`,
  - `UPLOADING`,
  - `EXTRACTING`,
  - `PARSING`,
  - `FAILED`.
- Progress/status endpoint.
- Retry dengan batas maksimum.
- Deduplication/checksum.

### Exit criteria

- File invalid ditolak sebelum diproses.
- Upload menghasilkan job asynchronous.
- Request tidak menunggu seluruh parser dan embedding.
- Retry tidak menggandakan modul.
- Error memiliki pesan yang dapat ditindaklanjuti.
- File tidak disimpan sebagai base64 besar di database.

---

### Sprint 8 — Structured parser dan preview ATP

**Durasi:** 1 sprint  
**Dependensi:** Sprint 6–7  
**Release:** Release 1  

### Deliverables

- JSON schema `KurikulumModulParsed`.
- LLM parser adapter.
- Validasi structured output.
- `NodeATP`.
- Preview JSON/tree.
- Form koreksi hasil ekstraksi.
- Publish flow.
- Status `NEEDS_REVIEW` dan `PUBLISHED`.

### Exit criteria

- Fase, mapel, elemen, dan ATP tervalidasi.
- Guru dapat mengubah hasil parser.
- Node ATP belum aktif sebelum publish.
- Parser failure tidak membuat data setengah jadi dianggap published.
- Source page dan metadata siap dipakai retrieval.

## Gate 2 — Content Ingestion Ready

Gate lulus jika:

- guru dapat upload PDF/DOCX;
- job ingestion memiliki status;
- hasil parser tervalidasi;
- guru dapat melakukan review dan koreksi;
- modul dapat dipublish;
- data tidak terduplikasi saat retry.

---

## 8. Wave 3 — Assessment dan Portal Siswa

### Sprint 9–10 — Bank soal dan assessment engine

**Durasi:** 2 sprint  
**Dependensi:** Gate 2  
**Release:** Release 1  

### Deliverables

- `BankSoal`.
- `Assessment`.
- `AssessmentQuestion`.
- `AssessmentAttempt`.
- `AssessmentAnswer`.
- Tingkat kesulitan.
- Draft/published/archived question.
- Scoring deterministic.
- Submission endpoint.

### Exit criteria

- Correct answer tidak dikirim sebelum submission.
- Siswa hanya dapat mengerjakan assessment node yang valid.
- Attempt tersimpan.
- Jawaban tersimpan.
- Skor dapat dihitung ulang dari data jawaban.
- Skor terbaik dan terakhir dapat dibedakan.

---

### Sprint 11 — Progress, prerequisite, dan XP

**Durasi:** 1 sprint  
**Dependensi:** Sprint 9–10  
**Release:** Release 1  

### Deliverables

- `NodePrerequisite`.
- `ProgresSiswa`.
- `XPEvent`.
- State machine:
  - `LOCKED`,
  - `UNLOCKED`,
  - `COMPLETED`.
- Nilai minimum default 75.
- Reward idempotency.
- Aturan remedial dasar.

### Exit criteria

- Node terkunci jika prerequisite belum terpenuhi.
- Nilai >= 75 mengubah status sesuai aturan.
- Completion tidak memberikan XP ganda saat retry.
- Progres dihitung dari session siswa.
- Siswa tidak dapat mengubah status melalui client.

---

### Sprint 12 — Portal siswa dan skill tree

**Durasi:** 1 sprint  
**Dependensi:** Sprint 11  
**Release:** Release 1  

### Deliverables

- Dashboard siswa.
- Total XP.
- Level/streak placeholder dengan model yang siap diperluas.
- Skill tree desktop.
- Accordion/list mobile.
- Detail node.
- Exam flow responsive.
- Progress summary.

### Exit criteria

- Siswa hanya melihat data miliknya.
- Desktop mendukung pan/zoom/minimap sesuai kapasitas dataset.
- Mobile menggunakan list/accordion.
- Loading/error/empty state tersedia.
- Route `/siswa/learn/:nodeId` dan `/siswa/exam/:nodeId` berjalan.

## Gate 3 — LMS Deterministic Ready

Gate lulus jika:

- guru dapat mengelola soal;
- siswa dapat mengerjakan assessment;
- scoring tidak bergantung pada AI;
- progress dan XP konsisten;
- skill tree mengikuti prerequisite;
- responsive requirements terpenuhi.

---

## 9. Wave 4 — AI dan RAG

### Sprint 13 — Chunking, embedding, dan retrieval

**Durasi:** 1 sprint  
**Dependensi:** Gate 3  
**Release:** Release 2  

### Deliverables

- `VectorChunk`.
- Chunking default 400 token.
- Overlap default 10%.
- Embedding adapter.
- Vector store adapter.
- Top-3 retrieval.
- Maksimal 1.200 token context retrieval.
- Metadata:
  - kode TP,
  - halaman,
  - kata kunci,
  - modul,
  - versi dokumen.

### Exit criteria

- Modul published dapat di-index.
- Modul belum indexed tidak dipakai context.
- Retrieval mengembalikan source yang dapat ditelusuri.
- Re-index dapat dijalankan tanpa duplikasi.
- Vector provider dapat diganti tanpa mengubah UI.

---

### Sprint 14 — Socratic tutor

**Durasi:** 1 sprint  
**Dependensi:** Sprint 13  
**Release:** Release 2  

### Deliverables

- `AIMemorySession`.
- Chat service.
- Prompt Socratic version 1.
- Suggested prompts.
- Rate limit.
- Context permission.
- Token budget.
- Conversation persistence.

### Exit criteria

- Chat hanya menggunakan modul/node yang diizinkan.
- Chat siswa tidak bercampur.
- Tutor membimbing, bukan selalu memberikan jawaban langsung.
- AI timeout/failure tidak menghapus progres.
- Chat memiliki batas penggunaan.

---

### Sprint 15 — Deep explainer dan cache

**Durasi:** 1 sprint  
**Dependensi:** Sprint 14  
**Release:** Release 2  

### Deliverables

- Feedback AI terstruktur.
- Miskonsepsi.
- Penjelasan konsep.
- Referensi kurikulum.
- Rekomendasi aksi.
- Exact cache SHA-256.
- Semantic cache jika vector query tersedia.
- AI latency/token logging.

### Exit criteria

- Nilai benar/salah tersedia walaupun AI gagal.
- Output AI lolos validation schema.
- Referensi hanya berasal dari context yang berhasil diambil.
- Cache tidak membocorkan data privat.
- Provider error memiliki fallback UI.

## Gate 4 — AI LMS Ready

Gate lulus jika:

- ingestion dan retrieval berjalan;
- Socratic chat dapat digunakan;
- deep explainer menghasilkan contract yang valid;
- AI failure tidak memblokir assessment;
- rate limit dan observability tersedia.

---

## 10. Wave 5 — Google Drive dan Portofolio

### Sprint 16 — OAuth Google per user

**Durasi:** 1 sprint  
**Dependensi:** Gate 1  
**Release:** Release 3  

### Deliverables

- OAuth connect.
- OAuth callback.
- State validation.
- Provider subject validation.
- Encrypted token storage.
- Connection status.
- Token refresh.
- Disconnect.
- Reauthorization flow.

### Exit criteria

- Dua user dapat menghubungkan dua akun Google berbeda.
- Token tidak muncul di browser.
- Token tidak muncul di log.
- User dapat disconnect tanpa menghapus file Drive.
- Revoked token menghasilkan status `REQUIRES_REAUTH`.

---

### Sprint 17 — Drive browser dan portofolio

**Durasi:** 1 sprint  
**Dependensi:** Sprint 16  
**Release:** Release 3  

### Deliverables

- Drive file listing dengan scope minimum.
- `Portfolio`.
- `PortfolioItem`.
- `PortfolioAsset`.
- Visibility:
  - `PRIVATE`,
  - `CLASS`,
  - `SCHOOL`,
  - `PUBLIC`.
- Review guru.
- Broken file state.
- Portofolio siswa dan guru.

### Exit criteria

- Siswa hanya dapat memilih file dari koneksinya sendiri.
- Guru melihat portofolio sesuai scope.
- Default visibility adalah private.
- Disconnect Google tidak menghapus metadata histori.
- File yang dihapus dari Drive ditandai broken.

## Gate 5 — Personal Files Ready

Gate lulus jika:

- OAuth per user tervalidasi;
- token aman;
- file Drive dapat dibaca sesuai scope;
- portofolio dapat menyimpan reference;
- permission file dan permission portofolio tidak tertukar.

---

## 11. Wave 6 — Modul Operasional Sekolah

### Sprint 18–19 — Absensi

**Durasi:** 2 sprint  
**Dependensi:** Master akademik dan identity  
**Release:** Release 4  

### Deliverables

- `Jadwal`.
- `AttendanceSession`.
- `AttendanceRecord`.
- Input absensi guru.
- Status:
  - `HADIR`,
  - `IZIN`,
  - `SAKIT`,
  - `ALPA`,
  - `TERLAMBAT`.
- Riwayat siswa.
- Rekap guru.
- Rekap wali kelas.
- Export laporan.
- Audit koreksi.

### Exit criteria

- Guru hanya membuat sesi pada kelas/mapel yang diampu.
- Siswa hanya melihat histori sendiri.
- Wali kelas melihat kelas yang ditugaskan.
- Koreksi absensi memiliki actor, waktu, dan alasan.
- Rekap harian dan periode konsisten.

---

### Sprint 20–22 — Keuangan

**Durasi:** 3 sprint  
**Dependensi:** Identity dan master siswa  
**Release:** Release 4  

### Deliverables

- `FeeType`.
- `StudentCharge`.
- `Payment`.
- `PaymentVerification`.
- Jenis tagihan.
- Periode tagihan.
- Nominal dan tanggal jatuh tempo.
- Upload bukti.
- Verifikasi bendahara.
- Ringkasan siswa.
- Laporan agregat.

### Exit criteria

- Siswa hanya melihat tagihan miliknya.
- Guru tidak otomatis melihat detail keuangan.
- Bendahara dapat membuat dan memverifikasi pembayaran.
- Pembayaran tidak dapat diverifikasi dua kali tanpa prosedur koreksi.
- Koreksi memiliki alasan dan audit trail.
- Total tagihan, pembayaran, dan saldo konsisten.

## Gate 6 — Operational Modules Ready

Gate lulus jika:

- absensi berjalan sesuai scope;
- histori dan rekap tersedia;
- keuangan memiliki permission ketat;
- pembayaran memiliki status dan verifikasi;
- perubahan sensitif tercatat;
- laporan agregat dapat dibuat tanpa membuka PII yang tidak perlu.

---

## 12. Wave 7 — Hardening dan Release

### Sprint 23–24 — Security, performance, dan release readiness

**Durasi:** 2 sprint  
**Dependensi:** Gate 4, Gate 5, Gate 6  
**Release:** Production candidate  

### Deliverables

- Authorization matrix test.
- Security review.
- Input validation review.
- File upload security review.
- Google token handling review.
- AI prompt/data privacy review.
- Load test endpoint utama.
- Performance profiling.
- Mobile regression.
- Database migration rehearsal.
- Backup/restore test.
- Monitoring dan alert.
- Deployment runbook.
- Rollback procedure.
- User guide internal.

### Exit criteria

- Tidak ada critical/high authorization issue.
- Migration berhasil pada database salinan.
- Restore database berhasil.
- Existing portal route tetap lulus regression.
- SLA baseline terukur.
- Rollback dapat dilakukan.
- Pilot user dapat menyelesaikan alur utama tanpa bantuan engineer.

---

## 13. Dependency Map

```text
Sprint 0
   ↓
Sprint 1–2 Identity
   ↓
Sprint 3 Master Akademik
   ↓
Sprint 4 Routing/Layout
   ↓
Gate 1
   ↓
Sprint 5 Modul
   ↓
Sprint 6–7 Upload/Ingestion
   ↓
Sprint 8 Parser/Preview
   ↓
Gate 2
   ↓
Sprint 9–10 Assessment
   ↓
Sprint 11 Progress/XP
   ↓
Sprint 12 Portal Siswa
   ↓
Gate 3
   ↓
Sprint 13 Retrieval
   ↓
Sprint 14 Tutor
   ↓
Sprint 15 Explainer
   ↓
Gate 4
```

Jalur paralel yang aman setelah Gate 1:

```text
Gate 1 ──→ Sprint 16 Google OAuth ──→ Sprint 17 Portofolio ──→ Gate 5
Gate 1 ──→ Sprint 18–19 Absensi
Gate 1 ──→ Sprint 20–22 Keuangan ──→ Gate 6
```

Gate 5 dan Gate 6 harus selesai sebelum Sprint 23–24 release hardening.

---

## 14. Definition of Done per Sprint

Setiap sprint tidak dianggap selesai hanya karena kode telah dibuat. Semua item berikut harus terpenuhi:

1. Requirement memiliki implementation owner.
2. UI tersedia untuk role yang relevan.
3. Endpoint memiliki validation schema.
4. Permission diuji untuk role allowed dan denied.
5. Data disimpan melalui Prisma/service backend.
6. Loading, empty, error, dan success state tersedia.
7. Tidak ada identitas caller yang dipercaya dari body request.
8. Operasi sensitif memiliki audit event.
9. Migration dapat dijalankan pada database development.
10. Route existing tidak mengalami regresi.
11. Responsive layout diuji pada desktop, tablet, dan mobile.
12. Error provider eksternal memiliki fallback.
13. Dokumentasi endpoint atau decision record diperbarui jika kontrak berubah.

---

## 15. Quality Gate Checklist

### Gate 1 — Core Platform

- [ ] User, role, session, dan permission tersedia.
- [ ] Admin existing tetap dapat login.
- [ ] Guru dan siswa memiliki identity yang benar.
- [ ] Master kelas/mapel/tahun ajaran tersedia.
- [ ] Route guard berfungsi.
- [ ] Dynamic route custom router berfungsi.
- [ ] Tidak ada critical authorization finding.

### Gate 2 — Content Ingestion

- [ ] PDF/DOCX upload tervalidasi.
- [ ] File storage tidak menggunakan base64 besar.
- [ ] Job ingestion asynchronous.
- [ ] Retry aman.
- [ ] JSON parser tervalidasi.
- [ ] Guru dapat preview/koreksi.
- [ ] Publish flow tersedia.

### Gate 3 — LMS Deterministic

- [ ] Bank soal tersedia.
- [ ] Attempt dan answer tersimpan.
- [ ] Scoring deterministic.
- [ ] Jawaban benar tidak bocor.
- [ ] Prerequisite dihitung server-side.
- [ ] XP idempotent.
- [ ] Skill tree responsive.

### Gate 4 — AI LMS

- [ ] Vector retrieval berjalan.
- [ ] Context memiliki source reference.
- [ ] Tutor memiliki rate limit.
- [ ] AI response tervalidasi.
- [ ] AI failure tidak menghapus skor.
- [ ] Cache aman terhadap data privat.
- [ ] AI usage dapat dipantau.

### Gate 5 — Personal Files

- [ ] OAuth state tervalidasi.
- [ ] Token terenkripsi.
- [ ] Dua akun Google tidak tercampur.
- [ ] Reconnect tersedia.
- [ ] Drive file reference tervalidasi.
- [ ] Portofolio default private.

### Gate 6 — Operational Modules

- [ ] Scope absensi benar.
- [ ] Koreksi absensi diaudit.
- [ ] Scope keuangan benar.
- [ ] Pembayaran memiliki verifikasi.
- [ ] Detail finansial tidak bocor ke role biasa.
- [ ] Laporan agregat tersedia.

### Final Release Gate

- [ ] Security review selesai.
- [ ] Migration rehearsal berhasil.
- [ ] Backup/restore berhasil.
- [ ] Performance target terukur.
- [ ] Mobile regression lulus.
- [ ] Rollback procedure diuji.
- [ ] Portal publik existing lulus.

---

## 16. Risiko Roadmap dan Trigger Eskalasi

| Risiko | Trigger | Tindakan |
|---|---|---|
| Sumber data akademik tidak tersedia | Data siswa/guru belum dapat diimpor saat Sprint 0 selesai | Freeze scope integrasi dan gunakan seed data terkontrol |
| pgvector tidak tersedia | Provider database tidak mendukung extension | Aktifkan vector provider adapter alternatif |
| AI cost tidak terkendali | Usage melewati budget yang disetujui | Tambahkan quota, cache, model tiering, dan approval |
| OAuth Google tertunda | Credential OAuth belum tersedia saat Sprint 16 | Portofolio tetap mendukung storage internal sementara |
| Custom router sulit dirawat | Route dynamic mulai menimbulkan regresi | Tambahkan route registry tanpa mengganti router |
| Migration admin gagal | Compatibility test gagal | Hentikan migrasi dan rollback ke session lama |
| Scope melebar | Modul baru masuk sebelum Gate 1 | Masukkan ke backlog, jangan mengubah sequence aktif |

---

## 17. Keputusan yang Harus Selesai Sebelum Sprint 0 Ditutup

1. Sumber master data siswa, guru, kelas, dan mapel.
2. Provider PostgreSQL dan dukungan `pgvector`.
3. Provider AI dan batas budget.
4. Storage internal untuk file non-Google.
5. Scope Google Drive minimum.
6. Kebijakan retention chat AI.
7. Aturan remedial dan skor completion.
8. Aturan XP dan streak.
9. Apakah wali/orang tua masuk fase berikutnya.
10. Metode pembayaran untuk fase pertama.

Keputusan yang belum selesai harus tercatat sebagai `TBD decision`, bukan diasumsikan diam-diam oleh implementasi.

---

## 18. Target Produk Baseline

Baseline dianggap siap untuk pilot internal jika:

- admin, guru, dan siswa login melalui identity yang sama;
- guru dapat mengunggah dan memvalidasi modul;
- siswa dapat melihat skill tree;
- siswa dapat mengerjakan assessment;
- progres dan XP tersimpan konsisten;
- AI tutor tersedia dengan fallback aman;
- dua user dapat menghubungkan akun Google berbeda;
- portofolio dapat mereferensikan file Drive;
- absensi dasar dapat dicatat dan direkap;
- tagihan dan pembayaran dasar dapat dikelola;
- permission lintas role sudah diuji;
- portal publik existing tetap berjalan;
- backup, restore, audit, dan rollback dasar telah diverifikasi.

---

## 19. Referensi File Implementasi

```text
docs/PRD-ROADMAP-SISTEM-SEKOLAH-TERINTEGRASI.md
docs/ROADMAP-IMPLEMENTASI-SISTEM-SEKOLAH-TERINTEGRASI.md

src/App.tsx
src/utils/navigation.ts
src/db.ts
src/dataStore.ts
server.ts
prisma/schema.prisma
prisma/migrations/
vite.config.ts
package.json
replit.md
```

Dokumen roadmap ini harus dibaca bersama PRD utama. Jika terjadi konflik, keputusan terbaru yang disetujui harus dicatat sebagai revisi decision record.