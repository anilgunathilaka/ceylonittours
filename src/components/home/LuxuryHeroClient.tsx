"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, ChevronDown, Clock } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { formatCurrency } from "@/lib/utils";
import type { TourPackage } from "@/types";

const slides = [
  {
    kicker: "Discover",
    title: "The rock fortress of Sigiriya",
    description:
      "Climb Sri Lanka's legendary citadel — frescoes, lion's-paw gateways, and sweeping jungle views above the Cultural Triangle.",
    image: "/images/hero-image-sigiriya.png",
    alt: "Sigiriya rock fortress rising above the jungle in Sri Lanka",
  },
  {
    kicker: "Explore",
    title: "Meet the elephants of Pinnawala",
    description:
      "Witness orphaned elephants bathing and roaming at one of Sri Lanka's most memorable wildlife experiences.",
    image: "/images/hero-image-pinnawala.jpeg",
    alt: "Elephants at the Pinnawala Elephant Orphanage in Sri Lanka",
  },
  {
    kicker: "Enjoy",
    title: "Sacred lakeside Kandy",
    description:
      "Temple of the Tooth, highland cool air, and the gateway to tea country — Kandy is the cultural heart of the island.",
    image: "/images/hero-image-kandy.png",
    alt: "Temple and lakeside scenery in Kandy, Sri Lanka",
  },
];

const SLIDE_MS = 7000;

export function LuxuryHeroClient({ floatingPackages }: { floatingPackages: TourPackage[] }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setIndex((i) => (i + 1) % slides.length), SLIDE_MS);
    return () => clearInterval(id);
  }, []);

  function next() {
    setIndex((i) => (i + 1) % slides.length);
  }

  function prev() {
    setIndex((i) => (i - 1 + slides.length) % slides.length);
  }

  const slide = slides[index];

  return (
    <section className="relative z-10 px-3 pb-6 sm:px-5 lg:px-8">
      <div className="relative mx-auto h-[min(780px,92vh)] max-w-[1776px] overflow-hidden rounded-3xl">
        {/* Background slider */}
        <div className="absolute inset-0">
          <AnimatePresence initial={false} mode="sync">
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 1.04 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
              className="absolute inset-0"
            >
              <Image
                src={slide.image}
                alt={slide.alt}
                fill
                priority={index === 0}
                sizes="100vw"
                className="object-cover"
              />
            </motion.div>
          </AnimatePresence>
          <div className="absolute inset-0 bg-[rgba(13,13,12,0.42)]" />
        </div>

        {/* Left copy */}
        <Container className="relative z-10 flex h-full flex-col justify-center py-16 lg:py-20">
          <AnimatePresence mode="wait">
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -18 }}
              transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
              className="flex max-w-[451px] flex-col"
            >
              <h1 className="font-sans text-5xl leading-none font-bold tracking-tight text-white sm:text-6xl lg:text-[80px] lg:leading-[0.95]">
                {slide.kicker}
              </h1>
              <p className="mt-1 font-sans text-xl font-semibold text-white sm:text-2xl lg:text-[28px] lg:leading-tight">
                {slide.title}
              </p>
              <p className="mt-4 mb-9 max-w-md text-base leading-relaxed text-white/90 sm:text-lg">
                {slide.description}
              </p>
              <div>
                <Button
                  href="/tour-packages"
                  variant="outline"
                  size="lg"
                  icon={<ArrowRight size={16} />}
                >
                  Explore Tours
                </Button>
              </div>
            </motion.div>
          </AnimatePresence>
        </Container>

        {/* Progress + arrows */}
        <div className="absolute top-[55%] right-5 z-20 hidden w-[min(550px,46%)] items-center gap-9 lg:flex xl:right-16">
          <div className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/20">
            <motion.div
              key={index}
              initial={{ width: "0%" }}
              animate={{ width: "100%" }}
              transition={{ duration: SLIDE_MS / 1000, ease: "linear" }}
              className="h-full rounded-full bg-white"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={prev}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-white text-white transition-colors hover:bg-white hover:text-midnight"
              aria-label="Previous slide"
            >
              <ArrowLeft size={14} />
            </button>
            <button
              type="button"
              onClick={next}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-white text-white transition-colors hover:bg-white hover:text-midnight"
              aria-label="Next slide"
            >
              <ArrowRight size={14} />
            </button>
          </div>
        </div>

        {/* Mobile controls */}
        <div className="absolute right-4 bottom-4 z-20 flex items-center gap-3 lg:hidden">
          <div className="h-[3px] w-24 overflow-hidden rounded-full bg-white/20 sm:w-40">
            <motion.div
              key={`m-${index}`}
              initial={{ width: "0%" }}
              animate={{ width: "100%" }}
              transition={{ duration: SLIDE_MS / 1000, ease: "linear" }}
              className="h-full rounded-full bg-white"
            />
          </div>
          <button
            type="button"
            onClick={prev}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-white text-white"
            aria-label="Previous slide"
          >
            <ArrowLeft size={14} />
          </button>
          <button
            type="button"
            onClick={next}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-white text-white"
            aria-label="Next slide"
          >
            <ArrowRight size={14} />
          </button>
        </div>

        {/* Floating tour cards */}
        <div className="absolute right-0 bottom-[72px] z-20 hidden gap-4 pr-5 xl:flex xl:pr-10">
          {floatingPackages.map((pkg) => (
            <Link
              key={pkg.slug}
              href={`/tour-packages/${pkg.slug}`}
              className="group flex w-[340px] items-center gap-4 rounded-2xl bg-white/30 p-4 backdrop-blur-[5px] transition-transform hover:-translate-y-0.5"
            >
              <div className="relative h-[104px] w-[104px] shrink-0 overflow-hidden rounded-2xl">
                <Image src={pkg.image.url} alt={pkg.image.alt} fill sizes="104px" className="object-cover" />
                <div className="absolute inset-0 bg-black/20" />
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="truncate font-sans text-lg font-semibold text-white">{pkg.title}</span>
                <span className="text-base font-medium tracking-wide text-white">
                  {formatCurrency(pkg.price)}
                  <span className="text-white/80">/Person</span>
                </span>
                <div className="mt-1 flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 text-sm text-white/85">
                    <Clock size={13} />
                    {pkg.durationLabel ?? `${pkg.durationDays} Days`}
                  </span>
                  <span className="rounded-full bg-white px-3.5 py-1.5 text-xs font-semibold text-midnight transition-colors group-hover:bg-primary group-hover:text-white">
                    Book Now
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Scroll down */}
        <a
          href="#destinations"
          className="absolute bottom-0 left-1/2 z-20 hidden origin-left -translate-x-1/2 -rotate-90 items-center gap-4 text-white lg:flex"
        >
          <span className="whitespace-nowrap text-sm font-light tracking-wide">Scroll Down</span>
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white">
            <ChevronDown size={16} className="rotate-90 animate-bounce" />
          </span>
        </a>
      </div>
    </section>
  );
}
