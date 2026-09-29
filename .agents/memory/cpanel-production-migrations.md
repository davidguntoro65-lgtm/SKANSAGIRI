---
name: cPanel production migrations
description: Safe deployment rule for the SMKN 1 Wonogiri cPanel app and its PostgreSQL data.
---

## Rule
Production deploys must apply only pending Prisma migrations, reject destructive SQL by default, and never seed, reset, or replace the PostgreSQL data during a code update.

**Why:**
The live cPanel app stores its persistent content, accounts, sessions, and academic data in PostgreSQL rather than the repository. The deployment needs schema updates for new code, but a deployment must not turn an application update into a data reset.

**How to apply:**
Keep database migrations before the Node restart, load `DATABASE_URL` from the app environment or protected `.env` without logging it, and abort before restart if the Prisma CLI or safety check fails.