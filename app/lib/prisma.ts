import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    const error =
      "DATABASE_URL environment variable is not set. Please configure it in your Cloudflare environment variables.";
    console.error(error);
    throw new Error(error);
  }

  console.log("Initializing Prisma client with Neon adapter");

  return new PrismaClient({
    adapter: new PrismaNeon({
      connectionString,
    }),
  });
}

function getPrismaClient(): PrismaClient {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPrismaClient();
  }
  return globalForPrisma.prisma;
}

// Use a Proxy to lazily initialize Prisma on first access
// This ensures initialization happens inside the request context where env vars are available
export const prisma = new Proxy({} as PrismaClient, {
  get(target, prop: string | symbol) {
    const client = getPrismaClient();
    return (client as any)[prop];
  },
});