import type { Metadata } from "next";
import { Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ContactForm } from "@/components/contact/ContactForm";

export const metadata: Metadata = {
  title: "Contact Us",
  description: "Get in touch with Ceylon IT Tours to start planning your tailor-made Sri Lanka trip.",
  alternates: { canonical: "/contact" },
};

const contactMethods = [
  {
    icon: Phone,
    label: "Call or WhatsApp",
    value: "+94 11 234 5678",
    href: "tel:+94112345678",
  },
  {
    icon: Mail,
    label: "Email",
    value: "hello@ceylonittours.com",
    href: "mailto:hello@ceylonittours.com",
  },
  {
    icon: MapPin,
    label: "Office",
    value: "No. 42, Galle Road, Colombo 03, Sri Lanka",
    href: undefined,
  },
];

export default function ContactPage() {
  return (
    <>
      <section className="bg-primary py-20 text-white lg:py-24">
        <Container className="flex flex-col items-center gap-4 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/10">
            <MessageCircle size={26} />
          </span>
          <h1 className="text-balance max-w-2xl font-display text-4xl font-semibold sm:text-5xl">
            Let&apos;s Plan Your Sri Lanka Trip
          </h1>
          <p className="max-w-xl text-balance text-white/75">
            Share a few details and a local trip designer will reply within one business day with
            ideas and a tailored quote.
          </p>
        </Container>
      </section>

      <section className="bg-ivory py-20 lg:py-28">
        <Container className="grid grid-cols-1 gap-12 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="flex flex-col gap-8">
            <SectionHeading eyebrow="Get In Touch" title="We Reply Within One Business Day" align="left" />
            <div className="flex flex-col gap-4">
              {contactMethods.map(({ icon: Icon, label, value, href }) => {
                const content = (
                  <div className="flex items-center gap-4 rounded-2xl bg-surface p-5 ring-1 ring-border transition-colors hover:ring-primary/30">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Icon size={20} />
                    </span>
                    <div className="flex flex-col">
                      <span className="text-xs font-medium tracking-wide text-slate uppercase">{label}</span>
                      <span className="font-medium text-midnight">{value}</span>
                    </div>
                  </div>
                );
                return href ? (
                  <a key={label} href={href}>
                    {content}
                  </a>
                ) : (
                  <div key={label}>{content}</div>
                );
              })}
            </div>
          </div>

          <div className="rounded-3xl bg-surface p-6 shadow-card ring-1 ring-border sm:p-10">
            <ContactForm />
          </div>
        </Container>
      </section>
    </>
  );
}
