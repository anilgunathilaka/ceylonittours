import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { Check, Clock, Globe, MapPin, ShieldCheck, Users, Wallet, X } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { Badge } from "@/components/ui/Badge";
import { Rating } from "@/components/ui/Rating";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { formatCurrency } from "@/lib/utils";
import type { TourPackage } from "@/types";

const badgeTone = {
  "Best Seller": "accent",
  Luxury: "gold",
  New: "nature",
  "Family Friendly": "primary",
  "Top Pick": "accent",
  "Top Rated": "gold",
  "New Activity": "nature",
} as const;

export function PackageDetail({ pkg, related }: { pkg: TourPackage; related: TourPackage[] }) {
  return (
    <div className="bg-ivory py-12 lg:py-16">
      <Container>
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1.7fr_1fr]">
          <div>
            {pkg.badge && (
              <Badge tone={badgeTone[pkg.badge]} className="mb-3">
                {pkg.badge}
              </Badge>
            )}
            <h1 className="font-display text-2xl font-semibold text-midnight sm:text-3xl lg:text-4xl">{pkg.title}</h1>

            <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-slate">
              {pkg.rating !== undefined && <Rating value={pkg.rating} reviewCount={pkg.reviewCount} size="md" />}
              {pkg.provider && (
                <span>
                  Activity provider: <span className="font-semibold text-midnight">{pkg.provider}</span>
                </span>
              )}
            </div>

            <div className="relative mt-6 h-64 w-full overflow-hidden rounded-2xl bg-border sm:h-96">
              <Image src={pkg.image.url} alt={pkg.image.alt} fill sizes="(min-width: 1024px) 60vw, 100vw" className="object-cover" priority />
            </div>

            {pkg.description && <p className="mt-6 text-base text-slate">{pkg.description}</p>}
            {!pkg.description && <p className="mt-6 text-base text-slate">{pkg.summary}</p>}

            {/* Quick facts */}
            <div className="mt-8 grid grid-cols-1 gap-4 border-y border-border py-6 sm:grid-cols-2">
              <QuickFact
                icon={<Clock size={18} />}
                label={`Duration ${pkg.durationLabel ?? `${pkg.durationDays}D / ${pkg.durationNights}N`}`}
                detail="Check availability to see starting times"
              />
              {pkg.languages && (
                <QuickFact icon={<Globe size={18} />} label="Live tour guide" detail={pkg.languages.join(", ")} />
              )}
              <QuickFact icon={<Users size={18} />} label={pkg.groupSize} />
              {pkg.freeCancellation && (
                <QuickFact icon={<ShieldCheck size={18} />} label="Free cancellation" detail="Cancel up to 24 hours in advance for a full refund" />
              )}
              {pkg.payLater && (
                <QuickFact icon={<Wallet size={18} />} label="Reserve now & pay later" detail="Book your spot and pay nothing today" />
              )}
            </div>

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
              <Section title="Full Description">
                <p className="text-slate">{pkg.routeSummary}</p>
              </Section>
            )}

            {pkg.itinerary && pkg.itinerary.length > 0 && (
              <Section title="Itinerary">
                <ol className="relative space-y-6 border-l-2 border-primary/30 pl-6">
                  {pkg.itinerary.map((stop, i) => (
                    <li key={i} className="relative">
                      <span className="absolute top-1 -left-[1.95rem] h-3.5 w-3.5 rounded-full border-2 border-primary bg-white" />
                      <p className="font-semibold text-midnight">{stop.title}</p>
                      {stop.detail && <p className="text-sm text-slate">{stop.detail}</p>}
                      {stop.note && <p className="text-xs text-secondary">{stop.note}</p>}
                    </li>
                  ))}
                </ol>
                <p className="mt-4 text-xs text-slate">For reference only. Itineraries are subject to change.</p>
              </Section>
            )}

            {(pkg.includes || pkg.excludes) && (
              <Section title="Includes">
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

            {pkg.notSuitableFor && pkg.notSuitableFor.length > 0 && (
              <Section title="Not Suitable For">
                <ul className="list-disc space-y-2 pl-5 text-slate">
                  {pkg.notSuitableFor.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </Section>
            )}

            {(pkg.whatToBring || pkg.notAllowed || pkg.knowBeforeYouGo) && (
              <Section title="Important Information">
                <div className="space-y-6">
                  {pkg.whatToBring && (
                    <div>
                      <p className="mb-2 font-semibold text-midnight">What to bring</p>
                      <ul className="list-disc space-y-1 pl-5 text-slate">
                        {pkg.whatToBring.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {pkg.notAllowed && (
                    <div>
                      <p className="mb-2 font-semibold text-midnight">Not allowed</p>
                      <ul className="list-disc space-y-1 pl-5 text-slate">
                        {pkg.notAllowed.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {pkg.knowBeforeYouGo && (
                    <div>
                      <p className="mb-2 font-semibold text-midnight">Know before you go</p>
                      <ul className="list-disc space-y-1 pl-5 text-slate">
                        {pkg.knowBeforeYouGo.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </Section>
            )}

            {(pkg.rating !== undefined || pkg.reviewHighlights) && (
              <Section title="Customer Reviews">
                {pkg.rating !== undefined && (
                  <div className="mb-6 flex flex-wrap items-start gap-10">
                    <div className="text-center">
                      <p className="font-display text-4xl font-semibold text-midnight">{pkg.rating.toFixed(1)}/5</p>
                      <Rating value={pkg.rating} size="md" className="mt-2 justify-center" />
                      {pkg.reviewCount !== undefined && (
                        <p className="mt-1 text-sm text-slate">Based on {pkg.reviewCount} reviews</p>
                      )}
                    </div>
                    {pkg.reviewBreakdown && (
                      <div className="flex-1 space-y-2 min-w-[220px]">
                        {pkg.reviewBreakdown.map((r) => (
                          <div key={r.label} className="flex items-center gap-3 text-sm">
                            <span className="w-32 shrink-0 text-slate">{r.label}</span>
                            <span className="h-2 flex-1 overflow-hidden rounded-full bg-border">
                              <span className="block h-full rounded-full bg-primary" style={{ width: `${(r.value / 5) * 100}%` }} />
                            </span>
                            <span className="w-10 shrink-0 font-semibold text-midnight">{r.value.toFixed(1)}/5</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {pkg.aiReviewSummary && (
                  <div className="mb-6 rounded-xl bg-surface p-5 ring-1 ring-border">
                    <p className="mb-1 text-sm font-semibold text-midnight">What travelers are saying</p>
                    <p className="text-sm text-slate">{pkg.aiReviewSummary}</p>
                  </div>
                )}

                {pkg.reviewHighlights && (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {pkg.reviewHighlights.map((r) => (
                      <div key={r.name + r.date} className="rounded-xl border border-border p-5">
                        <Rating value={r.rating} />
                        <p className="mt-2 font-semibold text-midnight">
                          {r.name} – {r.country}
                        </p>
                        <p className="text-xs text-slate">{r.date} · Verified booking</p>
                        <p className="mt-2 text-sm text-slate">{r.text}</p>
                      </div>
                    ))}
                  </div>
                )}
              </Section>
            )}
          </div>

          {/* Booking panel */}
          <div className="lg:sticky lg:top-28 lg:self-start">
            <Card className="p-6">
              <p className="text-sm text-slate">From</p>
              <div className="flex items-baseline gap-2">
                {pkg.originalPrice && (
                  <span className="text-base text-slate line-through">{formatCurrency(pkg.originalPrice)}</span>
                )}
                <span className="font-display text-3xl font-semibold text-midnight">{formatCurrency(pkg.price)}</span>
              </div>
              <p className="text-sm text-slate">per person</p>

              <Button href="/contact" variant="primary" size="lg" className="mt-6 w-full justify-center">
                Check Availability
              </Button>

              <div className="mt-6 space-y-4 border-t border-border pt-6 text-sm">
                {pkg.freeCancellation && (
                  <div className="flex items-start gap-2">
                    <ShieldCheck size={18} className="mt-0.5 shrink-0 text-nature" />
                    <div>
                      <p className="font-semibold text-midnight">Free cancellation</p>
                      <p className="text-slate">Cancel up to 24 hours in advance for a full refund</p>
                    </div>
                  </div>
                )}
                {pkg.payLater && (
                  <div className="flex items-start gap-2">
                    <Wallet size={18} className="mt-0.5 shrink-0 text-nature" />
                    <div>
                      <p className="font-semibold text-midnight">Reserve now & pay later</p>
                      <p className="text-slate">Keep your travel plans flexible</p>
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
              </div>
            </Card>
          </div>
        </div>

        {related.length > 0 && (
          <div className="mt-16">
            <h2 className="font-display text-2xl font-semibold text-midnight">You Might Also Like</h2>
            <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((r) => (
                <Link key={r.slug} href={`/tour-packages/${r.slug}`}>
                  <Card className="flex h-full flex-col">
                    <div className="relative h-40 w-full overflow-hidden">
                      <Image src={r.image.url} alt={r.image.alt} fill sizes="33vw" className="object-cover" />
                    </div>
                    <div className="flex flex-1 flex-col gap-2 p-5">
                      <h3 className="font-display text-base font-semibold text-midnight">{r.title}</h3>
                      <p className="mt-auto text-sm font-semibold text-midnight">
                        From {formatCurrency(r.price)}
                      </p>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        )}
      </Container>
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

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mt-8 border-t border-border pt-8">
      <h2 className="mb-4 font-display text-xl font-semibold text-midnight">{title}</h2>
      {children}
    </div>
  );
}
