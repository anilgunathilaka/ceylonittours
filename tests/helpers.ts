import { prisma } from "@/lib/db";

/** Wipe all application tables (test database only). */
export async function resetDatabase() {
  // Set only by vitest.config.ts after verifying the URL is not the dev database
  if (process.env.TEST_DATABASE_GUARD !== "1") {
    throw new Error("Refusing to reset: not running under the guarded test configuration");
  }
  await prisma.bookingStatusHistory.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.account.deleteMany();
  await prisma.user.deleteMany();
}

export async function makeUser(email: string, name = "Test User") {
  return prisma.user.create({ data: { email: email.toLowerCase(), name, passwordHash: "x" } });
}

export const fakeSession = (user: { id: string; email: string; name?: string }) => ({
  user: { id: user.id, email: user.email, name: user.name ?? "User" },
  expires: new Date(Date.now() + 3600_000).toISOString(),
});
