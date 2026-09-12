"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown, ChevronLeft, ChevronRight, CloudSun } from "lucide-react";
import { cn } from "@/lib/utils";
import { destinations } from "@/lib/data/destinations";
import { fetchDestinationWeather, type DestinationWeather } from "@/lib/weather";
import { formatDisplayDate, getMonthGrid, startOfDay, toISODate, weekdayLabels } from "@/lib/date";
import type { TourPackage } from "@/types";

const heroSlides = [
  {
    image: "/images/hero-image-1-sigiriya.png",
    alt: "Sigiriya rock fortress rising above the jungle in Sri Lanka",
    title: "Climb the Sigiriya Rock Fortress",
    caption: "Ancient frescoes and sweeping views above the Cultural Triangle.",
  },
  {
    image: "/images/2hero-image-2-pinnawala.png",
    alt: "Elephants at the Pinnawala Elephant Orphanage in Sri Lanka",
    title: "Meet the Elephants of Pinnawala",
    caption: "Watch orphaned elephants bathe and roam at Sri Lanka's most memorable sanctuary.",
  },
  {
    image: "/images/hero-image-3-kandy.png",
    alt: "Temple and lakeside scenery in Kandy, Sri Lanka",
    title: "Discover Sacred Lakeside Kandy",
    caption: "The Temple of the Tooth, misty hills, and the gateway to tea country.",
  },
];

const HERO_SLIDE_MS = 6000;

function DateField({
  label,
  value,
  onChange,
  disabled,
  className,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [viewDate, setViewDate] = useState(() => (value ? new Date(`${value}T00:00:00`) : new Date()));
  const containerRef = useRef<HTMLDivElement>(null);
  const display = formatDisplayDate(value);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const today = startOfDay(new Date());
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const cells = getMonthGrid(year, month);

  return (
    <div ref={containerRef} className="relative min-w-0 flex-1">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex w-full cursor-pointer flex-col items-start justify-center gap-0.5 text-left disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
      >
        <span className="text-[13px] leading-none font-bold text-black">{label}</span>
        <span className={cn("mt-1 text-[14px] leading-tight", display ? "text-black" : "text-[#8c8c8c]")}>
          {display ?? "Select date"}
        </span>
      </button>

      {open && (
        <div
          role="dialog"
          aria-label={`${label} calendar`}
          className="absolute top-[calc(100%+8px)] left-0 z-30 w-[300px] rounded-[16px] border border-[#ececec] bg-white p-4 shadow-[0_20px_45px_-14px_rgba(17,17,17,0.28)]"
        >
          <div className="flex items-center justify-between">
            <span className="text-[14px] font-semibold text-black">
              {viewDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                aria-label="Previous month"
                onClick={() => setViewDate(new Date(year, month - 1, 1))}
                className="flex h-7 w-7 items-center justify-center rounded-full text-[#555] transition-colors hover:bg-[#f6f6f6]"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
                aria-label="Next month"
                onClick={() => setViewDate(new Date(year, month + 1, 1))}
                className="flex h-7 w-7 items-center justify-center rounded-full text-[#555] transition-colors hover:bg-[#f6f6f6]"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-7 gap-y-1">
            {weekdayLabels.map((w) => (
              <span key={w} className="text-center text-[11px] font-semibold text-[#8c8c8c]">
                {w}
              </span>
            ))}
            {cells.map(({ date: cellDate, inMonth }, i) => {
              const iso = toISODate(cellDate);
              const isSelected = iso === value;
              const isToday = cellDate.getTime() === today.getTime();
              const isPast = cellDate < today;

              return (
                <button
                  key={i}
                  type="button"
                  disabled={isPast}
                  onClick={() => {
                    onChange(iso);
                    setOpen(false);
                  }}
                  className={cn(
                    "mx-auto flex h-8 w-8 items-center justify-center rounded-full text-[13px] transition-colors",
                    !inMonth && "text-[#c9c9c9]",
                    inMonth && !isSelected && "text-black hover:bg-[#f6f6f6]",
                    isSelected && "bg-[#f88379] font-semibold text-white hover:bg-[#f88379]",
                    isToday && !isSelected && "font-semibold text-[#f88379]",
                    isPast && "cursor-not-allowed opacity-40 hover:bg-transparent",
                  )}
                >
                  {cellDate.getDate()}
                </button>
              );
            })}
          </div>

          <div className="mt-3 flex items-center justify-between border-t border-[#f0f0f0] pt-3">
            <button
              type="button"
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
              className="text-[13px] font-semibold text-[#555] transition-colors hover:text-black"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => {
                const now = new Date();
                onChange(toISODate(now));
                setViewDate(now);
                setOpen(false);
              }}
              className="text-[13px] font-semibold text-[#f88379] transition-colors hover:text-[#ef7469]"
            >
              Today
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function DestinationDropdown({
  value,
  onChange,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const selected = destinations.find((d) => d.slug === value);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className={cn("relative min-w-0 flex-[1.25]", className)}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex w-full cursor-pointer flex-col items-start justify-center gap-0.5 rounded-[10px] border border-[#d0d0d0] bg-white px-5 py-3.5 text-left"
      >
        <span className="flex w-full items-center justify-between text-[13px] leading-none font-bold text-black">
          Where
          <ChevronDown size={14} className={cn("text-[#8c8c8c] transition-transform", open && "rotate-180")} />
        </span>
        <span className={cn("mt-1 text-[14px] leading-tight", selected ? "text-black" : "text-[#8c8c8c]")}>
          {selected ? selected.name : "Select region(s)"}
        </span>
      </button>

      {open && (
        <ul
          role="listbox"
          className="absolute top-[calc(100%+8px)] left-0 z-30 max-h-72 w-full min-w-[240px] overflow-auto rounded-[14px] border border-[#ececec] bg-white p-2 shadow-[0_20px_45px_-14px_rgba(17,17,17,0.28)]"
        >
          <li>
            <button
              type="button"
              role="option"
              aria-selected={!value}
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
              className={cn(
                "flex w-full items-center rounded-[8px] px-3.5 py-2.5 text-left text-[14px] transition-colors hover:bg-[#f6f6f6]",
                !value ? "font-semibold text-black" : "text-[#8c8c8c]",
              )}
            >
              Select region(s)
            </button>
          </li>
          {destinations.map((d) => (
            <li key={d.slug}>
              <button
                type="button"
                role="option"
                aria-selected={value === d.slug}
                onClick={() => {
                  onChange(d.slug);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center justify-between gap-2 rounded-[8px] px-3.5 py-2.5 text-left text-[14px] transition-colors",
                  value === d.slug ? "bg-[#fdece9] font-semibold text-[#f88379]" : "text-black hover:bg-[#f6f6f6]",
                )}
              >
                {d.name}
                {value === d.slug && <Check size={14} className="shrink-0 text-[#f88379]" />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function LuxuryHeroClient({ floatingPackages: _floatingPackages }: { floatingPackages: TourPackage[] }) {
  void _floatingPackages;

  const router = useRouter();
  const [destination, setDestination] = useState("");
  const [date, setDate] = useState("");
  const [weather, setWeather] = useState<DestinationWeather | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherError, setWeatherError] = useState<string | null>(null);
  const [slideIndex, setSlideIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setSlideIndex((i) => (i + 1) % heroSlides.length), HERO_SLIDE_MS);
    return () => clearInterval(id);
  }, []);

  function nextSlide() {
    setSlideIndex((i) => (i + 1) % heroSlides.length);
  }

  function prevSlide() {
    setSlideIndex((i) => (i - 1 + heroSlides.length) % heroSlides.length);
  }

  function handleDestinationChange(value: string) {
    setDestination(value);
    setWeather(null);
    setWeatherError(null);
  }

  async function handleCheckWeather() {
    if (!destination) {
      setWeatherError("Select a destination first");
      return;
    }

    setWeatherLoading(true);
    setWeatherError(null);
    try {
      const result = await fetchDestinationWeather(destination);
      setWeather(result);
    } catch {
      setWeatherError("Weather unavailable");
    } finally {
      setWeatherLoading(false);
    }
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();

    const params = new URLSearchParams();
    if (destination) params.set("destination", destination);
    if (date) params.set("date", date);

    const query = params.toString();

    if (destination) {
      router.push(`/tour-packages/availability?${query}`);
      return;
    }

    router.push(query ? `/tour-packages?${query}` : "/tour-packages");
  }

  return (
    <section className="relative bg-white pb-8">
      <div className="mx-auto max-w-[880px] px-5 pt-16 text-center sm:pt-20 lg:pt-24">
        <h1 className="font-serif text-[42px] leading-[1.08] font-semibold tracking-[-0.02em] text-[#111] sm:text-[56px] lg:text-[68px]">
          Sri Lanka&apos;s best tours to experience
        </h1>
        <p className="mx-auto mt-5 max-w-[520px] text-[17px] leading-relaxed font-normal text-[#6b6b6b] sm:text-[18px]">
          Hand-picked itineraries for culture, wildlife, hill country and beach holidays.
        </p>
      </div>

      {/* Search sits above image; image pulled up so bar straddles the top edge */}
      <div className="relative mx-auto mt-12 max-w-[1776px] px-3 sm:mt-14 sm:px-5 lg:mt-16 lg:px-8">
        <div className="relative z-20 mx-auto w-full max-w-[1040px]">
          <form
            onSubmit={handleSearch}
            className="relative z-20 flex flex-col gap-3 rounded-[14px] bg-white p-5 lg:flex-row lg:items-stretch"
          >
            <DestinationDropdown value={destination} onChange={handleDestinationChange} />

            <button
              type="button"
              onClick={handleCheckWeather}
              className="flex min-w-0 flex-1 cursor-pointer flex-col items-start justify-center gap-0.5 rounded-[10px] border border-[#d0d0d0] bg-white px-5 py-3.5 text-left"
            >
              <span className="text-[13px] leading-none font-bold text-black">Weather</span>
              <span className="mt-1 flex items-center gap-1.5 text-[14px] leading-tight">
                {weatherLoading ? (
                  <span className="text-[#8c8c8c]">Checking…</span>
                ) : weather ? (
                  <span className="flex items-center gap-1.5 text-black">
                    <CloudSun size={14} className="shrink-0 text-[#f88379]" />
                    {weather.tempC}°C · {weather.description}
                  </span>
                ) : weatherError ? (
                  <span className="text-[#c0392b]">{weatherError}</span>
                ) : (
                  <span className="text-[#8c8c8c]">Check forecast</span>
                )}
              </span>
            </button>

            <DateField
              label="Check in"
              value={date}
              onChange={setDate}
              className="rounded-[10px] border border-[#d0d0d0] bg-white px-5 py-3.5"
            />

            <div className="flex shrink-0 items-center">
              <button
                type="submit"
                className="flex h-12 w-full items-center justify-center rounded-full bg-[#f88379] px-8 text-[15px] font-semibold text-white transition-colors hover:bg-[#ef7469] lg:h-full lg:min-h-[56px] lg:w-auto lg:min-w-[168px]"
              >
                Check Availability
              </button>
            </div>
          </form>
        </div>

        {/* Hero image slider — pulled up so the search bar sits on its top edge */}
        <div className="relative -mt-9 h-[min(72vh,780px)] overflow-hidden rounded-[24px] sm:-mt-10 sm:rounded-[28px] lg:-mt-11 lg:rounded-[32px]">
          <AnimatePresence initial={false} mode="sync">
            <motion.div
              key={slideIndex}
              initial={{ opacity: 0, scale: 1.04 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
              className="absolute inset-0"
            >
              <Image
                src={heroSlides[slideIndex].image}
                alt={heroSlides[slideIndex].alt}
                fill
                priority={slideIndex === 0}
                sizes="100vw"
                className="object-cover object-center"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/5 to-transparent" />
            </motion.div>
          </AnimatePresence>

          <div className="absolute bottom-4 left-4 z-10 max-w-[calc(100%-140px)] sm:bottom-6 sm:left-6 sm:max-w-md">
            <AnimatePresence mode="wait">
              <motion.div
                key={slideIndex}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              >
                <h2 className="text-lg font-semibold text-white sm:text-2xl">{heroSlides[slideIndex].title}</h2>
                <p className="mt-1 text-sm text-white/85 sm:text-base">{heroSlides[slideIndex].caption}</p>
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="absolute right-4 bottom-4 z-10 flex items-center gap-3 sm:right-6 sm:bottom-6">
            <div className="h-[3px] w-16 overflow-hidden rounded-full bg-white/30 sm:w-24">
              <motion.div
                key={slideIndex}
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ duration: HERO_SLIDE_MS / 1000, ease: "linear" }}
                className="h-full rounded-full bg-white"
              />
            </div>
            <button
              type="button"
              onClick={prevSlide}
              aria-label="Previous slide"
              className="flex h-8 w-8 items-center justify-center rounded-full border border-white/70 text-white transition-colors hover:bg-white hover:text-black"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              type="button"
              onClick={nextSlide}
              aria-label="Next slide"
              className="flex h-8 w-8 items-center justify-center rounded-full border border-white/70 text-white transition-colors hover:bg-white hover:text-black"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
