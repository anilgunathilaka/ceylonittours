import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

/** Page heading and body for admin pages (the sidebar and top bar come from the admin layout). */
export function AdminShell({
  title,
  description,
  back,
  actions,
  narrow,
  children,
}: {
  title: string;
  description?: ReactNode;
  back?: { href: string; label: string };
  actions?: ReactNode;
  /** Limit the width, for single-column forms */
  narrow?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={cn("flex flex-col gap-6", narrow && "max-w-4xl")}>
      <header className="flex flex-col gap-2">
        {back && (
          <Link href={back.href} className="inline-flex items-center gap-1.5 self-start text-sm font-medium text-slate hover:text-midnight">
            <ArrowLeft size={15} /> {back.label}
          </Link>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold tracking-tight text-midnight sm:text-[28px]">{title}</h1>
          {actions}
        </div>
        {description && <p className="max-w-3xl text-sm text-slate">{description}</p>}
      </header>
      {children}
    </div>
  );
}
