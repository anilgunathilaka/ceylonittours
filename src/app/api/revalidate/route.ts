import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { parseBody } from "next-sanity/webhook";

export async function POST(request: NextRequest) {
  const secret = process.env.SANITY_REVALIDATE_SECRET;

  if (!secret) {
    return NextResponse.json(
      { error: "Missing webhook secret" },
      { status: 500 }
    );
  }

  const { isValidSignature } = await parseBody(
    request,
    secret,
    true
  );

  if (!isValidSignature) {
    return NextResponse.json(
      { error: "Invalid signature" },
      { status: 401 }
    );
  }

  revalidatePath("/", "layout");

  return NextResponse.json({
    success: true,
    message: "Revalidation requested",
  });
}
