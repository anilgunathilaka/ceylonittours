import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { FooterColumn } from "@/components/layout/FooterColumn";
import { NewsletterForm } from "@/components/layout/NewsletterForm";
import { getDestinations } from "@/lib/content";
import { FacebookIcon, InstagramIcon, XIcon } from "@/components/ui/SocialIcons";

const quickLinks = [
  { label: "About Us", href: "/about" },
  { label: "Tour Packages", href: "/tour-packages" },
  // Temporarily hidden: Custom Tour Builder, Experiences
  // { label: "Custom Tour Builder", href: "/custom-tour-builder" },
  // { label: "Experiences", href: "/experiences" },
  { label: "Blog", href: "/blog" },
  { label: "Contact", href: "/contact" },
];

const socialLinks = [
  { label: "Facebook", href: "https://facebook.com", icon: FacebookIcon },
  { label: "Instagram", href: "https://instagram.com", icon: InstagramIcon },
  { label: "Twitter / X", href: "https://twitter.com", icon: XIcon },
];

// Underline that fades in on hover
const linkClass =
  "underline decoration-transparent underline-offset-2 transition-colors duration-150 hover:decoration-white";

export async function Footer() {
  const destinations = await getDestinations();

  return (
    <footer className="bg-logo text-white">
      <Container className="pt-[7.5rem] pb-10">
          <div className="grid grid-cols-1 gap-14 sm:gap-16 xl:grid-cols-12 xl:gap-6">
            <div className="xl:col-span-3">
              <h2 className="font-serif text-[24px] leading-[1.15] font-semibold sm:text-[34px] xl:text-[38px]">
                Locally-run, tailor-made journeys across Sri Lanka
              </h2>
              <p className="mt-4 text-base text-white/80 sm:mt-7 sm:text-lg">
                Private drivers, hand-picked stays, and a team on the ground for every mile of your trip.
              </p>
              <div className="mt-6 sm:mt-9">
                <Link
                  href="/tour-packages"
                  className="inline-flex items-center justify-center rounded-full bg-white px-6 py-4 text-sm leading-none font-semibold text-logo transition-[translate,box-shadow] duration-150 hover:-translate-y-px hover:shadow-[0_8px_20px_-8px_rgb(0_0_0/0.45)]"
                >
                  View tour packages
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-4 xl:col-span-8 xl:col-start-5">
              <FooterColumn title="Quick Links">
                <ul className="space-y-2 text-sm">
                  {quickLinks.map((link) => (
                    <li key={link.href}>
                      <Link href={link.href} className={linkClass}>
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </FooterColumn>

              <FooterColumn title="Top Destinations">
                <ul className="space-y-2 text-sm">
                  {destinations.slice(0, 6).map((d) => (
                    <li key={d.slug}>
                      <Link href="/destinations" className={linkClass}>
                        {d.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </FooterColumn>

              <FooterColumn title="Contact">
                <ul className="space-y-2 text-sm">
                  <li>
                    <a href="tel:+94112345678" className={`inline-flex items-center gap-2 ${linkClass}`}>
                      <Phone size={14} aria-hidden />
                      +94 11 234 5678
                    </a>
                  </li>
                  <li>
                    <a href="mailto:hello@ceylonittours.com" className={`inline-flex items-center gap-2 ${linkClass}`}>
                      <Mail size={14} aria-hidden />
                      hello@ceylonittours.com
                    </a>
                  </li>
                  <li className="flex items-start gap-2">
                    <MapPin size={14} className="mt-[3px] shrink-0" aria-hidden />
                    No. 42, Galle Road, Colombo 03, Sri Lanka
                  </li>
                </ul>
              </FooterColumn>

              <FooterColumn title="Stay Updated">
                <p className="mb-3 text-sm text-white/80">Trip ideas and seasonal offers, once or twice a month.</p>
                <NewsletterForm />
              </FooterColumn>
            </div>
          </div>

          <div className="grid grid-cols-1 items-center gap-6 pt-[7.5rem] md:grid-cols-12">
            <div className="md:col-span-12 xl:col-span-4">
              <ul className="inline-flex gap-3">
                {socialLinks.map(({ label, href, icon: Icon }) => (
                  <li key={label}>
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={label}
                      className="flex h-9 w-9 items-center justify-center rounded-full ring-1 ring-white/30 transition-colors duration-150 hover:bg-white hover:text-logo"
                    >
                      <Icon className="h-4 w-4" />
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            <div className="md:col-span-9 xl:col-span-6">
              <ul className="inline-flex flex-col flex-wrap gap-2 text-sm text-white/80 sm:flex-row sm:gap-5">
                {quickLinks.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className={linkClass}>
                      {link.label}
                    </Link>
                  </li>
                ))}
                <li>© {new Date().getFullYear()} Ceylon IT Tours. All rights reserved.</li>
              </ul>
            </div>
          </div>

          {/* Full-width wordmark: SVG text stretched edge to edge at any screen width */}
          <svg viewBox="0 0 1000 80" className="mt-10 block h-auto w-full overflow-visible" role="img" aria-label="Ceylon IT Tours">
            <text
              x="0"
              y="76"
              textLength="1000"
              lengthAdjust="spacing"
              fill="currentColor"
              className="font-serif font-semibold"
              style={{ fontSize: 115 }}
            >
              CEYLON IT TOURS
            </text>
          </svg>
      </Container>
    </footer>
  );
}
