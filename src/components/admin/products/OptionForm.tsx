"use client";

import { useActionState, useState, useTransition, type FormEvent, type ReactNode } from "react";
import { AlertCircle, Loader2, Plus, Trash2 } from "lucide-react";
import { saveOptionAction, type ProductFormState } from "@/app/admin/products/actions";
import type { GroupTier, PriceCategory, PricingMode, Season } from "@/lib/products/pricing";
import { GUIDE_MATERIALS, PRICE_CATEGORIES } from "@/lib/products/validation";
import { cn } from "@/lib/utils";

export const inputClass =
  "w-full rounded-xl border border-border bg-surface px-3.5 text-sm text-midnight placeholder:text-slate/60 focus:border-secondary focus:outline-none";
export const labelClass = "text-xs font-semibold tracking-wide text-slate uppercase";

export type OptionFormInitial = {
  id?: string;
  title: string;
  description: string;
  durationLabel: string;
  languages: string;
  isPrivate: boolean;
  active: boolean;
  sortOrder: number;
  pricingMode: PricingMode;
  prices: PriceCategory[];
  groupTiers: GroupTier[];
  seasons: Season[];
  minParticipants: number;
  maxParticipants: string;
  cutoffHours: number;
  slotCutoffs: Record<string, number>;
  lastMinuteAfterFirst: boolean;
  instantConfirm: boolean;
  pickupMode: "none" | "area" | "locations";
  pickupArea?: string;
  pickupLocations: string[];
  pickupTiming?: "at_start" | "before_start";
  pickupMinutesBefore?: number;
  pickupConfirmation?: "day_before" | "on_booking";
  wheelchairAccessible: boolean;
  skipTheLine: boolean;
  guideMaterials: string[];
};

const initialState: ProductFormState = { ok: false };
type Row<T> = { key: string; value: T };
const withKeys = <T,>(items: T[]): Row<T>[] => items.map((value) => ({ key: crypto.randomUUID(), value }));

export function OptionForm({ packageSlug, initial }: { packageSlug: string; initial: OptionFormInitial }) {
  const [state, formAction] = useActionState(saveOptionAction, initialState);
  const [pending, startTransition] = useTransition();
  const [mode, setMode] = useState<PricingMode>(initial.pricingMode);
  const [prices, setPrices] = useState(() => withKeys(initial.prices));
  const [tiers, setTiers] = useState(() => withKeys(initial.groupTiers));
  const [seasons, setSeasons] = useState(() => withKeys(initial.seasons));
  const [cutoffs, setCutoffs] = useState(() => withKeys(Object.entries(initial.slotCutoffs).map(([time, hours]) => ({ time, hours }))));
  const [pickupMode, setPickupMode] = useState(initial.pickupMode);
  const [pickupTiming, setPickupTiming] = useState(initial.pickupTiming ?? "");
  const errors = state.errors ?? {};

  // Submit through a transition so a failed validation doesn't reset what was typed
  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => formAction(formData));
  }

  const unused = PRICE_CATEGORIES.filter((c) => !prices.some((p) => p.value.category === c.category));

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
      <input type="hidden" name="packageSlug" value={packageSlug} />
      {initial.id && <input type="hidden" name="id" value={initial.id} />}
      <input type="hidden" name="pricingMode" value={mode} />
      <input type="hidden" name="prices" value={JSON.stringify(prices.map((p) => p.value))} />
      <input type="hidden" name="groupTiers" value={JSON.stringify(mode === "per_group" ? tiers.map((t) => t.value) : [])} />
      <input type="hidden" name="seasons" value={JSON.stringify(seasons.map((s) => s.value))} />
      <input type="hidden" name="slotCutoffs" value={JSON.stringify(cutoffs.map((c) => c.value))} />
      <input type="hidden" name="pickupMode" value={pickupMode} />

      {state.message && !state.ok && (
        <div role="alert" className="flex items-start gap-3 rounded-2xl bg-accent/10 px-5 py-4 text-sm font-medium text-midnight ring-1 ring-accent/30">
          <AlertCircle size={18} className="mt-0.5 shrink-0 text-accent-dark" />
          <div>
            <p>{state.message}</p>
            {errors.form && <p className="mt-1 font-normal">{errors.form}</p>}
          </div>
        </div>
      )}

      <Panel title="Option details">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <Field label="Option title" required error={errors.title} wide>
            <input name="title" defaultValue={initial.title} placeholder="e.g. Shared tour with hotel pickup" className={cn(inputClass, "h-11")} />
          </Field>
          <Field label="What's included in this option" error={errors.description} wide>
            <textarea name="description" defaultValue={initial.description} rows={3} className={cn(inputClass, "resize-y py-2.5")} />
          </Field>
          <Field label="Duration" help='e.g. "8 hours" — leave empty to use the tour duration'>
            <input name="durationLabel" defaultValue={initial.durationLabel} className={cn(inputClass, "h-11")} />
          </Field>
          <Field label="Guide languages" help="Comma separated, e.g. English, German">
            <input name="languages" defaultValue={initial.languages} className={cn(inputClass, "h-11")} />
          </Field>
          <div className="flex flex-wrap gap-3 md:col-span-2">
            <Check name="active" label="Bookable (shown to customers)" defaultChecked={initial.active} />
            <Check name="isPrivate" label="Private tour (only your group)" defaultChecked={initial.isPrivate} />
          </div>
          <Field label="Display order" help="Lower numbers are shown first">
            <input type="number" name="sortOrder" min={0} defaultValue={initial.sortOrder} className={cn(inputClass, "h-11")} />
          </Field>
        </div>
      </Panel>

      <Panel title="Guests & booking rules">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          <Field label="Minimum guests per booking" required error={errors.minParticipants}>
            <input type="number" name="minParticipants" min={1} defaultValue={initial.minParticipants} className={cn(inputClass, "h-11")} />
          </Field>
          <Field label="Maximum guests per booking" error={errors.maxParticipants} help="Leave empty for no limit (capacity still applies)">
            <input type="number" name="maxParticipants" min={1} defaultValue={initial.maxParticipants} className={cn(inputClass, "h-11")} />
          </Field>
          <Field label="Booking cut-off (hours)" required error={errors.cutoffHours} help="Stop taking bookings this long before the start time">
            <input type="number" name="cutoffHours" min={0} defaultValue={initial.cutoffHours} className={cn(inputClass, "h-11")} />
          </Field>
        </div>
        <div className="flex flex-col gap-3">
          <Check name="instantConfirm" label="Instant confirmation — confirm new bookings automatically" defaultChecked={initial.instantConfirm} />
          <Check
            name="lastMinuteAfterFirst"
            label="Accept last-minute bookings after the first booking (no cut-off once a time slot has a booking)"
            defaultChecked={initial.lastMinuteAfterFirst}
          />
        </div>
        <div className="flex flex-col gap-3">
          <p className={labelClass}>Different cut-off for some start times (optional)</p>
          {cutoffs.map((row) => (
            <RowBox key={row.key} onRemove={() => setCutoffs((list) => list.filter((r) => r.key !== row.key))}>
              <div className="grid grid-cols-2 gap-3">
                <MiniField label="Start time">
                  <input type="time" value={row.value.time} onChange={(e) => setCutoffs((list) => update(list, row.key, { time: e.target.value }))} className={cn(inputClass, "h-10")} />
                </MiniField>
                <MiniField label="Cut-off (hours)">
                  <input type="number" min={0} value={row.value.hours} onChange={(e) => setCutoffs((list) => update(list, row.key, { hours: Number(e.target.value) }))} className={cn(inputClass, "h-10")} />
                </MiniField>
              </div>
            </RowBox>
          ))}
          {errors.slotCutoffs && <ErrorText>{errors.slotCutoffs}</ErrorText>}
          <AddButton onClick={() => setCutoffs((list) => [...list, ...withKeys([{ time: "", hours: initial.cutoffHours }])])}>Start time cut-off</AddButton>
        </div>
      </Panel>

      <Panel title="Meeting point or pickup" subtitle="Where this option starts. The tour's meeting point is shown when there is no pickup.">
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["none", "Customers go to the meeting point"],
              ["area", "Pickup from any address in an area"],
              ["locations", "Pickup from a list of locations"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setPickupMode(value)}
              className={cn(
                "h-10 rounded-full px-4 text-sm font-semibold ring-1 transition-colors",
                pickupMode === value ? "bg-primary text-white ring-primary" : "bg-surface text-midnight ring-border hover:ring-primary/40",
              )}
            >
              {label}
            </button>
          ))}
        </div>
        {pickupMode !== "none" && (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {pickupMode === "area" ? (
              <Field label="Pickup area" help='Shown to customers, e.g. "Any hotel or address in Kandy city (within 10 km)"' wide>
                <input name="pickupArea" defaultValue={initial.pickupArea ?? ""} maxLength={300} className={cn(inputClass, "h-11")} />
              </Field>
            ) : (
              <Field label="Pickup locations" required error={errors.pickupLocations} help="One per line — hotels, stations, airports. Customers choose one when booking." wide>
                <textarea name="pickupLocations" rows={5} defaultValue={initial.pickupLocations.join("\n")} className={cn(inputClass, "resize-y py-2.5")} />
              </Field>
            )}
            <Field label="When do you pick customers up?">
              <select name="pickupTiming" value={pickupTiming} onChange={(e) => setPickupTiming(e.target.value as typeof pickupTiming)} className={cn(inputClass, "h-11")}>
                <option value="">—</option>
                <option value="at_start">At the activity start time</option>
                <option value="before_start">Before the activity starts</option>
              </select>
            </Field>
            {pickupTiming === "before_start" && (
              <Field label="Up to how many minutes before?">
                <input type="number" name="pickupMinutesBefore" min={0} max={600} defaultValue={initial.pickupMinutesBefore ?? 30} className={cn(inputClass, "h-11")} />
              </Field>
            )}
            <Field label="When do customers get the exact pickup time?">
              <select name="pickupConfirmation" defaultValue={initial.pickupConfirmation ?? ""} className={cn(inputClass, "h-11")}>
                <option value="">—</option>
                <option value="day_before">The day before the activity</option>
                <option value="on_booking">Right after they book</option>
              </select>
            </Field>
          </div>
        )}
      </Panel>

      <Panel title="Accessibility & extras">
        <div className="flex flex-wrap gap-3">
          <Check name="wheelchairAccessible" label="Wheelchair accessible" defaultChecked={initial.wheelchairAccessible} />
          <Check name="skipTheLine" label="Skip-the-line access" defaultChecked={initial.skipTheLine} />
        </div>
        <div className="flex flex-col gap-2">
          <p className={labelClass}>Guide materials provided</p>
          <div className="flex flex-wrap gap-3">
            {GUIDE_MATERIALS.map((material) => (
              <label key={material} className="flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3">
                <input type="checkbox" name="guideMaterials" value={material} defaultChecked={initial.guideMaterials.includes(material)} className="h-4 w-4 accent-primary" />
                <span className="text-sm font-medium text-midnight">{material}</span>
              </label>
            ))}
          </div>
        </div>
      </Panel>

      <Panel title="Pricing" subtitle="All prices in USD. Customers pay on arrival.">
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["per_person", "Price per person"],
              ["per_group", "Price per group"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setMode(value)}
              className={cn(
                "h-10 rounded-full px-4 text-sm font-semibold ring-1 transition-colors",
                mode === value ? "bg-primary text-white ring-primary" : "bg-surface text-midnight ring-border hover:ring-primary/40",
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-3">
          <p className={labelClass}>{mode === "per_person" ? "Prices by guest type" : "Guest types (for the guest picker, price not used)"}</p>
          {prices.map((row) => (
            <RowBox key={row.key} onRemove={() => setPrices((list) => list.filter((r) => r.key !== row.key))}>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                <MiniField label="Shown as">
                  <input
                    value={row.value.label}
                    onChange={(e) => setPrices((list) => update(list, row.key, { label: e.target.value }))}
                    className={cn(inputClass, "h-10")}
                  />
                </MiniField>
                <MiniField label="Age from">
                  <input
                    type="number"
                    min={0}
                    value={row.value.ageMin ?? ""}
                    onChange={(e) => setPrices((list) => update(list, row.key, { ageMin: numberOrUndefined(e.target.value) }))}
                    className={cn(inputClass, "h-10")}
                  />
                </MiniField>
                <MiniField label="Age to">
                  <input
                    type="number"
                    min={0}
                    value={row.value.ageMax ?? ""}
                    onChange={(e) => setPrices((list) => update(list, row.key, { ageMax: numberOrUndefined(e.target.value) }))}
                    className={cn(inputClass, "h-10")}
                  />
                </MiniField>
                {mode === "per_person" && (
                  <MiniField label="Price (USD)">
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={row.value.price}
                      onChange={(e) => setPrices((list) => update(list, row.key, { price: Number(e.target.value) }))}
                      className={cn(inputClass, "h-10")}
                    />
                  </MiniField>
                )}
                <MiniField label="Type">
                  <span className="flex h-10 items-center text-sm text-slate capitalize">{row.value.category}</span>
                </MiniField>
              </div>
            </RowBox>
          ))}
          {errors.prices && <ErrorText>{errors.prices}</ErrorText>}
          {unused.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {unused.map((c) => (
                <AddButton
                  key={c.category}
                  onClick={() => setPrices((list) => [...list, ...withKeys([{ category: c.category, label: c.label, price: 0 }])])}
                >
                  {c.label}
                </AddButton>
              ))}
            </div>
          )}
        </div>

        {mode === "per_group" && (
          <div className="flex flex-col gap-3">
            <p className={labelClass}>Group prices (total for the whole group)</p>
            {tiers.map((row) => (
              <RowBox key={row.key} onRemove={() => setTiers((list) => list.filter((r) => r.key !== row.key))}>
                <div className="grid grid-cols-3 gap-3">
                  <MiniField label="From (people)">
                    <input type="number" min={1} value={row.value.minPeople} onChange={(e) => setTiers((list) => update(list, row.key, { minPeople: Number(e.target.value) }))} className={cn(inputClass, "h-10")} />
                  </MiniField>
                  <MiniField label="To (people)">
                    <input type="number" min={1} value={row.value.maxPeople} onChange={(e) => setTiers((list) => update(list, row.key, { maxPeople: Number(e.target.value) }))} className={cn(inputClass, "h-10")} />
                  </MiniField>
                  <MiniField label="Group price (USD)">
                    <input type="number" min={0} step="0.01" value={row.value.price} onChange={(e) => setTiers((list) => update(list, row.key, { price: Number(e.target.value) }))} className={cn(inputClass, "h-10")} />
                  </MiniField>
                </div>
              </RowBox>
            ))}
            {errors.groupTiers && <ErrorText>{errors.groupTiers}</ErrorText>}
            <AddButton
              onClick={() => {
                const last = tiers.at(-1)?.value.maxPeople ?? 0;
                setTiers((list) => [...list, ...withKeys([{ minPeople: last + 1, maxPeople: last + 4, price: 0 }])]);
              }}
            >
              Group size
            </AddButton>
          </div>
        )}

        <div className="flex flex-col gap-3 border-t border-border pt-5">
          <p className={labelClass}>Seasonal prices</p>
          <p className="-mt-2 text-xs text-slate">Raise or lower every price between two dates, e.g. +15% for the Christmas peak or -10% in the low season.</p>
          {seasons.map((row) => (
            <RowBox key={row.key} onRemove={() => setSeasons((list) => list.filter((r) => r.key !== row.key))}>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <MiniField label="Season name">
                  <input value={row.value.name} onChange={(e) => setSeasons((list) => update(list, row.key, { name: e.target.value }))} className={cn(inputClass, "h-10")} />
                </MiniField>
                <MiniField label="From">
                  <input type="date" value={row.value.start} onChange={(e) => setSeasons((list) => update(list, row.key, { start: e.target.value }))} className={cn(inputClass, "h-10")} />
                </MiniField>
                <MiniField label="To">
                  <input type="date" value={row.value.end} onChange={(e) => setSeasons((list) => update(list, row.key, { end: e.target.value }))} className={cn(inputClass, "h-10")} />
                </MiniField>
                <MiniField label="Change (%)">
                  <input type="number" step="1" value={row.value.adjustPercent} onChange={(e) => setSeasons((list) => update(list, row.key, { adjustPercent: Number(e.target.value) }))} className={cn(inputClass, "h-10")} />
                </MiniField>
              </div>
            </RowBox>
          ))}
          {errors.seasons && <ErrorText>{errors.seasons}</ErrorText>}
          <AddButton onClick={() => setSeasons((list) => [...list, ...withKeys([{ name: "", start: "", end: "", adjustPercent: 10 }])])}>Season</AddButton>
        </div>
      </Panel>

      <div className="sticky bottom-4 z-10 flex items-center justify-end gap-3 rounded-2xl bg-surface/95 p-4 shadow-card-hover ring-1 ring-border backdrop-blur">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-11 items-center gap-2 rounded-full bg-primary px-6 text-sm font-semibold text-white transition-colors hover:bg-primary-dark disabled:opacity-50"
        >
          {pending && <Loader2 size={16} className="animate-spin" />}
          {initial.id ? "Save option" : "Create option"}
        </button>
      </div>
    </form>
  );
}

function update<T>(list: Row<T>[], key: string, patch: Partial<T>) {
  return list.map((row) => (row.key === key ? { ...row, value: { ...row.value, ...patch } } : row));
}

const numberOrUndefined = (value: string) => (value === "" ? undefined : Number(value));

export function Panel({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-5 rounded-2xl bg-surface p-5 shadow-card sm:p-7">
      <legend className="sr-only">{title}</legend>
      <div>
        <h2 className="font-display text-lg font-semibold text-midnight">{title}</h2>
        {subtitle && <p className="text-sm text-slate">{subtitle}</p>}
      </div>
      {children}
    </fieldset>
  );
}

export function Field({
  label,
  required,
  error,
  help,
  wide,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  help?: string;
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <label className={cn("flex flex-col gap-1.5", wide && "md:col-span-2")}>
      <span className={labelClass}>
        {label}
        {required && <span className="text-accent-dark"> *</span>}
      </span>
      {children}
      {help && <span className="text-xs text-slate">{help}</span>}
      {error && <ErrorText>{error}</ErrorText>}
    </label>
  );
}

function MiniField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] font-semibold tracking-wide text-slate uppercase">{label}</span>
      {children}
    </label>
  );
}

export function Check({ name, label, defaultChecked }: { name: string; label: string; defaultChecked?: boolean }) {
  return (
    <label className="flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="h-4 w-4 accent-primary" />
      <span className="text-sm font-medium text-midnight">{label}</span>
    </label>
  );
}

function RowBox({ onRemove, children }: { onRemove: () => void; children: ReactNode }) {
  return (
    <div className="flex items-end gap-3 rounded-xl border border-border bg-ivory/60 p-3">
      <div className="min-w-0 flex-1">{children}</div>
      <button type="button" onClick={onRemove} aria-label="Remove" className="mb-2 rounded-full p-2 text-slate hover:bg-accent/10 hover:text-accent-dark">
        <Trash2 size={16} />
      </button>
    </div>
  );
}

function AddButton({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-9 items-center gap-1.5 self-start rounded-full border border-dashed border-midnight/25 px-4 text-sm font-medium text-midnight hover:bg-midnight/5"
    >
      <Plus size={14} /> {children}
    </button>
  );
}

export function ErrorText({ children }: { children: ReactNode }) {
  return <span className="text-xs font-medium text-accent-dark">{children}</span>;
}
