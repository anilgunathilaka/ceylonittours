"use client";

import { useActionState, useRef, useState, useTransition, type FormEvent } from "react";
import { ImagePlus, Loader2, Star, X } from "lucide-react";
import { submitReviewAction, type ReviewFormState } from "@/app/profile/reviews/actions";
import { cn } from "@/lib/utils";

const LABELS = ["", "Poor", "Fair", "Good", "Very good", "Excellent"];
const MAX_PHOTOS = 5;
const COUNTRIES = [
  "Sri Lanka", "India", "United Kingdom", "Germany", "France", "Netherlands", "Italy", "Spain", "Switzerland", "Belgium",
  "Austria", "Poland", "Russia", "United States", "Canada", "Australia", "New Zealand", "China", "Japan", "South Korea",
  "Singapore", "Malaysia", "Maldives", "United Arab Emirates", "Saudi Arabia", "Israel", "Sweden", "Norway", "Denmark", "Ireland",
];
const inputClass =
  "w-full rounded-xl border border-border bg-surface px-3.5 text-sm text-midnight placeholder:text-slate/60 focus:border-secondary focus:outline-none";
const initialState: ReviewFormState = { ok: false };

function StarInput({ name, label, size = 34, required }: { name: string; label: string; size?: number; required?: boolean }) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const shown = hover || rating;
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <input type="hidden" name={name} value={rating || ""} />
      <span className={cn("text-sm font-medium text-midnight", size < 30 && "w-36")}>
        {label}
        {required && " *"}
      </span>
      <div className="flex items-center gap-0.5" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((value) => (
          <button
            key={value}
            type="button"
            aria-label={`${label}: ${value} star${value === 1 ? "" : "s"} — ${LABELS[value]}`}
            aria-pressed={rating === value}
            onMouseEnter={() => setHover(value)}
            onClick={() => setRating(rating === value && !required ? 0 : value)}
            className="rounded-md p-0.5"
          >
            <Star size={size} className={cn("transition-colors", value <= shown ? "fill-gold text-gold" : "text-border")} />
          </button>
        ))}
      </div>
      <span className="text-sm font-semibold text-midnight">{LABELS[shown]}</span>
    </div>
  );
}

export function ReviewForm({ bookingId }: { bookingId: string }) {
  const [state, formAction] = useActionState(submitReviewAction, initialState);
  const [pending, startTransition] = useTransition();
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(0);
  const [photoError, setPhotoError] = useState<string>();
  const fileInput = useRef<HTMLInputElement>(null);
  const errors = state.errors ?? {};


  async function upload(files: File[]) {
    setPhotoError(undefined);
    for (const file of files.slice(0, MAX_PHOTOS - photos.length)) {
      setUploading((n) => n + 1);
      try {
        const body = new FormData();
        body.set("file", file);
        const res = await fetch("/api/reviews/photos", { method: "POST", body });
        const result = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
        if (!res.ok || !result.url) throw new Error(result.error ?? "Upload failed — please try again.");
        setPhotos((list) => [...list, result.url!].slice(0, MAX_PHOTOS));
      } catch (error) {
        setPhotoError(error instanceof Error ? error.message : "Upload failed — please try again.");
      } finally {
        setUploading((n) => n - 1);
      }
    }
    if (fileInput.current) fileInput.current.value = "";
  }

  // Transition submit keeps what was typed if validation fails
  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    // Browser language, for "Loved by English speakers"-style stats
    formData.set("language", navigator.language?.slice(0, 2).toLowerCase() ?? "");
    startTransition(() => formAction(formData));
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6" noValidate>
      <input type="hidden" name="bookingId" value={bookingId} />
      <input type="hidden" name="photos" value={JSON.stringify(photos)} />

      <div className="flex flex-col gap-1">
        <StarInput name="rating" label="Overall" required />
        {errors.rating && <span className="text-xs font-medium text-accent-dark">{errors.rating}</span>}
      </div>

      <fieldset className="flex flex-col gap-2 rounded-2xl bg-ivory/60 p-4">
        <legend className="mb-1 text-xs font-semibold tracking-wide text-slate uppercase">Rate the details (optional)</legend>
        <StarInput name="guideRating" label="Guide" size={22} />
        <StarInput name="transportRating" label="Transportation" size={22} />
        <StarInput name="valueRating" label="Value for money" size={22} />
      </fieldset>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold tracking-wide text-slate uppercase">Title (optional)</span>
        <input name="title" maxLength={120} placeholder="Sum up your trip" className={cn(inputClass, "h-11")} />
        {errors.title && <span className="text-xs font-medium text-accent-dark">{errors.title}</span>}
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold tracking-wide text-slate uppercase">Your review *</span>
        <textarea
          name="text"
          rows={6}
          maxLength={3000}
          placeholder="What did you enjoy? How was your guide? Any tips for other travellers?"
          className={cn(inputClass, "resize-y py-2.5")}
        />
        {errors.text && <span className="text-xs font-medium text-accent-dark">{errors.text}</span>}
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold tracking-wide text-slate uppercase">Where are you from? (optional)</span>
        <input name="country" list="review-countries" maxLength={60} placeholder="e.g. United Kingdom" className={cn(inputClass, "h-11")} />
        <datalist id="review-countries">
          {COUNTRIES.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
        {errors.country && <span className="text-xs font-medium text-accent-dark">{errors.country}</span>}
      </label>

      <div className="flex flex-col gap-2">
        <span className="text-xs font-semibold tracking-wide text-slate uppercase">Photos (optional, up to {MAX_PHOTOS})</span>
        <div className="flex flex-wrap gap-3">
          {photos.map((url) => (
            <div key={url} className="relative h-24 w-24 overflow-hidden rounded-xl ring-1 ring-border">
              {/* eslint-disable-next-line @next/next/no-img-element -- preview of the customer's own upload */}
              <img src={url} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                aria-label="Remove photo"
                onClick={() => setPhotos((list) => list.filter((p) => p !== url))}
                className="absolute top-1 right-1 rounded-full bg-midnight/70 p-1 text-white hover:bg-midnight"
              >
                <X size={13} />
              </button>
            </div>
          ))}
          {photos.length < MAX_PHOTOS && (
            <label className="flex h-24 w-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border text-xs font-medium text-slate hover:border-primary/50 hover:text-primary">
              {uploading > 0 ? <Loader2 size={20} className="animate-spin" /> : <ImagePlus size={20} />}
              {uploading > 0 ? "Uploading…" : "Add photos"}
              <input
                ref={fileInput}
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp,image/avif"
                className="sr-only"
                onChange={(event) => void upload(Array.from(event.target.files ?? []))}
              />
            </label>
          )}
        </div>
        {(photoError || errors.photos) && <span className="text-xs font-medium text-accent-dark">{photoError ?? errors.photos}</span>}
      </div>

      {state.message && !state.ok && !Object.keys(errors).length && (
        <p role="alert" className="text-sm font-medium text-accent-dark">
          {state.message}
        </p>
      )}

      <button
        type="submit"
        disabled={pending || uploading > 0}
        className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-primary px-7 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-60"
      >
        {pending && <Loader2 size={16} className="animate-spin" />}
        Submit review
      </button>
      <p className="text-xs text-slate">
        Reviews are checked by our team before they appear on the tour page. Only your first name, initial and country are shown.
      </p>
    </form>
  );
}
