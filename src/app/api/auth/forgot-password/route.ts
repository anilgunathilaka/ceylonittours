import { NextResponse } from "next/server";
import { createResetToken } from "@/lib/auth/password-reset";
import { findUserForPasswordReset } from "@/lib/auth/users";
import { sendPasswordResetEmail } from "@/lib/email";
import { rateLimit } from "@/lib/rate-limit";
import { forgotPasswordSchema } from "@/lib/validation/schemas";

const WINDOW_MS = 15 * 60 * 1000;

/** Same reply whether or not the email has an account, so the form can't reveal who is registered. */
const GENERIC_REPLY = {
  message: "If an account exists for that email, we've sent a link to reset the password. Check your inbox.",
};

/**
 * Base URL for the link in the email. Production must use the configured AUTH_URL: building it
 * from request headers would let an attacker get reset links that point at their own site.
 */
function siteUrl(request: Request) {
  if (process.env.AUTH_URL) return process.env.AUTH_URL.replace(/\/$/, "");
  if (process.env.NODE_ENV !== "production") return new URL(request.url).origin;
  return null;
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const parsed = forgotPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Enter a valid email address" }, { status: 400 });
  }
  const email = parsed.data.email.toLowerCase();

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!rateLimit(`forgot:ip:${ip}`, 10, WINDOW_MS)) {
    return NextResponse.json({ error: "Too many requests. Please wait a few minutes and try again." }, { status: 429 });
  }
  // Limit per address quietly (same reply) so nobody can flood someone's inbox
  if (!rateLimit(`forgot:email:${email}`, 3, WINDOW_MS)) {
    return NextResponse.json(GENERIC_REPLY);
  }

  const secret = process.env.AUTH_SECRET;
  const base = siteUrl(request);
  if (!secret || !base) {
    console.error("[auth] Password reset unavailable: AUTH_SECRET or AUTH_URL is not set");
    return NextResponse.json(GENERIC_REPLY);
  }

  try {
    const user = await findUserForPasswordReset({ email });
    if (user) {
      const token = createResetToken(user, secret);
      await sendPasswordResetEmail(user, `${base}/reset-password?token=${encodeURIComponent(token)}`);
    }
  } catch (error) {
    // Still the generic reply: errors must not reveal whether the account exists
    console.error("[auth] Forgot-password request failed:", error);
  }

  return NextResponse.json(GENERIC_REPLY);
}
