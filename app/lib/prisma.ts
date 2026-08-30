import { PrismaClient } from "@prisma/client/wasm";
import { PrismaNeon } from "@prisma/adapter-neon";

type GlobalForPrisma = typeof globalThis & {
  prisma?: PrismaClient;
};

const globalForPrisma = globalThis as GlobalForPrisma;

function getConnectionString() {
  const runtimeGlobal = globalThis as typeof globalThis & {
    __DATABASE_URL__?: string;
    __NEON_DATABASE_URL__?: string;
  };

  const connectionString =
    process.env.DATABASE_URL ||
    process.env.NEON_DATABASE_URL ||
    runtimeGlobal.__DATABASE_URL__ ||
    runtimeGlobal.__NEON_DATABASE_URL__;

  if (!connectionString || connectionString === "undefined") {
    return null;
  }

  return connectionString;
}

function createPrismaClient() {
  const connectionString = getConnectionString();

  if (!connectionString) {
    throw new Error("DATABASE_URL is not configured");
  }

  return new PrismaClient({
    adapter: new PrismaNeon({
      connectionString,
    }),
  });
}

export function getPrismaClient() {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPrismaClient();
  }

  return globalForPrisma.prisma;
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    const client = getPrismaClient();
    const value = Reflect.get(client, prop, receiver);

    return typeof value === "function" ? value.bind(client) : value;
  },
});