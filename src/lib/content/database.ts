import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/db";
import type { BlogPost, Destination, Experience, SanityImage, Testimonial, TourCategory, TourPackage } from "@/types";

/**
 * Website reads from the admin-managed content tables. Only PUBLISHED rows are returned,
 * converted to the same shapes the Sanity queries produced, so no component changes are needed.
 *
 * Results are cached under CONTENT_CACHE_TAG: saving in /admin/content expires the tag so the
 * site updates immediately; the hourly revalidate is only a safety net.
 */
export const CONTENT_CACHE_TAG = "cms-content";
const CACHE = { tags: [CONTENT_CACHE_TAG], revalidate: 3600 };

const published = { status: "PUBLISHED" } as const;

function image(url: string | null, alt: string, width?: number | null, height?: number | null): SanityImage {
  return { url: url ?? "", alt, width: width ?? 1600, height: height ?? 1067 };
}

const asArray = <T>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);

export const getDatabaseDestinations = unstable_cache(
  async (): Promise<Destination[]> => {
    const rows = await prisma.destination.findMany({ where: published, orderBy: [{ featured: "desc" }, { name: "asc" }] });
    return rows.map((d) => ({
      slug: d.slug,
      name: d.name,
      region: d.region,
      tagline: d.tagline,
      description: d.description,
      image: image(d.imageUrl, d.imageAlt, d.imageWidth, d.imageHeight),
      tourCount: d.tourCount,
      startingPrice: d.startingPrice,
      featured: d.featured,
      mapPosition: { x: d.mapX, y: d.mapY },
    }));
  },
  ["cms-destinations"],
  CACHE,
);

export const getDatabasePackages = unstable_cache(
  async (): Promise<TourPackage[]> => {
    const rows = await prisma.tourPackage.findMany({ where: published, orderBy: { createdAt: "asc" } });
    return rows.map((p) => ({
      slug: p.slug,
      title: p.title,
      tourType: p.tourType ?? undefined,
      location: p.location ?? undefined,
      destinationSlugs: p.destinationSlugs,
      category: p.category as TourCategory,
      image: image(p.imageUrl, p.imageAlt, p.imageWidth, p.imageHeight),
      durationDays: p.durationDays ?? undefined,
      durationNights: p.durationNights ?? undefined,
      durationLabel: p.durationLabel ?? undefined,
      price: p.price,
      originalPrice: p.originalPrice ?? undefined,
      rating: p.rating ?? undefined,
      reviewCount: p.reviewCount ?? undefined,
      groupSize: p.groupSize,
      badge: (p.badge ?? undefined) as TourPackage["badge"],
      summary: p.summary,
      provider: p.provider ?? undefined,
      description: p.description ?? undefined,
      languages: p.languages,
      freeCancellation: p.freeCancellation,
      payLater: p.payLater,
      highlights: p.highlights,
      routeSummary: p.routeSummary ?? undefined,
      itinerary: asArray<NonNullable<TourPackage["itinerary"]>[number]>(p.itinerary),
      includes: p.includes,
      excludes: p.excludes,
      notSuitableFor: p.notSuitableFor,
      whatToBring: p.whatToBring,
      notAllowed: p.notAllowed,
      knowBeforeYouGo: p.knowBeforeYouGo,
      reviewBreakdown: asArray<NonNullable<TourPackage["reviewBreakdown"]>[number]>(p.reviewBreakdown),
      aiReviewSummary: p.aiReviewSummary ?? undefined,
      reviewHighlights: asArray<NonNullable<TourPackage["reviewHighlights"]>[number]>(p.reviewHighlights),
    }));
  },
  ["cms-tour-packages"],
  CACHE,
);

export const getDatabaseExperiences = unstable_cache(
  async (): Promise<Experience[]> => {
    const rows = await prisma.experience.findMany({ where: published, orderBy: { name: "asc" } });
    return rows.map((e) => ({
      slug: e.slug,
      name: e.name,
      category: e.category as TourCategory,
      description: e.description,
      image: image(e.imageUrl, e.imageAlt, e.imageWidth, e.imageHeight),
      tourCount: e.tourCount,
    }));
  },
  ["cms-experiences"],
  CACHE,
);

export const getDatabaseTestimonials = unstable_cache(
  async (): Promise<Testimonial[]> => {
    const rows = await prisma.testimonial.findMany({
      where: published,
      orderBy: { createdAt: "asc" },
      include: { tourPackage: { select: { title: true } } },
    });
    return rows.map((t) => ({
      id: t.id,
      name: t.name,
      country: t.country,
      countryFlag: t.countryFlag,
      avatar: image(t.avatarUrl, t.avatarAlt || t.name, 256, 256),
      quote: t.quote,
      rating: t.rating,
      tripName: t.tourPackage?.title ?? "",
    }));
  },
  ["cms-testimonials"],
  CACHE,
);

export const getDatabaseBlogPosts = unstable_cache(
  async (): Promise<BlogPost[]> => {
    const rows = await prisma.blogPost.findMany({ where: published, orderBy: { publishedAt: "desc" } });
    return rows.map((b) => ({
      slug: b.slug,
      title: b.title,
      excerpt: b.excerpt,
      image: image(b.imageUrl, b.imageAlt, b.imageWidth, b.imageHeight),
      category: b.category,
      readTimeMinutes: b.readTimeMinutes,
      publishedAt: b.publishedAt.toISOString().slice(0, 10),
    }));
  },
  ["cms-blog-posts"],
  CACHE,
);
