import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/db";
import { fakeSession, makeUser, resetDatabase } from "../helpers";

const authMock = vi.hoisted(() => vi.fn());
vi.mock("@/auth", () => ({ auth: authMock }));
// Sanity isn't configured in tests, so content comes from the local package data
vi.mock("@/sanity/lib/client", () => ({ client: { fetch: vi.fn() } }));

const { POST } = await import("@/app/api/contact/route");

const SLUG = "ella-drop-tour-via-nuwara-eliya";

beforeEach(async () => {
  await resetDatabase();
  authMock.mockReset();
  delete process.env.RESEND_API_KEY;
});

const post = (body: unknown) =>
  POST(new Request("http://localhost/api/contact", { method: "POST", body: JSON.stringify(body) }));

const enquiry = {
  name: "Kasun",
  email: "typed-in@example.test",
  message: "Two adults, <script>alert(1)</script>",
  travelDate: "2026-12-20",
};

describe("POST /api/contact", () => {
  it("creates a pending booking for a signed-in user using the server-side package title and account email", async () => {
    const user = await makeUser("owner@example.test");
    authMock.mockResolvedValue(fakeSession(user));

    const res = await post({ ...enquiry, packageSlug: SLUG, packageTitle: "Forged title" });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, sent: false });

    const [booking] = await prisma.booking.findMany({ where: { userId: user.id } });
    expect(booking.packageTitle).not.toBe("Forged title");
    expect(booking.customerEmail).toBe("owner@example.test");
    expect(booking.status).toBe("PENDING");
  });

  it("rejects unknown package references", async () => {
    const user = await makeUser("owner@example.test");
    authMock.mockResolvedValue(fakeSession(user));
    const res = await post({ ...enquiry, packageSlug: "does-not-exist" });
    expect(res.status).toBe(400);
    expect(await prisma.booking.count()).toBe(0);
  });

  it("requires login to book a package", async () => {
    authMock.mockResolvedValue(null);
    const res = await post({ ...enquiry, packageSlug: SLUG });
    expect(res.status).toBe(401);
    expect(await prisma.booking.count()).toBe(0);
  });

  it("keeps general enquiries (no package) public", async () => {
    authMock.mockResolvedValue(null);
    const res = await post(enquiry);
    expect(res.status).toBe(200);
    expect(await prisma.booking.count()).toBe(0);
  });

  it("validates input", async () => {
    authMock.mockResolvedValue(null);
    expect((await post({ ...enquiry, email: "nope" })).status).toBe(400);
    expect((await post({ ...enquiry, travelDate: "tomorrow" })).status).toBe(400);
  });
});
