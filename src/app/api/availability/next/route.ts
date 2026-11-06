import { NextResponse } from "next/server";
import { z } from "zod";
import { getPackageBySlug } from "@/lib/content";
import { getAvailability, getOptionsForPackage } from "@/lib/products/options";
import { addDays, DATE_PATTERN, sriLankaToday } from "@/lib/products/slots";
import { packageSlugSchema } from "@/lib/validation/schemas";

/** How far ahead to look, and in what steps (the schedule query handles ~2 months at a time) */
const LOOKAHEAD_DAYS = 365;
const CHUNK_DAYS = 60;

/**
 * The first date after `after` with space for the group:
 * GET /api/availability/next?package=<slug>&after=YYYY-MM-DD&guests=2&language=English
 * → { date: "YYYY-MM-DD" | null }
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const slug = packageSlugSchema.safeParse(params.get("package"));
  const today = sriLankaToday();
  const after = params.get("after") ?? today;
  const guests = z.coerce.number().int().min(1).max(50).safeParse(params.get("guests") ?? "1");
  const language = (params.get("language") ?? "").slice(0, 60);

  if (!slug.success || !guests.success || !DATE_PATTERN.test(after)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if (!(await getPackageBySlug(slug.data))) {
    return NextResponse.json({ error: "Tour not found" }, { status: 404 });
  }

  const options = (await getOptionsForPackage(slug.data, { activeOnly: true })).filter(
    (o) => !language || o.languages.length === 0 || o.languages.includes(language),
  );
  const start = addDays(after < today ? today : after, 1);
  const end = addDays(today, LOOKAHEAD_DAYS);

  let date: string | null = null;
  for (let from = start; options.length > 0 && from <= end && !date; from = addDays(from, CHUNK_DAYS + 1)) {
    const to = addDays(from, CHUNK_DAYS) < end ? addDays(from, CHUNK_DAYS) : end;
    const slots = await getAvailability(options, from, to);
    for (const days of slots.values()) {
      for (const day of days) {
        if (day.slots.some((s) => s.status === "available" && s.remaining >= guests.data) && (!date || day.date < date)) date = day.date;
      }
    }
  }

  return NextResponse.json({ date }, { headers: { "Cache-Control": "no-store" } });
}
