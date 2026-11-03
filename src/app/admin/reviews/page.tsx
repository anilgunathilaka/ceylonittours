import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Check, MessageSquareReply, X } from "lucide-react";
import { moderateReviewAction } from "@/app/admin/reviews/actions";
import { AdminShell } from "@/components/admin/AdminShell";
import { Badge } from "@/components/ui/Badge";
import { Rating } from "@/components/ui/Rating";
import { getAdminSession } from "@/lib/auth/admin";
import { formatDisplayDate } from "@/lib/date";
import { countReviewsByStatus, getReviewsForAdmin, type ReviewStatusValue } from "@/lib/reviews";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Reviews", robots: { index: false, follow: false } };

const tabs = [
  { value: "pending", label: "Awaiting approval" },
  { value: "approved", label: "Published" },
  { value: "rejected", label: "Rejected" },
] as const;

const badge: Record<ReviewStatusValue, { label: string; tone: "gold" | "nature" | "accent" }> = {
  pending: { label: "Awaiting approval", tone: "gold" },
  approved: { label: "Published", tone: "nature" },
  rejected: { label: "Rejected", tone: "accent" },
};

export default async function AdminReviewsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  if (!(await getAdminSession())) notFound();
  const { status } = await searchParams;
  const current = tabs.find((t) => t.value === status)?.value ?? "pending";
  const [reviews, counts] = await Promise.all([getReviewsForAdmin(current), countReviewsByStatus()]);

  return (
    <AdminShell
      title="Reviews"
      description="Customers can review a tour after a confirmed trip. Approve a review to publish it on the tour page; your reply is shown under it."
    >
      <nav className="flex flex-wrap gap-2" aria-label="Filter reviews">
        {tabs.map((tab) => (
          <Link
            key={tab.value}
            href={`/admin/reviews?status=${tab.value}`}
            className={cn(
              "inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-semibold ring-1 transition-colors",
              current === tab.value ? "bg-primary text-white ring-primary" : "bg-surface text-midnight ring-border hover:ring-primary/40",
            )}
          >
            {tab.label}
            <span className={cn("rounded-full px-2 text-xs", current === tab.value ? "bg-white/20" : "bg-midnight/5")}>{counts[tab.value]}</span>
          </Link>
        ))}
      </nav>

      {reviews.length === 0 ? (
        <p className="rounded-3xl border border-dashed border-border bg-surface px-6 py-16 text-center text-sm text-slate">No reviews here.</p>
      ) : (
        <div className="flex flex-col gap-5">
          {reviews.map((review) => (
            <article key={review.id} className="flex flex-col gap-4 rounded-3xl bg-surface p-6 shadow-card ring-1 ring-border sm:p-7">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <Link href={`/tour-packages/${review.packageSlug}`} className="font-display text-lg font-semibold text-midnight hover:text-primary hover:underline">
                    {review.packageTitle}
                  </Link>
                  <p className="text-xs text-slate">
                    {review.authorName}
                    {review.country && ` (${review.country})`}
                    {review.travelDate && ` · travelled ${formatDisplayDate(review.travelDate)}`} · submitted {formatDisplayDate(review.createdAt.slice(0, 10))}
                  </p>
                </div>
                <Badge tone={badge[review.status].tone}>{badge[review.status].label}</Badge>
              </div>

              <div>
                <Rating value={review.rating} size="md" />
                {review.title && <p className="mt-2 font-semibold text-midnight">{review.title}</p>}
                <p className="mt-1 whitespace-pre-line text-sm text-midnight">{review.text}</p>
                {(review.guideRating || review.transportRating || review.valueRating) && (
                  <p className="mt-2 text-xs text-slate">
                    {[
                      review.guideRating && `Guide ${review.guideRating}/5`,
                      review.transportRating && `Transportation ${review.transportRating}/5`,
                      review.valueRating && `Value ${review.valueRating}/5`,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                )}
                {review.photos.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {review.photos.map((photo) => (
                      <a key={photo.url} href={photo.url} target="_blank" rel="noopener noreferrer" className="block h-20 w-20 overflow-hidden rounded-lg ring-1 ring-border">
                        {/* eslint-disable-next-line @next/next/no-img-element -- admin preview of a customer upload */}
                        <img src={photo.url} alt="" className="h-full w-full object-cover" />
                      </a>
                    ))}
                  </div>
                )}
                {review.helpfulCount > 0 && <p className="mt-2 text-xs text-slate">{review.helpfulCount} found this helpful</p>}
              </div>

              <form action={moderateReviewAction} className="flex flex-col gap-3 border-t border-border pt-4">
                <input type="hidden" name="id" value={review.id} />
                <label className="flex flex-col gap-1.5">
                  <span className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-slate uppercase">
                    <MessageSquareReply size={14} /> Public reply (optional)
                  </span>
                  <textarea
                    name="reply"
                    rows={2}
                    maxLength={2000}
                    defaultValue={review.adminReply ?? ""}
                    placeholder="Thank the traveller or respond to feedback"
                    className="w-full resize-y rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm text-midnight focus:border-secondary focus:outline-none"
                  />
                </label>
                <div className="flex flex-wrap gap-2">
                  {review.status !== "approved" && (
                    <button name="status" value="approved" className="inline-flex h-10 items-center gap-1.5 rounded-full bg-nature px-5 text-sm font-semibold text-white hover:opacity-90">
                      <Check size={15} /> Approve & publish
                    </button>
                  )}
                  {review.status !== "rejected" && (
                    <button name="status" value="rejected" className="inline-flex h-10 items-center gap-1.5 rounded-full border border-accent/40 px-5 text-sm font-semibold text-accent-dark hover:bg-accent/5">
                      <X size={15} /> {review.status === "approved" ? "Unpublish" : "Reject"}
                    </button>
                  )}
                  <button className="inline-flex h-10 items-center rounded-full px-5 text-sm font-semibold text-midnight ring-1 ring-border hover:bg-midnight/5">
                    Save reply
                  </button>
                </div>
              </form>
            </article>
          ))}
        </div>
      )}
    </AdminShell>
  );
}
