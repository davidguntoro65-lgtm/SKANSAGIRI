---
name: cPanel production migrations
description: Safe deployment rule for the SMKN 1 Wonogiri cPanel app and its PostgreSQL data.
---

## Rule
Production deploys must apply only pending Prisma migrations, reject destructive SQL by default, and never seed, reset, or replace the PostgreSQL data during a code update.

**Why:**
The live cPanel app stores its persistent content, accounts, sessions, and academic data in PostgreSQL rather than the repository. The deployment needs schema updates for new code, but a deployment must not turn an application update into a data reset.

**How to apply:**
Keep database migrations before the Node restart, load `DATABASE_URL` from the app environment or protected `.env` without logging it, and abort before restart if the Prisma CLI or safety check fails. Use an offline Prisma CLI bundle built in Replit with the Linux schema-engine targets needed by cPanel; the host's npm registry access is unreliable. Activate the detected cPanel Node environment before resolving or invoking its Node binary. Use a temporary plain Prisma config with absolute app paths, stream output, and supervise the CLI in a process group with a timeout. Also inspect command output for config/Prisma errors because a CLI can log a failure while returning success.

**Why:** cPanel had no local Prisma CLI, could not complete `npx` registry access, and its `/bin/timeout` dumped core before Prisma started. Logs could not distinguish CLI setup from a database failure.

**Why:** The Node binary under `nodevenv` can be a cPanel wrapper that expects its activated environment. Calling it directly may fail during Prisma startup, before any PostgreSQL connection is attempted.

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

## cPanel loopback diagnostics

A TCP probe from the cPanel shell found `localhost:5432` and `127.0.0.1:5432`
open, while `::1` was unavailable; `pg_isready` was not installed. This alone
does not prove that the listener speaks PostgreSQL or explain a Prisma `P1001`.

**Why:** The app host has no IPv6 loopback, but `localhost` still reached an
open IPv4 TCP listener. Replacing `localhost` with `127.0.0.1` without a
protocol-level check would be an unsupported change.

**How to apply:** When diagnosing `P1001`, distinguish TCP reachability from a
valid PostgreSQL response. Do not change the production host or use the
baseline flag solely because of `P1001`; rerun the guarded deployment if the
service is reachable again, and investigate the PostgreSQL listener if the
error persists.