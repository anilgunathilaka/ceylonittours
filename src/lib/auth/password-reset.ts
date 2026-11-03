import { createHmac, timingSafeEqual } from "crypto";

/**
 * Stateless password-reset links (no database table needed).
 *
 * A token is `<payload>.<signature>`, where the payload holds the user id and an expiry time,
 * and the signature is an HMAC over the payload *and the account's current password hash*.
 * Changing the password changes the hash, so every earlier link stops working: links are
 * single-use without storing anything, and expire after RESET_TOKEN_TTL_MS regardless.
 */
export const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

type Payload = { uid: string; exp: number };

const toBase64Url = (value: string | Buffer) => Buffer.from(value).toString("base64url");

function sign(payload: string, passwordHash: string | null, secret: string) {
  // Accounts without a password (Google sign-in only) sign against a fixed marker
  return createHmac("sha256", secret)
    .update(`${payload}.${passwordHash ?? "no-password"}`)
    .digest("base64url");
}

export function createResetToken(
  user: { id: string; passwordHash: string | null },
  secret: string,
  now = Date.now(),
) {
  const payload = toBase64Url(JSON.stringify({ uid: user.id, exp: now + RESET_TOKEN_TTL_MS } satisfies Payload));
  return `${payload}.${sign(payload, user.passwordHash, secret)}`;
}

/** Reads the user id from a token without trusting it — the caller must still call verifyResetToken. */
export function readResetToken(token: string): Payload | null {
  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra !== undefined || token.length > 1000) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as Partial<Payload>;
    if (typeof data.uid !== "string" || typeof data.exp !== "number") return null;
    return { uid: data.uid, exp: data.exp };
  } catch {
    return null;
  }
}

/** True when the token was issued for this user's *current* password and has not expired. */
export function verifyResetToken(
  token: string,
  user: { id: string; passwordHash: string | null },
  secret: string,
  now = Date.now(),
) {
  const data = readResetToken(token);
  if (!data || data.uid !== user.id || data.exp <= now) return false;

  const [payload, signature] = token.split(".");
  const expected = Buffer.from(sign(payload, user.passwordHash, secret));
  const actual = Buffer.from(signature);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
