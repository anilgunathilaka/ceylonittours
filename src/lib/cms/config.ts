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

export const DISCOUNT_TYPES = ["percent", "amount"] as const;
export const DISCOUNT_TYPE_LABELS: Record<(typeof DISCOUNT_TYPES)[number], string> = {
  percent: "Percentage off (%)",
  amount: "Amount off (USD)",
};

export const BADGES = ["Best Seller", "Luxury", "New", "Family Friendly", "Top Pick", "Top Rated", "New Activity"] as const;

type BaseField = {
  name: string;
  label: string;
  help?: string;
  required?: boolean;
  /** Recommended maximum length: shows a character counter (text/textarea) — a guide, not a hard limit */
  counter?: number;
  /** For lists: recommended maximum length per line, and recommended number of lines */
  itemCounter?: number;
  itemsHint?: string;
};

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
        title: "Category",
        fields: [
          { kind: "select", name: "category", label: "Category", options: TOUR_CATEGORIES, required: true },
          { kind: "text", name: "tourType", label: "Activity type", help: 'Shown on the tour card, e.g. "Day trip", "Private tour", "Transfer tour"' },
          { kind: "select", name: "badge", label: "Badge", options: BADGES },
          { kind: "text", name: "provider", label: "Activity provider", help: "Shown on the tour page, e.g. Ceylon IT Tours" },
        ],
      },
      {
        title: "Title & description",
        fields: [
          {
            kind: "text",
            name: "title",
            label: "Title",
            required: true,
            counter: 60,
            help: 'Start with the location and a colon, then the activity and what makes it special, in title case — e.g. "From Kandy: Nuwara Eliya Day Trip by Tuk Tuk"',
          },
          { kind: "slug", name: "slug", label: "Page address", from: "title", required: true },
          { kind: "textarea", name: "summary", label: "Card summary", required: true, counter: 160, help: "One or two sentences for tour cards and search results" },
          { kind: "textarea", name: "description", label: "Short description", counter: 300, help: "Shown under the photos — sum up the experience in 2–3 sentences" },
          {
            kind: "list",
            name: "highlights",
            label: "Highlights",
            itemCounter: 80,
            itemsHint: "3–5",
            help: "3–5 highlights, one per line (up to 80 characters each) — what makes this tour special",
          },
          { kind: "textarea", name: "routeSummary", label: "Full description", help: "Everything customers will do, in order. Shown as “Full description” on the tour page." },
        ],
      },
      {
        title: "Locations",
        fields: [
          { kind: "text", name: "location", label: "Starting location", help: 'e.g. "Kandy", "From Kandy"' },
          { kind: "multiselect", name: "destinationSlugs", label: "Places visited", source: "destinations", help: "The cities and sights customers visit" },
        ],
      },
      {
        title: "Keywords",
        fields: [
          {
            kind: "list",
            name: "keywords",
            label: "Keywords",
            max: 15,
            itemsHint: "up to 15",
            help: `Tags that help customers find the tour, one per line — e.g. ${KEYWORD_SUGGESTIONS.slice(0, 8).join(", ")}`,
          },
        ],
      },
      {
        title: "Inclusions",
        fields: [
          { kind: "list", name: "includes", label: "What's included", help: "Everything included in the price, one per line" },
          { kind: "list", name: "excludes", label: "What's not included", help: "Optional fees or extras customers may pay for, one per line" },
          { kind: "select", name: "foodIncluded", label: "Food & drinks", options: FOOD_OPTIONS, labels: FOOD_LABELS },
          { kind: "list", name: "foodDetails", label: "Food details", help: 'One per line, e.g. "Sri Lankan lunch", "Tea tasting"' },
          { kind: "choices", name: "transportTypes", label: "Transport used during the activity", options: TRANSPORT_TYPES },
        ],
      },
      {
        title: "Guide information",
        fields: [
          { kind: "select", name: "guideType", label: "Who leads the activity?", options: GUIDE_TYPES, labels: GUIDE_TYPE_LABELS },
          { kind: "list", name: "languages", label: "Guide languages", help: "One per line" },
          {
            kind: "list",
            name: "guideCertifications",
            label: "Certifications, licences and expertise",
            help: 'Held by all or most of your guides, one per line — e.g. "SLTDA licensed national guide", "Red Cross First Aid"',
          },
        ],
      },
      {
        title: "Extra information",
        fields: [
          { kind: "list", name: "notSuitableFor", label: "Not suitable for", help: 'One per line, e.g. "Pregnant women", "Wheelchair users"' },
          { kind: "list", name: "notAllowed", label: "Not allowed", help: 'One per line, e.g. "Pets", "Luggage or large bags"' },
          { kind: "list", name: "whatToBring", label: "What to bring", help: 'One per line, e.g. "Passport or ID card", "Comfortable shoes"' },
          { kind: "list", name: "knowBeforeYouGo", label: "Know before you go", help: "Anything else customers should know before booking, one per line" },
          { kind: "checkbox", name: "petFriendly", label: "Pet-friendly" },
          { kind: "textarea", name: "petPolicy", label: "Pet policy details", help: "e.g. Service animals only, dogs under 12 kg" },
        ],
      },
      {
        title: "Photos",
        fields: [
          { kind: "image", name: "image", label: "Main photo", required: true, help: "Used on tour cards and first in the gallery — choose your best, brightest photo" },
          { kind: "gallery", name: "gallery", label: "More photos", max: 20, help: "Add at least 3 more (4 in total) showing the places and the experience. Use the arrows to order them." },
          {
            kind: "checkbox",
            name: "photoRightsConfirmed",
            label: "I confirm I own the copyright for these photos or have permission to use them, including from anyone recognisable in them",
            required: true,
          },
        ],
      },
      {
        title: "Itinerary & meeting point",
        fields: [
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
          { kind: "select", name: "meetingType", label: "How the tour starts", options: MEETING_TYPES, labels: MEETING_TYPE_LABELS },
          { kind: "text", name: "meetingPointName", label: "Meeting point name", help: 'e.g. "Kandy Clock Tower"' },
          { kind: "text", name: "meetingPointAddress", label: "Address" },
          { kind: "location", name: "meeting", label: "Map location", help: "Paste coordinates from Google Maps (right-click the spot → click the numbers to copy)" },
          { kind: "textarea", name: "meetingInstructions", label: "How to find us", help: "e.g. Look for the guide with a Ceylon IT Tours sign" },
          { kind: "list", name: "pickupAreas", label: "Pickup areas", help: "One per line, e.g. Hotels in Kandy city" },
        ],
      },
      {
        title: "Duration, price & policies",
        fields: [
          { kind: "number", name: "durationDays", label: "Duration (days)", min: 0 },
          { kind: "number", name: "durationNights", label: "Duration (nights)", min: 0 },
          { kind: "text", name: "durationLabel", label: "Duration label", help: 'For hour-based tours, e.g. "7.5–8 hours"' },
          { kind: "text", name: "groupSize", label: "Group size", help: 'e.g. "Private group", "Up to 6 people"' },
          { kind: "number", name: "price", label: "From price (USD)", step: 0.01, min: 0, required: true, help: "Shown on cards. Options set the actual booking prices." },
          { kind: "number", name: "originalPrice", label: "Original price (USD)", step: 0.01, min: 0, help: "Optional: shown crossed out when higher than the price" },
          { kind: "select", name: "discountType", label: "Discount", options: DISCOUNT_TYPES, labels: DISCOUNT_TYPE_LABELS, help: "Applies to every booking of this tour and shows as “Save X%”" },
          { kind: "number", name: "discountValue", label: "Discount value", step: 0.01, min: 0, help: "e.g. 15 for 15% off, or 10 for $10 off each guest (or each group, for group prices)" },
          { kind: "select", name: "cancellationPolicy", label: "Cancellation policy", options: CANCELLATION_POLICIES, labels: CANCELLATION_POLICY_LABELS },
          { kind: "textarea", name: "cancellationNotes", label: "Cancellation details", help: "Shown on the tour page under the policy" },
          { kind: "checkbox", name: "freeCancellation", label: "Free cancellation" },
          { kind: "checkbox", name: "payLater", label: "Reserve now & pay later" },
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
        title: "Reviews (optional)",
        fields: [
          { kind: "number", name: "rating", label: "Rating (0–5)", step: 0.1, min: 0, max: 5, help: "Only until real customer reviews arrive — then they take over" },
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
          { kind: "textarea", name: "aiReviewSummary", label: "What travelers are saying" },
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
