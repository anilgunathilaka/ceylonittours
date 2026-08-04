import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function Card({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "group overflow-hidden rounded-2xl bg-surface shadow-card ring-1 ring-border transition-all duration-300 ease-out-luxury hover:-translate-y-1 hover:shadow-card-hover",
        className,
      )}
    >
      {children}
    </div>
  );
}
