---
name: Sub-page z-index rule
description: Sub-page sections need relative z-10 to appear above GlobalPageBg which is fixed inset-0 z-0
---

Any new sub-page section must have `relative z-10` on its root element.

**Why:** `GlobalPageBg` uses `fixed inset-0 z-0`. In CSS painting order, `z-index: 0` positioned elements paint AFTER normal block-flow elements — so without an explicit stacking context (relative + z-index ≥ 1), page content is hidden behind the background gradient. Framer Motion-animated elements happen to work because CSS transforms auto-create stacking contexts, but plain static elements do not.

**How to apply:** When creating a new sub-page component, add `relative z-10` to the outermost `<section>` or `<main>` element, e.g.:
```tsx
<section className={`relative z-10 min-h-screen pt-28 pb-24 ${bg}`}>
```
