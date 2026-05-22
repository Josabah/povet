# pov.et — Product Brief

> *Ethiopia seen softly.*

This document describes **what pov.et is**, how it should feel, and the
principles that govern every product decision. It is the soul of the project.
Read this before writing code. Re-read it when in doubt.

---

## What this is

pov.et is a **quiet digital archive** of everyday Ethiopian life captured
through phone photography.

The project already exists as:

- a **Telegram channel** (the published archive)
- a **Telegram bot** for submissions (`@povetbot`)
- an **Instagram mirror** (`@pov_et1`)

Submissions arrive through Telegram. Moderation happens manually. Accepted
photos are posted to the channel.

The website is a new layer — not a replacement. It becomes:

- the **canonical archive**
- the **beautiful browsing layer**
- the **immersive gallery experience**

Telegram remains the submission, community, and moderation layer. The website
is for **discovery, presentation, immersion, and permanence**.

---

## What this is NOT

- ❌ a social media app
- ❌ "Instagram for Ethiopia"
- ❌ a startup dashboard product
- ❌ a photography competition
- ❌ a likes machine
- ❌ a place for heavily filtered spam

Every feature request should be tested against this list.

---

## Reference points

The website should feel like the digital cousin of:

- Are.na
- Kinfolk
- editorial archives
- documentary moodboards
- slow internet
- visual anthropology
- Japanese photography books
- quiet museum interfaces

Not:

- TikTok
- Instagram clones
- flashy startup products
- dopamine UI
- crypto aesthetics

---

## Emotional identity

The archive should feel:

- intimate
- documentary
- calm
- cinematic
- breathable
- timeless

The interface should feel:

- editorial
- minimal
- tactile
- immersive
- intentionally slow

The site should encourage **lingering**. Whitespace, typography, and image
pacing all matter more than features.

This project values:

> atmosphere · ordinary moments · quiet observation · locality · texture ·
> weather · streets · architecture · silence · memory · slowness ·
> imperfection · humanity

---

## Visual language

### Color system

Keep the palette restrained. Allow photography to provide most of the color.
The UI itself should remain quiet.

Primary palette (drawn from the channel's profile mark):

| Token            | Hex       | Role                              |
| ---------------- | --------- | --------------------------------- |
| `paper`          | `#feffff` | page background, off-white        |
| `ink`            | `#1d4351` | primary text, deep slate          |
| `sky`            | `#a9d4e4` | accent, links, soft highlights    |
| `moss`           | `#5d873a` | secondary accent, used sparingly  |
| `mist`           | `#cedfe4` | dividers, hairlines, muted fields |

Supplementary neutrals:

- warm grays for body copy
- soft black (`#0c1418`) for fullscreen viewer backgrounds

### Typography

The typography should support silence.

- editorial · literary · calm · modern but timeless
- strong spacing, balanced line lengths, subtle hierarchy
- avoid: loud display fonts, trendy startup typography, overly geometric faces

Recommended pairing (to validate during prototype):

- **Display / titles** — a refined serif (e.g. *Fraunces*, *Newsreader*,
  *GT Sectra*, or *EB Garamond*)
- **Body / UI** — a humanist sans (e.g. *Inter*, *Söhne*, or *Geist Sans*)
- **Mono** — only if needed for metadata or system text

Final type selection is a design decision, not a configuration line. We will
choose during prototyping.

### Motion

Motion should be **slow, subtle, elegant, almost invisible**.

Good motion:

- gentle fade-ins as images enter the viewport
- soft image scaling on hover/tap
- smooth fullscreen transitions
- calm page transitions

Avoid:

- bouncy springs
- aggressive parallax
- flashy reveals
- attention-seeking motion

The site should feel **meditative**.

### Layout

- generous spacing
- minimal chrome
- the interface should disappear behind the photography
- avoid card-heavy UI, equal-height layouts, rigid grids
- prefer masonry/grid hybrids with variable image sizing

---

## Image philosophy

The photos are **intentionally imperfect**.

**Do not:**

- over-sharpen
- aggressively optimize
- remove grain
- make everything ultra-clean

Imperfection is part of the emotional texture: blur, darkness, noise, motion,
compression artifacts, phone-camera limitations.

Preserve authenticity. The archive should feel **human**.

The technical pipeline (see `ARCHITECTURE.md`) honors this by avoiding
aggressive recompression and by serving images at sizes that respect their
original character.

---

## Content structure

Each **post** may contain:

- 1–10 images
- caption
- location
- contributor username
- reactions
- timestamp

Common subjects:

- streets · weather · architecture · cafes · portraits · night scenes ·
  documentary moments · urban Ethiopia · rural Ethiopia · everyday life

Captions are often **poetic or reflective**. Their tone must remain untouched.
No paraphrasing, no AI rewriting, no "engagement-optimized" titles.

---

## Site structure (V1)

| Route                       | Purpose                                |
| --------------------------- | -------------------------------------- |
| `/`                         | Main immersive feed                    |
| `/post/[slug]`              | Single post experience                 |
| `/location/[slug]`          | Location-specific archive              |
| `/photographer/[username]`  | Contributor archive                    |
| `/about`                    | Manifesto / philosophy                 |
| `/submit`                   | Redirect to Telegram bot (`@povetbot`) |

---

## Feed design

The homepage **is the product**.

The homepage should:

- feel immersive immediately
- prioritize imagery
- avoid visual noise
- create rhythm between posts

Behavior:

- infinite scroll
- masonry / grid hybrid
- variable image sizes
- cinematic spacing
- subtle motion only

The feed should **not feel algorithmic**. It should feel **curated**.

Avoid:

- engagement counters dominating
- social media density
- card-heavy UI
- boxed layouts

Images should breathe.

---

## Post design

A post page contains:

- image grid (1–10 images)
- optional caption
- optional location
- contributor credit

The viewing experience matters most:

- smooth transition into the post
- **fullscreen-first** mentality
- dark, immersive background in the viewer
- distraction-free presentation
- captions feel editorial, not social

---

## Location experience

Locations are extremely important. Examples:

- Addis Ababa
- Gondar
- Adama
- 4 Kilo
- 6 Kilo
- …

Location pages should feel like **emotional maps** — visual archives of
place, not search-results pages.

Future possibilities (not V1):

- map browsing
- mood categories
- visual journeys through Ethiopia

Design now so these are easy to add later.

---

## UX principles

The user should never feel **overwhelmed · manipulated · rushed · gamified**.

The user should feel **calm · curious · emotionally present · reflective**.

We design for **emotional pacing**.

---

## What this project really is

Not merely a photo website. It is:

- a cultural interface
- a living archive
- a collective visual memory
- a slow gallery of Ethiopian life

Every design decision should reinforce that feeling.

---

## The final design test

The final test is **not** "Does this feel technically impressive?"

The final test is:

> **"Does this make Ethiopian everyday life feel beautiful, human, and worth
> preserving?"**

If the answer is no, the work is not done.
