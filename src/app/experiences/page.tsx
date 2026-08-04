import type { Metadata } from "next";
import { PlaceholderPage } from "@/components/ui/PlaceholderPage";

export const metadata: Metadata = {
  title: "Experiences",
  description: "Wildlife safaris, hill country tea trails, culture, beaches, adventure, and wellness experiences in Sri Lanka.",
  alternates: { canonical: "/experiences" },
};

export default function ExperiencesPage() {
  return (
    <PlaceholderPage
      title="Experiences"
      description="A dedicated hub for every experience category is coming soon — browse experience highlights on the homepage for now."
    />
  );
}
