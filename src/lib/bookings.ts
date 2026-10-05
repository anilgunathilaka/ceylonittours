import { prisma } from "@/lib/db";
import { toISODate } from "@/lib/date";
import type { Prisma } from "@/generated/prisma/client";
import { BookingStatus as DbStatus } from "@/generated/prisma/enums";

/**
 * Booking requests made by signed-in users. New requests are "pending";
 * admins confirm, cancel or reopen them from /admin/bookings.
 */
export type BookingStatus = "pending" | "confirmed" | "cancelled";

export type BookingHistoryEntry = {
  status: BookingStatus;
  message?: string;
  travelDate?: string;
  /** Admin email, or "customer" for the original request */
  by: string;
  at: string;
};

export type Booking = {
  id: string;
  userId: string;
  packageSlug: string;
  packageTitle: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  message: string;
  /** YYYY-MM-DD the customer asked for */
  requestedTravelDate?: string;
  /** YYYY-MM-DD final date (set/changed by an admin) */
  travelDate?: string;
  status: BookingStatus;
  /** Latest message from the team to the customer, shown on their profile */
  adminMessage?: string;
  confirmedAt?: string;
  confirmedBy?: string;
  cancelledAt?: string;
  cancelledBy?: string;
  /** Optimistic-concurrency version; admin updates must send the version they saw */
  version: number;
  history?: BookingHistoryEntry[];
  createdAt: string;
  updatedAt: string;
};

export class BookingConflictError extends Error {
  constructor() {
    super("BOOKING_CONFLICT");
  }
}

export class BookingValidationError extends Error {}

const toDbStatus = { pending: DbStatus.PENDING, confirmed: DbStatus.CONFIRMED, cancelled: DbStatus.CANCELLED } as const;
const fromDbStatus = (status: DbStatus) => status.toLowerCase() as BookingStatus;

/** "YYYY-MM-DD" <-> Postgres DATE (stored as UTC midnight) */
const toDbDate = (value?: string) => (value ? new Date(`${value}T00:00:00.000Z`) : undefined);
const fromDbDate = (value: Date | null) => (value ? value.toISOString().slice(0, 10) : undefined);

const historyInclude = { history: { orderBy: { createdAt: "asc" } } } satisfies Prisma.BookingInclude;
type BookingRow = Prisma.BookingGetPayload<{ include: typeof historyInclude }>;

function toBooking(row: BookingRow | Prisma.BookingGetPayload<object>): Booking {
  return {
    id: row.id,
    userId: row.userId,
    packageSlug: row.packageSlug,
    packageTitle: row.packageTitle,
    customerName: row.customerName,
    customerEmail: row.customerEmail,
    customerPhone: row.customerPhone ?? undefined,
    message: row.message,
    requestedTravelDate: fromDbDate(row.requestedTravelDate),
    travelDate: fromDbDate(row.travelDate),
    status: fromDbStatus(row.status),
    adminMessage: row.adminMessage ?? undefined,
    confirmedAt: row.confirmedAt?.toISOString(),
    confirmedBy: row.confirmedBy ?? undefined,
    cancelledAt: row.cancelledAt?.toISOString(),
    cancelledBy: row.cancelledBy ?? undefined,
    version: row.version,
    history:
      "history" in row
        ? row.history.map((entry) => ({
            status: fromDbStatus(entry.status),
            message: entry.message ?? undefined,
            travelDate: fromDbDate(entry.travelDate),
            by: entry.actorEmail,
            at: entry.createdAt.toISOString(),
          }))
        : undefined,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function createBooking(input: {
  userId: string;
  packageSlug: string;
  packageTitle: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  message: string;
  travelDate?: string;
}) {
  const travelDate = toDbDate(input.travelDate);
  const row = await prisma.booking.create({
    data: {
      userId: input.userId,
      packageSlug: input.packageSlug,
      packageTitle: input.packageTitle,
      customerName: input.customerName,
      customerEmail: input.customerEmail.trim().toLowerCase(),
      customerPhone: input.customerPhone,
      message: input.message,
      requestedTravelDate: travelDate,
      travelDate,
      history: {
        create: { status: DbStatus.PENDING, actorEmail: "customer", actorUserId: input.userId, travelDate },
      },
    },
    include: historyInclude,
  });
  return toBooking(row);
}

/** All bookings for the admin dashboard, newest first. */
export async function getAllBookings() {
  const rows = await prisma.booking.findMany({ orderBy: { createdAt: "desc" }, include: historyInclude });
  return rows.map(toBooking);
}

/** Bookings owned by one user — always scoped by userId to prevent IDOR. */
export async function getBookingsForUser(userId: string) {
  const rows = await prisma.booking.findMany({ where: { userId }, orderBy: { createdAt: "desc" } });
  return rows.map(toBooking);
}

/**
 * Admin status change. Runs in a transaction: the booking update and its history
 * entry are written together, and the update only applies if the booking still
 * has `expectedVersion` (otherwise another admin changed it first).
 */
export async function updateBookingStatus(
  id: string,
  update: {
    status: BookingStatus;
    message?: string;
    travelDate?: string;
    expectedVersion: number;
    actorEmail: string;
    actorUserId?: string;
  },
) {
  return prisma.$transaction(async (tx) => {
    const current = await tx.booking.findUnique({ where: { id }, select: { travelDate: true } });
    if (!current) return null;

    const travelDate = toDbDate(update.travelDate) ?? current.travelDate ?? undefined;
    if (update.status === "confirmed" && !travelDate) {
      throw new BookingValidationError("Set a travel date before confirming.");
    }

    const now = new Date();
    const data: Prisma.BookingUpdateManyMutationInput = {
      status: toDbStatus[update.status],
      travelDate: travelDate ?? null,
      version: { increment: 1 },
      ...(update.message ? { adminMessage: update.message } : {}),
      ...(update.status === "confirmed" ? { confirmedAt: now, confirmedBy: update.actorEmail } : {}),
      ...(update.status === "cancelled" ? { cancelledAt: now, cancelledBy: update.actorEmail } : {}),
    };

    const { count } = await tx.booking.updateMany({ where: { id, version: update.expectedVersion }, data });
    if (count === 0) throw new BookingConflictError();

    await tx.bookingStatusHistory.create({
      data: {
        bookingId: id,
        status: toDbStatus[update.status],
        actorEmail: update.actorEmail,
        actorUserId: update.actorUserId,
        message: update.message,
        travelDate: travelDate ?? null,
      },
    });

    const row = await tx.booking.findUniqueOrThrow({ where: { id }, include: historyInclude });
    return toBooking(row);
  });
}

/** Split a user's bookings into the groups shown on the profile page. */
export function groupBookings(bookings: Booking[], today = toISODate(new Date())) {
  const isPast = (b: Booking) => Boolean(b.travelDate && b.travelDate < today);
  const byDateAsc = (a: Booking, b: Booking) => (a.travelDate ?? "9999").localeCompare(b.travelDate ?? "9999");

  return {
    upcoming: bookings.filter((b) => b.status === "confirmed" && !isPast(b)).sort(byDateAsc),
    pending: bookings.filter((b) => b.status === "pending" && !isPast(b)).sort(byDateAsc),
    // Completed trips, plus pending requests whose date passed without confirmation; most recent first
    past: bookings.filter((b) => b.status !== "cancelled" && isPast(b)).sort((a, b) => byDateAsc(b, a)),
    cancelled: bookings.filter((b) => b.status === "cancelled").sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
  };
}
