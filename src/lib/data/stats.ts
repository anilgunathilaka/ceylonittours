import type { Stat } from "@/types";

export const stats: Stat[] = [
  { label: "Years of Local Expertise", value: 15, suffix: "+" },
  { label: "Happy Travellers", value: 24000, suffix: "+" },
  { label: "Curated Tour Packages", value: 120, suffix: "+" },
  { label: "Average Traveller Rating", value: 4.9, suffix: "/5" },
];

export const whyChooseUs = [
  {
    title: "Local Knowledge That Matters",
    description:
      "Get practical recommendations and discover places worth visiting, shaped by local knowledge and your travel interests.",
    icon: "MapPinned",
  },
  {
    title: "Comfortable Private Travel",
    description:
      "Enjoy a private journey with a vehicle suited to your group and itinerary, subject to availability and booking confirmation.",
    icon: "Car",
  },
  {
    title: "Journeys Made for You",
    description: "Adapt your itinerary to your interests, preferred pace, travel dates, and budget.",
    icon: "Route",
  },
  {
    title: "Support Along the Way",
    description:
      "Get clear communication and assistance from your travel coordinator according to your confirmed service arrangements.",
    icon: "Headset",
  },
];

export const travelProcess = [
  {
    step: "01",
    title: "Tell Us Your Dream",
    description: "Share your travel style, interests, and dates through a short trip form.",
  },
  {
    step: "02",
    title: "We Craft Your Itinerary",
    description: "A local expert designs a day-by-day plan tailored entirely around you.",
  },
  {
    step: "03",
    title: "Confirm & Book",
    description: "Review, tweak, and lock in your trip with a secure, no-surprise quote.",
  },
  {
    step: "04",
    title: "Travel With Local Experts",
    description: "Land and go — your driver, guides, and support team are ready from day one.",
  },
];
