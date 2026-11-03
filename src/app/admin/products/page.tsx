import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarClock, Pencil, Plus, Trash2 } from "lucide-react";
import { deleteContentAction } from "@/app/admin/content/actions";
import { AdminNotice } from "@/components/admin/AdminNotice";
import { AdminShell } from "@/components/admin/AdminShell";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { getAdminSession } from "@/lib/auth/admin";
import { listAdminPackages } from "@/lib/products/admin-packages";
import { countOptionsByPackage } from "@/lib/products/options";
import { formatCurrency } from "@/lib/utils";

export const metadata: Metadata = { title: "Products", robots: { index: false, follow: false } };

const NOTICES: Record<string, string> = {
  published: "Tour saved and published — the website now shows this change.",
  saved: "Tour saved as draft — it is not visible on the website.",
  deleted: "Tour deleted.",
  "delete-failed": "Could not delete that tour — please try again.",
};

export default async function AdminProductsPage({ searchParams }: { searchParams: Promise<{ notice?: string }> }) {
  if (!(await getAdminSession())) notFound();
  const { notice } = await searchParams;

  const [packages, optionCounts] = await Promise.all([listAdminPackages(), countOptionsByPackage()]);

  return (
    <AdminShell
      title="Products"
      description="Your tours. Edit a tour's details (photos, itinerary, meeting point…) or set up what customers can book: options, prices, start times and capacity. Tours without options keep the enquiry form."
      actions={
        <Button href="/admin/content/tour-packages/new" size="sm" icon={<Plus size={14} />}>
          New tour
        </Button>
      }
    >

      {notice && NOTICES[notice] && <AdminNotice message={NOTICES[notice]} />}

      {packages.length === 0 ? (
        <p className="rounded-3xl border border-dashed border-border bg-surface px-6 py-14 text-center text-sm text-slate">
          No tours yet — add your first one with “New tour”.
        </p>
      ) : (
        <ul className="divide-y divide-border rounded-3xl bg-surface shadow-card ring-1 ring-border">
          {packages.map((pkg) => {
            const options = optionCounts.get(pkg.slug) ?? 0;
            return (
              <li key={pkg.slug} className="flex flex-wrap items-center gap-x-4 gap-y-3 px-5 py-4">
                <Link href={`/admin/products/${pkg.slug}`} className="flex min-w-0 flex-1 items-center gap-4">
                  <span className="relative h-14 w-20 shrink-0 overflow-hidden rounded-lg bg-border">
                    {pkg.imageUrl && <Image src={pkg.imageUrl} alt="" fill sizes="80px" className="object-cover" />}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-semibold text-midnight hover:text-primary">{pkg.title}</span>
                    <span className="text-xs text-slate">
                      {pkg.category} · from {formatCurrency(pkg.price)}
                    </span>
                  </span>
                </Link>

                <div className="flex flex-wrap items-center gap-2">
                  {pkg.status && <Badge tone={pkg.status === "PUBLISHED" ? "nature" : "gold"}>{pkg.status === "PUBLISHED" ? "Published" : "Draft"}</Badge>}
                  {options > 0 ? (
                    <Badge tone="primary">
                      {options} option{options === 1 ? "" : "s"}
                    </Badge>
                  ) : (
                    <Badge tone="accent">Enquiry only</Badge>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  {pkg.id && (
                    <Link
                      href={`/admin/content/tour-packages/${pkg.id}`}
                      className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-sm font-medium text-midnight hover:bg-midnight/5"
                    >
                      <Pencil size={14} /> Edit
                    </Link>
                  )}
                  <Link
                    href={`/admin/products/${pkg.slug}`}
                    className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-sm font-medium text-midnight hover:bg-midnight/5"
                  >
                    <CalendarClock size={14} /> Options
                  </Link>
                  {pkg.id && (
                    // Two-step delete without a JavaScript dialog: open, then confirm
                    <details className="relative">
                      <summary className="inline-flex h-9 cursor-pointer list-none items-center gap-1.5 rounded-full px-3 text-sm font-medium text-slate hover:bg-accent/10 hover:text-accent-dark">
                        <Trash2 size={14} /> Delete
                      </summary>
                      <form
                        action={deleteContentAction}
                        className="absolute right-0 z-10 mt-2 flex w-64 flex-col gap-3 rounded-xl bg-surface p-4 text-sm shadow-card-hover ring-1 ring-border"
                      >
                        <input type="hidden" name="type" value="tour-packages" />
                        <input type="hidden" name="id" value={pkg.id} />
                        <p className="text-midnight">Delete “{pkg.title}” permanently? Its options stay saved and existing bookings are kept.</p>
                        <button type="submit" className="h-9 rounded-full bg-accent-dark px-4 font-semibold text-white hover:bg-accent">
                          Yes, delete
                        </button>
                      </form>
                    </details>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </AdminShell>
  );
}
