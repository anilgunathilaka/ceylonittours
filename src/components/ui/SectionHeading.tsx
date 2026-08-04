import { cn } from "@/lib/utils";

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "center",
  className,
}: {
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
        <span
          className={cn(
            "inline-flex items-center gap-2 text-sm font-semibold tracking-[0.2em] text-secondary uppercase",
            centered && "justify-center",
          )}
        >
          <span className="h-px w-8 bg-secondary" aria-hidden />
          {eyebrow}
          {centered && <span className="h-px w-8 bg-secondary" aria-hidden />}
        </span>
      )}
      <h2
        className={cn(
          "text-balance max-w-2xl text-3xl font-bold text-midnight sm:text-4xl lg:text-5xl",
          centered && "mx-auto",
        )}
      >
        {title}
      </h2>
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
