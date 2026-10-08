import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, Clock, History, Mail, MessageSquare, Phone, ShieldCheck, User } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { Badge } from "@/components/ui/Badge";
import { BookingActionForm } from "@/components/admin/BookingActionForm";
import { AdminFlashProvider } from "@/components/admin/AdminFlash";
import { getAdminSession } from "@/lib/auth/admin";
import { getAllBookings, type Booking, type BookingStatus } from "@/lib/bookings";
import { formatDisplayDate, toISODate } from "@/lib/date";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Manage Bookings",
  robots: { index: false, follow: false },
};

const filters = [
  { value: "pending", label: "Pending" },
  { value: "upcoming", label: "Upcoming" },
  { value: "past", label: "Past" },
  { value: "cancelled", label: "Cancelled" },
  { value: "all", label: "All" },
] as const;

type Filter = (typeof filters)[number]["value"];

const statusBadge: Record<BookingStatus, { label: string; tone: "gold" | "nature" | "accent" }> = {
  pending: { label: "Pending", tone: "gold" },
  confirmed: { label: "Confirmed", tone: "nature" },
  cancelled: { label: "Cancelled", tone: "accent" },
};

function matchesFilter(booking: Booking, filter: Filter, today: string) {
  const isPast = Boolean(booking.travelDate && booking.travelDate < today);
  switch (filter) {
    case "pending":
      return booking.status === "pending" && !isPast;
    case "upcoming":
      return booking.status === "confirmed" && !isPast;
    case "past":
      return isPast && booking.status !== "cancelled";
    case "cancelled":
      return booking.status === "cancelled";
    default:
      return true;
  }
}

function formatTimestamp(iso: string) {
  return new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default async function AdminBookingsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  if (!(await getAdminSession())) {
    notFound();
  }

  const { status } = await searchParams;
  const filter: Filter = filters.some((f) => f.value === status) ? (status as Filter) : "pending";
  const today = toISODate(new Date());

  const all = await getAllBookings();
  const counts = Object.fromEntries(
    filters.map((f) => [f.value, all.filter((booking) => matchesFilter(booking, f.value, today)).length]),
  ) as Record<Filter, number>;
  const bookings = all.filter((booking) => matchesFilter(booking, filter, today));

  return (
    <section className="bg-ivory py-12 lg:py-16">
      <Container className="flex flex-col gap-8">
        <header className="flex flex-col gap-2">
          <span className="flex items-center gap-2 text-sm font-semibold text-primary">
            <ShieldCheck size={18} /> Admin
          </span>
          <h1 className="font-display text-3xl font-semibold text-midnight sm:text-4xl">Manage Bookings</h1>
          <p className="text-sm text-slate">
            Review booking requests, confirm or cancel them, and send the customer a message. Messages appear on the
            customer&apos;s profile and are emailed when email is configured.
          </p>
        </header>

        <nav className="flex flex-wrap gap-2" aria-label="Filter bookings">
          {filters.map((f) => (
            <Link
              key={f.value}
              href={`/admin/bookings?status=${f.value}`}
              className={cn(
                "inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-semibold ring-1 transition-colors",
                filter === f.value ? "bg-primary text-white ring-primary" : "bg-surface text-midnight ring-border hover:ring-primary/40",
              )}
            >
              {f.label}
              <span className={cn("rounded-full px-2 text-xs", filter === f.value ? "bg-white/20" : "bg-midnight/5")}>{counts[f.value]}</span>
            </Link>
          ))}
        </nav>

        <AdminFlashProvider>
          {bookings.length === 0 ? (
            <p className="rounded-3xl border border-dashed border-border bg-surface px-6 py-16 text-center text-sm text-slate">
              No {filter === "all" ? "" : `${filters.find((f) => f.value === filter)?.label.toLowerCase()} `}bookings.
            </p>
          ) : (
            <div className="flex flex-col gap-5">
              {bookings.map((booking) => {
                const isPast = Boolean(booking.travelDate && booking.travelDate < today);
                const badge = isPast && booking.status === "confirmed" ? { label: "Completed", tone: "nature" as const } : statusBadge[booking.status];

                return (
                  <article key={booking.id} className="rounded-3xl bg-surface p-6 shadow-card ring-1 ring-border sm:p-7">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h2 className="font-display text-lg font-semibold text-midnight">
                          <Link href={`/tour-packages/${booking.packageSlug}`} className="hover:text-primary hover:underline">
                            {booking.packageTitle}
                          </Link>
                        </h2>
                        <p className="text-xs text-slate">
                          Requested {formatTimestamp(booking.createdAt)} · Ref {booking.id.slice(0, 8)}
                        </p>
                      </div>
                      <Badge tone={badge.tone}>{badge.label}</Badge>
                    </div>

                    <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
                      <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                        <div className="flex items-center gap-2 text-midnight">
                          <User size={16} className="text-slate" />
                          <dt className="sr-only">Customer</dt>
                          <dd className="font-medium">{booking.customerName}</dd>
                        </div>
                        <div className="flex items-center gap-2 text-midnight">
                          <CalendarDays size={16} className="text-slate" />
                          <dt className="sr-only">Travel date</dt>
                          <dd>
                            {booking.travelDate ? formatDisplayDate(booking.travelDate) : "No date yet"}
                            {booking.requestedTravelDate && booking.requestedTravelDate !== booking.travelDate && (
                              <span className="block text-xs text-slate">
                                Requested {formatDisplayDate(booking.requestedTravelDate)}
                              </span>
                            )}
                          </dd>
                        </div>
                        {booking.customerEmail && (
                          <div className="flex min-w-0 items-center gap-2">
                            <Mail size={16} className="shrink-0 text-slate" />
                            <dt className="sr-only">Email</dt>
                            <dd className="truncate">
                              <a href={`mailto:${booking.customerEmail}`} className="text-primary hover:underline">
                                {booking.customerEmail}
                              </a>
                            </dd>
                          </div>
                        )}
                        {booking.customerPhone && (
                          <div className="flex items-center gap-2">
                            <Phone size={16} className="text-slate" />
                            <dt className="sr-only">Phone</dt>
                            <dd>
                              <a href={`tel:${booking.customerPhone}`} className="text-primary hover:underline">
                                {booking.customerPhone}
                              </a>
                            </dd>
                          </div>
                        )}
                      </dl>

                      <div className="flex flex-col gap-3 text-sm">
                        <div className="rounded-2xl bg-midnight/[0.03] p-4">
                          <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold tracking-wide text-slate uppercase">
                            <MessageSquare size={14} /> Customer request
                          </p>
                          <p className="whitespace-pre-line text-midnight">{booking.message}</p>
                        </div>
                        {booking.adminMessage && (
                          <div className="rounded-2xl bg-primary/5 p-4">
                            <p className="mb-1 text-xs font-semibold tracking-wide text-primary uppercase">Last message sent</p>
                            <p className="whitespace-pre-line text-midnight">{booking.adminMessage}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {booking.history && booking.history.length > 1 && (
                      <details className="mt-4 text-sm">
                        <summary className="flex cursor-pointer items-center gap-1.5 font-medium text-slate hover:text-midnight">
                          <History size={15} /> Status history ({booking.history.length})
                        </summary>
                        <ol className="mt-3 flex flex-col gap-2 border-l border-border pl-4">
                          {booking.history.map((entry, index) => (
                            <li key={index} className="text-slate">
                              <span className="font-semibold text-midnight capitalize">{entry.status}</span> by {entry.by} ·{" "}
                              <Clock size={12} className="inline" /> {formatTimestamp(entry.at)}
                              {entry.message && <p className="whitespace-pre-line text-midnight/80">“{entry.message}”</p>}
                            </li>
                          ))}
                        </ol>
                      </details>
                    )}

                    <div className="mt-5 border-t border-border pt-5">
                      <BookingActionForm
                        bookingId={booking.id}
                        status={booking.status}
                        travelDate={booking.travelDate}
                        version={booking.version}
                      />
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </AdminFlashProvider>
      </Container>
    </section>
  );
}
