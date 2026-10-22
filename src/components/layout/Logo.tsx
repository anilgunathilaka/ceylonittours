import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      className={cn("inline-flex items-center", className)}
      aria-label="Ceylon IT Tours — Home"
    >
      <Image
        src="/images/Ceylon-IT-Tours.webp"
        alt="Ceylon IT Tours"
        width={1440}
        height={589}
        priority
        sizes="160px"
        className="h-12 w-auto object-contain sm:h-14 lg:h-16"
      />
    </Link>
  );
}
