"use server";

import { headers } from "next/headers";
import { refresh } from "next/cache";
import { z } from "zod";
import { getAdminSession } from "@/lib/auth/admin";
import { BookingConflictError, BookingValidationError, updateBookingStatus } from "@/lib/bookings";
import { sendBookingStatusEmail } from "@/lib/email";
import { publicErrorMessage } from "@/lib/errors";
import { isoDateSchema } from "@/lib/validation/schemas";

export type UpdateBookingState = {
  ok: boolean;
  message?: string;
};

const updateSchema = z.object({
  bookingId: z.string().uuid("Invalid booking"),
  status: z.enum(["confirmed", "cancelled", "pending"]),
  message: z.string().trim().max(2000, "Message is too long (max 2000 characters)").optional(),
  travelDate: isoDateSchema.optional(),
  version: z.coerce.number().int().min(0),
  notify: z.boolean(),
});

async function getSiteUrl() {
  if (process.env.AUTH_URL) return process.env.AUTH_URL.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export async function updateBookingAction(
  _prev: UpdateBookingState,
  formData: FormData,
): Promise<UpdateBookingState> {
  // Server Functions are reachable by direct POST, so always re-check authorization here
  const session = await getAdminSession();
  if (!session) {
    return { ok: false, message: "You are not authorised to manage bookings." };
  }

  const parsed = updateSchema.safeParse({
    bookingId: formData.get("bookingId"),
    status: formData.get("status"),
    message: formData.get("message") || undefined,
    travelDate: formData.get("travelDate") || undefined,
    version: formData.get("version"),
    notify: formData.get("notify") === "on",
  });
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const { bookingId, status, message, travelDate, version, notify } = parsed.data;
  const actorEmail = session.user.email ?? session.user.id;

  let booking;
  try {
    // Booking update + history entry are committed atomically before any email is attempted
    booking = await updateBookingStatus(bookingId, {
      status,
      message: message || undefined,
      travelDate,
      expectedVersion: version,
      actorEmail,
      actorUserId: session.user.id,
    });
  } catch (error) {
    if (error instanceof BookingConflictError) {
      return { ok: false, message: "This booking was changed by someone else. Reload the page and try again." };
    }
    if (error instanceof BookingValidationError) {
      return { ok: false, message: error.message };
    }
    console.error("[admin] Booking update failed", { bookingId, status }, error);
    return { ok: false, message: publicErrorMessage("Unable to update booking. Please try again.", error) };
  }

  if (!booking) {
    return { ok: false, message: "Booking not found." };
  }

  // Email is best-effort: a failure here never rolls back the committed booking change
  let emailed = false;
  const shouldEmail = notify && status !== "pending";
  if (shouldEmail) {
    emailed = await sendBookingStatusEmail(booking, await getSiteUrl());
  }

  refresh();

  const verb = status === "confirmed" ? "confirmed" : status === "cancelled" ? "cancelled" : "moved back to pending";
  const emailNote = shouldEmail
    ? emailed
      ? " Customer emailed."
      : " Email not sent (email is not configured or failed) — the message is still shown on the customer's profile."
    : "";
  return { ok: true, message: `Booking ${verb}.${emailNote}` };
}
