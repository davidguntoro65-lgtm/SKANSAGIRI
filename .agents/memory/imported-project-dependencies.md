---
name: Imported project dependency setup
description: Dependency behavior observed after importing this project into Replit
---

Imported projects can arrive with `package-lock.json` but without installed packages, so the configured workflow may fail immediately with a missing-package error even when the code is valid.

**Why:** The first workflow failure was caused by missing runtime dependencies rather than application code.

**How to apply:** Install the declared Node dependencies through the package-management flow before debugging startup or changing the run command. After installing, check `package.json` and `package-lock.json`: the package installer can advance dependency ranges to newer compatible versions, so restore unintended manifest/lockfile changes when the goal is only to hydrate dependencies.

**Why:** A Replit package installation for a missing-tool error changed several declared ranges and lockfile resolutions even though the request was only to install the existing project dependencies.