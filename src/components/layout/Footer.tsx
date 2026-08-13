import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { Logo } from "@/components/layout/Logo";
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

export async function Footer() {
  const destinations = await getDestinations();

  return (
    <footer className="bg-midnight text-white/80">
      <Container className="grid grid-cols-1 gap-12 py-16 sm:grid-cols-2 lg:grid-cols-4 lg:py-20">
        <div className="flex flex-col gap-5 sm:col-span-2 lg:col-span-1">
          <Logo inverted />
          <p className="max-w-xs text-sm leading-relaxed text-white/60">
            Locally-run, tailor-made journeys across Sri Lanka — private drivers, hand-picked
            stays, and a team on the ground for every mile of your trip.
          </p>
          <div className="flex items-center gap-3">
            {socialLinks.map(({ label, href, icon: Icon }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-secondary"
              >
                <Icon className="h-4 w-4" />
              </a>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <h3 className="text-sm font-semibold tracking-wide text-white uppercase">Quick Links</h3>
          <ul className="flex flex-col gap-3">
            {quickLinks.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="text-sm text-white/60 transition-colors hover:text-white">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col gap-4">
          <h3 className="text-sm font-semibold tracking-wide text-white uppercase">Top Destinations</h3>
          <ul className="flex flex-col gap-3">
            {destinations.slice(0, 6).map((d) => (
              <li key={d.slug}>
                <Link
                  href="/destinations"
                  className="text-sm text-white/60 transition-colors hover:text-white"
                >
                  {d.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col gap-5">
          <h3 className="text-sm font-semibold tracking-wide text-white uppercase">Stay Updated</h3>
          <p className="text-sm text-white/60">Trip ideas and seasonal offers, once or twice a month.</p>
          <NewsletterForm />

          <div className="flex flex-col gap-3 pt-2">
            <a href="tel:+94112345678" className="flex items-center gap-2.5 text-sm text-white/70 hover:text-white">
              <Phone size={16} className="text-secondary" />
              +94 11 234 5678
            </a>
            <a href="mailto:hello@ceylonittours.com" className="flex items-center gap-2.5 text-sm text-white/70 hover:text-white">
              <Mail size={16} className="text-secondary" />
              hello@ceylonittours.com
            </a>
            <span className="flex items-start gap-2.5 text-sm text-white/70">
              <MapPin size={16} className="mt-0.5 shrink-0 text-secondary" />
              No. 42, Galle Road, Colombo 03, Sri Lanka
            </span>
          </div>
        </div>
      </Container>

      <div className="border-t border-white/10">
        <Container className="flex flex-col items-center justify-center gap-3 py-6 text-center text-xs text-white/50 sm:flex-row">
          <span>© {new Date().getFullYear()} Ceylon IT Tours. All rights reserved.</span>
        </Container>
      </div>
    </footer>
  );
}
