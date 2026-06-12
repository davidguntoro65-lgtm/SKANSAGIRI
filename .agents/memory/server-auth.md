---
name: Server-side auth architecture
description: How admin authentication and write-protection works after the security hardening for cPanel deployment
---

## Rule
All admin authentication is server-side. Credentials are NEVER in the client JS bundle.

## How it works
- `/api/auth/login` POST — verifies credentials from `process.env.ADMIN_USERNAME` / `ADMIN_PASSWORD` (fallback: hardcoded values). Returns a random 96-char hex token on success.
- `/api/auth/verify` GET — checks if the stored token is still in the in-memory `activeSessions` Set.
- `/api/auth/logout` POST — removes token from `activeSessions`.
- Global middleware in server.ts guards ALL POST/DELETE/PUT/PATCH routes EXCEPT `/api/auth/login` and `/api/tracer` (public alumni submission).
- Token is stored in `localStorage` as `smkn1_adm_token`.
- Both `AdminPanel.tsx` and `AdminTracerStudi.tsx` have a `getAuthHeaders()` helper that reads the token and returns `{ "Content-Type": "application/json", "Authorization": "Bearer <token>" }`.
- `dataStore.ts` also has its own `getAuthHeaders()` for `saveStoredData` and `resetAll` calls.
- On mount, both admin components call `/api/auth/verify` — if it fails (e.g. server restart cleared sessions), localStorage token is removed and user sees login screen.
- Rate limiting: 5 failed attempts per IP → 60s lockout. Tracked in `loginAttempts` Map.

**Why:** Credentials in client-side JS are visible in the bundle to anyone who opens DevTools. Moving auth server-side means credentials never leave the server.

**How to apply:** Any new admin write endpoint must either be added to `publicPosts` in the global guard (if truly public) or will be automatically protected. Never put credential checks in React components.

## cPanel deployment
- `PORT` is read from `process.env.PORT` (Passenger sets this automatically).
- `app.js` at project root is the cPanel Application Startup File — it just requires `./dist/server.cjs`.
- `.env.example` documents the required environment variables.
- `.htaccess` blocks direct access to `data/`, `.env`, `.ts`, `.json` files.
- Build: `npm run build` → `dist/` (Vite frontend + bundled server.cjs).
- Start: `npm run start` → `node dist/server.cjs` (or via `app.js`).
- `dotenv/config` is imported at the top of `server.ts` to support `.env` files.
