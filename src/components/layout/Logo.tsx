import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function Logo({ inverted = false, className }: { inverted?: boolean; className?: string }) {
  return (
    <Link
      href="/"
      className={cn("inline-flex items-center", inverted && "rounded-lg bg-white px-2.5 py-1.5", className)}
      aria-label="Ceylon IT Tours — Home"
    >
      <Image
        src="/images/ceylonittours.png"
        alt="Ceylon IT Tours"
        width={180}
        height={68}
        priority
        className="h-10 w-auto sm:h-11"
      />
    </Link>
  );
}
