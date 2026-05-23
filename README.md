# pov.et

> *Ethiopia seen softly.*

A quiet digital archive of everyday Ethiopian life, captured through phone
photography.

This repository will host the **website** — the canonical, immersive
presentation layer for an archive that already lives on Telegram.

- Telegram channel — `@pov_et`
- Submission bot — `@povetbot`
- Instagram mirror — `@pov_et1`

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
3. **[`ROADMAP.md`](./ROADMAP.md)** — build order. Phases. Done-when
   criteria.

---

## Status

**Live in production.** Phases 1–5 deployed; Phase 6 (editorial tooling) is the
next dev work.

- Phase 1 ✅ — prototype renders against a curated mock dataset (13 posts,
  88 photographs).
- Phase 2 ✅ — location and contributor pages live.
- Phase 3 ✅ — Prisma schema, initial migration, idempotent seed, and a
  Prisma-first / JSON-fallback data layer. Running on **Neon Postgres** in
  production.
- Discovery polish ✅ — `/sitemap.xml`, `/robots.txt`, `/feed.xml` (RSS 2.0),
  and an editorial `/opengraph-image` for the wordmark pages. Post pages
  use their own cover photograph as their Open Graph image.
- Phase 4 ✅ — GramJS sync worker live against the channel. Backfill landed
  and incremental syncs run on a GitHub Actions cron every 20 minutes.
  Media-group normalizer well-tested (12 unit tests, all green).
- Phase 5 ✅ — Cloudflare R2 storage backend live in production. Idempotent
  uploads, immutable cache headers, content-hashed keys. Falls back to local
  filesystem in dev when R2 env vars are unset.
- Deployment ✅ — site is live on **Vercel** with `prisma generate` wired
  into the build to survive Vercel's dependency caching. Production env
  has `DATABASE_URL`, `DIRECT_URL`, R2 credentials, and Telegram
  credentials configured.

---

## Stack at a glance

- **Frontend** — Next.js (App Router), TypeScript, Tailwind, Framer Motion
- **Database** — Postgres + Prisma
- **Storage** — Cloudflare R2 (preferred) or Supabase Storage
- **Sync** — GramJS worker against the Telegram client API
- **Deployment** — Vercel (web), Supabase/Railway/Neon (Postgres), R2 (media)

See `ARCHITECTURE.md` for why.

---

## Open questions

These are the things I need from you before we start Phase 1. Answers can
trickle in — they don't all have to land at once.

### Product

1. **Domain.** Is `pov.et` registered? If yes, with which registrar? If no,
   should we register it now?
2. **Captions in Amharic.** Some captions will be Amharic, some English,
   some mixed. Do you want any visible language indicator, or should we let
   the script speak for itself?
3. **Contributor display.** Telegram usernames vs. display names — which do
   you want shown publicly? Some contributors may prefer not to be named.
4. **Reactions.** Surface them at all on the website, or drop them entirely
   in favor of a quieter archive feel?
5. ~~**About page copy.**~~ ✅ I'll draft in the project's voice and you'll
   edit.

### Engineering / access

6. ~~**Telegram credentials.**~~ ✅ Personal-account API credentials issued
   via [my.telegram.org](https://my.telegram.org); session string generated
   with `pnpm run telegram:login` and stored as a repo secret + Vercel env
   var. Initial backfill landed.
7. ~~**Storage choice.**~~ ✅ **Cloudflare R2** — bucket provisioned, public
   URL configured, sync writing live.
8. ~~**Hosting accounts.**~~ ✅ Vercel project linked; Cloudflare account
   active for R2.
9. **Existing repo.** Is this a fresh project, or is there prior code (bot,
   etc.) that should live alongside it in the same repo?
10. ~~**Postgres host.**~~ ✅ **Neon** — pooled `DATABASE_URL` + non-pooled
    `DIRECT_URL` configured in Vercel and in the GitHub Actions sync
    workflow.

### Design

11. **Typography.** Phase 1 prototype uses Fraunces (display, italic
    accents) + Inter (UI). Happy to A/B with Newsreader, GT Sectra,
    EB Garamond, or Söhne — just say the word.
12. ~~**Reference shots.**~~ ✅ Curated from the public channel preview
    via the `bootstrap:mock` script.
13. **Logo.** Do you have a vector version of the channel's profile mark,
    or should we use the raster from the screenshots as-is for now?

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

| Command                  | Purpose                                                        |
| ------------------------ | -------------------------------------------------------------- |
| `pnpm run dev`           | Local dev server with hot reload                               |
| `pnpm run build`         | Production build (statically generates posts and locations)    |
| `pnpm run start`         | Run the production build                                       |
| `pnpm run bootstrap:mock`| Re-curate the mock dataset from `t.me/s/pov_et` (idempotent)   |
| `pnpm run db:generate`   | Regenerate the Prisma client                                   |
| `pnpm run db:push`       | Push the schema to the DB without a migration (early dev only) |
| `pnpm run db:migrate`    | Run / create a tracked migration (dev)                         |
| `pnpm run db:deploy`     | Apply migrations in CI / production                            |
| `pnpm run db:seed`       | Seed the DB from `lib/mock-data.json` (idempotent)             |
| `pnpm run db:studio`     | Open Prisma Studio                                             |
| `pnpm run telegram:login`| One-time interactive Telegram login (prints session string)    |
| `pnpm run telegram:sync` | Sync the channel into Postgres (idempotent; `--full` for backfill) |
| `pnpm run test`          | Run unit tests (media-group normalizer + storage backend)      |

The bootstrap script (`bootstrap:mock`) downloads photographs into
`public/mock/` with content-hashed filenames, mildly normalizes them
(preserving texture and grain), and emits a typed payload in
`lib/mock-data.json` matching `prisma/schema.prisma`.

The mock images are checked in. To refresh them against the latest channel
state, run `pnpm run bootstrap:mock` — re-runs only touch new files.

---

## Telegram sync (Phase 4)

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

Scheduled incremental runs stay well within GitHub’s default runner limits
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

3. **Manual runs:** Actions → “Telegram sync” → Run workflow. Leave
   `full` unchecked for normal operation. Enable `full` only for repairs
   (uses a 3-hour timeout; same command as
   `pnpm run telegram:sync -- --full --limit 1000`).

4. **Failures:** The workflow exits non-zero when any post errors (e.g.
   Telegram `Timeout` on `upload.GetFile`, transient Neon transaction
   errors). The next scheduled run retries; for stubborn posts, run
   workflow manually once.

5. **Website freshness:** The site uses ISR (`revalidate = 300`), so new
   posts appear on [povet.vercel.app](https://povet.vercel.app) within about
   five minutes after a successful sync — no redeploy needed.

Photographs land wherever the storage backend (`lib/storage.ts`) is
configured to put them. By default — no R2 credentials in `.env` — they
go to `public/media/` (gitignored). With the five `R2_*` variables set,
they go to Cloudflare R2 instead with no other code changes. See the
section below.

---

## Image storage (Phase 5)

The Telegram sync writes through `lib/storage.ts`, which selects a
backend at runtime based on environment variables:

| Condition                                 | Backend          | URLs                          |
| ----------------------------------------- | ---------------- | ----------------------------- |
| No R2 variables set                       | Local filesystem | `/media/<sha1>.jpg`           |
| All five `R2_*` variables set             | Cloudflare R2    | `<R2_PUBLIC_URL>/<sha1>.jpg`  |

Keys are `sha1(fingerprint, bytes)` so identical content always resolves
to the same key — re-running the sync is a no-op for unchanged photos.
R2 objects are uploaded with `Cache-Control: public, max-age=31536000,
immutable` because content-hashed keys never change meaning.

### Enabling R2

1. **Create a bucket.** In the Cloudflare dashboard → R2 → "Create
   bucket". A name like `pov-et-media` is fine. Default settings.
2. **Make it publicly readable.** Open the bucket → Settings → "Public
   access".
   - **Quick path (dev only):** enable the `r2.dev` subdomain. Cloudflare
     will give you a URL like `https://pub-<hash>.r2.dev`. Rate-limited;
     never the right answer in production.
   - **Production path:** bind a custom domain (e.g. `media.pov.et`) to
     the bucket. Cloudflare proxies it behind their CDN automatically.
3. **Mint an API token.** R2 → "Manage R2 API Tokens" → create a token
   scoped to read+write on this bucket. Save the **Access Key ID** and
   **Secret Access Key** — they're shown only once.
4. **Find your account ID.** Visible in the top-right of any R2 page or
   inside any bucket URL (the long hex string).
5. **Fill `.env`:**

   ```env
   R2_ACCOUNT_ID=abc123def456…
   R2_ACCESS_KEY_ID=…
   R2_SECRET_ACCESS_KEY=…
   R2_BUCKET=pov-et-media
   R2_PUBLIC_URL=https://media.pov.et         # or https://pub-…r2.dev for dev
   ```

6. **Migrate existing posts.** The sync is idempotent and rewrites Media
   rows on every run, so a single re-run swings every photograph over to
   R2:

   ```bash
   pnpm run telegram:sync -- --full --limit 1000
   ```

   The first line of the sync log will confirm the backend:

   ```
   [sync] storage: Cloudflare R2 (bucket: pov-et-media, public: https://media.pov.et)
   ```

7. **(Optional) Clean up local files.** Once R2-backed URLs are live,
   you can safely delete `public/media/`. Future syncs won't touch that
   directory while R2 is configured.

`next.config.mjs` auto-allows `*.r2.dev` and whatever hostname appears in
`R2_PUBLIC_URL` for `next/image`. No further configuration needed.

---

## License

TBD. The archive content is contributor-owned; the website code's license is
a decision for later.
