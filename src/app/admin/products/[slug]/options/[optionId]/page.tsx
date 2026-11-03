import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CalendarX, Repeat, Trash2 } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminNotice } from "@/components/admin/AdminNotice";
import { CapacityCalendar, shiftMonth } from "@/components/admin/products/CapacityCalendar";
import { OptionForm, Panel } from "@/components/admin/products/OptionForm";
import { AddBlockForm, AddRuleForm } from "@/components/admin/products/ScheduleForms";
import { deleteBlockAction, deleteOptionAction, deleteRuleAction } from "@/app/admin/products/actions";
import { getAdminSession } from "@/lib/auth/admin";
import { getAdminPackage } from "@/lib/products/admin-packages";
import { formatDisplayDate } from "@/lib/date";
import { getAvailability, getOption, getOptionSchedule } from "@/lib/products/options";
import { addDays, sriLankaToday } from "@/lib/products/slots";

export const metadata: Metadata = { title: "Edit option", robots: { index: false, follow: false } };

const WEEKDAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function describeWeekdays(days: number[]) {
  const sorted = [...days].sort((a, b) => a - b);
  if (sorted.length === 7) return "Every day";
  if (sorted.join() === "1,2,3,4,5") return "Mon–Fri";
  if (sorted.join() === "0,6") return "Weekends";
  return sorted.map((d) => WEEKDAY_NAMES[d]).join(", ");
}

export default async function EditOptionPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; optionId: string }>;
  searchParams: Promise<{ month?: string; saved?: string }>;
}) {
  if (!(await getAdminSession())) notFound();
  const { slug, optionId } = await params;
  const { month: monthParam, saved } = await searchParams;
  const [pkg, option] = await Promise.all([getAdminPackage(slug), UUID.test(optionId) ? getOption(optionId) : null]);
  if (!pkg || !option || option.packageSlug !== slug) notFound();

  const today = sriLankaToday();
  const month = monthParam && /^\d{4}-(0[1-9]|1[0-2])$/.test(monthParam) ? monthParam : today.slice(0, 7);
  const [schedule, availability] = await Promise.all([
    getOptionSchedule(option.id),
    getAvailability([option], `${month}-01`, addDays(`${shiftMonth(month, 1)}-01`, -1)),
  ]);
  const startTimes = [...new Set(schedule.rules.flatMap((r) => r.startTimes))].sort();

  return (
    <AdminShell title={option.title} back={{ href: `/admin/products/${slug}`, label: pkg.title }}>
      {saved && <AdminNotice message="Option saved." />}

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-2">
        <OptionForm
          packageSlug={slug}
          initial={{
            ...option,
            durationLabel: option.durationLabel ?? "",
            languages: option.languages.join(", "),
            maxParticipants: option.maxParticipants ? String(option.maxParticipants) : "",
          }}
        />

        <div className="flex flex-col gap-6">
          <Panel title="Availability" subtitle="Start times and spots. Pending and confirmed bookings use up spots; cancelling frees them.">
            {schedule.rules.length === 0 ? (
              <p className="rounded-xl bg-gold/10 px-4 py-3 text-sm text-midnight">
                No schedule yet — customers can&apos;t book this option until you add one.
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {schedule.rules.map((rule) => (
                  <li key={rule.id} className="flex items-center gap-3 rounded-xl border border-border px-4 py-3 text-sm">
                    <Repeat size={16} className="shrink-0 text-primary" />
                    <span className="flex-1 text-midnight">
                      <strong>{describeWeekdays(rule.weekdays)}</strong> at {rule.startTimes.join(", ")} · {rule.capacity} spots
                      <span className="block text-xs text-slate">
                        {formatDisplayDate(rule.startDate)} – {rule.endDate ? formatDisplayDate(rule.endDate) : "no end date"}
                      </span>
                    </span>
                    <form action={deleteRuleAction}>
                      <input type="hidden" name="optionId" value={option.id} />
                      <input type="hidden" name="id" value={rule.id} />
                      <button type="submit" aria-label="Remove schedule" className="rounded-full p-2 text-slate hover:bg-accent/10 hover:text-accent-dark">
                        <Trash2 size={15} />
                      </button>
                    </form>
                  </li>
                ))}
              </ul>
            )}
            <AddRuleForm optionId={option.id} today={today} />

            {schedule.blocks.length > 0 && (
              <ul className="flex flex-col gap-2">
                {schedule.blocks.map((block) => (
                  <li key={block.id} className="flex items-center gap-3 rounded-xl border border-border px-4 py-2.5 text-sm">
                    <CalendarX size={16} className="shrink-0 text-accent-dark" />
                    <span className="flex-1 text-midnight">
                      {formatDisplayDate(block.date)} · {block.startTime ?? "whole day"}
                      {block.reason && <span className="text-slate"> — {block.reason}</span>}
                    </span>
                    <form action={deleteBlockAction}>
                      <input type="hidden" name="optionId" value={option.id} />
                      <input type="hidden" name="id" value={block.id} />
                      <button type="submit" aria-label="Unblock" className="rounded-full p-2 text-slate hover:bg-accent/10 hover:text-accent-dark">
                        <Trash2 size={15} />
                      </button>
                    </form>
                  </li>
                ))}
              </ul>
            )}
            <AddBlockForm optionId={option.id} startTimes={startTimes} />
          </Panel>

          <Panel title="Capacity calendar">
            <CapacityCalendar month={month} days={availability.get(option.id) ?? []} base={`/admin/products/${slug}/options/${option.id}`} />
          </Panel>

          <form action={deleteOptionAction} className="flex items-center justify-between gap-3 rounded-2xl border border-accent/30 bg-accent/5 p-4">
            <input type="hidden" name="packageSlug" value={slug} />
            <input type="hidden" name="id" value={option.id} />
            <p className="text-sm text-midnight">Delete this option and its schedule. Existing bookings are kept.</p>
            <button type="submit" className="inline-flex h-10 shrink-0 items-center gap-2 rounded-full bg-accent px-4 text-sm font-semibold text-white hover:bg-accent-dark">
              <Trash2 size={15} /> Delete
            </button>
          </form>
        </div>
      </div>
    </AdminShell>
  );
}
