import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, Clock, XCircle, type LucideIcon } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { getAdminSession } from "@/lib/auth/admin";
import { getAllBookings } from "@/lib/bookings";
import { prisma } from "@/lib/db";
import { addDays, sriLankaToday } from "@/lib/products/slots";
import { computeStats, type MonthStat } from "@/lib/stats";
import { formatCurrency } from "@/lib/utils";

export const metadata: Metadata = { title: "Stats", robots: { index: false, follow: false } };

const monthLabel = (month: string) =>
  new Date(`${month}-01T00:00:00Z`).toLocaleDateString("en-GB", { month: "short", timeZone: "UTC" });
const monthLong = (month: string) =>
  new Date(`${month}-01T00:00:00Z`).toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });

export default async function AdminStatsPage() {
  if (!(await getAdminSession())) notFound();

  const today = sriLankaToday();
  const [bookings, rating] = await Promise.all([
    getAllBookings(),
    prisma.review.aggregate({ where: { status: "APPROVED" }, _avg: { rating: true }, _count: { _all: true } }),
  ]);
  const { kpis, monthly, topTours, statuses, sourceMarkets, bookingWindows } = computeStats(bookings, today);

  // Conversion over the last 30 days: tour page views (one per visitor session) vs new bookings
  const since = addDays(today, -29);
  const views = await prisma.packageView.groupBy({
    by: ["packageSlug"],
    where: { day: { gte: new Date(`${since}T00:00:00.000Z`) } },
    _sum: { count: true },
  });
  const recent = bookings.filter((b) => b.createdAt.slice(0, 10) >= since);
  const titleOf = new Map(bookings.map((b) => [b.packageSlug, b.packageTitle]));
  const conversion = views
    .map((v) => {
      const viewCount = v._sum.count ?? 0;
      const booked = recent.filter((b) => b.packageSlug === v.packageSlug).length;
      return { slug: v.packageSlug, title: titleOf.get(v.packageSlug) ?? v.packageSlug, views: viewCount, bookings: booked, rate: viewCount ? (booked / viewCount) * 100 : 0 };
    })
    .sort((a, b) => b.views - a.views)
    .slice(0, 10);
  const totalViews = conversion.reduce((sum, c) => sum + c.views, 0);
  const totalBooked = recent.length;
  const totalStatuses = statuses.pending + statuses.confirmed + statuses.cancelled;

  const tiles = [
    { label: "New bookings this month", value: String(kpis.bookingsThisMonth) },
    { label: "Awaiting confirmation", value: String(kpis.pending), href: "/admin/bookings?status=pending" },
    { label: "Upcoming guests", value: String(kpis.upcomingGuests), note: `${kpis.upcomingTrips} confirmed trips` },
    { label: "Upcoming revenue", value: formatCurrency(kpis.upcomingRevenue), note: "Collected on arrival" },
    { label: "Revenue, last 12 months", value: formatCurrency(kpis.revenue12m), note: "Confirmed trips" },
    {
      label: "Average rating",
      value: rating._avg.rating ? `${rating._avg.rating.toFixed(1)} / 5` : "—",
      note: `${rating._count._all} published reviews`,
      href: "/admin/reviews",
    },
  ];

  return (
    <AdminShell
      title="Stats"
      description="Bookings and revenue by travel date. Revenue is the quoted price of confirmed bookings — payment is collected on arrival."
    >
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        {tiles.map((tile) => {
          const body = (
            <>
              <p className="text-xs font-semibold tracking-wide text-slate uppercase">{tile.label}</p>
              <p className="mt-2 font-display text-3xl font-semibold text-midnight">{tile.value}</p>
              {tile.note && <p className="mt-1 text-xs text-slate">{tile.note}</p>}
            </>
          );
          const className = "rounded-3xl bg-surface p-5 shadow-card ring-1 ring-border";
          return tile.href ? (
            <Link key={tile.label} href={tile.href} className={`${className} transition-shadow hover:shadow-card-hover`}>
              {body}
            </Link>
          ) : (
            <div key={tile.label} className={className}>
              {body}
            </div>
          );
        })}
      </div>

      {/* Two measures, two charts: never one chart with two y-scales */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <BarChart title="Bookings per month" data={monthly} value={(m) => m.bookings} format={(n) => String(n)} detail={(m) => `${m.bookings} bookings · ${m.guests} guests`} />
        <BarChart title="Confirmed revenue per month" data={monthly} value={(m) => m.revenue} format={(n) => formatCurrency(n)} detail={(m) => formatCurrency(m.revenue)} />
      </div>

      <details className="rounded-3xl bg-surface p-5 shadow-card ring-1 ring-border">
        <summary className="cursor-pointer text-sm font-semibold text-midnight">Show monthly figures as a table</summary>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs text-slate uppercase">
              <tr>
                <th className="py-2 pr-4 font-semibold">Month</th>
                <th className="py-2 pr-4 text-right font-semibold">Bookings</th>
                <th className="py-2 pr-4 text-right font-semibold">Guests</th>
                <th className="py-2 text-right font-semibold">Confirmed revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {monthly.map((m) => (
                <tr key={m.month}>
                  <td className="py-2 pr-4 text-midnight">{monthLong(m.month)}</td>
                  <td className="py-2 pr-4 text-right tabular-nums text-midnight">{m.bookings}</td>
                  <td className="py-2 pr-4 text-right tabular-nums text-midnight">{m.guests}</td>
                  <td className="py-2 text-right tabular-nums text-midnight">{formatCurrency(m.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.5fr_1fr]">
        <section className="rounded-3xl bg-surface p-6 shadow-card ring-1 ring-border">
          <h2 className="font-display text-lg font-semibold text-midnight">Top tours</h2>
          {topTours.length === 0 ? (
            <p className="mt-4 text-sm text-slate">No bookings yet.</p>
          ) : (
            <table className="mt-4 w-full text-left text-sm">
              <thead className="text-xs text-slate uppercase">
                <tr>
                  <th className="py-2 pr-4 font-semibold">Tour</th>
                  <th className="py-2 pr-4 text-right font-semibold">Bookings</th>
                  <th className="py-2 pr-4 text-right font-semibold">Guests</th>
                  <th className="py-2 text-right font-semibold">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {topTours.map((tour) => (
                  <tr key={tour.slug}>
                    <td className="py-2.5 pr-4">
                      <Link href={`/admin/bookings?status=all&package=${tour.slug}`} className="font-medium text-midnight hover:text-primary hover:underline">
                        {tour.title}
                      </Link>
                    </td>
                    <td className="py-2.5 pr-4 text-right tabular-nums text-midnight">{tour.bookings}</td>
                    <td className="py-2.5 pr-4 text-right tabular-nums text-midnight">{tour.guests}</td>
                    <td className="py-2.5 text-right tabular-nums text-midnight">{formatCurrency(tour.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="rounded-3xl bg-surface p-6 shadow-card ring-1 ring-border">
          <h2 className="font-display text-lg font-semibold text-midnight">Booking status</h2>
          <p className="text-xs text-slate">All bookings, all dates</p>
          <ul className="mt-5 flex flex-col gap-4">
            <StatusRow icon={Clock} label="Pending" count={statuses.pending} total={totalStatuses} bar="bg-gold" iconClass="text-gold-dark" />
            <StatusRow icon={CheckCircle2} label="Confirmed" count={statuses.confirmed} total={totalStatuses} bar="bg-nature" iconClass="text-nature" />
            <StatusRow icon={XCircle} label="Cancelled" count={statuses.cancelled} total={totalStatuses} bar="bg-accent" iconClass="text-accent-dark" />
          </ul>
        </section>
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <BarList title="Source markets" note="By the customer's phone country code" rows={sourceMarkets.map((m) => ({ label: m.country, value: m.bookings }))} />
        <BarList title="Booking window" note="How far ahead customers book" rows={bookingWindows.map((w) => ({ label: w.label, value: w.bookings }))} />
      </div>

      <section className="rounded-3xl bg-surface p-6 shadow-card ring-1 ring-border">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-display text-lg font-semibold text-midnight">Conversion · last 30 days</h2>
          <p className="text-sm text-slate">
            {totalViews} tour page visits · {totalBooked} bookings
            {totalViews > 0 && ` · ${((totalBooked / totalViews) * 100).toFixed(1)}% overall`}
          </p>
        </div>
        {conversion.length === 0 ? (
          <p className="mt-4 text-sm text-slate">No visits recorded yet — visits are counted from now on, once per visitor session.</p>
        ) : (
          <table className="mt-4 w-full text-left text-sm">
            <thead className="text-xs text-slate uppercase">
              <tr>
                <th className="py-2 pr-4 font-semibold">Tour</th>
                <th className="py-2 pr-4 text-right font-semibold">Visits</th>
                <th className="py-2 pr-4 text-right font-semibold">Bookings</th>
                <th className="py-2 text-right font-semibold">Conversion</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {conversion.map((c) => (
                <tr key={c.slug}>
                  <td className="py-2.5 pr-4 font-medium text-midnight">{c.title}</td>
                  <td className="py-2.5 pr-4 text-right tabular-nums text-midnight">{c.views}</td>
                  <td className="py-2.5 pr-4 text-right tabular-nums text-midnight">{c.bookings}</td>
                  <td className="py-2.5 text-right tabular-nums text-midnight">{c.rate.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </AdminShell>
  );
}

/** Horizontal bars for a ranked list (one series, so no legend; values are labelled). */
function BarList({ title, note, rows }: { title: string; note: string; rows: { label: string; value: number }[] }) {
  const max = Math.max(...rows.map((r) => r.value), 0);
  return (
    <section className="rounded-3xl bg-surface p-6 shadow-card ring-1 ring-border">
      <h2 className="font-display text-lg font-semibold text-midnight">{title}</h2>
      <p className="text-xs text-slate">{note}</p>
      {max === 0 ? (
        <p className="mt-4 text-sm text-slate">No bookings yet.</p>
      ) : (
        <ul className="mt-4 flex flex-col gap-2.5">
          {rows.map((row) => (
            <li key={row.label} className="grid grid-cols-[8.5rem_1fr_2.5rem] items-center gap-3 text-sm" title={`${row.label}: ${row.value}`}>
              <span className="truncate text-midnight">{row.label}</span>
              <span className="h-2.5 overflow-hidden rounded-r-[4px] bg-midnight/5">
                <span className="block h-full rounded-r-[4px] bg-primary" style={{ width: `${(row.value / max) * 100}%` }} />
              </span>
              <span className="text-right tabular-nums text-midnight">{row.value}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** Single-series column chart with a per-bar hover tooltip. One series, so no legend: the title names it. */
function BarChart({
  title,
  data,
  value,
  format,
  detail,
}: {
  title: string;
  data: MonthStat[];
  value: (m: MonthStat) => number;
  format: (n: number) => string;
  detail: (m: MonthStat) => string;
}) {
  const max = Math.max(...data.map(value), 0);
  const peak = data.reduce((best, m) => (value(m) > value(best) ? m : best), data[0]);

  return (
    <section className="rounded-3xl bg-surface p-6 shadow-card ring-1 ring-border">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-display text-lg font-semibold text-midnight">{title}</h2>
        <p className="text-xs text-slate">Peak: {max > 0 ? `${format(value(peak))} in ${monthLabel(peak.month)}` : "—"}</p>
      </div>
      <div className="relative mt-6 h-48">
        {/* Recessive baseline and mid gridline */}
        <div className="absolute inset-x-0 bottom-0 border-t border-border" aria-hidden />
        <div className="absolute inset-x-0 top-1/2 border-t border-dashed border-border/70" aria-hidden />
        <span className="absolute top-1/2 right-0 -translate-y-full pb-0.5 text-[10px] text-slate">{max > 0 ? format(max / 2) : ""}</span>
        <ul className="absolute inset-0 flex items-end gap-[2px]">
          {data.map((m) => {
            const v = value(m);
            const height = max > 0 ? (v / max) * 100 : 0;
            return (
              <li key={m.month} className="group relative flex h-full flex-1 items-end justify-center">
                {/* Hit target is the whole column, wider than the bar */}
                <span
                  className="block w-3/5 max-w-7 rounded-t-[4px] bg-primary transition-opacity group-hover:opacity-80"
                  style={{ height: v > 0 ? `max(${height}%, 3px)` : 0 }}
                />
                <span
                  role="tooltip"
                  className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 rounded-lg bg-midnight px-2.5 py-1.5 text-xs whitespace-nowrap text-white shadow-card group-hover:block"
                >
                  <span className="font-semibold">{monthLong(m.month)}</span>
                  <br />
                  {detail(m)}
                </span>
                <span className="sr-only">
                  {monthLong(m.month)}: {detail(m)}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
      <div className="mt-2 flex gap-[2px]" aria-hidden>
        {data.map((m) => (
          <span key={m.month} className="flex-1 text-center text-[11px] text-slate">
            {monthLabel(m.month)}
          </span>
        ))}
      </div>
    </section>
  );
}

function StatusRow({
  icon: Icon,
  label,
  count,
  total,
  bar,
  iconClass,
}: {
  icon: LucideIcon;
  label: string;
  count: number;
  total: number;
  bar: string;
  iconClass: string;
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <li className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-2 font-medium text-midnight">
          <Icon size={16} className={iconClass} /> {label}
        </span>
        <span className="tabular-nums text-midnight">
          {count} <span className="text-slate">({pct}%)</span>
        </span>
      </div>
      <span className="h-2 overflow-hidden rounded-full bg-midnight/5">
        <span className={`block h-full rounded-full ${bar}`} style={{ width: `${pct}%` }} />
      </span>
    </li>
  );
}
