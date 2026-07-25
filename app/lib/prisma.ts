import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;

  // During Next build
  if (!connectionString) {
    console.warn("DATABASE_URL missing - creating dummy Prisma client");
    
    return new PrismaClient({
      adapter: new PrismaNeon({
        connectionString:
          "postgresql://placeholder:placeholder@localhost:5432/placeholder",
      }),
    });
  }

  return new PrismaClient({
    adapter: new PrismaNeon({
      connectionString,
    }),
  });
}

export const prisma =
  globalForPrisma.prisma ??
  createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}