---
name: SPA trailing-slash routing
description: Client-side route matching behavior for direct URLs with trailing slashes and deployed base paths
---

Client-side route matchers must normalize trailing slashes before comparing paths, including when the app is deployed below a base path.

**Why:** Direct navigation, preview links, and web-server rewrites may produce `/route/` even when in-app navigation uses `/route`; exact matching otherwise silently falls back to the homepage.

**How to apply:** Normalize `window.location.pathname` and the detected base path at the shared navigation boundary, then keep page route comparisons exact.