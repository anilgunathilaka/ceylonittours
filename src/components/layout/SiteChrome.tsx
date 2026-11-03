"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

/**
 * The public header and footer, left out on admin pages (the admin has its own layout).
 * Header and footer are rendered on the server and passed in, so they stay server components.
 */
export function SiteChrome({ header, footer, children }: { header: ReactNode; footer: ReactNode; children: ReactNode }) {
  const pathname = usePathname();
  const admin = pathname === "/admin" || pathname.startsWith("/admin/");

  return (
    <>
      {!admin && header}
      <main id="main-content" className="flex-1">
        {children}
      </main>
      {!admin && footer}
    </>
  );
}
