"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { OperationState } from "@/app/admin/bookings/operations-actions";
import { getAdminSession } from "@/lib/auth/admin";
import { prisma } from "@/lib/db";
import { DATE_PATTERN } from "@/lib/products/slots";
import { packageSlugSchema } from "@/lib/validation/schemas";

const optionalDate = z.preprocess((v) => (v === "" || v === null ? undefined : v), z.string().regex(DATE_PATTERN).optional());

const schema = z
  .object({
    name: z.string().trim().min(2, "Give the offer a name, e.g. “Book early, save 10%”").max(80),
    type: z.enum(["early_bird", "last_minute", "dates"]),
    discountPercent: z.coerce.number().min(1, "Discount must be at least 1%").max(90, "Discount can be at most 90%"),
    days: z.preprocess((v) => (v === "" || v === null ? undefined : v), z.coerce.number().int().min(0).max(730).optional()),
    travelFrom: optionalDate,
    travelTo: optionalDate,
    packageSlugs: z.array(packageSlugSchema).max(200),
  })
  .refine((v) => v.type === "dates" || v.days !== undefined, { message: "Enter the number of days", path: ["days"] })
  .refine((v) => v.type !== "dates" || (v.travelFrom && v.travelTo), { message: "Choose the travel dates", path: ["travelFrom"] })
  .refine((v) => !v.travelFrom || !v.travelTo || v.travelTo >= v.travelFrom, { message: "The end date must be after the start date" });

const dbDate = (value?: string) => (value ? new Date(`${value}T00:00:00.000Z`) : null);

/** Offers change prices everywhere a tour is shown */
function refresh() {
  revalidatePath("/admin/products/offers");
  revalidatePath("/tour-packages", "layout");
}

export async function createOfferAction(_prev: OperationState, formData: FormData): Promise<OperationState> {
  if (!(await getAdminSession())) return { ok: false, message: "You are not authorised to manage offers." };
  const parsed = schema.safeParse({
    name: formData.get("name"),
    type: formData.get("type"),
    discountPercent: formData.get("discountPercent"),
    days: formData.get("days"),
    travelFrom: formData.get("travelFrom"),
    travelTo: formData.get("travelTo"),
    packageSlugs: formData.getAll("packageSlugs"),
  });
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };
  const v = parsed.data;
  await prisma.specialOffer.create({
    data: {
      name: v.name,
      type: v.type,
      discountPercent: v.discountPercent,
      days: v.type === "dates" ? null : (v.days ?? null),
      travelFrom: dbDate(v.travelFrom),
      travelTo: dbDate(v.travelTo),
      packageSlugs: v.packageSlugs,
    },
  });
  refresh();
  return { ok: true, message: "Offer created — it applies to new bookings straight away." };
}

const UUID = z.string().uuid();

export async function toggleOfferAction(formData: FormData) {
  if (!(await getAdminSession())) return;
  const id = UUID.safeParse(formData.get("id"));
  if (!id.success) return;
  await prisma.specialOffer.updateMany({ where: { id: id.data }, data: { active: formData.get("active") === "true" } });
  refresh();
}

export async function deleteOfferAction(formData: FormData) {
  if (!(await getAdminSession())) return;
  const id = UUID.safeParse(formData.get("id"));
  if (!id.success) return;
  await prisma.specialOffer.deleteMany({ where: { id: id.data } });
  refresh();
}
