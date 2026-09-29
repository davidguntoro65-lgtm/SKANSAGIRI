---
name: cPanel production migrations
description: Safe deployment rule for the SMKN 1 Wonogiri cPanel app and its PostgreSQL data.
---

## Rule
Production deploys must apply only pending Prisma migrations, reject destructive SQL by default, and never seed, reset, or replace the PostgreSQL data during a code update.

**Why:**
The live cPanel app stores its persistent content, accounts, sessions, and academic data in PostgreSQL rather than the repository. The deployment needs schema updates for new code, but a deployment must not turn an application update into a data reset.

**How to apply:**
Keep database migrations before the Node restart, load `DATABASE_URL` from the app environment or protected `.env` without logging it, and abort before restart if the Prisma CLI or safety check fails. When Prisma runs from an isolated npx cache, use a temporary plain config with absolute app paths; the app-local `prisma.config.ts` may not resolve `prisma/config` from that cache. Also inspect command output for config/Prisma errors because a CLI can log a failure while returning success.

## Existing database baseline

If `prisma migrate deploy` returns `P3005` because a pre-existing database has no
`_prisma_migrations` history, baseline only after `prisma migrate diff
--from-config-datasource --to-schema prisma/schema.prisma --exit-code` confirms
that the live schema is identical. The deployment script exposes this as the
explicit `BASELINE_EXISTING_SCHEMA=1` recovery path and records every repository
migration as applied before rerunning `migrate deploy`.

**Why:** Marking migration history without comparing schemas can hide missing
tables or columns and make the next migration either fail or leave the running
bundle incompatible with production data.

**How to apply:** Never use the baseline flag for a partially migrated or
unknown schema. If the diff is non-empty, stop and create/apply the required
non-destructive migration instead.