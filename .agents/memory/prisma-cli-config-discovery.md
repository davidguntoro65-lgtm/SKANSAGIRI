---
name: Prisma CLI config discovery from the working directory
description: Prisma 7 may load a project's prisma.config.ts even for CLI startup checks such as --version.
---

Run an offline Prisma CLI from its isolated bundle directory for checks that do not need project context. For migration commands, pass an explicit plain config with absolute schema and migration paths. Do not invoke the bundled CLI from the application directory when its `prisma.config.ts` imports `prisma/config` from app-managed dependencies.

**Why:** On cPanel, the CLI bundle contains `prisma/config`, but the protected application `node_modules` may not. A `prisma --version` check from the app directory auto-loaded the app config and aborted before any database access.

**How to apply:** When packaging Prisma separately from app runtime dependencies, keep its preflight working directory isolated; verify `--version` and the explicit-config migration startup there before deploy.
