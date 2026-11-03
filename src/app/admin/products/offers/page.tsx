import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Trash2 } from "lucide-react";
import { createOfferAction, deleteOfferAction, toggleOfferAction } from "@/app/admin/products/offers-actions";
import { AdminShell } from "@/components/admin/AdminShell";
import { OperationForm } from "@/components/admin/OperationForm";
import { OfferTypeFields } from "@/components/admin/products/OfferTypeFields";
import { Badge } from "@/components/ui/Badge";
import { getAdminSession } from "@/lib/auth/admin";
import { formatDisplayDate } from "@/lib/date";
import { prisma } from "@/lib/db";
import { listAdminPackages } from "@/lib/products/admin-packages";

export const metadata: Metadata = { title: "Special offers", robots: { index: false, follow: false } };

const field = "h-11 rounded-xl border border-border bg-surface px-3 text-sm text-midnight focus:border-secondary focus:outline-none";
const label = "flex flex-col gap-1 text-xs font-semibold tracking-wide text-slate uppercase";
const iso = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : "");

export default async function SpecialOffersPage() {
  if (!(await getAdminSession())) notFound();
  const [offers, packages] = await Promise.all([prisma.specialOffer.findMany({ orderBy: { createdAt: "desc" } }), listAdminPackages()]);
  const titles = new Map(packages.map((p) => [p.slug, p.title]));

  const describe = (o: (typeof offers)[number]) => {
    const when =
      o.type === "early_bird"
        ? `Booked ${o.days}+ days before travel`
        : o.type === "last_minute"
          ? `Booked within ${o.days} day${o.days === 1 ? "" : "s"} of travel`
          : "Any booking";
    const dates =
      o.travelFrom || o.travelTo
        ? ` · travel ${o.travelFrom ? formatDisplayDate(iso(o.travelFrom)) : "…"} – ${o.travelTo ? formatDisplayDate(iso(o.travelTo)) : "…"}`
        : "";
    return when + dates;
  };

  return (
    <AdminShell
      title="Special offers"
      description="Discounts applied automatically to matching bookings and shown on the tour page as “Save X%”. Offers don't stack — the biggest matching discount wins. Pay on arrival collects the discounted price."
    >

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.2fr_1fr]">
        <section className="flex flex-col gap-3">
          {offers.length === 0 ? (
            <p className="rounded-3xl border border-dashed border-border bg-surface px-6 py-14 text-center text-sm text-slate">No offers yet.</p>
          ) : (
            offers.map((o) => (
              <article key={o.id} className="flex flex-col gap-3 rounded-3xl bg-surface p-5 shadow-card ring-1 ring-border">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-display text-lg font-semibold text-midnight">{o.name}</p>
                    <p className="text-sm text-slate">{describe(o)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge tone="accent">−{o.discountPercent}%</Badge>
                    <Badge tone={o.active ? "nature" : "gold"}>{o.active ? "Active" : "Paused"}</Badge>
                  </div>
                </div>
                <p className="text-xs text-slate">
                  {o.packageSlugs.length === 0 ? "All tours" : o.packageSlugs.map((slug) => titles.get(slug) ?? slug).join(" · ")}
                </p>
                <div className="flex gap-2">
                  <form action={toggleOfferAction}>
                    <input type="hidden" name="id" value={o.id} />
                    <input type="hidden" name="active" value={String(!o.active)} />
                    <button className="h-9 rounded-full px-4 text-sm font-semibold text-midnight ring-1 ring-border hover:bg-midnight/5">
                      {o.active ? "Pause" : "Activate"}
                    </button>
                  </form>
                  <form action={deleteOfferAction}>
                    <input type="hidden" name="id" value={o.id} />
                    <button className="inline-flex h-9 items-center gap-1.5 rounded-full px-4 text-sm font-semibold text-slate hover:bg-accent/10 hover:text-accent-dark">
                      <Trash2 size={14} /> Delete
                    </button>
                  </form>
                </div>
              </article>
            ))
          )}
        </section>

        <section className="self-start rounded-3xl bg-surface p-6 shadow-card ring-1 ring-border">
          <h2 className="mb-4 font-display text-lg font-semibold text-midnight">New offer</h2>
          <OperationForm action={createOfferAction} submitLabel="Create offer">
            <label className={label}>
              Name (shown to customers)
              <input name="name" maxLength={80} placeholder="e.g. Book early, save 10%" className={field} />
            </label>
            <OfferTypeFields fieldClass={field} labelClass={label} />
            <label className={label}>
              Discount (%)
              <input type="number" name="discountPercent" min={1} max={90} defaultValue={10} className={field} />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className={label}>
                Travel from (optional)
                <input type="date" name="travelFrom" className={field} />
              </label>
              <label className={label}>
                Travel to (optional)
                <input type="date" name="travelTo" className={field} />
              </label>
            </div>
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-1 text-xs font-semibold tracking-wide text-slate uppercase">Tours (none selected = all tours)</legend>
              <div className="flex max-h-56 flex-col gap-1.5 overflow-y-auto rounded-xl border border-border p-3">
                {packages.map((p) => (
                  <label key={p.slug} className="flex items-center gap-2 text-sm text-midnight">
                    <input type="checkbox" name="packageSlugs" value={p.slug} className="h-4 w-4 accent-primary" />
                    {p.title}
                  </label>
                ))}
              </div>
            </fieldset>
          </OperationForm>
        </section>
      </div>
    </AdminShell>
  );
}
