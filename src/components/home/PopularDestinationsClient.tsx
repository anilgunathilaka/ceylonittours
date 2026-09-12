"use client";

import Image from "next/image";
import Link from "next/link";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, A11y } from "swiper/modules";
import { ArrowLeft, ArrowRight, ArrowUpRight, MapPin } from "lucide-react";
import { useRef } from "react";
import type { Swiper as SwiperType } from "swiper";
import { motion } from "framer-motion";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/ui/Reveal";
import { formatCurrency } from "@/lib/utils";
import type { Destination } from "@/types";

import "swiper/css";
import "swiper/css/navigation";

export function PopularDestinationsClient({ destinations }: { destinations: Destination[] }) {
  const swiperRef = useRef<SwiperType | null>(null);

  return (
    <section id="destinations" className="relative scroll-mt-28 overflow-hidden bg-ivory py-20 lg:py-28">
      {/* Soft ambient glow — left margin */}
      <div className="pointer-events-none absolute inset-y-0 left-0 hidden w-[min(280px,18vw)] lg:block" aria-hidden>
        <motion.div
          className="absolute top-[12%] -left-16 h-80 w-80 rounded-full bg-secondary/25 blur-3xl"
          animate={{ scale: [1, 1.12, 1], opacity: [0.45, 0.7, 0.45] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute top-[42%] left-0 h-56 w-56 rounded-full bg-primary/15 blur-3xl"
          animate={{ y: [0, 24, 0], opacity: [0.35, 0.55, 0.35] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 0.6 }}
        />
        <motion.div
          className="absolute bottom-[18%] left-8 h-44 w-44 rounded-full bg-accent/20 blur-3xl"
          animate={{ scale: [1, 1.15, 1] }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 1.2 }}
        />
      </div>

      {/* Soft ambient glow — right margin */}
      <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-[min(280px,18vw)] lg:block" aria-hidden>
        <motion.div
          className="absolute top-[18%] -right-12 h-96 w-96 rounded-full bg-primary/18 blur-3xl"
          animate={{ scale: [1, 1.1, 1], opacity: [0.4, 0.65, 0.4] }}
          transition={{ duration: 9, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
        />
        <motion.div
          className="absolute top-[48%] right-2 h-52 w-52 rounded-full bg-secondary/25 blur-3xl"
          animate={{ y: [0, -20, 0], opacity: [0.4, 0.6, 0.4] }}
          transition={{ duration: 8.5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        />
        <motion.div
          className="absolute right-6 bottom-[16%] h-48 w-48 rounded-full bg-gold/25 blur-3xl"
          animate={{ scale: [1, 1.18, 1] }}
          transition={{ duration: 7.5, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}
        />
      </div>

      <Container className="relative z-10">
        <div className="relative">
          <SectionHeading
            eyebrow="Where To Go"
            title="Popular Destinations Across the Island"
          />
          <div className="mt-6 flex items-center justify-center gap-2 sm:absolute sm:top-0 sm:right-0 sm:mt-0">
            <button
              type="button"
              onClick={() => swiperRef.current?.slidePrev()}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-white/80 text-midnight shadow-sm backdrop-blur-sm transition-colors hover:border-primary hover:text-primary"
              aria-label="Previous destination"
            >
              <ArrowLeft size={18} />
            </button>
            <button
              type="button"
              onClick={() => swiperRef.current?.slideNext()}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-white/80 text-midnight shadow-sm backdrop-blur-sm transition-colors hover:border-primary hover:text-primary"
              aria-label="Next destination"
            >
              <ArrowRight size={18} />
            </button>
          </div>
        </div>

        <Reveal className="mt-10" delay={0.1}>
          <Swiper
            modules={[Navigation, A11y]}
            onBeforeInit={(swiper) => {
              swiperRef.current = swiper;
            }}
            spaceBetween={24}
            slidesPerView={1.15}
            breakpoints={{
              640: { slidesPerView: 2.2 },
              1024: { slidesPerView: 3.2 },
              1280: { slidesPerView: 4 },
            }}
            a11y={{ enabled: true }}
          >
            {destinations.map((destination) => (
              <SwiperSlide key={destination.slug} className="h-auto pb-2">
                <Link
                  href="/destinations"
                  className="group relative flex h-[420px] w-full flex-col justify-end overflow-hidden rounded-2xl shadow-card transition-shadow duration-300 hover:shadow-card-hover"
                >
                  <Image
                    src={destination.image.url}
                    alt={destination.image.alt}
                    fill
                    sizes="(min-width: 1280px) 25vw, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 90vw"
                    className="object-cover transition-transform duration-500 ease-out-luxury group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-midnight/90 via-midnight/20 to-transparent" />

                  <div className="relative flex flex-col gap-2 p-6 text-white">
                    <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur-sm">
                      <MapPin size={12} />
                      {destination.region}
                    </span>
                    <h3 className="font-serif text-2xl font-semibold">{destination.name}</h3>
                    <p className="text-sm text-white/75">{destination.tagline}</p>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-sm text-white/80">
                        From <span className="font-semibold text-white">{formatCurrency(destination.startingPrice)}</span>
                      </span>
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-midnight transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
                        <ArrowUpRight size={16} />
                      </span>
                    </div>
                  </div>
                </Link>
              </SwiperSlide>
            ))}
          </Swiper>
        </Reveal>
      </Container>
    </section>
  );
}
