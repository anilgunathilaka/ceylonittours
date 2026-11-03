"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Accessibility,
  BookOpen,
  Bus,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Globe,
  Loader2,
  Lock,
  Minus,
  Plus,
  Users,
  Wallet,
  Zap,
} from "lucide-react";
import { formatDisplayDate } from "@/lib/date";
import { bestOffer, guestCategories, quote, type GroupTier, type Offer, type PriceCategory, type PricingMode, type Season } from "@/lib/products/pricing";
import { addDays, sriLankaToday } from "@/lib/products/slots";
import { cn, formatCurrency } from "@/lib/utils";

/**
 * Booking flow, GetYourGuide style: participants, date and language are picked in the booking
 * box; "Check availability" then lists the options and times for that choice, then the
 * customer's details, then Pay on Arrival. The box and the results share state through context,
 * so the box can sit in the sidebar (desktop) and above the results (mobile).
 */

type ApiSlot = { time: string; remaining: number; status: string };
type ApiOption = {
  id: string;
  title: string;
  description: string;
  durationLabel?: string;
  languages: string[];
  pickupIncluded: boolean;
  isPrivate: boolean;
  pricingMode: PricingMode;
  prices: PriceCategory[];
  groupTiers: GroupTier[];
  seasons: Season[];
  minParticipants: number;
  maxParticipants: number | null;
  instantConfirm: boolean;
  pickupMode: "none" | "area" | "locations";
  pickupArea: string | null;
  pickupLocations: string[];
  pickupTiming: "at_start" | "before_start" | null;
  pickupMinutesBefore: number | null;
  pickupConfirmation: "day_before" | "on_booking" | null;
  wheelchairAccessible: boolean;
  skipTheLine: boolean;
  guideMaterials: string[];
  days: { date: string; slots: ApiSlot[] }[];
};

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const inputClass =
  "w-full rounded-xl border border-border bg-surface px-3.5 text-sm text-midnight placeholder:text-slate/60 focus:border-secondary focus:outline-none";

const monthStart = (date: string) => `${date.slice(0, 7)}-01`;
const shiftMonth = (month: string, delta: number) => {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1 + delta, 1)).toISOString().slice(0, 10);
};
const monthEnd = (start: string) => addDays(shiftMonth(start, 1), -1);

/** "adult:2,child:1" <-> { adult: 2, child: 1 } — keeps the selection in the URL across sign-in */
const parseGuests = (value: string | null) =>
  Object.fromEntries(
    (value ?? "")
      .split(",")
      .map((pair) => pair.split(":"))
      .filter(([key, count]) => /^[a-z_]+$/.test(key ?? "") && /^\d{1,3}$/.test(count ?? ""))
      .map(([key, count]) => [key, Number(count)]),
  ) as Record<string, number>;
const formatGuests = (counts: Record<string, number>) =>
  Object.entries(counts)
    .filter(([, n]) => n > 0)
    .map(([k, n]) => `${k}:${n}`)
    .join(",");

/** An option without listed languages is offered in any of the tour's languages */
const speaks = (option: ApiOption, language: string) => !language || option.languages.length === 0 || option.languages.includes(language);

function useBookingState(packageSlug: string) {
  const today = sriLankaToday();

  const [counts, setCounts] = useState<Record<string, number>>({});
  const [date, setDate] = useState("");
  const [language, setLanguage] = useState("");
  const [month, setMonth] = useState(() => monthStart(today));
  const [checked, setChecked] = useState(false);
  const [selection, setSelection] = useState<{ optionId: string; time: string } | null>(null);
  const [step, setStep] = useState<"select" | "details" | "done" | "confirmed">("select");

  // Restore a selection carried through sign-in (?date=&option=&time=&guests=&step=details).
  // Read after mount rather than with useSearchParams, so the page itself stays statically rendered.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const restoredDate = params.get("date");
    if (!restoredDate || !/^\d{4}-\d{2}-\d{2}$/.test(restoredDate)) return;
    /* eslint-disable react-hooks/set-state-in-effect -- one-time restore from the URL */
    setCounts(parseGuests(params.get("guests")));
    setDate(restoredDate);
    setMonth(monthStart(restoredDate));
    setLanguage(params.get("language") ?? "");
    setChecked(true);
    if (params.get("option") && params.get("time")) setSelection({ optionId: params.get("option")!, time: params.get("time")! });
    if (params.get("step") === "details") setStep("details");
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);
  const [data, setData] = useState<{ month: string; options: ApiOption[]; offers: Offer[] } | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const options = data?.month === month ? data.options : null;

  // Live availability for the month on screen
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/availability?package=${packageSlug}&from=${month}&to=${monthEnd(month)}`, { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(String(res.status)))))
      .then((body: { options: ApiOption[]; offers?: Offer[] }) => {
        if (!cancelled) {
          setData({ month, options: body.options, offers: body.offers ?? [] });
          setLoadError(false);
        }
      })
      .catch(() => !cancelled && setLoadError(true));
    return () => {
      cancelled = true;
    };
  }, [packageSlug, month, refresh]);

  // Guest types and languages across all options; default to 2 of the first type (usually adults)
  const categories = useMemo(() => {
    const seen = new Map<string, PriceCategory>();
    for (const option of options ?? []) for (const c of guestCategories(option)) if (!seen.has(c.category)) seen.set(c.category, c);
    return [...seen.values()];
  }, [options]);
  const languages = useMemo(() => [...new Set((options ?? []).flatMap((o) => o.languages))], [options]);
  const effectiveLanguage = language && languages.includes(language) ? language : (languages[0] ?? "");
  const effectiveCounts = useMemo(() => {
    if (Object.keys(counts).length > 0 || categories.length === 0) return counts;
    return { [categories[0].category]: categories[0].category === "adult" ? 2 : 1 };
  }, [counts, categories]);
  const totalGuests = Object.values(effectiveCounts).reduce((a, b) => a + b, 0);

  const availableDates = useMemo(
    () =>
      new Set(
        (options ?? [])
          .filter((o) => speaks(o, effectiveLanguage))
          .flatMap((o) => o.days.filter((d) => d.slots.some((s) => s.status === "available" && s.remaining >= totalGuests)).map((d) => d.date)),
      ),
    [options, totalGuests, effectiveLanguage],
  );

  const offers = data?.offers ?? [];
  /** Price for an option on the chosen date, with the best special offer applied */
  const priceOf = (option: ApiOption, guestCounts: Record<string, number>, onDate: string) =>
    quote(option, countsFor(option, guestCounts), onDate, onDate ? bestOffer(offers, packageSlug, onDate, today) : undefined);

  return {
    packageSlug,
    today,
    priceOf,
    month,
    setMonth,
    options,
    loadError,
    reload: () => setRefresh((n) => n + 1),
    categories,
    languages,
    counts: effectiveCounts,
    totalGuests,
    setCount(category: string, delta: number) {
      setCounts({ ...effectiveCounts, [category]: Math.max(0, Math.min(50, (effectiveCounts[category] ?? 0) + delta)) });
      setSelection(null);
    },
    date,
    setDate(value: string) {
      setDate(value);
      setSelection(null);
    },
    language: effectiveLanguage,
    setLanguage(value: string) {
      setLanguage(value);
      setSelection(null);
    },
    availableDates,
    checked,
    setChecked,
    selection,
    setSelection,
    step,
    setStep,
  };
}

type BookingState = ReturnType<typeof useBookingState>;
const BookingContext = createContext<BookingState | null>(null);

function useBooking() {
  const value = useContext(BookingContext);
  if (!value) throw new Error("useBooking must be used inside <BookingProvider>");
  return value;
}

export function BookingProvider({ packageSlug, children }: { packageSlug: string; children: ReactNode }) {
  const state = useBookingState(packageSlug);
  return <BookingContext.Provider value={state}>{children}</BookingContext.Provider>;
}

/** Click-outside popover used by the participant and date pickers */
function Popover({ label, icon, value, children }: { label: string; icon: ReactNode; value: string; children: (close: () => void) => ReactNode }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => !ref.current?.contains(event.target as Node) && setOpen(false);
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-label={label}
        onClick={() => setOpen((v) => !v)}
        className="flex h-12 w-full items-center gap-2.5 rounded-full border border-border bg-surface px-4 text-left text-sm font-semibold text-midnight transition-colors hover:border-primary/50"
      >
        <span className="text-slate">{icon}</span>
        <span className="flex-1 truncate">{value}</span>
        <ChevronDown size={16} className={cn("text-slate transition-transform", open && "rotate-180")} />
      </button>
      {open && <div className="absolute top-full right-0 left-0 z-30 mt-2 min-w-72 rounded-2xl bg-surface p-4 shadow-card-hover ring-1 ring-border">{children(() => setOpen(false))}</div>}
    </div>
  );
}

/** Participants, date and language pickers plus "Check availability" (the booking box). */
export function BookingBox() {
  const b = useBooking();
  const guestsLabel =
    b.categories.length === 0
      ? "Participants"
      : b.categories
          .filter((c) => (b.counts[c.category] ?? 0) > 0)
          .map((c) => `${c.label} × ${b.counts[c.category]}`)
          .join(", ") || "Add participants";

  function check() {
    b.setChecked(true);
    b.setStep("select");
    // Bring the options into view
    requestAnimationFrame(() => document.getElementById("book")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  return (
    <div className="flex flex-col gap-3">
      <Popover label="Participants" icon={<Users size={17} />} value={guestsLabel}>
        {(close) => (
          <div className="flex flex-col gap-3">
            {b.categories.map((c) => (
              <div key={c.category} className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-semibold text-midnight">{c.label}</p>
                  {(c.ageMin !== undefined || c.ageMax !== undefined) && (
                    <p className="text-xs text-slate">{c.ageMax !== undefined ? `Age ${c.ageMin ?? 0}–${c.ageMax}` : `Age ${c.ageMin}+`}</p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <Stepper label={`Fewer ${c.label}`} disabled={(b.counts[c.category] ?? 0) === 0} onClick={() => b.setCount(c.category, -1)}>
                    <Minus size={14} />
                  </Stepper>
                  <span className="w-5 text-center font-semibold text-midnight" aria-live="polite">
                    {b.counts[c.category] ?? 0}
                  </span>
                  <Stepper label={`More ${c.label}`} onClick={() => b.setCount(c.category, 1)}>
                    <Plus size={14} />
                  </Stepper>
                </div>
              </div>
            ))}
            {b.categories.length === 0 && <p className="text-sm text-slate">Loading…</p>}
            <button type="button" onClick={close} className="mt-1 h-10 rounded-full bg-primary text-sm font-semibold text-white hover:bg-primary-dark">
              Done
            </button>
          </div>
        )}
      </Popover>

      <Popover label="Date" icon={<CalendarDays size={17} />} value={b.date ? (formatDisplayDate(b.date) ?? b.date) : "Select date"}>
        {(close) => (
          <MonthCalendar
            month={b.month}
            today={b.today}
            selected={b.date}
            available={b.availableDates}
            loading={!b.options && !b.loadError}
            onMonth={(delta) => b.setMonth(shiftMonth(b.month, delta))}
            onSelect={(d) => {
              b.setDate(d);
              close();
            }}
          />
        )}
      </Popover>

      {b.languages.length > 0 && (
        <label className="relative">
          <span className="sr-only">Guide language</span>
          <Globe size={17} className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-slate" />
          <select
            value={b.language}
            onChange={(event) => b.setLanguage(event.target.value)}
            className="h-12 w-full appearance-none rounded-full border border-border bg-surface pr-10 pl-11 text-sm font-semibold text-midnight hover:border-primary/50 focus:outline-none"
          >
            {b.languages.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
          <ChevronDown size={16} className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-slate" />
        </label>
      )}

      {b.loadError && (
        <p className="text-sm text-accent-dark">
          Couldn&apos;t load availability.{" "}
          <button type="button" className="font-semibold underline" onClick={b.reload}>
            Try again
          </button>
        </p>
      )}

      <button
        type="button"
        onClick={check}
        className="h-12 rounded-full bg-accent text-sm font-semibold text-white shadow-card transition-colors hover:bg-accent-dark"
      >
        Check availability
      </button>
    </div>
  );
}

/** Options and times for the chosen participants/date/language, then details and confirmation. */
export function BookingResults({ questions }: { questions: { question: string; required?: boolean }[] }) {
  const b = useBooking();
  const router = useRouter();
  const pathname = usePathname();
  const { data: session, status: authStatus } = useSession();

  const selectedOption = b.options?.find((o) => o.id === b.selection?.optionId);
  const selectedQuote = selectedOption ? b.priceOf(selectedOption, b.counts, b.date) : null;

  if (!b.checked) return null;
  if (b.step === "done" || b.step === "confirmed") return <BookingDone confirmed={b.step === "confirmed"} />;

  if (b.step === "details" && selectedOption && b.selection && selectedQuote?.ok) {
    return (
      <DetailsStep
        packageSlug={b.packageSlug}
        option={selectedOption}
        date={b.date}
        time={b.selection.time}
        language={b.language}
        counts={countsFor(selectedOption, b.counts)}
        lines={selectedQuote.lines}
        total={selectedQuote.total}
        questions={questions}
        defaultName={session?.user?.name ?? ""}
        onBack={() => b.setStep("select")}
        onDone={(confirmed) => b.setStep(confirmed ? "confirmed" : "done")}
        onSlotGone={() => {
          b.setStep("select");
          b.setSelection(null);
          b.reload();
        }}
      />
    );
  }

  function continueToDetails() {
    if (!b.selection) return;
    if (authStatus !== "authenticated") {
      const next = new URLSearchParams({
        date: b.date,
        option: b.selection.optionId,
        time: b.selection.time,
        guests: formatGuests(b.counts),
        step: "details",
        ...(b.language ? { language: b.language } : {}),
      });
      const callbackUrl = `${pathname}?${next}#book`;
      router.push(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}&from=${encodeURIComponent(pathname)}`);
      return;
    }
    b.setStep("details");
  }

  if (!b.date) {
    return <p className="rounded-xl bg-primary/5 px-4 py-3 text-sm text-midnight">Select a date in the booking box to see the options and times.</p>;
  }
  if (!b.options) return <div className="h-40 animate-pulse rounded-2xl bg-midnight/5" />;

  const forDate = b.options.filter((o) => speaks(o, b.language) && o.days.some((d) => d.date === b.date));

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-slate">
        {formatDisplayDate(b.date)} · {b.totalGuests} participant{b.totalGuests === 1 ? "" : "s"}
        {b.language && ` · ${b.language}`}
      </p>
      {forDate.length === 0 && (
        <p className="rounded-xl bg-midnight/5 px-4 py-3 text-sm text-slate">
          No departures on this date{b.language ? ` in ${b.language}` : ""} — pick a highlighted date in the booking box.
        </p>
      )}
      {forDate.map((option) => {
        const day = option.days.find((d) => d.date === b.date)!;
        const priced = b.priceOf(option, b.counts, b.date);
        const selectedHere = b.selection?.optionId === option.id;
        return (
          <div key={option.id} className={cn("flex flex-col gap-4 rounded-2xl border p-5 transition-colors", selectedHere ? "border-primary bg-primary/[0.03]" : "border-border")}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-display text-lg font-semibold text-midnight">{option.title}</p>
                {option.description && <p className="mt-1 text-sm text-slate">{option.description}</p>}
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate">
                  {option.durationLabel && (
                    <span className="flex items-center gap-1">
                      <Clock size={13} /> {option.durationLabel}
                    </span>
                  )}
                  {option.languages.length > 0 && (
                    <span className="flex items-center gap-1">
                      <Globe size={13} /> {option.languages.join(", ")}
                    </span>
                  )}
                  {option.pickupIncluded && (
                    <span className="flex items-center gap-1">
                      <Bus size={13} /> Pickup included
                    </span>
                  )}
                  {option.isPrivate && (
                    <span className="flex items-center gap-1">
                      <Lock size={13} /> Private group
                    </span>
                  )}
                  {option.wheelchairAccessible && (
                    <span className="flex items-center gap-1">
                      <Accessibility size={13} /> Wheelchair accessible
                    </span>
                  )}
                  {option.skipTheLine && (
                    <span className="flex items-center gap-1">
                      <Zap size={13} /> Skip the line
                    </span>
                  )}
                  {option.guideMaterials.length > 0 && (
                    <span className="flex items-center gap-1">
                      <BookOpen size={13} /> {option.guideMaterials.join(", ")}
                    </span>
                  )}
                </div>
                {option.instantConfirm && (
                  <p className="mt-2 flex items-center gap-1 text-xs font-semibold text-nature">
                    <Zap size={13} /> Instant confirmation
                  </p>
                )}
              </div>
              <div className="text-right">
                {priced.ok ? (
                  <>
                    {priced.offer && (
                      <p className="flex items-center justify-end gap-2 text-sm">
                        <span className="rounded-full bg-accent/10 px-2 py-0.5 text-xs font-semibold text-accent-dark">Save {priced.offer.discountPercent}%</span>
                        <span className="text-slate line-through">{formatCurrency(priced.fullTotal)}</span>
                      </p>
                    )}
                    <p className="font-display text-2xl font-semibold text-accent">{formatCurrency(priced.total)}</p>
                    {priced.offer && <p className="text-xs font-medium text-accent-dark">{priced.offer.name}</p>}
                    <p className="text-xs text-slate">
                      {b.totalGuests} participant{b.totalGuests === 1 ? "" : "s"} · taxes included
                    </p>
                  </>
                ) : (
                  <p className="max-w-48 text-sm font-medium text-accent-dark">{priced.error}</p>
                )}
              </div>
            </div>
            {priced.ok && (
              <div className="flex flex-wrap gap-2">
                {day.slots.map((slot) => {
                  const open = slot.status === "available" && slot.remaining >= b.totalGuests;
                  const chosen = selectedHere && b.selection?.time === slot.time;
                  return (
                    <button
                      key={slot.time}
                      type="button"
                      disabled={!open}
                      onClick={() => b.setSelection({ optionId: option.id, time: slot.time })}
                      className={cn(
                        "flex min-w-24 flex-col items-center rounded-xl px-4 py-2 text-sm font-semibold ring-1 transition-colors",
                        chosen
                          ? "bg-primary text-white ring-primary"
                          : open
                            ? "bg-surface text-midnight ring-border hover:ring-primary"
                            : "cursor-not-allowed bg-midnight/5 text-slate/60 ring-transparent",
                      )}
                    >
                      <span className={cn(!open && "line-through")}>{slot.time}</span>
                      {open && slot.remaining <= 5 && <span className={cn("text-[11px] font-medium", chosen ? "text-white/80" : "text-accent-dark")}>{slot.remaining} left</span>}
                      {!open && <span className="text-[11px] font-medium">{slot.status === "available" ? "Not enough spots" : slot.status === "full" ? "Sold out" : "Unavailable"}</span>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      <div className="flex flex-col gap-3 rounded-2xl bg-primary/5 p-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-center gap-2 text-sm text-midnight">
          <Wallet size={18} className="shrink-0 text-nature" />
          <span>
            <strong>Pay on arrival.</strong> Reserve now — nothing to pay online.
          </span>
        </p>
        <button
          type="button"
          disabled={!b.selection || !selectedQuote?.ok || authStatus === "loading"}
          onClick={continueToDetails}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-primary px-7 text-sm font-semibold text-white shadow-card transition-colors hover:bg-primary-dark disabled:opacity-50"
        >
          {b.selection && selectedQuote?.ok ? `Continue · ${formatCurrency(selectedQuote.total)}` : "Choose a time"}
        </button>
      </div>
    </div>
  );
}

/** Only the guest types an option prices; others are dropped (e.g. "infant" on an adults-only option) */
function countsFor(option: ApiOption, counts: Record<string, number>) {
  const known = new Set(guestCategories(option).map((c) => c.category));
  const result: Record<string, number> = {};
  let unknown = 0;
  for (const [k, n] of Object.entries(counts)) {
    if (known.has(k)) result[k] = n;
    else unknown += n;
  }
  // Group-priced options without guest types count everyone as "participant"
  if (unknown > 0 && known.has("participant")) result.participant = (result.participant ?? 0) + unknown;
  else if (unknown > 0) result.__unknown = unknown;
  return result;
}

function Stepper({ label, disabled, onClick, children }: { label: string; disabled?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="flex h-9 w-9 items-center justify-center rounded-full text-primary ring-1 ring-primary/40 transition-colors hover:bg-primary/5 disabled:text-slate/40 disabled:ring-border"
    >
      {children}
    </button>
  );
}

function MonthCalendar({
  month,
  today,
  selected,
  available,
  loading,
  onMonth,
  onSelect,
}: {
  month: string;
  today: string;
  selected: string;
  available: Set<string>;
  loading: boolean;
  onMonth: (delta: number) => void;
  onSelect: (date: string) => void;
}) {
  const [y, m] = month.split("-").map(Number);
  const first = new Date(Date.UTC(y, m - 1, 1));
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const cells = [...Array.from({ length: first.getUTCDay() }, () => null), ...Array.from({ length: days }, (_, i) => `${month.slice(0, 7)}-${String(i + 1).padStart(2, "0")}`)];

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <span className="font-semibold text-midnight">{first.toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" })}</span>
        <div className="flex items-center gap-1">
          {loading && <Loader2 size={15} className="mr-1 animate-spin text-slate" />}
          <button type="button" aria-label="Previous month" disabled={month <= monthStart(today)} onClick={() => onMonth(-1)} className="rounded-full p-1.5 text-slate hover:bg-midnight/5 disabled:opacity-30">
            <ChevronLeft size={18} />
          </button>
          <button type="button" aria-label="Next month" onClick={() => onMonth(1)} className="rounded-full p-1.5 text-slate hover:bg-midnight/5">
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {WEEKDAYS.map((w) => (
          <span key={w} className="text-center text-xs font-semibold text-slate">
            {w}
          </span>
        ))}
        {cells.map((d, i) => {
          if (!d) return <span key={`e${i}`} />;
          const open = available.has(d);
          return (
            <button
              key={d}
              type="button"
              disabled={!open}
              onClick={() => onSelect(d)}
              aria-pressed={d === selected}
              className={cn(
                "flex aspect-square items-center justify-center rounded-lg text-sm transition-colors",
                d === selected ? "bg-primary font-semibold text-white" : open ? "bg-nature/10 font-semibold text-nature hover:bg-nature/20" : "text-slate/40",
                d === today && d !== selected && "ring-1 ring-primary/40",
              )}
            >
              {Number(d.slice(8))}
            </button>
          );
        })}
      </div>
      <p className="mt-3 text-xs text-slate">Highlighted dates have space for your group.</p>
    </div>
  );
}

function DetailsStep({
  packageSlug,
  option,
  date,
  time,
  language,
  counts,
  lines,
  total,
  questions,
  defaultName,
  onBack,
  onDone,
  onSlotGone,
}: {
  packageSlug: string;
  option: ApiOption;
  date: string;
  time: string;
  language: string;
  counts: Record<string, number>;
  lines: { label: string; count: number; unitPrice: number }[];
  total: number;
  questions: { question: string; required?: boolean }[];
  defaultName: string;
  onBack: () => void;
  onDone: (confirmed: boolean) => void;
  onSlotGone: () => void;
}) {
  const [error, setError] = useState<string>();
  const [slotGone, setSlotGone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(undefined);
    const form = new FormData(event.currentTarget);
    setSubmitting(true);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          packageSlug,
          optionId: option.id,
          date,
          startTime: time,
          language: language || undefined,
          pickupLocation: option.pickupMode === "none" ? undefined : String(form.get("pickupLocation") ?? ""),
          counts,
          name: form.get("name"),
          phone: form.get("phone"),
          message: form.get("message") || undefined,
          answers: questions.map((q, i) => ({ question: q.question, answer: String(form.get(`answer-${i}`) ?? "") })),
        }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string; status?: string };
      if (res.ok) return onDone(body.status === "confirmed");
      setError(body.error ?? "Something went wrong — please try again.");
      setSlotGone(res.status === 409);
    } catch {
      setError("Something went wrong — please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
      <div className="flex flex-col gap-4">
        <button type="button" onClick={onBack} className="inline-flex items-center gap-1 self-start text-sm font-semibold text-slate hover:text-midnight">
          <ChevronLeft size={16} /> Change option or time
        </button>
        <p className="font-display text-xl font-semibold text-midnight">Your details</p>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold tracking-wide text-slate uppercase">Lead traveller name *</span>
          <input name="name" required minLength={2} defaultValue={defaultName} autoComplete="name" className={cn(inputClass, "h-11")} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold tracking-wide text-slate uppercase">Mobile / WhatsApp *</span>
          <input name="phone" required type="tel" autoComplete="tel" placeholder="+94 77 123 4567" className={cn(inputClass, "h-11")} />
          <span className="text-xs text-slate">Your guide will contact you on this number.</span>
        </label>
        {option.pickupMode !== "none" && (
          <div className="flex flex-col gap-1.5 rounded-2xl bg-primary/5 p-4">
            <span className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-slate uppercase">
              <Bus size={14} /> Pickup *
            </span>
            {option.pickupMode === "locations" ? (
              <select name="pickupLocation" required defaultValue="" className={cn(inputClass, "h-11")}>
                <option value="" disabled>
                  Choose your pickup location
                </option>
                {option.pickupLocations.map((loc) => (
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
                ))}
              </select>
            ) : (
              <input name="pickupLocation" required maxLength={300} placeholder="Hotel name or address" className={cn(inputClass, "h-11")} />
            )}
            <span className="text-xs text-slate">{pickupNote(option)}</span>
          </div>
        )}
        {questions.map((q, i) => (
          <label key={q.question} className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold tracking-wide text-slate uppercase">
              {q.question}
              {q.required && " *"}
            </span>
            <input name={`answer-${i}`} required={q.required} maxLength={1000} className={cn(inputClass, "h-11")} />
          </label>
        ))}
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold tracking-wide text-slate uppercase">Anything else? (optional)</span>
          <textarea name="message" rows={3} maxLength={2000} className={cn(inputClass, "resize-none py-2.5")} />
        </label>
      </div>

      <div className="flex flex-col gap-4 self-start rounded-2xl border border-border p-5">
        <p className="font-display text-lg font-semibold text-midnight">{option.title}</p>
        <p className="flex items-center gap-2 text-sm text-midnight">
          <CalendarDays size={16} className="text-slate" /> {formatDisplayDate(date)} at {time}
        </p>
        {language && (
          <p className="flex items-center gap-2 text-sm text-midnight">
            <Globe size={16} className="text-slate" /> {language}
          </p>
        )}
        <ul className="flex flex-col gap-1 border-t border-border pt-3 text-sm text-midnight">
          {lines.map((line) => (
            <li key={line.label} className="flex justify-between">
              <span>
                {line.count} × {line.label}
              </span>
              {option.pricingMode === "per_person" && <span>{formatCurrency(line.unitPrice * line.count)}</span>}
            </li>
          ))}
        </ul>
        <p className="flex items-baseline justify-between border-t border-border pt-3">
          <span className="font-semibold text-midnight">Total</span>
          <span className="font-display text-2xl font-semibold text-accent">{formatCurrency(total)}</span>
        </p>
        <p className="flex items-start gap-2 rounded-xl bg-nature/10 px-3 py-2.5 text-sm text-midnight">
          <Wallet size={16} className="mt-0.5 shrink-0 text-nature" /> Pay on arrival — cash or card to your guide on the day.
        </p>
        {error && (
          <p role="alert" className="text-sm font-medium text-accent-dark">
            {error}{" "}
            {slotGone && (
              <button type="button" onClick={onSlotGone} className="underline">
                Pick another time
              </button>
            )}
          </p>
        )}
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-primary px-7 text-sm font-semibold text-white shadow-card hover:bg-primary-dark disabled:opacity-60"
        >
          {submitting && <Loader2 size={16} className="animate-spin" />}
          Book now
        </button>
        <p className="text-xs text-slate">
          {option.instantConfirm
            ? "Instant confirmation — your booking is confirmed straight away."
            : "We'll confirm your booking by email, usually within a few hours."}
        </p>
      </div>
    </form>
  );
}

/** Pickup area, timing and confirmation, as one sentence for the customer */
function pickupNote(option: ApiOption) {
  return [
    option.pickupMode === "area" && option.pickupArea && `Pickup area: ${option.pickupArea}.`,
    option.pickupTiming === "before_start" &&
      `Pickup is usually ${option.pickupMinutesBefore ? `up to ${option.pickupMinutesBefore} minutes` : "shortly"} before the start time.`,
    option.pickupTiming === "at_start" && "Pickup is at the start time.",
    option.pickupConfirmation === "day_before" && "We'll confirm the exact pickup time the day before.",
    option.pickupConfirmation === "on_booking" && "We'll confirm the exact pickup time after you book.",
  ]
    .filter(Boolean)
    .join(" ");
}

function BookingDone({ confirmed }: { confirmed: boolean }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl bg-nature/10 p-10 text-center">
      <CheckCircle2 size={44} className="text-nature" />
      <p className="font-display text-2xl font-semibold text-midnight">{confirmed ? "Booking confirmed" : "Booking received"}</p>
      <p className="max-w-md text-sm text-slate">
        {confirmed
          ? "You're all set! Your confirmation is in your profile and on its way by email. Payment is on arrival."
          : "Thanks! Your spots are held while our team confirms your booking — you'll get an email shortly. Payment is on arrival."}
      </p>
      <Link href="/profile" className="mt-1 text-sm font-semibold text-primary hover:underline">
        View my bookings
      </Link>
    </div>
  );
}
