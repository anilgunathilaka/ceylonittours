import type { Metadata } from "next";
import { LuxuryHero } from "@/components/home/LuxuryHero";
import { PopularDestinations } from "@/components/home/PopularDestinations";
import { FeaturedPackages } from "@/components/home/FeaturedPackages";
import { WhyChooseUs } from "@/components/home/WhyChooseUs";
import { SriLankaMap } from "@/components/home/SriLankaMap";
import { ExperienceCategories } from "@/components/home/ExperienceCategories";
import { TravelProcess } from "@/components/home/TravelProcess";
import { Testimonials } from "@/components/home/Testimonials";
import { Gallery } from "@/components/home/Gallery";
import { LatestBlogs } from "@/components/home/LatestBlogs";
import { CTASection } from "@/components/home/CTASection";

export const metadata: Metadata = {
  title: "Tailor-Made Sri Lanka Tours & Travel Packages",
  description:
    "Plan a tailor-made trip to Sri Lanka with local experts — cultural triangle, hill country, wildlife safaris, and southern coast tours with private drivers and 24/7 support.",
  alternates: { canonical: "/" },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "TravelAgency",
  name: "Ceylon IT Tours",
  url: "https://ceylonittours.com",
  description:
    "Locally-run, tailor-made Sri Lanka tours with private drivers and 24/7 support.",
  areaServed: {
    "@type": "Country",
    name: "Sri Lanka",
  },
  address: {
    "@type": "PostalAddress",
    streetAddress: "No. 42, Galle Road",
    addressLocality: "Colombo",
    addressRegion: "Western Province",
    addressCountry: "LK",
  },
  telephone: "+94112345678",
  aggregateRating: {
    "@type": "AggregateRating",
    ratingValue: "4.9",
    reviewCount: "2400",
  },
};

export default function Home() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <LuxuryHero />
       <FeaturedPackages />
      <PopularDestinations />
      <WhyChooseUs />
      <SriLankaMap />
      <ExperienceCategories />
      <TravelProcess />
      <Testimonials />
      <Gallery />
      <LatestBlogs />
      <CTASection />
    </>
  );
}
