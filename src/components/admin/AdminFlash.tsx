"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { CheckCircle2, X } from "lucide-react";

/**
 * Page-level success banner for the admin bookings page. A booking that is confirmed
 * or cancelled moves to another filter tab and unmounts, so its own form can't show
 * the result — this banner lives above the list and survives the refresh.
 */
const AdminFlashContext = createContext<(message: string) => void>(() => {});

export const useAdminFlash = () => useContext(AdminFlashContext);

export function AdminFlashProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);
  const show = useCallback((value: string) => setMessage(value), []);

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(null), 8000);
    return () => clearTimeout(timer);
  }, [message]);

  return (
    <AdminFlashContext.Provider value={show}>
      {message && (
        <div
          role="status"
          className="flex items-start gap-3 rounded-2xl bg-nature/10 px-5 py-4 text-sm font-medium text-midnight ring-1 ring-nature/30"
        >
          <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-nature" />
          <p className="flex-1">{message}</p>
          <button
            type="button"
            onClick={() => setMessage(null)}
            className="text-slate transition-colors hover:text-midnight"
            aria-label="Dismiss"
          >
            <X size={16} />
          </button>
        </div>
      )}
      {children}
    </AdminFlashContext.Provider>
  );
}
