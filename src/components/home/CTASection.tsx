import Image from "next/image";
import { PhoneCall } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { photo, unsplash } from "@/lib/images";

export function CTASection() {
  return (
    <section className="relative overflow-hidden py-24 lg:py-32">
      <div className="absolute inset-0">
        <Image
          src={unsplash(photo.forestWaterfall, 2000, 1200)}
          alt="Waterfall through the forest in Sri Lanka's central highlands"
          fill
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-primary/85" />
      </div>

      <Container className="relative flex flex-col items-center gap-6 text-center text-white">
        <h2 className="text-balance max-w-2xl font-display text-3xl font-bold sm:text-4xl lg:text-5xl">
          Ready to Explore the Real Sri Lanka?
        </h2>
        <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
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
