import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { markHelpful } from "@/lib/reviews";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** "Was this helpful?" — signed-in users, one vote each, not on their own review */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Please log in" }, { status: 401 });

  const { id } = await params;
  if (!UUID.test(id)) return NextResponse.json({ error: "Review not found" }, { status: 404 });

  const result = await markHelpful(id, session.user.id);
  if (!result) return NextResponse.json({ error: "Review not found" }, { status: 404 });
  return NextResponse.json(result);
}
