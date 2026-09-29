---
name: cPanel npm node_modules handling
description: cPanel Node.js App Manager may own node_modules through a symlink or special layout that npm ci cannot safely replace.
---

## Rule
Do not run `npm ci` against the application directory during cPanel deploys when the Node.js App Manager owns `node_modules`. Use an existing local CLI or an isolated package-manager cache for deploy-only tools.

**Why:**
On this hosting layout, `npm ci` attempted to remove `node_modules` and terminated with `Exit handler never called`, leaving Prisma unavailable before migration.

**How to apply:**
Keep runtime dependencies under cPanel's normal Node.js App Manager flow. For Prisma migrations, prefer `node_modules/.bin/prisma`; otherwise invoke the package through an isolated `npx --package` cache so the app dependency tree is not replaced.