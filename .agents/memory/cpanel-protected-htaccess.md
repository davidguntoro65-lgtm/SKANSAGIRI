---
name: cPanel protected rewrite configuration
description: Production .htaccess is preserved and restored by deploy.sh, so repository-only rewrites do not automatically harden the live site.
---

When changing rewrite or access-control rules, update the repository `.htaccess` and make the deploy script idempotently apply required protections after restoring the cPanel-owned `.htaccess`. Keep deploy recovery backups outside `public_html`; physical-file rewrite rules can expose files inside hidden backup folders.

**Why:** cPanel deployments preserve the server-specific `.htaccess`, and a public-path audit confirmed that nested backup files and server build artifacts could be served despite root-only blocking rules.

**How to apply:** Treat `.htaccess` as server-owned during deploy. Reapply security rules after restore, keep recovery material outside the document root, and verify paths over HTTP after deployment.
