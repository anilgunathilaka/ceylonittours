import { defineField, defineType } from "sanity";

export const destination = defineType({
  name: "destination",
  title: "Destination",
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
    defineField({ name: "region", title: "Region", type: "string" }),
    defineField({ name: "tagline", title: "Tagline", type: "string" }),
    defineField({ name: "description", title: "Description", type: "text" }),
    defineField({
      name: "image",
      title: "Image",
      type: "image",
      options: { hotspot: true },
      fields: [defineField({ name: "alt", title: "Alt text", type: "string" })],
    }),
    defineField({ name: "tourCount", title: "Tour Count", type: "number" }),
    defineField({ name: "startingPrice", title: "Starting Price (USD)", type: "number" }),
    defineField({ name: "featured", title: "Featured", type: "boolean", initialValue: false }),
    defineField({
      name: "mapPosition",
      title: "Map Position (%)",
      type: "object",
      fields: [
        defineField({ name: "x", title: "X", type: "number" }),
        defineField({ name: "y", title: "Y", type: "number" }),
      ],
    }),
  ],
});
