---
name: Pusat Diklat Drive integration boundary
description: Google Drive authentication differs between Replit and the cPanel deployment
---

Replit's managed Google Drive connector and the cPanel service-account fallback remain available, but the admin's Google sign-in popup requires a separate Google OAuth web client in either environment. Never store or log credentials in the repository.

**Why:** Replit's managed OAuth connection is not inherited by the school's cPanel Node process, and the user requested admins to choose and connect a Google account from the site itself.

**How to apply:** For site-based Google login, configure the OAuth client ID, secret, exact callback URL, and `SESSION_SECRET` in the server environment. Retain the existing Replit connector and cPanel service-account paths as alternatives; do not put credentials in Git.
