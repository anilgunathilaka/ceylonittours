import { WhyChooseUsClient } from "@/components/home/WhyChooseUsClient";
import { getWhyChooseUs } from "@/lib/content";

export async function WhyChooseUs() {
  const whyChooseUs = await getWhyChooseUs();

  return (
    <WhyChooseUsClient
      marquee="The Difference Is in the Journey"
      title="Local Knowledge. Personal Service. Memorable Journeys."
      description="Discover Sri Lanka with a travel team that understands the island and helps make every part of your journey easier."
      cards={whyChooseUs.map((item) => ({
        title: item.title,
        description: item.description,
        icon: item.icon,
      }))}
    />
  );
}
