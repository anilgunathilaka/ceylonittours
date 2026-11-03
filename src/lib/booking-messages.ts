import { Resend } from "resend";
import { prisma } from "@/lib/db";
import { BookingStatus } from "@/generated/prisma/enums";
import { escapeHtml } from "@/lib/email";
import { formatDisplayDate } from "@/lib/date";

/**
 * Messages between the team and customers about a booking. Team messages are also emailed
 * (best-effort); customers read and reply on their profile.
 */

export type BookingMessage = { id: string; bookingId: string; sender: "team" | "customer"; body: string; createdAt: string };

const toMessage = (row: { id: string; bookingId: string; sender: string; body: string; createdAt: Date }): BookingMessage => ({
  id: row.id,
  bookingId: row.bookingId,
  sender: row.sender === "team" ? "team" : "customer",
  body: row.body,
  createdAt: row.createdAt.toISOString(),
});

/** Messages for many bookings at once, grouped by booking */
export async function getMessagesForBookings(bookingIds: string[]) {
  const rows = bookingIds.length
    ? await prisma.bookingMessage.findMany({ where: { bookingId: { in: bookingIds } }, orderBy: { createdAt: "asc" } })
    : [];
  const map = new Map<string, BookingMessage[]>();
  for (const row of rows) map.set(row.bookingId, [...(map.get(row.bookingId) ?? []), toMessage(row)]);
  return map;
}

async function emailCustomer(booking: { id: string; customerEmail: string; customerName: string; packageTitle: string; travelDate: Date | null }, body: string, siteUrl: string) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || !booking.customerEmail) return false;
  try {
    const { error } = await new Resend(apiKey).emails.send({
      from: process.env.EMAIL_FROM ?? "Ceylon IT Tours <bookings@ceylonittours.com>",
      to: booking.customerEmail,
      replyTo: "hello@ceylonittours.com",
      subject: `Message about your booking: ${booking.packageTitle.replace(/[\r\n]/g, " ")}`,
      html: `
        <div style="font-family:Arial,sans-serif;color:#172033;max-width:560px">
          <p>Hi ${escapeHtml(booking.customerName || "there")},</p>
          <p style="background:#f2f5fb;padding:12px 16px;border-radius:8px">${escapeHtml(body).replace(/\n/g, "<br />")}</p>
          <p><strong>Tour:</strong> ${escapeHtml(booking.packageTitle)}<br />
             <strong>Date:</strong> ${escapeHtml(booking.travelDate ? (formatDisplayDate(booking.travelDate.toISOString().slice(0, 10)) ?? "") : "To be confirmed")}<br />
             <strong>Booking reference:</strong> ${escapeHtml(booking.id.slice(0, 8).toUpperCase())}</p>
          <p><a href="${siteUrl}/profile" style="color:#173a8a">Reply from your bookings page</a></p>
          <p>— Ceylon IT Tours</p>
        </div>`,
    });
    if (error) throw error;
    return true;
  } catch (error) {
    console.error("[messages] Email failed", error);
    return false;
  }
}

/** Team → customers. Returns how many messages were saved and emailed. */
export async function sendTeamMessage(bookingIds: string[], body: string, actorEmail: string, siteUrl: string) {
  const bookings = await prisma.booking.findMany({
    where: { id: { in: bookingIds } },
    select: { id: true, customerEmail: true, customerName: true, packageTitle: true, travelDate: true },
  });
  if (bookings.length === 0) return { sent: 0, emailed: 0 };
  await prisma.bookingMessage.createMany({ data: bookings.map((b) => ({ bookingId: b.id, sender: "team", senderEmail: actorEmail, body })) });
  let emailed = 0;
  for (const booking of bookings) if (await emailCustomer(booking, body, siteUrl)) emailed++;
  return { sent: bookings.length, emailed };
}

/** Customer → team, only on their own booking */
export async function sendCustomerMessage(userId: string, bookingId: string, body: string) {
  const booking = await prisma.booking.findFirst({ where: { id: bookingId, userId }, select: { id: true, customerEmail: true } });
  if (!booking) return null;
  return toMessage(await prisma.bookingMessage.create({ data: { bookingId, sender: "customer", senderEmail: booking.customerEmail, body } }));
}

/** Active (pending or confirmed) bookings on a date, for messaging everyone at once */
export async function findBookingsOnDate(date: string, filter: { packageSlug?: string; startTime?: string } = {}) {
  return prisma.booking.findMany({
    where: {
      travelDate: new Date(`${date}T00:00:00.000Z`),
      status: { in: [BookingStatus.PENDING, BookingStatus.CONFIRMED] },
      ...(filter.packageSlug ? { packageSlug: filter.packageSlug } : {}),
      ...(filter.startTime ? { startTime: filter.startTime } : {}),
    },
    select: { id: true, packageSlug: true, packageTitle: true, startTime: true, customerName: true, totalParticipants: true },
    orderBy: [{ startTime: "asc" }, { createdAt: "asc" }],
  });
}
