# pov.et

> *Archive of everyday Ethiopian life.*

A quiet archive of everyday Ethiopian life, captured through phone photography.

This repository hosts the **website** — the canonical, immersive presentation
layer for an archive that already lives on Telegram.

- **Website** — [pov.et](https://pov.et)
- **Telegram channel** — `@pov_et`
- **Submission bot** — `@povetbot`
- **Instagram mirror** — `@pov_et1`

The website is **read-only** in V1. Telegram is the submission, community,
and moderation layer. The website is for discovery, presentation, immersion,
and permanence.

---

## Documents

Read in this order:

1. **[`PRODUCT.md`](./PRODUCT.md)** — what pov.et is, how it should feel,
   visual language, content structure. The soul of the project.
2. **[`ARCHITECTURE.md`](./ARCHITECTURE.md)** — stack, system design, data
   model, sync strategy, image pipeline. The engineering counterpart.
3. **[`ROADMAP.md`](./ROADMAP.md)** — build order, phases, done-when
   criteria.

---

## What we built

**Live in production** at [pov.et](https://pov.et). Phases 1–5 are deployed;
**Explore** is shipped; Phase 6 (editorial tooling) is next.

### Presentation layer

| Route | Purpose |
| ----- | ------- |
| `/` | Main immersive feed — CSS-column masonry, ISR every 5 minutes |
| `/explore` | Flattened image wall — infinite scroll, per-photo discovery |
| `/explore/image/[id]` | Full-page reader for a single photograph |
| `/post/[slug]` | Single post — gallery, caption, lightbox with keyboard/swipe nav |
| `/location/[slug]` | Location archive — emotional map of a place |
| `/photographer/[username]` | Contributor archive |
| `/about` | Manifesto / philosophy |
| `/submit` | Quiet redirect to `@povetbot` |

Explore uses a parallel `@modal` slot for intercepting routes — opening a
photo from the grid can stay in-context without losing scroll position.

### Discovery & SEO

- `/sitemap.xml` — posts, locations, contributors, explore
- `/robots.txt`
- `/feed.xml` — RSS 2.0 with cover thumbnail and `dc:creator`
- `/opengraph-image` — editorial OG card for wordmark pages; post pages use
  their cover photograph when shared

### Data & ingestion

- **Neon Postgres** + Prisma — source of truth for posts, media, locations,
  moods, contributors
- **GramJS sync worker** — pulls `@pov_et`, normalizes Telegram media groups
  into logical posts, downloads and processes photographs
- **GitHub Actions cron** — incremental sync every 20 minutes
- **Cloudflare R2** — content-hashed, immutable photograph storage in
  production (`media.pov.et`)

### Dev ergonomics

Without `DATABASE_URL`, the site falls back to `lib/mock-data.json` and
checked-in `public/mock/` images — same UI, no database required for a fresh
clone. With `DATABASE_URL`, everything reads from Postgres.

---

## Stack at a glance

- **Frontend** — Next.js 15 (App Router), TypeScript, Tailwind, Framer Motion
- **Database** — Neon Postgres + Prisma
- **Storage** — Cloudflare R2 (production); local `public/media/` (dev sync only)
- **Sync** — GramJS worker via GitHub Actions
- **Deployment** — Vercel (web), Neon (Postgres), Cloudflare R2 (media)

See `ARCHITECTURE.md` for rationale.

---

## Open questions

Remaining product decisions (answers can trickle in):

1. **Domain polish.** `pov.et` is the canonical URL. Confirm registrar/DNS if
   anything still points at interim hosts.
2. **Captions in Amharic.** Some captions are Amharic, some English, some
   mixed. Visible language indicator, or let the script speak for itself?
3. **Contributor display.** Telegram usernames vs. display names — which
   publicly? Some contributors may prefer anonymity.
4. **Reactions.** Surface on the website, or drop them for a quieter archive?
5. **Typography.** Fraunces + Inter in production. A/B with Newsreader, GT
   Sectra, EB Garamond, or Söhne if desired.
6. **Logo.** Vector version of the channel profile mark, or keep the raster?

Everything else — Telegram credentials, Neon, R2, Vercel, bootstrap dataset —
is provisioned and running.

---

## Local development

The site runs in two modes. Without a database, it serves the curated mock
dataset from `lib/mock-data.json`. With a `DATABASE_URL` set, it reads from
Postgres via Prisma. The UI is identical either way.

### No-database mode (fastest path)

```bash
pnpm install
pnpm run dev              # http://localhost:3000
```

### Database mode (local Docker Postgres)

The repo ships with a `docker-compose.yml` that runs Postgres 17 on
`localhost:5434` (5434 chosen to avoid colliding with any system Postgres
on 5432 or other dev containers on 5433).

```bash
docker compose up -d              # start local Postgres
cp .env.example .env              # match the URLs to docker-compose
pnpm run db:push                  # create the schema
pnpm run db:seed                  # import lib/mock-data.json
pnpm run dev                      # same UI, now backed by the DB
```

For a tracked-migration workflow against a real environment, use
`pnpm run db:migrate` (dev) and `pnpm run db:deploy` (CI/production)
instead of `db:push`.

### All scripts

| Command                   | Purpose                                                        |
| ------------------------- | -------------------------------------------------------------- |
| `pnpm run dev`            | Local dev server with hot reload                               |
| `pnpm run build`          | Production build (`prisma generate` + static generation)       |
| `pnpm run start`          | Run the production build                                       |
| `pnpm run bootstrap:mock` | Re-curate the mock dataset from `t.me/s/pov_et` (idempotent)   |
| `pnpm run db:generate`    | Regenerate the Prisma client                                   |
| `pnpm run db:push`        | Push the schema to the DB without a migration (early dev only) |
| `pnpm run db:migrate`     | Run / create a tracked migration (dev)                         |
| `pnpm run db:deploy`      | Apply migrations in CI / production                          |
| `pnpm run db:seed`        | Seed the DB from `lib/mock-data.json` (idempotent)             |
| `pnpm run db:studio`      | Open Prisma Studio                                             |
| `pnpm run telegram:login` | One-time interactive Telegram login (prints session string)    |
| `pnpm run telegram:sync`  | Sync the channel into Postgres (idempotent; `--full` for backfill) |
| `pnpm run test`           | Run unit tests (41 tests across parser, groups, explore, storage) |

The bootstrap script (`bootstrap:mock`) downloads photographs into
`public/mock/` with content-hashed filenames, mildly normalizes them
(preserving texture and grain), and emits a typed payload in
`lib/mock-data.json` matching `prisma/schema.prisma`.

The mock images are checked in. To refresh them against the latest channel
state, run `pnpm run bootstrap:mock` — re-runs only touch new files.

---

## Telegram sync

The sync worker authenticates as a delegated Telegram user, fetches new
channel messages, normalizes media groups into logical posts, downloads
and processes each photograph, and writes everything into Postgres.

It is **idempotent**: re-running over already-synced messages produces
no duplicates. The same message id always maps to the same post row.

### One-time setup

1. **Get API credentials.** Go to
   [my.telegram.org](https://my.telegram.org) and create an API app under
   "API Development Tools". You get an `App api_id` and `App api_hash`.
2. **Fill `.env`:**

   ```env
   TELEGRAM_API_ID=12345678
   TELEGRAM_API_HASH=abcd1234abcd1234abcd1234abcd1234
   TELEGRAM_CHANNEL=pov_et          # optional, defaults to pov_et
   ```

3. **Log in once.** This generates a long-lived session string that the
   sync worker uses for non-interactive runs.

   ```bash
   pnpm run telegram:login
   ```

   Follow the prompts (phone number, the code Telegram sends you, and
   your 2FA password if you have one). The script prints a session
   string — paste it into `.env`:

   ```env
   TELEGRAM_SESSION=<the long string the script printed>
   ```

   Treat this string like a password. It grants ongoing access to the
   account that issued it.

### Running the sync

```bash
pnpm run telegram:sync                     # incremental, last 200 msgs
pnpm run telegram:sync -- --limit 500      # larger window
pnpm run telegram:sync -- --full           # backfill from the start
```

The first run with `--full` populates the archive end-to-end. Subsequent
runs only fetch messages with ids higher than the latest one already in
the database, so they finish in seconds.

### Production schedule (GitHub Actions)

**Use GitHub Actions, not Vercel Cron.** The sync is a long-running Node
script (GramJS + Sharp + R2 uploads). Vercel serverless functions cap out
at 10–300 seconds and are a poor fit for multi-photo downloads.

Observed resource use on a Mac (incremental, nothing new to import):

| Run type | Posts / media | Wall time | Peak RAM |
| -------- | ------------- | --------- | -------- |
| Incremental (no-op) | 0 / 0 | ~3 s | ~170 MB |
| Incremental (1 new post) | 1 / 1 | seconds | similar |
| Full backfill | 100 / 643 | minutes | higher during downloads |

Scheduled incremental runs stay well within GitHub's default runner limits
(7 GB RAM, 45-minute job timeout in the workflow).

1. **Add repository secrets** (GitHub → Settings → Secrets and variables →
   Actions → New repository secret). Copy the same values you use locally
   and on Vercel:

   - `DATABASE_URL`, `DIRECT_URL` (Neon: **must** set `DIRECT_URL` to the
     non-pooled URL for Prisma transactions)
   - `TELEGRAM_API_ID`, `TELEGRAM_API_HASH`, `TELEGRAM_SESSION`
   - `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`,
     `R2_BUCKET`, `R2_PUBLIC_URL`

2. **Push** `.github/workflows/telegram-sync.yml` (included in this repo).
   It runs every **20 minutes** incrementally.

3. **Manual runs:** Actions → "Telegram sync" → Run workflow. Leave
   `full` unchecked for normal operation. Enable `full` only for repairs
   (uses a 3-hour timeout; same command as
   `pnpm run telegram:sync -- --full --limit 1000`).

4. **Failures:** The workflow exits non-zero when any post errors (e.g.
   Telegram `Timeout` on `upload.GetFile`, transient Neon transaction
   errors). The next scheduled run retries; for stubborn posts, run
   workflow manually once.

5. **Website freshness:** The site uses ISR (`revalidate = 300`), so new
   posts appear on [pov.et](https://pov.et) within about five minutes after
   a successful sync — no redeploy needed.

Photographs land wherever the storage backend (`lib/storage.ts`) is
configured to put them. By default — no R2 credentials in `.env` — they
go to `public/media/` (gitignored). With the five `R2_*` variables set,
they go to Cloudflare R2 instead with no other code changes.

---

## Image storage

The Telegram sync writes through `lib/storage.ts`, which selects a
backend at runtime based on environment variables:

| Condition                     | Backend          | URLs                          |
| ----------------------------- | ---------------- | ----------------------------- |
| No R2 variables set           | Local filesystem | `/media/<sha1>.jpg`           |
| All five `R2_*` variables set | Cloudflare R2    | `<R2_PUBLIC_URL>/<sha1>.jpg`  |

Production uses R2 at `https://media.pov.et`. Keys are
`sha1(fingerprint, bytes)` so identical content always resolves to the same
key — re-running the sync is a no-op for unchanged photos. R2 objects are
uploaded with `Cache-Control: public, max-age=31536000, immutable`.

For local R2 setup, see `.env.example` and the Cloudflare dashboard
(bucket creation, public access, API token, custom domain).

`next.config.mjs` auto-allows `*.r2.dev` and whatever hostname appears in
`R2_PUBLIC_URL` for `next/image`. No further configuration needed.

---

## License

TBD. The archive content is contributor-owned; the website code's license is
a decision for later.
