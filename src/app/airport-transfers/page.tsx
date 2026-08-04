import type { Metadata } from "next";
import { PlaceholderPage } from "@/components/ui/PlaceholderPage";

export const metadata: Metadata = {
  title: "Airport Transfers",
  description: "Private, air-conditioned airport transfers across Sri Lanka with English-speaking drivers.",
  alternates: { canonical: "/airport-transfers" },
};

export default function AirportTransfersPage() {
  return (
    <PlaceholderPage
      title="Airport Transfers"
      description="Online booking for private airport transfers is launching soon. Need a pickup arranged now? Get in touch and we'll organise it directly."
    />
  );
}
