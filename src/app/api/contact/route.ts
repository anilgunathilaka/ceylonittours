import { NextResponse } from "next/server";
import { Resend } from "resend";
import { contactSchema } from "@/lib/validation/schemas";
import { auth } from "@/auth";
import { createBooking } from "@/lib/bookings";
import { escapeHtml } from "@/lib/email";
import { getPackageBySlug } from "@/lib/content";
import { publicErrorMessage } from "@/lib/errors";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = contactSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Please check the form and try again" }, { status: 400 });
  }

  const { name, email, message, packageSlug } = parsed.data;
  const phone = parsed.data.phone || undefined;
  const travelDate = parsed.data.travelDate || undefined;

  // Resolve the package server-side; never trust a client-supplied title
  const pkg = packageSlug ? await getPackageBySlug(packageSlug) : undefined;
  if (packageSlug && !pkg) {
    return NextResponse.json({ error: "That tour package could not be found" }, { status: 400 });
  }
  const packageTitle = pkg?.title;

  // Package enquiries from signed-in users are saved as pending bookings for their profile
  const session = await auth();
  if (pkg && session?.user?.id) {
    try {
      await createBooking({
        userId: session.user.id,
        packageSlug: pkg.slug,
        packageTitle: pkg.title,
        customerName: name,
        // Notifications go to the account owner, not an arbitrary address typed into the form
        customerEmail: session.user.email ?? email,
        customerPhone: phone,
        message,
        travelDate,
      });
    } catch (error) {
      console.error("[contact] Failed to save booking", error);
      return NextResponse.json(
        { error: publicErrorMessage("Could not save your booking request", error) },
        { status: 500 },
      );
    }
  }

  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    console.warn("[contact] RESEND_API_KEY not set — enquiry email skipped");
    return NextResponse.json({ ok: true, sent: false });
  }

  const resend = new Resend(apiKey);

  try {
    const { error } = await resend.emails.send({
      from: process.env.EMAIL_FROM ?? "Ceylon IT Tours Website <enquiries@ceylonittours.com>",
      to: "hello@ceylonittours.com",
      replyTo: email,
      subject: `New ${pkg ? "booking request" : "trip enquiry"} from ${name.replace(/[\r\n]/g, " ")}`,
      html: `
        <p><strong>Name:</strong> ${escapeHtml(name)}</p>
        <p><strong>Email:</strong> ${escapeHtml(email)}</p>
        <p><strong>Phone:</strong> ${escapeHtml(phone || "—")}</p>
        <p><strong>Package:</strong> ${escapeHtml(packageTitle || "—")}</p>
        <p><strong>Preferred travel date:</strong> ${escapeHtml(travelDate || "—")}</p>
        <p><strong>Message:</strong></p>
        <p>${escapeHtml(message).replace(/\n/g, "<br />")}</p>
      `,
    });
    if (error) throw error;
    return NextResponse.json({ ok: true, sent: true });
  } catch (error) {
    console.error("[contact] Resend send failed", error);
    // A saved booking is still valid even if the notification email fails
    if (pkg && session?.user?.id) {
      return NextResponse.json({ ok: true, sent: false });
    }
    return NextResponse.json({ error: "Could not send your message right now" }, { status: 502 });
  }
}
