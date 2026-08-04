import { getFeaturedPackages } from "@/lib/content";
import { LuxuryHeroClient } from "@/components/home/LuxuryHeroClient";

export async function LuxuryHero() {
  const packages = await getFeaturedPackages();
  const floatingPackages = [packages[2], packages[3]].filter(Boolean);
  return <LuxuryHeroClient floatingPackages={floatingPackages} />;
}
