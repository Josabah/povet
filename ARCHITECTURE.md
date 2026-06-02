# pov.et — Architecture

> The architecture should disappear behind the archive.

This document describes **how pov.et is built**. It is the engineering
counterpart to `PRODUCT.md`. Read `PRODUCT.md` first.

---

## Guiding principles

pov.et is **not** a platform-first product. It is:

- a media archive
- a presentation layer
- a curated visual system

Therefore: **simplicity, maintainability, and performance** matter more than
scalability theater.

Build for:

- elegance
- clarity
- extensibility
- low operational complexity

Not for:

- microservices
- enterprise abstractions
- premature scaling

This project is **experience-first software**. Every technical decision should
support immersion, smoothness, emotional pacing, permanence, calmness.

---

## Core architecture principle

> **Telegram is the ingestion layer.**
> **The website is the presentation layer.**
> **The database is the source of truth.**

Never use Telegram itself as the database.

```
Telegram Channel/Bot
        │
        ▼
  Sync Service
        │
        ▼
Normalization Layer
        │
        ▼
   Database  ◄────── source of truth
        │
        ▼
 Website / API
```

This separation enables future support for: mobile apps, search, maps,
curation, moderation tools, AI tagging, analytics, exports, archival
tooling — without being trapped by Telegram's API or UX.

---

## Stack

### Frontend

- **Next.js** (App Router)
- **TypeScript**
- **Tailwind CSS**
- **Framer Motion**

### Backend

- **Next.js Route Handlers** initially
- optional separate API service later (only if needed)

### Database

- **PostgreSQL**
- **Prisma** as ORM (fast iteration, type safety, easy schema evolution)

### Image storage

- **Cloudflare R2** — chosen for cheap storage, no egress fees, and headroom
  for an image-heavy archive. The codebase abstracts the storage client
  behind a thin interface so this can evolve later if we ever need to.

### Deployment

- **Vercel** for the frontend
- **Neon** for Postgres (pooled `DATABASE_URL` + non-pooled `DIRECT_URL`)
- **Cloudflare R2** for images (`media.pov.et` in production)

### Image optimization

- `next/image` for responsive sizing and lazy loading
- WebP generation, but **mild** — no aggressive recompression
- blurhash placeholders for elegant loading

---

## Why this stack

**Next.js** — excellent image handling, SSR/ISR, fast iteration, mobile-first
workflows, easy deployment, ideal for editorial experiences.

**Postgres** — structured relational content, future-proof, stable, powerful
querying for locations, moods, contributors, and search.

**Prisma** — type-safe schema evolution at the speed this project needs.

**Cloudflare R2** — cheap storage, no egress, scalable for image-heavy
workloads.

---

## System design

```
       Telegram Bot/Channel
                │
                ▼
       Telegram Sync Worker         (cron, every ~1 min)
                │
                ▼
        Content Parser               (groups media_group_id, merges captions)
                │
                ▼
      Normalization Pipeline         (locations, contributors, ordering)
                │
                ▼
    PostgreSQL  +  Image Storage     (R2 or Supabase)
                │
                ▼
         Public Website
```

---

## Telegram ingestion

**Do not** scrape Telegram HTML pages.

Use the **Telegram client API** directly. The bot API alone is not enough — it
cannot fetch channel history reliably.

Recommended library: **GramJS** (Node/TypeScript) so the sync service shares a
language with the rest of the stack. Telethon (Python) is a fine alternative
if it ever pays off; for now we stay monolingual.

The sync service:

1. authenticates as a Telegram user (the channel owner or a delegated
   account)
2. fetches latest channel messages
3. **groups by `media_group_id`** (critical — see below)
4. extracts metadata
5. downloads media
6. stores structured content

### Media groups (critical detail)

A single post with N photos appears in Telegram as **N separate messages**
sharing the same `media_group_id`. The caption may appear on only one of them
(usually the first).

Normalization must:

- group all messages by `media_group_id`
- pick the merged caption (concatenate or prefer the first non-empty one)
- preserve image order
- preserve the earliest timestamp as `publishedAt`
- treat a message with no `media_group_id` as a single-image post

This is easy to get wrong, and getting it wrong corrupts the archive. Write
unit tests for the grouper.

---

## Data model

A first-pass schema. Add fields when they become necessary, not before.

```prisma
model Post {
  id                    String     @id @default(cuid())
  slug                  String     @unique
  telegramMessageId     BigInt     @unique
  mediaGroupId          String?    @index
  caption               String?
  contributorUsername   String?
  contributorDisplayName String?
  locationId            String?
  location              Location?  @relation(fields: [locationId], references: [id])
  reactions             Json?
  views                 Int        @default(0)
  status                PostStatus @default(PUBLISHED)
  featured              Boolean    @default(false)
  dominantColor         String?
  aspectRatio           Float?
  createdAt             DateTime   @default(now())
  publishedAt           DateTime
  media                 Media[]
  moods                 PostMood[]

  @@index([publishedAt])
  @@index([contributorUsername])
}

model Media {
  id            String  @id @default(cuid())
  postId        String
  post          Post    @relation(fields: [postId], references: [id], onDelete: Cascade)
  imageUrl      String
  thumbnailUrl  String
  width         Int
  height        Int
  orderIndex    Int
  blurHash      String?

  @@index([postId, orderIndex])
}

model Location {
  id    String @id @default(cuid())
  name  String
  slug  String @unique
  posts Post[]
}

model MoodTag {
  id    String     @id @default(cuid())
  name  String
  slug  String     @unique
  posts PostMood[]
}

model PostMood {
  postId String
  moodId String
  post   Post    @relation(fields: [postId], references: [id], onDelete: Cascade)
  mood   MoodTag @relation(fields: [moodId], references: [id], onDelete: Cascade)

  @@id([postId, moodId])
}

enum PostStatus {
  DRAFT
  PUBLISHED
  HIDDEN
}
```

Notes:

- `mediaGroupId` is nullable for single-image posts.
- `reactions` is `Json` so we can mirror Telegram's reaction shape without
  schema churn.
- `featured` and `status` exist now so editorial tooling becomes additive
  later.
- `dominantColor` + `aspectRatio` on `Post` are cached for fast feed
  rendering before any image loads.

---

## Image pipeline

```
Telegram image
     │
     ▼
Download (original bytes)
     │
     ▼
Mild compress (preserve grain & texture)
     │
     ▼
Generate variants: full · feed · thumb
     │
     ▼
Generate blurhash + dominant color
     │
     ▼
Upload to R2 (content-hashed keys)
     │
     ▼
Persist metadata in Postgres
```

Rules:

- Variants are mild. We are not trying to win a Lighthouse score at the cost
  of texture.
- Use content-hashed keys (`media/{hash}.{ext}`) so re-syncs are idempotent.
- Strip EXIF only for privacy; keep image character.
- Blurhash powers the elegant loading placeholders the design demands.

---

## Performance strategy

This site should feel **instant, smooth, lightweight**.

Critical optimizations:

- server-rendered feed
- static generation where possible (post pages)
- incremental regeneration for the homepage
- intersection-observer-based lazy image loading
- route preloading on hover/tap
- CDN caching for images and HTML

Avoid:

- client-heavy architecture
- unnecessary state management
- giant bundles
- virtualization until profiling proves we need it

---

## Rendering strategy

| Route                 | Strategy                          |
| --------------------- | --------------------------------- |
| `/`                   | ISR every few minutes             |
| `/explore`            | ISR + client infinite scroll      |
| `/explore/image/[id]` | ISR + parallel modal slot         |
| `/post/[slug]`        | Static (regenerate on sync)       |
| `/location/[slug]`    | ISR                               |
| `/photographer/[u]`   | ISR                               |
| `/about`              | Static                            |
| `/submit`             | Static redirect                   |

This keeps SEO healthy, load times fast, and infrastructure cheap.

---

## Feed architecture

The homepage feed is the core product. Architect it carefully.

Requirements:

- masonry / grid hybrid
- variable image sizing
- infinite loading
- mobile-first
- low layout shift (use stored `aspectRatio` to reserve space)

Prefer **CSS columns** initially. They are cheap, accessible, and render
beautifully for image-heavy feeds. Reach for a masonry library only if columns
prove insufficient.

Avoid:

- rigid card systems
- equal-height layouts

The feed should feel **organic**.

---

## Search & discovery (future)

Architecture should support, without committing to V1:

- location browsing
- contributor browsing
- mood tags
- text search across captions
- time-based exploration ("Addis, autumn 2024")

The schema above accommodates all of these. Surface them in the UI only when
the archive earns them.

---

## Sync strategy

Do not over-engineer sync. Start with a **single cron**:

- runs every ~1 minute
- fetches the latest N messages from the channel
- detects new `media_group_id`s and individual messages
- writes normalized rows + downloads media
- idempotent: re-running a sync over the same window is safe

Avoid (until we have evidence we need them):

- event streaming
- queues
- Kafka
- distributed systems

Premature complexity will kill velocity on a project whose real bottleneck is
**curation**, not throughput.

---

## Admin tools

V1: no admin dashboard. Manual workflows are acceptable. Direct DB tweaks via
Prisma Studio or psql are fine for the early archive.

Future:

- moderation queue
- tagging UI
- feature selection
- editorial curation tools

Add these only when manual workflow stops scaling.

---

## API design

Internal-only. Next.js Route Handlers consumed by Server Components and
the Explore client grid:

- `GET /api/explore` — cursor-paginated flattened image stream
- `GET /api/explore/neighbors` — reader window around a single image id

Do not ship a public REST or GraphQL API in V1. The website is the API.

Later, when there is a real consumer (mobile app, map integration, partner),
expose a small, well-versioned public archive API.

---

## Security & rate limiting

- protect Telegram credentials (server-only env vars)
- the sync worker runs in a controlled environment (not in the public Next.js
  runtime — a separate cron, container, or worker)
- no public upload endpoints in V1
- rate-limit public APIs (basic IP-based limiting via middleware)
- consider signed image URLs only if hotlinking becomes a problem

---

## Scaling reality

This project will likely bottleneck on **curation, aesthetics, and community
quality** — not infrastructure.

Optimize for **iteration speed and design quality**, not for distributed
architecture.

---

## Repository layout

```
pov.et/
├─ app/                   Next.js App Router (pages, API routes, OG, RSS)
│  ├─ explore/           Image wall + intercepting modal reader
│  └─ api/explore/       Cursor-paginated explore JSON
├─ components/           UI (feed, explore, lightbox, chrome)
├─ lib/                  Data access, Telegram sync, storage, explore
│  └─ telegram/          Parser, grouper, media pipeline, sync orchestrator
├─ prisma/               Schema + migrations
├─ scripts/              Bootstrap, seed, Telegram login/sync, repairs
├─ tests/                Unit tests (parser, groups, explore, storage)
├─ public/mock/          Checked-in dev photographs (no-DB fallback)
├─ .github/workflows/    Telegram sync cron
├─ ARCHITECTURE.md
├─ PRODUCT.md
├─ ROADMAP.md
└─ README.md
```

A single Next.js app with co-located sync scripts is the current shape.
Split into a monorepo only if the sync worker needs its own deployment
lifecycle.

---

## Most important engineering principle

> Every technical decision should support immersion, smoothness, emotional
> pacing, permanence, and calmness.

The architecture should disappear behind the archive.
