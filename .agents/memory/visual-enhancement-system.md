---
name: Visual Enhancement System
description: How the 5 enterprise visual features are implemented in the SMKN 1 Wonogiri portal
---

## BackgroundSystem.tsx components
- `GlobalPageBg` — fixed z-0 gradient mesh wrapping the whole page (used in App.tsx)
- `FloatingShapes` — motion-animated geometric shapes, opacity ~1-3%
- `GradientMesh` — blurred gradient orbs, variants: default/warm/cool
- `SectionPattern` — SVG patterns per section type: network/editorial/achievement/grid/dots
- `AuroraBg` — animated aurora orbs for CTA/dark mode sections
- `BusinessIllustration` — subtle SVG line art (office/charts), opacity ~3-4%

## Section pattern assignments
- Competencies → SectionPattern type="network" + GradientMesh variant="warm"
- Achievements → SectionPattern type="achievement" + GradientMesh variant="warm"
- News → SectionPattern type="editorial" + GradientMesh
- CampusLife → SectionPattern type="grid" + GradientMesh
- About → GradientMesh variant="warm" + FloatingShapes + BusinessIllustration

## Logo Management (Feature 1)
- Storage: branding data is stored in the database `Setting` record named `branding`
- Fields: schoolLogo, schoolLogoDark, schoolLogoLight, schoolFavicon, schoolAppIcon
- API: GET /api/branding, POST /api/branding
- Hook: `src/hooks/useBranding.ts` → useBranding() returns { branding, loading, saveBranding, fetchBranding, getLogo(theme) }
- getLogo(theme) returns dark-specific or light-specific logo, falling back to schoolLogo
- Navbar: shows `<img h-10 md:h-12>` if logoUrl exists, else original Landmark icon fallback
- Footer: shows `<img h-16>` if logoUrl exists, else original layout fallback

## AdminPanel additions
- activeTab type extended to include "branding"
- Sidebar nav item: { id: "branding", label: "Identitas & Logo", icon: Image, count: null }
- count: null hides the count badge (all other tabs show count)
- "Tambah Data Baru" button hidden when activeTab === "branding"
- Branding panel uses IIFE pattern: `{activeTab === "branding" && (() => { ... })()}`
- brandingDraft state holds pending changes; null = no unsaved changes

## Pusat Diklat theme
- Keep the public module on one fixed light theme, independent of the site's global theme. Use the light school-logo variant and pale-blue surfaces with dark text.

**Why:** The user explicitly asked for one consistent theme in Pusat Diklat; global theme text overrides previously made dark text unreadable on its dark detail hero.

**How to apply:** When editing any Pusat Diklat route, do not derive its palette or logo variant from the app-wide theme. Preserve readable contrast on detail pages, forms, and action buttons.
