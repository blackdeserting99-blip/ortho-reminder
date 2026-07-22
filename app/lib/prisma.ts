import { PrismaClient } from "../generated/prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

function getDatabaseUrl(): string {
  const raw = process.env.DATABASE_URL;

  if (!raw) {
    throw new Error("DATABASE_URL is not configured.");
  }

  let value = raw.trim();

  // Cloud providers sometimes store quoted values in secret inputs.
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1).trim();
  }

  return value;
}
console.log(
  "DATABASE_URL during build:",
  process.env.DATABASE_URL ? "FOUND" : "MISSING"
);
const connectionString = getDatabaseUrl();

const adapter = new PrismaNeon({
  connectionString,
});

const globalForPrisma = globalThis as {
  prisma?: PrismaClient;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}