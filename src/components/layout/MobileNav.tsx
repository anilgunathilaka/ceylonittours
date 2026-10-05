"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { X, Phone } from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import { visibleNavLinks } from "@/lib/nav";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { UserAvatar } from "@/components/auth/UserAvatar";

export function MobileNav({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const { data: session } = useSession();

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-50 bg-midnight/40 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            aria-hidden
          />
          <motion.div
            className="fixed top-0 right-0 z-50 flex h-full w-[85vw] max-w-sm flex-col bg-white shadow-elevated"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            role="dialog"
            aria-modal="true"
            aria-label="Mobile navigation"
          >
            <div className="flex items-center justify-between border-b border-border px-5 py-5">
              <span className="font-display text-lg font-semibold text-midnight">Menu</span>
              <button
                type="button"
                onClick={onClose}
                className="flex h-10 w-10 items-center justify-center rounded-full text-midnight hover:bg-primary/5"
                aria-label="Close menu"
              >
                <X size={20} />
              </button>
            </div>

            <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-4" aria-label="Mobile primary">
              {visibleNavLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={onClose}
                  className={cn(
                    "rounded-xl px-4 py-3 text-base font-medium text-midnight/85 transition-colors hover:bg-primary/5 hover:text-primary",
                    pathname === link.href && "bg-primary/10 text-primary",
                  )}
                >
                  {link.label}
                </Link>
              ))}
              {session?.user ? (
                <>
                  <Link
                    href="/profile"
                    onClick={onClose}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-4 py-3 text-base font-medium text-midnight/85 transition-colors hover:bg-primary/5 hover:text-primary",
                      pathname === "/profile" && "bg-primary/10 text-primary",
                    )}
                  >
                    <UserAvatar name={session.user.name} image={session.user.image} size={28} />
                    My Profile
                  </Link>
                  {session.user.isAdmin && (
                    <Link
                      href="/admin/bookings"
                      onClick={onClose}
                      className={cn(
                        "rounded-xl px-4 py-3 text-base font-medium text-midnight/85 transition-colors hover:bg-primary/5 hover:text-primary",
                        pathname.startsWith("/admin") && "bg-primary/10 text-primary",
                      )}
                    >
                      Manage Bookings
                    </Link>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      void signOut({ redirectTo: "/" });
                    }}
                    className="rounded-xl px-4 py-3 text-left text-base font-medium text-midnight/85 transition-colors hover:bg-primary/5 hover:text-primary"
                  >
                    Log out
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    onClick={onClose}
                    className={cn(
                      "rounded-xl px-4 py-3 text-base font-medium text-midnight/85 transition-colors hover:bg-primary/5 hover:text-primary",
                      pathname === "/login" && "bg-primary/10 text-primary",
                    )}
                  >
                    Login
                  </Link>
                  <Link
                    href="/register"
                    onClick={onClose}
                    className={cn(
                      "rounded-xl px-4 py-3 text-base font-medium text-midnight/85 transition-colors hover:bg-primary/5 hover:text-primary",
                      pathname === "/register" && "bg-primary/10 text-primary",
                    )}
                  >
                    Register
                  </Link>
                </>
              )}
            </nav>

            <div className="flex flex-col gap-3 border-t border-border px-5 py-5">
              <a href="tel:+94112345678" className="flex items-center gap-2 text-sm font-semibold text-midnight">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent/10 text-accent-dark">
                  <Phone size={16} />
                </span>
                +94 11 234 5678
              </a>
              <Button href="/contact" size="md" className="w-full" onClick={onClose}>
                Plan My Trip
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
