import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { readResetToken, verifyResetToken } from "@/lib/auth/password-reset";
import { findUserForPasswordReset, replacePassword } from "@/lib/auth/users";
import { publicErrorMessage } from "@/lib/errors";
import { rateLimit } from "@/lib/rate-limit";
import { resetPasswordSchema } from "@/lib/validation/schemas";

const INVALID_LINK = "This reset link is invalid or has expired. Please request a new one.";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const parsed = resetPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request" }, { status: 400 });
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!rateLimit(`reset:ip:${ip}`, 20, 15 * 60 * 1000)) {
    return NextResponse.json({ error: "Too many attempts. Please wait a few minutes and try again." }, { status: 429 });
  }

  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    console.error("[auth] Password reset unavailable: AUTH_SECRET is not set");
    return NextResponse.json({ error: "Password reset is temporarily unavailable." }, { status: 503 });
  }

  const { token, password } = parsed.data;
  const claimed = readResetToken(token);
  if (!claimed) return NextResponse.json({ error: INVALID_LINK }, { status: 400 });

  try {
    const user = await findUserForPasswordReset({ id: claimed.uid });
    if (!user || !verifyResetToken(token, user, secret)) {
      return NextResponse.json({ error: INVALID_LINK }, { status: 400 });
    }

    const updated = await replacePassword(user.id, user.passwordHash, await hash(password, 12));
    if (!updated) return NextResponse.json({ error: INVALID_LINK }, { status: 400 });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[auth] Password reset failed:", error);
    return NextResponse.json({ error: publicErrorMessage("Could not reset the password.", error) }, { status: 500 });
  }
}
