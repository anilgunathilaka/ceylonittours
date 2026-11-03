import type { Booking } from "@/lib/bookings";
import { countryFromPhone } from "@/lib/phone-country";

/** How far ahead customers book (days from booking to travel) */
export const BOOKING_WINDOWS = [
  { label: "Same or next day", max: 1 },
  { label: "2–7 days", max: 7 },
  { label: "8–30 days", max: 30 },
  { label: "31–90 days", max: 90 },
  { label: "90+ days", max: Infinity },
] as const;

/**
 * Dashboard numbers, computed from bookings. "Revenue" is the quoted price of confirmed
 * bookings (collected on arrival), by travel date.
 */

export type MonthStat = { month: string; bookings: number; guests: number; revenue: number };

const monthKey = (date: string) => date.slice(0, 7);

export function lastMonths(today: string, count: number) {
  const [y, m] = today.split("-").map(Number);
  return Array.from({ length: count }, (_, i) => new Date(Date.UTC(y, m - count + i, 1)).toISOString().slice(0, 7));
}

export function computeStats(bookings: Booking[], today: string) {
  const active = bookings.filter((b) => b.status !== "cancelled");
  const confirmed = bookings.filter((b) => b.status === "confirmed");
  const revenueOf = (list: Booking[]) => list.reduce((sum, b) => sum + (b.totalPrice ?? 0), 0);

  const months = lastMonths(today, 12);
  const monthly: MonthStat[] = months.map((month) => {
    const inMonth = active.filter((b) => b.travelDate && monthKey(b.travelDate) === month);
    return {
      month,
      bookings: inMonth.length,
      guests: inMonth.reduce((sum, b) => sum + b.totalParticipants, 0),
      revenue: revenueOf(inMonth.filter((b) => b.status === "confirmed")),
    };
  });

  const byTour = new Map<string, { slug: string; title: string; bookings: number; guests: number; revenue: number }>();
  for (const b of active) {
    const row = byTour.get(b.packageSlug) ?? { slug: b.packageSlug, title: b.packageTitle, bookings: 0, guests: 0, revenue: 0 };
    row.bookings += 1;
    row.guests += b.totalParticipants;
    if (b.status === "confirmed") row.revenue += b.totalPrice ?? 0;
    byTour.set(b.packageSlug, row);
  }

  const upcomingConfirmed = confirmed.filter((b) => b.travelDate && b.travelDate >= today);
  const thisMonth = monthKey(today);

  // Where customers come from (by phone calling code), and how far ahead they book
  const markets = new Map<string, number>();
  for (const b of active) {
    const country = countryFromPhone(b.customerPhone) ?? "Unknown";
    markets.set(country, (markets.get(country) ?? 0) + 1);
  }
  const windows = BOOKING_WINDOWS.map((w) => ({ label: w.label, bookings: 0 }));
  for (const b of active) {
    if (!b.travelDate) continue;
    const days = Math.round((Date.parse(`${b.travelDate}T00:00:00Z`) - Date.parse(`${b.createdAt.slice(0, 10)}T00:00:00Z`)) / 86400_000);
    windows[BOOKING_WINDOWS.findIndex((w) => days <= w.max)].bookings += 1;
  }

  return {
    sourceMarkets: [...markets.entries()].map(([country, bookings]) => ({ country, bookings })).sort((a, b) => b.bookings - a.bookings).slice(0, 10),
    bookingWindows: windows,
    kpis: {
      bookingsThisMonth: bookings.filter((b) => monthKey(b.createdAt) === thisMonth).length,
      pending: bookings.filter((b) => b.status === "pending" && (!b.travelDate || b.travelDate >= today)).length,
      upcomingGuests: upcomingConfirmed.reduce((sum, b) => sum + b.totalParticipants, 0),
      upcomingTrips: upcomingConfirmed.length,
      revenue12m: monthly.reduce((sum, m) => sum + m.revenue, 0),
      upcomingRevenue: revenueOf(upcomingConfirmed),
    },
    monthly,
    topTours: [...byTour.values()].sort((a, b) => b.bookings - a.bookings || b.revenue - a.revenue).slice(0, 8),
    statuses: {
      pending: bookings.filter((b) => b.status === "pending").length,
      confirmed: confirmed.length,
      cancelled: bookings.filter((b) => b.status === "cancelled").length,
    },
  };
}
