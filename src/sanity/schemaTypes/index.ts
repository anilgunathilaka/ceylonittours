import { type SchemaTypeDefinition } from "sanity";
import { destination } from "./destination";
import { tourPackage } from "./tourPackage";
import { experience } from "./experience";
import { testimonial } from "./testimonial";
import { blogPost } from "./blogPost";
import { siteSettings } from "./siteSettings";

export const schema: { types: SchemaTypeDefinition[] } = {
  types: [destination, tourPackage, experience, testimonial, blogPost, siteSettings],
};
