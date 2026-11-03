import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { OptionForm } from "@/components/admin/products/OptionForm";
import { getAdminSession } from "@/lib/auth/admin";
import { getAdminPackage } from "@/lib/products/admin-packages";

export const metadata: Metadata = { title: "New option", robots: { index: false, follow: false } };

export default async function NewOptionPage({ params }: { params: Promise<{ slug: string }> }) {
  if (!(await getAdminSession())) notFound();
  const { slug } = await params;
  const pkg = await getAdminPackage(slug);
  if (!pkg) notFound();

  return (
    <AdminShell
      title="New option"
      back={{ href: `/admin/products/${slug}`, label: pkg.title }}
      description="Save the option first, then add its schedule (start times and spots)."
    >
      <div className="max-w-4xl">
        <OptionForm
          packageSlug={slug}
          initial={{
            slotCutoffs: {},
            lastMinuteAfterFirst: false,
            instantConfirm: false,
            pickupMode: "none",
            pickupLocations: [],
            wheelchairAccessible: false,
            skipTheLine: false,
            guideMaterials: [],
            title: "",
            description: "",
            durationLabel: "",
            languages: pkg.languages.join(", "),
            isPrivate: false,
            active: true,
            sortOrder: 0,
            pricingMode: "per_person",
            prices: [
              { category: "adult", label: "Adult", ageMin: 12, price: pkg.price },
              { category: "child", label: "Child", ageMin: 3, ageMax: 11, price: Math.round(pkg.price * 0.5) },
            ],
            groupTiers: [],
            seasons: [],
            minParticipants: 1,
            maxParticipants: "",
            cutoffHours: 24,
          }}
        />
      </div>
    </AdminShell>
  );
}
