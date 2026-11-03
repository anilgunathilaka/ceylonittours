import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EMPTY_REVIEWS, PackageDetail, type PackageBooking, type PackageReviews } from "@/components/tour-packages/PackageDetail";
import { getFeaturedPackages, getPackageBySlug } from "@/lib/content";
import { getActiveOffers, getOptionsForPackage } from "@/lib/products/options";
import { fromPrice } from "@/lib/products/pricing";
import { getApprovedReviews } from "@/lib/reviews";

/**
 * Bookable options and verified reviews live in the database. If it cannot be reached (e.g. a
 * build without DATABASE_URL), the page still renders with the enquiry form.
 */
async function loadBookingData(slug: string): Promise<{ booking: PackageBooking; verified: PackageReviews }> {
  try {
    const [options, verified, offers] = await Promise.all([getOptionsForPackage(slug, { activeOnly: true }), getApprovedReviews(slug), getActiveOffers()]);
    const prices = options.map(fromPrice).filter((p) => p !== null);
    const lowest = prices.sort((a, b) => a.amount - b.amount)[0];
    const offer = offers
      .filter((o) => o.packageSlugs.length === 0 || o.packageSlugs.includes(slug))
      .sort((a, b) => b.discountPercent - a.discountPercent)[0];
    return {
      booking: {
        bookable: options.length > 0,
        fromPrice: lowest,
        offer: options.length > 0 && offer ? { name: offer.name, discountPercent: offer.discountPercent } : undefined,
        wheelchairAccessible: options.some((o) => o.wheelchairAccessible),
      },
      verified,
    };
  } catch (error) {
    console.error("[tour-package] Booking data unavailable", error);
    return { booking: { bookable: false }, verified: EMPTY_REVIEWS };
  }
}

export async function generateStaticParams() {
  const packages = await getFeaturedPackages();
  return packages.map((pkg) => ({ slug: pkg.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const pkg = await getPackageBySlug(slug);
  if (!pkg) return {};

  return {
    title: pkg.title,
    description: pkg.description ?? pkg.summary,
    keywords: pkg.keywords && pkg.keywords.length > 0 ? pkg.keywords : undefined,
    alternates: { canonical: `/tour-packages/${pkg.slug}` },
  };
}

export default async function TourPackageDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const pkg = await getPackageBySlug(slug);
  if (!pkg) notFound();

  const packages = await getFeaturedPackages();
  // Same category first, then the rest, for the "You might also like" carousel
  const others = packages.filter((p) => p.slug !== pkg.slug);
  const related = [...others.filter((p) => p.category === pkg.category), ...others.filter((p) => p.category !== pkg.category)].slice(0, 8);

  const { booking, verified } = await loadBookingData(pkg.slug);

  return <PackageDetail pkg={pkg} related={related} booking={booking} verified={verified} />;
}
