import type { Metadata } from "next";
import { PlaceholderPage } from "@/components/ui/PlaceholderPage";

export const metadata: Metadata = {
  title: "Custom Tour Builder",
  description: "Build a fully tailor-made Sri Lanka itinerary around your dates, pace, and interests.",
  alternates: { canonical: "/custom-tour-builder" },
};

export default function CustomTourBuilderPage() {
  return (
    <PlaceholderPage
      title="Custom Tour Builder"
      description="Our step-by-step trip builder is coming soon. In the meantime, our trip designers can put together a tailor-made itinerary by hand — just reach out."
    />
  );
}
