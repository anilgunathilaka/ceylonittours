import { blogCover, unsplash } from "@/lib/images";
import type { BlogPost } from "@/types";

export const blogPosts: BlogPost[] = [
  {
    slug: "best-time-to-visit-sri-lanka",
    title: "Best Time to Visit Sri Lanka: A Season-by-Season Guide",
    excerpt:
      "Two monsoons, two coasts — here's how to time your trip so you always land on the sunny side of the island.",
    image: {
      url: unsplash(blogCover.mapCompass, 900, 700),
      alt: "Map and compass flat lay for trip planning",
      width: 900,
      height: 700,
    },
    category: "Trip Planning",
    readTimeMinutes: 7,
    publishedAt: "2026-06-02",
  },
  {
    slug: "ultimate-packing-list-sri-lanka",
    title: "The Ultimate Packing List for Sri Lanka",
    excerpt:
      "From hill-country layers to reef-safe sunscreen — everything you actually need, and what to leave at home.",
    image: {
      url: unsplash(blogCover.packingSuitcase, 900, 700),
      alt: "Packed suitcase ready for travel",
      width: 900,
      height: 700,
    },
    category: "Travel Tips",
    readTimeMinutes: 5,
    publishedAt: "2026-05-18",
  },
  {
    slug: "sri-lankan-dishes-you-must-try",
    title: "10 Must-Try Sri Lankan Dishes You Can't Miss",
    excerpt:
      "From hoppers at dawn to fiery black-curry crab — a local's guide to eating your way across the island.",
    image: {
      url: unsplash(blogCover.sriLankanFood, 900, 700),
      alt: "Traditional dishes served on a table",
      width: 900,
      height: 700,
    },
    category: "Food & Culture",
    readTimeMinutes: 6,
    publishedAt: "2026-04-27",
  },
];
