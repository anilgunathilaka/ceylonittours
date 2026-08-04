import { defineField, defineType } from "sanity";

export const testimonial = defineType({
  name: "testimonial",
  title: "Testimonial",
  type: "document",
  fields: [
    defineField({ name: "name", title: "Traveller Name", type: "string", validation: (r) => r.required() }),
    defineField({ name: "country", title: "Country", type: "string" }),
    defineField({ name: "countryFlag", title: "Country Flag (Emoji)", type: "string" }),
    defineField({
      name: "avatar",
      title: "Avatar",
      type: "image",
      options: { hotspot: true },
      fields: [defineField({ name: "alt", title: "Alt text", type: "string" })],
    }),
    defineField({ name: "quote", title: "Quote", type: "text", validation: (r) => r.required() }),
    defineField({ name: "rating", title: "Rating", type: "number", validation: (r) => r.min(1).max(5) }),
    defineField({
      name: "tourPackage",
      title: "Related Tour Package",
      type: "reference",
      to: [{ type: "tourPackage" }],
    }),
  ],
});
