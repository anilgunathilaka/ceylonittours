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
        width={2233}
        height={540}
        priority
        sizes="260px"
        className="h-[43px] w-auto object-contain sm:h-[53px] lg:h-[58px]"
      />
    </Link>
  );
}
