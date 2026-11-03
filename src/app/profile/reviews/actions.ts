"use server";

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { createReview, ReviewNotAllowedError } from "@/lib/reviews";
import { isReviewPhotoUrl } from "@/lib/storage";
import { reviewSchema } from "@/lib/validation/schemas";

export type ReviewFormState = { ok: boolean; message?: string; errors?: Record<string, string> };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function parsePhotos(value: FormDataEntryValue | null) {
  try {
    const parsed: unknown = JSON.parse(typeof value === "string" && value ? value : "[]");
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export async function submitReviewAction(_prev: ReviewFormState, formData: FormData): Promise<ReviewFormState> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, message: "Please log in again to leave a review." };

  const bookingId = formData.get("bookingId");
  if (typeof bookingId !== "string" || !UUID.test(bookingId)) return { ok: false, message: "Booking not found." };

  const photos = parsePhotos(formData.get("photos"));
  if (!photos) return { ok: false, message: "Your photos could not be read — please add them again." };

  const parsed = reviewSchema.safeParse({
    rating: formData.get("rating"),
    guideRating: formData.get("guideRating"),
    transportRating: formData.get("transportRating"),
    valueRating: formData.get("valueRating"),
    title: formData.get("title") || undefined,
    text: formData.get("text"),
    country: formData.get("country") || undefined,
    language: formData.get("language"),
    photos,
  });
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const issue of parsed.error.issues) errors[String(issue.path[0])] ??= issue.message;
    return { ok: false, message: "Please check your review.", errors };
  }
  // Only photos uploaded through our review photo upload
  if (!parsed.data.photos.every(isReviewPhotoUrl)) {
    return { ok: false, message: "Please check your review.", errors: { photos: "Please upload photos with the button" } };
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { id: true, name: true } });
  if (!user) return { ok: false, message: "Please log in again to leave a review." };

  try {
    await createReview(user, bookingId, { ...parsed.data, photos: parsed.data.photos.map((url) => ({ url })) });
  } catch (error) {
    if (error instanceof ReviewNotAllowedError) return { ok: false, message: error.message };
    console.error("[reviews] Failed to save review", error);
    return { ok: false, message: "Could not save your review. Please try again." };
  }
  redirect("/profile?reviewed=1#past");
}
