// Prisma client singleton — SMKN 1 Wonogiri Portal
// Prisma 7 requires a driver adapter for the direct DB connection.
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client/index";

const poolMax = Number.parseInt(process.env.DATABASE_POOL_MAX || "10", 10);
const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
  max: Number.isInteger(poolMax) && poolMax > 0 ? Math.min(poolMax, 50) : 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
});

// Singleton pattern: reuse across hot-reload in development
const globalForPrisma = globalThis as unknown as { db: PrismaClient };
export const db = globalForPrisma.db ?? new PrismaClient({ adapter } as any);
if (process.env.NODE_ENV !== "production") globalForPrisma.db = db;
