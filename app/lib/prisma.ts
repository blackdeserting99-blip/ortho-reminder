import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

const globalForPrisma = globalThis as {
  prisma?: PrismaClient;
};

function createPrismaClient() {
  console.log("DATABASE_URL present:", !!process.env.DATABASE_URL);
  const raw = process.env.DATABASE_URL;

if (!raw) {
  console.warn("DATABASE_URL missing");
  return {} as never;
}

  return new PrismaClient({
    adapter: new PrismaNeon({
      connectionString: raw.trim(),
    }),
  });
}

export const prisma =
  globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}