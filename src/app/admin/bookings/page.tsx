import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  CalendarDays,
  CalendarRange,
  Clock,
  History,
  List,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  Search,
  Ticket,
  User,
  Users,
  Wallet,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { BookingActionForm } from "@/components/admin/BookingActionForm";
import { AdminNotice } from "@/components/admin/AdminNotice";
import { BookingsCalendar } from "@/components/admin/BookingsCalendar";
import { AdminShell } from "@/components/admin/AdminShell";
import { OperationForm } from "@/components/admin/OperationForm";
import { sendBookingMessageAction } from "@/app/admin/bookings/operations-actions";
import { getMessagesForBookings } from "@/lib/booking-messages";
import { addDays } from "@/lib/products/slots";
import { noticeMessage } from "@/lib/admin/notices";
import { getAdminSession } from "@/lib/auth/admin";
import { describeGuests, getAllBookings, type Booking, type BookingStatus } from "@/lib/bookings";
import { formatDisplayDate, toISODate } from "@/lib/date";
import { cn, formatCurrency } from "@/lib/utils";

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

type SearchParams = {
  status?: string;
  notice?: string;
  email?: string;
  q?: string;
  package?: string;
  from?: string;
  to?: string;
  view?: string;
  month?: string;
};

const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Search (name, email, phone, reference), tour and travel-date range */
function matchesSearch(booking: Booking, { q, pkg, from, to }: { q: string; pkg: string; from: string; to: string }) {
  if (pkg && booking.packageSlug !== pkg) return false;
  if (from && (!booking.travelDate || booking.travelDate < from)) return false;
  if (to && (!booking.travelDate || booking.travelDate > to)) return false;
  if (!q) return true;
  const needle = q.toLowerCase();
  return [booking.customerName, booking.customerEmail, booking.customerPhone ?? "", booking.id.slice(0, 8), booking.packageTitle]
    .some((value) => value.toLowerCase().includes(needle));
}

export default async function AdminBookingsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  if (!(await getAdminSession())) {
    notFound();
  }

  const params = await searchParams;
  const { status, notice, email } = params;
  const noticeText = noticeMessage(notice, email);
  const filter: Filter = filters.some((f) => f.value === status) ? (status as Filter) : "pending";
  const today = toISODate(new Date());
  const view = params.view === "calendar" ? "calendar" : "list";
  const search = {
    q: (params.q ?? "").trim().slice(0, 100),
    pkg: params.package ?? "",
    from: params.from && DATE.test(params.from) ? params.from : "",
    to: params.to && DATE.test(params.to) ? params.to : "",
  };
  const month = params.month && /^\d{4}-(0[1-9]|1[0-2])$/.test(params.month) ? params.month : today.slice(0, 7);

  const all = await getAllBookings();
  const searched = all.filter((booking) => matchesSearch(booking, search));
  const counts = Object.fromEntries(
    filters.map((f) => [f.value, searched.filter((booking) => matchesFilter(booking, f.value, today)).length]),
  ) as Record<Filter, number>;
  const bookings = searched.filter((booking) => matchesFilter(booking, filter, today));
  const packageChoices = [...new Map(all.map((b) => [b.packageSlug, b.packageTitle])).entries()].sort((a, b) => a[1].localeCompare(b[1]));
  const guestTotal = bookings.reduce((sum, b) => sum + b.totalParticipants, 0);
  const messages = await getMessagesForBookings(bookings.map((b) => b.id));
  const shortcuts = [
    { label: "Today", from: today, to: today },
    { label: "Tomorrow", from: addDays(today, 1), to: addDays(today, 1) },
    { label: "Next 7 days", from: today, to: addDays(today, 7) },
  ];

  /** Keeps every current filter, overriding the given ones */
  const linkWith = (overrides: Partial<SearchParams>) => {
    const next = new URLSearchParams();
    const merged: SearchParams = { status: filter, q: search.q, package: search.pkg, from: search.from, to: search.to, view, month, ...overrides };
    for (const [key, value] of Object.entries(merged)) if (value && !(key === "view" && value === "list")) next.set(key, value);
    if (merged.view !== "calendar") next.delete("month");
    return `/admin/bookings?${next}`;
  };
  const filtered = Boolean(search.q || search.pkg || search.from || search.to);

  return (
    <AdminShell
      title="Bookings"
      description="Review booking requests, confirm or cancel them, and message the customer. Messages appear on the customer's profile and are emailed when email is configured."
    >
        <nav className="flex flex-wrap gap-2" aria-label="Filter bookings">
          {filters.map((f) => (
            <Link
              key={f.value}
              href={linkWith({ status: f.value })}
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

        <form method="get" action="/admin/bookings" className="grid grid-cols-1 gap-3 rounded-3xl bg-surface p-4 shadow-card ring-1 ring-border sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_auto_auto_auto]">
          <input type="hidden" name="status" value={filter} />
          {view === "calendar" && <input type="hidden" name="view" value="calendar" />}
          <label className="relative">
            <span className="sr-only">Search</span>
            <Search size={16} className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-slate" />
            <input
              name="q"
              defaultValue={search.q}
              placeholder="Name, email, phone or ref"
              className="h-11 w-full rounded-xl border border-border bg-surface pr-3 pl-10 text-sm text-midnight focus:border-secondary focus:outline-none"
            />
          </label>
          <label>
            <span className="sr-only">Tour</span>
            <select name="package" defaultValue={search.pkg} className="h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm text-midnight focus:border-secondary focus:outline-none">
              <option value="">All tours</option>
              {packageChoices.map(([slug, title]) => (
                <option key={slug} value={slug}>
                  {title}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 text-xs font-semibold text-slate uppercase">
            From
            <input type="date" name="from" defaultValue={search.from} className="h-11 rounded-xl border border-border bg-surface px-3 text-sm text-midnight normal-case focus:outline-none" />
          </label>
          <label className="flex items-center gap-2 text-xs font-semibold text-slate uppercase">
            To
            <input type="date" name="to" defaultValue={search.to} className="h-11 rounded-xl border border-border bg-surface px-3 text-sm text-midnight normal-case focus:outline-none" />
          </label>
          <div className="flex gap-2">
            <button type="submit" className="h-11 rounded-full bg-primary px-5 text-sm font-semibold text-white hover:bg-primary-dark">
              Filter
            </button>
            {filtered && (
              <Link href={linkWith({ q: "", package: "", from: "", to: "" })} className="flex h-11 items-center rounded-full px-4 text-sm font-semibold text-slate hover:bg-midnight/5">
                Clear
              </Link>
            )}
          </div>
        </form>

        <div className="-mt-4 flex flex-wrap items-center gap-2 text-sm">
          <span className="text-slate">Travel date:</span>
          {shortcuts.map((s) => {
            const current = search.from === s.from && search.to === s.to;
            return (
              <Link
                key={s.label}
                href={linkWith({ status: "all", from: s.from, to: s.to })}
                className={cn("rounded-full px-3 py-1 font-semibold", current ? "bg-primary/10 text-primary" : "text-primary hover:bg-primary/5")}
              >
                {s.label}
              </Link>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate">
            {bookings.length} booking{bookings.length === 1 ? "" : "s"}
            {guestTotal > 0 && ` · ${guestTotal} guests`}
          </p>
          <div className="flex rounded-full bg-surface p-1 ring-1 ring-border">
            {(
              [
                ["list", "List", List],
                ["calendar", "Calendar", CalendarRange],
              ] as const
            ).map(([value, label, Icon]) => (
              <Link
                key={value}
                href={linkWith({ view: value })}
                aria-current={view === value ? "page" : undefined}
                className={cn(
                  "inline-flex h-9 items-center gap-1.5 rounded-full px-4 text-sm font-semibold",
                  view === value ? "bg-primary text-white" : "text-midnight hover:bg-midnight/5",
                )}
              >
                <Icon size={15} /> {label}
              </Link>
            ))}
          </div>
        </div>

        {noticeText && <AdminNotice key={`${notice}-${email}`} message={noticeText} />}

        {view === "calendar" ? (
          <BookingsCalendar
            month={month}
            bookings={bookings}
            today={today}
            monthHref={(m) => linkWith({ month: m })}
            dayHref={(d) => linkWith({ view: "list", from: d, to: d })}
          />
        ) : bookings.length === 0 ? (
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
                          {booking.startTime && ` at ${booking.startTime}`}
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
                      {booking.optionTitle && (
                        <div className="flex items-center gap-2 text-midnight sm:col-span-2">
                          <Ticket size={16} className="shrink-0 text-slate" />
                          <dt className="sr-only">Option</dt>
                          <dd>
                            {booking.optionTitle}
                            {booking.language && <span className="text-slate"> · {booking.language}</span>}
                          </dd>
                        </div>
                      )}
                      {booking.totalParticipants > 0 && (
                        <div className="flex items-center gap-2 text-midnight">
                          <Users size={16} className="shrink-0 text-slate" />
                          <dt className="sr-only">Guests</dt>
                          <dd>{describeGuests(booking)}</dd>
                        </div>
                      )}
                      {booking.totalPrice !== undefined && (
                        <div className="flex items-center gap-2 text-midnight">
                          <Wallet size={16} className="shrink-0 text-slate" />
                          <dt className="sr-only">Total</dt>
                          <dd>
                            <span className="font-semibold">{formatCurrency(booking.totalPrice)}</span>{" "}
                            <span className="text-xs text-slate">{booking.paymentMethod === "pay_on_arrival" ? "· pay on arrival" : ""}</span>
                            {booking.offerName && (
                              <span className="block text-xs text-accent-dark">
                                {booking.offerName} (−{booking.discountPercent}%)
                              </span>
                            )}
                          </dd>
                        </div>
                      )}
                      {booking.pickupLocation && (
                        <div className="flex items-start gap-2 text-midnight sm:col-span-2">
                          <MapPin size={16} className="mt-0.5 shrink-0 text-slate" />
                          <dt className="sr-only">Pickup</dt>
                          <dd>
                            Pickup: {booking.pickupLocation}
                            <span className={cn("ml-1", booking.pickupTime ? "text-slate" : "font-semibold text-accent-dark")}>
                              · {booking.pickupTime ? `at ${booking.pickupTime}` : "pickup time not set"}
                            </span>{" "}
                            <Link href="/admin/bookings/pickups" className="text-xs text-primary hover:underline">
                              Pickup planner
                            </Link>
                          </dd>
                        </div>
                      )}
                    </dl>

                    <div className="flex flex-col gap-3 text-sm">
                      {booking.answers.some((a) => a.answer) && (
                        <div className="rounded-2xl bg-gold/10 p-4">
                          <p className="mb-2 text-xs font-semibold tracking-wide text-slate uppercase">Booking questions</p>
                          <dl className="flex flex-col gap-1.5">
                            {booking.answers
                              .filter((a) => a.answer)
                              .map((a) => (
                                <div key={a.question}>
                                  <dt className="text-xs text-slate">{a.question}</dt>
                                  <dd className="whitespace-pre-line text-midnight">{a.answer}</dd>
                                </div>
                              ))}
                          </dl>
                        </div>
                      )}
                      {booking.message && (
                        <div className="rounded-2xl bg-midnight/[0.03] p-4">
                          <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold tracking-wide text-slate uppercase">
                            <MessageSquare size={14} /> Customer request
                          </p>
                          <p className="whitespace-pre-line text-midnight">{booking.message}</p>
                        </div>
                      )}
                      {booking.adminMessage && (
                        <div className="rounded-2xl bg-primary/5 p-4">
                          <p className="mb-1 text-xs font-semibold tracking-wide text-primary uppercase">Last message sent</p>
                          <p className="whitespace-pre-line text-midnight">{booking.adminMessage}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <details className="mt-4 text-sm" open={(messages.get(booking.id) ?? []).some((m) => m.sender === "customer")}>
                    <summary className="flex cursor-pointer items-center gap-1.5 font-medium text-slate hover:text-midnight">
                      <MessageSquare size={15} /> Messages ({messages.get(booking.id)?.length ?? 0})
                    </summary>
                    <div className="mt-3 flex flex-col gap-3">
                      {(messages.get(booking.id) ?? []).map((m) => (
                        <div
                          key={m.id}
                          className={cn("max-w-[85%] rounded-2xl px-4 py-2.5", m.sender === "team" ? "self-end bg-primary/10 text-midnight" : "self-start bg-midnight/[0.04] text-midnight")}
                        >
                          <p className="text-[11px] font-semibold text-slate">
                            {m.sender === "team" ? "Ceylon IT Tours" : booking.customerName} · {formatTimestamp(m.createdAt)}
                          </p>
                          <p className="whitespace-pre-line">{m.body}</p>
                        </div>
                      ))}
                      <OperationForm action={sendBookingMessageAction} submitLabel="Send message">
                        <input type="hidden" name="bookingId" value={booking.id} />
                        <textarea
                          name="body"
                          rows={2}
                          maxLength={2000}
                          placeholder="Write to the customer — shown on their profile and emailed"
                          className="w-full resize-y rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm text-midnight focus:border-secondary focus:outline-none"
                        />
                      </OperationForm>
                    </div>
                  </details>

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
                      filter={filter}
                    />
                  </div>
                </article>
              );
            })}
          </div>
        )}
    </AdminShell>
  );
}
