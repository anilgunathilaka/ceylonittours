"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Clock, Heart, Star, Users } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import type { TourPackage } from "@/types";

export function FeaturedPackageCard({ pkg }: { pkg: TourPackage }) {
  const [saved, setSaved] = useState(false);
  const detailHref = `/tour-packages/${pkg.slug}`;
  const hasDiscount = pkg.originalPrice !== undefined && pkg.originalPrice > pkg.price;
  const discountPercent = hasDiscount ? Math.round(100 - (pkg.price / pkg.originalPrice!) * 100) : 0;

  return (
    <div className="group flex flex-col">
      <div className="relative h-56 w-full overflow-hidden rounded-2xl">
        <Image
          src={pkg.image.url}
          alt={pkg.image.alt}
          fill
          sizes="(min-width: 1280px) 25vw, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          className="object-cover transition-transform duration-500 ease-out-luxury group-hover:scale-105"
        />

        <button
          type="button"
          onClick={() => setSaved((s) => !s)}
          aria-label={saved ? "Remove from saved" : "Save package"}
          aria-pressed={saved}
          className="absolute top-3 left-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/95 text-midnight shadow-card transition-transform hover:scale-105"
        >
          <Heart size={15} className={cn(saved && "fill-accent text-accent")} />
        </button>

        {pkg.badge && (
          <span className="absolute top-3 right-3 rounded-full bg-midnight px-3 py-1 text-xs font-semibold text-white">
            {pkg.badge}
          </span>
        )}

        <span className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 rounded-full bg-white px-3.5 py-1 text-[11px] font-semibold tracking-wide text-midnight uppercase shadow-card">
          {pkg.freeCancellation ? "Free Cancellation" : "Dates Available"}
        </span>
      </div>

      {pkg.location && <p className="mt-4 text-sm text-slate">{pkg.location}</p>}

      <h3 className="mt-1 font-display text-xl font-semibold text-midnight">
        <Link href={detailHref} className="transition-colors hover:text-primary">
          {pkg.title}
        </Link>
      </h3>

      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate">
        <span className="flex items-center gap-1.5">
          <Clock size={14} className="text-primary" />
          {pkg.durationLabel ?? `${pkg.durationDays}D / ${pkg.durationNights}N`}
        </span>
        <span className="flex items-center gap-1.5">
          <Users size={14} className="text-primary" />
          {pkg.groupSize}
        </span>
        {pkg.rating !== undefined && (
          <span className="flex items-center gap-1.5">
            <Star size={14} className="fill-gold text-gold" />
            {pkg.rating.toFixed(1)}
          </span>
        )}
      </div>

      <p className="mt-3 line-clamp-2 text-sm text-slate">{pkg.summary}</p>

      <div className="mt-4 flex items-end justify-between gap-3 border-t border-border pt-4">
        <div>
          <div className="flex items-baseline gap-2">
            {hasDiscount && (
              <span className="text-sm text-slate line-through">{formatCurrency(pkg.originalPrice!)}</span>
            )}
            <span className="text-xl font-semibold text-midnight">{formatCurrency(pkg.price)}</span>
          </div>
          <p className="text-xs text-slate">
            per person
            {hasDiscount && <span className="ml-1.5 font-semibold text-nature">Save {discountPercent}%</span>}
          </p>
        </div>
        <Link
          href={detailHref}
          className="shrink-0 text-sm font-semibold text-primary transition-colors hover:text-primary-dark"
        >
          View Trip
        </Link>
      </div>
    </div>
  );
}
