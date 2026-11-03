import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/db";
import { updateBookingStatus } from "@/lib/bookings";
import { addDays, sriLankaToday } from "@/lib/products/slots";
import { fakeSession, makeUser, resetDatabase } from "../helpers";

const authMock = vi.hoisted(() => vi.fn());
vi.mock("@/auth", () => ({ auth: authMock }));
vi.mock("@/sanity/lib/client", () => ({ client: { fetch: vi.fn() } }));

const { POST: book } = await import("@/app/api/bookings/route");
const { GET: availability } = await import("@/app/api/availability/route");

// A package from the local fallback data (content source is not the database in tests)
const SLUG = "ella-drop-tour-via-nuwara-eliya";
const DATE = addDays(sriLankaToday(), 10);

async function makeOption(capacity = 4) {
  const option = await prisma.tourOption.create({
    data: {
      packageSlug: SLUG,
      title: "Shared tour",
      prices: [
        { category: "adult", label: "Adult", price: 50 },
        { category: "child", label: "Child", price: 25 },
      ],
      seasons: [{ name: "Peak", start: DATE, end: DATE, adjustPercent: 10 }],
      maxParticipants: 6,
    },
  });
  await prisma.availabilityRule.create({
    data: { optionId: option.id, startDate: new Date(`${sriLankaToday()}T00:00:00Z`), startTimes: ["08:00", "14:00"], capacity },
  });
  return option;
}

const post = (body: unknown) => book(new Request("http://localhost/api/bookings", { method: "POST", body: JSON.stringify(body) }));
const request = (optionId: string, counts: Record<string, number>, extra: object = {}) =>
  post({ packageSlug: SLUG, optionId, date: DATE, startTime: "08:00", counts, name: "Kasun Perera", phone: "+94 77 123 4567", ...extra });

beforeEach(async () => {
  await resetDatabase();
  authMock.mockReset();
  delete process.env.RESEND_API_KEY;
});

describe("booking widget", () => {
  it("prices the booking on the server, applies the season and saves it as pending, pay on arrival", async () => {
    const user = await makeUser("guest@example.test");
    authMock.mockResolvedValue(fakeSession(user));
    const option = await makeOption();

    const res = await request(option.id, { adult: 2, child: 1 });
    expect(res.status).toBe(200);

    const booking = await prisma.booking.findFirstOrThrow({ where: { userId: user.id } });
    expect(booking).toMatchObject({
      status: "PENDING",
      optionId: option.id,
      optionTitle: "Shared tour",
      startTime: "08:00",
      totalParticipants: 3,
      totalPrice: 137.5, // (2 × 55) + (1 × 27.5)
      paymentMethod: "pay_on_arrival",
      customerEmail: "guest@example.test",
    });
  });

  it("never sells more seats than the slot has, even with simultaneous requests", async () => {
    const user = await makeUser("guest@example.test");
    authMock.mockResolvedValue(fakeSession(user));
    const option = await makeOption(4);

    const results = await Promise.all([1, 2, 3].map(() => request(option.id, { adult: 2 })));
    expect(results.map((r) => r.status).sort()).toEqual([200, 200, 409]);

    const held = await prisma.booking.aggregate({ where: { optionId: option.id }, _sum: { totalParticipants: true } });
    expect(held._sum.totalParticipants).toBe(4);

    // The other start time still has room
    expect((await request(option.id, { adult: 2 }, { startTime: "14:00" })).status).toBe(200);
  });

  it("frees seats when a booking is cancelled and refuses to re-open it once the slot is full", async () => {
    const user = await makeUser("guest@example.test");
    authMock.mockResolvedValue(fakeSession(user));
    const option = await makeOption(2);

    await request(option.id, { adult: 2 });
    const first = await prisma.booking.findFirstOrThrow();
    expect((await request(option.id, { adult: 1 })).status).toBe(409);

    await updateBookingStatus(first.id, { status: "cancelled", expectedVersion: 0, actorEmail: "admin@example.test" });
    expect((await request(option.id, { adult: 2 })).status).toBe(200);

    await expect(
      updateBookingStatus(first.id, { status: "pending", expectedVersion: 1, actorEmail: "admin@example.test" }),
    ).rejects.toThrow(/Not enough spots/);
  });

  it("rejects blocked dates, past cut-off, unknown options and guest limits", async () => {
    const user = await makeUser("guest@example.test");
    authMock.mockResolvedValue(fakeSession(user));
    const option = await makeOption();

    await prisma.availabilityBlock.create({ data: { optionId: option.id, date: new Date(`${DATE}T00:00:00Z`) } });
    expect((await request(option.id, { adult: 1 })).status).toBe(409);

    // Today's 08:00 is inside the 24-hour cut-off
    expect((await request(option.id, { adult: 1 }, { date: sriLankaToday() })).status).toBe(409);
    expect((await request(option.id, { adult: 7 }, { date: addDays(DATE, 1) })).status).toBe(409);
    expect((await request(crypto.randomUUID(), { adult: 1 })).status).toBe(409);
    expect(await prisma.booking.count()).toBe(0);
  });

  it("requires one of the option's guide languages and saves it", async () => {
    const user = await makeUser("guest@example.test");
    authMock.mockResolvedValue(fakeSession(user));
    const option = await makeOption();
    await prisma.tourOption.update({ where: { id: option.id }, data: { languages: ["English", "German"] } });

    expect((await request(option.id, { adult: 1 })).status).toBe(409);
    expect((await request(option.id, { adult: 1 }, { language: "French" })).status).toBe(409);
    expect((await request(option.id, { adult: 1 }, { language: "German" })).status).toBe(200);
    expect((await prisma.booking.findFirstOrThrow()).language).toBe("German");
  });

  it("requires sign-in", async () => {
    authMock.mockResolvedValue(null);
    const option = await makeOption();
    expect((await request(option.id, { adult: 1 })).status).toBe(401);
  });
});

describe("GET /api/availability", () => {
  it("returns seats left per slot and hides inactive options", async () => {
    const user = await makeUser("guest@example.test");
    authMock.mockResolvedValue(fakeSession(user));
    const option = await makeOption(4);
    await prisma.tourOption.create({ data: { packageSlug: SLUG, title: "Hidden", active: false } });
    await request(option.id, { adult: 3 });

    const res = await availability(new Request(`http://localhost/api/availability?package=${SLUG}&from=${DATE}&to=${DATE}`));
    const body = await res.json();
    expect(body.options).toHaveLength(1);
    expect(body.options[0].days[0].slots).toEqual([
      { time: "08:00", remaining: 1, status: "available" },
      { time: "14:00", remaining: 4, status: "available" },
    ]);
  });

  it("rejects bad ranges", async () => {
    const res = await availability(new Request(`http://localhost/api/availability?package=${SLUG}&from=${DATE}&to=${addDays(DATE, 100)}`));
    expect(res.status).toBe(400);
  });
});
