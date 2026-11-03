import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Booking } from "@/lib/bookings";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const tone: Record<Booking["status"], string> = {
  pending: "bg-gold/15 text-gold-dark",
  confirmed: "bg-nature/10 text-nature",
  cancelled: "bg-midnight/5 text-slate line-through",
};

const shift = (month: string, delta: number) => {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1 + delta, 1)).toISOString().slice(0, 7);
};

/** Month view of bookings by travel date. Clicking a day opens the list filtered to it. */
export function BookingsCalendar({
  month,
  bookings,
  today,
  monthHref,
  dayHref,
}: {
  month: string;
  bookings: Booking[];
  today: string;
  monthHref: (month: string) => string;
  dayHref: (date: string) => string;
}) {
  const [y, m] = month.split("-").map(Number);
  const first = new Date(Date.UTC(y, m - 1, 1));
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const byDate = new Map<string, Booking[]>();
  for (const booking of bookings) {
    if (!booking.travelDate?.startsWith(month)) continue;
    byDate.set(booking.travelDate, [...(byDate.get(booking.travelDate) ?? []), booking]);
  }
  for (const list of byDate.values()) list.sort((a, b) => (a.startTime ?? "99").localeCompare(b.startTime ?? "99"));
  const undated = bookings.filter((b) => !b.travelDate).length;

  const cells = [
    ...Array.from({ length: first.getUTCDay() }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => `${month}-${String(i + 1).padStart(2, "0")}`),
  ];

  return (
    <div className="flex flex-col gap-4 rounded-3xl bg-surface p-5 shadow-card ring-1 ring-border sm:p-7">
      <div className="flex items-center justify-between">
        <p className="font-display text-xl font-semibold text-midnight">
          {first.toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" })}
        </p>
        <div className="flex items-center gap-1">
          <Link href={monthHref(today.slice(0, 7))} className="rounded-full px-3 py-1.5 text-sm font-semibold text-midnight hover:bg-midnight/5">
            Today
          </Link>
          <Link href={monthHref(shift(month, -1))} aria-label="Previous month" className="rounded-full p-2 text-slate hover:bg-midnight/5">
            <ChevronLeft size={18} />
          </Link>
          <Link href={monthHref(shift(month, 1))} aria-label="Next month" className="rounded-full p-2 text-slate hover:bg-midnight/5">
            <ChevronRight size={18} />
          </Link>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="grid min-w-[760px] grid-cols-7 gap-1.5">
          {WEEKDAYS.map((d) => (
            <span key={d} className="text-center text-xs font-semibold text-slate">
              {d}
            </span>
          ))}
          {cells.map((date, i) => {
            if (!date) return <div key={`e${i}`} />;
            const list = byDate.get(date) ?? [];
            const guests = list.filter((b) => b.status !== "cancelled").reduce((sum, b) => sum + b.totalParticipants, 0);
            return (
              <Link
                key={date}
                href={dayHref(date)}
                className={cn(
                  "flex min-h-28 flex-col gap-1 rounded-xl border p-1.5 transition-colors hover:border-primary/40",
                  date === today ? "border-primary/50 bg-primary/[0.03]" : "border-border",
                )}
              >
                <span className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-midnight">{Number(date.slice(8))}</span>
                  {guests > 0 && <span className="text-slate">{guests} pax</span>}
                </span>
                {list.slice(0, 4).map((booking) => (
                  <span key={booking.id} className={cn("truncate rounded-md px-1.5 py-0.5 text-[11px] font-medium", tone[booking.status])} title={`${booking.packageTitle} — ${booking.customerName}`}>
                    {booking.startTime && `${booking.startTime} `}
                    {booking.customerName}
                    {booking.totalParticipants > 0 && ` (${booking.totalParticipants})`}
                  </span>
                ))}
                {list.length > 4 && <span className="text-[11px] font-semibold text-primary">+{list.length - 4} more</span>}
              </Link>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 text-xs text-slate">
        <span className="flex items-center gap-1.5">
          <span className={cn("h-3 w-5 rounded", tone.pending)} /> Pending
        </span>
        <span className="flex items-center gap-1.5">
          <span className={cn("h-3 w-5 rounded", tone.confirmed)} /> Confirmed
        </span>
        <span className="flex items-center gap-1.5">
          <span className={cn("h-3 w-5 rounded", tone.cancelled)} /> Cancelled
        </span>
        {undated > 0 && <span>{undated} booking{undated === 1 ? "" : "s"} without a date are only shown in the list.</span>}
      </div>
    </div>
  );
}
