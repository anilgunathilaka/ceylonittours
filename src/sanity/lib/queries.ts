import { groq } from "next-sanity";

/** Projects a Sanity image field into the app's flat SanityImage shape. */
const image = (field = "image") => `
  "${field}": {
    "url": ${field}.asset->url,
    "alt": coalesce(${field}.alt, ""),
    "width": ${field}.asset->metadata.dimensions.width,
    "height": ${field}.asset->metadata.dimensions.height
  }
`;

export const destinationsQuery = groq`
  *[_type == "destination"] | order(featured desc, name asc) {
    "slug": slug.current,
    name,
    region,
    tagline,
    description,
    ${image()},
    tourCount,
    startingPrice,
    featured,
    mapPosition
  }
`;

export const packagesQuery = groq`
  *[_type == "tourPackage"] | order(_createdAt asc) {
    "slug": slug.current,
    title,
    tourType,
    location,
    "destinationSlugs": destinations[]->slug.current,
    category,
    ${image()},
    durationDays,
    durationNights,
    durationLabel,
    price,
    originalPrice,
    rating,
    reviewCount,
    groupSize,
    badge,
    summary,
    provider,
    description,
    languages,
    freeCancellation,
    payLater,
    highlights,
    routeSummary,
    itinerary,
    includes,
    excludes,
    notSuitableFor,
    whatToBring,
    notAllowed,
    knowBeforeYouGo,
    reviewBreakdown,
    aiReviewSummary,
    reviewHighlights
  }
`;

export const experiencesQuery = groq`
  *[_type == "experience"] | order(name asc) {
    "slug": slug.current,
    "name": name,
    category,
    description,
    ${image()},
    tourCount
  }
`;

export const testimonialsQuery = groq`
  *[_type == "testimonial"] | order(_createdAt asc) {
    "id": _id,
    name,
    country,
    countryFlag,
    ${image("avatar")},
    quote,
    rating,
    "tripName": tourPackage->title
  }
`;

export const blogPostsQuery = groq`
  *[_type == "blogPost"] | order(publishedAt desc) {
    "slug": slug.current,
    title,
    excerpt,
    ${image()},
    category,
    readTimeMinutes,
    publishedAt
  }
`;
