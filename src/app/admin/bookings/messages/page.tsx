import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { sendBulkMessageAction } from "@/app/admin/bookings/operations-actions";
import { AdminShell } from "@/components/admin/AdminShell";
import { OperationForm } from "@/components/admin/OperationForm";
import { getAdminSession } from "@/lib/auth/admin";
import { findBookingsOnDate } from "@/lib/booking-messages";
import { formatDisplayDate } from "@/lib/date";
import { sriLankaToday } from "@/lib/products/slots";

export const metadata: Metadata = { title: "Message customers", robots: { index: false, follow: false } };

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const field = "h-11 rounded-xl border border-border bg-surface px-3 text-sm text-midnight focus:border-secondary focus:outline-none";

/** Message every customer travelling on a date (optionally one tour / start time) — e.g. weather or meeting point changes. */
export default async function MessageCustomersPage({ searchParams }: { searchParams: Promise<{ date?: string; package?: string; time?: string }> }) {
  if (!(await getAdminSession())) notFound();
  const params = await searchParams;
  const date = params.date && DATE.test(params.date) ? params.date : sriLankaToday();
  const time = params.time && TIME.test(params.time) ? params.time : undefined;
  const all = await findBookingsOnDate(date);
  const tours = [...new Map(all.map((b) => [b.packageSlug, b.packageTitle])).entries()];
  const pkg = tours.some(([slug]) => slug === params.package) ? params.package : undefined;
  const recipients = all.filter((b) => (!pkg || b.packageSlug === pkg) && (!time || b.startTime === time));
  const times = [...new Set(all.filter((b) => !pkg || b.packageSlug === pkg).map((b) => b.startTime).filter(Boolean))] as string[];

  return (
    <AdminShell
      title="Message customers"
      description="Send one message to every customer travelling on a date — for example a weather update or a changed meeting point. It appears on their profile and is emailed when email is configured."
    >

      <form method="get" className="flex flex-wrap items-end gap-3 rounded-3xl bg-surface p-5 shadow-card ring-1 ring-border">
        <label className="flex flex-col gap-1 text-xs font-semibold tracking-wide text-slate uppercase">
          Travel date
          <input type="date" name="date" defaultValue={date} className={field} />
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold tracking-wide text-slate uppercase">
          Tour
          <select name="package" defaultValue={pkg ?? ""} className={field}>
            <option value="">All tours</option>
            {tours.map(([slug, title]) => (
              <option key={slug} value={slug}>
                {title}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold tracking-wide text-slate uppercase">
          Start time
          <select name="time" defaultValue={time ?? ""} className={field}>
            <option value="">All times</option>
            {times.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="h-11 rounded-full px-5 text-sm font-semibold text-midnight ring-1 ring-border hover:bg-midnight/5">
          Show recipients
        </button>
      </form>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1.2fr]">
        <section className="rounded-3xl bg-surface p-6 shadow-card ring-1 ring-border">
          <h2 className="font-display text-lg font-semibold text-midnight">
            {recipients.length} recipient{recipients.length === 1 ? "" : "s"} · {formatDisplayDate(date)}
          </h2>
          {recipients.length === 0 ? (
            <p className="mt-3 text-sm text-slate">No pending or confirmed bookings match.</p>
          ) : (
            <ul className="mt-3 flex flex-col divide-y divide-border text-sm">
              {recipients.map((b) => (
                <li key={b.id} className="flex justify-between gap-3 py-2">
                  <span className="font-medium text-midnight">{b.customerName}</span>
                  <span className="text-right text-slate">
                    {b.packageTitle} · {b.startTime ?? "—"} · {b.totalParticipants} pax
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {recipients.length > 0 && (
          <section className="rounded-3xl bg-surface p-6 shadow-card ring-1 ring-border">
            <h2 className="mb-3 font-display text-lg font-semibold text-midnight">Your message</h2>
            <OperationForm action={sendBulkMessageAction} submitLabel={`Send to ${recipients.length} customer${recipients.length === 1 ? "" : "s"}`}>
              <input type="hidden" name="date" value={date} />
              {pkg && <input type="hidden" name="packageSlug" value={pkg} />}
              {time && <input type="hidden" name="startTime" value={time} />}
              <textarea
                name="body"
                rows={6}
                maxLength={2000}
                required
                placeholder="e.g. Heavy rain is expected tomorrow — please bring a rain jacket. Pickup times are unchanged."
                className="w-full resize-y rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm text-midnight focus:border-secondary focus:outline-none"
              />
            </OperationForm>
          </section>
        )}
      </div>
    </AdminShell>
  );
}
