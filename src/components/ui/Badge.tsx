import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

const toneClasses = {
  primary: "bg-primary/10 text-primary",
  accent: "bg-accent/10 text-accent-dark",
  gold: "bg-gold/15 text-gold-dark",
  nature: "bg-nature/10 text-nature",
  white: "bg-white/95 text-midnight shadow-card",
} as const;

export function Badge({
  children,
  tone = "primary",
  className,
}: {
  children: ReactNode;
  tone?: keyof typeof toneClasses;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold tracking-wide uppercase",
        toneClasses[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
