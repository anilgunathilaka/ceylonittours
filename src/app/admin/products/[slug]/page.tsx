import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarClock, ExternalLink, Pencil, Plus, Users } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { getAdminSession } from "@/lib/auth/admin";
import { getAdminPackage } from "@/lib/products/admin-packages";
import { prisma } from "@/lib/db";
import { getOptionsForPackage } from "@/lib/products/options";
import { fromPrice } from "@/lib/products/pricing";
import { formatCurrency } from "@/lib/utils";

export const metadata: Metadata = { title: "Product options", robots: { index: false, follow: false } };

export default async function AdminProductPage({ params }: { params: Promise<{ slug: string }> }) {
  if (!(await getAdminSession())) notFound();
  const { slug } = await params;
  const pkg = await getAdminPackage(slug);
  if (!pkg) notFound();

  const [options, ruleCounts] = await Promise.all([
    getOptionsForPackage(slug),
    prisma.availabilityRule.groupBy({ by: ["optionId"], where: { option: { packageSlug: slug } }, _count: { _all: true } }),
  ]);
  const rulesByOption = new Map(ruleCounts.map((r) => [r.optionId, r._count._all]));

  return (
    <AdminShell
      title={pkg.title}
      back={{ href: "/admin/products", label: "Products" }}
      description="Each option is a version of this tour customers can book — e.g. shared or private, with or without pickup — with its own prices, start times and capacity."
      actions={
        <div className="flex flex-wrap gap-2">
          {pkg.id && (
            <Button href={`/admin/content/tour-packages/${pkg.id}`} variant="outlineDark" size="sm" icon={<Pencil size={14} />}>
              Edit tour details
            </Button>
          )}
          {pkg.status !== "DRAFT" && (
            <Button href={`/tour-packages/${slug}`} variant="outlineDark" size="sm" icon={<ExternalLink size={14} />}>
              View on site
            </Button>
          )}
          <Button href={`/admin/products/${slug}/options/new`} size="sm" icon={<Plus size={14} />}>
            Add option
          </Button>
        </div>
      }
    >
      {options.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border bg-surface px-6 py-14 text-center">
          <p className="font-semibold text-midnight">No bookable options yet</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-slate">
            Customers currently send an enquiry for this tour. Add an option with prices and a schedule to let them pick a date, time and
            guests and book directly (Pay on Arrival).
          </p>
          <Button href={`/admin/products/${slug}/options/new`} className="mt-5" icon={<Plus size={16} />}>
            Add the first option
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {options.map((option) => {
            const price = fromPrice(option);
            const rules = rulesByOption.get(option.id) ?? 0;
            return (
              <Link
                key={option.id}
                href={`/admin/products/${slug}/options/${option.id}`}
                className="flex flex-col gap-3 rounded-3xl bg-surface p-6 shadow-card ring-1 ring-border transition-shadow hover:shadow-card-hover"
              >
                <div className="flex items-start justify-between gap-3">
                  <h2 className="font-display text-lg font-semibold text-midnight">{option.title}</h2>
                  <Badge tone={option.active ? "nature" : "accent"}>{option.active ? "Active" : "Hidden"}</Badge>
                </div>
                {option.description && <p className="line-clamp-2 text-sm text-slate">{option.description}</p>}
                <div className="mt-auto flex flex-wrap gap-x-5 gap-y-1 text-sm text-midnight">
                  <span className="font-semibold">{price ? `From ${formatCurrency(price.amount)} / ${price.unit}` : "No price set"}</span>
                  <span className="flex items-center gap-1.5 text-slate">
                    <Users size={14} /> {option.minParticipants}–{option.maxParticipants ?? "∞"} guests
                  </span>
                  <span className={`flex items-center gap-1.5 ${rules ? "text-slate" : "text-accent-dark"}`}>
                    <CalendarClock size={14} /> {rules ? `${rules} schedule${rules === 1 ? "" : "s"}` : "No schedule — not bookable"}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </AdminShell>
  );
}
