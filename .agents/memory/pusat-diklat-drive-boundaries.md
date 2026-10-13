---
name: Pusat Diklat Drive integration boundary
description: Google Drive authentication differs between Replit and the cPanel deployment
---

Use the managed Google Drive connector in Replit and retain the service-account fallback for cPanel. Never store or log either credential in the repository.

**Why:** Replit's OAuth connection is available to the Replit runtime but is not inherited by the school's cPanel Node process.

**How to apply:** In Replit, make fresh connector proxy calls through `@replit/connectors-sdk`. In cPanel, an operator must configure `GOOGLE_SERVICE_ACCOUNT_JSON` in the Node application's protected environment before Drive uploads and downloads can work.
