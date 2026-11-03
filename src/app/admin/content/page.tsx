import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { getAdminSession } from "@/lib/auth/admin";
import { CONTENT_CONFIG, CONTENT_SECTION_TYPES } from "@/lib/cms/config";
import { countContent } from "@/lib/cms/repository";

export const metadata: Metadata = {
  title: "Manage Content",
  robots: { index: false, follow: false },
};

export default async function AdminContentPage() {
  if (!(await getAdminSession())) notFound();

  const counts = await Promise.all(CONTENT_SECTION_TYPES.map((type) => countContent(type)));
  const source = process.env.CONTENT_SOURCE === "database" ? "database" : "sanity";

  return (
    <AdminShell
      title="Website content"
      description={
        <>
          Only <strong>published</strong> items appear on the website; drafts stay here until you publish them. Tour packages are managed under{" "}
          <Link href="/admin/products" className="font-semibold text-primary hover:underline">
            Products
          </Link>
          .
        </>
      }
    >
        <header className="flex flex-col gap-4">
          {source !== "database" && (
            <p className="rounded-xl bg-gold/10 px-4 py-3 text-sm text-midnight ring-1 ring-gold/30">
              The website is still reading content from <strong>Sanity</strong>. Content saved here is stored safely but
              won’t appear on the site until <code>CONTENT_SOURCE=database</code> is set.
            </p>
          )}
        </header>

        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CONTENT_SECTION_TYPES.map((type, index) => (
            <li key={type}>
              <Link
                href={`/admin/content/${type}`}
                className="group flex items-center justify-between gap-4 rounded-2xl bg-surface p-6 shadow-card transition-shadow hover:shadow-card-hover"
              >
                <div className="flex flex-col gap-1">
                  <span className="font-display text-lg font-semibold text-midnight">{CONTENT_CONFIG[type].label}</span>
                  <span className="text-sm text-slate">
                    {counts[index].published} published · {counts[index].total} total
                  </span>
                </div>
                <ChevronRight size={20} className="text-slate transition-transform group-hover:translate-x-0.5" />
              </Link>
            </li>
          ))}
        </ul>
    </AdminShell>
  );
}
