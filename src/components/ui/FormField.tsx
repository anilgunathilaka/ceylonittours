import { cn } from "@/lib/utils";
import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";

const fieldClasses =
  "h-12 w-full rounded-xl border border-border bg-surface px-4 text-sm text-midnight placeholder:text-slate/60 transition-colors focus:border-secondary focus:outline-none";

export function TextField({
  label,
  error,
  icon,
  className,
  ...props
}: {
  label: string;
  error?: string;
  icon?: ReactNode;
} & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="flex flex-col gap-1.5 text-left">
      <span className="text-xs font-semibold tracking-wide text-slate uppercase">{label}</span>
      <div className="relative">
        {icon && <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-slate">{icon}</span>}
        <input
          className={cn(fieldClasses, icon && "pl-10", error && "border-accent", className)}
          aria-invalid={!!error}
          {...props}
        />
      </div>
      {error && <span className="text-xs font-medium text-accent-dark">{error}</span>}
    </label>
  );
}

export function SelectField({
  label,
  error,
  icon,
  className,
  children,
  ...props
}: {
  label: string;
  error?: string;
  icon?: ReactNode;
  children: ReactNode;
} & SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <label className="flex flex-col gap-1.5 text-left">
      <span className="text-xs font-semibold tracking-wide text-slate uppercase">{label}</span>
      <div className="relative">
        {icon && <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-slate">{icon}</span>}
        <select
          className={cn(fieldClasses, icon && "pl-10", "appearance-none cursor-pointer", error && "border-accent", className)}
          aria-invalid={!!error}
          {...props}
        >
          {children}
        </select>
      </div>
      {error && <span className="text-xs font-medium text-accent-dark">{error}</span>}
    </label>
  );
}
