import { NextResponse } from "next/server";
import { Resend } from "resend";
import { contactSchema } from "@/lib/validation/schemas";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = contactSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Please check the form and try again" }, { status: 400 });
  }

  const { name, email, phone, travelDate, message } = parsed.data;
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    console.warn("[contact] RESEND_API_KEY not set — logging enquiry from", email);
    return NextResponse.json({ ok: true, sent: false });
  }

  const resend = new Resend(apiKey);

  try {
    await resend.emails.send({
      from: "Ceylon IT Tours Website <enquiries@ceylonittours.com>",
      to: "hello@ceylonittours.com",
      replyTo: email,
      subject: `New trip enquiry from ${name}`,
      html: `
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Phone:</strong> ${phone || "—"}</p>
        <p><strong>Preferred travel date:</strong> ${travelDate || "—"}</p>
        <p><strong>Message:</strong></p>
        <p>${message.replace(/\n/g, "<br />")}</p>
      `,
    });
    return NextResponse.json({ ok: true, sent: true });
  } catch (error) {
    console.error("[contact] Resend send failed", error);
    return NextResponse.json({ error: "Could not send your message right now" }, { status: 502 });
  }
}
