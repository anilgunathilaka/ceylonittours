/**
 * Content-fetch abstraction. When a Sanity project is connected
 * (NEXT_PUBLIC_SANITY_PROJECT_ID is set), each function queries Sanity via
 * GROQ. Until then — or if a query errors, or a document type simply has no
 * entries in Sanity yet — it falls back to the local typed data in
 * src/lib/data, so the site keeps working while content is migrated in
 * gradually through the Studio at /cms.
 */
import { client } from "@/sanity/lib/client";
import {
  blogPostsQuery,
  destinationsQuery,
  experiencesQuery,
  packagesQuery,
  testimonialsQuery,
} from "@/sanity/lib/queries";
import { destinations } from "@/lib/data/destinations";
import { packages } from "@/lib/data/packages";
import { experiences } from "@/lib/data/experiences";
import { testimonials } from "@/lib/data/testimonials";
import { blogPosts } from "@/lib/data/blog";
import { galleryImages } from "@/lib/data/gallery";
import { stats, whyChooseUs, travelProcess } from "@/lib/data/stats";
import type { BlogPost, Destination, Experience, TourPackage, Testimonial } from "@/types";

/**
 * Checked via raw process.env (not src/sanity/env.ts, which throws when
 * unset) so this stays a safe boolean even before .env.local is configured.
 */
const isSanityConfigured = Boolean(process.env.NEXT_PUBLIC_SANITY_PROJECT_ID);

async function withFallback<T>(query: string, fallback: T[]): Promise<T[]> {
  if (!isSanityConfigured) return fallback;

  try {
    const result = await client.fetch<T[]>(query);
    return result.length > 0 ? result : fallback;
  } catch (error) {
    console.error("Sanity query failed, using local fallback data:", error);
    return fallback;
  }
}

export async function getDestinations() {
  return withFallback<Destination>(destinationsQuery, destinations);
}

export async function getFeaturedDestinations() {
  const all = await getDestinations();
  return all.filter((d) => d.featured);
}

export async function getFeaturedPackages() {
  return withFallback<TourPackage>(packagesQuery, packages);
}

export async function getPackageBySlug(slug: string) {
  const all = await getFeaturedPackages();
  return all.find((p) => p.slug === slug);
}

export async function getExperiences() {
  return withFallback<Experience>(experiencesQuery, experiences);
}

export async function getTestimonials() {
  return withFallback<Testimonial>(testimonialsQuery, testimonials);
}

export async function getLatestBlogPosts(limit = 3) {
  const all = await withFallback<BlogPost>(blogPostsQuery, blogPosts);
  return all.slice(0, limit);
}

// Not yet modeled in Sanity — local data only.
export async function getGalleryImages() {
  return galleryImages;
}

export async function getStats() {
  return stats;
}

export async function getWhyChooseUs() {
  return whyChooseUs;
}

export async function getTravelProcess() {
  return travelProcess;
}
