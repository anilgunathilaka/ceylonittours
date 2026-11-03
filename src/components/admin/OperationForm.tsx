"use client";

import { useActionState, useEffect, useRef, useTransition, type FormEvent, type ReactNode } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import type { OperationState } from "@/app/admin/bookings/operations-actions";
import { cn } from "@/lib/utils";

/**
 * Small admin form around a server action that returns { ok, message }. Submits through a
 * transition so typed text survives a failed attempt, and clears itself after success.
 */
export function OperationForm({
  action,
  submitLabel,
  children,
  className,
  resetOnSuccess = true,
}: {
  action: (prev: OperationState, formData: FormData) => Promise<OperationState>;
  submitLabel: string;
  children: ReactNode;
  className?: string;
  resetOnSuccess?: boolean;
}) {
  const [state, dispatch] = useActionState(action, { ok: false });
  const [pending, startTransition] = useTransition();
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok && resetOnSuccess) ref.current?.reset();
  }, [state, resetOnSuccess]);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => dispatch(formData));
  }

  return (
    <form ref={ref} onSubmit={onSubmit} className={cn("flex flex-col gap-3", className)}>
      {children}
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-10 items-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-50"
        >
          {pending && <Loader2 size={15} className="animate-spin" />}
          {submitLabel}
        </button>
        {state.message && (
          <span role="status" className={cn("flex items-center gap-1.5 text-sm font-medium", state.ok ? "text-nature" : "text-accent-dark")}>
            {state.ok && <CheckCircle2 size={15} />}
            {state.message}
          </span>
        )}
      </div>
    </form>
  );
}
