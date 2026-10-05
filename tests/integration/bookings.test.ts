import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import {
  BookingConflictError,
  BookingValidationError,
  createBooking,
  getBookingsForUser,
  groupBookings,
  updateBookingStatus,
} from "@/lib/bookings";
import { makeUser, resetDatabase } from "../helpers";

beforeEach(resetDatabase);

const newBooking = (userId: string, travelDate?: string) =>
  createBooking({
    userId,
    packageSlug: "ella-drop-tour-via-nuwara-eliya",
    packageTitle: "Ella Drop Tour",
    customerName: "Kasun",
    customerEmail: "Kasun@Example.test",
    message: "Two adults <b>please</b>",
    travelDate,
  });

const admin = { actorEmail: "admin@example.test" };

describe("booking lifecycle", () => {
  it("creates a pending booking with an initial history entry", async () => {
    const user = await makeUser("c@example.test");
    const booking = await newBooking(user.id, "2026-12-20");

    expect(booking).toMatchObject({
      status: "pending",
      requestedTravelDate: "2026-12-20",
      travelDate: "2026-12-20",
      customerEmail: "kasun@example.test",
      message: "Two adults <b>please</b>", // stored raw; escaped when rendered/emailed
      version: 0,
    });
    expect(booking.history).toEqual([expect.objectContaining({ status: "pending", by: "customer" })]);
  });

  it("requires a travel date to confirm and writes nothing when rejected", async () => {
    const user = await makeUser("c@example.test");
    const booking = await newBooking(user.id);
    await expect(
      updateBookingStatus(booking.id, { ...admin, status: "confirmed", expectedVersion: 0 }),
    ).rejects.toBeInstanceOf(BookingValidationError);

    const row = await prisma.booking.findUniqueOrThrow({ where: { id: booking.id }, include: { history: true } });
    expect(row.status).toBe("PENDING");
    expect(row.history).toHaveLength(1);
  });

  it("confirms atomically: status, final date, timestamps, admin, message and history", async () => {
    const user = await makeUser("c@example.test");
    const booking = await newBooking(user.id, "2026-12-20");

    const confirmed = await updateBookingStatus(booking.id, {
      ...admin,
      status: "confirmed",
      travelDate: "2026-12-22",
      message: "Pickup 7:00 AM",
      expectedVersion: 0,
    });

    expect(confirmed).toMatchObject({
      status: "confirmed",
      travelDate: "2026-12-22",
      requestedTravelDate: "2026-12-20",
      adminMessage: "Pickup 7:00 AM",
      confirmedBy: "admin@example.test",
      confirmedAt: expect.any(String),
      version: 1,
    });
    expect(confirmed?.history?.map((h) => h.status)).toEqual(["pending", "confirmed"]);
    expect(confirmed?.history?.[1]).toMatchObject({
      by: "admin@example.test",
      message: "Pickup 7:00 AM",
      travelDate: "2026-12-22",
    });
  });

  it("cancels and reopens while preserving full history", async () => {
    const user = await makeUser("c@example.test");
    const booking = await newBooking(user.id, "2026-12-20");

    const cancelled = await updateBookingStatus(booking.id, {
      ...admin,
      status: "cancelled",
      message: "Fully booked",
      expectedVersion: 0,
    });
    expect(cancelled).toMatchObject({
      status: "cancelled",
      cancelledBy: "admin@example.test",
      cancelledAt: expect.any(String),
      adminMessage: "Fully booked",
    });

    const reopened = await updateBookingStatus(booking.id, { ...admin, status: "pending", expectedVersion: 1 });
    expect(reopened?.status).toBe("pending");
    expect(reopened?.adminMessage).toBe("Fully booked");
    expect(reopened?.history?.map((h) => h.status)).toEqual(["pending", "cancelled", "pending"]);
  });

  it("rejects stale updates from a second admin (optimistic concurrency)", async () => {
    const user = await makeUser("c@example.test");
    const booking = await newBooking(user.id, "2026-12-20");

    await updateBookingStatus(booking.id, { ...admin, status: "confirmed", message: "First", expectedVersion: 0 });
    await expect(
      updateBookingStatus(booking.id, {
        actorEmail: "ops@example.test",
        status: "cancelled",
        message: "Second",
        expectedVersion: 0,
      }),
    ).rejects.toBeInstanceOf(BookingConflictError);

    const row = await prisma.booking.findUniqueOrThrow({ where: { id: booking.id }, include: { history: true } });
    expect(row.status).toBe("CONFIRMED");
    expect(row.adminMessage).toBe("First");
    expect(row.history).toHaveLength(2);
  });

  it("returns null for unknown bookings", async () => {
    expect(
      await updateBookingStatus("00000000-0000-4000-8000-000000000000", {
        ...admin,
        status: "cancelled",
        expectedVersion: 0,
      }),
    ).toBeNull();
  });
});

describe("ownership and relationships", () => {
  it("only returns a user's own bookings", async () => {
    const alice = await makeUser("alice@example.test");
    const bob = await makeUser("bob@example.test");
    await newBooking(alice.id, "2026-12-20");
    await newBooking(bob.id, "2026-12-21");

    const aliceBookings = await getBookingsForUser(alice.id);
    expect(aliceBookings).toHaveLength(1);
    expect(aliceBookings.every((b) => b.userId === alice.id)).toBe(true);
  });

  it("enforces the booking -> user foreign key", async () => {
    await expect(newBooking("00000000-0000-4000-8000-000000000000", "2026-12-20")).rejects.toBeTruthy();
  });

  it("will not delete a user who still has bookings", async () => {
    const user = await makeUser("c@example.test");
    await newBooking(user.id, "2026-12-20");
    await expect(prisma.user.delete({ where: { id: user.id } })).rejects.toBeTruthy();
  });
});

describe("profile grouping", () => {
  it("splits bookings into upcoming / pending / past / cancelled", async () => {
    const user = await makeUser("c@example.test");
    const up = await newBooking(user.id, "2026-12-20");
    await updateBookingStatus(up.id, { ...admin, status: "confirmed", expectedVersion: 0 });
    await newBooking(user.id, "2026-12-25");
    const past = await newBooking(user.id, "2025-01-10");
    await updateBookingStatus(past.id, { ...admin, status: "confirmed", expectedVersion: 0 });
    const cancelled = await newBooking(user.id, "2026-12-28");
    await updateBookingStatus(cancelled.id, { ...admin, status: "cancelled", expectedVersion: 0 });

    const groups = groupBookings(await getBookingsForUser(user.id), "2026-10-05");
    expect(groups.upcoming.map((b) => b.travelDate)).toEqual(["2026-12-20"]);
    expect(groups.pending.map((b) => b.travelDate)).toEqual(["2026-12-25"]);
    expect(groups.past.map((b) => b.travelDate)).toEqual(["2025-01-10"]);
    expect(groups.cancelled.map((b) => b.travelDate)).toEqual(["2026-12-28"]);
  });
});
