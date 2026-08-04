"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Clock, MapPin } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Rating } from "@/components/ui/Rating";
import { Button } from "@/components/ui/Button";
import { cn, formatCurrency } from "@/lib/utils";
import type { TourCategory, TourPackage } from "@/types";

const badgeTone = {
  "Best Seller": "accent",
  Luxury: "gold",
  New: "nature",
  "Family Friendly": "primary",
  "Top Pick": "accent",
  "Top Rated": "gold",
  "New Activity": "nature",
} as const;

export function PackagesCatalog({ packages }: { packages: TourPackage[] }) {
  const categories = useMemo(() => {
    const seen = new Set<TourCategory>();
    for (const pkg of packages) seen.add(pkg.category);
    return Array.from(seen);
  }, [packages]);

  const [active, setActive] = useState<TourCategory | "All">("All");

  const filtered = active === "All" ? packages : packages.filter((p) => p.category === active);

  return (
    <div>
      <div className="flex flex-wrap justify-center gap-2">
        <button
          type="button"
          onClick={() => setActive("All")}
          className={cn(
            "rounded-full px-4 py-2 text-sm font-semibold transition-colors",
            active === "All" ? "bg-primary text-white" : "bg-surface text-slate ring-1 ring-border hover:text-midnight",
          )}
        >
          All Tours
        </button>
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setActive(cat)}
            className={cn(
              "rounded-full px-4 py-2 text-sm font-semibold transition-colors",
              active === cat ? "bg-primary text-white" : "bg-surface text-slate ring-1 ring-border hover:text-midnight",
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((pkg) => (
          <Card key={pkg.slug} className="flex h-full flex-col">
            <Link href={`/tour-packages/${pkg.slug}`} className="relative block h-48 w-full overflow-hidden bg-border">
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
            </Link>

            <div className="flex flex-1 flex-col gap-3 p-6">
              {(pkg.tourType || pkg.location) && (
                <span className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-secondary uppercase">
                  {pkg.location && (
                    <>
                      <MapPin size={13} />
                      {pkg.tourType ? `${pkg.tourType} · ${pkg.location}` : pkg.location}
                    </>
                  )}
                  {!pkg.location && pkg.tourType}
                </span>
              )}

              <h3 className="font-display text-lg font-semibold text-midnight">
                <Link href={`/tour-packages/${pkg.slug}`} className="hover:text-primary">
                  {pkg.title}
                </Link>
              </h3>
              <p className="line-clamp-2 text-sm text-slate">{pkg.summary}</p>

              {pkg.rating !== undefined && <Rating value={pkg.rating} reviewCount={pkg.reviewCount} />}

              <div className="flex items-center gap-1.5 text-sm text-slate">
                <Clock size={15} className="text-primary" />
                {pkg.durationLabel ?? `${pkg.durationDays}D / ${pkg.durationNights}N`}
              </div>

              <div className="mt-auto flex items-center justify-between border-t border-border pt-4">
                <div className="flex items-baseline gap-2">
                  {pkg.originalPrice && (
                    <span className="text-sm text-slate line-through">{formatCurrency(pkg.originalPrice)}</span>
                  )}
                  <span className="text-lg font-semibold text-midnight">{formatCurrency(pkg.price)}</span>
                  <span className="text-xs text-slate">/ person</span>
                </div>
                <Button href={`/tour-packages/${pkg.slug}`} variant="outlineDark" size="sm">
                  View Details
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="mt-16 text-center text-slate">No packages found in this category yet.</p>
      )}
    </div>
  );
}
