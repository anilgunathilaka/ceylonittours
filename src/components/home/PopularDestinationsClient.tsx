"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Swiper, SwiperSlide } from "swiper/react";
import { A11y } from "swiper/modules";
import type { Swiper as SwiperType } from "swiper";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { sectionTitleClass } from "@/components/ui/SectionHeading";
import type { Destination } from "@/types";

import "swiper/css";

// Section background; the reveal doors and page fader use it too
const BG = "var(--color-surface)";
const AUTOPLAY_MS = 3000;
const DOOR_MS = 1500;
const FADER_MS = 1200;
// GSAP "power2.out"
const POWER2_OUT = "cubic-bezier(0.25, 0.46, 0.45, 0.94)";
const NAME_SHADOW = "0 2px 24px rgb(0 0 0 / 0.35)";

type SlideEl = HTMLElement & { progress: number };

// Rendered width per 1px of font size of each name, on one line and of its longest word,
// so every name can share one size that the longest still fits
type NameMetrics = { line: number; word: number };
const nameWidthPerPx = new WeakMap<HTMLElement, NameMetrics>();

function measureName(name: HTMLElement) {
  let metrics = nameWidthPerPx.get(name);
  if (metrics === undefined) {
    const { fontSize, whiteSpace, width, maxWidth } = name.style;
    name.style.fontSize = "100px";
    name.style.maxWidth = "none";
    name.style.whiteSpace = "nowrap";
    name.style.width = "max-content";
    const line = name.offsetWidth / 100;
    name.style.whiteSpace = "normal";
    name.style.width = "min-content";
    const word = name.offsetWidth / 100;
    Object.assign(name.style, { fontSize, whiteSpace, width, maxWidth });
    metrics = { line, word };
    if (line > 0) nameWidthPerPx.set(name, metrics);
  }
  return metrics;
}

function resetNameMeasurements(swiper: SwiperType) {
  for (const slide of swiper.slides) {
    const name = slide.querySelector<HTMLElement>("[data-name]");
    if (name) nameWidthPerPx.delete(name);
  }
  applyProgress(swiper);
}

const lerp = (from: number, to: number, t: number) => from + (to - from) * t;

/**
 * Fades neighbouring slides to just their name: image + description fade out, and the
 * name shrinks and glides into the strip of the neighbour that is still on screen.
 */
function applyProgress(swiper: SwiperType) {
  const wide = window.innerWidth >= 1024;
  const maxFont = wide ? 112 : 72;
  const minFont = wide ? 40 : 28;

  const slides = (swiper.slides as SlideEl[]).flatMap((slide) => {
    const image = slide.querySelector<HTMLElement>("[data-image]");
    const promo = slide.querySelector<HTMLElement>("[data-promo]");
    const name = slide.querySelector<HTMLElement>("[data-name]");
    return image && promo && name ? [{ slide, image, promo, name, metrics: measureName(name) }] : [];
  });
  if (slides.length === 0) return;

  const slideWidth = slides[0].slide.offsetWidth;
  // How much of a neighbouring slide is visible beside the centre slide
  const strip = Math.max((swiper.width - slideWidth) / 2, 0);
  const longestLine = Math.max(...slides.map((s) => s.metrics.line));
  const longestWord = Math.max(...slides.map((s) => s.metrics.word));

  // One size for every centre name (the longest still fits on one line) and one for every
  // side name (the longest word still fits the visible strip; longer names wrap by word)
  const centreWidth = slideWidth * 0.86;
  const sideWidth = strip * 0.82;
  const centreFont = longestLine ? Math.min(maxFont, centreWidth / longestLine) : maxFont;
  const sideFont = longestWord ? Math.min(minFont, centreFont, sideWidth / longestWord) : minFont;
  const showSide = sideFont >= 14;

  for (const { slide, image, promo, name } of slides) {
    const t = Math.min(Math.abs(slide.progress), 1);

    image.style.opacity = String(1 - t);
    promo.style.opacity = String(1 - t);
    promo.style.pointerEvents = t < 0.5 ? "auto" : "none";

    name.style.fontSize = `${lerp(centreFont, sideFont, t)}px`;
    name.style.maxWidth = `${lerp(centreWidth, Math.max(sideWidth, 1), t)}px`;
    name.style.opacity = String(lerp(1, showSide ? 0.8 : 0, t));
    // White over the photo, fading to the site text colour on the plain background beside it
    name.style.color = `color-mix(in srgb, var(--color-midnight) ${Math.round(t * 100)}%, white)`;
    // The shadow only helps over the photo; on the plain background it reads as a smudge
    name.style.textShadow = t < 0.5 ? NAME_SHADOW : "none";

    // Slides left of centre (progress > 0) show their right-hand strip, slides right of centre their left
    const sideCentre = slide.progress > 0 ? slideWidth - strip / 2 : strip / 2;
    name.style.left = `${lerp(slideWidth / 2, sideCentre, t)}px`;
  }
}

function applyTransition(swiper: SwiperType, duration: number) {
  for (const slide of swiper.slides) {
    slide.querySelectorAll<HTMLElement>("[data-image],[data-promo],[data-name]").forEach((el) => {
      el.style.transitionDuration = `${duration}ms`;
    });
  }
}

export function PopularDestinationsClient({ destinations }: { destinations: Destination[] }) {
  const router = useRouter();
  const swiperRef = useRef<SwiperType | null>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const [current, setCurrent] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [autoplay, setAutoplay] = useState(false);
  const [leaving, setLeaving] = useState(false);

  // Featured destinations first, keeping the existing order within each group
  const ordered = [...destinations.filter((d) => d.featured), ...destinations.filter((d) => !d.featured)];

  // Open the "doors" over the slides once the carousel scrolls into view, then start autoplay
  useEffect(() => {
    const el = triggerRef.current;
    if (!el) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        setRevealed(true);
        window.setTimeout(() => setAutoplay(true), reduced ? 0 : DOOR_MS);
      },
      { rootMargin: "0px 0px -30% 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Every slide change restarts the timer, so manual navigation never jumps straight on
  useEffect(() => {
    if (!autoplay) return;
    const id = window.setTimeout(() => swiperRef.current?.slideNext(), AUTOPLAY_MS);
    return () => window.clearTimeout(id);
  }, [autoplay, current]);

  // Arrow keys move the carousel while it is on screen
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      const target = e.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable='true']")) return;
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect || rect.height === 0 || rect.bottom < 0 || rect.top > window.innerHeight) return;
      if (e.key === "ArrowLeft") swiperRef.current?.slidePrev();
      else swiperRef.current?.slideNext();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // Cover the page with the section colour, then navigate
  const onCtaClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    const href = e.currentTarget.getAttribute("href") ?? "/destinations";
    setLeaving(true);
    window.setTimeout(() => router.push(href), FADER_MS);
  };

  return (
    <section
      id="destinations"
      className="relative scroll-mt-28 overflow-hidden px-6 py-20 sm:px-0 lg:py-28"
      style={{ backgroundColor: BG }}
    >
      {/* Page fader used for the CTA transition */}
      <div
        aria-hidden
        className="fixed inset-x-0 z-[999] h-screen"
        style={{
          backgroundColor: BG,
          top: leaving ? 0 : "100vh",
          visibility: leaving ? "visible" : "hidden",
          transition: `top ${FADER_MS}ms ${POWER2_OUT}`,
        }}
      />

      <div className="relative mx-3 max-w-[1000px] md:mx-auto xl:max-w-[1067px]">
        <div className="pb-12 text-center lg:pb-16">
          <h2 className={cn(sectionTitleClass, "text-midnight")}>Popular Destinations Across the Island</h2>
        </div>
      </div>

      {/* Desktop carousel */}
      <div ref={triggerRef} className="relative z-[2] mx-auto hidden max-w-[3200px] cursor-grab md:block">
        <Swiper
          modules={[A11y]}
          onBeforeInit={(swiper) => {
            swiperRef.current = swiper;
          }}
          loop
          centeredSlides
          slidesPerView="auto"
          speed={300}
          threshold={10}
          watchSlidesProgress
          a11y={{ enabled: true }}
          onRealIndexChange={(swiper) => setCurrent(swiper.realIndex)}
          onProgress={applyProgress}
          onSetTransition={applyTransition}
          onResize={resetNameMeasurements}
          onAfterInit={(swiper) => {
            applyProgress(swiper);
            // Re-measure once the display font has loaded, since fallback fonts have different widths
            document.fonts?.ready.then(() => !swiper.destroyed && resetNameMeasurements(swiper));
          }}
        >
          {ordered.map((destination) => (
            <SwiperSlide key={destination.slug} className="mt-3 !w-[min(1000px,calc(100vw-96px))] xl:!w-[1067px]">
              <div className="relative h-[482px] overflow-hidden rounded-2xl lg:h-[606px]">
                <div
                  data-name
                  style={{ left: "50%", transform: "translate(-50%, -50%)", textShadow: NAME_SHADOW }}
                  className="pointer-events-none absolute top-1/2 z-[1] w-max pl-[0.4em] text-center font-serif leading-[1.15] tracking-[0.4em] text-white uppercase transition-[opacity,font-size,left,max-width,color] ease-out"
                >
                  {destination.name}
                </div>
                <div data-image className="absolute inset-0 transition-opacity ease-out">
                  <Image
                    src={destination.image.url}
                    alt={destination.image.alt}
                    fill
                    sizes="(min-width: 1280px) 1067px, 1000px"
                    className="pointer-events-none object-cover"
                  />
                  {/* Soft shade so the white name stays readable on bright photos */}
                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgb(0_0_0/0.32),rgb(0_0_0/0.12)_70%)]" />
                </div>
                {/* Doors: two panels in the section colour that slide apart on reveal */}
                {(["left", "right"] as const).map((side) => (
                  <div
                    key={side}
                    aria-hidden
                    className={cn("absolute top-0 h-full", side === "left" ? "-left-px" : "-right-px")}
                    style={{
                      backgroundColor: BG,
                      width: revealed ? 0 : "51%",
                      transition: `width ${DOOR_MS}ms ${POWER2_OUT}`,
                    }}
                  />
                ))}
              </div>

              <div data-promo className="flex transition-opacity ease-out">
                <p className="mt-4 mr-2 line-clamp-3 max-w-[404px] text-slate">{destination.description}</p>
                <div className="ml-auto flex flex-col items-end">
                  <div>
                    <button
                      type="button"
                      onClick={() => swiperRef.current?.slidePrev()}
                      aria-label="Previous destination"
                      className="p-4 text-accent"
                    >
                      <ArrowLeft size={24} strokeWidth={2.25} />
                    </button>
                    <button
                      type="button"
                      onClick={() => swiperRef.current?.slideNext()}
                      aria-label="Next destination"
                      className="py-4 pr-4 text-accent"
                    >
                      <ArrowRight size={24} strokeWidth={2.25} />
                    </button>
                  </div>
                  <Link
                    href="/destinations"
                    onClick={onCtaClick}
                    aria-label={`Explore ${destination.name}`}
                    className="mt-2 rounded-full bg-accent px-7 py-3 text-center text-sm font-semibold tracking-[0.12em] text-white uppercase transition-colors hover:bg-accent-dark"
                  >
                    {destination.name}
                  </Link>
                </div>
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
      </div>

      {/* Mobile: stacked cards */}
      <div className="relative z-[2] mx-auto block max-w-[3200px] md:hidden">
        {ordered.map((destination) => (
          <Link
            key={destination.slug}
            href="/destinations"
            className="relative my-3.5 block h-[116px] overflow-hidden rounded-2xl sm:h-[256px]"
          >
            <Image
              src={destination.image.url}
              alt={destination.image.alt}
              fill
              sizes="(min-width: 640px) 720px, 100vw"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-black/20" />
            <span className="absolute inset-0 z-[1] ml-1 flex items-center justify-center text-center font-serif text-[20px] tracking-[0.4em] text-white uppercase sm:text-[40px]">
              {destination.name}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
