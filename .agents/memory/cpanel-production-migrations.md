---
name: cPanel production migrations
description: Safe deployment rule for the SMKN 1 Wonogiri cPanel app and its PostgreSQL data.
---

## Rule
Production deploys must apply only pending Prisma migrations, reject destructive SQL by default, and never seed, reset, or replace the PostgreSQL data during a code update.

**Why:**
The live cPanel app stores its persistent content, accounts, sessions, and academic data in PostgreSQL rather than the repository. The deployment needs schema updates for new code, but a deployment must not turn an application update into a data reset.

**How to apply:**
Keep database migrations before the Node restart, load `DATABASE_URL` from the app environment or protected `.env` without logging it, and abort before restart if the Prisma CLI or safety check fails. When Prisma runs from an isolated npx cache, use a temporary plain config with absolute app paths; the app-local `prisma.config.ts` may not resolve `prisma/config` from that cache. Check CLI availability separately from the database migration, stream output instead of buffering it, and bound both operations with a timeout so a registry stall is distinguishable from a PostgreSQL connection or migration lock. On this cPanel host, do not rely on `/bin/timeout`: it aborts in the jailed environment. Use the cPanel Node runtime to supervise Prisma in a separate process group, terminate the group on timeout, and preserve CLI output and exit status. Also inspect command output for config/Prisma errors because a CLI can log a failure while returning success.

**Why:** A cPanel deploy stalled during `npx`/Prisma with output buffered until process exit, and the host's `/bin/timeout` later dumped core before Prisma started. Logs could not distinguish CLI setup from a database failure.

## Existing database baseline

If `prisma migrate deploy` returns `P3005` because a pre-existing database has no
`_prisma_migrations` history, compare it with
`prisma/legacy-baseline.prisma`, which represents only the original migration.
The deployment script exposes this as the explicit
`BASELINE_EXISTING_SCHEMA=1` recovery path, marks only
`20260721114333_init` as applied, then reruns `migrate deploy` so newer Core
Platform and Pilketos migrations are actually executed.

**Why:** Marking every repository migration as applied when only the initial
tables exist hides missing Core/Pilketos tables and leaves the running bundle
incompatible with production data.

**How to apply:** Never use the baseline flag for a partially migrated or
unknown schema. If the legacy baseline diff is non-empty, stop and create/apply
the required non-destructive migration instead.