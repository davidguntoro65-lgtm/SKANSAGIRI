---
name: Prisma 7 TypeScript import quirk
description: A project-specific Prisma 7 generated-client type resolution issue under TypeScript bundler module resolution
---

## Rule

When TypeScript reports that `@prisma/client` has no exported `PrismaClient` even after `prisma generate` succeeds, use the generated package's `@prisma/client/index` import path in the database singleton.

**Why:** The generated Prisma 7 client is present and runtime-compatible, but this project's package export/type resolution path under `moduleResolution: bundler` did not expose the root type. The explicit index path passed both type-check and production bundling.

**How to apply:** Verify with `prisma generate` and `npm run lint` before changing the Prisma generator or migrating the project to another client setup.