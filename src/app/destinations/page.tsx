import type { Metadata } from "next";
import { PlaceholderPage } from "@/components/ui/PlaceholderPage";

export const metadata: Metadata = {
  title: "Destinations",
  description: "Explore Sri Lanka's top destinations, from ancient citadels to palm-fringed coasts.",
  alternates: { canonical: "/destinations" },
};

export default function DestinationsPage() {
  return (
    <PlaceholderPage
      title="Destinations"
      description="A full, filterable guide to every region of Sri Lanka is on its way — for now, explore our popular destinations on the homepage or talk to a trip expert."
    />
  );
}
