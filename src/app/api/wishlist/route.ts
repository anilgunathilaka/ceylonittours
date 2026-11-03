import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { packageSlugSchema } from "@/lib/validation/schemas";

/** Saved tours (heart button). GET: the signed-in user's saved slugs. POST: save or remove one. */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ slugs: [] });
  const rows = await prisma.wishlistItem.findMany({ where: { userId: session.user.id }, select: { packageSlug: true } });
  return NextResponse.json({ slugs: rows.map((r) => r.packageSlug) }, { headers: { "Cache-Control": "no-store" } });
}

const bodySchema = z.object({ slug: packageSlugSchema, saved: z.boolean() });

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Please log in" }, { status: 401 });

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const { slug, saved } = parsed.data;
  const userId = session.user.id;

  if (saved) {
    if ((await prisma.wishlistItem.count({ where: { userId } })) >= 200) {
      return NextResponse.json({ error: "Your wishlist is full" }, { status: 400 });
    }
    await prisma.wishlistItem.createMany({ data: [{ userId, packageSlug: slug }], skipDuplicates: true });
  } else {
    await prisma.wishlistItem.deleteMany({ where: { userId, packageSlug: slug } });
  }
  return NextResponse.json({ ok: true, saved });
}
