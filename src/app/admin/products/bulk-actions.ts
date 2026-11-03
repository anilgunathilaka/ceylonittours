"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { OperationState } from "@/app/admin/bookings/operations-actions";
import { getAdminSession } from "@/lib/auth/admin";
import { prisma } from "@/lib/db";
import { addDays, DATE_PATTERN, TIME_PATTERN } from "@/lib/products/slots";

const schema = z
  .object({
    optionIds: z.array(z.string().uuid()).min(1, "Choose at least one option"),
    from: z.string().regex(DATE_PATTERN, "Choose a start date"),
    to: z.string().regex(DATE_PATTERN, "Choose an end date"),
    weekdays: z.array(z.coerce.number().int().min(0).max(6)).min(1, "Pick at least one weekday"),
    startTime: z.preprocess((v) => (v === "" ? undefined : v), z.string().regex(TIME_PATTERN).optional()),
    mode: z.enum(["block", "unblock"]),
    reason: z.string().trim().max(200).optional(),
  })
  .refine((v) => v.to >= v.from, { message: "End date must be on or after the start date" })
  .refine((v) => (Date.parse(v.to) - Date.parse(v.from)) / 86400_000 <= 366, { message: "Choose a range of one year or less" });

const dbDate = (value: string) => new Date(`${value}T00:00:00.000Z`);

/** Close (or reopen) many dates for many options at once. Existing bookings are not touched. */
export async function bulkAvailabilityAction(_prev: OperationState, formData: FormData): Promise<OperationState> {
  if (!(await getAdminSession())) return { ok: false, message: "You are not authorised to manage availability." };

  const parsed = schema.safeParse({
    optionIds: formData.getAll("optionIds"),
    from: formData.get("from"),
    to: formData.get("to"),
    weekdays: formData.getAll("weekdays"),
    startTime: formData.get("startTime") ?? "",
    mode: formData.get("mode"),
    reason: formData.get("reason") || undefined,
  });
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };
  const { optionIds, from, to, weekdays, startTime, mode, reason } = parsed.data;

  const dates: string[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) if (weekdays.includes(new Date(`${d}T00:00:00Z`).getUTCDay())) dates.push(d);
  if (dates.length === 0) return { ok: false, message: "None of the chosen weekdays fall in that range." };

  const options = await prisma.tourOption.findMany({ where: { id: { in: optionIds } }, select: { id: true, packageSlug: true } });
  const ids = options.map((o) => o.id);

  let count: number;
  if (mode === "block") {
    // Replace any existing blocks for the same day/time so blocks don't pile up
    await prisma.availabilityBlock.deleteMany({ where: { optionId: { in: ids }, date: { in: dates.map(dbDate) }, startTime: startTime ?? null } });
    count = (
      await prisma.availabilityBlock.createMany({
        data: ids.flatMap((optionId) => dates.map((d) => ({ optionId, date: dbDate(d), startTime: startTime ?? null, reason: reason ?? null }))),
      })
    ).count;
  } else {
    count = (
      await prisma.availabilityBlock.deleteMany({
        where: { optionId: { in: ids }, date: { in: dates.map(dbDate) }, ...(startTime ? { startTime } : {}) },
      })
    ).count;
  }

  for (const slug of new Set(options.map((o) => o.packageSlug))) revalidatePath(`/tour-packages/${slug}`);
  revalidatePath("/admin/products", "layout");
  const what = `${dates.length} date${dates.length === 1 ? "" : "s"} for ${ids.length} option${ids.length === 1 ? "" : "s"}`;
  return {
    ok: true,
    message: mode === "block" ? `Blocked ${what}${startTime ? ` at ${startTime}` : ""}.` : `Reopened ${what} (${count} block${count === 1 ? "" : "s"} removed).`,
  };
}
