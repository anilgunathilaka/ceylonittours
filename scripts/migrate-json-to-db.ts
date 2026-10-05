/**
 * One-off migration: data/users.json + data/bookings.json  ->  PostgreSQL.
 *
 *   npm run db:migrate-json -- --dry-run   # report only, writes nothing
 *   npm run db:migrate-json                # back up JSON, then import
 *
 * - Idempotent: users/bookings whose id already exists are skipped, so it can be re-run safely.
 * - Users whose email already exists under a different id are merged into that user
 *   (their bookings are re-pointed), never duplicated.
 * - The JSON files are copied to data/backup/<timestamp>/ and never deleted.
 * - Password hashes are copied as-is (already bcrypt) and never printed.
 */
import { promises as fs } from "fs";
import path from "path";
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

type LegacyUser = {
  id: string;
  name?: string;
  email: string;
  passwordHash?: string;
  image?: string;
  createdAt?: string;
};

type LegacyHistory = { status: string; message?: string; by?: string; at?: string };

type LegacyBooking = {
  id: string;
  userId: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  packageSlug: string;
  packageTitle?: string;
  travelDate?: string;
  status: string;
  message?: string;
  adminMessage?: string;
  history?: LegacyHistory[];
  createdAt?: string;
  updatedAt?: string;
};

const DATA_DIR = path.join(process.cwd(), "data");
const dryRun = process.argv.includes("--dry-run");

const maskEmail = (email: string) => email.replace(/^(.).*?(@.*)$/, "$1***$2");
const STATUS = { pending: "PENDING", confirmed: "CONFIRMED", cancelled: "CANCELLED" } as const;
const isIsoDate = (value?: string) => Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
const toDate = (value?: string) => (isIsoDate(value) ? new Date(`${value}T00:00:00.000Z`) : null);
const toTimestamp = (value?: string) => {
  const date = value ? new Date(value) : new Date();
  return Number.isNaN(date.getTime()) ? new Date() : date;
};

async function readJson<T>(file: string): Promise<T[]> {
  try {
    const parsed = JSON.parse(await fs.readFile(path.join(DATA_DIR, file), "utf8"));
    if (!Array.isArray(parsed)) throw new Error(`${file} is not a JSON array`);
    return parsed as T[];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}

async function backup() {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const dir = path.join(DATA_DIR, "backup", stamp);
  await fs.mkdir(dir, { recursive: true });
  for (const file of ["users.json", "bookings.json"]) {
    try {
      await fs.copyFile(path.join(DATA_DIR, file), path.join(dir, file));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }
  return dir;
}

async function main() {
  // Import after env is loaded — the client reads DATABASE_URL at construction
  const { prisma } = await import("../src/lib/db");

  const users = await readJson<LegacyUser>("users.json");
  const bookings = await readJson<LegacyBooking>("bookings.json");
  console.log(`Found ${users.length} user(s) and ${bookings.length} booking(s) in JSON.${dryRun ? " (dry run)" : ""}`);

  if (!dryRun) {
    console.log(`Backed up JSON files to ${path.relative(process.cwd(), await backup())}`);
  }

  const report = { usersCreated: 0, usersSkipped: 0, usersMerged: 0, bookingsCreated: 0, bookingsSkipped: 0, problems: [] as string[] };
  /** legacy user id -> database user id */
  const userIdMap = new Map<string, string>();

  for (const legacy of users) {
    const email = legacy.email?.trim().toLowerCase();
    if (!legacy.id || !email) {
      report.problems.push(`User without id/email skipped`);
      continue;
    }

    const byId = await prisma.user.findUnique({ where: { id: legacy.id }, select: { id: true } });
    if (byId) {
      userIdMap.set(legacy.id, byId.id);
      report.usersSkipped++;
      continue;
    }

    const byEmail = await prisma.user.findUnique({ where: { email }, select: { id: true, passwordHash: true } });
    if (byEmail) {
      // Same person already in the database: merge instead of creating a duplicate
      userIdMap.set(legacy.id, byEmail.id);
      report.usersMerged++;
      if (!dryRun && !byEmail.passwordHash && legacy.passwordHash) {
        await prisma.user.update({ where: { id: byEmail.id }, data: { passwordHash: legacy.passwordHash } });
      }
      continue;
    }

    userIdMap.set(legacy.id, legacy.id);
    report.usersCreated++;
    if (!dryRun) {
      await prisma.user.create({
        data: {
          id: legacy.id,
          name: legacy.name?.trim() || email.split("@")[0],
          email,
          passwordHash: legacy.passwordHash ?? null,
          image: legacy.image ?? null,
          createdAt: toTimestamp(legacy.createdAt),
        },
      });
    }
  }

  const legacyUsersById = new Map(users.map((user) => [user.id, user]));

  for (const legacy of bookings) {
    if (await prisma.booking.findUnique({ where: { id: legacy.id }, select: { id: true } })) {
      report.bookingsSkipped++;
      continue;
    }

    const userId = userIdMap.get(legacy.userId) ??
      (await prisma.user.findUnique({ where: { id: legacy.userId }, select: { id: true } }))?.id;
    const status = STATUS[legacy.status as keyof typeof STATUS];
    if (!userId) {
      report.problems.push(`Booking ${legacy.id.slice(0, 8)} skipped: owner not found`);
      continue;
    }
    if (!status) {
      report.problems.push(`Booking ${legacy.id.slice(0, 8)} skipped: unknown status "${legacy.status}"`);
      continue;
    }

    const owner = legacyUsersById.get(legacy.userId);
    const history = legacy.history?.length
      ? legacy.history
      : [{ status: "pending", by: "customer", at: legacy.createdAt }];

    report.bookingsCreated++;
    if (dryRun) continue;

    const confirmed = [...history].reverse().find((entry) => entry.status === "confirmed");
    const cancelled = [...history].reverse().find((entry) => entry.status === "cancelled");

    await prisma.booking.create({
      data: {
        id: legacy.id,
        userId,
        packageSlug: legacy.packageSlug,
        packageTitle: legacy.packageTitle || legacy.packageSlug,
        customerName: legacy.customerName || owner?.name || "Customer",
        customerEmail: (legacy.customerEmail || owner?.email || "").toLowerCase(),
        customerPhone: legacy.customerPhone || null,
        message: legacy.message || "",
        requestedTravelDate: toDate(legacy.travelDate),
        travelDate: toDate(legacy.travelDate),
        status,
        adminMessage: legacy.adminMessage || null,
        confirmedAt: status === "CONFIRMED" && confirmed ? toTimestamp(confirmed.at) : null,
        confirmedBy: status === "CONFIRMED" ? confirmed?.by ?? null : null,
        cancelledAt: status === "CANCELLED" && cancelled ? toTimestamp(cancelled.at) : null,
        cancelledBy: status === "CANCELLED" ? cancelled?.by ?? null : null,
        createdAt: toTimestamp(legacy.createdAt),
        history: {
          create: history
            .filter((entry) => entry.status in STATUS)
            .map((entry) => ({
              status: STATUS[entry.status as keyof typeof STATUS],
              actorEmail: entry.by || "unknown",
              message: entry.message || null,
              createdAt: toTimestamp(entry.at),
            })),
        },
      },
    });
  }

  // Verification
  const legacyBookingIds = bookings.map((booking) => booking.id);
  const dbUsers = await prisma.user.count({ where: { id: { in: [...new Set(userIdMap.values())] } } });
  const dbBookings = await prisma.booking.findMany({
    where: { id: { in: legacyBookingIds } },
    select: { id: true, userId: true, status: true },
  });
  const orphaned = dbBookings.filter((booking) => ![...userIdMap.values()].includes(booking.userId));

  console.log("\nResult");
  console.log(`  users:    ${report.usersCreated} created, ${report.usersMerged} merged by email, ${report.usersSkipped} already present`);
  console.log(`  bookings: ${report.bookingsCreated} created, ${report.bookingsSkipped} already present`);
  if (!dryRun) {
    console.log("\nVerification");
    console.log(`  users in DB from JSON:    ${dbUsers} / ${new Set(userIdMap.values()).size}`);
    console.log(`  bookings in DB from JSON: ${dbBookings.length} / ${bookings.length}`);
    console.log(`  bookings linked to a migrated user: ${dbBookings.length - orphaned.length} / ${dbBookings.length}`);
  }
  for (const problem of report.problems) console.warn(`  ! ${problem}`);
  if (report.usersMerged) {
    const merged = users.filter((user) => userIdMap.get(user.id) !== user.id).map((user) => maskEmail(user.email));
    console.log(`  merged emails: ${merged.join(", ")}`);
  }

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error("Migration failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
