"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, MapPin } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { getDestinationBySlug } from "@/lib/data/destinations";
import { isDateAvailable } from "@/lib/availability";
import { formatDisplayDate, getMonthGrid, startOfDay, toISODate, weekdayLabels } from "@/lib/date";
import { cn } from "@/lib/utils";

export function AvailabilityCalendar() {
  const searchParams = useSearchParams();
  const destinationSlug = searchParams.get("destination") ?? "";
  const requestedDate = searchParams.get("date") ?? "";
  const destination = getDestinationBySlug(destinationSlug);

  const [viewDate, setViewDate] = useState(() => {
    const parsed = requestedDate ? new Date(`${requestedDate}T00:00:00`) : new Date();
    return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  });
  const [selectedDate, setSelectedDate] = useState(requestedDate);

  const today = startOfDay(new Date());
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const cells = useMemo(() => getMonthGrid(year, month), [year, month]);

  if (!destination) {
    return (
      <div className="mx-auto max-w-lg py-16 text-center">
        <h1 className="font-display text-2xl font-semibold text-midnight">Choose a destination first</h1>
        <p className="mt-3 text-slate">
          Pick a destination from the search bar on the homepage to see its availability calendar.
        </p>
        <Link href="/" className="mt-6 inline-block font-semibold text-primary hover:underline">
          Back to homepage
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/tour-packages" className="text-sm font-semibold text-slate transition-colors hover:text-primary">
        &larr; Back to all tours
      </Link>

      <div className="mt-4">
        <p className="flex items-center gap-1.5 text-sm font-semibold tracking-wide text-accent uppercase">
          <MapPin size={14} /> {destination.region}
        </p>
        <h1 className="mt-1 font-display text-3xl font-bold text-midnight sm:text-4xl">
          Availability — {destination.name}
        </h1>
        <p className="mt-2 max-w-xl text-slate">{destination.tagline}</p>
      </div>

      <div className="mt-8 rounded-3xl border border-border bg-white p-6 shadow-card sm:p-8">
        <div className="flex items-center justify-between">
          <span className="text-lg font-semibold text-midnight">
            {viewDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label="Previous month"
              onClick={() => setViewDate(new Date(year, month - 1, 1))}
              className="flex h-9 w-9 items-center justify-center rounded-full text-slate transition-colors hover:bg-ivory"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              aria-label="Next month"
              onClick={() => setViewDate(new Date(year, month + 1, 1))}
              className="flex h-9 w-9 items-center justify-center rounded-full text-slate transition-colors hover:bg-ivory"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-7 gap-1.5 sm:gap-2">
          {weekdayLabels.map((w) => (
            <span key={w} className="text-center text-xs font-semibold text-slate">
              {w}
            </span>
          ))}

          {cells.map(({ date: cellDate, inMonth }, i) => {
            const iso = toISODate(cellDate);
            const isPast = cellDate < today;
            const available = inMonth && !isPast && isDateAvailable(destination.slug, iso);
            const unavailable = inMonth && !isPast && !available;
            const isSelected = iso === selectedDate;
            const isToday = cellDate.getTime() === today.getTime();

            return (
              <button
                key={i}
                type="button"
                disabled={!available}
                onClick={() => setSelectedDate(iso)}
                className={cn(
                  "flex aspect-square flex-col items-center justify-center rounded-xl text-sm transition-colors",
                  !inMonth && "text-slate/30",
                  isPast && inMonth && "cursor-not-allowed text-slate/40",
                  available && "cursor-pointer bg-nature/10 font-semibold text-nature hover:bg-nature/20",
                  unavailable && "cursor-not-allowed bg-accent/10 text-accent-dark/70 line-through",
                  isSelected && "ring-2 ring-primary ring-offset-2",
                  isToday && !isSelected && "border border-primary/40",
                )}
              >
                {cellDate.getDate()}
              </button>
            );
          })}
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-5 border-t border-border pt-5 text-sm text-slate">
          <span className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-nature/60" /> Available
          </span>
          <span className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-accent/60" /> Unavailable
          </span>
          <span className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full border border-primary/60" /> Today
          </span>
        </div>
      </div>

      <div className="mt-6 flex flex-col items-start gap-3 rounded-2xl bg-primary/5 p-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-midnight">
          {selectedDate ? (
            <>
              Selected date: <span className="font-semibold">{formatDisplayDate(selectedDate)}</span>
            </>
          ) : (
            "Pick an available date to request a booking."
          )}
        </p>
        {selectedDate && (
          <Button
            href={`/contact?title=${encodeURIComponent(`${destination.name} Tour`)}&date=${selectedDate}`}
            variant="primary"
          >
            Book This Date
          </Button>
        )}
      </div>
    </div>
  );
}
