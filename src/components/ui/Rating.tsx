import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export function Rating({
  value,
  reviewCount,
  size = "sm",
  className,
}: {
  value: number;
  reviewCount?: number;
  size?: "sm" | "md";
  className?: string;
}) {
  const iconSize = size === "sm" ? 14 : 18;

  return (
    <div className={cn("flex items-center gap-1.5", className)} role="img" aria-label={`Rated ${value} out of 5`}>
      <div className="flex items-center gap-0.5" aria-hidden>
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            size={iconSize}
            className={i < Math.round(value) ? "fill-gold text-gold" : "fill-border text-border"}
          />
        ))}
      </div>
      <span className="text-sm font-semibold text-midnight">{value.toFixed(1)}</span>
      {reviewCount !== undefined && (
        <span className="text-sm text-slate">({reviewCount})</span>
      )}
    </div>
  );
}
