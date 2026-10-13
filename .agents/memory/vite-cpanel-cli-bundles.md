---
name: Vite and cPanel CLI bundles
description: Preserving the split Prisma CLI archive used by the cPanel deployment.
---

**Rule:** Preserve the cPanel Prisma CLI split archive when building the frontend because Vite clears the whole `dist` output directory.

**Why:** The deployment package is stored beside the web build output, so a normal clean Vite build deletes it even though it is unrelated to the frontend.

**How to apply:** Before future builds, move the archive outside Vite's output directory or copy it back after the build; verify all archive parts and the manifest remain available for cPanel deployment.
