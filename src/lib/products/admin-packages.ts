import { prisma } from "@/lib/db";
import { getFeaturedPackages, getPackageBySlug } from "@/lib/content";

/**
 * Tour packages as the admin Products area sees them: every admin-managed tour, drafts
 * included, plus any tours the website serves from Sanity or the built-in data.
 */

export type AdminPackage = {
  slug: string;
  title: string;
  price: number;
  category: string;
  imageUrl?: string;
  languages: string[];
  /** Set for tours stored in the database (editable in the tour editor) */
  id?: string;
  status?: "DRAFT" | "PUBLISHED";
};

export async function listAdminPackages(): Promise<AdminPackage[]> {
  const [rows, site] = await Promise.all([
    prisma.tourPackage.findMany({
      orderBy: { updatedAt: "desc" },
      select: { id: true, slug: true, title: true, status: true, price: true, category: true, imageUrl: true, languages: true },
    }),
    getFeaturedPackages(),
  ]);
  const stored = new Set(rows.map((r) => r.slug));
  return [
    ...rows.map((r) => ({ ...r, imageUrl: r.imageUrl || undefined })),
    // Tours the site shows that aren't in the database (Sanity / sample data): options only
    ...site
      .filter((p) => !stored.has(p.slug))
      .map((p) => ({ slug: p.slug, title: p.title, price: p.price, category: p.category, imageUrl: p.image.url, languages: p.languages ?? [] })),
  ];
}

/** One tour by slug, including drafts — so options can be set up before a tour is published */
export async function getAdminPackage(slug: string): Promise<AdminPackage | null> {
  const row = await prisma.tourPackage.findUnique({
    where: { slug },
    select: { id: true, slug: true, title: true, status: true, price: true, category: true, imageUrl: true, languages: true },
  });
  if (row) return { ...row, imageUrl: row.imageUrl || undefined };
  const pkg = await getPackageBySlug(slug);
  return pkg ? { slug: pkg.slug, title: pkg.title, price: pkg.price, category: pkg.category, imageUrl: pkg.image.url, languages: pkg.languages ?? [] } : null;
}
