import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { createReview, getApprovedReviews, getReviewableBooking, listApprovedReviews, markHelpful, moderateReview } from "@/lib/reviews";
import { makeUser, resetDatabase } from "../helpers";

const day = (offset: number) => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offset);
  return new Date(`${d.toISOString().slice(0, 10)}T00:00:00Z`);
};

async function booking(userId: string, { status = "CONFIRMED", travelDate = day(-3) }: { status?: "PENDING" | "CONFIRMED" | "CANCELLED"; travelDate?: Date } = {}) {
  return prisma.booking.create({
    data: {
      userId,
      packageSlug: "kandy-day-tour",
      packageTitle: "Kandy Day Tour",
      customerName: "Kasun Perera",
      customerEmail: "kasun@example.test",
      message: "",
      status,
      travelDate,
    },
  });
}

const input = { rating: 5, text: "Wonderful guide and a perfectly paced day around Kandy." };

beforeEach(resetDatabase);

describe("reviews", () => {
  it("lets a traveller review a completed, confirmed trip once, and shows it after approval", async () => {
    const user = await makeUser("kasun@example.test", "Kasun Perera");
    const b = await booking(user.id);

    const review = await createReview(user, b.id, input);
    expect(review).toMatchObject({ status: "PENDING", authorName: "Kasun P.", packageSlug: "kandy-day-tour" });
    expect((await getApprovedReviews("kandy-day-tour")).count).toBe(0);

    await moderateReview(review.id, { status: "approved", reply: "Thank you, Kasun!" });
    const published = await getApprovedReviews("kandy-day-tour");
    expect(published).toMatchObject({ count: 1, average: 5 });
    expect(published.reviews[0]).toMatchObject({ adminReply: "Thank you, Kasun!", travelDate: b.travelDate!.toISOString().slice(0, 10) });

    await expect(createReview(user, b.id, input)).rejects.toThrow(/already reviewed/);
  });

  it("refuses upcoming, unconfirmed and other people's bookings", async () => {
    const user = await makeUser("kasun@example.test");
    const other = await makeUser("other@example.test");

    const upcoming = await booking(user.id, { travelDate: day(5) });
    const pending = await booking(user.id, { status: "PENDING" });
    const someoneElses = await booking(other.id);

    await expect(createReview(user, upcoming.id, input)).rejects.toThrow(/once it has taken place/);
    await expect(createReview(user, pending.id, input)).rejects.toThrow(/once it has taken place/);
    await expect(createReview(user, someoneElses.id, input)).rejects.toThrow(/not found/);
    expect(await getReviewableBooking(user.id, someoneElses.id)).toBeNull();
    expect(await prisma.review.count()).toBe(0);
  });
});

describe("review list, stats and votes", () => {
  async function seed() {
    const authors = await Promise.all([1, 2, 3, 4, 5, 6].map((i) => makeUser(`r${i}@example.test`, `Reviewer ${i}`)));
    const rows = [
      { rating: 5, language: "en", country: "Germany", text: "Our guide Saman was brilliant, very knowledgeable.", guideRating: 5, valueRating: 4, photos: [{ url: "https://x/p.webp" }] },
      { rating: 5, language: "en", text: "Lovely tea factory visit and a careful driver.", guideRating: 4 },
      { rating: 5, language: "en", text: "Perfect day out, would book again for sure." },
      { rating: 5, language: "en", text: "Great views from Ambuluwawa tower, recommended." },
      { rating: 4, language: "en", text: "Long drive but worth it, good stops on the way." },
      { rating: 2, language: "de", text: "Too rushed for us, not enough time at the falls." },
    ];
    const reviews = [];
    for (const [i, row] of rows.entries()) {
      const b = await booking(authors[i].id);
      reviews.push(
        await prisma.review.create({
          data: { ...row, bookingId: b.id, userId: authors[i].id, packageSlug: "kandy-day-tour", authorName: `Reviewer ${i + 1}`, status: "APPROVED" },
        }),
      );
    }
    return { authors, reviews };
  }

  it("summarises categories and 'Loved by' language only when it qualifies", async () => {
    await seed();
    const summary = await getApprovedReviews("kandy-day-tour");
    expect(summary).toMatchObject({ count: 6, average: 4.3 });
    expect(summary.categories).toEqual([
      { label: "Guide", value: 4.5, count: 2 },
      { label: "Value for money", value: 4, count: 1 },
    ]);
    // 4 of 5 English reviews are five stars = 80%
    expect(summary.lovedBy).toEqual({ language: "English", percent: 80 });
    expect(summary.highlights.every((r) => r.rating === 5)).toBe(true);
  });

  it("searches, filters, sorts and pages", async () => {
    await seed();
    expect((await listApprovedReviews("kandy-day-tour", { q: "GUIDE" })).total).toBe(1);
    expect((await listApprovedReviews("kandy-day-tour", { q: "germany" })).total).toBe(1);
    expect((await listApprovedReviews("kandy-day-tour", { rating: 5 })).total).toBe(4);
    expect((await listApprovedReviews("kandy-day-tour", { withPhotos: true })).reviews.map((r) => r.country)).toEqual(["Germany"]);
    expect((await listApprovedReviews("kandy-day-tour", { sort: "lowest", limit: 1 })).reviews[0].rating).toBe(2);
    const firstPage = await listApprovedReviews("kandy-day-tour", { limit: 4 });
    const secondPage = await listApprovedReviews("kandy-day-tour", { limit: 4, offset: 4 });
    expect([firstPage.hasMore, secondPage.hasMore, secondPage.reviews.length]).toEqual([true, false, 2]);
  });

  it("counts a helpful vote once per user, never your own", async () => {
    const { authors, reviews } = await seed();
    const voter = await makeUser("voter@example.test");
    expect(await markHelpful(reviews[0].id, voter.id)).toEqual({ counted: true });
    expect(await markHelpful(reviews[0].id, voter.id)).toEqual({ counted: false });
    expect(await markHelpful(reviews[0].id, authors[0].id)).toEqual({ counted: false });
    expect((await prisma.review.findUniqueOrThrow({ where: { id: reviews[0].id } })).helpfulCount).toBe(1);
    // "Recommended" puts the most helpful first
    expect((await listApprovedReviews("kandy-day-tour")).reviews[0].id).toBe(reviews[0].id);
  });
});
