/**
 * Entry point for the Telegram → Postgres sync.
 *
 *   pnpm run telegram:sync            # incremental, last 200 messages
 *   pnpm run telegram:sync -- --limit 500
 *   pnpm run telegram:sync -- --full  # backfill from the start
 *
 * Requires TELEGRAM_API_ID, TELEGRAM_API_HASH, TELEGRAM_SESSION,
 * DATABASE_URL, and optionally TELEGRAM_CHANNEL (defaults to `pov_et`).
 */

import "dotenv/config";

import { runSync } from "../lib/telegram/sync";

function parseArgs(argv: string[]) {
  const args = { full: false, limit: 200 };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--full") args.full = true;
    else if (a === "--limit") {
      const next = argv[++i];
      const n = Number(next);
      if (!Number.isFinite(n) || n <= 0) {
        console.error(`Invalid --limit value: ${next}`);
        process.exit(1);
      }
      args.limit = n;
    }
  }
  return args;
}

async function main() {
  const { full, limit } = parseArgs(process.argv.slice(2));
  const report = await runSync({ full, limit });
  if (report.errors.length > 0) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
