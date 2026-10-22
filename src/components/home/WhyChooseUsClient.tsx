"use client";

import { useRef } from "react";
import { useInView } from "framer-motion";
import { Car, Headset, MapPinned, Route } from "lucide-react";
import { sectionTitleClass } from "@/components/ui/SectionHeading";
import { cn } from "@/lib/utils";

export interface WhyChooseUsCard {
  title: string;
  description: string;
  /** Icon name from the content data */
  icon: string;
}

const iconMap = { MapPinned, Car, Route, Headset } as const;

// Cards start pushed down by a growing step (card 4 lowest) and glide up together
const STEP = "clamp(4.25rem, calc(-0.036rem + 6.696vw), 8rem)";
const EASE_OUT_CUBIC = "cubic-bezier(0.33, 1, 0.68, 1)";
const MARQUEE_COPIES = 3;

export function WhyChooseUsClient({
  marquee,
  title,
  description,
  cards,
}: {
  marquee: string;
  title: string;
  description: string;
  cards: WhyChooseUsCard[];
}) {
  const sectionRef = useRef<HTMLElement>(null);
  const visible = useInView(sectionRef, { once: true, margin: "0px 0px -20% 0px" });
  const move = (delayMs = 0, durationMs = 1000) => ({
    transition: `translate ${durationMs}ms ${EASE_OUT_CUBIC} ${delayMs}ms, opacity ${durationMs}ms ${EASE_OUT_CUBIC} ${delayMs}ms`,
  });

  return (
    <section ref={sectionRef} className="overflow-x-clip bg-ivory py-20 lg:py-28">
      {/* Giant scrolling band with the logo mark as a sticker */}
      <div
        aria-hidden
        className="mb-12 flex w-max select-none lg:mb-16"
        style={{ opacity: visible ? 1 : 0, ...move(0, 600) }}
      >
        {Array.from({ length: MARQUEE_COPIES }, (_, i) => (
          <div
            key={i}
            className="flex shrink-0 items-center gap-8 pr-8 lg:gap-12 lg:pr-12"
            style={{ animation: "marquee 30s linear infinite" }}
          >
            <span className="font-serif text-[clamp(4rem,11vw,11rem)] leading-none font-semibold tracking-[-0.03em] whitespace-nowrap text-primary uppercase">
              {marquee}
            </span>
            <span
              className="aspect-[345/568] h-[clamp(4.5rem,11vw,11rem)] shrink-0 bg-accent"
              style={{
                maskImage: "url(/images/logo-mark.png)",
                maskSize: "contain",
                maskRepeat: "no-repeat",
                WebkitMaskImage: "url(/images/logo-mark.png)",
                WebkitMaskSize: "contain",
                WebkitMaskRepeat: "no-repeat",
              }}
            />
          </div>
        ))}
      </div>

      <div className="flex flex-col items-center gap-6 px-5 text-center lg:gap-8">
        <h2 className={cn(sectionTitleClass, "max-w-4xl text-midnight lg:max-w-none")}>{title}</h2>
        <p
          className="max-w-[46ch] text-lg leading-relaxed text-slate sm:text-xl"
          style={{ translate: visible ? "0 0" : "0 clamp(0.875rem, calc(0.161rem + 1.116vw), 1.5rem)", ...move() }}
        >
          {description}
        </p>
      </div>

      <div className="mx-auto mt-12 grid w-full max-w-(--container-content) grid-cols-1 gap-2 px-2 md:grid-cols-2 lg:mt-16 lg:grid-cols-4">
        {cards.map((card, i) => {
          const Icon = iconMap[card.icon as keyof typeof iconMap] ?? MapPinned;
          return (
            <div
              key={card.title}
              className="relative flex min-h-[340px] flex-col justify-between gap-16 overflow-hidden rounded-2xl bg-primary p-6 text-white sm:p-8 lg:aspect-square lg:min-h-0 lg:gap-6"
              style={{ translate: visible ? "0 0" : `0 calc(${STEP} * ${i + 1})`, ...move(0, 1000 + i * 50) }}
            >
              <div className="relative flex items-start justify-between gap-4">
                <h3 className="max-w-[12ch] font-display text-2xl leading-[1.05] font-bold tracking-tight uppercase lg:text-[1.65rem]">
                  {card.title}
                </h3>
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white text-primary">
                  <Icon size={22} aria-hidden />
                </span>
              </div>
              <p className="relative max-w-[32ch] text-base leading-relaxed text-white/85 lg:text-lg">{card.description}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
