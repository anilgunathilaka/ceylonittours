import { beforeEach, describe, expect, it, vi } from "vitest";
import { compare, hash } from "bcryptjs";
import { prisma } from "@/lib/db";
import { resetRateLimits } from "@/lib/rate-limit";
import { resetDatabase } from "../helpers";

const sendMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/email", () => ({ sendPasswordResetEmail: sendMock }));

const { POST: forgot } = await import("@/app/api/auth/forgot-password/route");
const { POST: reset } = await import("@/app/api/auth/reset-password/route");

process.env.AUTH_SECRET = "integration-secret";
process.env.AUTH_URL = "https://www.ceylonittours.com/";

const post = (body: unknown, headers: Record<string, string> = {}) =>
  new Request("http://localhost:3000/api", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });

async function requestLink(email: string, headers?: Record<string, string>) {
  sendMock.mockClear();
  const res = await forgot(post({ email }, headers));
  const url = sendMock.mock.calls[0]?.[1] as string | undefined;
  return { res, body: await res.json(), url, token: url ? new URL(url).searchParams.get("token")! : undefined };
}

describe("forgot / reset password", () => {
  beforeEach(async () => {
    await resetDatabase();
    resetRateLimits();
    await prisma.user.create({
      data: { email: "sam@test.local", name: "Sam", passwordHash: await hash("old-password", 4) },
    });
  });

  it("gives the same reply for unknown emails and sends nothing", async () => {
    const known = await requestLink("SAM@test.local");
    const unknown = await requestLink("nobody@test.local");
    expect(known.res.status).toBe(200);
    expect(unknown.res.status).toBe(200);
    expect(unknown.body).toEqual(known.body);
    expect(known.url).toBeDefined();
    expect(unknown.url).toBeUndefined();
  });

  it("builds the link from AUTH_URL, never from the request's host", async () => {
    const { url } = await requestLink("sam@test.local", { host: "evil.example", "x-forwarded-host": "evil.example" });
    expect(url).toMatch(/^https:\/\/www\.ceylonittours\.com\/reset-password\?token=/);
  });

  it("resets the password once, then the same link stops working", async () => {
    const { token } = await requestLink("sam@test.local");

    const first = await reset(post({ token, password: "new-password-1", confirmPassword: "new-password-1" }));
    expect(first.status).toBe(200);
    const user = await prisma.user.findUniqueOrThrow({ where: { email: "sam@test.local" } });
    expect(await compare("new-password-1", user.passwordHash!)).toBe(true);

    const again = await reset(post({ token, password: "new-password-2", confirmPassword: "new-password-2" }));
    expect(again.status).toBe(400);
    expect((await again.json()).error).toMatch(/invalid or has expired/);
  });

  it("rejects mismatched passwords and forged tokens", async () => {
    const { token } = await requestLink("sam@test.local");
    const mismatch = await reset(post({ token, password: "new-password-1", confirmPassword: "different-1" }));
    expect(mismatch.status).toBe(400);

    const forged = await reset(post({ token: `${token}x`, password: "new-password-1", confirmPassword: "new-password-1" }));
    expect(forged.status).toBe(400);

    const user = await prisma.user.findUniqueOrThrow({ where: { email: "sam@test.local" } });
    expect(await compare("old-password", user.passwordHash!)).toBe(true);
  });

  it("limits how many emails one address can receive", async () => {
    for (let i = 0; i < 3; i++) expect((await requestLink("sam@test.local")).url).toBeDefined();
    const fourth = await requestLink("sam@test.local");
    expect(fourth.res.status).toBe(200);
    expect(fourth.url).toBeUndefined();
  });
});
