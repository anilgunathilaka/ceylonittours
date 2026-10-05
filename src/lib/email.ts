import { Resend } from "resend";
import type { Booking } from "@/lib/bookings";
import { formatDisplayDate } from "@/lib/date";

const FROM_ADDRESS = process.env.EMAIL_FROM ?? "Ceylon IT Tours <bookings@ceylonittours.com>";

export function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const multiline = (value: string) => escapeHtml(value).replace(/\n/g, "<br />");

/**
 * Emails the customer when an admin confirms or cancels their booking.
 * Returns false (without throwing) when email isn't configured.
 */
export async function sendBookingStatusEmail(booking: Booking, siteUrl: string) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || !booking.customerEmail) {
    console.warn("[email] Booking status email not sent (RESEND_API_KEY or customer email missing)", booking.id);
    return false;
  }

  const confirmed = booking.status === "confirmed";
  const title = escapeHtml(booking.packageTitle);
  const date = booking.travelDate ? formatDisplayDate(booking.travelDate) : "To be confirmed";
  const subject = confirmed
    ? `Your booking is confirmed: ${booking.packageTitle}`
    : `Update on your booking: ${booking.packageTitle}`;

  const html = `
    <div style="font-family:Arial,sans-serif;color:#172033;max-width:560px">
      <h2 style="color:#173a8a">${confirmed ? "Your tour is confirmed! 🎉" : "Your booking request was cancelled"}</h2>
      <p>Hi ${escapeHtml(booking.customerName || "there")},</p>
      <p>${
        confirmed
          ? `Great news — your booking for <strong>${title}</strong> is confirmed.`
          : `Unfortunately we couldn't confirm your booking for <strong>${title}</strong>.`
      }</p>
      <p><strong>Tour:</strong> ${title}<br />
         <strong>Status:</strong> ${confirmed ? "Confirmed" : "Cancelled"}<br />
         <strong>Travel date:</strong> ${escapeHtml(date ?? "To be confirmed")}<br />
         <strong>Booking reference:</strong> ${escapeHtml(booking.id.slice(0, 8).toUpperCase())}</p>
      ${
        booking.adminMessage
          ? `<p><strong>Message from our team:</strong></p><p style="background:#f2f5fb;padding:12px 16px;border-radius:8px">${multiline(booking.adminMessage)}</p>`
          : ""
      }
      <p><a href="${siteUrl}/profile" style="color:#173a8a">View your bookings</a></p>
      <p>— Ceylon IT Tours</p>
    </div>
  `;

  try {
    const { error } = await new Resend(apiKey).emails.send({
      from: FROM_ADDRESS,
      to: booking.customerEmail,
      replyTo: "hello@ceylonittours.com",
      subject,
      html,
    });
    if (error) throw error;
    return true;
  } catch (error) {
    console.error("[email] Booking status email failed", error);
    return false;
  }
}
