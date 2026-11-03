"use server";

import { revalidatePath } from "next/cache";
import { getAdminSession } from "@/lib/auth/admin";
import { moderateReview } from "@/lib/reviews";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const STATUSES = ["pending", "approved", "rejected"] as const;

/** Approve / reject a review and/or save the public reply. */
export async function moderateReviewAction(formData: FormData) {
  if (!(await getAdminSession())) return;

  const id = formData.get("id");
  if (typeof id !== "string" || !UUID.test(id)) return;
  const statusValue = formData.get("status");
  const status = STATUSES.find((s) => s === statusValue);
  const replyValue = formData.get("reply");
  const reply = typeof replyValue === "string" ? replyValue.trim().slice(0, 2000) : undefined;

  const review = await moderateReview(id, { status, reply });
  // Approved reviews and replies show on the tour page
  revalidatePath(`/tour-packages/${review.packageSlug}`);
  revalidatePath("/admin/reviews");
}
