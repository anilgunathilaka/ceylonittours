import { describe, expect, it } from "vitest";
import { parseContentForm } from "@/lib/cms/validation";
import { fromPrice, quote, type PricedOption } from "@/lib/products/pricing";
import { computeSlots, slotKey } from "@/lib/products/slots";
import { optionFormSchema, ruleFormSchema } from "@/lib/products/validation";
import { computeStats } from "@/lib/stats";
import { shortName } from "@/lib/reviews";
import type { Booking } from "@/lib/bookings";

const perPerson: PricedOption = {
  pricingMode: "per_person",
  prices: [
    { category: "adult", label: "Adult", price: 40 },
    { category: "child", label: "Child", price: 20 },
    { category: "infant", label: "Infant", price: 0 },
  ],
  groupTiers: [],
  seasons: [{ name: "Peak", start: "2026-12-20", end: "2027-01-05", adjustPercent: 25 }],
  minParticipants: 2,
  maxParticipants: 8,
};

describe("pricing", () => {
  it("adds up guest types and applies the season covering the date", () => {
    expect(quote(perPerson, { adult: 2, child: 1, infant: 1 }, "2026-11-10")).toMatchObject({ ok: true, total: 100, totalParticipants: 4 });
    expect(quote(perPerson, { adult: 2, child: 1 }, "2026-12-25")).toMatchObject({ ok: true, total: 125, adjustPercent: 25 });
  });

  it("enforces guest limits and rejects unknown or bad counts", () => {
    expect(quote(perPerson, { adult: 1 })).toMatchObject({ ok: false });
    expect(quote(perPerson, { adult: 9 })).toMatchObject({ ok: false });
    expect(quote(perPerson, { senior: 2 })).toMatchObject({ ok: false, error: "Unknown guest type" });
    expect(quote(perPerson, { adult: 1.5 })).toMatchObject({ ok: false });
  });

  it("prices groups by tier", () => {
    const group: PricedOption = {
      ...perPerson,
      pricingMode: "per_group",
      prices: [],
      groupTiers: [
        { minPeople: 1, maxPeople: 3, price: 120 },
        { minPeople: 4, maxPeople: 6, price: 180 },
      ],
      seasons: [],
      minParticipants: 1,
    };
    expect(quote(group, { participant: 5 })).toMatchObject({ ok: true, total: 180 });
    expect(quote(group, { participant: 7 })).toMatchObject({ ok: false });
    expect(fromPrice(group)).toEqual({ amount: 120, unit: "group" });
    expect(fromPrice(perPerson)).toEqual({ amount: 20, unit: "person" });
  });
});

describe("slots", () => {
  const rules = [{ startDate: "2026-11-01", endDate: "2026-11-30", weekdays: [1, 3, 5], startTimes: ["08:00", "14:00"], capacity: 6 }];
  const now = new Date("2026-11-08T00:00:00+05:30");

  it("offers the rule's weekdays and times, with seats left", () => {
    const days = computeSlots({ rules, blocks: [], booked: new Map([[slotKey("2026-11-09", "08:00"), 6]]), from: "2026-11-08", to: "2026-11-11", cutoffHours: 0, now });
    expect(days.map((d) => d.date)).toEqual(["2026-11-09", "2026-11-11"]); // Mon, Wed
    expect(days[0].slots).toEqual([
      { time: "08:00", capacity: 6, booked: 6, remaining: 0, status: "full" },
      { time: "14:00", capacity: 6, booked: 0, remaining: 6, status: "available" },
    ]);
  });

  it("applies blocked days, blocked times and the cut-off", () => {
    const days = computeSlots({
      rules,
      blocks: [{ date: "2026-11-11" }, { date: "2026-11-13", startTime: "14:00" }],
      booked: new Map(),
      from: "2026-11-09",
      to: "2026-11-13",
      cutoffHours: 33, // bookings close at Mon 09:00, so Mon 08:00 is closed but Mon 14:00 is open
      now,
    });
    const status = Object.fromEntries(days.flatMap((d) => d.slots.map((s) => [`${d.date} ${s.time}`, s.status])));
    expect(status).toEqual({
      "2026-11-09 08:00": "closed",
      "2026-11-09 14:00": "available",
      "2026-11-11 08:00": "blocked",
      "2026-11-11 14:00": "blocked",
      "2026-11-13 08:00": "available",
      "2026-11-13 14:00": "blocked",
    });
  });

  it("uses the largest capacity where rules overlap and stops at the end date", () => {
    const days = computeSlots({
      rules: [...rules, { startDate: "2026-11-01", weekdays: [1], startTimes: ["08:00"], capacity: 10 }],
      blocks: [],
      booked: new Map(),
      from: "2026-11-30",
      to: "2026-12-02",
      cutoffHours: 0,
      now,
    });
    expect(days).toEqual([{ date: "2026-11-30", slots: [{ time: "08:00", capacity: 10, booked: 0, remaining: 10, status: "available" }, expect.objectContaining({ time: "14:00", capacity: 6 })] }]);
  });
});

describe("admin forms", () => {
  const option = {
    title: "Shared tour",
    languages: "English, German",
    isPrivate: false,
    active: true,
    pricingMode: "per_person",
    prices: JSON.stringify([{ category: "adult", label: "Adult", price: 40 }]),
    groupTiers: "[]",
    seasons: "[]",
    minParticipants: "1",
    maxParticipants: "",
    cutoffHours: "24",
    slotCutoffs: "[]",
    lastMinuteAfterFirst: false,
    instantConfirm: false,
    pickupMode: "none",
    pickupLocations: "",
    wheelchairAccessible: false,
    skipTheLine: false,
    guideMaterials: [],
  };

  it("accepts a valid option and parses its lists", () => {
    const parsed = optionFormSchema.safeParse(option);
    expect(parsed.success && parsed.data.languages).toEqual(["English", "German"]);
  });

  it("rejects duplicate guest types, missing prices and inverted limits", () => {
    const dup = JSON.stringify([
      { category: "adult", label: "Adult", price: 40 },
      { category: "adult", label: "Grown-up", price: 30 },
    ]);
    expect(optionFormSchema.safeParse({ ...option, prices: dup }).success).toBe(false);
    expect(optionFormSchema.safeParse({ ...option, prices: "[]" }).success).toBe(false);
    expect(optionFormSchema.safeParse({ ...option, minParticipants: "4", maxParticipants: "2" }).success).toBe(false);
    expect(optionFormSchema.safeParse({ ...option, prices: "not json" }).success).toBe(false);
  });

  it("normalises schedule start times and validates them", () => {
    const rule = { startDate: "2026-11-01", endDate: "", weekdays: ["1", "2"], startTimes: "14:00, 08:00 14:00", capacity: "8" };
    const parsed = ruleFormSchema.safeParse(rule);
    expect(parsed.success && parsed.data.startTimes).toEqual(["08:00", "14:00"]);
    expect(ruleFormSchema.safeParse({ ...rule, startTimes: "8am" }).success).toBe(false);
    expect(ruleFormSchema.safeParse({ ...rule, weekdays: [] }).success).toBe(false);
    expect(ruleFormSchema.safeParse({ ...rule, endDate: "2026-10-01" }).success).toBe(false);
  });

  it("validates the tour wizard's gallery, map location and booking questions", () => {
    const base = () => {
      const form = new FormData();
      form.set("title", "Kandy day tour");
      form.set("slug", "kandy-day-tour");
      form.set("category", "Culture");
      form.set("summary", "A day in Kandy");
      form.set("imageUrl", "https://x.supabase.co/storage/v1/object/public/site-media/a.webp");
      form.set("price", "50");
      return form;
    };

    const ok = base();
    ok.set("gallery", JSON.stringify([{ url: "https://x.supabase.co/b.webp", alt: " Temple ", width: 1200, height: 800 }]));
    ok.set("meetingLat", "7.2936");
    ok.set("meetingLng", "80.635");
    ok.set("cancellationPolicy", "free_24h");
    ok.set("bookingQuestions", JSON.stringify([{ question: "Hotel name", required: true }]));
    const parsed = parseContentForm("tour-packages", ok);
    expect(parsed.ok && parsed.data).toMatchObject({
      gallery: [{ url: "https://x.supabase.co/b.webp", alt: "Temple", width: 1200, height: 800 }],
      meetingLat: 7.2936,
      meetingLng: 80.635,
      cancellationPolicy: "free_24h",
      bookingQuestions: [{ question: "Hotel name", required: true }],
    });

    const bad = base();
    bad.set("gallery", JSON.stringify([{ url: "javascript:alert(1)" }]));
    bad.set("meetingLat", "7.29");
    bad.set("cancellationPolicy", "whenever");
    const failed = parseContentForm("tour-packages", bad);
    expect(failed.ok ? {} : failed.errors).toMatchObject({
      gallery: expect.any(String),
      meeting: expect.any(String),
      cancellationPolicy: expect.any(String),
    });
  });
});

describe("stats and reviews helpers", () => {
  it("shows only a first name and initial", () => {
    expect(shortName("Kasun Perera")).toBe("Kasun P.");
    expect(shortName("  Ana  ")).toBe("Ana");
  });

  it("counts revenue from confirmed bookings only, by travel date", () => {
    const make = (over: Partial<Booking>): Booking =>
      ({ id: crypto.randomUUID(), packageSlug: "a", packageTitle: "A", status: "confirmed", totalParticipants: 2, participants: [], answers: [], createdAt: "2026-11-01T00:00:00Z", ...over }) as Booking;
    const { kpis, monthly, statuses, topTours } = computeStats(
      [
        make({ travelDate: "2026-10-10", totalPrice: 100 }),
        make({ travelDate: "2026-11-20", totalPrice: 50 }),
        make({ travelDate: "2026-11-21", totalPrice: 70, status: "pending" }),
        make({ travelDate: "2026-11-22", totalPrice: 90, status: "cancelled" }),
      ],
      "2026-11-03",
    );
    expect(monthly.at(-1)).toMatchObject({ month: "2026-11", bookings: 2, guests: 4, revenue: 50 });
    expect(kpis).toMatchObject({ revenue12m: 150, upcomingRevenue: 50, upcomingGuests: 2, pending: 1 });
    expect(statuses).toEqual({ pending: 1, confirmed: 2, cancelled: 1 });
    expect(topTours[0]).toMatchObject({ bookings: 3, revenue: 150 });
  });
});

describe("itinerary and review photo checks", () => {
  it("accepts typed itinerary stops and rejects unknown types", () => {
    const form = new FormData();
    const base = { title: "T", slug: "t", category: "Culture", summary: "S", imageUrl: "https://x.supabase.co/a.webp", price: "1" };
    for (const [k, v] of Object.entries(base)) form.set(k, v);
    form.set(
      "itinerary",
      JSON.stringify([
        { type: "pickup", title: "Kandy" },
        { type: "transport", title: "Tuk tuk", duration: "1 hour" },
        { type: "stop", title: "Tea factory", admission: "included", lat: "7.1", lng: "80.7" },
      ]),
    );
    const ok = parseContentForm("tour-packages", form);
    expect(ok.ok && ok.data.itinerary).toEqual([
      { type: "pickup", title: "Kandy" },
      { type: "transport", title: "Tuk tuk", duration: "1 hour" },
      { type: "stop", title: "Tea factory", admission: "included", lat: 7.1, lng: 80.7 },
    ]);
    form.set("itinerary", JSON.stringify([{ type: "teleport", title: "X" }]));
    expect(parseContentForm("tour-packages", form).ok).toBe(false);
  });

  it("only trusts review photos from our storage's reviews folder", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://abc.supabase.co";
    const { isReviewPhotoUrl } = await import("@/lib/storage");
    const base = "https://abc.supabase.co/storage/v1/object/public/site-media";
    expect(isReviewPhotoUrl(`${base}/reviews/1b2c3d4e-0000-4000-8000-000000000000.webp`)).toBe(true);
    expect(isReviewPhotoUrl(`${base}/tour-packages/1b2c3d4e-0000-4000-8000-000000000000.webp`)).toBe(false);
    expect(isReviewPhotoUrl(`${base}/reviews/../secret.webp`)).toBe(false);
    expect(isReviewPhotoUrl("https://evil.example/reviews/a.webp")).toBe(false);
  });
});
