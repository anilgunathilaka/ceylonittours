import { execFileSync } from "child_process";
import { mkdtempSync, mkdirSync, writeFileSync, readdirSync } from "fs";
import os from "os";
import path from "path";
import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { makeUser, resetDatabase } from "../helpers";

const SCRIPT = path.resolve(__dirname, "../../scripts/migrate-json-to-db.ts");
const TSX = path.resolve(__dirname, "../../node_modules/tsx/dist/cli.mjs");

const ALICE = "11111111-1111-4111-8111-111111111111";
const BOB_LEGACY = "22222222-2222-4222-8222-222222222222";

function fixture() {
  const dir = mkdtempSync(path.join(os.tmpdir(), "ceylon-migrate-"));
  mkdirSync(path.join(dir, "data"));
  writeFileSync(
    path.join(dir, "data", "users.json"),
    JSON.stringify([
      { id: ALICE, name: "Alice", email: "Alice@Example.test", passwordHash: "$2b$12$secret", createdAt: "2026-01-01T00:00:00Z" },
      { id: BOB_LEGACY, name: "Bob", email: "bob@example.test", createdAt: "2026-01-02T00:00:00Z" },
    ]),
  );
  writeFileSync(
    path.join(dir, "data", "bookings.json"),
    JSON.stringify([
      {
        id: "33333333-3333-4333-8333-333333333333",
        userId: ALICE,
        packageSlug: "ella-drop-tour-via-nuwara-eliya",
        packageTitle: "Ella Drop Tour",
        travelDate: "2026-12-20",
        status: "confirmed",
        message: "Two adults",
        adminMessage: "Pickup 7 AM",
        history: [
          { status: "pending", by: "customer", at: "2026-02-01T00:00:00Z" },
          { status: "confirmed", message: "Pickup 7 AM", by: "admin@example.test", at: "2026-02-02T00:00:00Z" },
        ],
        createdAt: "2026-02-01T00:00:00Z",
      },
      {
        id: "44444444-4444-4444-8444-444444444444",
        userId: BOB_LEGACY,
        packageSlug: "ella-drop-tour-via-nuwara-eliya",
        status: "pending",
        message: "No history in legacy record",
        createdAt: "2026-02-03T00:00:00Z",
      },
    ]),
  );
  return dir;
}

const run = (cwd: string) =>
  execFileSync(process.execPath, [TSX, SCRIPT], { cwd, env: { ...process.env }, encoding: "utf8" });

beforeEach(resetDatabase);

describe("JSON -> PostgreSQL migration", () => {
  it("imports users and bookings, merges duplicate emails, backs up, and is idempotent", async () => {
    // Bob already exists in the database under a different id
    const bob = await makeUser("bob@example.test", "Bob (db)");
    const dir = fixture();

    const output = run(dir);
    expect(output).not.toContain("$2b$12$secret"); // never prints password hashes
    expect(output).toContain("1 created, 1 merged by email");
    expect(readdirSync(path.join(dir, "data", "backup"))).toHaveLength(1);

    expect(await prisma.user.count()).toBe(2);
    const alice = await prisma.user.findUniqueOrThrow({ where: { id: ALICE } });
    expect(alice.email).toBe("alice@example.test");
    expect(alice.passwordHash).toBe("$2b$12$secret");

    const confirmed = await prisma.booking.findUniqueOrThrow({
      where: { id: "33333333-3333-4333-8333-333333333333" },
      include: { history: { orderBy: { createdAt: "asc" } } },
    });
    expect(confirmed).toMatchObject({
      userId: ALICE,
      status: "CONFIRMED",
      adminMessage: "Pickup 7 AM",
      confirmedBy: "admin@example.test",
      customerEmail: "alice@example.test",
    });
    expect(confirmed.history.map((h) => h.status)).toEqual(["PENDING", "CONFIRMED"]);

    // Bob's legacy booking is re-pointed to the existing database user
    const bobBooking = await prisma.booking.findUniqueOrThrow({
      where: { id: "44444444-4444-4444-8444-444444444444" },
      include: { history: true },
    });
    expect(bobBooking.userId).toBe(bob.id);
    expect(bobBooking.history).toHaveLength(1);

    // Re-running changes nothing
    const again = run(dir);
    expect(again).toContain("users:    0 created, 1 merged by email, 1 already present");
    expect(again).toContain("bookings: 0 created, 2 already present");
    expect(await prisma.user.count()).toBe(2);
    expect(await prisma.booking.count()).toBe(2);
    expect(await prisma.bookingStatusHistory.count()).toBe(3);
  });
});
