"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Sticky in-page links (Overview · Itinerary · … · Reviews) that highlight the section in view.
 * Sits just under the site header; all links fit without scrolling (they wrap on narrow screens).
 */
export function SectionNav({ sections }: { sections: { id: string; label: string }[] }) {
  const [active, setActive] = useState(sections[0]?.id);

  useEffect(() => {
    const targets = sections.map((s) => document.getElementById(s.id)).filter((el): el is HTMLElement => Boolean(el));
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible) setActive(visible.target.id);
      },
      { rootMargin: "-140px 0px -60% 0px" },
    );
    targets.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [sections]);

  if (sections.length < 2) return null;

  return (
    <nav aria-label="On this page" className="sticky top-[72px] z-30 -mx-3 mt-6 hidden border-b border-border bg-ivory/95 px-3 backdrop-blur md:block sm:-mx-5 sm:px-5 lg:-mx-8 lg:px-8">
      <ul className="flex flex-wrap gap-x-6">
        {sections.map((s) => (
          <li key={s.id}>
            <a
              href={`#${s.id}`}
              aria-current={active === s.id ? "location" : undefined}
              className={cn(
                "-mb-px block border-b-2 py-3 text-sm font-semibold transition-colors",
                active === s.id ? "border-primary text-primary" : "border-transparent text-slate hover:text-midnight",
              )}
            >
              {s.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
