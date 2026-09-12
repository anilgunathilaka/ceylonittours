import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/ui/Reveal";
import { Button } from "@/components/ui/Button";
import { FeaturedPackageCard } from "@/components/home/FeaturedPackageCard";
import { getFeaturedPackages } from "@/lib/content";

export async function FeaturedPackages() {
  const packages = await getFeaturedPackages();

  return (
    <section className="bg-surface py-20 lg:py-28">
      <div className="mx-auto max-w-[1776px] px-3 sm:px-5 lg:px-8">
        <SectionHeading
          eyebrow="Featured Packages"
          title="Hand-Crafted Tours, Ready to Book"
        />

        <div className="mt-12 grid grid-cols-1 gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {packages.slice(0, 4).map((pkg, i) => (
            <Reveal key={pkg.slug} delay={(i % 4) * 0.08}>
              <FeaturedPackageCard pkg={pkg} />
            </Reveal>
          ))}
        </div>

        <div className="mt-12 flex justify-center">
          <Button href="/tour-packages" variant="outlineDark" size="lg">
            View All Tour Packages
          </Button>
        </div>
      </div>
    </section>
  );
}
