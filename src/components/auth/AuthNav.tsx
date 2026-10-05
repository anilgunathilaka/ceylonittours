"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { ChevronDown, LogOut, ShieldCheck, User, UserCircle } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { UserAvatar } from "@/components/auth/UserAvatar";

function ProfileDropdown({
  user,
  className,
}: {
  user: { name?: string | null; email?: string | null; image?: string | null; isAdmin?: boolean };
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const firstName = user.name?.split(" ")[0] ?? "Account";

  return (
    <div ref={ref} className={cn("relative hidden sm:block", className)}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex items-center gap-2.5 rounded-full text-[16px] font-medium text-black transition-opacity hover:opacity-80"
        aria-haspopup="menu"
        aria-expanded={open ? "true" : "false"}
      >
        <UserAvatar name={user.name} image={user.image} size={40} />
        <span className="hidden max-w-[100px] truncate lg:inline">{firstName}</span>
        <ChevronDown size={16} strokeWidth={1.75} className={cn("transition-transform", open && "rotate-180")} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
            className="absolute top-[calc(100%+12px)] right-0 z-50 w-72 overflow-hidden rounded-2xl bg-surface shadow-elevated ring-1 ring-border"
          >
            <div className="flex items-center gap-3 border-b border-border px-4 py-4">
              <UserAvatar name={user.name} image={user.image} size={44} />
              <div className="min-w-0">
                <p className="truncate font-semibold text-midnight">{user.name ?? "Traveller"}</p>
                {user.email && <p className="truncate text-sm text-slate">{user.email}</p>}
              </div>
            </div>
            <div className="flex flex-col p-2">
              <Link
                href="/profile"
                role="menuitem"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-midnight transition-colors hover:bg-primary/5 hover:text-primary"
              >
                <UserCircle size={18} strokeWidth={1.75} />
                My Profile
              </Link>
              {user.isAdmin && (
                <Link
                  href="/admin/bookings"
                  role="menuitem"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-midnight transition-colors hover:bg-primary/5 hover:text-primary"
                >
                  <ShieldCheck size={18} strokeWidth={1.75} />
                  Manage Bookings
                </Link>
              )}
              <button
                type="button"
                role="menuitem"
                onClick={() => signOut({ redirectTo: "/" })}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-accent-dark transition-colors hover:bg-accent/10"
              >
                <LogOut size={18} strokeWidth={1.75} />
                Log out
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function AuthNav({ className }: { className?: string }) {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <div
        className={cn(
          "hidden h-10 w-[7.5rem] animate-pulse rounded-full bg-black/5 sm:block",
          className,
        )}
      />
    );
  }

  if (session?.user) {
    return <ProfileDropdown user={session.user} className={className} />;
  }

  return (
    <Link
      href="/login"
      className={cn(
        "hidden items-center gap-2.5 text-[16px] font-medium text-black transition-opacity hover:opacity-70 sm:inline-flex",
        className,
      )}
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-full border border-black/10">
        <User size={16} strokeWidth={1.75} />
      </span>
      <span className="hidden lg:inline">Log in</span>
    </Link>
  );
}
