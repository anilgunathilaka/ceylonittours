import { NextResponse } from "next/server";
import { listApprovedReviews, type ReviewSort } from "@/lib/reviews";
import { packageSlugSchema } from "@/lib/validation/schemas";

const SORTS: ReviewSort[] = ["recommended", "newest", "highest", "lowest"];

/**
 * Published reviews for the tour page's review list:
 * GET /api/reviews?package=<slug>&sort=&q=&rating=1-5&photos=1&offset=
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const slug = packageSlugSchema.safeParse(params.get("package"));
  if (!slug.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const sort = SORTS.find((s) => s === params.get("sort")) ?? "recommended";
  const rating = Number(params.get("rating"));
  const offset = Number(params.get("offset") ?? 0);
  const result = await listApprovedReviews(slug.data, {
    sort,
    q: params.get("q")?.trim().slice(0, 100) || undefined,
    rating: Number.isInteger(rating) && rating >= 1 && rating <= 5 ? rating : undefined,
    withPhotos: params.get("photos") === "1",
    offset: Number.isInteger(offset) && offset >= 0 && offset <= 10_000 ? offset : 0,
    limit: 10,
  });
  return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
}
