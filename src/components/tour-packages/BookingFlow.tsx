"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Bus,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Globe,
  Loader2,
  Minus,
  Plus,
  Users,
  Wallet,
  Zap,
} from "lucide-react";
import { formatDisplayDate } from "@/lib/date";
import { guestCategories, quoteWithBestOffer, type GroupTier, type Offer, type PriceCategory, type PricingMode, type Season } from "@/lib/products/pricing";
import { addDays, slotStart, sriLankaToday } from "@/lib/products/slots";
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
/** Booking-panel pickers (participants, date, language) */
const pickerClass =
  "flex h-12 w-full items-center gap-3 rounded-full bg-midnight/[0.06] px-4 text-left text-[15px] font-medium text-midnight transition-colors hover:bg-midnight/[0.09] focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none";
const checkButtonClass =
  "h-12 w-full rounded-full bg-primary text-base font-semibold text-white shadow-card transition-colors hover:bg-primary-dark disabled:opacity-60";
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

  // Month with no space for the group: look up the next date that has some
  const nextKey = options && availableDates.size === 0 ? `${month}|${totalGuests}|${effectiveLanguage}` : null;
  const [next, setNext] = useState<{ key: string; date: string | null } | null>(null);
  useEffect(() => {
    if (!nextKey) return;
    let cancelled = false;
    const params = new URLSearchParams({ package: packageSlug, after: monthEnd(month), guests: String(totalGuests) });
    if (effectiveLanguage) params.set("language", effectiveLanguage);
    fetch(`/api/availability/next?${params}`, { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(String(res.status)))))
      .then((body: { date: string | null }) => !cancelled && setNext({ key: nextKey, date: body.date }))
      .catch(() => !cancelled && setNext({ key: nextKey, date: null }));
    return () => {
      cancelled = true;
    };
  }, [nextKey, packageSlug, month, totalGuests, effectiveLanguage]);
  /** undefined while looking, null when nothing is open in the next year */
  const nextAvailable = !nextKey ? undefined : next?.key === nextKey ? next.date : undefined;
  const nextLoading = !!nextKey && next?.key !== nextKey;

  const offers = data?.offers ?? [];
  /** Price for an option on the chosen date, with the best special offer applied */
  const priceOf = (option: ApiOption, guestCounts: Record<string, number>, onDate: string) =>
    quoteWithBestOffer(option, countsFor(option, guestCounts), onDate, onDate ? offers : [], packageSlug, today);

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
    nextAvailable,
    nextLoading,
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
        className={pickerClass}
      >
        <span className="text-midnight">{icon}</span>
        <span className="flex-1 truncate">{value}</span>
        <ChevronDown size={18} className={cn("text-midnight transition-transform", open && "rotate-180")} />
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
    requestAnimationFrame(() =>
      Array.from(document.querySelectorAll<HTMLElement>("[data-booking-results]"))
        .find((el) => el.offsetParent !== null)
        ?.scrollIntoView({ behavior: "smooth", block: "start" }),
    );
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
            empty={
              b.options
                ? {
                    loading: b.nextLoading,
                    next: b.nextAvailable,
                    onNext: (d) => {
                      b.setMonth(monthStart(d));
                      b.setDate(d);
                      close();
                    },
                  }
                : undefined
            }
          />
        )}
      </Popover>

      {b.languages.length > 0 && (
        <label className="relative">
          <span className="sr-only">Guide language</span>
          <Globe size={17} className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-midnight" />
          <select
            value={b.language}
            onChange={(event) => b.setLanguage(event.target.value)}
            className={cn(pickerClass, "appearance-none pr-10 pl-11")}
          >
            {b.languages.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
          <ChevronDown size={18} className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-midnight" />
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

      <button type="button" onClick={check} className={checkButtonClass}>
        Check availability
      </button>
    </div>
  );
}

/**
 * The same booking panel for tours without bookable options yet: participants, date and language,
 * then "Check availability" sends a booking request (via the contact page) with those details filled in.
 */
export function EnquiryBox({ packageSlug, packageTitle, languages }: { packageSlug: string; packageTitle: string; languages: string[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const { status } = useSession();
  const today = sriLankaToday();
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [date, setDate] = useState("");
  const [month, setMonth] = useState(() => monthStart(today));
  const [language, setLanguage] = useState(languages[0] ?? "");
  const [error, setError] = useState(false);

  // Any date from tomorrow; the team confirms availability
  const available = useMemo(() => {
    const days = new Set<string>();
    for (let d = month; d <= monthEnd(month); d = addDays(d, 1)) if (d > today) days.add(d);
    return days;
  }, [month, today]);

  const guests = [`${adults} adult${adults === 1 ? "" : "s"}`, children > 0 && `${children} child${children === 1 ? "" : "ren"}`].filter(Boolean).join(", ");

  function check() {
    if (!date) {
      setError(true);
      return;
    }
    const params = new URLSearchParams({ package: packageSlug, title: packageTitle, date, guests });
    if (language) params.set("language", language);
    const url = `/contact?${params}`;
    // Booking requests need an account, like the rest of the booking flow
    if (status === "authenticated") router.push(url);
    else router.push(`/login?callbackUrl=${encodeURIComponent(url)}&from=${encodeURIComponent(pathname)}`);
  }

  const counter = (label: string, note: string, value: number, set: (n: number) => void, min: number) => (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="font-semibold text-midnight">{label}</p>
        <p className="text-xs text-slate">{note}</p>
      </div>
      <div className="flex items-center gap-3">
        <Stepper label={`Fewer ${label}`} disabled={value <= min} onClick={() => set(Math.max(min, value - 1))}>
          <Minus size={14} />
        </Stepper>
        <span className="w-5 text-center font-semibold text-midnight" aria-live="polite">
          {value}
        </span>
        <Stepper label={`More ${label}`} onClick={() => set(Math.min(50, value + 1))}>
          <Plus size={14} />
        </Stepper>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-3">
      <Popover label="Participants" icon={<Users size={17} />} value={`Adult × ${adults}${children ? `, Child × ${children}` : ""}`}>
        {(close) => (
          <div className="flex flex-col gap-3">
            {counter("Adult", "Age 12+", adults, setAdults, 1)}
            {counter("Child", "Age 0–11", children, setChildren, 0)}
            <button type="button" onClick={close} className="mt-1 h-10 rounded-full bg-primary text-sm font-semibold text-white hover:bg-primary-dark">
              Done
            </button>
          </div>
        )}
      </Popover>

      <Popover label="Date" icon={<CalendarDays size={17} />} value={date ? (formatDisplayDate(date) ?? date) : "Select date"}>
        {(close) => (
          <MonthCalendar
            month={month}
            today={today}
            selected={date}
            available={available}
            loading={false}
            onMonth={(delta) => setMonth(shiftMonth(month, delta))}
            onSelect={(d) => {
              setDate(d);
              setError(false);
              close();
            }}
          />
        )}
      </Popover>

      {languages.length > 0 && (
        <label className="relative">
          <span className="sr-only">Guide language</span>
          <Globe size={17} className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-midnight" />
          <select value={language} onChange={(event) => setLanguage(event.target.value)} className={cn(pickerClass, "appearance-none pr-10 pl-11")}>
            {languages.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
          <ChevronDown size={18} className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-midnight" />
        </label>
      )}

      {error && <p className="text-sm font-medium text-accent-dark">Select a date first.</p>}

      <button type="button" onClick={check} disabled={status === "loading"} className={checkButtonClass}>
        Check availability
      </button>
      <p className="text-center text-xs text-slate">We confirm availability and your quote within one business day.</p>
    </div>
  );
}

/** Options and times for the chosen participants/date/language, then details and confirmation. */
export function BookingResults({
  questions,
  guideLabel,
  freeCancelHours,
}: {
  questions: { question: string; required?: boolean }[];
  /** e.g. "Driver", "Live tour guide" — shown with the option's languages */
  guideLabel?: string;
  /** Free cancellation up to this many hours before the start ("Cancel for free until …") */
  freeCancelHours?: number;
}) {
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
      const callbackUrl = `${pathname}?${next}`;
      router.push(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}&from=${encodeURIComponent(pathname)}`);
      return;
    }
    b.setStep("details");
  }

  if (!b.date) {
    return <p className="rounded-xl bg-primary/5 px-4 py-3 text-sm text-midnight">Select a date in the booking box to see the options and times.</p>;
  }
  if (!b.options) return <div className="h-40 animate-pulse rounded-2xl bg-midnight/5" />;

  // Options running on this date in the chosen language, with a start time that fits the group
  const openSlots = (option: ApiOption) =>
    option.days.find((d) => d.date === b.date)?.slots.filter((s) => s.status === "available" && s.remaining >= b.totalGuests) ?? [];
  const forDate = b.options.filter((o) => speaks(o, b.language) && o.days.some((d) => d.date === b.date));
  const available = forDate.filter((o) => openSlots(o).length > 0 && b.priceOf(o, b.counts, b.date).ok);
  const unavailable = forDate.length - available.length;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="font-display text-xl font-semibold text-midnight">
          {available.length > 0 ? `Choose from ${available.length} available option${available.length === 1 ? "" : "s"}` : "No options available"}
        </h2>
        <p className="text-sm text-slate">
          {formatDisplayDate(b.date)} · {b.totalGuests} participant{b.totalGuests === 1 ? "" : "s"}
          {b.language && ` · ${b.language}`}
        </p>
      </div>

      {available.length === 0 && (
        <p className="rounded-xl bg-midnight/5 px-4 py-3 text-sm text-slate">
          Nothing left for {b.totalGuests} participant{b.totalGuests === 1 ? "" : "s"} on this date{b.language ? ` in ${b.language}` : ""} — choose another date in the booking box.
        </p>
      )}

      {available.length > 0 && (
        <OptionCarousel>
          {available.map((option) => (
            <OptionCard
              key={option.id}
              option={option}
              date={b.date}
              slots={openSlots(option)}
              quote={b.priceOf(option, b.counts, b.date)}
              selectedTime={b.selection?.optionId === option.id ? b.selection.time : undefined}
              guideLabel={guideLabel}
              language={b.language}
              freeCancelHours={freeCancelHours}
              today={b.today}
              onSelect={(time) => b.setSelection({ optionId: option.id, time })}
              onContinue={continueToDetails}
            />
          ))}
        </OptionCarousel>
      )}

      {unavailable > 0 && available.length > 0 && (
        <p className="text-xs text-slate">
          {unavailable} more option{unavailable === 1 ? " is" : "s are"} full or not available for {b.totalGuests} participants on this date.
        </p>
      )}

      <p className="flex items-center gap-2 text-sm text-midnight">
        <Wallet size={16} className="shrink-0 text-nature" />
        <span>
          <strong>Pay on arrival.</strong> Reserve now — nothing to pay online.
        </span>
      </p>
    </div>
  );
}

/** Horizontal row of option cards with arrow buttons (no visible scrollbar) */
function OptionCarousel({ children }: { children: ReactNode }) {
  const track = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: true, end: true });
  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const update = () => setEdges({ start: el.scrollLeft <= 4, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4 });
    update();
    el.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      el.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [children]);
  const scroll = (direction: 1 | -1) => track.current?.scrollBy({ left: direction * track.current.clientWidth * 0.8, behavior: "smooth" });

  return (
    <div className="relative">
      <div ref={track} className="-mx-1 flex snap-x snap-mandatory items-stretch gap-4 overflow-x-auto px-1 pt-3 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {children}
      </div>
      {!edges.start && (
        <button type="button" aria-label="Previous options" onClick={() => scroll(-1)} className="absolute top-1/2 -left-4 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-surface text-midnight shadow-card-hover ring-1 ring-border">
          <ChevronLeft size={20} />
        </button>
      )}
      {!edges.end && (
        <button type="button" aria-label="More options" onClick={() => scroll(1)} className="absolute top-1/2 -right-4 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-surface text-midnight shadow-card-hover ring-1 ring-border">
          <ChevronRight size={20} />
        </button>
      )}
    </div>
  );
}

const shortDate = (date: Date) => date.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "Asia/Colombo" });
const longDate = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });

/** One bookable option for the chosen date: details, start time, price and Select / Continue */
function OptionCard({
  option,
  date,
  slots,
  quote: priced,
  selectedTime,
  guideLabel,
  language,
  freeCancelHours,
  today,
  onSelect,
  onContinue,
}: {
  option: ApiOption;
  date: string;
  slots: ApiSlot[];
  quote: ReturnType<typeof quoteWithBestOffer>;
  selectedTime?: string;
  guideLabel?: string;
  language: string;
  freeCancelHours?: number;
  today: string;
  onSelect: (time: string) => void;
  onContinue: () => void;
}) {
  const selected = selectedTime !== undefined;
  const [time, setTime] = useState(selectedTime ?? slots[0]?.time ?? "");
  const slot = slots.find((s) => s.time === time) ?? slots[0];
  if (!priced.ok || !slot) return null;

  const cancelUntil = freeCancelHours !== undefined ? new Date(slotStart(date, slot.time).getTime() - freeCancelHours * 3600_000) : undefined;
  const save = priced.fullTotal > priced.total ? Math.round((1 - priced.total / priced.fullTotal) * 100) : 0;
  const breakdown =
    option.pricingMode === "per_group"
      ? `Group of ${priced.totalParticipants}`
      : priced.lines.map((line) => `${line.count} ${line.label} × ${formatCurrency(line.unitPrice)}`).join(", ");
  const facts = [
    option.durationLabel,
    option.isPrivate ? "Private tour" : "Small group",
    option.skipTheLine && "Skip the line",
    option.wheelchairAccessible && "Wheelchair accessible",
    ...option.guideMaterials,
  ].filter(Boolean) as string[];

  return (
    <article
      onClick={() => !selected && onSelect(slot.time)}
      className={cn(
        "relative flex w-[85%] shrink-0 cursor-pointer snap-start flex-col rounded-2xl bg-surface p-4 transition-shadow sm:w-[calc((100%-1rem)/2)] xl:w-[calc((100%-2rem)/3)]",
        selected ? "ring-2 ring-primary" : "ring-1 ring-border hover:shadow-card",
      )}
    >
      {slot.remaining <= 5 && (
        <span className="absolute -top-3 left-3 rounded-md bg-accent-dark px-2 py-0.5 text-xs font-semibold text-white">
          Only {slot.remaining} spot{slot.remaining === 1 ? "" : "s"} left
        </span>
      )}

      <div className="flex items-start justify-between gap-3">
        <h3 className="font-semibold text-midnight">{option.title}</h3>
        <span
          aria-hidden
          className={cn("mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full", selected ? "bg-primary text-white" : "ring-2 ring-border")}
        >
          {selected && <Check size={14} strokeWidth={3} />}
        </span>
      </div>

      {(option.description || facts.length > 0) && (
        <div className="mt-2 text-sm text-slate">
          {option.description && <p className="line-clamp-3">{option.description}</p>}
          {facts.length > 0 && <p>{facts.join(" · ")}</p>}
        </div>
      )}

      <ul className="mt-3 flex flex-col gap-2 text-sm text-midnight">
        {(option.languages.length > 0 || guideLabel) && (
          <li className="flex items-center gap-2">
            <Users size={16} className="shrink-0 text-slate" /> {guideLabel ?? "Guide"}: {language || option.languages.join(", ")}
          </li>
        )}
        <li className="flex items-center gap-2">
          <Wallet size={16} className="shrink-0 text-slate" /> Reserve now & pay on arrival
        </li>
        {cancelUntil && sriLankaToday(cancelUntil) >= today && (
          <li className="flex items-center gap-2">
            <CalendarDays size={16} className="shrink-0 text-slate" /> Cancel for free until {shortDate(cancelUntil)}
          </li>
        )}
        {option.pickupMode !== "none" && (
          <li className="flex items-center gap-2">
            <Bus size={16} className="shrink-0 text-slate" /> {option.pickupMode === "area" ? "Pickup in area" : "Pickup included"}
          </li>
        )}
        {option.instantConfirm && (
          <li className="flex items-center gap-2 font-medium text-nature">
            <Zap size={16} className="shrink-0" /> Instant confirmation
          </li>
        )}
      </ul>

      <div className="mt-4 border-t border-border pt-4">
        <p className="text-sm font-semibold text-midnight">Select a starting time</p>
        <p className="text-sm text-slate">{longDate(date)}</p>
        <label className="relative mt-2 inline-block" onClick={(event) => event.stopPropagation()}>
          <span className="sr-only">Starting time</span>
          <select
            value={slot.time}
            onChange={(event) => {
              setTime(event.target.value);
              onSelect(event.target.value);
            }}
            className="h-11 appearance-none rounded-xl border-2 border-midnight/80 bg-surface pr-10 pl-4 text-sm font-semibold text-midnight focus:border-primary focus:outline-none"
          >
            {slots.map((s) => (
              <option key={s.time} value={s.time}>
                {formatTime(s.time)}
              </option>
            ))}
          </select>
          <ChevronDown size={16} className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-midnight" />
        </label>
      </div>

      <div className="mt-4 border-t border-border pt-4">
        <p className="flex flex-wrap items-baseline gap-x-2">
          <span className="text-xl font-bold text-midnight">{formatCurrency(priced.total)}</span>
          {save > 0 && (
            <>
              <span className="text-sm text-slate line-through">{formatCurrency(priced.fullTotal)}</span>
              <span className="text-sm font-semibold text-accent-dark">-{save}%</span>
            </>
          )}
        </p>
        <p className="text-sm text-slate">{breakdown}</p>
        <p className="text-xs text-slate">All taxes and fees included</p>
      </div>

      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          if (selected) onContinue();
          else onSelect(slot.time);
        }}
        className={cn(
          "mt-4 h-11 rounded-full text-sm font-semibold transition-colors",
          selected ? "bg-primary text-white hover:bg-primary-dark" : "text-primary ring-2 ring-primary hover:bg-primary/5",
        )}
      >
        {selected ? "Continue" : "Select"}
      </button>
    </article>
  );
}

/** "07:00" → "7:00 AM" */
function formatTime(time: string) {
  const [h, m] = time.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
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
  empty,
}: {
  month: string;
  today: string;
  selected: string;
  available: Set<string>;
  loading: boolean;
  onMonth: (delta: number) => void;
  onSelect: (date: string) => void;
  /** When the month has no open dates: the next open date (undefined while looking, null if none) */
  empty?: { loading: boolean; next: string | null | undefined; onNext: (date: string) => void };
}) {
  const noDates = !loading && available.size === 0;
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
      {noDates && empty ? (
        <div className="mt-3 rounded-xl bg-midnight/[0.04] p-3 text-sm">
          <p className="font-semibold text-midnight">No dates available this month</p>
          {empty.loading ? (
            <p className="mt-1 flex items-center gap-1.5 text-slate">
              <Loader2 size={14} className="animate-spin" /> Looking for the next available date…
            </p>
          ) : empty.next ? (
            <button
              type="button"
              onClick={() => empty.onNext(empty.next!)}
              className="mt-2 h-10 w-full rounded-full bg-primary px-4 text-sm font-semibold text-white transition-colors hover:bg-primary-dark"
            >
              Go to next available date: {formatDisplayDate(empty.next) ?? empty.next}
            </button>
          ) : (
            <p className="mt-1 text-slate">There are no open dates for your group yet. Please contact us and we&apos;ll arrange a date for you.</p>
          )}
        </div>
      ) : (
        <p className="mt-3 text-xs text-slate">Highlighted dates have space for your group.</p>
      )}
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
