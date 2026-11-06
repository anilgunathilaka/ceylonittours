import { describe, expect, it } from "vitest";
import { countryFromPhone } from "@/lib/phone-country";
import { applyDiscount, offerApplies, quote, quoteWithBestOffer, tourDiscountOffer, type Offer, type PricedOption } from "@/lib/products/pricing";
import { parseContentForm } from "@/lib/cms/validation";
import { computeSlots, slotKey } from "@/lib/products/slots";
import { optionFormSchema } from "@/lib/products/validation";

const option: PricedOption = {
  pricingMode: "per_person",
  prices: [{ category: "adult", label: "Adult", price: 100 }],
  groupTiers: [],
  seasons: [{ name: "Peak", start: "2026-12-20", end: "2026-12-31", adjustPercent: 20 }],
  minParticipants: 1,
};

const early: Offer = { name: "Book early", type: "early_bird", discountPercent: 10, packageSlugs: [], days: 30 };
const lastMinute: Offer = { name: "Last minute", type: "last_minute", discountPercent: 15, packageSlugs: ["kandy"], days: 3 };
const lowSeason: Offer = { name: "Low season", type: "dates", discountPercent: 20, packageSlugs: [], travelFrom: "2027-05-01", travelTo: "2027-06-30" };

describe("special offers", () => {
  it("applies by booking window, tour and travel dates", () => {
    expect(offerApplies(early, "ella", "2026-12-10", "2026-11-05")).toBe(true); // 35 days ahead
    expect(offerApplies(early, "ella", "2026-11-20", "2026-11-05")).toBe(false);
    expect(offerApplies(lastMinute, "kandy", "2026-11-07", "2026-11-05")).toBe(true);
    expect(offerApplies(lastMinute, "ella", "2026-11-07", "2026-11-05")).toBe(false); // other tour
    expect(offerApplies(lowSeason, "ella", "2027-05-10", "2026-11-05")).toBe(true);
    expect(offerApplies(lowSeason, "ella", "2027-07-01", "2026-11-05")).toBe(false);
  });

  it("uses the biggest matching discount, on top of the season price", () => {
    const best = quoteWithBestOffer(option, { adult: 2 }, "2027-05-10", [early, lowSeason], "ella", "2026-11-05");
    expect(best).toMatchObject({ ok: true, fullTotal: 200, total: 160, offer: { name: "Low season", discountPercent: 20 } });
    // Peak +20% then early bird -10%: 100 × 1.2 × 0.9 = 108 each
    expect(quote(option, { adult: 1 }, "2026-12-25", early)).toMatchObject({ ok: true, fullTotal: 120, total: 108 });
    expect(quote(option, { adult: 1 }, "2026-11-10")).toMatchObject({ ok: true, total: 100, fullTotal: 100 });
  });
});

describe("cut-offs", () => {
  const rules = [{ startDate: "2026-11-01", weekdays: [0, 1, 2, 3, 4, 5, 6], startTimes: ["08:00", "16:00"], capacity: 4 }];
  const now = new Date("2026-11-10T06:00:00+05:30");

  it("uses a per-start-time cut-off where one is set", () => {
    const [day] = computeSlots({ rules, blocks: [], booked: new Map(), from: "2026-11-10", to: "2026-11-10", cutoffHours: 1, slotCutoffs: { "16:00": 12 }, now });
    expect(day.slots.map((s) => s.status)).toEqual(["available", "closed"]);
  });

  it("drops the cut-off once a slot has its first booking (last-minute bookings)", () => {
    const booked = new Map([[slotKey("2026-11-10", "16:00"), 1]]);
    const [day] = computeSlots({ rules, blocks: [], booked, from: "2026-11-10", to: "2026-11-10", cutoffHours: 24, lastMinuteAfterFirst: true, now });
    expect(day.slots.map((s) => s.status)).toEqual(["closed", "available"]);
  });
});

describe("option form extras", () => {
  const base = {
    title: "Shared",
    languages: "",
    isPrivate: false,
    active: true,
    pricingMode: "per_person",
    prices: JSON.stringify([{ category: "adult", label: "Adult", price: 10 }]),
    groupTiers: "[]",
    seasons: "[]",
    minParticipants: "1",
    maxParticipants: "",
    cutoffHours: "24",
    slotCutoffs: JSON.stringify([{ time: "16:00", hours: 6 }]),
    lastMinuteAfterFirst: true,
    instantConfirm: true,
    pickupMode: "locations",
    pickupLocations: "Hotel A\nHotel B\nHotel A",
    pickupTiming: "before_start",
    pickupMinutesBefore: "30",
    pickupConfirmation: "day_before",
    wheelchairAccessible: true,
    skipTheLine: false,
    guideMaterials: ["Information booklet"],
  };

  it("parses pickup, cut-offs and extras", () => {
    const parsed = optionFormSchema.safeParse(base);
    expect(parsed.success && parsed.data).toMatchObject({
      slotCutoffs: { "16:00": 6 },
      pickupLocations: ["Hotel A", "Hotel B"],
      pickupMinutesBefore: 30,
      guideMaterials: ["Information booklet"],
    });
  });

  it("requires pickup locations for list pickup and rejects unknown guide materials", () => {
    expect(optionFormSchema.safeParse({ ...base, pickupLocations: "" }).success).toBe(false);
    expect(optionFormSchema.safeParse({ ...base, guideMaterials: ["Jetpack"] }).success).toBe(false);
    expect(optionFormSchema.safeParse({ ...base, slotCutoffs: JSON.stringify([{ time: "4pm", hours: 2 }]) }).success).toBe(false);
  });
});

describe("source markets", () => {
  it("reads the country from the calling code", () => {
    expect(countryFromPhone("+44 7700 900123")).toBe("United Kingdom");
    expect(countryFromPhone("0049 151 1234567")).toBe("Germany");
    expect(countryFromPhone("+971 50 123 4567")).toBe("United Arab Emirates");
    expect(countryFromPhone("077 123 4567")).toBe("Sri Lanka");
    expect(countryFromPhone("+999 1")).toBeUndefined();
    expect(countryFromPhone(undefined)).toBeUndefined();
  });
});

describe("tour discount", () => {
  const group: PricedOption = { ...option, pricingMode: "per_group", prices: [], groupTiers: [{ minPeople: 1, maxPeople: 4, price: 120 }], seasons: [] };

  it("takes a percentage or an amount off the shown price", () => {
    expect(applyDiscount(100, { type: "percent", value: 15 })).toBe(85);
    expect(applyDiscount(100, { type: "amount", value: 10 })).toBe(90);
    expect(applyDiscount(100, { type: "amount", value: 500 })).toBe(0);
    expect(applyDiscount(100, undefined)).toBe(100);
  });

  it("takes an amount off each guest, or off the group price", () => {
    const tenOff = tourDiscountOffer("ella", { type: "amount", value: 10 })!;
    expect(quote(option, { adult: 3 }, "2026-11-10", tenOff)).toMatchObject({ ok: true, fullTotal: 300, total: 270, offer: { name: "Special price", discountPercent: 10 } });
    expect(quote({ ...group, minParticipants: 1 }, { participant: 3 }, "2026-11-10", tenOff)).toMatchObject({ ok: true, fullTotal: 120, total: 110 });
  });

  it("competes with special offers — the customer gets the bigger saving, never both", () => {
    const tour = tourDiscountOffer("ella", { type: "percent", value: 15 })!;
    // Early bird (10%) applies too, but 15% saves more
    expect(quoteWithBestOffer(option, { adult: 1 }, "2026-12-10", [early, tour], "ella", "2026-11-05")).toMatchObject({ total: 85, offer: { name: "Special price" } });
    // Low season (20%) beats the tour discount
    expect(quoteWithBestOffer(option, { adult: 1 }, "2027-05-10", [lowSeason, tour], "ella", "2026-11-05")).toMatchObject({ total: 80, offer: { name: "Low season" } });
    // Another tour's discount never applies
    expect(quoteWithBestOffer(option, { adult: 1 }, "2026-11-10", [tour], "kandy", "2026-11-05")).toMatchObject({ total: 100 });
  });

  it("validates the discount in the tour editor", () => {
    const base = { title: "T", slug: "t", category: "Culture", summary: "S", imageUrl: "https://x.supabase.co/a.webp", price: "50", photoRightsConfirmed: "on" };
    const make = (extra: Record<string, string>) => {
      const data = new FormData();
      for (const [k, v] of Object.entries({ ...base, ...extra })) data.set(k, v);
      return parseContentForm("tour-packages", data);
    };
    const ok = make({ discountType: "percent", discountValue: "15" });
    expect(ok.ok && ok.data).toMatchObject({ discountType: "percent", discountValue: 15 });
    expect(make({ discountType: "percent", discountValue: "95" }).ok).toBe(false);
    expect(make({ discountType: "amount", discountValue: "50" }).ok).toBe(false); // not less than the price
    expect(make({ discountValue: "10" }).ok).toBe(false); // no type
    const none = make({});
    expect(none.ok && none.data).toMatchObject({ discountType: null, discountValue: null });
  });
});
