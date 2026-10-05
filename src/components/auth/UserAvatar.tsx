import Image from "next/image";
import { cn } from "@/lib/utils";

function initials(name?: string | null) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

/** User photo (e.g. from Google) with an initials fallback. */
export function UserAvatar({
  name,
  image,
  size = 40,
  className,
}: {
  name?: string | null;
  image?: string | null;
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary font-semibold text-white",
        className,
      )}
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {image ? (
        <Image src={image} alt={name ?? "Profile photo"} fill sizes={`${size}px`} className="object-cover" />
      ) : (
        <span aria-hidden>{initials(name)}</span>
      )}
    </span>
  );
}
