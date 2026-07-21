# SMK Negeri 1 Wonogiri — Website & Admin Panel

A full-stack school website for SMK Negeri 1 Wonogiri built with **React + Vite + TypeScript** on the frontend and **Express + TypeScript** on the backend.

## Stack

- **Frontend**: React 19, Vite 6, Tailwind CSS 4, Framer Motion
- **Backend**: Express 4, TypeScript (run via `tsx`)
- **Data**: JSON files under `data/` (persistent, written atomically)
- **Auth**: Session-based admin login (server-side)

## How to run

```
npm run dev
```

Starts the Express server on **port 5000**, which also serves the Vite dev client via middleware. The workflow `Start application` is configured to run this automatically.

## Environment variables

| Variable | Purpose | Default |
|---|---|---|
| `ADMIN_USERNAME` | Admin panel login username | `jobenenterprise` |
| `ADMIN_PASSWORD` | Admin panel login password | (see memory) |
| `SESSION_SECRET` | Signs session tokens | required |
| `NODE_ENV` | `development` or `production` | `development` |
| `PORT` | Server port | `5000` |

Set `ADMIN_USERNAME` and `ADMIN_PASSWORD` via Replit Secrets if you want to override the defaults.

## Key routes

- `/` — Public homepage
- `/berita` — News & articles page
- `/adm-panel` — Admin login & management panel

## Data files

All content (news, gallery, milestones, alumni, etc.) is stored as JSON in `data/`. On first run each file is seeded from the hardcoded defaults in `src/data.ts`.

## Build for production

```
npm run build   # outputs dist/server.cjs + frontend assets
npm start       # runs the compiled bundle
```

The `.htaccess` and `deploy.sh` files are for cPanel/Passenger deployment.

## User preferences

- Keep the existing project structure (Express + React monorepo, no workspace migration).
- All write operations must use `atomicWriteFile` from `server.ts`.
