import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { bulkAvailabilityAction } from "@/app/admin/products/bulk-actions";
import { AdminShell } from "@/components/admin/AdminShell";
import { OperationForm } from "@/components/admin/OperationForm";
import { getAdminSession } from "@/lib/auth/admin";
import { prisma } from "@/lib/db";
import { listAdminPackages } from "@/lib/products/admin-packages";
import { addDays, sriLankaToday } from "@/lib/products/slots";

export const metadata: Metadata = { title: "Bulk availability", robots: { index: false, follow: false } };

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const field = "h-11 rounded-xl border border-border bg-surface px-3 text-sm text-midnight focus:border-secondary focus:outline-none";
const label = "flex flex-col gap-1 text-xs font-semibold tracking-wide text-slate uppercase";

export default async function BulkAvailabilityPage() {
  if (!(await getAdminSession())) notFound();
  const [packages, options] = await Promise.all([
    listAdminPackages(),
    prisma.tourOption.findMany({ select: { id: true, packageSlug: true, title: true, active: true }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] }),
  ]);
  const titles = new Map(packages.map((p) => [p.slug, p.title]));
  const groups = [...new Set(options.map((o) => o.packageSlug))].map((slug) => ({
    slug,
    title: titles.get(slug) ?? slug,
    options: options.filter((o) => o.packageSlug === slug),
  }));
  const today = sriLankaToday();

  return (
    <AdminShell
      title="Bulk availability"
      description="Close or reopen many dates for several options at once — for example a holiday, a vehicle service or your own leave. Existing bookings are kept; contact those customers separately."
    >

      {groups.length === 0 ? (
        <p className="rounded-3xl border border-dashed border-border bg-surface px-6 py-14 text-center text-sm text-slate">Add options to your tours first.</p>
      ) : (
        <div className="rounded-3xl bg-surface p-6 shadow-card ring-1 ring-border">
          <OperationForm action={bulkAvailabilityAction} submitLabel="Apply" resetOnSuccess={false}>
            <fieldset className="flex flex-col gap-3">
              <legend className="mb-2 text-xs font-semibold tracking-wide text-slate uppercase">Options</legend>
              {groups.map((group) => (
                <div key={group.slug} className="rounded-2xl border border-border p-4">
                  <p className="mb-2 font-semibold text-midnight">{group.title}</p>
                  <div className="flex flex-wrap gap-2">
                    {group.options.map((option) => (
                      <label
                        key={option.id}
                        className="flex cursor-pointer items-center gap-2 rounded-full border border-border px-3.5 py-1.5 text-sm text-midnight has-[:checked]:border-primary has-[:checked]:bg-primary/5"
                      >
                        <input type="checkbox" name="optionIds" value={option.id} className="accent-primary" />
                        {option.title}
                        {!option.active && <span className="text-xs text-slate">(hidden)</span>}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </fieldset>

            <div className="flex flex-wrap gap-4">
              <label className={label}>
                From
                <input type="date" name="from" defaultValue={today} className={field} />
              </label>
              <label className={label}>
                To
                <input type="date" name="to" defaultValue={addDays(today, 6)} className={field} />
              </label>
              <label className={label}>
                Start time (optional)
                <input type="time" name="startTime" className={field} />
              </label>
              <label className={label}>
                Reason (internal)
                <input name="reason" maxLength={200} placeholder="e.g. Vesak holiday" className={field} />
              </label>
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold tracking-wide text-slate uppercase">On these weekdays</span>
              <div className="flex flex-wrap gap-2">
                {WEEKDAYS.map((day, index) => (
                  <label
                    key={day}
                    className="flex cursor-pointer items-center gap-2 rounded-full border border-border px-3.5 py-1.5 text-sm text-midnight has-[:checked]:border-primary has-[:checked]:bg-primary/5"
                  >
                    <input type="checkbox" name="weekdays" value={index} defaultChecked className="accent-primary" />
                    {day}
                  </label>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <label className="flex items-center gap-2 rounded-xl border border-border px-4 py-3 text-sm font-medium text-midnight has-[:checked]:border-accent has-[:checked]:bg-accent/5">
                <input type="radio" name="mode" value="block" defaultChecked className="accent-accent" /> Close these dates (no new bookings)
              </label>
              <label className="flex items-center gap-2 rounded-xl border border-border px-4 py-3 text-sm font-medium text-midnight has-[:checked]:border-nature has-[:checked]:bg-nature/5">
                <input type="radio" name="mode" value="unblock" className="accent-nature" /> Reopen these dates
              </label>
            </div>
          </OperationForm>
        </div>
      )}
    </AdminShell>
  );
}
