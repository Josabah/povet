/**
 * Prisma client singleton.
 *
 * The database is the source of truth (see ARCHITECTURE.md). When
 * `DATABASE_URL` is set, this is the canonical data access layer. When it
 * is unset (early-prototype dev environments without a provisioned DB),
 * the data loaders fall back to lib/mock-data.json — see lib/posts.ts.
 */

import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

/** Neon scale-to-zero can take several seconds to wake; Prisma's default is too short. */
function withNeonConnectTimeout(url: string): string {
  if (/[?&]connect_timeout=/.test(url)) return url;
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}connect_timeout=30`;
}

/**
 * Local dev uses the direct (non-pooled) URL — one long-lived process, no
 * serverless burst. Production/Vercel keeps the pooled DATABASE_URL.
 */
function resolvePrismaUrl(): string {
  const url =
    process.env.NODE_ENV !== "production" && process.env.DIRECT_URL
      ? process.env.DIRECT_URL
      : process.env.DATABASE_URL!;
  return withNeonConnectTimeout(url);
}

async function withConnectionRetry<T>(
  fn: () => Promise<T>,
  attempts = 3
): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err: unknown) {
      lastError = err;
      const code = (err as { code?: string }).code;
      if (code !== "P1001" || i === attempts - 1) throw err;
      await new Promise((r) => setTimeout(r, 1500 * (i + 1)));
    }
  }
  throw lastError;
}

function createPrismaClient(): PrismaClient {
  const base = new PrismaClient({
    datasources: { db: { url: resolvePrismaUrl() } },
    log:
      process.env.NODE_ENV === "production"
        ? ["error"]
        : ["warn", "error"]
  });

  if (process.env.NODE_ENV === "production") return base;

  return base.$extends({
    query: {
      $allOperations({ args, query }) {
        return withConnectionRetry(() => query(args));
      }
    }
  }) as unknown as PrismaClient;
}

export const prisma: PrismaClient | null = process.env.DATABASE_URL
  ? globalForPrisma.prisma ?? createPrismaClient()
  : null;

if (
  process.env.NODE_ENV !== "production" &&
  prisma &&
  !globalForPrisma.prisma
) {
  globalForPrisma.prisma = prisma;
}

export const isDatabaseAvailable = (): boolean => prisma !== null;

/**
 * Prisma client for long-running scripts (Telegram sync, seed).
 *
 * Neon’s connection pooler does not support Prisma interactive
 * `$transaction` blocks. Use the direct (non-pooled) URL when available.
 */
export function createScriptPrisma(): PrismaClient {
  const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set.");
  }
  return new PrismaClient({
    datasources: { db: { url: withNeonConnectTimeout(url) } },
    log: ["warn", "error"]
  });
}
