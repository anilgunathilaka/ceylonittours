import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/ui/Reveal";
import { getExperiences } from "@/lib/content";

export async function ExperienceCategories() {
  const experiences = await getExperiences();

  return (
    <section className="bg-ivory py-20 lg:py-28">
      <Container>
        <SectionHeading
          eyebrow="Experiences"
          title="Choose Your Kind of Sri Lanka"
        />

        <div className="mt-12 grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-3">
          {experiences.map((exp, i) => (
            <Reveal key={exp.slug} delay={(i % 3) * 0.08}>
              <Link
                href="/experiences"
                className="group relative flex h-64 flex-col justify-end overflow-hidden rounded-2xl shadow-card transition-shadow duration-300 hover:shadow-card-hover sm:h-80"
              >
                <Image
                  src={exp.image.url}
                  alt={exp.image.alt}
                  fill
                  sizes="(min-width: 1024px) 33vw, 50vw"
                  className="object-cover transition-transform duration-500 ease-out-luxury group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-midnight/85 via-midnight/10 to-transparent" />
                <div className="relative flex items-end justify-between gap-2 p-5">
                  <div className="flex flex-col gap-1">
                    <h3 className="font-display text-lg font-semibold text-white sm:text-xl">{exp.name}</h3>
                    <span className="text-xs text-white/70 sm:text-sm">{exp.tourCount} tours</span>
                  </div>
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-sm transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
                    <ArrowUpRight size={16} />
                  </span>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
