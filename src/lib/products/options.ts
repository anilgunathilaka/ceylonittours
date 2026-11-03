import { prisma } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import { BookingStatus as DbStatus } from "@/generated/prisma/enums";
import type { GroupTier, Offer, PriceCategory, PricingMode, Season } from "@/lib/products/pricing";
import { bestOffer, quote } from "@/lib/products/pricing";
import { computeSlots, slotKey, sriLankaToday, type DaySlots, type SlotBlock, type SlotRule } from "@/lib/products/slots";

/**
 * Bookable options for a tour package (linked by slug), their availability, and the
 * capacity-checked booking insert that prevents overbooking.
 */

export type TourOption = {
  id: string;
  packageSlug: string;
  title: string;
  description: string;
  durationLabel?: string;
  languages: string[];
  pickupIncluded: boolean;
  isPrivate: boolean;
  pricingMode: PricingMode;
  prices: PriceCategory[];
  groupTiers: GroupTier[];
  seasons: Season[];
  minParticipants: number;
  maxParticipants?: number;
  cutoffHours: number;
  slotCutoffs: Record<string, number>;
  lastMinuteAfterFirst: boolean;
  instantConfirm: boolean;
  pickupMode: "none" | "area" | "locations";
  pickupArea?: string;
  pickupLocations: string[];
  pickupTiming?: "at_start" | "before_start";
  pickupMinutesBefore?: number;
  pickupConfirmation?: "day_before" | "on_booking";
  wheelchairAccessible: boolean;
  skipTheLine: boolean;
  guideMaterials: string[];
  active: boolean;
  sortOrder: number;
};

type OptionRow = Prisma.TourOptionGetPayload<object>;

const asArray = (value: unknown): Record<string, unknown>[] =>
  Array.isArray(value) ? value.filter((v): v is Record<string, unknown> => typeof v === "object" && v !== null) : [];
const num = (value: unknown) => (typeof value === "number" && Number.isFinite(value) ? value : undefined);

export function toOption(row: OptionRow): TourOption {
  return {
    id: row.id,
    packageSlug: row.packageSlug,
    title: row.title,
    description: row.description,
    durationLabel: row.durationLabel ?? undefined,
    languages: row.languages,
    pickupIncluded: row.pickupIncluded,
    isPrivate: row.isPrivate,
    pricingMode: row.pricingMode === "per_group" ? "per_group" : "per_person",
    prices: asArray(row.prices).map((p) => ({
      category: String(p.category ?? ""),
      label: String(p.label ?? ""),
      ageMin: num(p.ageMin),
      ageMax: num(p.ageMax),
      price: num(p.price) ?? 0,
    })),
    groupTiers: asArray(row.groupTiers).map((t) => ({
      minPeople: num(t.minPeople) ?? 1,
      maxPeople: num(t.maxPeople) ?? 1,
      price: num(t.price) ?? 0,
    })),
    seasons: asArray(row.seasons).map((s) => ({
      name: String(s.name ?? ""),
      start: String(s.start ?? ""),
      end: String(s.end ?? ""),
      adjustPercent: num(s.adjustPercent) ?? 0,
    })),
    minParticipants: row.minParticipants,
    maxParticipants: row.maxParticipants ?? undefined,
    cutoffHours: row.cutoffHours,
    slotCutoffs: Object.fromEntries(
      Object.entries(typeof row.slotCutoffs === "object" && row.slotCutoffs && !Array.isArray(row.slotCutoffs) ? row.slotCutoffs : {}).filter(
        (entry): entry is [string, number] => typeof entry[1] === "number",
      ),
    ),
    lastMinuteAfterFirst: row.lastMinuteAfterFirst,
    instantConfirm: row.instantConfirm,
    pickupMode: row.pickupMode === "area" || row.pickupMode === "locations" ? row.pickupMode : "none",
    pickupArea: row.pickupArea ?? undefined,
    pickupLocations: row.pickupLocations,
    pickupTiming: row.pickupTiming === "at_start" || row.pickupTiming === "before_start" ? row.pickupTiming : undefined,
    pickupMinutesBefore: row.pickupMinutesBefore ?? undefined,
    pickupConfirmation: row.pickupConfirmation === "day_before" || row.pickupConfirmation === "on_booking" ? row.pickupConfirmation : undefined,
    wheelchairAccessible: row.wheelchairAccessible,
    skipTheLine: row.skipTheLine,
    guideMaterials: row.guideMaterials,
    active: row.active,
    sortOrder: row.sortOrder,
  };
}

const isoDate = (d: Date) => d.toISOString().slice(0, 10);
const dbDate = (value: string) => new Date(`${value}T00:00:00.000Z`);
const ACTIVE_STATUSES = [DbStatus.PENDING, DbStatus.CONFIRMED];

export async function getOptionsForPackage(packageSlug: string, { activeOnly = false } = {}) {
  const rows = await prisma.tourOption.findMany({
    where: { packageSlug, ...(activeOnly ? { active: true } : {}) },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
  return rows.map(toOption);
}

/** Option counts per package slug, for admin lists */
export async function countOptionsByPackage() {
  const rows = await prisma.tourOption.groupBy({ by: ["packageSlug"], _count: { _all: true } });
  return new Map(rows.map((r) => [r.packageSlug, r._count._all]));
}

export async function getOption(id: string) {
  const row = await prisma.tourOption.findUnique({ where: { id } });
  return row ? toOption(row) : null;
}

export async function getOptionSchedule(optionId: string) {
  const [rules, blocks] = await Promise.all([
    prisma.availabilityRule.findMany({ where: { optionId }, orderBy: { startDate: "asc" } }),
    prisma.availabilityBlock.findMany({ where: { optionId, date: { gte: dbDate(isoDate(new Date(Date.now() - 86400_000))) } }, orderBy: { date: "asc" } }),
  ]);
  return {
    rules: rules.map((r) => ({ id: r.id, startDate: isoDate(r.startDate), endDate: r.endDate ? isoDate(r.endDate) : null, weekdays: r.weekdays, startTimes: r.startTimes, capacity: r.capacity })),
    blocks: blocks.map((b) => ({ id: b.id, date: isoDate(b.date), startTime: b.startTime, reason: b.reason })),
  };
}

type Db = Prisma.TransactionClient | typeof prisma;

async function bookedSeats(db: Db, optionIds: string[], from: string, to: string, excludeBookingId?: string) {
  const rows = await db.booking.groupBy({
    by: ["optionId", "travelDate", "startTime"],
    where: {
      optionId: { in: optionIds },
      travelDate: { gte: dbDate(from), lte: dbDate(to) },
      status: { in: ACTIVE_STATUSES },
      ...(excludeBookingId ? { id: { not: excludeBookingId } } : {}),
    },
    _sum: { totalParticipants: true },
  });
  const byOption = new Map<string, Map<string, number>>();
  for (const row of rows) {
    if (!row.optionId || !row.travelDate || !row.startTime) continue;
    const map = byOption.get(row.optionId) ?? new Map<string, number>();
    map.set(slotKey(isoDate(row.travelDate), row.startTime), row._sum.totalParticipants ?? 0);
    byOption.set(row.optionId, map);
  }
  return byOption;
}

async function loadSchedules(db: Db, optionIds: string[], from: string, to: string) {
  const [rules, blocks] = await Promise.all([
    db.availabilityRule.findMany({
      where: { optionId: { in: optionIds }, startDate: { lte: dbDate(to) }, OR: [{ endDate: null }, { endDate: { gte: dbDate(from) } }] },
    }),
    db.availabilityBlock.findMany({ where: { optionId: { in: optionIds }, date: { gte: dbDate(from), lte: dbDate(to) } } }),
  ]);
  const rulesBy = new Map<string, SlotRule[]>();
  const blocksBy = new Map<string, SlotBlock[]>();
  for (const r of rules) {
    rulesBy.set(r.optionId, [...(rulesBy.get(r.optionId) ?? []), { startDate: isoDate(r.startDate), endDate: r.endDate ? isoDate(r.endDate) : null, weekdays: r.weekdays, startTimes: r.startTimes, capacity: r.capacity }]);
  }
  for (const b of blocks) {
    blocksBy.set(b.optionId, [...(blocksBy.get(b.optionId) ?? []), { date: isoDate(b.date), startTime: b.startTime }]);
  }
  return { rulesBy, blocksBy };
}

/** Slots for each option between two dates (inclusive). */
export async function getAvailability(options: TourOption[], from: string, to: string, { now = new Date(), db = prisma as Db } = {}) {
  const ids = options.map((o) => o.id);
  if (ids.length === 0) return new Map<string, DaySlots[]>();
  const [{ rulesBy, blocksBy }, booked] = await Promise.all([loadSchedules(db, ids, from, to), bookedSeats(db, ids, from, to)]);
  return new Map(
    options.map((option) => [
      option.id,
      computeSlots({
        rules: rulesBy.get(option.id) ?? [],
        blocks: blocksBy.get(option.id) ?? [],
        booked: booked.get(option.id) ?? new Map(),
        from,
        to,
        cutoffHours: option.cutoffHours,
        slotCutoffs: option.slotCutoffs,
        lastMinuteAfterFirst: option.lastMinuteAfterFirst,
        now,
      }),
    ]),
  );
}

const iso = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null);

/** Active special offers, for the pricing */
export async function getActiveOffers(db: Db = prisma): Promise<Offer[]> {
  const rows = await db.specialOffer.findMany({ where: { active: true } });
  return rows.map((r) => ({
    name: r.name,
    type: r.type === "early_bird" || r.type === "last_minute" ? r.type : "dates",
    discountPercent: r.discountPercent,
    packageSlugs: r.packageSlugs,
    days: r.days,
    travelFrom: iso(r.travelFrom),
    travelTo: iso(r.travelTo),
  }));
}

export class SlotUnavailableError extends Error {}

/**
 * Creates a pending booking for an option slot. The seat check and insert run inside one
 * transaction holding an advisory lock for that slot, so two customers can never both take
 * the last seats.
 */
export async function createOptionBooking(input: {
  userId: string;
  packageSlug: string;
  packageTitle: string;
  optionId: string;
  date: string;
  startTime: string;
  language?: string;
  pickupLocation?: string;
  counts: Record<string, number>;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  message?: string;
  answers: { question: string; answer: string }[];
  now?: Date;
}) {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`slot:${input.optionId}:${input.date}:${input.startTime}`}, 0))`;

    const row = await tx.tourOption.findUnique({ where: { id: input.optionId } });
    if (!row || !row.active || row.packageSlug !== input.packageSlug) {
      throw new SlotUnavailableError("This option is no longer available.");
    }
    const option = toOption(row);

    if (option.languages.length > 0 && (!input.language || !option.languages.includes(input.language))) {
      throw new SlotUnavailableError(`Choose a guide language: ${option.languages.join(", ")}.`);
    }

    // Pickup: a listed location, or an address inside the pickup area
    const pickup = input.pickupLocation?.trim().slice(0, 300) || undefined;
    if (option.pickupMode === "locations" && (!pickup || !option.pickupLocations.includes(pickup))) {
      throw new SlotUnavailableError("Choose a pickup location from the list.");
    }
    if (option.pickupMode === "area" && !pickup) throw new SlotUnavailableError("Enter your pickup address or hotel.");

    const offer = bestOffer(await getActiveOffers(tx), input.packageSlug, input.date, sriLankaToday(input.now));
    const priced = quote(option, input.counts, input.date, offer);
    if (!priced.ok) throw new SlotUnavailableError(priced.error);

    const days = (await getAvailability([option], input.date, input.date, { now: input.now, db: tx })).get(option.id) ?? [];
    const slot = days[0]?.slots.find((s) => s.time === input.startTime);
    if (!slot || slot.status === "blocked") throw new SlotUnavailableError("That date and time is not available.");
    if (slot.status === "closed") throw new SlotUnavailableError("Bookings for that time have closed.");
    if (slot.remaining < priced.totalParticipants) {
      throw new SlotUnavailableError(
        slot.remaining === 0 ? "That time is fully booked." : `Only ${slot.remaining} spot${slot.remaining === 1 ? "" : "s"} left at that time.`,
      );
    }

    const travelDate = dbDate(input.date);
    const status = option.instantConfirm ? DbStatus.CONFIRMED : DbStatus.PENDING;
    const actor = option.instantConfirm ? "instant-confirmation" : "customer";
    return tx.booking.create({
      data: {
        userId: input.userId,
        packageSlug: input.packageSlug,
        packageTitle: input.packageTitle,
        optionId: option.id,
        optionTitle: option.title,
        startTime: input.startTime,
        language: option.languages.length > 0 ? input.language : null,
        pickupLocation: option.pickupMode === "none" ? null : pickup,
        offerName: priced.offer?.name,
        discountPercent: priced.offer?.discountPercent,
        status,
        ...(option.instantConfirm ? { confirmedAt: new Date(), confirmedBy: actor } : {}),
        participants: priced.lines,
        totalParticipants: priced.totalParticipants,
        totalPrice: priced.total,
        answers: input.answers,
        customerName: input.customerName,
        customerEmail: input.customerEmail.trim().toLowerCase(),
        customerPhone: input.customerPhone,
        message: input.message ?? "",
        requestedTravelDate: travelDate,
        travelDate,
        history: {
          create: [
            { status: DbStatus.PENDING, actorEmail: "customer", actorUserId: input.userId, travelDate },
            ...(option.instantConfirm ? [{ status: DbStatus.CONFIRMED, actorEmail: actor, travelDate }] : []),
          ],
        },
      },
    });
  });
}

/**
 * Seat check used when an admin moves a booking to another date or re-opens a cancelled one.
 * Runs inside the caller's transaction. Throws when the target slot doesn't have room.
 */
export async function assertSeatsForMove(
  tx: Prisma.TransactionClient,
  booking: { id: string; optionId: string; startTime: string; totalParticipants: number },
  date: string,
) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`slot:${booking.optionId}:${date}:${booking.startTime}`}, 0))`;
  const [{ rulesBy, blocksBy }, booked] = await Promise.all([
    loadSchedules(tx, [booking.optionId], date, date),
    bookedSeats(tx, [booking.optionId], date, date, booking.id),
  ]);
  const [day] = computeSlots({
    rules: rulesBy.get(booking.optionId) ?? [],
    blocks: blocksBy.get(booking.optionId) ?? [],
    booked: booked.get(booking.optionId) ?? new Map(),
    from: date,
    to: date,
    cutoffHours: 0,
    now: new Date(0),
  });
  const slot = day?.slots.find((s) => s.time === booking.startTime);
  // Admins may arrange a booking outside the published schedule; only a real slot has a seat limit
  if (slot && slot.remaining < booking.totalParticipants) {
    throw new SlotUnavailableError(
      `Not enough spots: ${slot.remaining} left at ${booking.startTime} on ${date}, this booking needs ${booking.totalParticipants}.`,
    );
  }
}
