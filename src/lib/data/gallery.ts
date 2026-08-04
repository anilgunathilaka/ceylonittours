import { photo, unsplash } from "@/lib/images";
import type { GalleryImage } from "@/types";

export const galleryImages: GalleryImage[] = [
  {
    image: {
      url: unsplash(photo.ellaWaterfall, 900, 1100),
      alt: "Waterfall through the forest near Ella",
      width: 900,
      height: 1100,
    },
    location: "Ella",
  },
  {
    image: {
      url: unsplash(photo.galleFort, 900, 700),
      alt: "Ramparts of Galle Fort",
      width: 900,
      height: 700,
    },
    location: "Galle",
  },
  {
    image: {
      url: unsplash(photo.trincomaleeCoast, 900, 1100),
      alt: "Coastline at Trincomalee from above",
      width: 900,
      height: 1100,
    },
    location: "Trincomalee",
  },
  {
    image: {
      url: unsplash(photo.nuwaraEliyaTea, 900, 700),
      alt: "Tea plantation rows in Nuwara Eliya",
      width: 900,
      height: 700,
    },
    location: "Nuwara Eliya",
  },
  {
    image: {
      url: unsplash(photo.yalaElephant, 900, 1100),
      alt: "Elephant at Yala National Park",
      width: 900,
      height: 1100,
    },
    location: "Yala National Park",
  },
  {
    image: {
      url: unsplash(photo.scenicCoastRoad, 900, 700),
      alt: "Palm-lined coastal road",
      width: 900,
      height: 700,
    },
    location: "Southern Coast",
  },
  {
    image: {
      url: unsplash(photo.forestWaterfall, 900, 1100),
      alt: "Forest waterfall in the central highlands",
      width: 900,
      height: 1100,
    },
    location: "Central Highlands",
  },
  {
    image: {
      url: unsplash(photo.marketStreet, 900, 700),
      alt: "Local market street scene",
      width: 900,
      height: 700,
    },
    location: "Colombo",
  },
  {
    image: {
      url: unsplash(photo.mountainLake, 900, 1100),
      alt: "Mountain lake reflection in the hill country",
      width: 900,
      height: 1100,
    },
    location: "Hill Country",
  },
];
