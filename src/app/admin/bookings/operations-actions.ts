"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getAdminSession } from "@/lib/auth/admin";
import { findBookingsOnDate, sendTeamMessage } from "@/lib/booking-messages";
import { prisma } from "@/lib/db";
import { getSiteUrl } from "@/lib/site-url";
import { isoDateSchema, packageSlugSchema } from "@/lib/validation/schemas";

/** Booking operations: messages to customers and pickup times (pickup planner). */

export type OperationState = { ok: boolean; message?: string };

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const body = z.string().trim().min(2, "Write a message").max(2000, "Message is too long (max 2000 characters)");

async function actor() {
  const session = await getAdminSession();
  return session ? (session.user.email ?? session.user.id) : null;
}

const emailed = (sent: number, emailedCount: number) =>
  emailedCount === sent ? " and emailed" : emailedCount === 0 ? " (shown on the customer's profile; email is not configured or failed)" : ` (${emailedCount} emailed)`;

export async function sendBookingMessageAction(_prev: OperationState, formData: FormData): Promise<OperationState> {
  const by = await actor();
  if (!by) return { ok: false, message: "You are not authorised to message customers." };
  const id = z.string().uuid().safeParse(formData.get("bookingId"));
  const text = body.safeParse(formData.get("body"));
  if (!id.success) return { ok: false, message: "Booking not found." };
  if (!text.success) return { ok: false, message: text.error.issues[0].message };

  const result = await sendTeamMessage([id.data], text.data, by, await getSiteUrl());
  if (result.sent === 0) return { ok: false, message: "Booking not found." };
  revalidatePath("/admin/bookings");
  return { ok: true, message: `Message sent${emailed(result.sent, result.emailed)}.` };
}

const bulkSchema = z.object({
  date: isoDateSchema,
  packageSlug: packageSlugSchema.optional(),
  startTime: z.string().regex(TIME).optional(),
  body,
});

export async function sendBulkMessageAction(_prev: OperationState, formData: FormData): Promise<OperationState> {
  const by = await actor();
  if (!by) return { ok: false, message: "You are not authorised to message customers." };
  const parsed = bulkSchema.safeParse({
    date: formData.get("date"),
    packageSlug: formData.get("packageSlug") || undefined,
    startTime: formData.get("startTime") || undefined,
    body: formData.get("body"),
  });
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };

  const { date, packageSlug, startTime, body: text } = parsed.data;
  const bookings = await findBookingsOnDate(date, { packageSlug, startTime });
  if (bookings.length === 0) return { ok: false, message: "No active bookings match — nothing was sent." };

  const result = await sendTeamMessage(bookings.map((b) => b.id), text, by, await getSiteUrl());
  revalidatePath("/admin/bookings");
  return { ok: true, message: `Message sent to ${result.sent} booking${result.sent === 1 ? "" : "s"}${emailed(result.sent, result.emailed)}.` };
}

export async function setPickupTimeAction(_prev: OperationState, formData: FormData): Promise<OperationState> {
  const by = await actor();
  if (!by) return { ok: false, message: "You are not authorised to manage pickups." };
  const id = z.string().uuid().safeParse(formData.get("bookingId"));
  const timeValue = String(formData.get("pickupTime") ?? "");
  if (!id.success) return { ok: false, message: "Booking not found." };
  if (timeValue && !TIME.test(timeValue)) return { ok: false, message: "Use a time like 07:15." };

  const booking = await prisma.booking.update({
    where: { id: id.data },
    data: { pickupTime: timeValue || null },
    select: { id: true, pickupLocation: true, travelDate: true },
  });

  let note = "";
  if (timeValue && formData.get("notify") === "on") {
    const where = booking.pickupLocation ? ` from ${booking.pickupLocation}` : "";
    const result = await sendTeamMessage([booking.id], `Your pickup time is ${timeValue}${where}. Please be ready a few minutes early.`, by, await getSiteUrl());
    note = ` Customer notified${result.emailed ? " by email" : " on their profile"}.`;
  }
  revalidatePath("/admin/bookings/pickups");
  return { ok: true, message: (timeValue ? `Pickup time set to ${timeValue}.` : "Pickup time cleared.") + note };
}
