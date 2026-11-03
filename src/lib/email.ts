import { Resend } from "resend";
import { describeGuests, type Booking } from "@/lib/bookings";
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

/** Tells the team about a new booking from the booking widget. Best-effort. */
export async function sendNewBookingEmail(booking: Booking) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("[email] RESEND_API_KEY not set — new booking email skipped", booking.id);
    return false;
  }
  const answers = booking.answers
    .filter((a) => a.answer)
    .map((a) => `<p><strong>${escapeHtml(a.question)}</strong><br />${multiline(a.answer)}</p>`)
    .join("");
  try {
    const { error } = await new Resend(apiKey).emails.send({
      from: FROM_ADDRESS,
      to: "hello@ceylonittours.com",
      replyTo: booking.customerEmail,
      subject: `New booking: ${booking.packageTitle.replace(/[\r\n]/g, " ")} on ${booking.travelDate ?? "—"}`,
      html: `
        <p><strong>Tour:</strong> ${escapeHtml(booking.packageTitle)}<br />
           <strong>Option:</strong> ${escapeHtml(booking.optionTitle ?? "—")}<br />
           <strong>Date:</strong> ${escapeHtml(booking.travelDate ?? "—")} at ${escapeHtml(booking.startTime ?? "—")}<br />
           <strong>Guests:</strong> ${escapeHtml(describeGuests(booking))}<br />
           <strong>Total:</strong> USD ${(booking.totalPrice ?? 0).toFixed(2)} (pay on arrival)</p>
        <p><strong>Customer:</strong> ${escapeHtml(booking.customerName)} · ${escapeHtml(booking.customerEmail)} · ${escapeHtml(booking.customerPhone ?? "—")}</p>
        ${answers}
        ${booking.message ? `<p><strong>Message:</strong><br />${multiline(booking.message)}</p>` : ""}
        <p>Ref ${escapeHtml(booking.id.slice(0, 8).toUpperCase())} — confirm it in /admin/bookings.</p>
      `,
    });
    if (error) throw error;
    return true;
  } catch (error) {
    console.error("[email] New booking email failed", error);
    return false;
  }
}

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
         <strong>Travel date:</strong> ${escapeHtml(date ?? "To be confirmed")}${booking.startTime ? ` at ${escapeHtml(booking.startTime)}` : ""}<br />
         ${booking.optionTitle ? `<strong>Option:</strong> ${escapeHtml(booking.optionTitle)}<br />` : ""}
         ${booking.totalParticipants ? `<strong>Guests:</strong> ${escapeHtml(describeGuests(booking))}<br />` : ""}
         ${booking.totalPrice !== undefined ? `<strong>Total:</strong> USD ${booking.totalPrice.toFixed(2)} — pay on arrival<br />` : ""}
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

/**
 * Sends a password-reset link. Returns false (without throwing) when email isn't configured;
 * in development the link is then logged so the flow can still be tested.
 */
export async function sendPasswordResetEmail(to: { email: string; name: string }, resetUrl: string) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    if (process.env.NODE_ENV !== "production") {
      console.info(`[email] RESEND_API_KEY not set — password reset link for ${to.email}:\n${resetUrl}`);
    } else {
      console.warn("[email] Password reset email not sent (RESEND_API_KEY missing)");
    }
    return false;
  }

  const html = `
    <div style="font-family:Arial,sans-serif;color:#172033;max-width:560px">
      <h2 style="color:#173a8a">Reset your password</h2>
      <p>Hi ${escapeHtml(to.name || "there")},</p>
      <p>We received a request to reset the password for your Ceylon IT Tours account.</p>
      <p style="margin:28px 0">
        <a href="${escapeHtml(resetUrl)}" style="background:#173a8a;color:#ffffff;padding:12px 24px;border-radius:999px;text-decoration:none;font-weight:bold">Choose a new password</a>
      </p>
      <p>This link expires in 1 hour and can only be used once.</p>
      <p>If you didn't ask for this, you can ignore this email — your password won't change.</p>
      <p>— Ceylon IT Tours</p>
    </div>
  `;

  try {
    const { error } = await new Resend(apiKey).emails.send({
      from: FROM_ADDRESS,
      to: to.email,
      replyTo: "hello@ceylonittours.com",
      subject: "Reset your Ceylon IT Tours password",
      html,
    });
    if (error) throw error;
    return true;
  } catch (error) {
    console.error("[email] Password reset email failed", error);
    return false;
  }
}
