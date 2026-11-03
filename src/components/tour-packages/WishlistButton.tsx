"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Saved tours, shared by every heart on the page: loaded once per signed-in session,
 * updated optimistically and kept in sync across buttons.
 */
let saved = new Set<string>();
let loading: Promise<void> | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((listener) => listener());
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

function loadSaved() {
  loading ??= fetch("/api/wishlist", { cache: "no-store" })
    .then((res) => (res.ok ? res.json() : { slugs: [] }))
    .then((body: { slugs: string[] }) => {
      saved = new Set(body.slugs);
      emit();
    })
    .catch(() => {
      loading = null;
    });
  return loading;
}

export function WishlistButton({ slug, variant = "text", className }: { slug: string; variant?: "text" | "icon"; className?: string }) {
  const { status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const isSaved = useSyncExternalStore(subscribe, () => saved.has(slug), () => false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (status === "authenticated") void loadSaved();
  }, [status]);

  async function toggle(event: React.MouseEvent) {
    // Hearts sit on top of card links
    event.preventDefault();
    event.stopPropagation();
    if (status !== "authenticated") {
      router.push(`/login?callbackUrl=${encodeURIComponent(pathname)}`);
      return;
    }
    const next = !isSaved;
    saved = new Set(saved);
    if (next) saved.add(slug);
    else saved.delete(slug);
    emit();
    setError(false);
    const res = await fetch("/api/wishlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, saved: next }),
    }).catch(() => null);
    if (!res?.ok) {
      // Undo the optimistic change
      saved = new Set(saved);
      if (next) saved.delete(slug);
      else saved.add(slug);
      emit();
      setError(true);
    }
  }

  const label = isSaved ? "Remove from wishlist" : "Add to wishlist";

  if (variant === "icon") {
    return (
      <button
        type="button"
        aria-label={label}
        aria-pressed={isSaved}
        onClick={toggle}
        className={cn("flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-midnight shadow-card transition-transform hover:scale-105", className)}
      >
        <Heart size={18} className={cn(isSaved && "fill-accent text-accent")} />
      </button>
    );
  }

  return (
    <button
      type="button"
      aria-pressed={isSaved}
      onClick={toggle}
      className={cn("inline-flex items-center gap-1.5 text-sm font-semibold text-midnight underline-offset-2 hover:underline", className)}
      title={error ? "Couldn't save — please try again" : undefined}
    >
      <Heart size={17} className={cn(isSaved && "fill-accent text-accent")} />
      {isSaved ? "Saved to wishlist" : "Add to wishlist"}
    </button>
  );
}
