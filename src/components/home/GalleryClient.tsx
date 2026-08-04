"use client";

import { useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Expand, X } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/ui/Reveal";
import type { GalleryImage } from "@/types";

export function GalleryClient({ images }: { images: GalleryImage[] }) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  function close() {
    setActiveIndex(null);
  }

  function next() {
    setActiveIndex((i) => (i === null ? null : (i + 1) % images.length));
  }

  function prev() {
    setActiveIndex((i) => (i === null ? null : (i - 1 + images.length) % images.length));
  }

  return (
    <section className="bg-ivory py-20 lg:py-28">
      <Container>
        <SectionHeading
          eyebrow="Gallery"
          title="Explore the Most Beautiful Places in Sri Lanka"
        />

        <Reveal className="mt-12" delay={0.1}>
          <div className="columns-2 gap-4 sm:columns-3 [&>*]:mb-4">
            {images.map((item, i) => (
              <button
                key={item.location + i}
                type="button"
                onClick={() => setActiveIndex(i)}
                className="group relative block w-full overflow-hidden rounded-2xl break-inside-avoid focus-visible:outline-2 focus-visible:outline-secondary"
                aria-label={`Open photo of ${item.location} in gallery viewer`}
              >
                <Image
                  src={item.image.url}
                  alt={item.image.alt}
                  width={item.image.width}
                  height={item.image.height}
                  sizes="(min-width: 640px) 33vw, 50vw"
                  className="h-auto w-full object-cover transition-transform duration-500 ease-out-luxury group-hover:scale-105"
                />
                <div className="absolute inset-0 flex items-end bg-gradient-to-t from-midnight/70 via-transparent to-transparent p-4 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                  <span className="flex items-center gap-1.5 text-sm font-medium text-white">
                    <Expand size={14} />
                    {item.location}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </Reveal>
      </Container>

      <AnimatePresence>
        {activeIndex !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-midnight/95 p-4 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-label={`Photo of ${images[activeIndex].location}`}
          >
            <button
              type="button"
              onClick={close}
              className="absolute top-6 right-6 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
              aria-label="Close gallery"
            >
              <X size={20} />
            </button>

            <button
              type="button"
              onClick={prev}
              className="absolute left-4 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 sm:left-8"
              aria-label="Previous photo"
            >
              <ChevronLeft size={22} />
            </button>

            <motion.div
              key={activeIndex}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="relative max-h-[80vh] w-full max-w-3xl"
            >
              <Image
                src={images[activeIndex].image.url}
                alt={images[activeIndex].image.alt}
                width={images[activeIndex].image.width}
                height={images[activeIndex].image.height}
                sizes="90vw"
                className="mx-auto max-h-[80vh] w-auto rounded-xl object-contain"
              />
              <p className="mt-3 text-center text-sm font-medium text-white/80">
                {images[activeIndex].location}
              </p>
            </motion.div>

            <button
              type="button"
              onClick={next}
              className="absolute right-4 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 sm:right-8"
              aria-label="Next photo"
            >
              <ChevronRight size={22} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
