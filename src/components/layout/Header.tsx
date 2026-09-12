"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Heart, Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/layout/Logo";
import { MobileNav } from "@/components/layout/MobileNav";
import { AuthNav } from "@/components/auth/AuthNav";

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full bg-white transition-shadow duration-300",
        scrolled && "shadow-[0_1px_0_0_rgba(0,0,0,0.06)]",
      )}
    >
      <div className="mx-auto grid h-[72px] max-w-[1440px] grid-cols-[1fr_auto_1fr] items-center gap-4 px-4 sm:px-6 lg:px-10">
        {/* Left: menu + search */}
        <div className="flex items-center gap-3 sm:gap-4">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-black/10 text-black transition-colors hover:bg-black/[0.03]"
            aria-label="Open menu"
            aria-expanded={mobileOpen ? "true" : "false"}
          >
            <Menu size={20} strokeWidth={1.75} />
          </button>
          <Link
            href="/tour-packages"
            className="hidden text-[16px] font-bold text-black transition-opacity hover:opacity-70 sm:inline"
          >
            Search tours
          </Link>
        </div>

        {/* Center: logo */}
        <Logo className="justify-self-center" />

        {/* Right: saved + auth + CTA */}
        <div className="flex items-center justify-end gap-3 lg:gap-4">
          <Link
            href="/tour-packages"
            className="hidden items-center gap-2.5 text-[16px] font-medium text-black transition-opacity hover:opacity-70 md:inline-flex"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-full border border-black/10">
              <Heart size={16} strokeWidth={1.75} />
            </span>
            <span className="hidden lg:inline">Saved</span>
          </Link>

          <AuthNav />

          <Link
            href="/contact"
            className="inline-flex h-11 items-center justify-center rounded-full bg-black px-5 text-[14px] font-semibold text-white transition-opacity hover:opacity-85 sm:px-6"
          >
            Book Now
          </Link>
        </div>
      </div>

      <MobileNav open={mobileOpen} onClose={() => setMobileOpen(false)} />
    </header>
  );
}
