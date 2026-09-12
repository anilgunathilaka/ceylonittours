import type { Metadata } from "next";
import { Suspense } from "react";
import { Container } from "@/components/ui/Container";
import { AvailabilityCalendar } from "@/components/tour-packages/AvailabilityCalendar";

export const metadata: Metadata = {
  title: "Check Availability",
  description: "See available and unavailable dates for your chosen Sri Lanka destination.",
  alternates: { canonical: "/tour-packages/availability" },
};

export default function AvailabilityPage() {
  return (
    <section className="bg-ivory py-16 lg:py-24">
      <Container>
        <Suspense fallback={null}>
          <AvailabilityCalendar />
        </Suspense>
      </Container>
    </section>
  );
}
