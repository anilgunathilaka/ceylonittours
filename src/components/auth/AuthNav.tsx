"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { LogOut, User } from "lucide-react";
import { cn } from "@/lib/utils";

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
    return (
      <div className={cn("hidden items-center gap-2 sm:flex", className)}>
        <span className="flex items-center gap-2.5 text-[16px] font-medium text-black">
          <span className="flex h-10 w-10 items-center justify-center rounded-full border border-black/10">
            <User size={16} strokeWidth={1.75} />
          </span>
          <span className="hidden max-w-[100px] truncate lg:inline">
            {session.user.name?.split(" ")[0] ?? "Account"}
          </span>
        </span>
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/" })}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-black/10 text-black transition-colors hover:bg-black/[0.03]"
          aria-label="Sign out"
        >
          <LogOut size={15} strokeWidth={1.75} />
        </button>
      </div>
    );
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
