import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/db";
import { addDays, sriLankaToday } from "@/lib/products/slots";
import { fakeSession, makeUser, resetDatabase } from "../helpers";

const authMock = vi.hoisted(() => vi.fn());
vi.mock("@/auth", () => ({ auth: authMock }));
vi.mock("@/sanity/lib/client", () => ({ client: { fetch: vi.fn() } }));
vi.mock("next/cache", () => ({
  // Outside Next.js there is no cache store: run the wrapped function directly
  unstable_cache: <T extends (...args: never[]) => unknown>(fn: T) => fn,
  revalidatePath: vi.fn(),
  updateTag: vi.fn(),
}));
vi.mock("next/headers", () => ({ headers: async () => new Headers({ host: "localhost:3000" }) }));

const { POST: book } = await import("@/app/api/bookings/route");
const { setPickupTimeAction, sendBulkMessageAction } = await import("@/app/admin/bookings/operations-actions");
const { bulkAvailabilityAction } = await import("@/app/admin/products/bulk-actions");
const { sendCustomerMessageAction } = await import("@/app/profile/messages-actions");

const SLUG = "ella-drop-tour-via-nuwara-eliya";
const DATE = addDays(sriLankaToday(), 40);

beforeEach(async () => {
  await resetDatabase();
  authMock.mockReset();
  delete process.env.RESEND_API_KEY;
});

async function option(extra: object = {}) {
  const o = await prisma.tourOption.create({
    data: { packageSlug: SLUG, title: "Shared", prices: [{ category: "adult", label: "Adult", price: 50 }], ...extra },
  });
  await prisma.availabilityRule.create({ data: { optionId: o.id, startDate: new Date(`${sriLankaToday()}T00:00:00Z`), startTimes: ["08:00"], capacity: 10 } });
  return o;
}

const request = (optionId: string, extra: object = {}) =>
  book(
    new Request("http://localhost/api/bookings", {
      method: "POST",
      body: JSON.stringify({ packageSlug: SLUG, optionId, date: DATE, startTime: "08:00", counts: { adult: 2 }, name: "Kasun Perera", phone: "+44 7700 900123", ...extra }),
    }),
  );

const form = (values: Record<string, string | string[]>) => {
  const data = new FormData();
  for (const [k, v] of Object.entries(values)) for (const item of [v].flat()) data.append(k, item);
  return data;
};

async function admin() {
  const user = await makeUser("admin@example.test", "Admin");
  authMock.mockResolvedValue(fakeSession(user));
  return user;
}

describe("instant confirmation, pickup and offers", () => {
  it("confirms instantly, saves the pickup and applies the best offer", async () => {
    const user = await makeUser("guest@example.test");
    authMock.mockResolvedValue(fakeSession(user));
    const o = await option({ instantConfirm: true, pickupMode: "locations", pickupLocations: ["Hotel Suisse", "Queens Hotel"] });
    await prisma.specialOffer.createMany({
      data: [
        { name: "Book early", type: "early_bird", discountPercent: 10, days: 30 },
        { name: "Paused deal", type: "early_bird", discountPercent: 50, days: 0, active: false },
      ],
    });

    expect((await request(o.id)).status).toBe(409); // pickup missing
    expect((await request(o.id, { pickupLocation: "Somewhere else" })).status).toBe(409);
    const res = await request(o.id, { pickupLocation: "Queens Hotel" });
    expect(await res.json()).toMatchObject({ ok: true, status: "confirmed" });

    const saved = await prisma.booking.findFirstOrThrow({ include: { history: true } });
    expect(saved).toMatchObject({ status: "CONFIRMED", pickupLocation: "Queens Hotel", totalPrice: 90, offerName: "Book early", discountPercent: 10, confirmedBy: "instant-confirmation" });
    expect(saved.history.map((h) => h.status).sort()).toEqual(["CONFIRMED", "PENDING"]);
  });
});

describe("admin operations", () => {
  it("sets pickup times and tells the customer", async () => {
    const guest = await makeUser("guest@example.test");
    authMock.mockResolvedValue(fakeSession(guest));
    const o = await option({ pickupMode: "area", pickupArea: "Kandy city" });
    await request(o.id, { pickupLocation: "Earl's Regency" });
    const booking = await prisma.booking.findFirstOrThrow();

    await admin();
    const result = await setPickupTimeAction({ ok: false }, form({ bookingId: booking.id, pickupTime: "07:15", notify: "on" }));
    expect(result.ok).toBe(true);
    expect((await prisma.booking.findUniqueOrThrow({ where: { id: booking.id } })).pickupTime).toBe("07:15");
    const [message] = await prisma.bookingMessage.findMany();
    expect(message).toMatchObject({ sender: "team", body: expect.stringContaining("07:15 from Earl's Regency") });

    expect((await setPickupTimeAction({ ok: false }, form({ bookingId: booking.id, pickupTime: "7am" }))).ok).toBe(false);
  });

  it("messages everyone travelling on a date, and customers can only reply on their own bookings", async () => {
    const guest = await makeUser("guest@example.test");
    const other = await makeUser("other@example.test");
    authMock.mockResolvedValue(fakeSession(guest));
    const o = await option();
    await request(o.id);
    await request(o.id);
    const [mine] = await prisma.booking.findMany();

    await admin();
    const sent = await sendBulkMessageAction({ ok: false }, form({ date: DATE, body: "Rain expected — bring a jacket." }));
    expect(sent).toMatchObject({ ok: true, message: expect.stringContaining("2 bookings") });
    expect(await prisma.bookingMessage.count({ where: { sender: "team" } })).toBe(2);

    authMock.mockResolvedValue(fakeSession(other));
    expect((await sendCustomerMessageAction({ ok: false }, form({ bookingId: mine.id, body: "Not my booking" }))).ok).toBe(false);
    authMock.mockResolvedValue(fakeSession(guest));
    expect((await sendCustomerMessageAction({ ok: false }, form({ bookingId: mine.id, body: "Thanks, we will!" }))).ok).toBe(true);
    expect(await prisma.bookingMessage.count({ where: { sender: "customer" } })).toBe(1);
  });

  it("refuses operations for non-admins", async () => {
    const guest = await makeUser("guest@example.test");
    authMock.mockResolvedValue(fakeSession(guest));
    expect((await sendBulkMessageAction({ ok: false }, form({ date: DATE, body: "Hello all" }))).ok).toBe(false);
    expect(await prisma.bookingMessage.count()).toBe(0);
  });

  it("blocks and reopens dates in bulk on chosen weekdays", async () => {
    const a = await option();
    const b = await option();
    await admin();
    const from = DATE;
    const to = addDays(DATE, 13);
    const blocked = await bulkAvailabilityAction({ ok: false }, form({ optionIds: [a.id, b.id], from, to, weekdays: ["0", "6"], mode: "block" }));
    expect(blocked.ok).toBe(true);
    expect(await prisma.availabilityBlock.count()).toBe(8); // 4 weekend days × 2 options

    // Blocking again replaces rather than duplicates
    await bulkAvailabilityAction({ ok: false }, form({ optionIds: [a.id, b.id], from, to, weekdays: ["0", "6"], mode: "block" }));
    expect(await prisma.availabilityBlock.count()).toBe(8);

    await bulkAvailabilityAction({ ok: false }, form({ optionIds: [a.id], from, to, weekdays: ["0", "1", "2", "3", "4", "5", "6"], mode: "unblock" }));
    expect(await prisma.availabilityBlock.count()).toBe(4);
  });
});
