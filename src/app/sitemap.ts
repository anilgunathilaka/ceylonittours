import type { MetadataRoute } from "next";
import { navLinks } from "@/lib/nav";

const siteUrl = "https://ceylonittours.com";

export default function sitemap(): MetadataRoute.Sitemap {
  return navLinks.map((link) => ({
    url: `${siteUrl}${link.href}`,
    lastModified: new Date(),
    changeFrequency: link.href === "/" ? "weekly" : "monthly",
    priority: link.href === "/" ? 1 : 0.7,
  }));
}
