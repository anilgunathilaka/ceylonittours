import Link from "next/link";
import { CalendarCheck, LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/admin/bookings", label: "Bookings", icon: CalendarCheck },
  { href: "/admin/content", label: "Content", icon: LayoutGrid },
] as const;

/** Switches between the admin areas. */
export function AdminNav({ active }: { active: "bookings" | "content" }) {
  return (
    <nav aria-label="Admin sections" className="flex gap-2">
      {tabs.map(({ href, label, icon: Icon }) => {
        const current = href.endsWith(active);
        return (
          <Link
            key={href}
            href={href}
            aria-current={current ? "page" : undefined}
            className={cn(
              "inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-semibold transition-colors",
              current ? "bg-primary text-white" : "bg-surface text-midnight ring-1 ring-border hover:bg-midnight/5",
            )}
          >
            <Icon size={16} /> {label}
          </Link>
        );
      })}
    </nav>
  );
}
