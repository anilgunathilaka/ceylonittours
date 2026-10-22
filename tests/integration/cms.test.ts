import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/db";
import { fakeSession, makeUser, resetDatabase } from "../helpers";

// --- Mocks for Next.js / Auth.js runtime pieces -----------------------------
const authMock = vi.hoisted(() => vi.fn());
vi.mock("@/auth", () => ({ auth: authMock }));
class RedirectSignal extends Error {
  constructor(public url: string) {
    super("NEXT_REDIRECT");
  }
}
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new RedirectSignal(url);
  },
}));
const cacheMocks = vi.hoisted(() => ({ updateTag: vi.fn(), revalidatePath: vi.fn() }));
vi.mock("next/cache", () => ({
  // Outside Next.js there is no cache store: run the wrapped function directly
  unstable_cache: <T extends (...args: never[]) => unknown>(fn: T) => fn,
  updateTag: cacheMocks.updateTag,
  revalidatePath: cacheMocks.revalidatePath,
}));

const { saveContentAction, deleteContentAction } = await import("@/app/admin/content/actions");
const { listContent } = await import("@/lib/cms/repository");
const { getDatabasePackages, getDatabaseTestimonials, getDatabaseBlogPosts } = await import("@/lib/content/database");

const ADMIN = "admin@test.local";
process.env.ADMIN_EMAILS = ADMIN;

function packageForm(overrides: Record<string, string> = {}) {
  const data = new FormData();
  const fields: Record<string, string> = {
    type: "tour-packages",
    status: "PUBLISHED",
    title: "Kandy to Ella",
    slug: "kandy-to-ella",
    category: "Day Trips",
    imageUrl: "https://example.supabase.co/storage/v1/object/public/site-media/tour-packages/a.webp",
    imageAlt: "Tea country",
    summary: "A scenic drive through tea country.",
    price: "49",
    originalPrice: "60",
    highlights: "Tea factory\nRamboda Falls",
    itinerary: JSON.stringify([{ title: "Kandy" }, { title: "Ella", note: "Drop-off" }]),
    reviewHighlights: JSON.stringify([{ name: "Ana", country: "Spain", date: "May 2026", rating: "5", text: "Lovely" }]),
    ...overrides,
  };
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

async function saveAs(formData: FormData) {
  try {
    return { state: await saveContentAction({ ok: false }, formData) };
  } catch (error) {
    if (error instanceof RedirectSignal) return { redirect: error.url };
    throw error;
  }
}

describe("admin content", () => {
  beforeEach(async () => {
    await resetDatabase();
    cacheMocks.updateTag.mockClear();
    cacheMocks.revalidatePath.mockClear();
    const admin = await makeUser(ADMIN, "Admin");
    authMock.mockResolvedValue(fakeSession(admin));
  });

  it("refuses non-admins", async () => {
    const user = await makeUser("guest@test.local");
    authMock.mockResolvedValue(fakeSession(user));
    const result = await saveAs(packageForm());
    expect(result.state).toMatchObject({ ok: false, message: expect.stringMatching(/not authorised/) });
    expect(await prisma.tourPackage.count()).toBe(0);
  });

  it("creates, publishes and refreshes the site", async () => {
    const result = await saveAs(packageForm());
    expect(result.redirect).toBe("/admin/content/tour-packages?notice=published");
    expect(cacheMocks.updateTag).toHaveBeenCalledWith("cms-content");
    expect(cacheMocks.revalidatePath).toHaveBeenCalledWith("/", "layout");

    const [item] = await listContent("tour-packages");
    expect(item).toMatchObject({ title: "Kandy to Ella", slug: "kandy-to-ella", status: "PUBLISHED" });

    // The website sees it in exactly the shape the components expect
    const [pkg] = await getDatabasePackages();
    expect(pkg).toMatchObject({
      slug: "kandy-to-ella",
      price: 49,
      originalPrice: 60,
      groupSize: "",
      highlights: ["Tea factory", "Ramboda Falls"],
      itinerary: [{ title: "Kandy" }, { title: "Ella", note: "Drop-off" }],
      reviewHighlights: [{ name: "Ana", country: "Spain", date: "May 2026", rating: 5, text: "Lovely" }],
      image: { alt: "Tea country", width: 1600, height: 1067 },
    });
    expect(pkg.durationDays).toBeUndefined();
  });

  it("keeps drafts off the website and lets an edit unpublish", async () => {
    await saveAs(packageForm({ status: "DRAFT", slug: "draft-tour" }));
    expect(await getDatabasePackages()).toHaveLength(0);

    await saveAs(packageForm());
    const [published] = await prisma.tourPackage.findMany({ where: { slug: "kandy-to-ella" } });
    expect(await getDatabasePackages()).toHaveLength(1);

    const result = await saveAs(packageForm({ id: published.id, status: "DRAFT", title: "Edited" }));
    expect(result.redirect).toBe("/admin/content/tour-packages?notice=saved");
    expect(await getDatabasePackages()).toHaveLength(0);
    expect((await prisma.tourPackage.findUniqueOrThrow({ where: { id: published.id } })).title).toBe("Edited");
  });

  it("returns field errors without saving", async () => {
    const result = await saveAs(packageForm({ title: "", price: "abc" }));
    expect(result.state?.ok).toBe(false);
    expect(result.state?.errors).toMatchObject({ title: expect.any(String), price: expect.any(String) });
    expect(await prisma.tourPackage.count()).toBe(0);
  });

  it("rejects a duplicate slug", async () => {
    await saveAs(packageForm());
    const result = await saveAs(packageForm({ title: "Another" }));
    expect(result.state).toMatchObject({ ok: false, errors: { slug: expect.any(String) } });
    expect(await prisma.tourPackage.count()).toBe(1);
  });

  it("links testimonials to a tour and survives the tour being deleted", async () => {
    await saveAs(packageForm());
    const tour = await prisma.tourPackage.findFirstOrThrow();
    const testimonial = new FormData();
    for (const [key, value] of Object.entries({
      type: "testimonials",
      status: "PUBLISHED",
      name: "Sam",
      country: "UK",
      quote: "Brilliant driver",
      rating: "5",
      tourPackageId: tour.id,
    })) {
      testimonial.set(key, value);
    }
    expect((await saveAs(testimonial)).redirect).toContain("notice=published");
    expect((await getDatabaseTestimonials())[0]).toMatchObject({ name: "Sam", tripName: "Kandy to Ella", rating: 5 });

    const remove = new FormData();
    remove.set("type", "tour-packages");
    remove.set("id", tour.id);
    await expect(deleteContentAction(remove)).rejects.toMatchObject({ url: "/admin/content/tour-packages?notice=deleted" });
    expect((await getDatabaseTestimonials())[0]).toMatchObject({ name: "Sam", tripName: "" });
  });

  it("orders blog posts newest first and formats the date", async () => {
    for (const [slug, date] of [
      ["older", "2026-01-05"],
      ["newer", "2026-06-02"],
    ]) {
      const post = new FormData();
      for (const [key, value] of Object.entries({
        type: "blog-posts",
        status: "PUBLISHED",
        title: slug,
        slug,
        imageUrl: "https://x.supabase.co/b.jpg",
        publishedAt: date,
      })) {
        post.set(key, value);
      }
      await saveAs(post);
    }
    const posts = await getDatabaseBlogPosts();
    expect(posts.map((p) => [p.slug, p.publishedAt])).toEqual([
      ["newer", "2026-06-02"],
      ["older", "2026-01-05"],
    ]);
  });
});
