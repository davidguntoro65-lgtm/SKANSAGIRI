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

1. On cPanel, set `DATABASE_URL` in the Node.js app environment variables (e.g. pointing to a Neon/Supabase/Aiven PostgreSQL instance).
2. Build on Replit: `VITE_BASE_PATH=/id/ npm run build` then commit `dist/` to GitHub.
3. On cPanel, run `bash deploy.sh` — this pulls from GitHub and runs `prisma migrate deploy` automatically.

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

## Key routes

- `/` — Public homepage
- `/berita` — News & articles page
- `/adm-panel` — Admin login & management panel

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
