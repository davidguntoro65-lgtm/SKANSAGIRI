---
name: cPanel admin session compatibility
description: Admin login must use the stable Session columns directly when production Prisma schemas may lag.
---

## Rule
The admin login path should read and write only the stable `AdminCredential` and `Session` columns (`id`, `username`, `password`, `token`, `expiresAt`) with raw SQL. Core Identity login may continue using Prisma relations.

**Why:** cPanel can run an older generated Prisma client or an earlier migration while the shared `Session` table already serves the admin panel. Prisma model queries may then fail on optional Core Identity relation metadata and surface as a misleading 503 during admin login.

**How to apply:** Keep the admin session query independent of `coreUserId`; apply pending non-destructive migrations during deployment so Core Identity routes can use their relation-aware Prisma queries.