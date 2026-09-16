---
name: Imported project dependency setup
description: Dependency behavior observed after importing this project into Replit
---

Imported projects can arrive with `package-lock.json` but without installed packages, so the configured workflow may fail immediately with a missing-package error even when the code is valid.

**Why:** The first workflow failure was caused by missing runtime dependencies rather than application code.

**How to apply:** Install the declared Node dependencies through the package-management flow before debugging startup or changing the run command.