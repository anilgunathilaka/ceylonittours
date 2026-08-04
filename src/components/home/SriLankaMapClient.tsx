"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUpRight, MapPin } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { cn, formatCurrency } from "@/lib/utils";
import type { Destination } from "@/types";

/**
 * Pin positions as % of the real Sri Lanka SVG viewBox (450 × 793).
 * Tuned to district geography from @svg-maps/sri-lanka.
 */
const pinPositions: Record<string, { x: number; y: number }> = {
  anuradhapura: { x: 48, y: 28 },
  trincomalee: { x: 72, y: 30 },
  sigiriya: { x: 55, y: 40 },
  kandy: { x: 50, y: 55 },
  "nuwara-eliya": { x: 52, y: 64 },
  ella: { x: 58, y: 68 },
  colombo: { x: 24, y: 70 },
  galle: { x: 32, y: 86 },
  mirissa: { x: 38, y: 90 },
  yala: { x: 68, y: 80 },
};

export function SriLankaMapClient({ destinations }: { destinations: Destination[] }) {
  const initial =
    destinations.find((d) => d.slug === "sigiriya")?.slug ?? destinations[0]?.slug ?? "";
  const [activeSlug, setActiveSlug] = useState(initial);
  const active = destinations.find((d) => d.slug === activeSlug) ?? destinations[0];

  if (!active) return null;

  return (
    <section className="relative overflow-hidden bg-primary py-24 lg:py-32">
      {/* Destination image as section background */}
      <AnimatePresence mode="sync">
        <motion.div
          key={`bg-${active.slug}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="absolute inset-0"
        >
          <Image
            src={active.image.url}
            alt=""
            fill
            sizes="100vw"
            className="object-cover"
            aria-hidden
            priority={active.slug === initial}
          />
        </motion.div>
      </AnimatePresence>
      <div className="absolute inset-0 bg-primary/50" aria-hidden />
      <div className="absolute inset-0 bg-gradient-to-r from-primary/50 via-primary/40 to-primary/30" aria-hidden />

      <Container className="relative z-10">
        {/* Row 1 — centered title */}
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-5 text-center">
          <p className="text-sm font-semibold tracking-[0.28em] text-secondary uppercase">
            Explore The Island
          </p>
          <h2 className="text-4xl font-bold tracking-[0.08em] text-white uppercase sm:text-5xl lg:text-[3.25rem] lg:leading-[1.15]">
            Discover Destinations Across Ceylon
          </h2>
        </div>

        {/* Row 2 — centered map + selected location */}
        <div className="mx-auto mt-14 flex w-full max-w-4xl flex-col items-center justify-center gap-8 sm:flex-row sm:items-stretch sm:gap-10">
          <div className="relative w-full max-w-[260px] shrink-0 sm:max-w-[280px]">
            <div className="relative aspect-[450/793] w-full">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/sri-lanka-map.svg"
                alt="Map of Sri Lanka"
                className="absolute inset-0 h-full w-full object-contain"
                draggable={false}
              />

              {destinations.map((d) => {
                const pos = pinPositions[d.slug] ?? d.mapPosition;
                const isActive = activeSlug === d.slug;
                return (
                  <button
                    key={d.slug}
                    type="button"
                    onMouseEnter={() => setActiveSlug(d.slug)}
                    onFocus={() => setActiveSlug(d.slug)}
                    onClick={() => setActiveSlug(d.slug)}
                    style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
                    className="absolute z-10 -translate-x-1/2 -translate-y-1/2 focus-visible:outline-2 focus-visible:outline-secondary"
                    aria-label={`Show details for ${d.name}`}
                    aria-pressed={isActive}
                  >
                    <span className="relative flex items-center justify-center">
                      {isActive && (
                        <span className="absolute h-9 w-9 animate-ping rounded-full bg-accent/40" />
                      )}
                      <span
                        className={cn(
                          "relative block rounded-full border-2 border-white shadow-md transition-all duration-300",
                          isActive ? "h-4 w-4 bg-accent" : "h-3 w-3 bg-secondary hover:scale-125",
                        )}
                      />
                      {isActive && (
                        <span className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-accent px-2.5 py-1 text-[11px] font-bold text-white shadow-card">
                          {d.name}
                        </span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={active.slug}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="group relative flex min-h-[360px] w-full max-w-md flex-col overflow-hidden rounded-3xl shadow-elevated ring-1 ring-white/15 sm:min-h-[420px] sm:max-w-none sm:flex-1"
            >
              <Image
                src={active.image.url}
                alt={active.image.alt}
                fill
                sizes="(min-width: 640px) 40vw, 90vw"
                className="object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-midnight/90 via-midnight/35 to-transparent" />

              <div className="relative mt-auto flex flex-col gap-2 p-6 sm:p-7">
                <span className="flex items-center gap-1.5 text-xs font-semibold tracking-[0.18em] text-secondary uppercase">
                  <MapPin size={12} />
                  {active.region}
                </span>
                <h3 className="text-2xl font-bold tracking-wide text-white uppercase sm:text-3xl">
                  {active.name}
                </h3>
                <p className="line-clamp-3 text-sm leading-relaxed text-white/85">{active.description}</p>
                <div className="mt-3 flex items-center justify-between gap-3">
                  <span className="text-sm text-white/80">
                    From{" "}
                    <span className="font-bold text-white">{formatCurrency(active.startingPrice)}</span>
                  </span>
                  <Link
                    href="/destinations"
                    className="flex h-11 w-11 items-center justify-center rounded-full bg-secondary text-white transition-colors hover:bg-secondary-dark"
                    aria-label={`Explore ${active.name}`}
                  >
                    <ArrowUpRight size={18} strokeWidth={2.5} />
                  </Link>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </Container>
    </section>
  );
}
