"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Folds long content to `collapsedHeight` px with a "See more" link, only when it is actually taller. */
export function SeeMore({ children, collapsedHeight = 180 }: { children: ReactNode; collapsedHeight?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [overflows, setOverflows] = useState(false);
  const [open, setOpen] = useState(false);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const check = () => setOverflows(el.scrollHeight > collapsedHeight + 40);
    check();
    const observer = new ResizeObserver(check);
    observer.observe(el);
    return () => observer.disconnect();
  }, [collapsedHeight]);

  const folded = overflows && !open;

  return (
    <div>
      <div
        ref={ref}
        className={cn("relative overflow-hidden", folded && "[mask-image:linear-gradient(to_bottom,black_60%,transparent)]")}
        style={folded ? { maxHeight: collapsedHeight } : undefined}
      >
        {children}
      </div>
      {overflows && (
        <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="mt-2 text-sm font-semibold text-midnight underline underline-offset-2">
          {open ? "See less" : "See more"}
        </button>
      )}
    </div>
  );
}
