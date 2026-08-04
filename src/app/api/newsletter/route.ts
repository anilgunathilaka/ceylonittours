import { NextResponse } from "next/server";
import { Resend } from "resend";
import { newsletterSchema } from "@/lib/validation/schemas";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = newsletterSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
  }

  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    console.warn("[newsletter] RESEND_API_KEY not set — skipping send for", parsed.data.email);
    return NextResponse.json({ ok: true, sent: false });
  }

  const resend = new Resend(apiKey);

  try {
    await resend.emails.send({
      from: "Ceylon IT Tours <newsletter@ceylonittours.com>",
      to: parsed.data.email,
      subject: "Welcome to Ceylon IT Tours",
      html: "<p>Thanks for subscribing — trip ideas and seasonal offers are on their way.</p>",
    });
    return NextResponse.json({ ok: true, sent: true });
  } catch (error) {
    console.error("[newsletter] Resend send failed", error);
    return NextResponse.json({ error: "Could not subscribe right now" }, { status: 502 });
  }
}
