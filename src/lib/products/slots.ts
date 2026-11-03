/**
 * Turns availability rules, blocked dates and existing bookings into bookable time slots.
 * Pure (no database), so the booking API, the admin calendar and the tests share one source of truth.
 *
 * Dates are "YYYY-MM-DD" and times "HH:MM", both in Sri Lanka time (UTC+05:30, no daylight saving).
 */

export const SRI_LANKA_OFFSET = "+05:30";

export type SlotRule = { startDate: string; endDate?: string | null; weekdays: number[]; startTimes: string[]; capacity: number };
export type SlotBlock = { date: string; startTime?: string | null };

export type SlotStatus = "available" | "full" | "blocked" | "closed";
export type Slot = { time: string; capacity: number; booked: number; remaining: number; status: SlotStatus };
export type DaySlots = { date: string; slots: Slot[] };

/** Key for booked-seat counts */
export const slotKey = (date: string, time: string) => `${date}|${time}`;

export const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
export const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function addDays(date: string, days: number) {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

const weekday = (date: string) => new Date(`${date}T00:00:00Z`).getUTCDay();

/** The instant a slot starts */
export const slotStart = (date: string, time: string) => new Date(`${date}T${time}:00${SRI_LANKA_OFFSET}`);

/** Today's date in Sri Lanka */
export function sriLankaToday(now = new Date()) {
  return new Date(now.getTime() + 5.5 * 3600_000).toISOString().slice(0, 10);
}

export function computeSlots({
  rules,
  blocks,
  booked,
  from,
  to,
  cutoffHours,
  slotCutoffs = {},
  lastMinuteAfterFirst = false,
  now = new Date(),
}: {
  rules: SlotRule[];
  blocks: SlotBlock[];
  /** Seats already held, by slotKey */
  booked: Map<string, number>;
  from: string;
  to: string;
  cutoffHours: number;
  /** Cut-off hours per start time, overriding cutoffHours */
  slotCutoffs?: Record<string, number>;
  /** After a slot's first booking, accept bookings until it starts */
  lastMinuteAfterFirst?: boolean;
  now?: Date;
}): DaySlots[] {
  const days: DaySlots[] = [];

  const cutoffFor = (time: string, held: number) => {
    if (lastMinuteAfterFirst && held > 0) return 0;
    const override = slotCutoffs[time];
    return typeof override === "number" && override >= 0 ? override : cutoffHours;
  };

  for (let date = from; date <= to; date = addDays(date, 1)) {
    // A time offered by several overlapping rules uses the largest capacity
    const capacityByTime = new Map<string, number>();
    for (const rule of rules) {
      if (date < rule.startDate || (rule.endDate && date > rule.endDate)) continue;
      if (!rule.weekdays.includes(weekday(date))) continue;
      for (const time of rule.startTimes) {
        capacityByTime.set(time, Math.max(capacityByTime.get(time) ?? 0, rule.capacity));
      }
    }
    if (capacityByTime.size === 0) continue;

    const dayBlocked = blocks.some((b) => b.date === date && !b.startTime);
    const slots = [...capacityByTime.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([time, capacity]): Slot => {
        const held = booked.get(slotKey(date, time)) ?? 0;
        const remaining = Math.max(capacity - held, 0);
        let status: SlotStatus = "available";
        if (dayBlocked || blocks.some((b) => b.date === date && b.startTime === time)) status = "blocked";
        else if (slotStart(date, time).getTime() <= now.getTime() + cutoffFor(time, held) * 3600_000) status = "closed";
        else if (remaining === 0) status = "full";
        return { time, capacity, booked: held, remaining, status };
      });
    days.push({ date, slots });
  }
  return days;
}
