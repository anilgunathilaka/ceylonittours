import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { rateLimit } from "@/lib/rate-limit";
import { InvalidImageError, StorageNotConfiguredError, uploadImage } from "@/lib/storage";

/** Photo upload for customers writing a review. Signed-in users only, rate limited. */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Please log in" }, { status: 401 });
  if (!rateLimit(`review-photo:${session.user.id}`, 20, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "Too many uploads — please try again later." }, { status: 429 });
  }

  const file = (await request.formData().catch(() => null))?.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Choose a photo to upload" }, { status: 400 });

  try {
    return NextResponse.json({ url: await uploadImage(file, "reviews") });
  } catch (error) {
    if (error instanceof InvalidImageError) return NextResponse.json({ error: error.message }, { status: 400 });
    if (error instanceof StorageNotConfiguredError) return NextResponse.json({ error: "Photo uploads are not available right now." }, { status: 503 });
    console.error("[reviews] Photo upload failed", error);
    return NextResponse.json({ error: "Upload failed — please try again." }, { status: 502 });
  }
}
