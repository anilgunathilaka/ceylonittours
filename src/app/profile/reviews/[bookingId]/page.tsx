import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, CalendarDays, Star } from "lucide-react";
import { auth } from "@/auth";
import { Container } from "@/components/ui/Container";
import { ReviewForm } from "@/components/profile/ReviewForm";
import { formatDisplayDate } from "@/lib/date";
import { getReviewableBooking } from "@/lib/reviews";

export const metadata: Metadata = { title: "Write a review", robots: { index: false, follow: false } };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function WriteReviewPage({ params }: { params: Promise<{ bookingId: string }> }) {
  const { bookingId } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect(`/login?callbackUrl=${encodeURIComponent(`/profile/reviews/${bookingId}`)}`);
  if (!UUID.test(bookingId)) notFound();

  // Scoped to the signed-in user, so nobody can review someone else's booking
  const found = await getReviewableBooking(session.user.id, bookingId);
  if (!found) notFound();
  const { booking, canReview } = found;
  const travelDate = booking.travelDate?.toISOString().slice(0, 10);

  return (
    <section className="bg-ivory py-12 lg:py-16">
      <Container className="mx-auto flex max-w-2xl flex-col gap-6">
        <Link href="/profile#past" className="inline-flex items-center gap-1.5 self-start text-sm font-medium text-slate hover:text-midnight">
          <ArrowLeft size={15} /> My profile
        </Link>
        <div className="flex flex-col gap-2">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-gold/15">
            <Star size={22} className="fill-gold text-gold" />
          </span>
          <h1 className="font-display text-3xl font-semibold text-midnight">How was your trip?</h1>
          <p className="text-slate">
            <strong className="text-midnight">{booking.packageTitle}</strong>
            {travelDate && (
              <span className="ml-2 inline-flex items-center gap-1 text-sm">
                <CalendarDays size={14} /> {formatDisplayDate(travelDate)}
              </span>
            )}
          </p>
        </div>

        <div className="rounded-3xl bg-surface p-6 shadow-card ring-1 ring-border sm:p-8">
          {canReview ? (
            <ReviewForm bookingId={booking.id} />
          ) : (
            <p className="text-sm text-slate">
              {booking.review
                ? "You've already reviewed this trip — thank you!"
                : "You can review this tour once it has taken place and the booking was confirmed."}
            </p>
          )}
        </div>
      </Container>
    </section>
  );
}
