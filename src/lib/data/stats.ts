import type { Stat } from "@/types";

export const stats: Stat[] = [
  { label: "Years of Local Expertise", value: 15, suffix: "+" },
  { label: "Happy Travellers", value: 24000, suffix: "+" },
  { label: "Curated Tour Packages", value: 120, suffix: "+" },
  { label: "Average Traveller Rating", value: 4.9, suffix: "/5" },
];

export const whyChooseUs = [
  {
    title: "Local Sri Lankan Experts",
    description:
      "Every itinerary is built by a team who lives here — real recommendations, not a script.",
    icon: "MapPinned",
  },
  {
    title: "Private Vetted Drivers",
    description:
      "Air-conditioned vehicles and English-speaking chauffeur-guides, never a stranger's shared van.",
    icon: "Car",
  },
  {
    title: "Tailor-Made Itineraries",
    description:
      "No fixed templates — every trip is built around your pace, interests, and budget.",
    icon: "Compass",
  },
  {
    title: "24/7 Support On The Road",
    description:
      "A direct line to your trip coordinator from arrival to departure, every day of your journey.",
    icon: "Headset",
  },
  {
    title: "Best Price Guarantee",
    description:
      "Direct relationships with hotels and guides mean no middleman markup on your trip.",
    icon: "BadgeCheck",
  },
  {
    title: "Sustainable Tourism",
    description:
      "Partnering with community-run lodges and conservation projects across the island.",
    icon: "Leaf",
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
