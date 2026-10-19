import { CalendarCheck, Map as MapIcon, MessageCircle, PlaneLanding, type LucideIcon } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { sectionTitleClass } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/ui/Reveal";
import { Button } from "@/components/ui/Button";
import { getTravelProcess } from "@/lib/content";
import { cn } from "@/lib/utils";

// One icon per step, in order
const stepIcons: LucideIcon[] = [MessageCircle, MapIcon, CalendarCheck, PlaneLanding];

// Scalloped badge outline: a circle with 12 soft bumps, in a 42×42 box
const BADGE_PATH = (() => {
  const points: string[] = [];
  for (let i = 0; i <= 120; i++) {
    const t = (i / 120) * Math.PI * 2;
    const r = 19.5 + 1.5 * Math.cos(12 * t);
    points.push(`${(21 + r * Math.cos(t)).toFixed(2)},${(21 + r * Math.sin(t)).toFixed(2)}`);
  }
  return `M${points.join("L")}Z`;
})();

function StepBadge({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <span className="relative mb-6 flex h-[42px] w-[42px] items-center justify-center text-midnight">
      <svg viewBox="0 0 42 42" className="absolute inset-0 h-full w-full text-accent" aria-hidden>
        <path d={BADGE_PATH} fill="currentColor" />
      </svg>
      <Icon size={18} strokeWidth={2} className="relative" aria-hidden />
    </span>
  );
}

export async function TravelProcess() {
  const travelProcess = await getTravelProcess();

  return (
    <section className="bg-surface py-12 lg:py-20">
      <Container>
        <div className="relative overflow-hidden rounded-[10px] bg-primary py-[100px] text-white">
          {/* Oversized logo mark as a faint background pattern */}
          <div
            aria-hidden
            className="pointer-events-none absolute top-0 left-0 aspect-[347/470] h-[110%] bg-white opacity-[0.07] max-sm:h-[70%]"
            style={{
              maskImage: "url(/images/logo-mark.png)",
              maskSize: "contain",
              maskRepeat: "no-repeat",
              WebkitMaskImage: "url(/images/logo-mark.png)",
              WebkitMaskSize: "contain",
              WebkitMaskRepeat: "no-repeat",
            }}
          />

          <div className="relative px-5 md:px-10">
            <div className="grid grid-cols-1 gap-14 lg:grid-cols-12 lg:gap-6">
              <Reveal className="lg:col-span-5 xl:col-span-4">
                <h2 className={cn(sectionTitleClass, "text-white")}>From First Message to Landing in Colombo</h2>
                <div className="mt-8">
                  <Button href="/custom-tour-builder" variant="accent" size="lg">
                    Start Your Custom Itinerary
                  </Button>
                </div>
              </Reveal>

              <div className="grid grid-cols-1 gap-y-10 sm:grid-cols-2 sm:gap-x-6 sm:gap-y-14 lg:col-span-6 lg:col-start-7">
                {travelProcess.map((item, i) => (
                  <Reveal key={item.step} delay={i * 0.08} className="lg:max-w-[434px]">
                    <StepBadge icon={stepIcons[i % stepIcons.length]} />
                    <h3 className="mb-4 font-serif text-[22px] leading-[1.15] font-semibold">{item.title}</h3>
                    <p className="text-base leading-relaxed text-white/75 sm:text-lg">{item.description}</p>
                  </Reveal>
                ))}
              </div>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
