export interface SanityImage {
  url: string;
  alt: string;
  width: number;
  height: number;
}

export interface Destination {
  slug: string;
  name: string;
  region: string;
  tagline: string;
  description: string;
  image: SanityImage;
  tourCount: number;
  startingPrice: number;
  featured: boolean;
  mapPosition: { x: number; y: number };
}

export type TourCategory =
  | "Wildlife"
  | "Hill Country"
  | "Culture"
  | "Beaches"
  | "Adventure"
  | "Wellness"
  | "Transfers"
  | "Day Trips"
  | "Multi-Day Tours"
  | "City Tours"
  | "Watersports";

export interface TourPackage {
  slug: string;
  title: string;
  /** GetYourGuide-style tag shown on the card, e.g. "Transfer tour", "Day trip" */
  tourType?: string;
  /** Free-text starting location, e.g. "Kandy", "From Kandy" */
  location?: string;
  destinationSlugs: string[];
  category: TourCategory;
  image: SanityImage;
  durationDays?: number;
  durationNights?: number;
  /** Human duration label for hour-based or range-based tours, e.g. "7.5–8 hours" */
  durationLabel?: string;
  price: number;
  originalPrice?: number;
  rating?: number;
  reviewCount?: number;
  groupSize: string;
  badge?: "Best Seller" | "Luxury" | "New" | "Family Friendly" | "Top Pick" | "Top Rated" | "New Activity";
  summary: string;

  // --- Optional detail-page content (populated per package as sourced) ---
  provider?: string;
  description?: string;
  languages?: string[];
  freeCancellation?: boolean;
  payLater?: boolean;
  highlights?: string[];
  routeSummary?: string;
  itinerary?: {
    title: string;
    /** "pickup" | "transport" | "stop" | "end"; older entries without a type are stops */
    type?: "pickup" | "transport" | "stop" | "end";
    /** e.g. "Guided tour", "Sightseeing" */
    detail?: string;
    /** e.g. "1 hour", "40 minutes" */
    duration?: string;
    admission?: "included" | "free" | "extra_fee" | "optional";
    note?: string;
    lat?: number;
    lng?: number;
  }[];
  includes?: string[];
  excludes?: string[];
  notSuitableFor?: string[];
  whatToBring?: string[];
  notAllowed?: string[];
  knowBeforeYouGo?: string[];
  reviewBreakdown?: { label: string; value: number }[];
  aiReviewSummary?: string;
  reviewHighlights?: {
    name: string;
    country: string;
    date: string;
    rating: number;
    text: string;
  }[];

  // --- Booking platform (admin-managed packages only) ---
  /** Short public "Product ID" */
  productNumber?: number;
  /** Extra photos for the gallery, after the main image */
  gallery?: SanityImage[];
  meetingPoint?: {
    type: "meeting_point" | "pickup" | "both";
    name?: string;
    address?: string;
    lat?: number;
    lng?: number;
    instructions?: string;
    pickupAreas?: string[];
  };
  cancellationPolicy?: CancellationPolicy;
  cancellationNotes?: string;
  /** Asked at checkout */
  bookingQuestions?: { question: string; required?: boolean }[];
  keywords?: string[];
  foodIncluded?: "none" | "included" | "some" | "for_purchase";
  foodDetails?: string[];
  transportTypes?: string[];
  guideType?: "live_guide" | "driver_guide" | "no_guide" | "ticket_only" | "audio_guide";
  petFriendly?: boolean;
  petPolicy?: string;
  guideCertifications?: string[];
}

export type CancellationPolicy = "free_24h" | "free_48h" | "free_7d" | "non_refundable" | "custom";

export interface Experience {
  slug: string;
  name: string;
  category: TourCategory;
  description: string;
  image: SanityImage;
  tourCount: number;
}

export interface Testimonial {
  id: string;
  name: string;
  country: string;
  countryFlag: string;
  avatar: SanityImage;
  quote: string;
  rating: number;
  tripName: string;
}

export interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  image: SanityImage;
  category: string;
  readTimeMinutes: number;
  publishedAt: string;
}

export interface Stat {
  label: string;
  value: number;
  suffix?: string;
}

export interface GalleryImage {
  image: SanityImage;
  location: string;
}
