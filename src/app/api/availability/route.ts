import { NextResponse } from "next/server";
import { getPackageBySlug } from "@/lib/content";
import { getActiveOffers, getAvailability, getOptionsForPackage } from "@/lib/products/options";
import { addDays, DATE_PATTERN, sriLankaToday } from "@/lib/products/slots";
import { packageSlugSchema } from "@/lib/validation/schemas";

/** Longest range one request may ask for */
const MAX_DAYS = 62;

/**
 * Public availability for a package's bookable options:
 * GET /api/availability?package=<slug>&from=YYYY-MM-DD&to=YYYY-MM-DD
 * Live data (never cached), so seats left are always current.
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const slug = packageSlugSchema.safeParse(params.get("package"));
  const today = sriLankaToday();
  const from = params.get("from") ?? today;
  const to = params.get("to") ?? addDays(from, 30);

  if (!slug.success || !DATE_PATTERN.test(from) || !DATE_PATTERN.test(to) || to < from || to > addDays(from, MAX_DAYS)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if (!(await getPackageBySlug(slug.data))) {
    return NextResponse.json({ error: "Tour not found" }, { status: 404 });
  }

  const [options, allOffers] = await Promise.all([getOptionsForPackage(slug.data, { activeOnly: true }), getActiveOffers()]);
  const offers = allOffers.filter((o) => o.packageSlugs.length === 0 || o.packageSlugs.includes(slug.data));
  // Past dates never have bookable slots
  const start = from < today ? today : from;
  const slots = start <= to ? await getAvailability(options, start, to) : new Map();

  return NextResponse.json(
    {
      offers,
      options: options.map((option) => ({
        id: option.id,
        title: option.title,
        description: option.description,
        durationLabel: option.durationLabel,
        languages: option.languages,
        pickupIncluded: option.pickupIncluded,
        isPrivate: option.isPrivate,
        pricingMode: option.pricingMode,
        prices: option.prices,
        groupTiers: option.groupTiers,
        seasons: option.seasons,
        minParticipants: option.minParticipants,
        maxParticipants: option.maxParticipants ?? null,
        instantConfirm: option.instantConfirm,
        pickupMode: option.pickupMode,
        pickupArea: option.pickupArea ?? null,
        pickupLocations: option.pickupLocations,
        pickupTiming: option.pickupTiming ?? null,
        pickupMinutesBefore: option.pickupMinutesBefore ?? null,
        pickupConfirmation: option.pickupConfirmation ?? null,
        wheelchairAccessible: option.wheelchairAccessible,
        skipTheLine: option.skipTheLine,
        guideMaterials: option.guideMaterials,
        days: (slots.get(option.id) ?? []).map((day: { date: string; slots: { time: string; remaining: number; status: string }[] }) => ({
          date: day.date,
          slots: day.slots.map((s) => ({ time: s.time, remaining: s.status === "available" ? s.remaining : 0, status: s.status })),
        })),
      })),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
