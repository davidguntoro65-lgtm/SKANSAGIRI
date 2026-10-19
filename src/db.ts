// Prisma client singleton — SMKN 1 Wonogiri Portal
// Prisma 7 requires a driver adapter for the direct DB connection.
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client/index";
import { Pool } from "pg";

const requestedPoolMax = Number.parseInt(process.env.DATABASE_POOL_MAX || "10", 10);
export const dbPoolMax = Number.isInteger(requestedPoolMax) && requestedPoolMax > 0
  ? Math.min(requestedPoolMax, 50)
  : 10;

const globalForPrisma = globalThis as unknown as { db?: PrismaClient; dbPool?: Pool };
const reuseGlobal = process.env.NODE_ENV !== "production";
export const dbPool = (reuseGlobal && globalForPrisma.dbPool) || new Pool({
  connectionString: process.env.DATABASE_URL!,
  max: dbPoolMax,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
});
const adapter = new PrismaPg(dbPool, {
  disposeExternalPool: true,
  onPoolError: (error) => {
    console.error(JSON.stringify({
      event: "postgres_pool_error",
      name: error.name,
      code: (error as NodeJS.ErrnoException).code || null,
    }));
  },
});

// Singleton pattern: reuse across hot-reload in development
export const db = (reuseGlobal && globalForPrisma.db) || new PrismaClient({ adapter } as any);
if (reuseGlobal) {
  globalForPrisma.dbPool = dbPool;
  globalForPrisma.db = db;
}
