import { NextResponse } from "next/server";
import { getPackageBySlug } from "@/lib/content";
import { prisma } from "@/lib/db";
import { sriLankaToday } from "@/lib/products/slots";
import { rateLimit } from "@/lib/rate-limit";
import { packageSlugSchema } from "@/lib/validation/schemas";

/**
 * Counts a tour page view (one per browser session, sent by the page) for conversion stats.
 * Stores only a daily count per tour — no personal data.
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { slug?: unknown } | null;
  const slug = packageSlugSchema.safeParse(body?.slug);
  if (!slug.success) return new NextResponse(null, { status: 204 });

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!rateLimit(`view:${ip}:${slug.data}`, 3, 60 * 60 * 1000)) return new NextResponse(null, { status: 204 });
  if (!(await getPackageBySlug(slug.data))) return new NextResponse(null, { status: 204 });

  const day = new Date(`${sriLankaToday()}T00:00:00.000Z`);
  await prisma.packageView.upsert({
    where: { packageSlug_day: { packageSlug: slug.data, day } },
    create: { packageSlug: slug.data, day, count: 1 },
    update: { count: { increment: 1 } },
  });
  return new NextResponse(null, { status: 204 });
}
