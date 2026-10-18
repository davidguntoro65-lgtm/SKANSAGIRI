---
name: Pusat Form data boundary
description: The Pusat Form module must reuse existing academic student identity data and keep submissions separate.
---

Pusat Form may look up existing student records by NIS and prefill from that record. Keep form responses in form-specific storage; do not add or duplicate student master data or tables in the core academic student system.

**Why:** the user explicitly directed that student data already in the academic database be called by NIS, without creating new data or tables in that core student data.

**How to apply:** for future Pusat Form forms, link an existing student only when its NIS matches; otherwise allow manual identity entry and store the form submission separately.
