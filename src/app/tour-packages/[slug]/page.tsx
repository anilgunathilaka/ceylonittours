import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PackageDetail } from "@/components/tour-packages/PackageDetail";
import { getFeaturedPackages, getPackageBySlug } from "@/lib/content";

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
    alternates: { canonical: `/tour-packages/${pkg.slug}` },
  };
}

export default async function TourPackageDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const pkg = await getPackageBySlug(slug);
  if (!pkg) notFound();

  const packages = await getFeaturedPackages();
  const related = packages.filter((p) => p.category === pkg.category && p.slug !== pkg.slug).slice(0, 3);

  return <PackageDetail pkg={pkg} related={related} />;
}
