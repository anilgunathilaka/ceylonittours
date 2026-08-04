import Image from "next/image";
import { BadgeCheck, Car, Compass, Headset, Leaf, MapPinned } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/ui/Reveal";
import { Counter } from "@/components/ui/Counter";
import { getStats, getWhyChooseUs } from "@/lib/content";
import { photo, unsplash } from "@/lib/images";

const iconMap = {
  MapPinned,
  Car,
  Compass,
  Headset,
  BadgeCheck,
  Leaf,
} as const;

export async function WhyChooseUs() {
  const [whyChooseUs, stats] = await Promise.all([getWhyChooseUs(), getStats()]);

  return (
    <section className="bg-ivory py-20 lg:py-28">
      <Container>
        <SectionHeading
          eyebrow="Why Ceylon IT Tours"
          title="Local Expertise, Designed Entirely Around You"
        />

        <div className="mt-14 grid grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <Reveal>
            <div className="relative">
              <div className="relative h-[420px] w-full overflow-hidden rounded-3xl shadow-elevated sm:h-[520px]">
                <Image
                  src={unsplash(photo.templeMountain, 1000, 1300)}
                  alt="Local guide leading travellers through Sri Lanka's hill country"
                  fill
                  sizes="(min-width: 1024px) 45vw, 90vw"
                  className="object-cover"
                />
              </div>
              <div className="absolute -bottom-8 -right-4 flex w-48 flex-col gap-1 rounded-2xl bg-white p-5 shadow-elevated sm:-right-8 sm:w-56">
                <span className="font-display text-3xl font-semibold text-primary">
                  <Counter value={15} suffix="+" />
                </span>
                <span className="text-sm font-medium text-slate">Years guiding travellers across Sri Lanka</span>
              </div>
            </div>
          </Reveal>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {whyChooseUs.map((item, i) => {
              const Icon = iconMap[item.icon as keyof typeof iconMap];
              return (
                <Reveal key={item.title} delay={(i % 2) * 0.08}>
                  <div className="flex flex-col gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Icon size={20} />
                    </span>
                    <h3 className="font-semibold text-midnight">{item.title}</h3>
                    <p className="text-sm text-slate">{item.description}</p>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>

        <div className="mt-20 grid grid-cols-2 gap-8 border-t border-border pt-14 sm:grid-cols-4">
          {stats.map((stat) => (
            <Reveal key={stat.label} className="flex flex-col items-center gap-2 text-center">
              <span className="font-display text-4xl font-semibold text-primary sm:text-5xl">
                <Counter value={stat.value} suffix={stat.suffix} />
              </span>
              <span className="text-sm text-slate">{stat.label}</span>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
