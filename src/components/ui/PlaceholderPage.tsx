import { Compass } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";

export function PlaceholderPage({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <section className="flex min-h-[70vh] items-center bg-ivory py-24">
      <Container className="flex flex-col items-center gap-6 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Compass size={28} />
        </span>
        <h1 className="text-3xl font-semibold text-midnight sm:text-4xl">{title}</h1>
        <p className="max-w-xl text-balance text-base text-slate sm:text-lg">{description}</p>
        <p className="text-sm font-semibold tracking-wide text-secondary uppercase">
          This page is being crafted — check back soon
        </p>
        <Button href="/contact" variant="primary" size="lg">
          Talk to a Trip Expert
        </Button>
      </Container>
    </section>
  );
}
