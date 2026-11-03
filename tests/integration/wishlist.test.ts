import { beforeEach, describe, expect, it, vi } from "vitest";
import { fakeSession, makeUser, resetDatabase } from "../helpers";

const authMock = vi.hoisted(() => vi.fn());
vi.mock("@/auth", () => ({ auth: authMock }));

const { GET, POST } = await import("@/app/api/wishlist/route");

const post = (body: unknown) => POST(new Request("http://localhost/api/wishlist", { method: "POST", body: JSON.stringify(body) }));

beforeEach(async () => {
  await resetDatabase();
  authMock.mockReset();
});

describe("wishlist", () => {
  it("saves and removes tours for the signed-in user only", async () => {
    const user = await makeUser("saver@example.test");
    const other = await makeUser("other@example.test");
    authMock.mockResolvedValue(fakeSession(user));

    expect((await post({ slug: "kandy-day-tour", saved: true })).status).toBe(200);
    expect((await post({ slug: "kandy-day-tour", saved: true })).status).toBe(200); // idempotent
    expect((await post({ slug: "ella-trip", saved: true })).status).toBe(200);
    expect((await post({ slug: "ella-trip", saved: false })).status).toBe(200);
    expect(await (await GET()).json()).toEqual({ slugs: ["kandy-day-tour"] });

    authMock.mockResolvedValue(fakeSession(other));
    expect(await (await GET()).json()).toEqual({ slugs: [] });
  });

  it("requires sign-in to save and rejects bad slugs", async () => {
    authMock.mockResolvedValue(null);
    expect((await post({ slug: "kandy-day-tour", saved: true })).status).toBe(401);
    expect(await (await GET()).json()).toEqual({ slugs: [] });

    authMock.mockResolvedValue(fakeSession(await makeUser("saver@example.test")));
    expect((await post({ slug: "../etc", saved: true })).status).toBe(400);
  });
});
