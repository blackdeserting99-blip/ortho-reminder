import { PrismaClient } from "../generated/prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

const globalForPrisma = globalThis as {
  prisma?: PrismaClient;
};

function createPrismaClient() {
  const raw = process.env.DATABASE_URL;

  if (!raw) {
    throw new Error("DATABASE_URL is not configured.");
  }

  let connectionString = raw.trim();

  if (
    (connectionString.startsWith('"') && connectionString.endsWith('"')) ||
    (connectionString.startsWith("'") && connectionString.endsWith("'"))
  ) {
    connectionString = connectionString.slice(1, -1).trim();
  }

  return new PrismaClient({
    adapter: new PrismaNeon({
      connectionString,
    }),
  });
}

export const prisma =
  globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}