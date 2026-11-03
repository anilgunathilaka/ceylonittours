"use client";

import { useState } from "react";
import { Check, Share2 } from "lucide-react";

/** Native share sheet where available (phones), otherwise copies the link. */
export function ShareButton({ title }: { title: string }) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = window.location.href.split("#")[0].split("?")[0];
    if (navigator.share) {
      await navigator.share({ title, url }).catch(() => undefined);
      return;
    }
    await navigator.clipboard?.writeText(url).catch(() => undefined);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  return (
    <button type="button" onClick={() => void share()} className="inline-flex items-center gap-1.5 text-sm font-semibold text-midnight underline-offset-2 hover:underline">
      {copied ? <Check size={17} className="text-nature" /> : <Share2 size={17} />}
      <span aria-live="polite">{copied ? "Link copied" : "Share"}</span>
    </button>
  );
}
