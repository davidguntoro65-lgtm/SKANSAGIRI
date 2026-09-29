// Prisma client singleton — SMKN 1 Wonogiri Portal
// Prisma 7 requires a driver adapter for the direct DB connection.
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });

// Singleton pattern: reuse across hot-reload in development
const globalForPrisma = globalThis as unknown as { db: PrismaClient };
export const db = globalForPrisma.db ?? new PrismaClient({ adapter } as any);
if (process.env.NODE_ENV !== "production") globalForPrisma.db = db;
