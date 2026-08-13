"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { LogIn, LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

export function AuthNav({ className }: { className?: string }) {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return <div className={cn("hidden h-9 w-20 animate-pulse rounded-full bg-midnight/5 sm:block", className)} />;
  }

  if (session?.user) {
    return (
      <div className={cn("hidden items-center gap-2 sm:flex", className)}>
        <span className="flex max-w-[140px] items-center gap-1.5 truncate text-sm font-semibold text-midnight">
          <User size={16} className="shrink-0 text-primary" />
          {session.user.name?.split(" ")[0] ?? "Account"}
        </span>
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/" })}
          className="flex h-9 items-center gap-1.5 rounded-full px-3 text-sm font-bold text-midnight/75 transition-colors hover:bg-primary/5 hover:text-primary"
          aria-label="Sign out"
        >
          <LogOut size={15} />
          Sign out
        </button>
      </div>
    );
  }

  return (
    <div className={cn("hidden items-center gap-2 sm:flex", className)}>
      <Link
        href="/login"
        className="flex h-9 items-center gap-1.5 rounded-full px-3 text-base font-bold text-midnight/75 transition-colors hover:bg-primary/5 hover:text-primary"
      >
        <LogIn size={16} />
        Login
      </Link>
      <Button href="/register" size="sm" variant="outlineDark">
        Register
      </Button>
    </div>
  );
}
