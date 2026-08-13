import "server-only";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "@/generated/prisma/client";
import { env } from "@/lib/env";

/**
 * Prisma Client singleton.
 *
 * Next.js hot-reloads server modules in development, which would otherwise
 * open a new connection pool on every edit until Postgres refuses new clients.
 * Caching the instance on `globalThis` keeps exactly one pool alive per process.
 *
 * Prisma 7 has no bundled query engine, so a driver adapter is required. We use
 * `@prisma/adapter-pg` against Supabase's transaction-mode pooler (PgBouncer):
 * serverless invocations are short-lived, so the local pool is deliberately
 * small and idle connections are reclaimed quickly.
 */

function createPrismaClient() {
  const adapter = new PrismaPg({
    connectionString: env.databaseUrl,
    max: 5,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000,
  });

  return new PrismaClient({
    adapter,
    log: env.isProduction ? ["error"] : ["error", "warn"],
  });
}

const globalForPrisma = globalThis as unknown as {
  prisma?: ReturnType<typeof createPrismaClient>;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (!env.isProduction) {
  globalForPrisma.prisma = prisma;
}
