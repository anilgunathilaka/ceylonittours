import { defineField, defineType } from "sanity";

const TOUR_CATEGORIES = [
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
];

const BADGES = ["Best Seller", "Luxury", "New", "Family Friendly", "Top Pick", "Top Rated", "New Activity"];

export const tourPackage = defineType({
  name: "tourPackage",
  title: "Tour Package",
  type: "document",
  groups: [
    { name: "overview", title: "Overview", default: true },
    { name: "logistics", title: "Logistics" },
    { name: "details", title: "Trip Details" },
    { name: "reviews", title: "Reviews" },
  ],
  fields: [
    defineField({ name: "title", title: "Title", type: "string", group: "overview", validation: (r) => r.required() }),
    defineField({
      name: "slug",
      title: "Slug",
      type: "slug",
      group: "overview",
      options: { source: "title" },
      validation: (r) => r.required(),
    }),
    defineField({
      name: "tourType",
      title: "Tour Type Tag",
      type: "string",
      group: "overview",
      description: "Short tag shown on the card, e.g. \"Transfer tour\", \"Day trip\", \"City tour\"",
    }),
    defineField({
      name: "location",
      title: "Starting Location",
      type: "string",
      group: "overview",
      description: "Free-text starting point, e.g. \"Kandy\", \"From Kandy\"",
    }),
    defineField({
      name: "destinations",
      title: "Destinations",
      type: "array",
      group: "overview",
      of: [{ type: "reference", to: [{ type: "destination" }] }],
    }),
    defineField({
      name: "category",
      title: "Category",
      type: "string",
      group: "overview",
      options: { list: TOUR_CATEGORIES },
    }),
    defineField({
      name: "image",
      title: "Image",
      type: "image",
      group: "overview",
      options: { hotspot: true },
      fields: [defineField({ name: "alt", title: "Alt text", type: "string" })],
    }),
    defineField({
      name: "badge",
      title: "Badge",
      type: "string",
      group: "overview",
      options: { list: BADGES },
    }),
    defineField({ name: "summary", title: "Card Summary", type: "text", group: "overview", validation: (r) => r.required() }),

    // Logistics
    defineField({ name: "durationDays", title: "Duration (Days)", type: "number", group: "logistics" }),
    defineField({ name: "durationNights", title: "Duration (Nights)", type: "number", group: "logistics" }),
    defineField({
      name: "durationLabel",
      title: "Duration Label",
      type: "string",
      group: "logistics",
      description: "Human label for hour-based tours, e.g. \"7.5–8 hours\"",
    }),
    defineField({ name: "price", title: "Price (USD)", type: "number", group: "logistics", validation: (r) => r.required() }),
    defineField({ name: "originalPrice", title: "Original Price (USD)", type: "number", group: "logistics" }),
    defineField({ name: "groupSize", title: "Group Size", type: "string", group: "logistics" }),
    defineField({ name: "languages", title: "Guide Languages", type: "array", group: "logistics", of: [{ type: "string" }] }),
    defineField({ name: "freeCancellation", title: "Free Cancellation", type: "boolean", group: "logistics" }),
    defineField({ name: "payLater", title: "Reserve Now & Pay Later", type: "boolean", group: "logistics" }),
    defineField({ name: "provider", title: "Activity Provider", type: "string", group: "logistics" }),

    // Trip details
    defineField({ name: "description", title: "Full Description (intro)", type: "text", group: "details" }),
    defineField({ name: "highlights", title: "Highlights", type: "array", group: "details", of: [{ type: "string" }] }),
    defineField({ name: "routeSummary", title: "Route Summary", type: "text", group: "details" }),
    defineField({
      name: "itinerary",
      title: "Itinerary Stops",
      type: "array",
      group: "details",
      of: [
        {
          type: "object",
          name: "stop",
          fields: [
            defineField({ name: "title", title: "Stop", type: "string", validation: (r) => r.required() }),
            defineField({ name: "detail", title: "Detail", type: "string" }),
            defineField({ name: "note", title: "Note", type: "string" }),
          ],
        },
      ],
    }),
    defineField({ name: "includes", title: "Includes", type: "array", group: "details", of: [{ type: "string" }] }),
    defineField({ name: "excludes", title: "Excludes", type: "array", group: "details", of: [{ type: "string" }] }),
    defineField({ name: "notSuitableFor", title: "Not Suitable For", type: "array", group: "details", of: [{ type: "string" }] }),
    defineField({ name: "whatToBring", title: "What To Bring", type: "array", group: "details", of: [{ type: "string" }] }),
    defineField({ name: "notAllowed", title: "Not Allowed", type: "array", group: "details", of: [{ type: "string" }] }),
    defineField({ name: "knowBeforeYouGo", title: "Know Before You Go", type: "array", group: "details", of: [{ type: "string" }] }),

    // Reviews
    defineField({ name: "rating", title: "Rating", type: "number", group: "reviews", validation: (r) => r.min(0).max(5) }),
    defineField({ name: "reviewCount", title: "Review Count", type: "number", group: "reviews" }),
    defineField({
      name: "reviewBreakdown",
      title: "Review Breakdown",
      type: "array",
      group: "reviews",
      of: [
        {
          type: "object",
          name: "breakdownItem",
          fields: [
            defineField({ name: "label", title: "Label", type: "string" }),
            defineField({ name: "value", title: "Value (0-5)", type: "number" }),
          ],
        },
      ],
    }),
    defineField({ name: "aiReviewSummary", title: "AI Review Summary", type: "text", group: "reviews" }),
    defineField({
      name: "reviewHighlights",
      title: "Review Highlights",
      type: "array",
      group: "reviews",
      of: [
        {
          type: "object",
          name: "reviewHighlight",
          fields: [
            defineField({ name: "name", title: "Name", type: "string" }),
            defineField({ name: "country", title: "Country", type: "string" }),
            defineField({ name: "date", title: "Date", type: "string" }),
            defineField({ name: "rating", title: "Rating (1-5)", type: "number" }),
            defineField({ name: "text", title: "Review Text", type: "text" }),
          ],
        },
      ],
    }),
  ],
});
