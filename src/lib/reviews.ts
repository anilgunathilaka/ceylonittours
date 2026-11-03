import { prisma } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import { BookingStatus, ReviewStatus } from "@/generated/prisma/enums";
import { sriLankaToday } from "@/lib/products/slots";

/**
 * Customer reviews. Only someone with a confirmed booking whose travel date has passed can
 * review it (one review per booking); reviews appear on the tour page once an admin approves them.
 */

export type ReviewStatusValue = "pending" | "approved" | "rejected";

export type Review = {
  id: string;
  bookingId: string;
  packageSlug: string;
  rating: number;
  title?: string;
  text: string;
  authorName: string;
  status: ReviewStatusValue;
  adminReply?: string;
  repliedAt?: string;
  travelDate?: string;
  country?: string;
  language?: string;
  guideRating?: number;
  transportRating?: number;
  valueRating?: number;
  photos: ReviewPhoto[];
  helpfulCount: number;
  createdAt: string;
};

export type ReviewPhoto = { url: string; width?: number; height?: number };

type Row = Awaited<ReturnType<typeof prisma.review.findFirstOrThrow>> & { booking?: { travelDate: Date | null; packageTitle: string } };

function toReview(row: Row): Review {
  return {
    id: row.id,
    bookingId: row.bookingId,
    packageSlug: row.packageSlug,
    rating: row.rating,
    title: row.title ?? undefined,
    text: row.text,
    authorName: row.authorName,
    status: row.status.toLowerCase() as ReviewStatusValue,
    adminReply: row.adminReply ?? undefined,
    repliedAt: row.repliedAt?.toISOString(),
    travelDate: row.booking?.travelDate?.toISOString().slice(0, 10),
    country: row.country ?? undefined,
    language: row.language ?? undefined,
    guideRating: row.guideRating ?? undefined,
    transportRating: row.transportRating ?? undefined,
    valueRating: row.valueRating ?? undefined,
    photos: Array.isArray(row.photos) ? (row.photos as ReviewPhoto[]).filter((p) => typeof p?.url === "string") : [],
    helpfulCount: row.helpfulCount,
    createdAt: row.createdAt.toISOString(),
  };
}

/** "Kasun Perera" -> "Kasun P." */
export function shortName(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length < 2) return parts[0] || "Traveller";
  return `${parts[0]} ${parts.at(-1)![0].toUpperCase()}.`;
}

const withBooking = { booking: { select: { travelDate: true, packageTitle: true } } } as const;

export type ReviewSort = "recommended" | "newest" | "highest" | "lowest";
const ORDER: Record<ReviewSort, Prisma.ReviewOrderByWithRelationInput[]> = {
  recommended: [{ helpfulCount: "desc" }, { createdAt: "desc" }],
  newest: [{ createdAt: "desc" }],
  highest: [{ rating: "desc" }, { createdAt: "desc" }],
  lowest: [{ rating: "asc" }, { createdAt: "desc" }],
};

/** Published reviews for a tour, with search, sort, star and photo filters and paging. */
export async function listApprovedReviews(
  packageSlug: string,
  { sort = "recommended", q, rating, withPhotos, offset = 0, limit = 10 }: { sort?: ReviewSort; q?: string; rating?: number; withPhotos?: boolean; offset?: number; limit?: number } = {},
) {
  const where: Prisma.ReviewWhereInput = {
    packageSlug,
    status: ReviewStatus.APPROVED,
    ...(rating ? { rating } : {}),
    ...(withPhotos ? { NOT: { photos: { equals: [] } } } : {}),
    ...(q
      ? { OR: [{ text: { contains: q, mode: "insensitive" } }, { title: { contains: q, mode: "insensitive" } }, { country: { contains: q, mode: "insensitive" } }] }
      : {}),
  };
  const [rows, total] = await Promise.all([
    prisma.review.findMany({ where, orderBy: ORDER[sort], skip: offset, take: limit, include: withBooking }),
    prisma.review.count({ where }),
  ]);
  return { reviews: rows.map(toReview), total, hasMore: offset + rows.length < total };
}

const LANGUAGE_NAMES = new Intl.DisplayNames(["en"], { type: "language" });

/** Headline numbers for the tour page: average, category averages, top reviews, "Loved by … speakers" */
export async function getApprovedReviews(packageSlug: string) {
  const where = { packageSlug, status: ReviewStatus.APPROVED };
  const [first, stats, byLanguage, highlights] = await Promise.all([
    listApprovedReviews(packageSlug, { limit: 10 }),
    prisma.review.aggregate({
      where,
      _avg: { rating: true, guideRating: true, transportRating: true, valueRating: true },
      _count: { _all: true, guideRating: true, transportRating: true, valueRating: true },
    }),
    prisma.review.groupBy({ by: ["language", "rating"], where: { ...where, language: { not: null } }, _count: { _all: true } }),
    // "What travelers loved": recent 5-star reviews with something to say
    prisma.review.findMany({ where: { ...where, rating: 5 }, orderBy: [{ helpfulCount: "desc" }, { createdAt: "desc" }], take: 6, include: withBooking }),
  ]);

  const round = (n: number | null) => (n ? Math.round(n * 10) / 10 : undefined);
  const categories = [
    { label: "Guide", value: round(stats._avg.guideRating), count: stats._count.guideRating },
    { label: "Transportation", value: round(stats._avg.transportRating), count: stats._count.transportRating },
    { label: "Value for money", value: round(stats._avg.valueRating), count: stats._count.valueRating },
  ].filter((c): c is { label: string; value: number; count: number } => c.value !== undefined);

  // The language with the most reviews (at least 5) where 80%+ gave five stars
  const languages = new Map<string, { total: number; perfect: number }>();
  for (const row of byLanguage) {
    const entry = languages.get(row.language!) ?? { total: 0, perfect: 0 };
    entry.total += row._count._all;
    if (row.rating === 5) entry.perfect += row._count._all;
    languages.set(row.language!, entry);
  }
  const lovedBy = [...languages.entries()]
    .filter(([, v]) => v.total >= 5 && v.perfect / v.total >= 0.8)
    .sort((a, b) => b[1].total - a[1].total)
    .map(([code, v]) => ({ language: LANGUAGE_NAMES.of(code) ?? code, percent: Math.round((v.perfect / v.total) * 100) }))
    .at(0);

  return {
    ...first,
    count: stats._count._all,
    average: round(stats._avg.rating),
    categories,
    lovedBy,
    highlights: highlights.map(toReview).filter((r) => r.text.length >= 40).slice(0, 4),
  };
}

/** "Was this helpful?" — counted once per user */
export async function markHelpful(reviewId: string, userId: string) {
  return prisma.$transaction(async (tx) => {
    const review = await tx.review.findFirst({ where: { id: reviewId, status: ReviewStatus.APPROVED }, select: { id: true, userId: true } });
    if (!review) return null;
    if (review.userId === userId) return { counted: false };
    const { count } = await tx.reviewVote.createMany({ data: [{ reviewId, userId }], skipDuplicates: true });
    if (count === 0) return { counted: false };
    await tx.review.update({ where: { id: reviewId }, data: { helpfulCount: { increment: 1 } } });
    return { counted: true };
  });
}

export class ReviewNotAllowedError extends Error {}

/** A confirmed booking whose date has passed, owned by this user */
export async function getReviewableBooking(userId: string, bookingId: string) {
  const booking = await prisma.booking.findFirst({
    where: { id: bookingId, userId },
    include: { review: true },
  });
  if (!booking) return null;
  const travelled = booking.travelDate ? booking.travelDate.toISOString().slice(0, 10) < sriLankaToday() : false;
  return { booking, canReview: booking.status === BookingStatus.CONFIRMED && travelled && !booking.review };
}

export async function createReview(
  user: { id: string; name: string },
  bookingId: string,
  input: {
    rating: number;
    title?: string;
    text: string;
    country?: string;
    language?: string;
    guideRating?: number;
    transportRating?: number;
    valueRating?: number;
    photos?: ReviewPhoto[];
  },
) {
  const found = await getReviewableBooking(user.id, bookingId);
  if (!found) throw new ReviewNotAllowedError("Booking not found.");
  if (found.booking.review) throw new ReviewNotAllowedError("You've already reviewed this trip.");
  if (!found.canReview) throw new ReviewNotAllowedError("You can review a tour once it has taken place.");

  try {
    return await prisma.review.create({
      data: {
        bookingId,
        userId: user.id,
        packageSlug: found.booking.packageSlug,
        rating: input.rating,
        title: input.title || null,
        text: input.text,
        authorName: shortName(user.name || found.booking.customerName),
        country: input.country || null,
        language: input.language || null,
        guideRating: input.guideRating ?? null,
        transportRating: input.transportRating ?? null,
        valueRating: input.valueRating ?? null,
        photos: input.photos ?? [],
      },
    });
  } catch (error) {
    // Two submits at once: the unique bookingId index keeps it to one review
    if ((error as { code?: string }).code === "P2002") throw new ReviewNotAllowedError("You've already reviewed this trip.");
    throw error;
  }
}

/** Review per booking, for the customer's profile */
export async function getReviewsByBooking(userId: string) {
  const rows = await prisma.review.findMany({ where: { userId } });
  return new Map(rows.map((row) => [row.bookingId, toReview(row)]));
}

export async function getReviewsForAdmin(status: ReviewStatusValue | "all") {
  const rows = await prisma.review.findMany({
    where: status === "all" ? {} : { status: status.toUpperCase() as ReviewStatus },
    orderBy: { createdAt: "desc" },
    include: { booking: { select: { travelDate: true, packageTitle: true } } },
    take: 200,
  });
  return rows.map((row) => ({ ...toReview(row), packageTitle: row.booking.packageTitle }));
}

export async function countReviewsByStatus() {
  const rows = await prisma.review.groupBy({ by: ["status"], _count: { _all: true } });
  const counts: Record<ReviewStatusValue, number> = { pending: 0, approved: 0, rejected: 0 };
  for (const row of rows) counts[row.status.toLowerCase() as ReviewStatusValue] = row._count._all;
  return counts;
}

export async function moderateReview(id: string, update: { status?: ReviewStatusValue; reply?: string | null }) {
  const row = await prisma.review.update({
    where: { id },
    data: {
      ...(update.status ? { status: update.status.toUpperCase() as ReviewStatus } : {}),
      ...(update.reply !== undefined ? { adminReply: update.reply || null, repliedAt: update.reply ? new Date() : null } : {}),
    },
  });
  return toReview(row);
}
