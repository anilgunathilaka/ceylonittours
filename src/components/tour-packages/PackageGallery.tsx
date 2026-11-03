"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Images, X } from "lucide-react";
import type { SanityImage } from "@/types";

/** Main photo plus up to four thumbnails; any photo opens a full-screen viewer. */
export function PackageGallery({ images }: { images: SanityImage[] }) {
  const [open, setOpen] = useState<number | null>(null);
  const count = images.length;
  const go = useCallback((delta: number) => setOpen((i) => (i === null ? i : (i + delta + count) % count)), [count]);

  useEffect(() => {
    if (open === null) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(null);
      if (event.key === "ArrowRight") go(1);
      if (event.key === "ArrowLeft") go(-1);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, go]);

  const [main, ...rest] = images;
  const thumbs = rest.slice(0, 4);

  return (
    <>
      <div className="mt-6 grid grid-cols-4 grid-rows-2 gap-2 overflow-hidden rounded-2xl sm:gap-3">
        <button
          type="button"
          onClick={() => setOpen(0)}
          className={`relative h-64 bg-border sm:h-96 ${thumbs.length ? "col-span-4 row-span-2 md:col-span-2" : "col-span-4 row-span-2"}`}
        >
          <Image src={main.url} alt={main.alt} fill sizes="(min-width: 1024px) 40vw, 100vw" className="object-cover" priority />
        </button>
        {thumbs.map((image, i) => (
          <button
            key={image.url + i}
            type="button"
            onClick={() => setOpen(i + 1)}
            className={`relative hidden bg-border md:block ${thumbs.length === 1 ? "col-span-2 row-span-2" : thumbs.length === 2 ? "col-span-2" : ""}`}
          >
            <Image src={image.url} alt={image.alt} fill sizes="20vw" className="object-cover" />
            {i === thumbs.length - 1 && count > 5 && (
              <span className="absolute inset-0 flex items-center justify-center bg-midnight/50 font-semibold text-white">+{count - 5} photos</span>
            )}
          </button>
        ))}
      </div>
      {count > 1 && (
        <button
          type="button"
          onClick={() => setOpen(0)}
          className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
        >
          <Images size={16} /> See all {count} photos
        </button>
      )}

      {open !== null && (
        <div role="dialog" aria-modal="true" aria-label="Photo gallery" className="fixed inset-0 z-[400] flex flex-col bg-midnight/95">
          <div className="flex items-center justify-between p-4 text-white">
            <span className="text-sm">
              {open + 1} / {count}
            </span>
            <button type="button" aria-label="Close" onClick={() => setOpen(null)} className="rounded-full p-2 hover:bg-white/10">
              <X size={22} />
            </button>
          </div>
          <div className="relative flex-1">
            <Image src={images[open].url} alt={images[open].alt} fill sizes="100vw" className="object-contain" />
            {count > 1 && (
              <>
                <button type="button" aria-label="Previous photo" onClick={() => go(-1)} className="absolute top-1/2 left-3 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white hover:bg-white/20">
                  <ChevronLeft size={22} />
                </button>
                <button type="button" aria-label="Next photo" onClick={() => go(1)} className="absolute top-1/2 right-3 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white hover:bg-white/20">
                  <ChevronRight size={22} />
                </button>
              </>
            )}
          </div>
          {images[open].alt && <p className="p-4 text-center text-sm text-white/80">{images[open].alt}</p>}
        </div>
      )}
    </>
  );
}
