"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import type { OperationState } from "@/app/admin/bookings/operations-actions";
import { sendCustomerMessage } from "@/lib/booking-messages";
import { rateLimit } from "@/lib/rate-limit";

const schema = z.object({
  bookingId: z.string().uuid(),
  body: z.string().trim().min(2, "Write a message").max(2000, "Message is too long (max 2000 characters)"),
});

/** Customer reply on their own booking (profile page) */
export async function sendCustomerMessageAction(_prev: OperationState, formData: FormData): Promise<OperationState> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, message: "Please log in again." };
  const parsed = schema.safeParse({ bookingId: formData.get("bookingId"), body: formData.get("body") });
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };
  if (!rateLimit(`customer-message:${session.user.id}`, 20, 60 * 60 * 1000)) {
    return { ok: false, message: "Too many messages — please try again later." };
  }

  // Scoped to the signed-in user's own booking
  const message = await sendCustomerMessage(session.user.id, parsed.data.bookingId, parsed.data.body);
  if (!message) return { ok: false, message: "Booking not found." };
  revalidatePath("/profile");
  return { ok: true, message: "Message sent — we'll reply here and by email." };
}
