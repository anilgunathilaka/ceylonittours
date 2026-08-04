import { photo, unsplash } from "@/lib/images";
import type { Destination } from "@/types";

export const destinations: Destination[] = [
  {
    slug: "sigiriya",
    name: "Sigiriya",
    region: "Central Province",
    tagline: "The Ancient Rock Fortress",
    description:
      "Climb the fifth-century citadel that rises 200 metres above the jungle canopy, crowned with frescoes and a lion's-paw gateway.",
    image: {
      url: unsplash(photo.sigiriya, 1200, 1400),
      alt: "Golden hour light over Sigiriya's surrounding hills",
      width: 1200,
      height: 1400,
    },
    tourCount: 18,
    startingPrice: 149,
    featured: true,
    mapPosition: { x: 54, y: 38 },
  },
  {
    slug: "kandy",
    name: "Kandy",
    region: "Central Province",
    tagline: "Sacred Hill Capital",
    description:
      "Home to the Temple of the Sacred Tooth Relic, a lakeside promenade, and the gateway to Sri Lanka's misty tea country.",
    image: {
      url: unsplash(photo.kandyTemple, 1200, 1400),
      alt: "Ornate golden temple architecture in Kandy",
      width: 1200,
      height: 1400,
    },
    tourCount: 24,
    startingPrice: 129,
    featured: true,
    mapPosition: { x: 50, y: 46 },
  },
  {
    slug: "ella",
    name: "Ella",
    region: "Uva Province",
    tagline: "Cloud-Forest Escarpment",
    description:
      "A hill-country village of tea terraces, the Nine Arch Bridge, and waterfalls tumbling through emerald ravines.",
    image: {
      url: unsplash(photo.ellaWaterfall, 1200, 1400),
      alt: "Waterfall cascading through forest near Ella",
      width: 1200,
      height: 1400,
    },
    tourCount: 21,
    startingPrice: 139,
    featured: true,
    mapPosition: { x: 58, y: 60 },
  },
  {
    slug: "galle",
    name: "Galle",
    region: "Southern Province",
    tagline: "Colonial Coastal Fort",
    description:
      "Wander the ramparts of a 16th-century Dutch fort, its cobbled lanes lined with boutique cafés and ocean views.",
    image: {
      url: unsplash(photo.galleFort, 1200, 1400),
      alt: "Colonial ramparts of Galle Fort by the sea",
      width: 1200,
      height: 1400,
    },
    tourCount: 16,
    startingPrice: 109,
    featured: true,
    mapPosition: { x: 40, y: 82 },
  },
  {
    slug: "yala",
    name: "Yala National Park",
    region: "Southern Province",
    tagline: "Leopard & Elephant Country",
    description:
      "Sri Lanka's premier safari destination — home to the world's highest density of leopards and free-roaming elephant herds.",
    image: {
      url: unsplash(photo.yalaElephant, 1200, 1400),
      alt: "Elephant on safari at Yala National Park",
      width: 1200,
      height: 1400,
    },
    tourCount: 14,
    startingPrice: 99,
    featured: true,
    mapPosition: { x: 62, y: 78 },
  },
  {
    slug: "mirissa",
    name: "Mirissa",
    region: "Southern Province",
    tagline: "Whales, Waves & Palms",
    description:
      "A crescent of golden sand famous for blue-whale watching, surf breaks, and the palm-fringed Coconut Tree Hill.",
    image: {
      url: unsplash(photo.mirissaBeach, 1200, 1400),
      alt: "Turquoise water and boat off Mirissa beach",
      width: 1200,
      height: 1400,
    },
    tourCount: 19,
    startingPrice: 119,
    featured: true,
    mapPosition: { x: 42, y: 86 },
  },
  {
    slug: "nuwara-eliya",
    name: "Nuwara Eliya",
    region: "Central Province",
    tagline: "Little England in the Clouds",
    description:
      "Rolling emerald tea estates at 1,868 metres, colonial bungalows, and crisp mountain air year-round.",
    image: {
      url: unsplash(photo.nuwaraEliyaTea, 1200, 1400),
      alt: "Rows of tea plantations in Nuwara Eliya",
      width: 1200,
      height: 1400,
    },
    tourCount: 17,
    startingPrice: 129,
    featured: false,
    mapPosition: { x: 53, y: 54 },
  },
  {
    slug: "colombo",
    name: "Colombo",
    region: "Western Province",
    tagline: "The Commercial Capital",
    description:
      "A vibrant mix of colonial architecture, rooftop bars, temples, and buzzing street-food markets by the Indian Ocean.",
    image: {
      url: unsplash(photo.colomboSkyline, 1200, 1400),
      alt: "Colombo city skyline at dusk",
      width: 1200,
      height: 1400,
    },
    tourCount: 12,
    startingPrice: 79,
    featured: false,
    mapPosition: { x: 32, y: 60 },
  },
  {
    slug: "trincomalee",
    name: "Trincomalee",
    region: "Eastern Province",
    tagline: "Untouched East Coast",
    description:
      "Pristine bays, world-class diving, and Pigeon Island's coral reefs on Sri Lanka's quieter eastern shoreline.",
    image: {
      url: unsplash(photo.trincomaleeCoast, 1200, 1400),
      alt: "Aerial view of the tropical coastline at Trincomalee",
      width: 1200,
      height: 1400,
    },
    tourCount: 10,
    startingPrice: 109,
    featured: false,
    mapPosition: { x: 68, y: 34 },
  },
  {
    slug: "anuradhapura",
    name: "Anuradhapura",
    region: "North Central Province",
    tagline: "The Ancient Sacred City",
    description:
      "A UNESCO World Heritage capital of soaring dagobas, sacred bodhi trees, and ruins dating back two millennia.",
    image: {
      url: unsplash(photo.anuradhapuraCountryside, 1200, 1400),
      alt: "Ancient countryside surrounding Anuradhapura",
      width: 1200,
      height: 1400,
    },
    tourCount: 11,
    startingPrice: 119,
    featured: false,
    mapPosition: { x: 48, y: 20 },
  },
];

export function getDestinationBySlug(slug: string) {
  return destinations.find((d) => d.slug === slug);
}
