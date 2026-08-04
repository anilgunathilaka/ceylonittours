import { defineField, defineType } from "sanity";

export const experience = defineType({
  name: "experience",
  title: "Experience Category",
  type: "document",
  fields: [
    defineField({ name: "name", title: "Name", type: "string", validation: (r) => r.required() }),
    defineField({
      name: "slug",
      title: "Slug",
      type: "slug",
      options: { source: "name" },
      validation: (r) => r.required(),
    }),
    defineField({
      name: "category",
      title: "Category",
      type: "string",
      options: {
        list: [
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
        ],
      },
    }),
    defineField({ name: "description", title: "Description", type: "text" }),
    defineField({
      name: "image",
      title: "Image",
      type: "image",
      options: { hotspot: true },
      fields: [defineField({ name: "alt", title: "Alt text", type: "string" })],
    }),
    defineField({ name: "tourCount", title: "Tour Count", type: "number" }),
  ],
});
