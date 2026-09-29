# SMK Negeri 1 Wonogiri — Website & Admin Panel

A full-stack school website for SMK Negeri 1 Wonogiri built with **React + Vite + TypeScript** on the frontend and **Express + TypeScript** on the backend.

## Stack

- **Frontend**: React 19, Vite 6, Tailwind CSS 4, Framer Motion
- **Backend**: Express 4, TypeScript (run via `tsx`)
- **Database**: PostgreSQL via Prisma ORM (replaces flat-file JSON storage)
- **Auth**: Session-based admin login (server-side, sessions stored in DB)

## Replit setup (first time)

```bash
npm install          # install all dependencies
npm run db:migrate   # apply Prisma migrations to the Replit PostgreSQL database
npm run dev          # start the dev server
```

The `Start application` workflow runs `npm run dev` automatically. On first run the server seeds default data into the database.

## How to run

```
npm run dev
```

Starts the Express server on **port 5000**, which also serves the Vite dev client via middleware. The workflow `Start application` is configured to run this automatically.

## Environment variables

| Variable | Purpose | Default |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | managed by Replit runtime |
| `ADMIN_USERNAME` | Admin panel login username (fallback only) | `jobenenterprise` |
| `ADMIN_PASSWORD` | Admin panel login password (fallback only) | (see memory) |
| `SESSION_SECRET` | Signs session tokens | required |
| `NODE_ENV` | `development` or `production` | `development` |
| `PORT` | Server port | `5000` |

**Note:** `ADMIN_USERNAME` and `ADMIN_PASSWORD` are only used as fallback when no `AdminCredential` row exists in the database. After first login, credentials are stored in the DB and can be changed via the admin panel.

## cPanel Deployment

1. On cPanel, create the Node.js app with **Node.js 22**, set `DATABASE_URL` in the Node.js app environment variables (e.g. pointing to a Neon/Supabase/Aiven PostgreSQL instance), and use `app.js` as the startup file.
2. Build on Replit: `VITE_BASE_PATH=/id/ npm run build` then commit `dist/` to GitHub.
3. On cPanel, run `bash deploy.sh` — this pulls from GitHub and runs `prisma migrate deploy` automatically.
   If the existing production database was created before Prisma Migrate and the
   deploy log reports `P3005`, first verify that its schema is already identical
   to the repository schema, then run:

   ```bash
   BASELINE_EXISTING_SCHEMA=1 bash deploy.sh
   ```

   The script runs `prisma migrate diff` before marking migration history as
   applied. It aborts when the live schema differs, and it never resets, seeds,
   or deletes application data.

### External PostgreSQL options (free tier):
- **Neon** — https://neon.tech (recommended, serverless, generous free tier)
- **Supabase** — https://supabase.com (free tier, 500MB)
- **Aiven** — https://aiven.io (free trial)

## Database schema (Prisma)

- `Setting` — key-value JSONB store for all config (news, gallery, alumni, branding, etc.)
- `AdminCredential` — single row with username + password
- `Session` — login session tokens with expiry
- `TracerEntry` — tracer study form submissions
- `ContactMessage` — contact form submissions
- `AduanPublik` — complaint/aduan form submissions
- `KaryaSiswa` — student work articles (Suara Skansagiri)
- `KomentarSuara` — comments on student articles

### OSIS Skansagiri tables
- `OsisInfo` — kabinet identity, visi misi, sejarah, quote ketua
- `OsisPengurus` — board members with photo, jabatan, tugas pokok, socials
- `OsisProgramKerja` — work programs with bidang, status, progress bar, target date
- `OsisAgenda` — events/schedule (RUTIN / BESAR / KOLABORASI)
- `OsisEkskul` — extracurricular activities with category, schedule, coach
- `OsisGaleri` — OSIS activity gallery photos
- `OsisPrestasi` — achievements with level badge (SEKOLAH→NASIONAL)
- `OsisAspirasi` — student aspirations with admin reply + public toggle

## Prisma commands

```bash
npm run db:migrate    # apply pending migrations (prisma migrate deploy)
npm run db:studio     # open Prisma Studio GUI
npx tsx scripts/seed-from-json.ts  # one-time: import existing data/ JSON files into DB
```

Untuk membuat akun demo pemilih Pilketos secara idempoten, isi password melalui environment hanya saat seed dijalankan lalu jalankan `npm run db:seed:pilketos`. Seed membuat `CoreStudent` NIS `101010`, akun aktif, dan role `SISWA`; password tidak disimpan mentah di database maupun repository.

## Key routes

- `/` — Public homepage
- `/berita` — News & articles page
- `/adm-panel` atau `/adm/panel` — Satu-satunya shell admin: login, content management, Core Platform akademik, dan pengelolaan Pilketos
- `/pilketos` — Landing page Pemilihan Ketua OSIS 2026/2027; siswa login dengan NIS/NISN dan password untuk memilih
- `/guru` — Portal guru untuk mengelola modul kurikulum berdasarkan assignment
- `/api/v1/akademik/*` — Backend API internal untuk master data, import XLS, audit, dan approval assignment guru
- `/api/v1/lms/guru/*` — Context assignment, dashboard, dan lifecycle modul kurikulum
- `/admin/akademik` — URL lama yang diarahkan ke `/adm-panel` untuk kompatibilitas

## Core Platform (Wave 1)

Core Platform mempertahankan modular monolith existing dan memakai PostgreSQL/Prisma untuk identity serta master akademik. Alur setup yang didukung:

1. Tahun ajaran
2. Jurusan / program keahlian
3. Mata pelajaran
4. Kelas
5. Guru
6. Siswa
7. Assignment guru
8. Enrollment siswa

Dashboard `/admin/akademik` menyediakan template XLS terpisah, preview validasi, deteksi duplikat, commit transaksional, dan audit import. Assignment yang dipilih guru tetap menjadi pengajuan sampai disetujui operator/admin.

Endpoint utama:

- `GET /api/v1/akademik/overview`
- `GET /api/v1/akademik/master`
- `GET /api/v1/akademik/import/templates/:type`
- `POST /api/v1/akademik/import/:type/preview`
- `POST /api/v1/akademik/import/:type/commit`
- `GET /api/v1/akademik/teacher-requests`
- `POST /api/v1/akademik/teacher-requests` — submit pengajuan guru dari CoreUser session
- `PATCH /api/v1/akademik/teacher-requests/:id` — revisi pengajuan milik guru
- `PATCH /api/v1/akademik/teacher-requests/:id/review`
- `GET /api/v1/akademik/audit`
- `GET /api/v1/akademik/import/jobs`
- `GET /api/v1/akademik/import/jobs/:jobId/errors`
- `POST /api/v1/akademik/users/:id/invite`

Core Platform juga menyediakan identity session server-side:

- `POST /api/v1/auth/login`
- `GET /api/v1/auth/session`
- `GET /api/v1/me`
- `POST /api/v1/auth/activate`
- `POST /api/v1/auth/change-password`
- `GET /api/v1/pilketos/active` — data pemilihan aktif untuk landing page
- `POST /api/v1/pilketos/vote` — menyimpan satu suara per siswa dan pemilihan
- `GET/POST /api/v1/pilketos/admin/*` — pengelolaan pemilihan dan kandidat oleh admin/operator

Portal siswa tersedia di `/siswa`. Import template `siswa` memakai kolom wajib `nisn`, `nis`, `namaLengkap`, `kodeKelas`, `kodeTahunAjaran`, dan `password`; `noTelp` serta kolom profil lain bersifat opsional. Saat commit, password awal hanya disimpan sebagai hash, akun diberi role `SISWA`, dan enrollment awal dibuat bila kelas serta tahun ajaran valid. Siswa dapat login memakai NIS, NISN, atau email melalui `POST /api/v1/auth/login`. Pada login pertama akan muncul tawaran opsional untuk mengganti password; perubahan password dilakukan melalui session siswa dan tidak pernah mengirim password ke payload profil.

Semua endpoint akademik dan import admin memerlukan session admin existing. Endpoint login/aktivasi siswa bersifat publik, sedangkan perubahan password dan logout memerlukan session Core Identity. Import menerima file XLS/XLSX melalui payload base64 maksimum 10 MB, menyimpan checksum dan audit log, memvalidasi duplikat NIS/NISN/email sebelum commit, dan tidak menulis data akademik sebelum tahap commit.

Dashboard `/admin/akademik` saat ini mencakup CRUD manual tahun ajaran/jurusan/mapel/kelas, pencarian master, preview dan commit import, history/error report, review pengajuan dengan catatan, serta audit activity feed. Migration identity tambahan perlu diterapkan dengan `npx prisma migrate deploy`.

## Roadmap position

Wave 1 (Core Platform) sudah memiliki identity/session server-side, master akademik, import XLS preview-first, assignment/enrollment, approval, dan audit log. Wave 2 Sprint 5 sekarang tersedia sebagai vertical slice:

- Model `CurriculumModule` dan `CurriculumModuleAsset` di Prisma.
- Portal guru dengan login Core Identity dan halaman `/guru`.
- Guru dapat membuat, mengedit, mengirim review, menerbitkan, dan mengarsipkan modul.
- Scope modul divalidasi server-side terhadap teaching assignment; draft tidak otomatis dianggap tersedia untuk siswa.
- Perubahan lifecycle modul dicatat sebagai audit event.

Upload PDF/DOCX, storage adapter, ingestion job, parser preview, dan AI/RAG belum diaktifkan pada slice ini. Itu adalah pekerjaan Sprint 6–8 dan harus ditambahkan setelah fondasi modul ini dipakai serta diuji.

## Build for production

```
VITE_BASE_PATH=/id/ npm run build   # outputs dist/server.cjs + frontend assets
npm start       # runs the compiled bundle
```

The `.htaccess`, `app.js`, and `deploy.sh` files are for cPanel/Passenger deployment.

## User preferences

- Keep the existing project structure (Express + React monorepo, no workspace migration).
- All write operations use Prisma ORM (PostgreSQL).
- `data/` folder is no longer used for persistent storage — data lives in the DB.
