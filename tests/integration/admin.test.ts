import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/db";
import { createBooking } from "@/lib/bookings";
import { fakeSession, makeUser, resetDatabase } from "../helpers";

// --- Mocks for Next.js / Auth.js runtime pieces -----------------------------
const authMock = vi.hoisted(() => vi.fn());
vi.mock("@/auth", () => ({ auth: authMock }));
// redirect() throws in Next.js; capture the target URL instead
class RedirectSignal extends Error {
  constructor(public url: string) {
    super("NEXT_REDIRECT");
  }
}
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new RedirectSignal(url);
  },
}));
vi.mock("next/headers", () => ({ headers: async () => new Headers({ host: "localhost:3000" }) }));

const sendMock = vi.hoisted(() => vi.fn());
vi.mock("resend", () => ({
  Resend: class {
    emails = { send: sendMock };
  },
}));

const { getAdminSession } = await import("@/lib/auth/admin");
const { updateBookingAction } = await import("@/app/admin/bookings/actions");
const { sendBookingStatusEmail } = await import("@/lib/email");

beforeEach(async () => {
  await resetDatabase();
  authMock.mockReset();
  sendMock.mockReset();
  delete process.env.RESEND_API_KEY;
});

async function setup() {
  const admin = await makeUser("admin@example.test", "Admin");
  const customer = await makeUser("customer@example.test", "Customer");
  const booking = await createBooking({
    userId: customer.id,
    packageSlug: "ella-drop-tour-via-nuwara-eliya",
    packageTitle: "Ella Drop Tour",
    customerName: "Customer",
    customerEmail: "customer@example.test",
    message: "Please book",
    travelDate: "2026-12-20",
  });
  return { admin, customer, booking };
}

function form(fields: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

const confirmForm = (bookingId: string, extra: Record<string, string> = {}) =>
  form({ bookingId, status: "confirmed", version: "0", message: "Pickup 7 AM", filter: "pending", ...extra });

/** Runs the action: success ends in a redirect (returned as { redirect }), errors return state. */
async function act(data: FormData) {
  try {
    return await updateBookingAction({ ok: false }, data);
  } catch (error) {
    if (error instanceof RedirectSignal) return { redirect: error.url };
    throw error;
  }
}

describe("getAdminSession (server-side admin check)", () => {
  it("denies logged-out users", async () => {
    authMock.mockResolvedValue(null);
    expect(await getAdminSession()).toBeNull();
  });

  it("denies normal customers", async () => {
    const { customer } = await setup();
    authMock.mockResolvedValue(fakeSession(customer));
    expect(await getAdminSession()).toBeNull();
  });

  it("allows admins listed in ADMIN_EMAILS (case-insensitive)", async () => {
    const { admin } = await setup();
    authMock.mockResolvedValue(fakeSession({ ...admin, email: "ADMIN@example.test" }));
    expect(await getAdminSession()).not.toBeNull();
  });

  it("denies a session whose admin email no longer matches a real account", async () => {
    const { customer } = await setup();
    // Customer's id with a forged admin email
    authMock.mockResolvedValue(fakeSession({ id: customer.id, email: "admin@example.test" }));
    expect(await getAdminSession()).toBeNull();
  });

  it("ignores a client-side isAdmin flag", async () => {
    const { customer } = await setup();
    authMock.mockResolvedValue({ ...fakeSession(customer), user: { ...fakeSession(customer).user, isAdmin: true } });
    expect(await getAdminSession()).toBeNull();
  });
});

describe("updateBookingAction authorization", () => {
  it("rejects logged-out users and changes nothing", async () => {
    const { booking } = await setup();
    authMock.mockResolvedValue(null);
    const result = await updateBookingAction({ ok: false }, confirmForm(booking.id));
    expect(result).toEqual({ ok: false, message: "You are not authorised to manage bookings." });
    expect((await prisma.booking.findUniqueOrThrow({ where: { id: booking.id } })).status).toBe("PENDING");
  });

  it.each(["confirmed", "cancelled"])("prevents a customer from setting status %s on their own booking", async (status) => {
    const { customer, booking } = await setup();
    authMock.mockResolvedValue(fakeSession(customer));
    const result = await updateBookingAction({ ok: false }, confirmForm(booking.id, { status }));
    expect(result.ok).toBe(false);
    const row = await prisma.booking.findUniqueOrThrow({ where: { id: booking.id }, include: { history: true } });
    expect(row.status).toBe("PENDING");
    expect(row.adminMessage).toBeNull();
    expect(row.history).toHaveLength(1);
  });

  it("validates input server-side", async () => {
    const { admin, booking } = await setup();
    authMock.mockResolvedValue(fakeSession(admin));
    expect((await updateBookingAction({ ok: false }, confirmForm("not-a-uuid"))).ok).toBe(false);
    expect((await updateBookingAction({ ok: false }, confirmForm(booking.id, { status: "deleted" }))).ok).toBe(false);
    expect((await updateBookingAction({ ok: false }, confirmForm(booking.id, { travelDate: "2026-02-31" }))).ok).toBe(false);
  });
});

describe("updateBookingAction as admin", () => {
  it("confirms, records the admin and keeps working when email is disabled", async () => {
    const { admin, booking } = await setup();
    authMock.mockResolvedValue(fakeSession(admin));

    const result = await act(confirmForm(booking.id, { notify: "on", travelDate: "2026-12-21" }));

    expect(result).toEqual({ redirect: "/admin/bookings?status=pending&notice=confirmed&email=not-sent" });
    expect(sendMock).not.toHaveBeenCalled();
    const row = await prisma.booking.findUniqueOrThrow({ where: { id: booking.id }, include: { history: true } });
    expect(row).toMatchObject({ status: "CONFIRMED", confirmedBy: "admin@example.test", adminMessage: "Pickup 7 AM" });
    expect(row.travelDate?.toISOString().slice(0, 10)).toBe("2026-12-21");
    expect(row.history.at(-1)).toMatchObject({ status: "CONFIRMED", actorUserId: admin.id });
  });

  it("sends the customer email when enabled and selected", async () => {
    const { admin, booking } = await setup();
    authMock.mockResolvedValue(fakeSession(admin));
    process.env.RESEND_API_KEY = "re_test";
    sendMock.mockResolvedValue({ data: { id: "email-1" }, error: null });

    const result = await act(confirmForm(booking.id, { notify: "on", filter: "upcoming" }));

    expect(result).toEqual({ redirect: "/admin/bookings?status=upcoming&notice=confirmed&email=sent" });
    expect(sendMock).toHaveBeenCalledTimes(1);
    const email = sendMock.mock.calls[0][0];
    expect(email.to).toBe("customer@example.test");
    expect(email.html).toContain("Pickup 7 AM");
    expect(email.html).toContain("http://localhost:3000/profile");
  });

  it("does not email when the admin unticks the option", async () => {
    const { admin, booking } = await setup();
    authMock.mockResolvedValue(fakeSession(admin));
    process.env.RESEND_API_KEY = "re_test";
    const result = await act(confirmForm(booking.id));
    expect(result).toEqual({ redirect: "/admin/bookings?status=pending&notice=confirmed" });
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("an email failure does not undo the committed booking change", async () => {
    const { admin, booking } = await setup();
    authMock.mockResolvedValue(fakeSession(admin));
    process.env.RESEND_API_KEY = "re_test";
    sendMock.mockRejectedValue(new Error("Resend is down"));

    const result = await act(confirmForm(booking.id, { status: "cancelled", notify: "on" }));

    expect(result).toEqual({ redirect: "/admin/bookings?status=pending&notice=cancelled&email=not-sent" });
    const row = await prisma.booking.findUniqueOrThrow({ where: { id: booking.id } });
    expect(row).toMatchObject({ status: "CANCELLED", cancelledBy: "admin@example.test" });
  });

  it("reports a conflict when another admin already changed the booking", async () => {
    const { admin, booking } = await setup();
    authMock.mockResolvedValue(fakeSession(admin));
    expect(await act(confirmForm(booking.id))).toHaveProperty("redirect");
    // Second submission still based on version 0
    const stale = await act(confirmForm(booking.id, { status: "cancelled" }));
    expect(stale).toEqual({
      ok: false,
      message: "This booking was changed by someone else. Reload the page and try again.",
    });
  });

  it("only redirects to known admin tabs (no open redirect via the filter field)", async () => {
    const { admin, booking } = await setup();
    authMock.mockResolvedValue(fakeSession(admin));
    const result = await act(confirmForm(booking.id, { filter: "https://evil.example/phish" }));
    expect(result).toEqual({ redirect: "/admin/bookings?status=pending&notice=confirmed" });
  });

  it("reopens a handled booking with a new history entry", async () => {
    const { admin, booking } = await setup();
    authMock.mockResolvedValue(fakeSession(admin));
    await act(confirmForm(booking.id, { status: "cancelled" }));
    const result = await act(form({ bookingId: booking.id, status: "pending", version: "1", filter: "cancelled" }));
    expect(result).toEqual({ redirect: "/admin/bookings?status=cancelled&notice=pending" });
    const history = await prisma.bookingStatusHistory.findMany({ where: { bookingId: booking.id }, orderBy: { createdAt: "asc" } });
    expect(history.map((h) => h.status)).toEqual(["PENDING", "CANCELLED", "PENDING"]);
  });
});

describe("booking email content", () => {
  it("escapes admin-entered HTML", async () => {
    const { booking } = await setup();
    process.env.RESEND_API_KEY = "re_test";
    sendMock.mockResolvedValue({ data: { id: "1" }, error: null });
    await sendBookingStatusEmail(
      { ...booking, status: "confirmed", adminMessage: `<img src=x onerror="alert(1)">` },
      "https://ceylonittours.com",
    );
    const html: string = sendMock.mock.calls[0][0].html;
    expect(html).not.toContain("<img");
    expect(html).toContain("&lt;img src=x onerror=&quot;alert(1)&quot;&gt;");
  });

  it("returns false without throwing when Resend is not configured", async () => {
    const { booking } = await setup();
    await expect(sendBookingStatusEmail({ ...booking, status: "confirmed" }, "https://x")).resolves.toBe(false);
  });
});
