import { describe, expect, it } from "vitest";
import { createResetToken, readResetToken, RESET_TOKEN_TTL_MS, verifyResetToken } from "@/lib/auth/password-reset";
import { rateLimit, resetRateLimits } from "@/lib/rate-limit";

const SECRET = "test-secret";
const user = { id: "user-1", passwordHash: "$2a$12$hash-one" };

describe("password reset tokens", () => {
  it("accepts a fresh token for the same user and password", () => {
    const token = createResetToken(user, SECRET);
    expect(readResetToken(token)?.uid).toBe("user-1");
    expect(verifyResetToken(token, user, SECRET)).toBe(true);
  });

  it("stops working once the password has changed (single use)", () => {
    const token = createResetToken(user, SECRET);
    expect(verifyResetToken(token, { ...user, passwordHash: "$2a$12$hash-two" }, SECRET)).toBe(false);
  });

  it("expires", () => {
    const now = Date.now();
    const token = createResetToken(user, SECRET, now);
    expect(verifyResetToken(token, user, SECRET, now + RESET_TOKEN_TTL_MS - 1)).toBe(true);
    expect(verifyResetToken(token, user, SECRET, now + RESET_TOKEN_TTL_MS)).toBe(false);
  });

  it("rejects tampering, other users and other secrets", () => {
    const token = createResetToken(user, SECRET);
    const [payload, signature] = token.split(".");
    const forged = Buffer.from(JSON.stringify({ uid: "user-2", exp: Date.now() + 1e9 })).toString("base64url");

    expect(verifyResetToken(`${forged}.${signature}`, { id: "user-2", passwordHash: "x" }, SECRET)).toBe(false);
    expect(verifyResetToken(`${payload}.${signature}x`, user, SECRET)).toBe(false);
    expect(verifyResetToken(token, { ...user, id: "user-2" }, SECRET)).toBe(false);
    expect(verifyResetToken(token, user, "other-secret")).toBe(false);
    expect(readResetToken("not-a-token")).toBeNull();
    expect(readResetToken(`${payload}.${signature}.extra`)).toBeNull();
  });

  it("works for accounts without a password (Google sign-in)", () => {
    const googleUser = { id: "user-3", passwordHash: null };
    const token = createResetToken(googleUser, SECRET);
    expect(verifyResetToken(token, googleUser, SECRET)).toBe(true);
    expect(verifyResetToken(token, { ...googleUser, passwordHash: "$2a$12$now-set" }, SECRET)).toBe(false);
  });
});

describe("rateLimit", () => {
  it("allows up to the limit per window, then resets", () => {
    resetRateLimits();
    const now = 1_000_000;
    expect([1, 2, 3].map(() => rateLimit("k", 3, 1000, now))).toEqual([true, true, true]);
    expect(rateLimit("k", 3, 1000, now)).toBe(false);
    expect(rateLimit("other", 3, 1000, now)).toBe(true);
    expect(rateLimit("k", 3, 1000, now + 1000)).toBe(true);
  });
});
