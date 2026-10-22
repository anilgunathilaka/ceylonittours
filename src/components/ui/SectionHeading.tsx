import { cn } from "@/lib/utils";

/** Section title type, matching the home hero headline (serif, semibold, tight tracking). */
export const sectionTitleClass =
  "text-balance font-serif text-[34px] leading-[1.1] font-semibold tracking-[-0.02em] sm:text-[44px] lg:text-[52px]";

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "center",
  className,
}: {
  /** Small label above the title; most sections leave this out */
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "center" | "left";
  className?: string;
}) {
  const centered = align === "center";

  return (
    <div
      className={cn(
        "flex w-full flex-col gap-4",
        centered ? "mx-auto items-center text-center" : "items-start text-left",
        className,
      )}
    >
      {eyebrow && (
        // Same typeface and colour as the title, small and widely spaced
        <span className="font-serif text-base font-semibold tracking-[0.3em] text-midnight uppercase sm:text-lg">
          {eyebrow}
        </span>
      )}
      <h2 className={cn(sectionTitleClass, "max-w-2xl text-midnight", centered && "mx-auto")}>{title}</h2>
      {description && (
        <p
          className={cn(
            "text-balance max-w-xl text-base text-slate sm:text-lg",
            centered && "mx-auto",
          )}
        >
          {description}
        </p>
      )}
    </div>
  );
}
