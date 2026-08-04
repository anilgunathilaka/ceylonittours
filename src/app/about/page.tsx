import type { Metadata } from "next";
import { PlaceholderPage } from "@/components/ui/PlaceholderPage";

export const metadata: Metadata = {
  title: "About Us",
  description: "Meet Ceylon IT Tours — a locally-run Sri Lanka travel team building tailor-made trips since 2011.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <PlaceholderPage
      title="About Ceylon IT Tours"
      description="Our full story, team, and sustainability commitments page is being written — reach out and we're happy to tell you more directly."
    />
  );
}
