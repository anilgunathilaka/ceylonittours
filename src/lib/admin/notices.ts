/**
 * Shared between the admin bookings page and its server action. After a successful
 * update the action redirects back to the same filter tab with short codes in the URL
 * (no customer data), and the page turns them into a banner. Works with and without JS.
 */
export const BOOKING_FILTERS = ["pending", "upcoming", "past", "cancelled", "all"] as const;
export type BookingFilter = (typeof BOOKING_FILTERS)[number];

export const isBookingFilter = (value: unknown): value is BookingFilter =>
  BOOKING_FILTERS.includes(value as BookingFilter);

const NOTICES = {
  confirmed: "Booking confirmed.",
  cancelled: "Booking cancelled.",
  pending: "Booking moved back to pending.",
} as const;
export type NoticeCode = keyof typeof NOTICES;

const EMAIL_NOTES = {
  sent: " Customer emailed.",
  "not-sent": " Email not sent (email is not configured or failed) — the message is still shown on the customer's profile.",
} as const;
export type EmailCode = keyof typeof EMAIL_NOTES;

export function noticeUrl(filter: BookingFilter, notice: NoticeCode, email?: EmailCode) {
  const params = new URLSearchParams({ status: filter, notice });
  if (email) params.set("email", email);
  return `/admin/bookings?${params}`;
}

/** Banner text for the codes in the URL; unknown codes are ignored. */
export function noticeMessage(notice?: string, email?: string) {
  if (!notice || !(notice in NOTICES)) return null;
  const note = email && email in EMAIL_NOTES ? EMAIL_NOTES[email as EmailCode] : "";
  return NOTICES[notice as NoticeCode] + note;
}
