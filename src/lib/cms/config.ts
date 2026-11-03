/**
 * Content types managed in /admin/content. Shared by the admin forms (client) and the
 * server-side validation, so it must not import anything server-only.
 */

export const CONTENT_TYPES = ["tour-packages", "destinations", "experiences", "testimonials", "blog-posts"] as const;
export type ContentType = (typeof CONTENT_TYPES)[number];

export const isContentType = (value: unknown): value is ContentType =>
  CONTENT_TYPES.includes(value as ContentType);

/** Tour packages are managed in Admin → Products (with their options); the rest in Admin → Content */
export const CONTENT_SECTION_TYPES = CONTENT_TYPES.filter((type) => type !== "tour-packages");

/** Where an admin goes back to after saving or deleting an item of this type */
export const contentListHref = (type: ContentType) => (type === "tour-packages" ? "/admin/products" : `/admin/content/${type}`);

export const TOUR_CATEGORIES = [
  "Wildlife",
  "Hill Country",
  "Culture",
  "Beaches",
  "Adventure",
  "Wellness",
  "Transfers",
  "Day Trips",
  "Multi-Day Tours",
  "City Tours",
  "Watersports",
] as const;

export const MEETING_TYPES = ["meeting_point", "pickup", "both"] as const;
export const MEETING_TYPE_LABELS: Record<(typeof MEETING_TYPES)[number], string> = {
  meeting_point: "Customers go to a meeting point",
  pickup: "We pick customers up",
  both: "Meeting point or pickup",
};

export const CANCELLATION_POLICIES = ["free_24h", "free_48h", "free_7d", "non_refundable", "custom"] as const;
export const CANCELLATION_POLICY_LABELS: Record<(typeof CANCELLATION_POLICIES)[number], string> = {
  free_24h: "Free cancellation up to 24 hours before",
  free_48h: "Free cancellation up to 48 hours before",
  free_7d: "Free cancellation up to 7 days before",
  non_refundable: "Non-refundable",
  custom: "Custom (describe below)",
};

export const FOOD_OPTIONS = ["none", "included", "some", "for_purchase"] as const;
export const FOOD_LABELS: Record<(typeof FOOD_OPTIONS)[number], string> = {
  none: "No food included",
  included: "Meals included",
  some: "Some food or drinks included",
  for_purchase: "Food available to buy",
};
export const GUIDE_TYPES = ["live_guide", "driver_guide", "no_guide", "ticket_only", "audio_guide"] as const;
export const GUIDE_TYPE_LABELS: Record<(typeof GUIDE_TYPES)[number], string> = {
  live_guide: "Live tour guide",
  driver_guide: "Driver guide",
  no_guide: "No guide — explore independently",
  ticket_only: "Ticket-only entry",
  audio_guide: "Audio guide",
};
export const TRANSPORT_TYPES = ["Tuk tuk", "Car", "Van", "Minibus", "Bus", "Jeep", "Train", "Boat", "Bicycle", "Walking"] as const;
export const KEYWORD_SUGGESTIONS = [
  "Family friendly", "Nature", "Wildlife", "Culture", "History", "Temples", "Tea", "Hiking", "Scenic", "Photography",
  "Waterfalls", "Beach", "Food", "Local culture", "Adventure", "Private", "Train ride", "Day trip",
];

export const BADGES = ["Best Seller", "Luxury", "New", "Family Friendly", "Top Pick", "Top Rated", "New Activity"] as const;

type BaseField = { name: string; label: string; help?: string; required?: boolean };

export type SubField =
  | { name: string; label: string; kind: "text" | "textarea" | "number" | "checkbox"; required?: boolean }
  | { name: string; label: string; kind: "select"; options: readonly string[]; labels?: Record<string, string>; required?: boolean };

export const ITINERARY_TYPES = ["pickup", "transport", "stop", "end"] as const;
export const ITINERARY_TYPE_LABELS: Record<(typeof ITINERARY_TYPES)[number], string> = {
  pickup: "Pickup / start",
  transport: "Travel (tuk tuk, car, train…)",
  stop: "Stop / visit",
  end: "Drop-off / end",
};
export const ADMISSION_TYPES = ["included", "free", "extra_fee", "optional"] as const;
export const ADMISSION_LABELS: Record<(typeof ADMISSION_TYPES)[number], string> = {
  included: "Admission included",
  free: "Free",
  extra_fee: "Extra fee",
  optional: "Optional, extra fee",
};

export type Field =
  | (BaseField & { kind: "text" | "textarea" | "date" })
  | (BaseField & { kind: "slug"; from: string })
  | (BaseField & { kind: "number"; step?: number; min?: number; max?: number })
  | (BaseField & { kind: "checkbox" })
  | (BaseField & { kind: "select"; options: readonly string[]; labels?: Record<string, string> })
  /** One entry per line */
  | (BaseField & { kind: "list"; max?: number })
  /** Tick any of a fixed set of choices; stored as a string array */
  | (BaseField & { kind: "choices"; options: readonly string[] })
  /** Uploads to Supabase Storage; stores `${name}Url` and `${name}Alt`, plus `${name}Width`/`${name}Height` unless storeSize is false */
  | (BaseField & { kind: "image"; storeSize?: boolean })
  /** Several uploaded images, stored as JSON [{ url, alt, width, height }] */
  | (BaseField & { kind: "gallery"; max?: number })
  /** Map position: stores `${name}Lat` and `${name}Lng` */
  | (BaseField & { kind: "location" })
  /** Repeatable rows of small objects, submitted as JSON */
  | (BaseField & { kind: "objectList"; fields: SubField[] })
  /** Choices are loaded from other content at render time */
  | (BaseField & { kind: "multiselect" | "reference"; source: "destinations" | "tourPackages" });

export type Section = { title: string; fields: Field[] };

export type ContentTypeConfig = {
  type: ContentType;
  label: string;
  singular: string;
  /** Field shown as the row title in lists */
  titleField: string;
  /** Edit one section at a time, as numbered steps */
  wizard?: boolean;
  sections: Section[];
};

export const CONTENT_CONFIG: Record<ContentType, ContentTypeConfig> = {
  "tour-packages": {
    type: "tour-packages",
    label: "Tour Packages",
    singular: "Tour Package",
    titleField: "title",
    wizard: true,
    sections: [
      {
        title: "Overview",
        fields: [
          { kind: "text", name: "title", label: "Title", required: true },
          { kind: "slug", name: "slug", label: "Slug (page address)", from: "title", required: true },
          { kind: "text", name: "tourType", label: "Tour type tag", help: 'Shown on the card, e.g. "Transfer tour", "Day trip"' },
          { kind: "text", name: "location", label: "Starting location", help: 'e.g. "Kandy", "From Kandy"' },
          { kind: "multiselect", name: "destinationSlugs", label: "Destinations", source: "destinations" },
          { kind: "select", name: "category", label: "Category", options: TOUR_CATEGORIES, required: true },
          { kind: "select", name: "badge", label: "Badge", options: BADGES },
          { kind: "textarea", name: "summary", label: "Card summary", required: true },
          {
            kind: "list",
            name: "keywords",
            label: "Keywords",
            max: 15,
            help: `Up to 15 tags that help customers find the tour, one per line — e.g. ${KEYWORD_SUGGESTIONS.slice(0, 6).join(", ")}`,
          },
        ],
      },
      {
        title: "Photos",
        fields: [
          { kind: "image", name: "image", label: "Main photo", required: true, help: "Used on cards and at the top of the tour page" },
          { kind: "gallery", name: "gallery", label: "Gallery", max: 20, help: "Up to 20 more photos. Drag order with the arrows; the first is shown first." },
        ],
      },
      {
        title: "Logistics",
        fields: [
          { kind: "number", name: "durationDays", label: "Duration (days)", min: 0 },
          { kind: "number", name: "durationNights", label: "Duration (nights)", min: 0 },
          { kind: "text", name: "durationLabel", label: "Duration label", help: 'For hour-based tours, e.g. "7.5–8 hours"' },
          { kind: "number", name: "price", label: "Price (USD)", step: 0.01, min: 0, required: true },
          { kind: "number", name: "originalPrice", label: "Original price (USD)", step: 0.01, min: 0, help: "Shown crossed out when higher than the price" },
          { kind: "text", name: "groupSize", label: "Group size", help: 'e.g. "Private group", "Up to 6 people"' },
          { kind: "list", name: "languages", label: "Guide languages", help: "One per line" },
          { kind: "checkbox", name: "freeCancellation", label: "Free cancellation" },
          { kind: "checkbox", name: "payLater", label: "Reserve now & pay later" },
          { kind: "text", name: "provider", label: "Activity provider" },
        ],
      },
      {
        title: "Trip details",
        fields: [
          { kind: "textarea", name: "description", label: "Full description (intro)" },
          { kind: "list", name: "highlights", label: "Highlights", help: "One per line" },
          { kind: "textarea", name: "routeSummary", label: "Route summary" },
          {
            kind: "objectList",
            name: "itinerary",
            label: "Itinerary",
            help: "In order, from pickup to drop-off. Add coordinates to show the stop on the route map.",
            fields: [
              { name: "type", label: "Type", kind: "select", options: ITINERARY_TYPES, labels: ITINERARY_TYPE_LABELS },
              { name: "title", label: "Name", kind: "text", required: true },
              { name: "detail", label: "Activity", kind: "text" },
              { name: "duration", label: "Duration", kind: "text" },
              { name: "admission", label: "Admission", kind: "select", options: ADMISSION_TYPES, labels: ADMISSION_LABELS },
              { name: "note", label: "Note", kind: "text" },
              { name: "lat", label: "Latitude", kind: "number" },
              { name: "lng", label: "Longitude", kind: "number" },
            ],
          },
          { kind: "list", name: "includes", label: "Includes", help: "One per line" },
          { kind: "list", name: "excludes", label: "Excludes", help: "One per line" },
          { kind: "list", name: "notSuitableFor", label: "Not suitable for", help: "One per line" },
          { kind: "list", name: "whatToBring", label: "What to bring", help: "One per line" },
          { kind: "list", name: "notAllowed", label: "Not allowed", help: "One per line" },
          { kind: "list", name: "knowBeforeYouGo", label: "Know before you go", help: "One per line" },
        ],
      },
      {
        title: "Food, transport & guide",
        fields: [
          { kind: "select", name: "foodIncluded", label: "Food & drinks", options: FOOD_OPTIONS, labels: FOOD_LABELS },
          { kind: "list", name: "foodDetails", label: "Food details", help: 'One per line, e.g. "Sri Lankan lunch", "Tea tasting"' },
          { kind: "choices", name: "transportTypes", label: "Transport used during the activity", options: TRANSPORT_TYPES },
          { kind: "select", name: "guideType", label: "Who leads the activity?", options: GUIDE_TYPES, labels: GUIDE_TYPE_LABELS },
          { kind: "checkbox", name: "petFriendly", label: "Pet-friendly" },
          { kind: "textarea", name: "petPolicy", label: "Pet policy details", help: "e.g. Service animals only" },
        ],
      },
      {
        title: "Meeting point",
        fields: [
          { kind: "select", name: "meetingType", label: "How the tour starts", options: MEETING_TYPES, labels: MEETING_TYPE_LABELS },
          { kind: "text", name: "meetingPointName", label: "Meeting point name", help: 'e.g. "Kandy Clock Tower"' },
          { kind: "text", name: "meetingPointAddress", label: "Address" },
          { kind: "location", name: "meeting", label: "Map location", help: "Paste coordinates from Google Maps (right-click the spot → click the numbers to copy)" },
          { kind: "textarea", name: "meetingInstructions", label: "How to find us", help: "e.g. Look for the guide with a Ceylon IT Tours sign" },
          { kind: "list", name: "pickupAreas", label: "Pickup areas", help: "One per line, e.g. Hotels in Kandy city" },
        ],
      },
      {
        title: "Cancellation",
        fields: [
          { kind: "select", name: "cancellationPolicy", label: "Cancellation policy", options: CANCELLATION_POLICIES, labels: CANCELLATION_POLICY_LABELS },
          { kind: "textarea", name: "cancellationNotes", label: "Policy details", help: "Shown on the tour page under the policy" },
        ],
      },
      {
        title: "Booking questions",
        fields: [
          {
            kind: "objectList",
            name: "bookingQuestions",
            label: "Questions asked when booking",
            help: 'e.g. "Hotel name for pickup", "Dietary requirements"',
            fields: [
              { name: "question", label: "Question", kind: "text", required: true },
              { name: "required", label: "Answer required", kind: "checkbox" },
            ],
          },
        ],
      },
      {
        title: "Reviews",
        fields: [
          { kind: "number", name: "rating", label: "Rating (0–5)", step: 0.1, min: 0, max: 5 },
          { kind: "number", name: "reviewCount", label: "Review count", min: 0 },
          {
            kind: "objectList",
            name: "reviewBreakdown",
            label: "Review breakdown",
            fields: [
              { name: "label", label: "Label", kind: "text", required: true },
              { name: "value", label: "Value (0–5)", kind: "number", required: true },
            ],
          },
          { kind: "textarea", name: "aiReviewSummary", label: "Review summary" },
          {
            kind: "objectList",
            name: "reviewHighlights",
            label: "Review highlights",
            fields: [
              { name: "name", label: "Name", kind: "text", required: true },
              { name: "country", label: "Country", kind: "text" },
              { name: "date", label: "Date", kind: "text" },
              { name: "rating", label: "Rating (1–5)", kind: "number", required: true },
              { name: "text", label: "Review text", kind: "textarea", required: true },
            ],
          },
        ],
      },
    ],
  },

  destinations: {
    type: "destinations",
    label: "Destinations",
    singular: "Destination",
    titleField: "name",
    sections: [
      {
        title: "Destination",
        fields: [
          { kind: "text", name: "name", label: "Name", required: true },
          { kind: "slug", name: "slug", label: "Slug", from: "name", required: true },
          { kind: "text", name: "region", label: "Region", help: 'e.g. "Central Province"' },
          { kind: "text", name: "tagline", label: "Tagline" },
          { kind: "textarea", name: "description", label: "Description" },
          { kind: "image", name: "image", label: "Image", required: true },
          { kind: "number", name: "tourCount", label: "Tour count", min: 0 },
          { kind: "number", name: "startingPrice", label: "Starting price (USD)", step: 0.01, min: 0 },
          { kind: "checkbox", name: "featured", label: "Featured (shown first)" },
          { kind: "number", name: "mapX", label: "Map position X (%)", step: 0.1, min: 0, max: 100 },
          { kind: "number", name: "mapY", label: "Map position Y (%)", step: 0.1, min: 0, max: 100 },
        ],
      },
    ],
  },

  experiences: {
    type: "experiences",
    label: "Experiences",
    singular: "Experience",
    titleField: "name",
    sections: [
      {
        title: "Experience",
        fields: [
          { kind: "text", name: "name", label: "Name", required: true },
          { kind: "slug", name: "slug", label: "Slug", from: "name", required: true },
          { kind: "select", name: "category", label: "Category", options: TOUR_CATEGORIES, required: true },
          { kind: "textarea", name: "description", label: "Description" },
          { kind: "image", name: "image", label: "Image", required: true },
          { kind: "number", name: "tourCount", label: "Tour count", min: 0 },
        ],
      },
    ],
  },

  testimonials: {
    type: "testimonials",
    label: "Testimonials",
    singular: "Testimonial",
    titleField: "name",
    sections: [
      {
        title: "Testimonial",
        fields: [
          { kind: "text", name: "name", label: "Traveller name", required: true },
          { kind: "text", name: "country", label: "Country" },
          { kind: "text", name: "countryFlag", label: "Country flag (emoji)", help: "e.g. 🇬🇧" },
          { kind: "image", name: "avatar", label: "Avatar", storeSize: false },
          { kind: "textarea", name: "quote", label: "Quote", required: true },
          { kind: "number", name: "rating", label: "Rating (1–5)", min: 1, max: 5, required: true },
          { kind: "reference", name: "tourPackageId", label: "Related tour package", source: "tourPackages" },
        ],
      },
    ],
  },

  "blog-posts": {
    type: "blog-posts",
    label: "Blog Posts",
    singular: "Blog Post",
    titleField: "title",
    sections: [
      {
        title: "Blog post",
        fields: [
          { kind: "text", name: "title", label: "Title", required: true },
          { kind: "slug", name: "slug", label: "Slug", from: "title", required: true },
          { kind: "textarea", name: "excerpt", label: "Excerpt" },
          { kind: "image", name: "image", label: "Cover image", required: true },
          { kind: "text", name: "category", label: "Category", help: 'e.g. "Travel Tips"' },
          { kind: "number", name: "readTimeMinutes", label: "Read time (minutes)", min: 1 },
          { kind: "date", name: "publishedAt", label: "Published date" },
          { kind: "textarea", name: "body", label: "Body", help: "Separate paragraphs with a blank line" },
        ],
      },
    ],
  },
};

/** Lower-case, hyphenated URL slug */
export function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 96);
}
