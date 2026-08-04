import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { PackagesCatalog } from "@/components/tour-packages/PackagesCatalog";
import { getFeaturedPackages } from "@/lib/content";

export const metadata: Metadata = {
  title: "Tour Packages",
  description: "Browse hand-crafted Sri Lanka tour packages, transfers, and day trips, fully customisable to your dates and interests.",
  alternates: { canonical: "/tour-packages" },
};

export default async function TourPackagesPage() {
  const packages = await getFeaturedPackages();

  return (
    <section className="bg-ivory py-20 lg:py-28">
      <Container>
        <SectionHeading
          eyebrow="Tour Packages"
          title="Every Tour, Transfer & Day Trip We Run"
        />

        <div className="mt-12">
          <PackagesCatalog packages={packages} />
        </div>
      </Container>
    </section>
  );
}
