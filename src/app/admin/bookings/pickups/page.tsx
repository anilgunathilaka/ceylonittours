import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Bus, MapPin, Phone, Users } from "lucide-react";
import { setPickupTimeAction } from "@/app/admin/bookings/operations-actions";
import { AdminShell } from "@/components/admin/AdminShell";
import { OperationForm } from "@/components/admin/OperationForm";
import { Badge } from "@/components/ui/Badge";
import { getAdminSession } from "@/lib/auth/admin";
import { describeGuests, getAllBookings } from "@/lib/bookings";
import { formatDisplayDate } from "@/lib/date";
import { addDays, sriLankaToday } from "@/lib/products/slots";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Pickup planner", robots: { index: false, follow: false } };

const RANGES = [
  { value: "today", label: "Today", days: 0 },
  { value: "tomorrow", label: "Tomorrow", days: 1 },
  { value: "week", label: "Next 7 days", days: 7 },
] as const;

/** Bookings with a pickup, per travel day, with the pickup time the team still has to set. */
export default async function PickupPlannerPage({ searchParams }: { searchParams: Promise<{ range?: string; needs?: string }> }) {
  if (!(await getAdminSession())) notFound();
  const { range: rangeParam, needs } = await searchParams;
  const range = RANGES.find((r) => r.value === rangeParam) ?? RANGES[2];
  const today = sriLankaToday();
  const from = range.value === "tomorrow" ? addDays(today, 1) : today;
  const to = range.value === "week" ? addDays(today, 7) : from;
  const onlyMissing = needs === "1";

  const bookings = (await getAllBookings())
    .filter((b) => b.pickupLocation && b.status !== "cancelled" && b.travelDate && b.travelDate >= from && b.travelDate <= to)
    .filter((b) => !onlyMissing || !b.pickupTime)
    .sort((a, b) => `${a.travelDate}${a.pickupTime ?? a.startTime ?? ""}`.localeCompare(`${b.travelDate}${b.pickupTime ?? b.startTime ?? ""}`));

  const byDate = new Map<string, typeof bookings>();
  for (const b of bookings) byDate.set(b.travelDate!, [...(byDate.get(b.travelDate!) ?? []), b]);
  const missing = bookings.filter((b) => !b.pickupTime).length;
  const link = (overrides: { range?: string; needs?: string }) => {
    const params = new URLSearchParams({ range: overrides.range ?? range.value });
    if ((overrides.needs ?? (onlyMissing ? "1" : "")) === "1") params.set("needs", "1");
    return `/admin/bookings/pickups?${params}`;
  };

  return (
    <AdminShell
      title="Pickup planner"
      description="Every booking with a pickup, by travel day. Set each pickup time and, if you like, notify the customer by email and on their profile."
    >

      <div className="flex flex-wrap items-center gap-2">
        {RANGES.map((r) => (
          <Link
            key={r.value}
            href={link({ range: r.value })}
            className={cn(
              "inline-flex h-10 items-center rounded-full px-4 text-sm font-semibold ring-1",
              r.value === range.value ? "bg-primary text-white ring-primary" : "bg-surface text-midnight ring-border hover:ring-primary/40",
            )}
          >
            {r.label}
          </Link>
        ))}
        <Link
          href={link({ needs: onlyMissing ? "0" : "1" })}
          className={cn(
            "ml-auto inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-semibold ring-1",
            onlyMissing ? "bg-accent text-white ring-accent" : "bg-surface text-midnight ring-border hover:ring-accent/40",
          )}
        >
          Needs pickup time <span className="rounded-full bg-black/10 px-2 text-xs">{missing}</span>
        </Link>
      </div>

      {byDate.size === 0 ? (
        <p className="rounded-3xl border border-dashed border-border bg-surface px-6 py-14 text-center text-sm text-slate">
          No pickups {onlyMissing ? "waiting for a time " : ""}in this period.
        </p>
      ) : (
        [...byDate.entries()].map(([date, list]) => (
          <section key={date} className="flex flex-col gap-3">
            <h2 className="font-display text-xl font-semibold text-midnight">
              {formatDisplayDate(date)} <span className="text-base font-normal text-slate">· {list.length} pickup{list.length === 1 ? "" : "s"}</span>
            </h2>
            <ul className="flex flex-col gap-3">
              {list.map((b) => (
                <li key={b.id} className="grid grid-cols-1 gap-4 rounded-2xl bg-surface p-5 shadow-card ring-1 ring-border lg:grid-cols-[1.3fr_1fr]">
                  <div className="flex flex-col gap-1.5 text-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-midnight">{b.customerName}</p>
                      <Badge tone={b.status === "confirmed" ? "nature" : "gold"}>{b.status}</Badge>
                      {!b.pickupTime && <Badge tone="accent">Needs pickup time</Badge>}
                    </div>
                    <p className="text-slate">
                      {b.packageTitle}
                      {b.optionTitle && ` · ${b.optionTitle}`} · starts {b.startTime ?? "—"}
                    </p>
                    <p className="flex items-center gap-1.5 text-midnight">
                      <MapPin size={15} className="shrink-0 text-primary" /> {b.pickupLocation}
                    </p>
                    <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-slate">
                      <span className="flex items-center gap-1.5">
                        <Users size={15} /> {describeGuests(b)}
                      </span>
                      {b.customerPhone && (
                        <a href={`tel:${b.customerPhone}`} className="flex items-center gap-1.5 text-primary hover:underline">
                          <Phone size={15} /> {b.customerPhone}
                        </a>
                      )}
                    </p>
                  </div>
                  <OperationForm action={setPickupTimeAction} submitLabel="Save pickup time" resetOnSuccess={false}>
                    <input type="hidden" name="bookingId" value={b.id} />
                    <label className="flex items-center gap-3 text-sm font-medium text-midnight">
                      <Bus size={16} className="text-slate" /> Pickup time
                      <input
                        type="time"
                        name="pickupTime"
                        defaultValue={b.pickupTime ?? ""}
                        className="h-10 rounded-xl border border-border bg-surface px-3 text-sm focus:border-secondary focus:outline-none"
                      />
                    </label>
                    <label className="flex items-center gap-2 text-sm text-midnight">
                      <input type="checkbox" name="notify" defaultChecked className="h-4 w-4 accent-primary" /> Tell the customer
                    </label>
                  </OperationForm>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </AdminShell>
  );
}
