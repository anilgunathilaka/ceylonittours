import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { toBooking } from "@/lib/bookings";
import { getPackageBySlug } from "@/lib/content";
import { sendBookingStatusEmail, sendNewBookingEmail } from "@/lib/email";
import { publicErrorMessage } from "@/lib/errors";
import { createOptionBooking, SlotUnavailableError } from "@/lib/products/options";
import { optionBookingSchema } from "@/lib/validation/schemas";

/** Books a slot from the package page's booking widget. Payment: Pay on Arrival. */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Please log in to book this tour" }, { status: 401 });
  }

  const parsed = optionBookingSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Please check the form and try again" }, { status: 400 });
  }
  const input = parsed.data;

  const pkg = await getPackageBySlug(input.packageSlug);
  if (!pkg) return NextResponse.json({ error: "That tour could not be found" }, { status: 404 });

  // Only keep answers to questions this tour actually asks, and require the required ones
  const questions = pkg.bookingQuestions ?? [];
  const answers = questions.map((q) => ({
    question: q.question,
    answer: input.answers.find((a) => a.question === q.question)?.answer ?? "",
  }));
  const missing = questions.find((q, i) => q.required && !answers[i].answer);
  if (missing) return NextResponse.json({ error: `Please answer: ${missing.question}` }, { status: 400 });

  try {
    const row = await createOptionBooking({
      userId: session.user.id,
      packageSlug: pkg.slug,
      packageTitle: pkg.title,
      optionId: input.optionId,
      date: input.date,
      startTime: input.startTime,
      language: input.language,
      pickupLocation: input.pickupLocation,
      counts: input.counts,
      customerName: input.name,
      // Notifications go to the account owner, never to an address typed into the form
      customerEmail: session.user.email ?? "",
      customerPhone: input.phone,
      message: input.message,
      answers,
    });
    const booking = toBooking(row);
    await sendNewBookingEmail(booking);
    // Instant confirmation: the customer gets the confirmation email straight away
    if (booking.status === "confirmed") {
      const siteUrl = (process.env.AUTH_URL ?? new URL(request.url).origin).replace(/\/$/, "");
      await sendBookingStatusEmail(booking, siteUrl);
    }
    return NextResponse.json({ ok: true, bookingId: booking.id, reference: booking.id.slice(0, 8).toUpperCase(), status: booking.status });
  } catch (error) {
    if (error instanceof SlotUnavailableError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    console.error("[bookings] Failed to create booking", error);
    return NextResponse.json({ error: publicErrorMessage("Could not save your booking", error) }, { status: 500 });
  }
}
