"use client";

import { useEffect } from "react";

/** Sends one page-view count per tour per browser session (for conversion stats). Renders nothing. */
export function ViewTracker({ slug }: { slug: string }) {
  useEffect(() => {
    const key = `viewed:${slug}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      // Storage unavailable (private mode): still count, the server rate-limits repeats
    }
    const body = JSON.stringify({ slug });
    if (!navigator.sendBeacon?.("/api/track/view", new Blob([body], { type: "application/json" }))) {
      void fetch("/api/track/view", { method: "POST", body, headers: { "Content-Type": "application/json" }, keepalive: true }).catch(() => undefined);
    }
  }, [slug]);
  return null;
}
