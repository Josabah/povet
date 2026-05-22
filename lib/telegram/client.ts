/**
 * GramJS client factory.
 *
 * The sync worker authenticates as a delegated Telegram user (not as
 * the bot — the bot API can't reliably fetch channel history). Use
 * `scripts/telegram-login.ts` once to produce a session string, then
 * store it in `TELEGRAM_SESSION` for non-interactive sync runs.
 *
 * Credentials never leave the server-side environment. The Next.js
 * config marks `telegram` as a server-external package so it cannot be
 * accidentally bundled.
 */

import { TelegramClient, Api } from "telegram";
import { StringSession } from "telegram/sessions/index.js";

export type TelegramConfig = {
  apiId: number;
  apiHash: string;
  session: string;
  channel: string;
};

export function readTelegramConfig(): TelegramConfig {
  const apiIdRaw = process.env.TELEGRAM_API_ID;
  const apiHash = process.env.TELEGRAM_API_HASH;
  const session = process.env.TELEGRAM_SESSION;
  const channel = process.env.TELEGRAM_CHANNEL ?? "pov_et";

  const missing: string[] = [];
  if (!apiIdRaw) missing.push("TELEGRAM_API_ID");
  if (!apiHash) missing.push("TELEGRAM_API_HASH");
  if (missing.length > 0) {
    throw new Error(
      `Missing required env var(s): ${missing.join(
        ", "
      )}. Get credentials at https://my.telegram.org.`
    );
  }

  const apiId = Number(apiIdRaw);
  if (!Number.isFinite(apiId)) {
    throw new Error("TELEGRAM_API_ID must be a number.");
  }

  return {
    apiId,
    apiHash: apiHash!,
    session: session ?? "",
    channel
  };
}

export async function createTelegramClient(
  cfg: TelegramConfig
): Promise<TelegramClient> {
  const client = new TelegramClient(
    new StringSession(cfg.session),
    cfg.apiId,
    cfg.apiHash,
    {
      connectionRetries: 5,
      useWSS: true,
      baseLogger: silentLogger() as never
    }
  );
  return client;
}

/** Strip GramJS's chatty default logger so sync runs stay readable. */
function silentLogger() {
  return {
    canSend: () => false,
    log: () => {},
    debug: () => {},
    info: () => {},
    warn: () => {},
    error: () => {}
  };
}

/** Re-export GramJS bits the rest of the codebase needs without coupling. */
export { Api };
