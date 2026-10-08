"use client";

import { useActionState } from "react";
import { CalendarDays, Check, RotateCcw, X } from "lucide-react";
import { updateBookingAction, type UpdateBookingState } from "@/app/admin/bookings/actions";
import type { BookingStatus } from "@/lib/bookings";
import { cn } from "@/lib/utils";

const initialState: UpdateBookingState = { ok: false };

export function BookingActionForm({
  bookingId,
  status,
  travelDate,
  version,
  filter,
}: {
  bookingId: string;
  status: BookingStatus;
  travelDate?: string;
  /** Version the admin is looking at — stale submissions are rejected server-side */
  version: number;
  /** Current filter tab, so a successful update redirects back to it */
  filter: string;
}) {
  // Plain server action (no client wrapper) so the form also works without JavaScript.
  // Success redirects with a page-level notice; only errors come back as state.
  const [state, formAction, pending] = useActionState(updateBookingAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="bookingId" value={bookingId} />
      <input type="hidden" name="version" value={version} />
      <input type="hidden" name="filter" value={filter} />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[200px_1fr]">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold tracking-wide text-slate uppercase">Travel date</span>
          <div className="relative">
            <CalendarDays size={16} className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-slate" />
            <input
              type="date"
              name="travelDate"
              defaultValue={travelDate}
              className="h-11 w-full rounded-xl border border-border bg-surface pr-3 pl-10 text-sm text-midnight focus:border-secondary focus:outline-none"
            />
          </div>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold tracking-wide text-slate uppercase">Message to customer</span>
          <textarea
            name="message"
            rows={3}
            maxLength={2000}
            placeholder="e.g. Pickup at 7:00 AM from your hotel lobby. Total price $240 — pay on arrival."
            className="w-full resize-y rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-midnight placeholder:text-slate/60 focus:border-secondary focus:outline-none"
          />
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <label className="mr-auto flex items-center gap-2 text-sm text-slate">
          <input type="checkbox" name="notify" defaultChecked className="h-4 w-4 accent-primary" />
          Email the customer
        </label>

        {status !== "pending" && (
          <button
            type="submit"
            name="status"
            value="pending"
            disabled={pending}
            className="inline-flex h-10 items-center gap-1.5 rounded-full border border-midnight/15 px-4 text-sm font-semibold text-midnight transition-colors hover:bg-midnight/5 disabled:opacity-60"
          >
            <RotateCcw size={15} />
            Reopen
          </button>
        )}
        {status !== "cancelled" && (
          <button
            type="submit"
            name="status"
            value="cancelled"
            disabled={pending}
            className="inline-flex h-10 items-center gap-1.5 rounded-full border border-accent/40 px-4 text-sm font-semibold text-accent-dark transition-colors hover:bg-accent/10 disabled:opacity-60"
          >
            <X size={15} />
            Cancel booking
          </button>
        )}
        <button
          type="submit"
          name="status"
          value="confirmed"
          disabled={pending}
          className="inline-flex h-10 items-center gap-1.5 rounded-full bg-nature px-5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          <Check size={15} />
          {pending ? "Saving…" : status === "confirmed" ? "Update & re-send" : "Confirm booking"}
        </button>
      </div>

      {state.message && (
        <p className={cn("text-sm font-medium", state.ok ? "text-nature" : "text-accent-dark")} role="status">
          {state.message}
        </p>
      )}
    </form>
  );
}
