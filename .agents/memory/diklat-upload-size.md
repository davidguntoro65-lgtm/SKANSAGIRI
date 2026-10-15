---
name: Pusat Diklat upload size
description: User decision about the maximum size for each uploaded Diklat document.
---

## Rule

Allow up to 40 MB per Diklat material file, with no more than 10 uploaded materials per Diklat. Allow up to 6 Diklat photos, each no larger than 20 MB. External links have separate caps of 10 Materi and 10 LKPD links per Diklat. Do not raise these caps without an explicit request.

**Why:** On 2026-10-15 the user explicitly requested the upload and photo caps, then confirmed a separate 10-link cap for each of Materi and LKPD.

**How to apply:** Enforce file and link limits independently in admin controls and server validation. Preserve lower per-module file limits when configured, and keep photo resizing enabled for public-page performance.
