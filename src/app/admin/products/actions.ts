"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/auth/admin";
import { prisma } from "@/lib/db";
import { addDays } from "@/lib/products/slots";
import { blockFormSchema, optionFormSchema, ruleFormSchema } from "@/lib/products/validation";
import { packageSlugSchema } from "@/lib/validation/schemas";

export type ProductFormState = { ok: boolean; message?: string; errors?: Record<string, string> };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const dbDate = (value: string) => new Date(`${value}T00:00:00.000Z`);
const str = (formData: FormData, name: string) => {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
};

function firstErrors(issues: { path: PropertyKey[]; message: string }[]) {
  const errors: Record<string, string> = {};
  for (const issue of issues) {
    const key = String(issue.path[0] ?? "form");
    errors[key] ??= issue.message;
  }
  return errors;
}

/** Package page shows "From" prices and the booking widget, so refresh it after changes */
function refreshPackage(slug: string) {
  revalidatePath(`/tour-packages/${slug}`);
  revalidatePath(`/admin/products/${slug}`);
}

export async function saveOptionAction(_prev: ProductFormState, formData: FormData): Promise<ProductFormState> {
  if (!(await getAdminSession())) return { ok: false, message: "You are not authorised to manage products." };

  const slug = packageSlugSchema.safeParse(str(formData, "packageSlug"));
  const id = str(formData, "id");
  if (!slug.success || (id && !UUID.test(id))) return { ok: false, message: "Invalid product." };

  const parsed = optionFormSchema.safeParse({
    title: str(formData, "title"),
    description: str(formData, "description"),
    durationLabel: str(formData, "durationLabel") || undefined,
    languages: str(formData, "languages"),
    isPrivate: formData.get("isPrivate") === "on",
    active: formData.get("active") === "on",
    sortOrder: str(formData, "sortOrder") || 0,
    pricingMode: str(formData, "pricingMode"),
    prices: str(formData, "prices"),
    groupTiers: str(formData, "groupTiers"),
    seasons: str(formData, "seasons"),
    minParticipants: str(formData, "minParticipants"),
    maxParticipants: str(formData, "maxParticipants"),
    cutoffHours: str(formData, "cutoffHours"),
    slotCutoffs: str(formData, "slotCutoffs"),
    lastMinuteAfterFirst: formData.get("lastMinuteAfterFirst") === "on",
    instantConfirm: formData.get("instantConfirm") === "on",
    pickupMode: str(formData, "pickupMode") || "none",
    pickupArea: str(formData, "pickupArea") || undefined,
    pickupLocations: str(formData, "pickupLocations"),
    pickupTiming: str(formData, "pickupTiming"),
    pickupMinutesBefore: str(formData, "pickupMinutesBefore"),
    pickupConfirmation: str(formData, "pickupConfirmation"),
    wheelchairAccessible: formData.get("wheelchairAccessible") === "on",
    skipTheLine: formData.get("skipTheLine") === "on",
    guideMaterials: formData.getAll("guideMaterials"),
  });
  if (!parsed.success) {
    return { ok: false, message: "Please fix the highlighted fields.", errors: firstErrors(parsed.error.issues) };
  }

  const v = parsed.data;
  const hasPickup = v.pickupMode !== "none";
  const data = {
    ...v,
    maxParticipants: v.maxParticipants ?? null,
    durationLabel: v.durationLabel ?? null,
    pickupIncluded: hasPickup,
    pickupArea: hasPickup ? (v.pickupArea ?? null) : null,
    pickupLocations: v.pickupMode === "locations" ? v.pickupLocations : [],
    pickupTiming: hasPickup ? (v.pickupTiming ?? null) : null,
    pickupMinutesBefore: hasPickup && v.pickupTiming === "before_start" ? (v.pickupMinutesBefore ?? null) : null,
    pickupConfirmation: hasPickup ? (v.pickupConfirmation ?? null) : null,
  };
  let optionId = id;
  if (id) {
    const { count } = await prisma.tourOption.updateMany({ where: { id, packageSlug: slug.data }, data });
    if (count === 0) return { ok: false, message: "This option no longer exists." };
  } else {
    optionId = (await prisma.tourOption.create({ data: { ...data, packageSlug: slug.data } })).id;
  }

  refreshPackage(slug.data);
  redirect(`/admin/products/${slug.data}/options/${optionId}?saved=1`);
}

export async function deleteOptionAction(formData: FormData) {
  if (!(await getAdminSession())) return;
  const slug = packageSlugSchema.safeParse(str(formData, "packageSlug"));
  const id = str(formData, "id");
  if (!slug.success || !UUID.test(id)) return;

  // Bookings keep their snapshot (title, time, guests); only the link to the option is cleared
  await prisma.tourOption.deleteMany({ where: { id, packageSlug: slug.data } });
  refreshPackage(slug.data);
  redirect(`/admin/products/${slug.data}`);
}

async function ownedOption(formData: FormData) {
  const optionId = str(formData, "optionId");
  if (!UUID.test(optionId)) return null;
  return prisma.tourOption.findUnique({ where: { id: optionId }, select: { id: true, packageSlug: true } });
}

export async function addRuleAction(_prev: ProductFormState, formData: FormData): Promise<ProductFormState> {
  if (!(await getAdminSession())) return { ok: false, message: "You are not authorised to manage products." };
  const option = await ownedOption(formData);
  if (!option) return { ok: false, message: "This option no longer exists." };

  const parsed = ruleFormSchema.safeParse({
    startDate: str(formData, "startDate"),
    endDate: str(formData, "endDate"),
    weekdays: formData.getAll("weekdays"),
    startTimes: str(formData, "startTimes"),
    capacity: str(formData, "capacity"),
  });
  if (!parsed.success) return { ok: false, message: "Please fix the highlighted fields.", errors: firstErrors(parsed.error.issues) };

  const { startDate, endDate, weekdays, startTimes, capacity } = parsed.data;
  await prisma.availabilityRule.create({
    data: { optionId: option.id, startDate: dbDate(startDate), endDate: endDate ? dbDate(endDate) : null, weekdays, startTimes, capacity },
  });
  refreshPackage(option.packageSlug);
  return { ok: true, message: "Schedule added." };
}

export async function deleteRuleAction(formData: FormData) {
  if (!(await getAdminSession())) return;
  const option = await ownedOption(formData);
  const id = str(formData, "id");
  if (!option || !UUID.test(id)) return;
  await prisma.availabilityRule.deleteMany({ where: { id, optionId: option.id } });
  refreshPackage(option.packageSlug);
}

export async function addBlockAction(_prev: ProductFormState, formData: FormData): Promise<ProductFormState> {
  if (!(await getAdminSession())) return { ok: false, message: "You are not authorised to manage products." };
  const option = await ownedOption(formData);
  if (!option) return { ok: false, message: "This option no longer exists." };

  const parsed = blockFormSchema.safeParse({
    date: str(formData, "date"),
    endDate: str(formData, "endDate"),
    startTime: str(formData, "startTime"),
    reason: str(formData, "reason") || undefined,
  });
  if (!parsed.success) return { ok: false, message: "Please fix the highlighted fields.", errors: firstErrors(parsed.error.issues) };

  const { date, endDate, startTime, reason } = parsed.data;
  const dates: string[] = [];
  for (let d = date; d <= (endDate ?? date); d = addDays(d, 1)) dates.push(d);
  await prisma.availabilityBlock.createMany({
    data: dates.map((d) => ({ optionId: option.id, date: dbDate(d), startTime: startTime ?? null, reason: reason ?? null })),
  });
  refreshPackage(option.packageSlug);
  return { ok: true, message: dates.length === 1 ? "Date blocked." : `${dates.length} dates blocked.` };
}

export async function deleteBlockAction(formData: FormData) {
  if (!(await getAdminSession())) return;
  const option = await ownedOption(formData);
  const id = str(formData, "id");
  if (!option || !UUID.test(id)) return;
  await prisma.availabilityBlock.deleteMany({ where: { id, optionId: option.id } });
  refreshPackage(option.packageSlug);
}
