import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EMPTY_REVIEWS, PackageDetail, type PackageBooking, type PackageReviews } from "@/components/tour-packages/PackageDetail";
import { getFeaturedPackages, getPackageBySlug } from "@/lib/content";
import { getActiveOffers, getOptionsForPackage, getTourDiscount } from "@/lib/products/options";
import { applyDiscount, fromPrice } from "@/lib/products/pricing";
import { getApprovedReviews } from "@/lib/reviews";
import { prisma } from "@/lib/db";
import type { TourPackage } from "@/types";

const SITE_URL = "https://ceylonittours.com";

/**
 * Bookable options and verified reviews live in the database. If it cannot be reached (e.g. a
 * build without DATABASE_URL), the page still renders with the enquiry form.
 */
async function loadBookingData(slug: string): Promise<{ booking: PackageBooking; verified: PackageReviews }> {
  try {
    const [options, verified, offers, discount, recentBookings] = await Promise.all([
      getOptionsForPackage(slug, { activeOnly: true }),
      getApprovedReviews(slug),
      getActiveOffers(),
      getTourDiscount(slug),
      // Real demand only: active bookings made in the last 30 days
      prisma.booking.count({ where: { packageSlug: slug, status: { not: "CANCELLED" }, createdAt: { gte: new Date(Date.now() - 30 * 86400_000) } } }),
    ]);
    const prices = options.map(fromPrice).filter((p) => p !== null);
    const cheapest = prices.sort((a, b) => a.amount - b.amount)[0];
    const lowest = cheapest && { ...cheapest, amount: applyDiscount(cheapest.amount, discount) };
    const compareAt = cheapest && lowest && lowest.amount < cheapest.amount ? cheapest.amount : undefined;
    const offer = offers
      .filter((o) => o.packageSlugs.length === 0 || o.packageSlugs.includes(slug))
      .sort((a, b) => b.discountPercent - a.discountPercent)[0];
    return {
      booking: {
        bookable: options.length > 0,
        fromPrice: lowest,
        compareAt,
        offer: options.length > 0 && offer ? { name: offer.name, discountPercent: offer.discountPercent } : undefined,
        wheelchairAccessible: options.some((o) => o.wheelchairAccessible),
        recentBookings,
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

  return (
    <>
      <script
        type="application/ld+json"
        // Structured data for search engines; JSON.stringify output with "<" escaped so it can't close the tag
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData(pkg, booking, verified)).replace(/</g, "\\u003c") }}
      />
      <PackageDetail pkg={pkg} related={related} booking={booking} verified={verified} />
    </>
  );
}

/** schema.org data so search results can show the price and real customer rating */
function structuredData(pkg: TourPackage, booking: PackageBooking, verified: PackageReviews) {
  const price = booking.fromPrice?.amount ?? pkg.price;
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: pkg.title,
    description: pkg.description ?? pkg.summary,
    image: [pkg.image.url, ...(pkg.gallery ?? []).map((g) => g.url)].slice(0, 6),
    sku: pkg.productNumber ? String(pkg.productNumber) : pkg.slug,
    brand: { "@type": "Brand", name: pkg.provider ?? "Ceylon IT Tours" },
    offers: {
      "@type": "Offer",
      url: `${SITE_URL}/tour-packages/${pkg.slug}`,
      priceCurrency: "USD",
      price: price.toFixed(2),
      availability: "https://schema.org/InStock",
    },
    // Only verified reviews from real bookings — never the manually entered rating
    ...(verified.count > 0 && verified.average
      ? { aggregateRating: { "@type": "AggregateRating", ratingValue: verified.average, reviewCount: verified.count, bestRating: 5 } }
      : {}),
  };
}
