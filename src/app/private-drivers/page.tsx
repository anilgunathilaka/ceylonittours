import type { Metadata } from "next";
import { PlaceholderPage } from "@/components/ui/PlaceholderPage";

export const metadata: Metadata = {
  title: "Private Drivers",
  description: "Vetted, English-speaking private chauffeur-guides for your entire Sri Lanka trip.",
  alternates: { canonical: "/private-drivers" },
};

export default function PrivateDriversPage() {
  return (
    <PlaceholderPage
      title="Private Drivers"
      description="A dedicated page for booking your private chauffeur-guide is on its way. Every tour package already includes one — ask us for details."
    />
  );
}
