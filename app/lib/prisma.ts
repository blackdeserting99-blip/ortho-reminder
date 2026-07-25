import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

console.log("[DEBUG] prisma.ts loaded");

const globalForPrisma = globalThis as {
  prisma?: PrismaClient;
};

function createPrismaClient(): PrismaClient {
  console.log("[DEBUG] createPrismaClient()");

  const connectionString = process.env.DATABASE_URL?.trim();

  console.log("[DEBUG] DATABASE_URL exists:", !!connectionString);

if (!connectionString) {
  console.warn("DATABASE_URL missing during build/runtime");
  return new PrismaClient();
}

  console.log("[DEBUG] Creating PrismaNeon adapter...");

  const adapter = new PrismaNeon({
    connectionString,
  });

  console.log("[DEBUG] Creating PrismaClient...");

  return new PrismaClient({
    adapter,
  });
}

console.log("[DEBUG] Before global prisma");

export const prisma =
  globalForPrisma.prisma ?? createPrismaClient();

console.log("[DEBUG] After global prisma");

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}