---
name: cPanel API base path
description: The app is mounted under /id on cPanel, so browser API requests must include the deployment prefix.
---

## Rule
When the application is served from a cPanel subpath such as `/id`, API requests must resolve to `/id/api/...`; the domain-root `/api/...` path is outside the Node application and returns a hosting 404.

**Why:**
The production health endpoint was healthy at `/id/api/health`, while `/api/health` returned LiteSpeed 404 HTML. The admin UI treated that non-JSON response as a server outage.

**How to apply:**
Resolve the API prefix from the runtime asset/base path and use it for admin health, authentication, and data requests. Rebuild with `VITE_BASE_PATH=/id/` before uploading `dist/`.