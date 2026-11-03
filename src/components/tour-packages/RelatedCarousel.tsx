"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Rating } from "@/components/ui/Rating";
import { WishlistButton } from "@/components/tour-packages/WishlistButton";
import { formatCurrency } from "@/lib/utils";
import type { TourPackage } from "@/types";

/** "You might also like" — swipeable row of tour cards with arrows and wishlist hearts. */
export function RelatedCarousel({ packages }: { packages: TourPackage[] }) {
  const track = useRef<HTMLUListElement>(null);
  const [edges, setEdges] = useState({ start: true, end: false });

  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const update = () => setEdges({ start: el.scrollLeft <= 4, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4 });
    update();
    el.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      el.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  const scroll = (direction: 1 | -1) => track.current?.scrollBy({ left: direction * track.current.clientWidth * 0.8, behavior: "smooth" });

  return (
    <div className="relative">
      <ul ref={track} className="-mx-1 flex snap-x snap-mandatory gap-4 overflow-x-auto px-1 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {packages.map((pkg) => (
          <li key={pkg.slug} className="w-[78%] shrink-0 snap-start sm:w-[calc((100%-2rem)/3)] lg:w-[calc((100%-3rem)/4)]">
            <Link href={`/tour-packages/${pkg.slug}`} className="group flex h-full flex-col overflow-hidden rounded-2xl bg-surface shadow-card ring-1 ring-border">
              <div className="relative aspect-[4/3] w-full overflow-hidden bg-border">
                <Image src={pkg.image.url} alt={pkg.image.alt} fill sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 80vw" className="object-cover transition-transform duration-500 group-hover:scale-105" />
                {pkg.badge && (
                  <Badge tone="white" className="absolute top-3 left-3">
                    {pkg.badge}
                  </Badge>
                )}
                <WishlistButton slug={pkg.slug} variant="icon" className="absolute top-3 right-3" />
              </div>
              <div className="flex flex-1 flex-col gap-1.5 p-4">
                {pkg.location && <p className="text-[11px] font-semibold tracking-wide text-slate uppercase">{pkg.location}</p>}
                <h3 className="line-clamp-2 font-semibold text-midnight">{pkg.title}</h3>
                <p className="text-xs text-slate">{[pkg.durationLabel ?? (pkg.durationDays ? `${pkg.durationDays} days` : null), pkg.groupSize].filter(Boolean).join(" · ")}</p>
                <div className="mt-auto flex items-end justify-between gap-2 pt-2">
                  {pkg.rating !== undefined ? <Rating value={pkg.rating} reviewCount={pkg.reviewCount} /> : <span />}
                  <p className="text-right text-sm text-slate">
                    From{" "}
                    {pkg.originalPrice && pkg.originalPrice > pkg.price && <span className="line-through">{formatCurrency(pkg.originalPrice)}</span>}{" "}
                    <span className="text-base font-semibold text-accent">{formatCurrency(pkg.price)}</span>
                  </p>
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ul>
      {!edges.start && (
        <button type="button" aria-label="Previous tours" onClick={() => scroll(-1)} className="absolute top-1/3 -left-3 hidden h-10 w-10 items-center justify-center rounded-full bg-surface text-midnight shadow-card-hover ring-1 ring-border sm:flex">
          <ChevronLeft size={20} />
        </button>
      )}
      {!edges.end && (
        <button type="button" aria-label="More tours" onClick={() => scroll(1)} className="absolute top-1/3 -right-3 hidden h-10 w-10 items-center justify-center rounded-full bg-surface text-midnight shadow-card-hover ring-1 ring-border sm:flex">
          <ChevronRight size={20} />
        </button>
      )}
    </div>
  );
}
