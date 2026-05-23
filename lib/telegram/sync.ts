/**
 * Telegram → Postgres sync.
 *
 *   1. Connect to Telegram as a delegated user.
 *   2. Find the highest telegramMessageId we already have in Postgres.
 *   3. Fetch new messages from the channel (up to a configurable cap).
 *   4. Normalize media groups into logical posts (lib/telegram/groups.ts).
 *   5. Download + process each photo (lib/telegram/media.ts) and persist
 *      via the storage abstraction (lib/storage.ts).
 *   6. Upsert Post + Location + Media rows in a single per-post
 *      transaction.
 *   7. Disconnect.
 *
 * The function is idempotent: running it twice in a row yields the same
 * database state. Re-running over partially-synced posts replaces media
 * for that post (we accept slight overwrites in exchange for simpler
 * semantics).
 */

import { createScriptPrisma } from "../db";
import type { PrismaClient } from "@prisma/client";
import type { TelegramClient } from "telegram";
import { slugify } from "../posts";
import { getStorageBackend } from "../storage";
import { parseCaption } from "./parser";
import { groupMessages, type RawTelegramMessage } from "./groups";
import {
  findSiblingPosts,
  mergeMediaPayloads,
  persistMergedPost,
  pickBestMetadata,
  resolveCanonicalMessageId
} from "./media-groups";
import { processAndStore } from "./media";
import {
  Api,
  createTelegramClient,
  readTelegramConfig
} from "./client";

type Logger = (message: string) => void;

export type SyncOptions = {
  /** Maximum number of messages to fetch per run. Default 200. */
  limit?: number;
  /**
   * If true, fetch from the start of the channel even when posts already
   * exist in the database. Useful for backfills.
   */
  full?: boolean;
  log?: Logger;
};

export type SyncReport = {
  fetchedMessages: number;
  logicalPosts: number;
  upsertedPosts: number;
  uploadedMedia: number;
  skipped: number;
  errors: Array<{ anchorId: number; error: string }>;
};

export async function runSync(
  options: SyncOptions = {}
): Promise<SyncReport> {
  if (!process.env.DATABASE_URL && !process.env.DIRECT_URL) {
    throw new Error(
      "DATABASE_URL is not set. The Telegram sync writes directly to the database; configure DATABASE_URL first."
    );
  }

  const prisma = createScriptPrisma();

  const cfg = readTelegramConfig();
  if (!cfg.session) {
    throw new Error(
      "TELEGRAM_SESSION is empty. Run `pnpm run telegram:login` once to generate it."
    );
  }

  const log = options.log ?? ((m: string) => console.log(m));
  const limit = options.limit ?? 200;

  const storage = getStorageBackend();
  log(`[sync] storage: ${storage.describe()}`);
  if (process.env.DIRECT_URL) {
    log("[sync] database: direct connection (required for Neon + transactions)");
  }
  log(`[sync] connecting to Telegram (channel: @${cfg.channel})…`);
  const client = await createTelegramClient(cfg);
  await client.connect();

  const report: SyncReport = {
    fetchedMessages: 0,
    logicalPosts: 0,
    upsertedPosts: 0,
    uploadedMedia: 0,
    skipped: 0,
    errors: []
  };

  try {
    const channel = await client.getEntity(cfg.channel);

    const minId = options.full
      ? 0
      : await highestStoredMessageId(prisma);
    if (!options.full && minId > 0) {
      log(`[sync] fetching messages with id > ${minId} (limit ${limit})…`);
    } else {
      log(`[sync] fetching latest ${limit} messages…`);
    }

    const raw = await client.getMessages(channel, {
      limit,
      ...(minId > 0 ? { minId } : {})
    });
    report.fetchedMessages = raw.length;

    const messages: RawTelegramMessage[] = raw
      .filter((m): m is Api.Message => m instanceof Api.Message)
      .map(toRaw);
    const groups = groupMessages(messages);
    report.logicalPosts = groups.length;

    log(
      `[sync] ${raw.length} message${raw.length === 1 ? "" : "s"} → ${
        groups.length
      } logical post${groups.length === 1 ? "" : "s"}.`
    );

    for (const group of groups) {
      try {
        // We need the original GramJS Message objects to download bytes.
        // Build a fast lookup by id.
        const byId = new Map(raw.map((m) => [m.id, m]));

        const parsed = parseCaption(group.caption);
        const locationId = parsed.location
          ? await upsertLocation(prisma, parsed.location)
          : null;

        const mediaPayload: Array<{
          sourceMessageId: number;
          url: string;
          width: number;
          height: number;
          aspectRatio: number;
          blurHash: string;
          blurDataURL: string;
          dominantColor: string;
        }> = [];

        for (let i = 0; i < group.photoMessages.length; i++) {
          const photoMsg = group.photoMessages[i];
          const original = byId.get(photoMsg.id);
          if (!original) continue;

          const bytes = await downloadMediaWithRetry(client, original);
          if (!bytes) continue;

          const processed = await processAndStore(
            bytes,
            `tg:${cfg.channel}:${photoMsg.id}`
          );
          mediaPayload.push({ sourceMessageId: photoMsg.id, ...processed });
        }

        const siblings = group.groupedId
          ? await findSiblingPosts(prisma, group.groupedId)
          : [];

        const canonicalMessageId = resolveCanonicalMessageId(
          group.anchorId,
          group.groupedId,
          siblings.map((p) => Number(p.telegramMessageId))
        );

        const mergedMedia = mergeMediaPayloads(siblings, mediaPayload);

        if (mergedMedia.length === 0) {
          report.skipped += 1;
          continue;
        }

        const cover = mergedMedia[0];
        const metadata = pickBestMetadata(siblings, {
          caption: parsed.body,
          contributorUsername: parsed.contributorUsername,
          locationId,
          reactions: group.reactions as object,
          views: group.views,
          publishedAt: new Date(group.publishedAt),
          dominantColor: cover.dominantColor,
          aspectRatio: cover.aspectRatio
        });

        await prisma.$transaction(
          async (tx) => {
            await persistMergedPost(tx, {
              canonicalMessageId,
              mediaGroupId: group.groupedId,
              metadata,
              media: mergedMedia,
              siblingPosts: siblings
            });
          },
          { maxWait: 15_000, timeout: 60_000 }
        );

        report.upsertedPosts += 1;
        report.uploadedMedia += mediaPayload.length;
        log(
          `[sync]   ✓ ${canonicalMessageId} (${mergedMedia.length} photo${
            mergedMedia.length === 1 ? "" : "s"
          })${parsed.location ? ` · ${parsed.location}` : ""}${
            metadata.contributorUsername
              ? ` · @${metadata.contributorUsername}`
              : ""
          }${
            siblings.length > 1
              ? ` · merged ${siblings.length} split posts`
              : ""
          }`
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        report.errors.push({ anchorId: group.anchorId, error: msg });
        log(`[sync]   ✗ ${group.anchorId}: ${msg}`);
      }
    }
  } finally {
    await client.disconnect();
    await prisma.$disconnect();
  }

  log(
    `[sync] done — ${report.upsertedPosts} posts, ${report.uploadedMedia} media${
      report.skipped > 0 ? `, ${report.skipped} skipped` : ""
    }${report.errors.length > 0 ? `, ${report.errors.length} errors` : ""}.`
  );

  return report;
}

async function downloadMediaWithRetry(
  client: TelegramClient,
  message: Api.Message,
  attempts = 3
): Promise<Buffer | undefined> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      const buffer = await client.downloadMedia(message);
      if (!buffer) return undefined;
      return buffer instanceof Buffer ? buffer : Buffer.from(buffer);
    } catch (err) {
      lastErr = err;
      if (i < attempts - 1) {
        await sleep(2000 * (i + 1));
      }
    }
  }
  throw lastErr;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function highestStoredMessageId(
  prismaClient: PrismaClient
): Promise<number> {
  const latest = await prismaClient.post.findFirst({
    orderBy: { telegramMessageId: "desc" },
    select: { telegramMessageId: true }
  });
  if (!latest) return 0;
  return Number(latest.telegramMessageId);
}

async function upsertLocation(
  prismaClient: PrismaClient,
  name: string
): Promise<string> {
  const loc = await prismaClient.location.upsert({
    where: { slug: slugify(name) },
    update: { name },
    create: { name, slug: slugify(name) }
  });
  return loc.id;
}

/** Map a GramJS Api.Message to the minimal shape our grouper requires. */
function toRaw(m: Api.Message): RawTelegramMessage {
  const hasPhoto = m.media instanceof Api.MessageMediaPhoto;

  let reactions:
    | Array<{ emoji: string; count: number }>
    | null = null;
  if (m.reactions?.results) {
    reactions = m.reactions.results
      .map((r) => {
        const reaction = r.reaction as
          | Api.ReactionEmoji
          | Api.ReactionCustomEmoji
          | Api.ReactionEmpty
          | undefined;
        const emoji =
          reaction instanceof Api.ReactionEmoji
            ? reaction.emoticon
            : null;
        if (!emoji) return null;
        return { emoji, count: r.count };
      })
      .filter((x): x is { emoji: string; count: number } => x !== null);
  }

  return {
    id: m.id,
    groupedId: m.groupedId ? m.groupedId.toString() : null,
    date: m.date,
    message: m.message ?? null,
    hasPhoto,
    views: m.views ?? null,
    reactions
  };
}
