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
