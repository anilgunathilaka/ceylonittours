/**
 * Content types managed in /admin/content. Shared by the admin forms (client) and the
 * server-side validation, so it must not import anything server-only.
 */

export const CONTENT_TYPES = ["tour-packages", "destinations", "experiences", "testimonials", "blog-posts"] as const;
export type ContentType = (typeof CONTENT_TYPES)[number];

export const isContentType = (value: unknown): value is ContentType =>
  CONTENT_TYPES.includes(value as ContentType);

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

export const BADGES = ["Best Seller", "Luxury", "New", "Family Friendly", "Top Pick", "Top Rated", "New Activity"] as const;

type BaseField = { name: string; label: string; help?: string; required?: boolean };

export type SubField = { name: string; label: string; kind: "text" | "textarea" | "number"; required?: boolean };

export type Field =
  | (BaseField & { kind: "text" | "textarea" | "date" })
  | (BaseField & { kind: "slug"; from: string })
  | (BaseField & { kind: "number"; step?: number; min?: number; max?: number })
  | (BaseField & { kind: "checkbox" })
  | (BaseField & { kind: "select"; options: readonly string[] })
  /** One entry per line */
  | (BaseField & { kind: "list" })
  /** Uploads to Supabase Storage; stores `${name}Url` and `${name}Alt`, plus `${name}Width`/`${name}Height` unless storeSize is false */
  | (BaseField & { kind: "image"; storeSize?: boolean })
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
  sections: Section[];
};

export const CONTENT_CONFIG: Record<ContentType, ContentTypeConfig> = {
  "tour-packages": {
    type: "tour-packages",
    label: "Tour Packages",
    singular: "Tour Package",
    titleField: "title",
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
          { kind: "image", name: "image", label: "Image", required: true },
          { kind: "textarea", name: "summary", label: "Card summary", required: true },
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
            label: "Itinerary stops",
            fields: [
              { name: "title", label: "Stop", kind: "text", required: true },
              { name: "detail", label: "Detail", kind: "text" },
              { name: "note", label: "Note", kind: "text" },
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
