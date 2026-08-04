import Image from "next/image";
import Link from "next/link";
import { Clock, Users } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Rating } from "@/components/ui/Rating";
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";
import { getFeaturedPackages } from "@/lib/content";
import { formatCurrency } from "@/lib/utils";

const badgeTone = {
  "Best Seller": "accent",
  Luxury: "gold",
  New: "nature",
  "Family Friendly": "primary",
  "Top Pick": "accent",
  "Top Rated": "gold",
  "New Activity": "nature",
} as const;

export async function FeaturedPackages() {
  const packages = await getFeaturedPackages();

  return (
    <section className="bg-surface py-20 lg:py-28">
      <Container>
        <SectionHeading
          eyebrow="Featured Packages"
          title="Hand-Crafted Tours, Ready to Book"
        />

        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {packages.slice(0, 6).map((pkg, i) => (
            <Reveal key={pkg.slug} delay={(i % 3) * 0.08}>
              <Card className="flex h-full flex-col">
                <div className="relative h-56 w-full overflow-hidden">
                  <Image
                    src={pkg.image.url}
                    alt={pkg.image.alt}
                    fill
                    sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                    className="object-cover transition-transform duration-500 ease-out-luxury group-hover:scale-105"
                  />
                  {pkg.badge && (
                    <Badge tone={badgeTone[pkg.badge]} className="absolute top-4 left-4">
                      {pkg.badge}
                    </Badge>
                  )}
                </div>

                <div className="flex flex-1 flex-col gap-4 p-6">
                  {pkg.rating !== undefined && <Rating value={pkg.rating} reviewCount={pkg.reviewCount} />}

                  <h3 className="font-display text-xl font-semibold text-midnight">
                    <Link href={`/tour-packages/${pkg.slug}`} className="hover:text-primary">
                      {pkg.title}
                    </Link>
                  </h3>
                  <p className="line-clamp-2 text-sm text-slate">{pkg.summary}</p>

                  <div className="flex items-center gap-4 text-sm text-slate">
                    <span className="flex items-center gap-1.5">
                      <Clock size={15} className="text-primary" />
                      {pkg.durationLabel ?? `${pkg.durationDays}D / ${pkg.durationNights}N`}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Users size={15} className="text-primary" />
                      {pkg.groupSize}
                    </span>
                  </div>

                  <div className="mt-auto flex items-center justify-between border-t border-border pt-4">
                    <div className="flex items-baseline gap-2">
                      {pkg.originalPrice && (
                        <span className="text-sm text-slate line-through">{formatCurrency(pkg.originalPrice)}</span>
                      )}
                      <span className="text-xl font-semibold text-midnight">{formatCurrency(pkg.price)}</span>
                      <span className="text-xs text-slate">/ person</span>
                    </div>
                    <Link
                      href={`/tour-packages/${pkg.slug}`}
                      className="text-sm font-semibold text-primary transition-colors hover:text-primary-dark"
                    >
                      View Trip
                    </Link>
                  </div>
                </div>
              </Card>
            </Reveal>
          ))}
        </div>

        <div className="mt-12 flex justify-center">
          <Button href="/tour-packages" variant="outlineDark" size="lg">
            View All Tour Packages
          </Button>
        </div>
      </Container>
    </section>
  );
}
