---
name: cPanel API base path
description: The app is mounted under /id on cPanel, so browser API requests must include the deployment prefix.
---

## Rule
When the application is served from cPanel under `/id`, assets and API requests must resolve to `/id/...`; the domain-root `/api/...` path is outside the Node application and returns a hosting 404. Build that artifact with `npm run build:cpanel`.

**Why:**
The production health endpoint was healthy at `/id/api/health`, while `/api/health` returned LiteSpeed 404 HTML. The admin UI treated that non-JSON response as a server outage.

**How to apply:**
Resolve the API prefix from the runtime asset/base path and use it for admin health, authentication, and data requests. Use `npm run build:cpanel` before committing `dist/` for cPanel. Keep Replit's production base path at `/`; the two deployment targets need different asset roots.