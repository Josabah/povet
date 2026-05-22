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

export const prisma: PrismaClient | null = process.env.DATABASE_URL
  ? globalForPrisma.prisma ??
    new PrismaClient({
      log:
        process.env.NODE_ENV === "production"
          ? ["error"]
          : ["warn", "error"]
    })
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
    datasources: { db: { url } },
    log: ["warn", "error"]
  });
}
