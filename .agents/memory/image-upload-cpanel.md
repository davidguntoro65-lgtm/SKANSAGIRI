---
name: Image upload cPanel crash fix
description: Why large image uploads crash the app on cPanel shared hosting, and how it was fixed.
---

## The Rule
Every image upload must be compressed client-side before sending, and the server must reject any base64 field exceeding a per-endpoint limit. All JSON data writes must be atomic.

**Why:**
cPanel shared hosting runs Apache → Passenger → Node.js. Apache's `LimitRequestBody` is typically 2–8 MB on shared plans. When the frontend sends a raw base64 image (e.g. a 3 MB PNG logo → ~4 MB base64), Apache drops the connection mid-request. This can corrupt the in-flight Express request and crash the Node.js process. Because Passenger does not always auto-restart cleanly, the result is "Cannot GET /id" — a 404 for the entire frontend.

Additionally, a branding.json holding 5 uncompressed logos can exceed 20 MB; `JSON.parse` of that on startup can OOM-kill Passenger.

**How to apply:**
1. **Frontend (AdminPanel.tsx)** — `compressImage(file, maxW, maxH, quality, maxKB)` utility using Canvas API. Applied to all upload handlers:
   - Logos (branding): 600×600 px, quality 0.86, max 220 KB per logo
   - About (gedung): 1400×1050 px, quality 0.82, max 420 KB
   - Kepala sekolah: 700×900 px, quality 0.85, max 330 KB
   - Manajemen sekolah: 600×800 px, quality 0.85, max 295 KB
   - SVG files are passed through unchanged (already vector/small)
2. **Backend (server.ts)** — `validateImageFields(obj, fields, maxKB)` returns an error string if any base64 field exceeds limit; endpoint returns HTTP 413. Limits mirror frontend.
3. **Backend (server.ts)** — `atomicWriteFile(path, data)` writes to `.tmp` then renames, preventing JSON corruption if the process crashes mid-write.
4. All data-writing endpoints updated to use `atomicWriteFile`.
