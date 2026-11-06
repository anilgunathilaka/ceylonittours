"use client";

import {
  useActionState,
  useRef,
  useState,
  useTransition,
  type FormEvent,
} from "react";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  ImagePlus,
  Loader2,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import {
  saveContentAction,
  type SaveContentState,
} from "@/app/admin/content/actions";
import {
  GalleryInput,
  LocationInput,
} from "@/components/admin/cms/MediaInputs";
import { uploadFile } from "@/components/admin/cms/upload";
import {
  CONTENT_CONFIG,
  slugify,
  type ContentType,
  type Field,
  type Section,
  type SubField,
} from "@/lib/cms/config";
import type {
  FormValues,
  ImageValue,
  LocationValue,
  ObjectRow,
} from "@/lib/cms/form-values";
import { cn } from "@/lib/utils";

type Option = { value: string; label: string };

/** Is a field filled in? `get` reads one submitted value, `getAll` all values of a name. */
function isFilled(
  field: Field,
  get: (name: string) => string,
  getAll: (name: string) => string[],
) {
  switch (field.kind) {
    case "checkbox":
      // An optional checkbox is always "answered"; a required one must be ticked
      return field.required ? get(field.name) === "on" : null;
    case "image":
      return get(`${field.name}Url`) !== "";
    case "location":
      return get(`${field.name}Lat`) !== "";
    case "gallery":
    case "objectList": {
      try {
        return (JSON.parse(get(field.name) || "[]") as unknown[]).length > 0;
      } catch {
        return false;
      }
    }
    case "multiselect":
    case "choices":
      return getAll(field.name).length > 0;
    default:
      return get(field.name).trim() !== "";
  }
}

/** A step is complete when its required fields are filled — or, with none required, when anything is filled */
function sectionComplete(
  section: Section,
  get: (name: string) => string,
  getAll: (name: string) => string[],
) {
  const answers = section.fields.map((field) => ({
    field,
    filled: isFilled(field, get, getAll),
  }));
  const required = answers.filter((a) => a.field.required);
  if (required.length > 0) return required.every((a) => a.filled);
  return answers.some((a) => a.filled === true);
}

function readForm(form: HTMLFormElement) {
  const data = new FormData(form);
  return {
    get: (name: string) => {
      const value = data.get(name);
      return typeof value === "string" ? value : "";
    },
    getAll: (name: string) =>
      data.getAll(name).filter((v): v is string => typeof v === "string"),
  };
}
type Options = { destinations: Option[]; tourPackages: Option[] };

const inputClass =
  "w-full rounded-xl border border-border bg-surface px-3.5 text-sm text-midnight placeholder:text-slate/60 focus:border-secondary focus:outline-none";
const labelClass = "text-xs font-semibold tracking-wide text-slate uppercase";

const initialState: SaveContentState = { ok: false };

export function ContentForm({
  type,
  id,
  status,
  values,
  options,
}: {
  type: ContentType;
  /** Missing for a new item */
  id?: string;
  status: "DRAFT" | "PUBLISHED";
  values: FormValues;
  options: Options;
}) {
  const config = CONTENT_CONFIG[type];
  const [state, formAction] = useActionState(saveContentAction, initialState);
  const [pending, startTransition] = useTransition();
  const [uploading, setUploading] = useState(0);
  const submitter = useRef<"DRAFT" | "PUBLISHED">(status);

  // The slug follows the title/name field for new items, until the admin edits it themselves
  const slugField = config.sections
    .flatMap((section) => section.fields)
    .find((field) => field.kind === "slug");
  const [slug, setSlug] = useState(
    slugField ? String(values[slugField.name] ?? "") : "",
  );
  const [slugTouched, setSlugTouched] = useState(Boolean(id) || slug !== "");
  const slugSource = slugField?.kind === "slug" ? slugField.from : undefined;

  // Submit through a transition instead of the `action` prop: React resets uncontrolled forms
  // after an action, which would wipe everything the admin typed when validation fails.
  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    formData.set("status", submitter.current);
    startTransition(() => formAction(formData));
  }

  const errors = state.errors ?? {};
  const busy = pending || uploading > 0;

  // Wizard: one section per step. Hidden steps stay in the form, so saving from any step sends every field.
  const [step, setStep] = useState(0);
  const sectionErrors = config.sections.map((section) =>
    section.fields.some((field) => errors[field.name]),
  );
  const [shownErrors, setShownErrors] = useState(state.errors);
  if (state.errors !== shownErrors) {
    // Jump to the first step with a problem after a failed save
    setShownErrors(state.errors);
    const first = sectionErrors.indexOf(true);
    if (config.wizard && first >= 0) setStep(first);
  }
  const lastStep = config.sections.length - 1;

  // Wizard progress, re-read from the form whenever something changes (hidden JSON fields update on clicks)
  const formRef = useRef<HTMLFormElement>(null);
  const [complete, setComplete] = useState<boolean[]>(() =>
    config.sections.map(() => false),
  );
  const measured = useRef(false);
  const measure = () => {
    if (!config.wizard || !formRef.current) return;
    const { get, getAll } = readForm(formRef.current);
    const next = config.sections.map((section) =>
      sectionComplete(section, get, getAll),
    );
    setComplete((current) =>
      current.every((v, i) => v === next[i]) ? current : next,
    );
  };
  const scheduleMeasure = () => requestAnimationFrame(measure);
  const progress = Math.round(
    (complete.filter(Boolean).length / config.sections.length) * 100,
  );

  return (
    <form
      ref={(node) => {
        formRef.current = node;
        // First measurement once the form exists (callback ref, so no effect is needed)
        if (node && !measured.current) {
          measured.current = true;
          scheduleMeasure();
        }
      }}
      onSubmit={onSubmit}
      onInput={(event) => {
        const target = event.target as HTMLInputElement;
        if (slugSource && target.name === slugSource && !slugTouched)
          setSlug(slugify(target.value));
        scheduleMeasure();
      }}
      onChange={scheduleMeasure}
      onClick={scheduleMeasure}
      className="flex flex-col gap-8"
      noValidate
    >
      <input type="hidden" name="type" value={type} />
      {id && <input type="hidden" name="id" value={id} />}

      {state.message && !state.ok && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-2xl bg-accent/10 px-5 py-4 text-sm font-medium text-midnight ring-1 ring-accent/30"
        >
          <AlertCircle size={18} className="mt-0.5 shrink-0 text-accent-dark" />
          <p>{state.message}</p>
        </div>
      )}

      {/* Wizard: steps on the left (wrapping chips on small screens), the current step on the right */}
      <div
        className={cn(
          config.wizard &&
            "grid grid-cols-1 items-start gap-6 lg:grid-cols-[240px_minmax(0,1fr)]",
        )}
      >
        {config.wizard && (
          <aside className="flex flex-col gap-4 rounded-2xl bg-surface p-4 shadow-card lg:sticky lg:top-24">
            <div aria-label={`${progress}% complete`}>
              <div className="mb-1.5 flex items-baseline justify-between text-xs font-semibold text-slate">
                <span>Progress</span>
                <span className="text-midnight">{progress}%</span>
              </div>
              <span className="block h-2 overflow-hidden rounded-full bg-border">
                <span
                  className="block h-full rounded-full bg-nature transition-all"
                  style={{ width: `${progress}%` }}
                />
              </span>
            </div>
            <ol
              className="flex flex-wrap gap-2 lg:flex-col lg:gap-1"
              aria-label="Steps"
            >
              {config.sections.map((section, index) => (
                <li key={section.title}>
                  <button
                    type="button"
                    onClick={() => setStep(index)}
                    aria-current={index === step ? "step" : undefined}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-full py-1.5 pr-4 pl-1.5 text-left text-sm font-semibold ring-1 transition-colors lg:rounded-xl lg:py-2 lg:ring-0",
                      index === step
                        ? "bg-primary text-white ring-primary"
                        : "bg-surface text-midnight ring-border hover:bg-midnight/5",
                      sectionErrors[index] &&
                        index !== step &&
                        "text-accent-dark ring-accent",
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs",
                        index === step
                          ? "bg-white/20"
                          : sectionErrors[index]
                            ? "bg-accent text-white"
                            : complete[index]
                              ? "bg-nature/15 text-nature"
                              : "bg-midnight/5",
                      )}
                    >
                      {sectionErrors[index] ? (
                        "!"
                      ) : complete[index] && index !== step ? (
                        <Check size={14} />
                      ) : (
                        index + 1
                      )}
                    </span>
                    <span className="min-w-0 flex-1">{section.title}</span>
                  </button>
                </li>
              ))}
            </ol>
          </aside>
        )}

        <div className="flex min-w-0 flex-col gap-8">
          {config.sections.map((section, index) => (
            <fieldset
              key={section.title}
              hidden={config.wizard && index !== step}
              className="flex flex-col gap-5 rounded-2xl bg-surface p-5 shadow-card sm:p-7"
            >
              <legend className="sr-only">{section.title}</legend>
              <h2 className="font-display text-lg font-semibold text-midnight">
                {config.wizard && (
                  <span className="text-slate">
                    Step {index + 1} of {lastStep + 1} ·{" "}
                  </span>
                )}
                {section.title}
              </h2>
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                {section.fields.map((field) => (
                  <FieldInput
                    key={field.name}
                    type={type}
                    field={field}
                    value={values[field.name]}
                    values={values}
                    options={options}
                    error={errors[field.name]}
                    slug={{
                      value: slug,
                      onChange: (value) => {
                        setSlugTouched(true);
                        setSlug(value);
                      },
                    }}
                    onUploading={(delta) => setUploading((n) => n + delta)}
                  />
                ))}
              </div>
              {config.wizard && (
                <div className="flex justify-between gap-3 border-t border-border pt-5">
                  <button
                    type="button"
                    onClick={() => setStep(index - 1)}
                    disabled={index === 0}
                    className="inline-flex h-10 items-center gap-1.5 rounded-full px-4 text-sm font-semibold text-midnight hover:bg-midnight/5 disabled:invisible"
                  >
                    <ArrowLeft size={15} /> Back
                  </button>
                  {index < lastStep && (
                    <button
                      type="button"
                      onClick={() => setStep(index + 1)}
                      className="inline-flex h-10 items-center gap-1.5 rounded-full bg-midnight px-5 text-sm font-semibold text-white hover:bg-midnight/85"
                    >
                      Next: {config.sections[index + 1].title}{" "}
                      <ArrowRight size={15} />
                    </button>
                  )}
                </div>
              )}
            </fieldset>
          ))}
        </div>
      </div>

      <div className="sticky bottom-4 z-10 flex flex-wrap items-center justify-end gap-3 rounded-2xl bg-surface/95 p-4 shadow-card-hover ring-1 ring-border backdrop-blur">
        {uploading > 0 && (
          <span className="mr-auto text-sm text-slate">Uploading image…</span>
        )}
        <button
          type="submit"
          disabled={busy}
          onClick={() => (submitter.current = "DRAFT")}
          className="inline-flex h-11 items-center gap-2 rounded-full border border-midnight/15 px-6 text-sm font-semibold text-midnight transition-colors hover:bg-midnight/5 disabled:opacity-50"
        >
          Save as draft
        </button>
        <button
          type="submit"
          disabled={busy}
          onClick={() => (submitter.current = "PUBLISHED")}
          className="inline-flex h-11 items-center gap-2 rounded-full bg-primary px-6 text-sm font-semibold text-white transition-colors hover:bg-primary-dark disabled:opacity-50"
        >
          {pending && <Loader2 size={16} className="animate-spin" />}
          {status === "PUBLISHED" ? "Update & publish" : "Publish"}
        </button>
      </div>
    </form>
  );
}

function FieldInput({
  type,
  field,
  value,
  values,
  options,
  error,
  slug,
  onUploading,
}: {
  type: ContentType;
  field: Field;
  value: FormValues[string];
  values: FormValues;
  options: Options;
  error?: string;
  slug: { value: string; onChange: (value: string) => void };
  onUploading: (delta: number) => void;
}) {
  const wide = [
    "textarea",
    "list",
    "image",
    "gallery",
    "location",
    "objectList",
    "multiselect",
    "choices",
  ].includes(field.kind);
  const label = (
    <span className={labelClass}>
      {field.label}
      {field.required && <span className="text-accent-dark"> *</span>}
    </span>
  );
  const help = field.help && (
    <span className="text-xs text-slate">{field.help}</span>
  );
  const errorText = error && (
    <span className="text-xs font-medium text-accent-dark">{error}</span>
  );
  const invalid = error ? "border-accent" : "";

  let control: React.ReactNode;
  switch (field.kind) {
    case "text":
    case "textarea":
      control = (
        <CountedText
          name={field.name}
          multiline={field.kind === "textarea"}
          rows={field.name === "body" ? 12 : 4}
          initial={value as string}
          counter={field.counter}
          className={invalid}
        />
      );
      break;
    case "number":
      control = (
        <input
          type="number"
          name={field.name}
          defaultValue={value as string}
          step={field.step ?? 1}
          min={field.min}
          max={field.max}
          className={cn(inputClass, "h-11", invalid)}
        />
      );
      break;
    case "date":
      control = (
        <input
          type="date"
          name={field.name}
          defaultValue={value as string}
          className={cn(inputClass, "h-11", invalid)}
        />
      );
      break;
    case "slug":
      control = (
        <input
          name={field.name}
          value={slug.value}
          onChange={(event) => slug.onChange(event.target.value.toLowerCase())}
          className={cn(inputClass, "h-11 font-mono", invalid)}
        />
      );
      break;
    case "checkbox":
      return (
        <div className={cn("flex flex-col gap-1.5 self-end", field.required && "md:col-span-2")}>
          <label className={cn("flex items-start gap-3 rounded-xl border bg-surface px-4 py-3", error ? "border-accent" : "border-border")}>
            <input type="checkbox" name={field.name} defaultChecked={value === true} className="mt-0.5 h-4 w-4 shrink-0 accent-primary" />
            <span className="text-sm font-medium text-midnight">
              {field.label}
              {field.required && <span className="text-accent-dark"> *</span>}
            </span>
          </label>
          {errorText}
        </div>
      );
    case "select":
      control = (
        <select
          name={field.name}
          defaultValue={value as string}
          className={cn(inputClass, "h-11", invalid)}
        >
          <option value="">{field.required ? "Choose…" : "— None —"}</option>
          {field.options.map((option) => (
            <option key={option} value={option}>
              {field.labels?.[option] ?? option}
            </option>
          ))}
        </select>
      );
      break;
    case "list":
      control = <ListInput name={field.name} initial={value as string} itemCounter={field.itemCounter} itemsHint={field.itemsHint} max={field.max} className={invalid} />;
      break;
    case "reference":
      control = (
        <select
          name={field.name}
          defaultValue={value as string}
          className={cn(inputClass, "h-11", invalid)}
        >
          <option value="">— None —</option>
          {options[field.source].map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      );
      break;
    case "multiselect":
      control =
        options[field.source].length === 0 ? (
          <p className="text-sm text-slate">
            No {field.label.toLowerCase()} yet — add them first.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {options[field.source].map((option) => (
              <label
                key={option.value}
                className="flex cursor-pointer items-center gap-2 rounded-full border border-border px-3.5 py-1.5 text-sm text-midnight has-[:checked]:border-primary has-[:checked]:bg-primary/5"
              >
                <input
                  type="checkbox"
                  name={field.name}
                  value={option.value}
                  defaultChecked={(value as string[]).includes(option.value)}
                  className="accent-primary"
                />
                {option.label}
              </label>
            ))}
          </div>
        );
      break;
    case "choices":
      control = (
        <div className="flex flex-wrap gap-2">
          {field.options.map((option) => (
            <label
              key={option}
              className="flex cursor-pointer items-center gap-2 rounded-full border border-border px-3.5 py-1.5 text-sm text-midnight has-[:checked]:border-primary has-[:checked]:bg-primary/5"
            >
              <input
                type="checkbox"
                name={field.name}
                value={option}
                defaultChecked={(value as string[]).includes(option)}
                className="accent-primary"
              />
              {option}
            </label>
          ))}
        </div>
      );
      break;
    case "image":
      control = (
        <ImageInput
          name={field.name}
          folder={type}
          initial={value as ImageValue}
          fallbackAlt={String(values.title ?? values.name ?? "")}
          invalid={!!error}
          onUploading={onUploading}
        />
      );
      break;
    case "gallery":
      control = (
        <GalleryInput
          name={field.name}
          folder={type}
          initial={value as ImageValue[]}
          max={field.max ?? 20}
          fallbackAlt={String(values.title ?? values.name ?? "")}
          onUploading={onUploading}
        />
      );
      break;
    case "location":
      control = (
        <LocationInput
          name={field.name}
          initial={value as LocationValue}
          invalid={!!error}
        />
      );
      break;
    case "objectList":
      control = (
        <ObjectListInput
          name={field.name}
          fields={field.fields}
          initial={value as ObjectRow[]}
        />
      );
      break;
  }

  return (
    <div className={cn("flex flex-col gap-1.5", wide && "md:col-span-2")}>
      {label}
      {control}
      {help}
      {errorText}
    </div>
  );
}

function ImageInput({
  name,
  folder,
  initial,
  fallbackAlt,
  invalid,
  onUploading,
}: {
  name: string;
  folder: ContentType;
  initial: ImageValue;
  fallbackAlt: string;
  invalid: boolean;
  onUploading: (delta: number) => void;
}) {
  const [image, setImage] = useState<ImageValue>(initial);
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  async function upload(file: File) {
    setError(undefined);
    setBusy(true);
    onUploading(1);
    try {
      const uploaded = await uploadFile(file, folder);
      setImage((current) => ({ ...uploaded, alt: current.alt || fallbackAlt }));
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Upload failed — please try again.",
      );
    } finally {
      setBusy(false);
      onUploading(-1);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-xl border border-dashed p-4",
        invalid ? "border-accent" : "border-border",
      )}
    >
      <input type="hidden" name={`${name}Url`} value={image.url} />
      <input type="hidden" name={`${name}Width`} value={image.width ?? ""} />
      <input type="hidden" name={`${name}Height`} value={image.height ?? ""} />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        {image.url ? (
          // eslint-disable-next-line @next/next/no-img-element -- admin preview of an arbitrary uploaded URL
          <img
            src={image.url}
            alt=""
            className="h-28 w-44 shrink-0 rounded-lg object-cover ring-1 ring-border"
          />
        ) : (
          <div className="flex h-28 w-44 shrink-0 items-center justify-center rounded-lg bg-ivory text-slate ring-1 ring-border">
            <ImagePlus size={24} />
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-white hover:bg-primary-dark">
            {busy ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <ImagePlus size={16} />
            )}
            {image.url ? "Replace image" : "Upload image"}
            <input
              ref={fileInput}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif"
              className="sr-only"
              disabled={busy}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void upload(file);
              }}
            />
          </label>
          {image.url && (
            <button
              type="button"
              onClick={() => setImage({ url: "", alt: "" })}
              className="inline-flex h-10 items-center gap-1.5 rounded-full px-4 text-sm font-medium text-slate hover:bg-midnight/5 hover:text-midnight"
            >
              <X size={15} /> Remove
            </button>
          )}
          <span className="w-full text-xs text-slate">
            JPEG, PNG, WebP or AVIF, up to 8 MB.
          </span>
        </div>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className={labelClass}>Alt text (describe the image)</span>
        <input
          name={`${name}Alt`}
          value={image.alt}
          onChange={(event) =>
            setImage((current) => ({ ...current, alt: event.target.value }))
          }
          className={cn(inputClass, "h-10")}
        />
      </label>
      {error && (
        <span className="text-xs font-medium text-accent-dark">{error}</span>
      )}
    </div>
  );
}

/** Text input or textarea with an optional "n / max" counter (a guide, not a hard limit) */
function CountedText({
  name,
  multiline,
  rows,
  initial,
  counter,
  className,
}: {
  name: string;
  multiline: boolean;
  rows: number;
  initial: string;
  counter?: number;
  className?: string;
}) {
  const [length, setLength] = useState(initial.length);
  const onInput = (event: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>) => setLength(event.currentTarget.value.length);
  return (
    <div className="flex flex-col gap-1">
      {multiline ? (
        <textarea name={name} defaultValue={initial} rows={rows} onInput={onInput} className={cn(inputClass, "resize-y py-2.5", className)} />
      ) : (
        <input name={name} defaultValue={initial} onInput={onInput} className={cn(inputClass, "h-11", className)} />
      )}
      {counter && (
        <span className={cn("self-end text-xs tabular-nums", length > counter ? "font-semibold text-accent-dark" : "text-slate")}>
          {length} / {counter}
        </span>
      )}
    </div>
  );
}

/** One-entry-per-line textarea, with entry count and per-line length warnings when configured */
function ListInput({
  name,
  initial,
  itemCounter,
  itemsHint,
  max,
  className,
}: {
  name: string;
  initial: string;
  itemCounter?: number;
  itemsHint?: string;
  max?: number;
  className?: string;
}) {
  const [text, setText] = useState(initial);
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const tooLong = itemCounter ? lines.filter((line) => line.length > itemCounter).length : 0;
  const tooMany = max !== undefined && lines.length > max;
  return (
    <div className="flex flex-col gap-1">
      <textarea name={name} value={text} onChange={(event) => setText(event.target.value)} rows={4} className={cn(inputClass, "resize-y py-2.5", className)} />
      {(itemsHint || itemCounter) && (
        <span className={cn("self-end text-xs", tooLong || tooMany ? "font-semibold text-accent-dark" : "text-slate")}>
          {lines.length} {lines.length === 1 ? "entry" : "entries"}
          {itemsHint && ` (recommended: ${itemsHint})`}
          {tooLong > 0 && ` · ${tooLong} longer than ${itemCounter} characters`}
        </span>
      )}
    </div>
  );
}

function ObjectListInput({
  name,
  fields,
  initial,
}: {
  name: string;
  fields: SubField[];
  initial: ObjectRow[];
}) {
  const [rows, setRows] = useState(() =>
    initial.map((row) => ({ key: crypto.randomUUID(), row })),
  );

  const update = (key: string, field: string, value: string | boolean) =>
    setRows((current) =>
      current.map((entry) =>
        entry.key === key
          ? { ...entry, row: { ...entry.row, [field]: value } }
          : entry,
      ),
    );

  return (
    <div className="flex flex-col gap-3">
      <input
        type="hidden"
        name={name}
        value={JSON.stringify(rows.map((entry) => entry.row))}
      />
      {rows.map((entry, index) => (
        <div
          key={entry.key}
          className="flex flex-col gap-3 rounded-xl border border-border bg-ivory/60 p-4"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate">
              #{index + 1}
            </span>
            <button
              type="button"
              onClick={() =>
                setRows((current) =>
                  current.filter((item) => item.key !== entry.key),
                )
              }
              className="inline-flex items-center gap-1 text-xs font-medium text-slate hover:text-accent-dark"
            >
              <Trash2 size={14} /> Remove
            </button>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {fields.map((sub) =>
              sub.kind === "checkbox" ? (
                <label
                  key={sub.name}
                  className="flex items-center gap-2 self-end py-2 text-sm font-medium text-midnight"
                >
                  <input
                    type="checkbox"
                    checked={entry.row[sub.name] === true}
                    onChange={(event) =>
                      update(entry.key, sub.name, event.target.checked)
                    }
                    className="h-4 w-4 accent-primary"
                  />
                  {sub.label}
                </label>
              ) : (
                <label
                  key={sub.name}
                  className={cn(
                    "flex flex-col gap-1",
                    sub.kind === "textarea" && "sm:col-span-2",
                  )}
                >
                  <span className={labelClass}>
                    {sub.label}
                    {sub.required && (
                      <span className="text-accent-dark"> *</span>
                    )}
                  </span>
                  {sub.kind === "textarea" ? (
                    <textarea
                      value={String(entry.row[sub.name] ?? "")}
                      onChange={(event) =>
                        update(entry.key, sub.name, event.target.value)
                      }
                      rows={3}
                      className={cn(inputClass, "resize-y bg-surface py-2")}
                    />
                  ) : sub.kind === "select" ? (
                    <select
                      value={String(entry.row[sub.name] ?? "")}
                      onChange={(event) =>
                        update(entry.key, sub.name, event.target.value)
                      }
                      className={cn(inputClass, "h-10 bg-surface")}
                    >
                      <option value="">—</option>
                      {sub.options.map((option) => (
                        <option key={option} value={option}>
                          {sub.labels?.[option] ?? option}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={sub.kind === "number" ? "number" : "text"}
                      step="any"
                      value={String(entry.row[sub.name] ?? "")}
                      onChange={(event) =>
                        update(entry.key, sub.name, event.target.value)
                      }
                      className={cn(inputClass, "h-10 bg-surface")}
                    />
                  )}
                </label>
              ),
            )}
          </div>
        </div>
      ))}
      <button
        type="button"
        onClick={() =>
          setRows((current) => [
            ...current,
            { key: crypto.randomUUID(), row: {} },
          ])
        }
        className="inline-flex h-10 items-center gap-1.5 self-start rounded-full border border-dashed border-midnight/25 px-4 text-sm font-medium text-midnight hover:bg-midnight/5"
      >
        <Plus size={15} /> Add row
      </button>
    </div>
  );
}
