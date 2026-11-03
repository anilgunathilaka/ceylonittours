import type { Metadata } from "next";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { AdminFrame } from "@/components/admin/AdminFrame";
import { getAdminSession } from "@/lib/auth/admin";
import { prisma } from "@/lib/db";
import { BookingStatus, ReviewStatus } from "@/generated/prisma/enums";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s | Admin · Ceylon IT Tours" },
  robots: { index: false, follow: false },
};

/** Admin dashboard layout: its own sidebar and top bar instead of the public header and footer. */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await getAdminSession();
  if (!session) notFound();

  // Badges for work waiting on the team
  const [pendingBookings, pendingReviews] = await Promise.all([
    prisma.booking.count({ where: { status: BookingStatus.PENDING, OR: [{ travelDate: null }, { travelDate: { gte: new Date(new Date().toISOString().slice(0, 10)) } }] } }),
    prisma.review.count({ where: { status: ReviewStatus.PENDING } }),
  ]);

  return (
    <AdminFrame user={{ name: session.user.name ?? "Admin", email: session.user.email ?? "" }} badges={{ bookings: pendingBookings, reviews: pendingReviews }}>
      {children}
    </AdminFrame>
  );
}
