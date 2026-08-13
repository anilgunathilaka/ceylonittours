export const navLinks = [
  { label: "Home", short: "Home", href: "/" },
  { label: "Destinations", short: "Destinations", href: "/destinations" },
  { label: "Tour Packages", short: "Packages", href: "/tour-packages" },
  { label: "Custom Tour Builder", short: "Tour Builder", href: "/custom-tour-builder" },
  { label: "Airport Transfers", short: "Transfers", href: "/airport-transfers" },
  { label: "Private Drivers", short: "Drivers", href: "/private-drivers" },
  { label: "Experiences", short: "Experiences", href: "/experiences" },
  { label: "Blog", short: "Blog", href: "/blog" },
  { label: "About", short: "About", href: "/about" },
  { label: "Contact", short: "Contact", href: "/contact" },
] as const;

/** Temporarily hidden from main/mobile nav — remove entries to restore */
const HIDDEN_NAV_HREFS = new Set([
  "/custom-tour-builder",
  "/airport-transfers",
  "/private-drivers",
  "/experiences",
]);

export const visibleNavLinks = navLinks.filter((link) => !HIDDEN_NAV_HREFS.has(link.href));

export const primaryNavLinks = visibleNavLinks.filter(
  (link) => link.href !== "/" && link.href !== "/contact",
);
