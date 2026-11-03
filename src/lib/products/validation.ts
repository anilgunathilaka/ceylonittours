import { z } from "zod";
import { DATE_PATTERN, TIME_PATTERN } from "@/lib/products/slots";

/** Server-side rules for the admin option and availability forms. */

const json = <T extends z.ZodType>(schema: T) =>
  z.string().transform((value, ctx) => {
    try {
      return JSON.parse(value || "[]") as unknown;
    } catch {
      ctx.addIssue({ code: "custom", message: "Could not read the form — please try again" });
      return z.NEVER;
    }
  }).pipe(schema);

const money = z.coerce.number().min(0, "Prices can't be negative").max(1_000_000);
const optionalInt = z.preprocess((v) => (v === "" || v === null || v === undefined ? undefined : v), z.coerce.number().int().min(0).max(120).optional());
const date = z.string().regex(DATE_PATTERN, "Enter a valid date");

export const PRICE_CATEGORIES = [
  { category: "adult", label: "Adult" },
  { category: "child", label: "Child" },
  { category: "infant", label: "Infant" },
  { category: "senior", label: "Senior" },
  { category: "student", label: "Student" },
  { category: "participant", label: "Participant" },
] as const;

export const GUIDE_MATERIALS = ["Audio guide & headphones", "Information booklet", "Map"] as const;

export const optionFormSchema = z
  .object({
    title: z.string().trim().min(2, "Give the option a title").max(160),
    description: z.string().trim().max(3000).default(""),
    durationLabel: z.string().trim().max(80).optional(),
    languages: z.string().default("").transform((v) => v.split(/[\n,]/).map((s) => s.trim()).filter(Boolean).slice(0, 20)),
    isPrivate: z.boolean(),
    active: z.boolean(),
    sortOrder: z.coerce.number().int().min(0).max(999).default(0),
    pricingMode: z.enum(["per_person", "per_group"]),
    prices: json(
      z
        .array(
          z.object({
            category: z.string().regex(/^[a-z][a-z0-9_]{0,39}$/, "Invalid guest type"),
            label: z.string().trim().min(1, "Every guest type needs a label").max(60),
            ageMin: optionalInt,
            ageMax: optionalInt,
            price: money,
          }),
        )
        .max(10),
    ),
    groupTiers: json(
      z
        .array(
          z
            .object({ minPeople: z.coerce.number().int().min(1), maxPeople: z.coerce.number().int().min(1).max(500), price: money })
            .refine((t) => t.minPeople <= t.maxPeople, "A group tier's minimum must not exceed its maximum"),
        )
        .max(20),
    ),
    seasons: json(
      z
        .array(
          z
            .object({
              name: z.string().trim().min(1, "Every season needs a name").max(60),
              start: date,
              end: date,
              adjustPercent: z.coerce.number().min(-90, "A season can't cut more than 90%").max(500),
            })
            .refine((s) => s.start <= s.end, "A season must end on or after its start date"),
        )
        .max(20),
    ),
    minParticipants: z.coerce.number().int().min(1, "Minimum guests must be at least 1").max(500),
    maxParticipants: z.preprocess((v) => (v === "" ? undefined : v), z.coerce.number().int().min(1).max(500).optional()),
    cutoffHours: z.coerce.number().int().min(0, "Cut-off can't be negative").max(24 * 60),
    slotCutoffs: json(
      z
        .array(z.object({ time: z.string().regex(TIME_PATTERN, "Cut-off times must look like 08:00"), hours: z.coerce.number().int().min(0).max(24 * 60) }))
        .max(24),
    ).transform((rows) => Object.fromEntries(rows.map((r) => [r.time, r.hours]))),
    lastMinuteAfterFirst: z.boolean(),
    instantConfirm: z.boolean(),
    pickupMode: z.enum(["none", "area", "locations"]),
    pickupArea: z.string().trim().max(300).optional(),
    pickupLocations: z.string().default("").transform((v) => [...new Set(v.split(/\r?\n/).map((s) => s.trim()).filter(Boolean))].slice(0, 200)),
    pickupTiming: z.preprocess((v) => (v === "" ? undefined : v), z.enum(["at_start", "before_start"]).optional()),
    pickupMinutesBefore: z.preprocess((v) => (v === "" ? undefined : v), z.coerce.number().int().min(0).max(600).optional()),
    pickupConfirmation: z.preprocess((v) => (v === "" ? undefined : v), z.enum(["day_before", "on_booking"]).optional()),
    wheelchairAccessible: z.boolean(),
    skipTheLine: z.boolean(),
    guideMaterials: z.array(z.enum(GUIDE_MATERIALS)).max(GUIDE_MATERIALS.length),
  })
  .superRefine((value, ctx) => {
    if (value.maxParticipants && value.maxParticipants < value.minParticipants) {
      ctx.addIssue({ code: "custom", path: ["maxParticipants"], message: "Maximum guests must be at least the minimum" });
    }
    const categories = value.prices.map((p) => p.category);
    if (new Set(categories).size !== categories.length) {
      ctx.addIssue({ code: "custom", path: ["prices"], message: "Each guest type can only be listed once" });
    }
    if (value.pricingMode === "per_person" && value.prices.length === 0) {
      ctx.addIssue({ code: "custom", path: ["prices"], message: "Add at least one price (e.g. Adult)" });
    }
    if (value.pickupMode === "locations" && value.pickupLocations.length === 0) {
      ctx.addIssue({ code: "custom", path: ["pickupLocations"], message: "Add at least one pickup location" });
    }
    if (value.pricingMode === "per_group" && value.groupTiers.length === 0) {
      ctx.addIssue({ code: "custom", path: ["groupTiers"], message: "Add at least one group price" });
    }
  });

export type OptionFormValues = z.output<typeof optionFormSchema>;

export const ruleFormSchema = z
  .object({
    startDate: date,
    endDate: z.preprocess((v) => (v === "" ? undefined : v), date.optional()),
    weekdays: z.array(z.coerce.number().int().min(0).max(6)).min(1, "Pick at least one weekday"),
    startTimes: z
      .string()
      .transform((v) => [...new Set(v.split(/[\s,]+/).map((s) => s.trim()).filter(Boolean))].sort())
      .pipe(z.array(z.string().regex(TIME_PATTERN, "Times must look like 08:00 or 14:30")).min(1, "Add at least one start time").max(24)),
    capacity: z.coerce.number().int().min(1, "Capacity must be at least 1").max(10_000),
  })
  .refine((v) => !v.endDate || v.endDate >= v.startDate, { path: ["endDate"], message: "End date must be on or after the start date" });

export const blockFormSchema = z
  .object({
    date,
    endDate: z.preprocess((v) => (v === "" ? undefined : v), date.optional()),
    startTime: z.preprocess((v) => (v === "" ? undefined : v), z.string().regex(TIME_PATTERN, "Times must look like 08:00").optional()),
    reason: z.string().trim().max(200).optional(),
  })
  .refine((v) => !v.endDate || (v.endDate >= v.date && daysBetween(v.date, v.endDate) <= 366), {
    path: ["endDate"],
    message: "End date must be after the start date and within a year",
  });

function daysBetween(from: string, to: string) {
  return (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86400_000;
}
