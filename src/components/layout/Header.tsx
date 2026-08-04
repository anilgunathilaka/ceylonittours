"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { primaryNavLinks } from "@/lib/nav";
import { Logo } from "@/components/layout/Logo";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { MobileNav } from "@/components/layout/MobileNav";

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full border-b transition-all duration-300 ease-out-luxury",
        scrolled
          ? "border-border bg-white/95 shadow-card backdrop-blur-sm"
          : "border-transparent bg-white",
      )}
    >
      <Container className={cn("flex items-center justify-between transition-all duration-300", scrolled ? "h-18 py-2" : "h-22 py-3")}>
        <Logo />

        <nav className="hidden items-center gap-8 xl:flex" aria-label="Primary">
          {primaryNavLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "relative py-2 text-sm font-medium text-midnight/75 transition-colors hover:text-primary",
                  isActive && "text-primary",
                )}
              >
                {link.short}
                <span
                  className={cn(
                    "absolute -bottom-0.5 left-0 h-0.5 w-full origin-left scale-x-0 bg-primary transition-transform duration-300",
                    isActive && "scale-x-100",
                  )}
                  aria-hidden
                />
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3">
          <Button href="/contact" size="sm" className="hidden sm:inline-flex" icon={<ArrowRight size={15} />}>
            Book Now
          </Button>
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="flex h-11 w-11 items-center justify-center rounded-full text-midnight hover:bg-primary/5 xl:hidden"
            aria-label="Open menu"
            aria-expanded={mobileOpen ? "true" : "false"}
          >
            <Menu size={22} />
          </button>
        </div>
      </Container>

      <MobileNav open={mobileOpen} onClose={() => setMobileOpen(false)} />
    </header>
  );
}
