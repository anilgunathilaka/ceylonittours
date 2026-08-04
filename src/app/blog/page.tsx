import type { Metadata } from "next";
import { PlaceholderPage } from "@/components/ui/PlaceholderPage";

export const metadata: Metadata = {
  title: "Travel Blog",
  description: "Sri Lanka travel guides, packing tips, and food stories from the Ceylon IT Tours team.",
  alternates: { canonical: "/blog" },
};

export default function BlogPage() {
  return (
    <PlaceholderPage
      title="Travel Journal"
      description="Our full blog and travel guide archive is being built out — a preview of recent stories is on the homepage."
    />
  );
}
