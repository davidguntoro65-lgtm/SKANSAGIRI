---
name: cPanel npm node_modules handling
description: cPanel Node.js App Manager may own node_modules through a symlink or special layout that npm ci cannot safely replace.
---

## Rule
Do not run `npm ci` against the application directory during cPanel deploys when the Node.js App Manager owns `node_modules`. Do not rely on cPanel `npx`/npm registry access for Prisma migrations; use an offline CLI bundle built in Replit, with a local installed CLI only as a fallback.

**Why:**
On this hosting layout, `npm ci` attempted to remove `node_modules` and terminated with `Exit handler never called`, leaving Prisma unavailable before migration. Later, cPanel had no local Prisma CLI and `npx` remained blocked on registry access until the 180-second watchdog expired.

**How to apply:**
Keep runtime dependencies under cPanel's normal Node.js App Manager flow. Build the Prisma migration CLI and its matching Linux schema engines into the release artifact in Replit, then run that bundled CLI with cPanel's Node runtime. Keep the app-managed `node_modules` untouched and avoid network-based CLI installation on cPanel.