import type { ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { Accessibility, BadgePercent, ChevronRight, Flame, MessageCircle, Bus, Car, Check, Clock, ExternalLink, Globe, MapPin, PawPrint, ShieldCheck, ThumbsUp, Users, UtensilsCrossed, Wallet, X } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { Badge } from "@/components/ui/Badge";
import { Rating } from "@/components/ui/Rating";
import { BookingBox, BookingProvider, BookingResults, EnquiryBox } from "@/components/tour-packages/BookingFlow";
import { Itinerary } from "@/components/tour-packages/Itinerary";
import { PackageGallery } from "@/components/tour-packages/PackageGallery";
import { RelatedCarousel } from "@/components/tour-packages/RelatedCarousel";
import { ReviewAvatar, ReviewsList } from "@/components/tour-packages/ReviewsList";
import { SeeMore } from "@/components/tour-packages/SeeMore";
import { ShareButton } from "@/components/tour-packages/ShareButton";
import { SectionNav } from "@/components/tour-packages/SectionNav";
import { ViewTracker } from "@/components/tour-packages/ViewTracker";
import { WishlistButton } from "@/components/tour-packages/WishlistButton";
import { CANCELLATION_POLICY_LABELS, FOOD_LABELS, GUIDE_TYPE_LABELS } from "@/lib/cms/config";
import { formatDisplayDate } from "@/lib/date";
import type { getApprovedReviews } from "@/lib/reviews";
import { cn, formatCurrency } from "@/lib/utils";

/** WhatsApp number for customer questions (same as the contact page), digits only */
const WHATSAPP_NUMBER = "94112345678";
import type { TourPackage } from "@/types";

export type PackageBooking = {
  /** Package has bookable options: show the booking box instead of the enquiry button */
  bookable: boolean;
  fromPrice?: { amount: number; unit: "person" | "group" };
  /** Price before the tour discount, shown crossed out */
  compareAt?: number;
  /** Biggest special offer for this tour, shown in the booking box */
  offer?: { name: string; discountPercent: number };
  /** Any bookable option is wheelchair accessible */
  wheelchairAccessible?: boolean;
  /** Real bookings made in the last 30 days (shown when there are a few) */
  recentBookings?: number;
};

export type PackageReviews = Awaited<ReturnType<typeof getApprovedReviews>>;

export const EMPTY_REVIEWS: PackageReviews = { reviews: [], total: 0, hasMore: false, count: 0, average: undefined, categories: [], lovedBy: undefined, highlights: [] };

const mapEmbed = (lat: number, lng: number) =>
  `https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.01},${lat - 0.01},${lng + 0.01},${lat + 0.01}&layer=mapnik&marker=${lat},${lng}`;

const badgeTone = {
  "Best Seller": "accent",
  Luxury: "gold",
  New: "nature",
  "Family Friendly": "primary",
  "Top Pick": "accent",
  "Top Rated": "gold",
  "New Activity": "nature",
} as const;

export function PackageDetail({
  pkg,
  related,
  booking = { bookable: false },
  verified = EMPTY_REVIEWS,
}: {
  pkg: TourPackage;
  related: TourPackage[];
  booking?: PackageBooking;
  verified?: PackageReviews;
}) {
  // Verified reviews from real bookings take over the headline numbers once there are any
  const hasVerified = verified.count > 0;
  const rating = verified.average ?? pkg.rating;
  const reviewCount = hasVerified ? verified.count : pkg.reviewCount;
  const breakdown = verified.categories.length > 0 ? verified.categories : (pkg.reviewBreakdown ?? []);
  const fromPrice = booking.fromPrice ?? { amount: pkg.price, unit: "person" as const };
  const policy = pkg.cancellationPolicy ? CANCELLATION_POLICY_LABELS[pkg.cancellationPolicy] : undefined;
  const freeCancellation = pkg.cancellationPolicy ? pkg.cancellationPolicy.startsWith("free_") : pkg.freeCancellation;
  const meeting = pkg.meetingPoint;
  const hasMap = meeting?.lat !== undefined && meeting?.lng !== undefined;
  const payOnArrival = pkg.payLater || booking.bookable;
  // Crossed-out price: before the tour discount (bookable tours), or the tour's original price
  const wasCandidate = booking.bookable ? Math.max(booking.compareAt ?? 0, pkg.originalPrice ?? 0) : (pkg.originalPrice ?? 0);
  const wasPrice = wasCandidate > fromPrice.amount ? wasCandidate : undefined;
  const savePercent = wasPrice ? Math.round((1 - fromPrice.amount / wasPrice) * 100) : 0;
  const popular = (booking.recentBookings ?? 0) >= 3;
  const hasInfo =
    (pkg.whatToBring?.length ?? 0) > 0 ||
    (pkg.notAllowed?.length ?? 0) > 0 ||
    (pkg.knowBeforeYouGo?.length ?? 0) > 0 ||
    (pkg.guideCertifications?.length ?? 0) > 0 ||
    Boolean(pkg.petFriendly || pkg.petPolicy);
  // Option cards: "Driver: English", "Cancel for free until …"
  const guideLabel = pkg.guideType === "driver_guide" ? "Driver" : pkg.guideType === "audio_guide" ? "Audio guide" : pkg.guideType === "live_guide" || !pkg.guideType ? "Guide" : undefined;
  const freeCancelHours = pkg.cancellationPolicy
    ? ({ free_24h: 24, free_48h: 48, free_7d: 168 } as Record<string, number>)[pkg.cancellationPolicy]
    : pkg.freeCancellation
      ? 24
      : undefined;
  const results = (className: string) =>
    booking.bookable && (
      <div data-booking-results className={cn("scroll-mt-36 [&:not(:has(*))]:hidden", className)}>
        <BookingResults questions={pkg.bookingQuestions ?? []} guideLabel={guideLabel} freeCancelHours={freeCancelHours} />
      </div>
    );
  const showReviews = rating !== undefined || hasVerified || (pkg.reviewHighlights?.length ?? 0) > 0;

  const sidebar = (
    // Not <Card>: its overflow-hidden would clip the date and participant pop-ups
    <div className="rounded-2xl bg-surface p-6 shadow-card ring-1 ring-border">
      {booking.offer && (
        <p className="mb-3 flex items-center gap-2 rounded-xl bg-accent/10 px-3 py-2 text-sm font-semibold text-accent-dark">
          <BadgePercent size={17} className="shrink-0" /> {booking.offer.name} · save up to {booking.offer.discountPercent}%
        </p>
      )}
      <p className="text-[15px] text-midnight">
        From {wasPrice && <span className="ml-1 font-semibold text-slate line-through">{formatCurrency(wasPrice)}</span>}
      </p>
      <p className="mb-5 flex flex-wrap items-baseline gap-x-2 text-midnight">
        <span className={cn("text-2xl font-bold", wasPrice ? "text-accent" : "text-midnight")}>{formatCurrency(fromPrice.amount)}</span>
        <span className="text-[15px]">per {fromPrice.unit}</span>
        {savePercent > 0 && <span className="rounded-full bg-accent/10 px-2 py-0.5 text-xs font-semibold text-accent-dark">Save {savePercent}%</span>}
      </p>

      {popular && (
        <p className="mb-4 flex items-center gap-2 text-sm font-semibold text-accent-dark">
          <Flame size={16} className="shrink-0" /> Booked {booking.recentBookings} times in the last 30 days
        </p>
      )}

      {booking.bookable ? <BookingBox /> : <EnquiryBox packageSlug={pkg.slug} packageTitle={pkg.title} languages={pkg.languages ?? []} />}

      <div className="mt-6 space-y-4 border-t border-border pt-6 text-sm">
        {freeCancellation && (
          <div className="flex items-start gap-2">
            <ShieldCheck size={18} className="mt-0.5 shrink-0 text-nature" />
            <div>
              <p className="font-semibold text-midnight">Free cancellation</p>
              <p className="text-slate">{policy ?? "Cancel up to 24 hours in advance for a full refund"}</p>
            </div>
          </div>
        )}
        {payOnArrival && (
          <div className="flex items-start gap-2">
            <Wallet size={18} className="mt-0.5 shrink-0 text-nature" />
            <div>
              <p className="font-semibold text-midnight">Reserve now & pay on arrival</p>
              <p className="text-slate">Keep your travel plans flexible — book your spot and pay nothing today.</p>
            </div>
          </div>
        )}
        {pkg.location && (
          <div className="flex items-start gap-2">
            <MapPin size={18} className="mt-0.5 shrink-0 text-primary" />
            <div>
              <p className="font-semibold text-midnight">Starts from</p>
              <p className="text-slate">{pkg.location}</p>
            </div>
          </div>
        )}
        <a
          href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(`Hi! I have a question about "${pkg.title}"`)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-start gap-2 rounded-xl bg-nature/10 px-3 py-2.5 text-midnight transition-colors hover:bg-nature/15"
        >
          <MessageCircle size={18} className="mt-0.5 shrink-0 text-nature" />
          <span>
            <span className="block font-semibold">Questions? Chat with us</span>
            <span className="text-slate">Local team on WhatsApp — we usually reply within the hour</span>
          </span>
        </a>
      </div>
    </div>
  );

  // In-page links for the sections this tour actually has
  const sectionLinks = [
    { id: "overview", label: "Overview" },
    ...(pkg.itinerary?.length ? [{ id: "itinerary", label: "Itinerary" }] : []),
    ...((pkg.includes?.length ?? 0) > 0 || (pkg.excludes?.length ?? 0) > 0 ? [{ id: "includes", label: "What's included" }] : []),
    ...(meeting ? [{ id: "meeting", label: meeting.type === "pickup" ? "Pickup" : "Meeting point" }] : []),
    ...(hasInfo ? [{ id: "info", label: "Important information" }] : []),
    ...(showReviews ? [{ id: "reviews", label: "Reviews" }] : []),
  ];

  const page = (
    <div className="bg-ivory pt-6 pb-28 lg:pt-8 lg:pb-16">
      <ViewTracker slug={pkg.slug} />
      <Container>
        <nav aria-label="Breadcrumb" className="mb-4 text-xs text-slate">
          <ol className="flex flex-wrap items-center gap-1">
            <li>
              <Link href="/" className="hover:text-midnight hover:underline">
                Home
              </Link>
            </li>
            <ChevronRight size={13} aria-hidden />
            <li>
              <Link href="/tour-packages" className="hover:text-midnight hover:underline">
                Tours
              </Link>
            </li>
            <ChevronRight size={13} aria-hidden />
            <li>
              <Link href={`/tour-packages?category=${encodeURIComponent(pkg.category.toLowerCase().replace(/\s+/g, "-"))}`} className="hover:text-midnight hover:underline">
                {pkg.category}
              </Link>
            </li>
            <ChevronRight size={13} aria-hidden />
            <li aria-current="page" className="truncate font-medium text-midnight">
              {pkg.title}
            </li>
          </ol>
        </nav>

        {/* Title row */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="font-display text-2xl font-semibold text-midnight sm:text-3xl lg:text-4xl">{pkg.title}</h1>
            <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-slate">
              {pkg.badge && <Badge tone={badgeTone[pkg.badge]}>{pkg.badge}</Badge>}
              {rating !== undefined && (
                <a href="#reviews" className="hover:underline">
                  <Rating value={rating} reviewCount={reviewCount} size="md" />
                </a>
              )}
              {pkg.provider && (
                <span>
                  Activity provider: <span className="font-semibold text-midnight">{pkg.provider}</span>
                </span>
              )}
              {popular && (
                <span className="flex items-center gap-1 font-semibold text-accent-dark">
                  <Flame size={14} /> Popular: booked {booking.recentBookings} times this month
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-5 pt-1">
            <WishlistButton slug={pkg.slug} />
            <ShareButton title={pkg.title} />
          </div>
        </div>

        <SectionNav sections={sectionLinks} />

        <div className="mt-2 grid grid-cols-1 gap-10 lg:grid-cols-[1.7fr_1fr]">
          <div id="overview" className="min-w-0 scroll-mt-32">
            {pkg.gallery && pkg.gallery.length > 0 ? (
              <PackageGallery images={[pkg.image, ...pkg.gallery]} />
            ) : (
              <div className="relative mt-6 h-64 w-full overflow-hidden rounded-2xl bg-border sm:h-96">
                <Image src={pkg.image.url} alt={pkg.image.alt} fill sizes="(min-width: 1024px) 60vw, 100vw" className="object-cover" priority />
              </div>
            )}

            {results("mt-8 hidden lg:block")}

            <p className="mt-6 text-base text-slate">{pkg.description ?? pkg.summary}</p>

            {verified.lovedBy && (
              <p className="mt-5 flex items-center gap-3 rounded-2xl bg-gold/10 px-4 py-3 text-sm text-midnight">
                <ThumbsUp size={18} className="shrink-0 text-gold-dark" />
                <span>
                  <strong>Loved by {verified.lovedBy.language} speakers</strong> · {verified.lovedBy.percent}% of {verified.lovedBy.language}-speaking travelers gave
                  this activity a perfect score
                </span>
              </p>
            )}

            {/* Quick facts */}
            <div className="mt-6 grid grid-cols-1 gap-4 border-y border-border py-6 sm:grid-cols-2">
              {freeCancellation && (
                <QuickFact icon={<ShieldCheck size={18} />} label="Free cancellation" detail={policy ?? "Cancel up to 24 hours in advance for a full refund"} />
              )}
              {payOnArrival && <QuickFact icon={<Wallet size={18} />} label="Reserve now & pay on arrival" detail="Book your spot and pay nothing today" />}
              <QuickFact
                icon={<Clock size={18} />}
                label={`Duration ${pkg.durationLabel ?? `${pkg.durationDays}D / ${pkg.durationNights}N`}`}
                detail="Check availability to see starting times"
              />
              {pkg.guideType && pkg.guideType !== "live_guide" ? (
                <QuickFact icon={<Globe size={18} />} label={GUIDE_TYPE_LABELS[pkg.guideType]} detail={pkg.languages?.join(", ")} />
              ) : (
                pkg.languages && pkg.languages.length > 0 && <QuickFact icon={<Globe size={18} />} label="Live tour guide" detail={pkg.languages.join(", ")} />
              )}
              {pkg.transportTypes && pkg.transportTypes.length > 0 && <QuickFact icon={<Car size={18} />} label={pkg.transportTypes.join(", ")} detail="Transport during the activity" />}
              {pkg.foodIncluded && pkg.foodIncluded !== "none" && (
                <QuickFact icon={<UtensilsCrossed size={18} />} label={FOOD_LABELS[pkg.foodIncluded]} detail={pkg.foodDetails?.join(", ")} />
              )}
              {booking.wheelchairAccessible && <QuickFact icon={<Accessibility size={18} />} label="Wheelchair accessible" />}
              {meeting && meeting.type !== "meeting_point" && <QuickFact icon={<Bus size={18} />} label="Pickup included" detail="Check availability for details" />}
              {pkg.groupSize && <QuickFact icon={<Users size={18} />} label={pkg.groupSize} />}
            </div>

            {/* Mobile: the booking box sits here; on desktop it is in the sidebar */}
            <div id="booking-box" className="mt-8 scroll-mt-32 lg:hidden">
              {sidebar}
            </div>

            {results("mt-8 lg:hidden")}

            {verified.highlights.length > 0 && (
              <Section title="What travelers loved" layout="top">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {verified.highlights.slice(0, 2).map((r) => (
                    <div key={r.id} className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-5">
                      <Rating value={r.rating} />
                      <div className="flex items-center gap-2.5">
                        <ReviewAvatar name={r.authorName} />
                        <p className="text-sm">
                          <span className="font-semibold text-midnight">
                            {r.authorName}
                            {r.country && ` – ${r.country}`}
                          </span>
                          <span className="block text-xs text-slate">{formatDisplayDate(r.createdAt.slice(0, 10))} · Verified booking</span>
                        </p>
                      </div>
                      <p className="line-clamp-4 text-sm text-midnight">{r.text}</p>
                    </div>
                  ))}
                </div>
                <a href="#reviews" className="mt-4 inline-block text-sm font-semibold text-midnight underline underline-offset-2">
                  See more reviews
                </a>
              </Section>
            )}

            {pkg.itinerary && pkg.itinerary.length > 0 && (
              <Section id="itinerary" title="Itinerary" layout="top">
                <Itinerary stops={pkg.itinerary} />
                <p className="mt-4 text-xs text-slate">For reference only. Itineraries are subject to change.</p>
              </Section>
            )}

            {pkg.highlights && pkg.highlights.length > 0 && (
              <Section title="Highlights">
                <ul className="list-disc space-y-2 pl-5 text-slate">
                  {pkg.highlights.map((h) => (
                    <li key={h}>{h}</li>
                  ))}
                </ul>
              </Section>
            )}

            {pkg.routeSummary && (
              <Section title="Full description">
                <SeeMore collapsedHeight={120}>
                  <p className="whitespace-pre-line text-slate">{pkg.routeSummary}</p>
                </SeeMore>
              </Section>
            )}

            {((pkg.includes?.length ?? 0) > 0 || (pkg.excludes?.length ?? 0) > 0) && (
              <Section id="includes" title="Includes">
                <div className="grid grid-cols-1 gap-x-8 gap-y-2 sm:grid-cols-2">
                  {pkg.includes?.map((item) => (
                    <div key={item} className="flex items-start gap-2 text-slate">
                      <Check size={16} className="mt-0.5 shrink-0 text-nature" />
                      {item}
                    </div>
                  ))}
                  {pkg.excludes?.map((item) => (
                    <div key={item} className="flex items-start gap-2 text-slate">
                      <X size={16} className="mt-0.5 shrink-0 text-accent" />
                      {item}
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {meeting && (
              <Section id="meeting" title={meeting.type === "pickup" ? "Pickup" : "Meeting point"} layout="top">
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  <div className="flex flex-col gap-3 text-slate">
                    {(meeting.name || meeting.address) && (
                      <p className="flex items-start gap-2">
                        <MapPin size={18} className="mt-0.5 shrink-0 text-primary" />
                        <span>
                          {meeting.name && <span className="block font-semibold text-midnight">{meeting.name}</span>}
                          {meeting.address}
                        </span>
                      </p>
                    )}
                    {meeting.instructions && <p className="whitespace-pre-line">{meeting.instructions}</p>}
                    {meeting.type !== "meeting_point" && meeting.pickupAreas && meeting.pickupAreas.length > 0 && (
                      <div>
                        <p className="mb-1 font-semibold text-midnight">Pickup offered from</p>
                        <ul className="list-disc space-y-1 pl-5">
                          {meeting.pickupAreas.map((area) => (
                            <li key={area}>{area}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {hasMap && (
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${meeting.lat},${meeting.lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 self-start text-sm font-semibold text-primary hover:underline"
                      >
                        Open in Google Maps <ExternalLink size={14} />
                      </a>
                    )}
                  </div>
                  {hasMap && (
                    <iframe
                      title={`Map of ${meeting.name ?? "the meeting point"}`}
                      src={mapEmbed(meeting.lat!, meeting.lng!)}
                      loading="lazy"
                      className="h-56 w-full rounded-xl ring-1 ring-border"
                    />
                  )}
                </div>
              </Section>
            )}

            {pkg.notSuitableFor && pkg.notSuitableFor.length > 0 && (
              <Section title="Not suitable for">
                <ul className="list-disc space-y-2 pl-5 text-slate">
                  {pkg.notSuitableFor.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </Section>
            )}

            {((pkg.whatToBring?.length ?? 0) > 0 || (pkg.notAllowed?.length ?? 0) > 0 || (pkg.knowBeforeYouGo?.length ?? 0) > 0 || (pkg.guideCertifications?.length ?? 0) > 0 || pkg.petFriendly || pkg.petPolicy) && (
              <Section id="info" title="Important information">
                <SeeMore collapsedHeight={260}>
                  <div className="space-y-6">
                    <InfoList title="What to bring" items={pkg.whatToBring} />
                    <InfoList title="Not allowed" items={pkg.notAllowed} />
                    <InfoList title="Know before you go" items={pkg.knowBeforeYouGo} />
                    <InfoList title="Your guide" items={pkg.guideCertifications} />
                    {(pkg.petFriendly || pkg.petPolicy) && (
                      <div>
                        <p className="mb-2 flex items-center gap-1.5 font-semibold text-midnight">
                          <PawPrint size={16} /> Pets
                        </p>
                        <p className="text-slate">
                          {pkg.petFriendly ? "Pet-friendly. " : ""}
                          {pkg.petPolicy}
                        </p>
                      </div>
                    )}
                  </div>
                </SeeMore>
              </Section>
            )}

            {(policy || pkg.cancellationNotes) && (
              <Section title="Cancellation policy">
                {policy && pkg.cancellationPolicy !== "custom" && (
                  <p className="flex items-start gap-2 font-semibold text-midnight">
                    <ShieldCheck size={18} className={`mt-0.5 shrink-0 ${freeCancellation ? "text-nature" : "text-accent"}`} />
                    {policy}
                  </p>
                )}
                {pkg.cancellationNotes && <p className="mt-2 whitespace-pre-line text-slate">{pkg.cancellationNotes}</p>}
              </Section>
            )}
          </div>

          {/* Booking panel (desktop) */}
          <div className="hidden lg:sticky lg:top-32 lg:block lg:self-start">{sidebar}</div>
        </div>

        {related.length > 0 && (
          <div className="mt-16">
            <h2 className="mb-6 font-display text-2xl font-semibold text-midnight">You might also like…</h2>
            <RelatedCarousel packages={related} />
          </div>
        )}

        {showReviews && (
          <section id="reviews" className="mt-16 scroll-mt-28 lg:max-w-[calc((100%-2.5rem)*1.7/2.7)]">
            <h2 className="font-display text-2xl font-semibold text-midnight">Customer reviews</h2>
            <div className="mt-6 grid grid-cols-1 gap-8 md:grid-cols-[220px_minmax(0,1fr)]">
              <div className="flex flex-col gap-6">
                {rating !== undefined && (
                  <div>
                    <p className="text-sm font-semibold text-midnight">Overall rating</p>
                    <p className="mt-1 font-display text-4xl font-semibold text-midnight">
                      {rating.toFixed(1)}
                      <span className="text-lg text-slate">/5</span>
                    </p>
                    <Rating value={rating} size="md" className="mt-1" />
                    {reviewCount !== undefined && <p className="mt-1 text-sm text-slate">Based on {reviewCount} reviews</p>}
                  </div>
                )}
                {breakdown.length > 0 && (
                  <div>
                    <p className="mb-2 text-sm font-semibold text-midnight">Review summary</p>
                    <div className="space-y-2">
                      {breakdown.map((r) => (
                        <div key={r.label} className="flex items-center gap-3 text-sm">
                          <span className="w-28 shrink-0 text-slate">{r.label}</span>
                          <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-border">
                            <span className="block h-full rounded-full bg-midnight" style={{ width: `${(r.value / 5) * 100}%` }} />
                          </span>
                          <span className="w-10 shrink-0 text-right font-semibold text-midnight">{r.value.toFixed(1)}/5</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex min-w-0 flex-col gap-6">
                {pkg.aiReviewSummary && (
                  <div className="rounded-2xl bg-primary/5 p-5 ring-1 ring-primary/15">
                    <p className="mb-1 text-sm font-semibold text-midnight">What travelers are saying</p>
                    <p className="text-sm text-slate">{pkg.aiReviewSummary}</p>
                  </div>
                )}

                {hasVerified ? (
                  <ReviewsList packageSlug={pkg.slug} initial={{ reviews: verified.reviews, total: verified.total, hasMore: verified.hasMore }} />
                ) : (
                  pkg.reviewHighlights &&
                  pkg.reviewHighlights.length > 0 && (
                    <ul className="flex flex-col divide-y divide-border">
                      {pkg.reviewHighlights.map((r) => (
                        <li key={r.name + r.date} className="flex flex-col gap-2 py-5 first:pt-0">
                          <Rating value={r.rating} />
                          <div className="flex items-center gap-3">
                            <ReviewAvatar name={r.name} />
                            <p className="text-sm">
                              <span className="font-semibold text-midnight">
                                {r.name}
                                {r.country && <span className="font-normal text-slate"> – {r.country}</span>}
                              </span>
                              <span className="block text-xs text-slate">{r.date} · Verified booking</span>
                            </p>
                          </div>
                          <p className="text-sm text-midnight">{r.text}</p>
                        </li>
                      ))}
                    </ul>
                  )
                )}
              </div>
            </div>
          </section>
        )}

        {pkg.keywords && pkg.keywords.length > 0 && (
          <div className="mt-12 flex flex-wrap gap-2" aria-label="Tags">
            {pkg.keywords.map((k) => (
              <span key={k} className="rounded-full bg-surface px-3 py-1 text-xs font-medium text-slate ring-1 ring-border">
                {k}
              </span>
            ))}
          </div>
        )}

        {(pkg.productNumber || pkg.provider) && (
          <p className="mt-12 text-xs text-slate">
            {pkg.productNumber && <span className="block">Product ID: {pkg.productNumber}</span>}
            {pkg.provider && (
              <span className="block">
                Activity provider: <span className="font-semibold text-midnight">{pkg.provider}</span>
              </span>
            )}
          </p>
        )}
      </Container>

      <div className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-between gap-3 border-t border-border bg-white/95 px-4 py-3 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] backdrop-blur lg:hidden">
        <div className="leading-tight">
          <p className="text-xs text-slate">From</p>
          <p className="text-lg font-semibold text-accent">
            {wasPrice && <span className="mr-1.5 text-sm font-normal text-slate line-through">{formatCurrency(wasPrice)}</span>}
            {formatCurrency(fromPrice.amount)} <span className="text-xs font-normal text-slate">/ {fromPrice.unit}</span>
          </p>
        </div>
        <a href="#booking-box" className="inline-flex h-11 items-center rounded-full bg-accent px-5 text-sm font-semibold text-white shadow-card hover:bg-accent-dark">
          Check availability
        </a>
      </div>
    </div>
  );

  return booking.bookable ? <BookingProvider packageSlug={pkg.slug}>{page}</BookingProvider> : page;
}

function InfoList({ title, items }: { title: string; items?: string[] }) {
  if (!items || items.length === 0) return null;
  return (
    <div>
      <p className="mb-2 font-semibold text-midnight">{title}</p>
      <ul className="list-disc space-y-1 pl-5 text-slate">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

function QuickFact({ icon, label, detail }: { icon: ReactNode; label: string; detail?: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">{icon}</span>
      <div>
        <p className="text-sm font-semibold text-midnight">{label}</p>
        {detail && <p className="text-xs text-slate">{detail}</p>}
      </div>
    </div>
  );
}

/**
 * A tour page section. "side" (default) puts the heading in a left column on wider screens, like
 * GetYourGuide; "top" keeps it above, for wide content such as the itinerary map.
 */
function Section({ id, title, layout = "side", children }: { id?: string; title: string; layout?: "side" | "top"; children: ReactNode }) {
  return (
    <section id={id} className={cn("mt-8 scroll-mt-32 border-t border-border pt-8", layout === "side" && "md:grid md:grid-cols-[180px_minmax(0,1fr)] md:gap-8")}>
      <h2 className={cn("font-display text-xl font-semibold text-midnight", layout === "side" ? "mb-4 md:mb-0" : "mb-4")}>{title}</h2>
      <div className="min-w-0">{children}</div>
    </section>
  );
}
