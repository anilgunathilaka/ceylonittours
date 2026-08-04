import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/ui/Reveal";
import { Button } from "@/components/ui/Button";
import { getTravelProcess } from "@/lib/content";

export async function TravelProcess() {
  const travelProcess = await getTravelProcess();

  return (
    <section className="bg-primary py-20 text-white lg:py-28">
      <Container>
        <SectionHeading
          eyebrow="How It Works"
          title="From First Message to Landing in Colombo"
          className="[&_h2]:text-white [&_p]:text-white/70"
        />

        <div className="mt-16 grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
          {travelProcess.map((item, i) => (
            <Reveal key={item.step} delay={i * 0.1}>
              <div className="relative flex flex-col gap-4">
                <span className="font-display text-5xl font-semibold text-white/20">{item.step}</span>
                <h3 className="text-lg font-semibold text-white">{item.title}</h3>
                <p className="text-sm text-white/70">{item.description}</p>
                {i < travelProcess.length - 1 && (
                  <span className="absolute top-6 -right-3 hidden h-px w-6 bg-white/20 lg:block" aria-hidden />
                )}
              </div>
            </Reveal>
          ))}
        </div>

        <div className="mt-14 flex justify-center">
          <Button href="/custom-tour-builder" variant="accent" size="lg">
            Start Your Custom Itinerary
          </Button>
        </div>
      </Container>
    </section>
  );
}
