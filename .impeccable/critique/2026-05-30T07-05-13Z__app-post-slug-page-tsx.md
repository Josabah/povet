---
target: post page, explore image view, app-wide
total_score: 34
p0_count: 1
p1_count: 2
timestamp: 2026-05-30T07-05-13Z
slug: app-post-slug-page-tsx
---
## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Neighbour post nav was icon-only without labels |
| 2 | Match System / Real World | 4 | Editorial archive tone reads clearly |
| 3 | User Control and Freedom | 3 | Explore reader duplicated chrome; close affordance was small |
| 4 | Consistency and Standards | 3 | Mixed hover colors and control sizing across surfaces |
| 5 | Error Prevention | 4 | Low-stakes browsing; few destructive actions |
| 6 | Recognition Rather Than Recall | 3 | Explore cards all share generic "View photograph" label |
| 7 | Flexibility and Efficiency | 4 | Keyboard/swipe nav on reader and lightbox |
| 8 | Aesthetic and Minimalist Design | 4 | Photography-forward, restrained palette |
| 9 | Error Recovery | 3 | Neighbour fetch failures fail silently |
| 10 | Help and Documentation | 3 | About page covers philosophy; inline hints minimal |
| **Total** | | **34/40** | **Strong editorial baseline** |

## Anti-Patterns Verdict

**LLM assessment:** Not AI slop. The site reads as a deliberate editorial archive (Are.na / Kinfolk lineage), not a SaaS template. Main tells avoided: no gradient text, no hero metrics, no identical icon-card grids. Minor drift: header used decorative backdrop blur; stack badge used glass blur.

**Deterministic scan:** Clean across `app/` and `components/` (0 findings).

## Overall Impression

The archive already feels calm and photography-first. The biggest gap was structural: the explore image reader rendered a second site header on direct visits, breaking immersion and duplicating navigation in the accessibility tree. Secondary gaps were touch targets, focus visibility, and inconsistent quiet controls between post, explore, and lightbox surfaces.

## What's Working

- Masonry rhythm and variable image sizing keep the feed curated, not algorithmic.
- Explore reader architecture (hero swap + continuing wall) supports lingering without page churn.
- Typography pairing (Fraunces + Inter) and restrained ink/paper palette match the product brief.

## Priority Issues

**[P0] Duplicate header on explore image view**
- **Why:** Direct `/explore/image/[id]` visits showed two nav bars, violating fullscreen-first intent and confusing screen reader users.
- **Fix:** Remove nested `SiteHeader` from `ExploreReader`; rely on immersive overlay chrome.
- **Suggested command:** polish

**[P1] Undersized, inconsistent controls**
- **Why:** Close and step buttons used ~24px hit areas; fails mobile touch and keyboard discoverability.
- **Fix:** Shared `.ui-close` / `.ui-step` utilities with 44px minimum targets and unified hover/focus.
- **Suggested command:** polish

**[P1] Post neighbour navigation opaque to assistive tech**
- **Why:** Links announced only as "←" with no destination context.
- **Fix:** Add `aria-label` with location or contributor from neighbour post.
- **Suggested command:** clarify

**[P2] Hero/lightbox images lacked meaningful alt text**
- **Why:** Empty `alt` on primary viewing surfaces; captions exist but were not surfaced to AT users.
- **Fix:** `formatPhotoAlt()` helper using caption, location, contributor, stack index.
- **Suggested command:** harden

**[P2] Header glass blur**
- **Why:** Decorative glassmorphism conflicts with quiet editorial chrome; photography should carry atmosphere.
- **Fix:** Solid paper background with hairline border.
- **Suggested command:** quieter

## Persona Red Flags

**Jordan (First-Timer):** Post footer arrows had no visible or spoken destination. Explore grid tiles all announce identically as "View photograph," making the wall hard to skim by ear.

**Alex (Power User):** Keyboard navigation works on reader/lightbox, but focus rings were inconsistent on masonry tiles until explicit ring utilities were added.

**Museum visitor (project-specific):** Duplicate header on image view broke the meditative, fullscreen mood the brief describes.
