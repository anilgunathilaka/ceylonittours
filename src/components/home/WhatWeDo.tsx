import Image from "next/image";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { photo, unsplash } from "@/lib/images";

/** The three services, linking into the pre-filtered tour catalog. Swap images here. */
const services = [
  {
    kicker: "7 – 14 days",
    title: "Round Tours",
    tag: "Around the island",
    description:
      "Private multi-day journeys with your own driver-guide — ancient cities, misty tea country, wildlife safaris and golden beaches.",
    image: { src: "/images/hero-image-1-sigiriya.png", alt: "Sigiriya rock fortress at sunrise" },
    href: "/tour-packages?category=multi-day-tours",
  },
  {
    kicker: "Half or full day",
    title: "Day Tours",
    tag: "Local experiences",
    description:
      "Sigiriya, Kandy, Ella and more in a single day — guided excursions with hotel pickup and drop-off included.",
    image: { src: "/images/hero-image-3-kandy.png", alt: "Temple of the Tooth in Kandy" },
    href: "/tour-packages?category=day-trips",
  },
  {
    kicker: "24/7 · Island-wide",
    title: "Cabs",
    tag: "Private transfers",
    description:
      "Airport pickups and point-to-point rides in air-conditioned vehicles with friendly, English-speaking drivers.",
    image: { src: unsplash(photo.scenicCoastRoad, 1200, 1600), alt: "Scenic road through the Sri Lankan countryside" },
    href: "/tour-packages?category=transfers",
  },
];

export function WhatWeDo() {
  return (
    <section id="what-we-do" className="scroll-mt-28 bg-white py-20 lg:py-24">
      <SectionHeading title="Round Tours, Day Tours & Cabs" />

      <div className="mx-auto mt-12 grid max-w-(--container-content) grid-cols-1 gap-3 px-3 sm:px-5 md:grid-cols-3 lg:px-8">
        {services.map((service) => (
          <Link
            key={service.title}
            href={service.href}
            className="group relative flex h-[560px] flex-col justify-end overflow-hidden rounded-2xl sm:h-[620px] lg:h-[700px]"
          >
            <Image
              src={service.image.src}
              alt={service.image.alt}
              fill
              sizes="(min-width: 768px) 33vw, 100vw"
              className="object-cover transition-transform duration-700 ease-out-luxury group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/5" />

            <div className="relative p-7 text-white sm:p-9 lg:p-12">
              <p className="font-serif text-2xl">{service.kicker}</p>
              <h3 className="mt-2 font-serif text-4xl font-semibold lg:text-5xl">{service.title}</h3>
              <p className="mt-6 flex items-center gap-2 font-serif text-[15px] font-bold">
                <span className="h-2.5 w-2.5 rounded-full bg-accent" aria-hidden />
                {service.tag}
              </p>
              <p className="mt-4 max-w-md text-[15px] leading-relaxed text-white/85">{service.description}</p>
              <p className="mt-5 text-sm font-semibold text-gold">Sri Lanka with Ceylon IT Tours</p>
              <span className="mt-8 inline-flex items-center gap-1.5 text-sm font-bold">
                View More
                <ChevronRight size={16} className="transition-transform duration-300 group-hover:translate-x-1" />
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
