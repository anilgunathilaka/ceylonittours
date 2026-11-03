import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { DaySlots, SlotStatus } from "@/lib/products/slots";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const tone: Record<SlotStatus, string> = {
  available: "bg-nature/10 text-nature",
  full: "bg-accent/15 text-accent-dark",
  blocked: "bg-midnight/10 text-slate line-through",
  closed: "bg-midnight/5 text-slate",
};

/** "YYYY-MM" shifted by whole months */
export function shiftMonth(month: string, delta: number) {
  const [year, m] = month.split("-").map(Number);
  return new Date(Date.UTC(year, m - 1 + delta, 1)).toISOString().slice(0, 7);
}

/** Month grid of start times with booked / capacity, for the admin. `month` is "YYYY-MM". */
export function CapacityCalendar({ month, days, base }: { month: string; days: DaySlots[]; base: string }) {
  const [year, m] = month.split("-").map(Number);
  const first = new Date(Date.UTC(year, m - 1, 1));
  const daysInMonth = new Date(Date.UTC(year, m, 0)).getUTCDate();
  const byDate = new Map(days.map((d) => [d.date, d.slots]));

  const cells: (string | null)[] = [
    ...Array.from({ length: first.getUTCDay() }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => `${month}-${String(i + 1).padStart(2, "0")}`),
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="font-semibold text-midnight">{first.toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" })}</p>
        <div className="flex gap-1">
          <Link href={`${base}?month=${shiftMonth(month, -1)}`} aria-label="Previous month" className="rounded-full p-2 text-slate hover:bg-midnight/5" scroll={false}>
            <ChevronLeft size={18} />
          </Link>
          <Link href={`${base}?month=${shiftMonth(month, 1)}`} aria-label="Next month" className="rounded-full p-2 text-slate hover:bg-midnight/5" scroll={false}>
            <ChevronRight size={18} />
          </Link>
        </div>
      </div>
      <div className="overflow-x-auto">
        <div className="grid min-w-[640px] grid-cols-7 gap-1.5">
          {WEEKDAYS.map((d) => (
            <span key={d} className="text-center text-xs font-semibold text-slate">
              {d}
            </span>
          ))}
          {cells.map((date, i) =>
            date ? (
              <div key={date} className="flex min-h-20 flex-col gap-1 rounded-xl border border-border bg-surface p-1.5">
                <span className="text-xs font-semibold text-midnight">{Number(date.slice(8))}</span>
                {(byDate.get(date) ?? []).map((slot) => (
                  <span key={slot.time} className={cn("rounded-md px-1.5 py-0.5 text-[11px] font-medium", tone[slot.status])} title={slot.status}>
                    {slot.time} · {slot.booked}/{slot.capacity}
                  </span>
                ))}
              </div>
            ) : (
              <div key={`empty-${i}`} />
            ),
          )}
        </div>
      </div>
      <div className="flex flex-wrap gap-4 text-xs text-slate">
        <Legend className={tone.available} label="Open (booked / spots)" />
        <Legend className={tone.full} label="Full" />
        <Legend className={tone.blocked} label="Blocked" />
        <Legend className={tone.closed} label="Past cut-off" />
      </div>
    </div>
  );
}

function Legend({ className, label }: { className: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={cn("h-3 w-5 rounded", className)} /> {label}
    </span>
  );
}
