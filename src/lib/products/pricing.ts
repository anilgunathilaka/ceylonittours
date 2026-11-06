/**
 * Option pricing. Pure functions shared by the booking widget (client) and the booking API
 * (server), so the price a customer sees is the price that gets saved.
 */

export type PriceCategory = { category: string; label: string; ageMin?: number; ageMax?: number; price: number };
export type GroupTier = { minPeople: number; maxPeople: number; price: number };
export type Season = { name: string; start: string; end: string; adjustPercent: number };
export type PricingMode = "per_person" | "per_group";

export type PricedOption = {
  pricingMode: PricingMode;
  prices: PriceCategory[];
  groupTiers: GroupTier[];
  seasons: Season[];
  minParticipants: number;
  maxParticipants?: number | null;
};

/** Categories the customer counts guests in. Group-priced options without categories count "Participants". */
export function guestCategories(option: Pick<PricedOption, "pricingMode" | "prices">): PriceCategory[] {
  if (option.prices.length > 0) return option.prices;
  return [{ category: "participant", label: "Participants", price: 0 }];
}

/** Percentage change for the season that covers `date` (YYYY-MM-DD); the first matching season wins. */
export function seasonAdjustment(seasons: Season[], date?: string) {
  if (!date) return 0;
  const season = seasons.find((s) => s.start <= date && date <= s.end);
  return season?.adjustPercent ?? 0;
}

const round = (value: number) => Math.round(value * 100) / 100;
const adjust = (price: number, percent: number) => round(price * (1 + percent / 100));

/** Special offer as the pricing sees it (dates are YYYY-MM-DD) */
export type Offer = {
  name: string;
  type: "early_bird" | "last_minute" | "dates";
  discountPercent: number;
  /** Fixed USD off each guest's price (per person) or off the group price; used instead of discountPercent when set */
  discountAmount?: number | null;
  /** Empty = every tour */
  packageSlugs: string[];
  days?: number | null;
  travelFrom?: string | null;
  travelTo?: string | null;
};

const daysBetween = (from: string, to: string) => Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86400_000);

/** Does this offer apply to a booking made on `today` for `date`? */
export function offerApplies(offer: Offer, packageSlug: string, date: string, today: string) {
  if (offer.packageSlugs.length > 0 && !offer.packageSlugs.includes(packageSlug)) return false;
  if (offer.travelFrom && date < offer.travelFrom) return false;
  if (offer.travelTo && date > offer.travelTo) return false;
  const ahead = daysBetween(today, date);
  if (offer.type === "early_bird") return ahead >= (offer.days ?? 0);
  if (offer.type === "last_minute") return ahead <= (offer.days ?? 0);
  return true;
}

/** A tour's own discount, as entered in the tour editor */
export type TourDiscount = { type: "percent" | "amount"; value: number };

/** Price after a tour discount (never below zero; percent capped at 90%) */
export function applyDiscount(price: number, discount?: TourDiscount | null) {
  if (!discount || discount.value <= 0) return price;
  if (discount.type === "percent") return round(price * (1 - Math.min(discount.value, 90) / 100));
  return round(Math.max(price - discount.value, 0));
}

/** The tour discount as an always-on offer for that tour, so it competes with special offers */
export function tourDiscountOffer(packageSlug: string, discount?: TourDiscount | null): Offer | undefined {
  if (!discount || discount.value <= 0) return undefined;
  return {
    name: "Special price",
    type: "dates",
    packageSlugs: [packageSlug],
    discountPercent: discount.type === "percent" ? Math.min(discount.value, 90) : 0,
    discountAmount: discount.type === "amount" ? discount.value : null,
  };
}

/** Prices with every applicable offer and keeps the cheapest — offers never stack. */
export function quoteWithBestOffer(
  option: PricedOption,
  counts: Record<string, number>,
  date: string,
  offers: Offer[],
  packageSlug: string,
  today: string,
): Quote {
  let best = quote(option, counts, date);
  if (!best.ok) return best;
  for (const offer of offers) {
    if (!offerApplies(offer, packageSlug, date, today)) continue;
    const candidate = quote(option, counts, date, offer);
    if (candidate.ok && candidate.total < best.total) best = candidate;
  }
  return best;
}

export type QuoteLine = { category: string; label: string; count: number; unitPrice: number };
export type Quote =
  | {
      ok: true;
      lines: QuoteLine[];
      totalParticipants: number;
      total: number;
      adjustPercent: number;
      /** Total before the special offer (equals total without one) */
      fullTotal: number;
      /** The offer applied; discountPercent is the effective saving (also for amount discounts) */
      offer?: { name: string; discountPercent: number };
    }
  | { ok: false; error: string };

/** Prices a booking: `counts` maps a guest category to how many guests are in it. */
export function quote(option: PricedOption, counts: Record<string, number>, date?: string, offer?: Offer): Quote {
  const base = quoteBeforeOffer(option, counts, date);
  if (!base.ok || !offer) return base;
  const amount = offer.discountAmount && offer.discountAmount > 0 ? offer.discountAmount : 0;
  if (amount === 0 && offer.discountPercent <= 0) return base;

  // Percent: off every price. Amount: off each guest's price, or off the group price.
  const cut = (price: number) => (amount ? round(Math.max(price - amount, 0)) : round(price * (1 - Math.min(offer.discountPercent, 90) / 100)));
  const perGroup = option.pricingMode === "per_group";
  const lines = perGroup ? base.lines : base.lines.map((line) => ({ ...line, unitPrice: cut(line.unitPrice) }));
  const total = perGroup ? cut(base.total) : round(lines.reduce((sum, l) => sum + l.unitPrice * l.count, 0));
  if (total >= base.total) return base;
  const savedPercent = base.total > 0 ? Math.round(((base.total - total) / base.total) * 100) : 0;
  return { ...base, lines, total, offer: { name: offer.name, discountPercent: amount ? savedPercent : offer.discountPercent } };
}

function quoteBeforeOffer(option: PricedOption, counts: Record<string, number>, date?: string): Quote {
  const categories = guestCategories(option);
  const lines: QuoteLine[] = [];
  for (const [category, raw] of Object.entries(counts)) {
    const count = Number(raw);
    if (!Number.isInteger(count) || count < 0) return { ok: false, error: "Guest counts must be whole numbers" };
    if (count === 0) continue;
    const match = categories.find((c) => c.category === category);
    if (!match) return { ok: false, error: "Unknown guest type" };
    lines.push({ category, label: match.label, count, unitPrice: match.price });
  }

  const totalParticipants = lines.reduce((sum, line) => sum + line.count, 0);
  if (totalParticipants === 0) return { ok: false, error: "Add at least one guest" };
  if (totalParticipants < option.minParticipants) {
    return { ok: false, error: `This option needs at least ${option.minParticipants} guests` };
  }
  if (option.maxParticipants && totalParticipants > option.maxParticipants) {
    return { ok: false, error: `This option allows up to ${option.maxParticipants} guests per booking` };
  }

  const adjustPercent = seasonAdjustment(option.seasons, date);

  if (option.pricingMode === "per_group") {
    const tier = option.groupTiers.find((t) => t.minPeople <= totalParticipants && totalParticipants <= t.maxPeople);
    if (!tier) return { ok: false, error: `No group price is set for ${totalParticipants} guests` };
    return {
      ok: true,
      lines: lines.map((line) => ({ ...line, unitPrice: 0 })),
      totalParticipants,
      total: adjust(tier.price, adjustPercent),
      fullTotal: adjust(tier.price, adjustPercent),
      adjustPercent,
    };
  }

  const priced = lines.map((line) => ({ ...line, unitPrice: adjust(line.unitPrice, adjustPercent) }));
  const total = round(priced.reduce((sum, line) => sum + line.unitPrice * line.count, 0));
  return { ok: true, lines: priced, totalParticipants, total, fullTotal: total, adjustPercent };
}

/** Lowest advertised price before seasonal changes, for "From $X" labels. */
export function fromPrice(option: PricedOption): { amount: number; unit: "person" | "group" } | null {
  if (option.pricingMode === "per_group") {
    const prices = option.groupTiers.map((t) => t.price).filter((p) => p > 0);
    return prices.length ? { amount: Math.min(...prices), unit: "group" } : null;
  }
  const paid = option.prices.map((p) => p.price).filter((p) => p > 0);
  return paid.length ? { amount: Math.min(...paid), unit: "person" } : null;
}
