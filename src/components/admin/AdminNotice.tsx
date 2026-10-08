"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, X } from "lucide-react";

/**
 * Success banner for the admin bookings page. The text comes from the
 * ?notice=…&email=… codes the update action redirects with (rendered on the
 * server, so it also works without JavaScript). With JS, the codes are removed
 * from the address bar so a reload doesn't show the banner again.
 */
export function AdminNotice({ message }: { message: string }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.delete("notice");
    url.searchParams.delete("email");
    window.history.replaceState(window.history.state, "", url);

    const timer = setTimeout(() => setVisible(false), 8000);
    return () => clearTimeout(timer);
  }, [message]);

  if (!visible) return null;

  return (
    <div
      role="status"
      className="flex items-start gap-3 rounded-2xl bg-nature/10 px-5 py-4 text-sm font-medium text-midnight ring-1 ring-nature/30"
    >
      <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-nature" />
      <p className="flex-1">{message}</p>
      <button
        type="button"
        onClick={() => setVisible(false)}
        className="text-slate transition-colors hover:text-midnight"
        aria-label="Dismiss"
      >
        <X size={16} />
      </button>
    </div>
  );
}
