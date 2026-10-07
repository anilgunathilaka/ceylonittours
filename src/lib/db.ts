import { PrismaPg } from "@prisma/adapter-pg";
// Relative import so standalone scripts (tsx) resolve it without tsconfig path aliases
import { PrismaClient } from "../generated/prisma/client";

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}

// One client per process (also survives hot reloads in development)
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function getPrismaClient() {
  globalForPrisma.prisma ??= createPrismaClient();
  return globalForPrisma.prisma;
}

/**
 * Created lazily on first use, so importing this module never needs DATABASE_URL.
 * (`next build` imports route modules to collect page data; it must not require a database.)
 */
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, property) {
    const client = getPrismaClient();
    const value = Reflect.get(client, property, client);
    return typeof value === "function" ? value.bind(client) : value;
  },
});

/** Postgres unique-constraint violation raised by Prisma */
export function isUniqueViolation(error: unknown) {
  return typeof error === "object" && error !== null && (error as { code?: string }).code === "P2002";
}
