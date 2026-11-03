"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { ChevronDown, Loader2, Search, SlidersHorizontal, Star, ThumbsUp, X } from "lucide-react";
import { Rating } from "@/components/ui/Rating";
import { formatDisplayDate } from "@/lib/date";
import type { Review, ReviewSort } from "@/lib/reviews";
import { cn } from "@/lib/utils";

const SORTS: { value: ReviewSort; label: string }[] = [
  { value: "recommended", label: "Recommended" },
  { value: "newest", label: "Most recent" },
  { value: "highest", label: "Highest rated" },
  { value: "lowest", label: "Lowest rated" },
];

const AVATAR_TONES = ["bg-primary", "bg-accent", "bg-nature", "bg-secondary", "bg-gold-dark", "bg-midnight"];
const toneFor = (name: string) => AVATAR_TONES[[...name].reduce((sum, c) => sum + c.charCodeAt(0), 0) % AVATAR_TONES.length];

export function ReviewAvatar({ name }: { name: string }) {
  return (
    <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white", toneFor(name))}>
      {name.charAt(0).toUpperCase()}
    </span>
  );
}

type Page = { reviews: Review[]; total: number; hasMore: boolean };

/** Published reviews with search, sort, filters and "See more reviews". First page is rendered on the server. */
export function ReviewsList({ packageSlug, initial }: { packageSlug: string; initial: Page }) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<ReviewSort>("recommended");
  const [rating, setRating] = useState<number | null>(null);
  const [withPhotos, setWithPhotos] = useState(false);
  const [page, setPage] = useState<Page>(initial);
  const [loading, setLoading] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [viewer, setViewer] = useState<{ photos: Review["photos"]; index: number } | null>(null);
  const first = useRef(true);

  async function load(offset: number) {
    const params = new URLSearchParams({ package: packageSlug, sort, offset: String(offset) });
    if (query.trim()) params.set("q", query.trim());
    if (rating) params.set("rating", String(rating));
    if (withPhotos) params.set("photos", "1");
    setLoading(true);
    try {
      const res = await fetch(`/api/reviews?${params}`, { cache: "no-store" });
      if (!res.ok) return;
      const next = (await res.json()) as Page;
      setPage((current) => (offset === 0 ? next : { ...next, reviews: [...current.reviews, ...next.reviews] }));
    } finally {
      setLoading(false);
    }
  }

  // Re-query when sort or filters change; searching waits for the user to pause typing
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const timer = setTimeout(() => void load(0), query ? 350 : 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load reads the latest filters
  }, [query, sort, rating, withPhotos]);

  const activeFilters = (rating ? 1 : 0) + (withPhotos ? 1 : 0);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <label className="relative sm:w-72">
          <span className="sr-only">Search reviews</span>
          <Search size={16} className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-slate" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search reviews (e.g. guide)"
            className="h-10 w-full rounded-full border border-border bg-surface pr-4 pl-10 text-sm text-midnight focus:border-secondary focus:outline-none"
          />
        </label>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-sm text-slate">
            Sort by:
            <span className="relative">
              <select
                value={sort}
                onChange={(event) => setSort(event.target.value as ReviewSort)}
                className="h-10 appearance-none rounded-full bg-transparent pr-8 pl-2 text-sm font-semibold text-midnight focus:outline-none"
              >
                {SORTS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
              <ChevronDown size={15} className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-slate" />
            </span>
          </label>
          <div className="relative">
            <button
              type="button"
              aria-expanded={filterOpen}
              onClick={() => setFilterOpen((v) => !v)}
              className={cn(
                "inline-flex h-10 items-center gap-1.5 rounded-full px-4 text-sm font-semibold ring-1 transition-colors",
                activeFilters ? "bg-primary/5 text-primary ring-primary/40" : "text-midnight ring-border hover:bg-midnight/5",
              )}
            >
              <SlidersHorizontal size={15} /> Filter{activeFilters > 0 && ` (${activeFilters})`}
            </button>
            {filterOpen && (
              <div className="absolute top-full right-0 z-20 mt-2 w-64 rounded-2xl bg-surface p-4 shadow-card-hover ring-1 ring-border">
                <p className="mb-2 text-xs font-semibold tracking-wide text-slate uppercase">Rating</p>
                <div className="flex flex-wrap gap-1.5">
                  {[5, 4, 3, 2, 1].map((stars) => (
                    <button
                      key={stars}
                      type="button"
                      aria-pressed={rating === stars}
                      onClick={() => setRating(rating === stars ? null : stars)}
                      className={cn(
                        "inline-flex h-8 items-center gap-1 rounded-full px-3 text-sm font-semibold ring-1",
                        rating === stars ? "bg-primary text-white ring-primary" : "text-midnight ring-border hover:bg-midnight/5",
                      )}
                    >
                      {stars} <Star size={12} className={rating === stars ? "fill-white" : "fill-gold text-gold"} />
                    </button>
                  ))}
                </div>
                <label className="mt-4 flex items-center gap-2 text-sm font-medium text-midnight">
                  <input type="checkbox" checked={withPhotos} onChange={(event) => setWithPhotos(event.target.checked)} className="h-4 w-4 accent-primary" />
                  Only reviews with photos
                </label>
                {activeFilters > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setRating(null);
                      setWithPhotos(false);
                    }}
                    className="mt-3 text-sm font-semibold text-primary hover:underline"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {page.reviews.length === 0 && !loading && <p className="rounded-xl bg-midnight/5 px-4 py-6 text-center text-sm text-slate">No reviews match.</p>}

      <ul className={cn("flex flex-col divide-y divide-border transition-opacity", loading && "opacity-60")}>
        {page.reviews.map((review) => (
          <ReviewItem key={review.id} review={review} onPhoto={(index) => setViewer({ photos: review.photos, index })} />
        ))}
      </ul>

      {page.hasMore && (
        <button
          type="button"
          disabled={loading}
          onClick={() => void load(page.reviews.length)}
          className="inline-flex h-11 items-center gap-2 self-center rounded-full px-6 text-sm font-semibold text-midnight ring-1 ring-border hover:bg-midnight/5 disabled:opacity-60"
        >
          {loading && <Loader2 size={15} className="animate-spin" />}
          See more reviews
        </button>
      )}

      {viewer && <PhotoViewer photos={viewer.photos} start={viewer.index} onClose={() => setViewer(null)} />}
    </div>
  );
}

function ReviewItem({ review, onPhoto }: { review: Review; onPhoto: (index: number) => void }) {
  const [expanded, setExpanded] = useState(false);
  const long = review.text.length > 320;

  return (
    <li className="flex flex-col gap-3 py-5 first:pt-0">
      <Rating value={review.rating} />
      <div className="flex items-center gap-3">
        <ReviewAvatar name={review.authorName} />
        <div>
          <p className="text-sm font-semibold text-midnight">
            {review.authorName}
            {review.country && <span className="font-normal text-slate"> – {review.country}</span>}
          </p>
          <p className="text-xs text-slate">
            {formatDisplayDate(review.createdAt.slice(0, 10))} · Verified booking
          </p>
        </div>
      </div>
      {review.title && <p className="font-semibold text-midnight">{review.title}</p>}
      <p className={cn("text-sm whitespace-pre-line text-midnight", !expanded && long && "line-clamp-4")}>{review.text}</p>
      {long && (
        <button type="button" onClick={() => setExpanded((v) => !v)} className="self-start text-sm font-semibold text-midnight underline underline-offset-2">
          {expanded ? "Show less" : "Read more"}
        </button>
      )}
      {review.photos.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {review.photos.map((photo, index) => (
            <button key={photo.url} type="button" onClick={() => onPhoto(index)} className="relative h-24 w-24 overflow-hidden rounded-xl bg-border">
              <Image src={photo.url} alt={`Photo by ${review.authorName}`} fill sizes="96px" className="object-cover" />
            </button>
          ))}
        </div>
      )}
      {review.adminReply && (
        <div className="rounded-xl bg-primary/5 px-4 py-3 text-sm">
          <p className="text-xs font-semibold text-primary">Response from Ceylon IT Tours</p>
          <p className="whitespace-pre-line text-midnight">{review.adminReply}</p>
        </div>
      )}
      <HelpfulButton review={review} />
    </li>
  );
}

function HelpfulButton({ review }: { review: Review }) {
  const { status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [state, setState] = useState<"idle" | "sending" | "done">("idle");
  const [count, setCount] = useState(review.helpfulCount);

  async function vote() {
    if (status !== "authenticated") {
      router.push(`/login?callbackUrl=${encodeURIComponent(`${pathname}#reviews`)}`);
      return;
    }
    setState("sending");
    const res = await fetch(`/api/reviews/${review.id}/helpful`, { method: "POST" }).catch(() => null);
    const body = (await res?.json().catch(() => null)) as { counted?: boolean } | null;
    if (body?.counted) setCount((n) => n + 1);
    setState("done");
  }

  return (
    <div className="flex items-center gap-2 text-xs text-slate">
      {state === "done" ? (
        <span className="font-medium text-nature">Thanks for your feedback</span>
      ) : (
        <button type="button" disabled={state === "sending"} onClick={() => void vote()} className="inline-flex items-center gap-1.5 hover:text-midnight">
          Was this helpful? <ThumbsUp size={14} />
        </button>
      )}
      {count > 0 && <span>· {count} found this helpful</span>}
    </div>
  );
}

function PhotoViewer({ photos, start, onClose }: { photos: Review["photos"]; start: number; onClose: () => void }) {
  const [index, setIndex] = useState(start);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowRight") setIndex((i) => (i + 1) % photos.length);
      if (event.key === "ArrowLeft") setIndex((i) => (i - 1 + photos.length) % photos.length);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [photos.length, onClose]);

  return (
    <div role="dialog" aria-modal="true" aria-label="Review photos" className="fixed inset-0 z-[400] flex flex-col bg-midnight/95" onClick={onClose}>
      <div className="flex justify-between p-4 text-sm text-white">
        <span>
          {index + 1} / {photos.length}
        </span>
        <button type="button" aria-label="Close" className="rounded-full p-1.5 hover:bg-white/10">
          <X size={22} />
        </button>
      </div>
      <div className="relative flex-1" onClick={(event) => event.stopPropagation()}>
        <Image src={photos[index].url} alt="" fill sizes="100vw" className="object-contain" />
      </div>
      <div className="h-6" />
    </div>
  );
}
