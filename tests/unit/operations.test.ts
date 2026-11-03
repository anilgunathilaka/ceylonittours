import { describe, expect, it } from "vitest";
import { countryFromPhone } from "@/lib/phone-country";
import { bestOffer, offerApplies, quote, type Offer, type PricedOption } from "@/lib/products/pricing";
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
    const offer = bestOffer([early, lowSeason], "ella", "2027-05-10", "2026-11-05");
    expect(offer?.name).toBe("Low season");
    expect(quote(option, { adult: 2 }, "2027-05-10", offer)).toMatchObject({ ok: true, fullTotal: 200, total: 160, offer: { discountPercent: 20 } });
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
