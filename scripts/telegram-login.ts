/**
 * One-time interactive Telegram login.
 *
 *   pnpm run telegram:login
 *
 * Prompts (via the `input` package — proper terminal masking, no rolled
 * readline) for phone number, the Telegram code, and (if enabled) a 2FA
 * password. Generates a session string for non-interactive sync runs.
 * Save the printed string in `.env` as `TELEGRAM_SESSION=…`.
 *
 * The session string is a long-lived credential. Treat it like a
 * password and keep it out of version control.
 */

import "dotenv/config";

// `input` is CJS — import the default export.
import input from "input";

import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions/index.js";

async function main() {
  const apiIdRaw = process.env.TELEGRAM_API_ID;
  const apiHash = process.env.TELEGRAM_API_HASH;
  if (!apiIdRaw || !apiHash) {
    console.error(
      "Missing TELEGRAM_API_ID or TELEGRAM_API_HASH in .env.\nGet them from https://my.telegram.org → API Development Tools."
    );
    process.exit(1);
  }
  const apiId = Number(apiIdRaw);
  if (!Number.isFinite(apiId)) {
    console.error("TELEGRAM_API_ID must be a number.");
    process.exit(1);
  }

  console.log("\npov.et · Telegram login");
  console.log("-----------------------");
  console.log(
    "Log in once as the Telegram user that should run the archive sync."
  );
  console.log(
    "This generates a session string. Save it in .env as TELEGRAM_SESSION."
  );
  console.log(
    "If you have 2FA enabled, you'll be prompted for your 2FA password —"
  );
  console.log(
    "that's the one you set inside Telegram (Settings → Privacy and Security"
  );
  console.log("→ Two-Step Verification), NOT the 5-digit login code.\n");

  const client = new TelegramClient(
    new StringSession(""),
    apiId,
    apiHash,
    {
      connectionRetries: 3,
      baseLogger: silentLogger() as never
    }
  );

  let attempt = 0;
  await client.start({
    phoneNumber: async () => {
      const value = (await input.text("Phone number (e.g. +251…): ")).trim();
      if (!value) {
        console.error("Phone number can't be blank.");
        process.exit(1);
      }
      return value;
    },
    phoneCode: async () => {
      const value = (await input.text("Code from Telegram: ")).trim();
      if (!value) {
        console.error("Code can't be blank.");
        process.exit(1);
      }
      return value;
    },
    password: async () => {
      attempt += 1;
      if (attempt > 1) {
        console.log(
          "\nThat 2FA password was rejected. Reminder: it's the password you set in"
        );
        console.log(
          "Telegram → Settings → Privacy and Security → Two-Step Verification."
        );
        console.log("(Not the 5-digit SMS/login code.)\n");
      }
      const value = await input.password("2FA password: ");
      return value;
    },
    onError: (err) => {
      // GramJS calls onError for transient/protocol issues too; the login
      // loop itself handles re-prompts. We surface only the message.
      console.error(`[telegram] ${err?.message ?? err}`);
    }
  });

  const session = client.session.save() as unknown as string;
  await client.disconnect();

  console.log("\n✓ Logged in.\n");
  console.log("Add this line to your .env (and only your .env):\n");
  console.log(`TELEGRAM_SESSION=${session}\n`);
  console.log(
    "Then run `pnpm run telegram:sync -- --full` to backfill the archive."
  );
  process.exit(0);
}

/** Drop GramJS's connect/reconnect chatter so the prompts stay readable. */
function silentLogger() {
  return {
    canSend: () => false,
    setLevel: () => {},
    log: () => {},
    debug: () => {},
    info: () => {},
    warn: () => {},
    error: () => {}
  };
}

main().catch((err) => {
  console.error("\nLogin failed:", err?.message ?? err);
  process.exit(1);
});
