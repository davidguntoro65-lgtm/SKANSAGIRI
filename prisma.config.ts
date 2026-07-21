// Prisma config — SMKN 1 Wonogiri Portal
// DATABASE_URL is injected by Replit runtime (development) or cPanel env vars (production).
// Do NOT add dotenv/config here — DATABASE_URL is already in the process environment.
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});
