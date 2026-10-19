import { PhoneCall } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { sectionTitleClass } from "@/components/ui/SectionHeading";
import { cn } from "@/lib/utils";

export function CTASection() {
  return (
    // Full-width band in the footer colour, directly above the footer, so the two read as one block
    <section className="bg-logo pt-20 pb-8 text-center text-white sm:pt-24 lg:pt-32 lg:pb-12">
      <Container className="flex flex-col items-center">
        <h2 className={cn(sectionTitleClass, "max-w-3xl")}>Ready to Explore the Real Sri Lanka?</h2>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Button href="/custom-tour-builder" variant="accent" size="lg">
            Plan My Custom Trip
          </Button>
          <Button href="tel:+94112345678" variant="outline" size="lg" icon={<PhoneCall size={18} />} iconPosition="left">
            +94 11 234 5678
          </Button>
        </div>
      </Container>
    </section>
  );
}
