---
name: Pusat Diklat upload size
description: User decision about the maximum size for each uploaded Diklat document.
---

## Rule

Keep the maximum size for each Pusat Diklat upload at 20 MB. Do not raise it unless the user explicitly asks.

**Why:** The user chose to keep the existing 20 MB limit when asked whether it should be increased; no additional rationale was given.

**How to apply:** Preserve the cap in the admin document form and server validation. If a higher limit is requested later, verify memory use and cPanel request-size limits before changing it.
