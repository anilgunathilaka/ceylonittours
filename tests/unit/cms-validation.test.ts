import { describe, expect, it } from "vitest";
import { slugify } from "@/lib/cms/config";
import { toFormValues } from "@/lib/cms/form-values";
import { parseContentForm } from "@/lib/cms/validation";

function form(fields: Record<string, string | string[]>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    for (const item of Array.isArray(value) ? value : [value]) data.append(key, item);
  }
  return data;
}

const validPackage = {
  status: "PUBLISHED",
  title: "Kandy to Ella",
  slug: "kandy-to-ella",
  category: "Day Trips",
  imageUrl: "https://example.supabase.co/storage/v1/object/public/site-media/tour-packages/a.webp",
  imageAlt: "Tea country",
  imageWidth: "1600",
  imageHeight: "1067",
  summary: "A scenic drive.",
  price: "49.5",
  durationDays: "1",
  highlights: "Tea factory\n\n  Ramboda Falls  \n",
  destinationSlugs: ["ella", "nuwara-eliya"],
  freeCancellation: "on",
  itinerary: JSON.stringify([{ title: "Kandy", detail: "Pickup" }, { title: "Ella" }]),
};

describe("parseContentForm", () => {
  it("parses a complete tour package into column values", () => {
    const result = parseContentForm("tour-packages", form(validPackage));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.status).toBe("PUBLISHED");
    expect(result.data).toMatchObject({
      title: "Kandy to Ella",
      slug: "kandy-to-ella",
      price: 49.5,
      durationDays: 1,
      durationNights: null,
      highlights: ["Tea factory", "Ramboda Falls"],
      destinationSlugs: ["ella", "nuwara-eliya"],
      freeCancellation: true,
      payLater: false,
      imageWidth: 1600,
      itinerary: [{ title: "Kandy", detail: "Pickup" }, { title: "Ella" }],
      badge: null,
    });
  });

  it("treats anything other than PUBLISHED as a draft", () => {
    const result = parseContentForm("tour-packages", form({ ...validPackage, status: "anything" }));
    expect(result.ok && result.status).toBe("DRAFT");
  });

  it("reports required fields, bad slugs, invalid options and out-of-range numbers", () => {
    const result = parseContentForm(
      "tour-packages",
      form({ ...validPackage, title: " ", slug: "Bad Slug!", category: "Space", price: "-1", rating: "7", imageUrl: "" }),
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(Object.keys(result.errors).sort()).toEqual(["category", "image", "price", "rating", "slug", "title"]);
  });

  it("rejects fractions in whole-number fields", () => {
    const result = parseContentForm("tour-packages", form({ ...validPackage, durationDays: "1.5" }));
    expect(result.ok).toBe(false);
  });

  it("validates repeatable rows", () => {
    const missing = parseContentForm("tour-packages", form({ ...validPackage, itinerary: JSON.stringify([{ detail: "no title" }]) }));
    expect(missing.ok).toBe(false);
    const broken = parseContentForm("tour-packages", form({ ...validPackage, itinerary: "{not json" }));
    expect(broken.ok).toBe(false);
  });

  it("only accepts http(s) image URLs", () => {
    const result = parseContentForm("tour-packages", form({ ...validPackage, imageUrl: "javascript:alert(1)" }));
    expect(result.ok).toBe(false);
  });

  it("drops unsafe values from multi-selects", () => {
    const result = parseContentForm("tour-packages", form({ ...validPackage, destinationSlugs: ["ella", "<script>"] }));
    expect(result.ok && result.data.destinationSlugs).toEqual(["ella"]);
  });

  it("does not store a size for testimonial avatars", () => {
    const result = parseContentForm(
      "testimonials",
      form({ name: "Sam", quote: "Great trip", rating: "5", avatarUrl: "https://x.supabase.co/a.png", avatarWidth: "10" }),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).toMatchObject({ avatarUrl: "https://x.supabase.co/a.png", tourPackageId: null });
    expect(result.data).not.toHaveProperty("avatarWidth");
  });

  it("parses blog dates and leaves an empty date to the database default", () => {
    const base = { title: "Post", slug: "post", imageUrl: "https://x.supabase.co/b.jpg" };
    const dated = parseContentForm("blog-posts", form({ ...base, publishedAt: "2026-06-02" }));
    expect(dated.ok && (dated.data.publishedAt as Date).toISOString()).toBe("2026-06-02T00:00:00.000Z");
    const undated = parseContentForm("blog-posts", form(base));
    expect(undated.ok && undated.data.publishedAt).toBeUndefined();
  });
});

describe("toFormValues", () => {
  it("round-trips a saved row back into form values", () => {
    const values = toFormValues("tour-packages", {
      title: "T",
      price: 10,
      highlights: ["a", "b"],
      freeCancellation: true,
      imageUrl: "https://x/y.jpg",
      imageAlt: "alt",
      imageWidth: 800,
      imageHeight: null,
      itinerary: [{ title: "Stop" }],
    });
    expect(values).toMatchObject({
      title: "T",
      price: "10",
      highlights: "a\nb",
      freeCancellation: true,
      image: { url: "https://x/y.jpg", alt: "alt", width: 800, height: undefined },
      itinerary: [{ title: "Stop" }],
      badge: "",
    });
  });
});

describe("slugify", () => {
  it("makes URL-safe slugs", () => {
    expect(slugify("  From Kandy: Ella Drop Tour!  ")).toBe("from-kandy-ella-drop-tour");
    expect(slugify("Café Négombo")).toBe("cafe-negombo");
  });
});
