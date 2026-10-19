import Image from "next/image";
import Link from "next/link";
import { ChevronsRight } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import type { TourPackage } from "@/types";

const fade = "transition-all duration-500 ease-out-luxury";

/**
 * Tall photo card with the tour name, summary and details underneath. On hover the photo
 * darkens and the Book Now / More Information buttons rise in from its bottom edge.
 */
export function FeaturedPackageCard({ pkg }: { pkg: TourPackage }) {
  const detailHref = `/tour-packages/${pkg.slug}`;
  const duration = pkg.durationLabel ?? `${pkg.durationDays} days / ${pkg.durationNights} nights`;
  const meta = [duration, pkg.groupSize];
  const hasDiscount = pkg.originalPrice !== undefined && pkg.originalPrice > pkg.price;
  const discountPercent = hasDiscount ? Math.round(100 - (pkg.price / pkg.originalPrice!) * 100) : 0;

  return (
    <article className="group">
      <div className="relative aspect-[11/15] overflow-hidden rounded-2xl">
        <Image
          src={pkg.image.url}
          alt={pkg.image.alt}
          fill
          sizes="(min-width: 1280px) 25vw, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          className="object-cover transition-transform duration-700 ease-out-luxury group-hover:scale-105"
        />
        {/* Shade that appears on hover so the buttons read on any photo */}
        <div
          className={cn(
            "absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent opacity-0 group-hover:opacity-100",
            fade,
          )}
        />

        {/* Whole photo links to the tour; the buttons sit above this */}
        <Link href={detailHref} className="absolute inset-0 z-[1]" aria-label={pkg.title} />

        <div
          className={cn(
            "invisible absolute inset-x-0 bottom-0 z-[2] flex translate-y-6 flex-col gap-3 p-6 opacity-0 sm:p-7",
            "group-hover:visible group-hover:translate-y-0 group-hover:opacity-100",
            "group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100",
            fade,
          )}
        >
          <Link
            href={detailHref}
            className="flex h-12 items-center justify-center gap-2 rounded-full bg-accent text-sm font-semibold tracking-wide text-white uppercase transition-colors hover:bg-accent-dark"
          >
            Book Now
            <ChevronsRight size={16} aria-hidden />
          </Link>
          <Link
            href={detailHref}
            className="flex h-12 items-center justify-center rounded-full bg-white/20 text-sm font-semibold tracking-wide text-white uppercase backdrop-blur-md transition-colors hover:bg-white/30"
          >
            More Information
          </Link>
        </div>
      </div>

      <h3 className="mt-5 line-clamp-2 font-display text-xl leading-tight font-bold tracking-tight text-midnight sm:text-[22px]">
        <Link href={detailHref} className="transition-colors hover:text-primary">
          {pkg.title}
        </Link>
      </h3>
      <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-slate">{pkg.summary}</p>

      <p className="mt-4 text-sm font-bold tracking-tight text-midnight uppercase">
        {pkg.location ? `${pkg.location}, Sri Lanka` : "Sri Lanka"}
      </p>
      <ul className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-medium text-slate uppercase">
        {meta.map((item, i) => (
          <li key={item} className="flex items-center gap-2">
            {i > 0 && <span className="h-1 w-1 rounded-full bg-slate/70" aria-hidden />}
            {item}
          </li>
        ))}
      </ul>

      <div className="mt-4 flex items-end justify-between gap-3 border-t border-border pt-4">
        <div>
          <span className="block text-xs font-medium text-slate uppercase">From</span>
          <div className="flex items-baseline gap-2">
            <span className="font-display text-[28px] leading-none font-black tracking-tight text-accent">
              {formatCurrency(pkg.price)}
            </span>
            {hasDiscount && (
              <span className="text-sm text-slate line-through">{formatCurrency(pkg.originalPrice!)}</span>
            )}
          </div>
        </div>
        <div className="text-right text-xs text-slate">
          per person
          {hasDiscount && (
            <span className="mt-1 block rounded-full bg-nature/10 px-2 py-0.5 font-semibold text-nature">
              Save {discountPercent}%
            </span>
          )}
        </div>
      </div>
    </article>
  );
}
