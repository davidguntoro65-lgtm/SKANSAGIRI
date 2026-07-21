---
name: Prisma 7 migration & DB architecture
description: Details of the migration from flat-file JSON (data/) to PostgreSQL with Prisma 7 ORM, including schema design, cPanel deployment notes, and Prisma 7 quirks.
---

# Prisma 7 Migration — SMKN 1 Wonogiri

## Schema design
- `Setting` (key TEXT PK, value JSONB) — replaces all "replace-whole-collection" JSON files: competencies, milestones, gallery, alumni, news, partners, branding, kepala-sekolah, manajemen-sekolah, visi-misi, social-media, about
- `AdminCredential` (id=1 singleton) — replaces admin-credentials.json
- `Session` — replaces sessions.json; sessions are now DB-persisted across Passenger restarts
- `TracerEntry`, `ContactMessage`, `AduanPublik` — individual CRUD rows
- `KaryaSiswa`, `KomentarSuara` — Suara Skansagiri articles and comments

## Prisma 7 quirks
- `url = env("DATABASE_URL")` in schema.prisma is NO LONGER supported in Prisma 7. URL goes in `prisma.config.ts` under `datasource.url`.
- Schema file must NOT have a `url` field in `datasource db {}`.
- Client init requires a driver adapter: `new PrismaPg({ connectionString: process.env.DATABASE_URL })` from `@prisma/adapter-pg`.
- PrismaClient constructor: `new PrismaClient({ adapter })` — no `datasourceUrl` shorthand.
- Table names are PascalCase in DB (match model names): `"Session"`, `"Setting"`, etc. Raw queries must quote them.
- `--skip-seed` flag does NOT exist in Prisma 7 migrate dev.
- `prisma.config.ts` replaces `.env` for Prisma CLI datasource config.

## binaryTargets
Set in schema.prisma generator:
```
binaryTargets = ["native", "rhel-openssl-1.0.x", "rhel-openssl-3.0.x", "debian-openssl-1.1.x", "debian-openssl-3.0.x"]
```
Covers Replit (debian) and typical cPanel/shared hosting (rhel).

## cPanel deployment
- On cPanel: set `DATABASE_URL` as env var in Node.js app settings, pointing to external PostgreSQL (Neon, Supabase, Aiven).
- `deploy.sh` now runs `npx prisma migrate deploy` after git pull (step 3.5/6).
- `package.json` has `postinstall: npx prisma generate` so client is regenerated on `npm install`.
- Build command externalizes `@prisma/client` and `.prisma/client` from esbuild bundle.
- `data/` folder is legacy (ignored by git), all data is in DB.

## Seed script
`scripts/seed-from-json.ts` — one-time migration from data/*.json to DB. Run with `npm run db:seed`.
Safe to re-run (upserts only).

**Why:** File-based JSON storage was unreliable under Passenger restarts and had race conditions. PostgreSQL provides atomic transactions, persistence across restarts, and enables future complex queries.

**How to apply:** When adding new data entities, add a Prisma model, run `npx prisma migrate dev --name <name>`, update Setting keys or add new table as appropriate in server.ts.
