---
name: Backend atomic write & save handler audit
description: Rules from deep CRUD audit — atomic writes, res.ok checks, loginAttempts cleanup, default credentials.
---

## Rule: All file writes must use atomicWriteFile, never fs.writeFileSync
**Why:** fs.writeFileSync truncates the file first, then writes. A crash mid-write leaves a corrupted (empty or partial) JSON file — exactly what happened to data/manajemen-sekolah.json.
**How to apply:** Any new route that writes to a data/*.json file must call `atomicWriteFile(path, JSON.stringify(data, null, 2))` — never `fs.writeFileSync`.
Fixed in this session: writeSuara, writeKomentar, contact (3 places), tracer (2 places), /api/reset (6 places).

## Rule: AdminPanel save handlers must check res.ok
**Why:** `fetch()` only throws on network failure, not on HTTP 4xx/5xx. Without `res.ok` check, the UI shows "success" toast even when the server returned a 413 (photo too large) or 401 (expired session).
**How to apply:** Pattern: `const res = await fetch(...); if (res.ok) { showFeedback('OK', 'success'); } else { const err = await res.json().catch(()=>({})); showFeedback(err.error || 'Gagal ('+res.status+')', 'error'); }`
Fixed: handleSaveAbout, handleSaveKepala, handleSaveManajemen, handleSaveVisiMisi. Social-media was already correct.

## Rule: loginAttempts Map needs periodic cleanup
**Why:** Map grows indefinitely with one entry per unique IP. On a long-running server this is a memory leak.
**How to apply:** `setInterval(() => { ... loginAttempts.delete(ip) ... }, 10*60*1000).unref()` — runs every 10 min, purges entries idle > 10 min with no active lockout.

## DataStore send/receive contract
- POST endpoints for DataStore modules (competencies/milestones/gallery/alumni/news/partners): client sends `{ data: [...] }`, server destructures `const { data } = req.body`.
- GET endpoints return raw arrays (no wrapper). DataStore.initializeFromServer stores them directly in localStorage.
- Non-DataStore modules (kepala-sekolah, manajemen, about, visi-misi, social-media, branding): client sends object/array directly, server saves req.body as-is.

## Default admin credentials (no credentials file)
- Username: jobenenterprise
- Password: KuraKuraNinja!0!
- Falls back to env vars ADMIN_USERNAME / ADMIN_PASSWORD when data/admin-credentials.json absent.

## ManajemenSekolah defensive guard
- data/manajemen-sekolah.json MUST be a JSON array of 5 entries (waka-kesiswaan, waka-kurikulum, waka-sarpras, waka-humas, kepala-tu).
- Both ManajemenSekolah.tsx (page) and AdminPanel.tsx (line 343) now guard with Array.isArray(d) ? d : [].
