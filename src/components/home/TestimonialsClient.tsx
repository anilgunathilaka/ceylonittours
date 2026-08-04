"use client";

import { useRef } from "react";
import Image from "next/image";
import { Swiper, SwiperSlide } from "swiper/react";
import { A11y, Autoplay, Navigation } from "swiper/modules";
import type { Swiper as SwiperType } from "swiper";
import { ArrowLeft, ArrowRight, Quote } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Rating } from "@/components/ui/Rating";
import { Reveal } from "@/components/ui/Reveal";
import type { Testimonial } from "@/types";

import "swiper/css";

export function TestimonialsClient({ testimonials }: { testimonials: Testimonial[] }) {
  const swiperRef = useRef<SwiperType | null>(null);

  return (
    <section className="bg-surface py-20 lg:py-28">
      <Container>
        <div className="relative">
          <SectionHeading
            eyebrow="Traveller Stories"
            title="What Our Travellers Say"
          />
          <div className="mt-6 flex items-center justify-center gap-2 sm:absolute sm:top-0 sm:right-0 sm:mt-0">
            <button
              type="button"
              onClick={() => swiperRef.current?.slidePrev()}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-border text-midnight transition-colors hover:border-primary hover:text-primary"
              aria-label="Previous testimonial"
            >
              <ArrowLeft size={18} />
            </button>
            <button
              type="button"
              onClick={() => swiperRef.current?.slideNext()}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-border text-midnight transition-colors hover:border-primary hover:text-primary"
              aria-label="Next testimonial"
            >
              <ArrowRight size={18} />
            </button>
          </div>
        </div>

        <Reveal className="mt-10" delay={0.1}>
          <Swiper
            modules={[Navigation, Autoplay, A11y]}
            onBeforeInit={(swiper) => {
              swiperRef.current = swiper;
            }}
            spaceBetween={24}
            slidesPerView={1}
            autoplay={{ delay: 6000, disableOnInteraction: true }}
            breakpoints={{
              768: { slidesPerView: 2 },
              1280: { slidesPerView: 3 },
            }}
            a11y={{ enabled: true }}
          >
            {testimonials.map((t) => (
              <SwiperSlide key={t.id} className="h-auto pb-2">
                <figure className="flex h-full flex-col gap-5 rounded-2xl bg-ivory p-7 ring-1 ring-border">
                  <Quote className="text-secondary/40" size={32} />
                  <Rating value={t.rating} size="sm" />
                  <blockquote className="flex-1 text-sm leading-relaxed text-slate">&ldquo;{t.quote}&rdquo;</blockquote>
                  <figcaption className="flex items-center gap-3 border-t border-border pt-5">
                    <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full">
                      <Image src={t.avatar.url} alt={t.avatar.alt} fill sizes="44px" className="object-cover" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-midnight">
                        {t.name} <span aria-hidden>{t.countryFlag}</span>
                      </span>
                      <span className="text-xs text-slate">{t.tripName}</span>
                    </div>
                  </figcaption>
                </figure>
              </SwiperSlide>
            ))}
          </Swiper>
        </Reveal>
      </Container>
    </section>
  );
}
