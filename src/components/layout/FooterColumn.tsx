"use client";

import { useId, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/** Footer link column: always open from `sm` up, a tap-to-open accordion on phones. */
export function FooterColumn({ title, children }: { title: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const id = useId();

  return (
    <div>
      <h3 className="border-b border-white/15 pb-4 font-serif text-xl leading-none font-semibold sm:border-0 sm:pb-0 lg:text-[22px]">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls={id}
          className="flex w-full items-center justify-between text-left sm:pointer-events-none"
        >
          {title}
          <ChevronDown
            size={14}
            className={cn("transition-transform duration-150 sm:hidden", open && "rotate-180")}
            aria-hidden
          />
        </button>
      </h3>
      <div id={id} className={cn("pt-3 pb-2.5 sm:block sm:pt-5 sm:pb-0", !open && "hidden")}>
        {children}
      </div>
    </div>
  );
}
