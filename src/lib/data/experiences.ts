import { photo, unsplash } from "@/lib/images";
import type { Experience } from "@/types";

export const experiences: Experience[] = [
  {
    slug: "wildlife-safaris",
    name: "Wildlife Safaris",
    category: "Wildlife",
    description: "Leopards, elephants, and sloth bears across Sri Lanka's national parks.",
    image: {
      url: unsplash(photo.yalaElephant, 800, 900),
      alt: "Elephant during a wildlife safari",
      width: 800,
      height: 900,
    },
    tourCount: 22,
  },
  {
    slug: "hill-country-tea",
    name: "Hill Country & Tea",
    category: "Hill Country",
    description: "Misty highland estates, scenic rail, and the world's finest Ceylon tea.",
    image: {
      url: unsplash(photo.nuwaraEliyaTea, 800, 900),
      alt: "Tea plantation rows in the hill country",
      width: 800,
      height: 900,
    },
    tourCount: 19,
  },
  {
    slug: "cultural-triangle",
    name: "Cultural Triangle",
    category: "Culture",
    description: "Ancient citadels, sacred temples, and 2,000 years of living heritage.",
    image: {
      url: unsplash(photo.kandyTemple, 800, 900),
      alt: "Ornate temple architecture in the cultural triangle",
      width: 800,
      height: 900,
    },
    tourCount: 27,
  },
  {
    slug: "beaches-surfing",
    name: "Beaches & Surfing",
    category: "Beaches",
    description: "Palm-fringed coastlines, whale watching, and world-class surf breaks.",
    image: {
      url: unsplash(photo.mirissaBeach, 800, 900),
      alt: "Boat on turquoise water off a Sri Lankan beach",
      width: 800,
      height: 900,
    },
    tourCount: 24,
  },
  {
    slug: "adventure-hiking",
    name: "Adventure & Hiking",
    category: "Adventure",
    description: "Sunrise summit hikes, white-water rafting, and jungle trekking.",
    image: {
      url: unsplash(photo.surfBeach, 800, 900),
      alt: "Adventure sport along the Sri Lankan coast",
      width: 800,
      height: 900,
    },
    tourCount: 15,
  },
  {
    slug: "ayurveda-wellness",
    name: "Ayurveda & Wellness",
    category: "Wellness",
    description: "Traditional healing, sunrise yoga, and beachfront restoration retreats.",
    image: {
      url: unsplash(photo.templeMountain, 800, 900),
      alt: "Misty mountain retreat setting for wellness",
      width: 800,
      height: 900,
    },
    tourCount: 11,
  },
];
