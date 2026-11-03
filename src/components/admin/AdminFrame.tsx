"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  BarChart3,
  Bus,
  CalendarCheck,
  CalendarCog,
  ExternalLink,
  LayoutGrid,
  LogOut,
  Megaphone,
  Menu,
  MessagesSquare,
  Star,
  Ticket,
  X,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

type NavItem = { href: string; label: string; icon: LucideIcon; badge?: "bookings" | "reviews" };
type NavGroup = { label: string; items: NavItem[] };

const NAV: NavGroup[] = [
  {
    label: "Bookings",
    items: [
      { href: "/admin/bookings", label: "All bookings", icon: CalendarCheck, badge: "bookings" },
      { href: "/admin/bookings/pickups", label: "Pickup planner", icon: Bus },
      { href: "/admin/bookings/messages", label: "Message customers", icon: MessagesSquare },
    ],
  },
  {
    label: "Products",
    items: [
      { href: "/admin/products", label: "Tours & options", icon: Ticket },
      { href: "/admin/products/availability", label: "Bulk availability", icon: CalendarCog },
      { href: "/admin/products/offers", label: "Special offers", icon: Megaphone },
    ],
  },
  {
    label: "Insights",
    items: [
      { href: "/admin/reviews", label: "Reviews", icon: Star, badge: "reviews" },
      { href: "/admin/stats", label: "Stats", icon: BarChart3 },
    ],
  },
  {
    label: "Website",
    items: [{ href: "/admin/content", label: "Content", icon: LayoutGrid }],
  },
];

const ALL_HREFS = NAV.flatMap((g) => g.items.map((i) => i.href));

/** The most specific menu item matching the current page (e.g. a tour's options page → "Tours & options") */
function activeHref(pathname: string) {
  return ALL_HREFS.filter((href) => pathname === href || pathname.startsWith(`${href}/`)).sort((a, b) => b.length - a.length)[0];
}

/**
 * Admin chrome: a dark sidebar menu (a drawer on phones) and a slim top bar. Replaces the
 * public site header and footer on every /admin page.
 */
export function AdminFrame({
  user,
  badges,
  children,
}: {
  user: { name: string; email: string };
  badges: { bookings: number; reviews: number };
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const active = activeHref(pathname);

  // Close the drawer after navigating
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const sidebar = (
    <div className="flex h-full flex-col">
      <Link href="/admin/bookings" className="flex items-center gap-3 px-5 pt-6 pb-8">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white font-display text-lg font-bold text-logo">C</span>
        <span className="leading-tight">
          <span className="block text-sm font-semibold tracking-[0.12em] text-white uppercase">Ceylon IT Tours</span>
          <span className="text-xs text-white/50">Supplier dashboard</span>
        </span>
      </Link>

      <nav aria-label="Admin" className="flex-1 overflow-y-auto px-3">
        {NAV.map((group) => (
          <div key={group.label} className="mb-6">
            <p className="mb-2 px-3 text-[11px] font-semibold tracking-[0.14em] text-white/40 uppercase">{group.label}</p>
            <ul className="flex flex-col gap-0.5">
              {group.items.map(({ href, label, icon: Icon, badge }) => {
                const current = href === active;
                const count = badge ? badges[badge] : 0;
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      aria-current={current ? "page" : undefined}
                      className={cn(
                        "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                        current ? "bg-white text-midnight shadow-card" : "text-white/75 hover:bg-white/10 hover:text-white",
                      )}
                    >
                      <Icon size={18} className={current ? "text-primary" : "text-white/60"} />
                      <span className="flex-1">{label}</span>
                      {count > 0 && (
                        <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", current ? "bg-accent text-white" : "bg-accent/90 text-white")}>
                          {count}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-white/10 p-3">
        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-white/75 hover:bg-white/10 hover:text-white"
        >
          <ExternalLink size={18} className="text-white/60" /> View website
        </a>
        <button
          type="button"
          onClick={() => signOut({ redirectTo: "/" })}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-white/75 hover:bg-white/10 hover:text-white"
        >
          <LogOut size={18} className="text-white/60" /> Sign out
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f4f6fb]">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 bg-midnight lg:block">{sidebar}</aside>

      {/* Phone drawer */}
      {open && (
        <div className="fixed inset-0 z-[60] lg:hidden" role="dialog" aria-modal="true" aria-label="Admin menu">
          <button type="button" aria-label="Close menu" className="absolute inset-0 bg-midnight/50" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 max-w-[85%] bg-midnight shadow-2xl">
            <button type="button" aria-label="Close menu" onClick={() => setOpen(false)} className="absolute top-5 right-4 rounded-full p-2 text-white/70 hover:bg-white/10">
              <X size={20} />
            </button>
            {sidebar}
          </aside>
        </div>
      )}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-white/90 px-4 backdrop-blur sm:px-6 lg:px-8">
          <button type="button" aria-label="Open menu" onClick={() => setOpen(true)} className="-ml-2 rounded-full p-2 text-midnight hover:bg-midnight/5 lg:hidden">
            <Menu size={22} />
          </button>
          <span className="font-semibold text-midnight lg:hidden">Admin</span>
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden text-right text-sm leading-tight sm:block">
              <span className="block font-semibold text-midnight">{user.name}</span>
              <span className="text-xs text-slate">{user.email}</span>
            </span>
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-semibold text-white">
              {user.name.charAt(0).toUpperCase()}
            </span>
          </div>
        </header>
        <div className="mx-auto w-full max-w-[1400px] px-4 py-8 sm:px-6 lg:px-8 lg:py-10">{children}</div>
      </div>
    </div>
  );
}
