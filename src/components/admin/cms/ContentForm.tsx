"use client";

import { useActionState, useRef, useState, useTransition, type FormEvent } from "react";
import { AlertCircle, ImagePlus, Loader2, Plus, Trash2, X } from "lucide-react";
import { saveContentAction, type SaveContentState } from "@/app/admin/content/actions";
import { CONTENT_CONFIG, slugify, type ContentType, type Field, type SubField } from "@/lib/cms/config";
import type { FormValues, ImageValue } from "@/lib/cms/form-values";
import { cn } from "@/lib/utils";

type Option = { value: string; label: string };
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
  const slugField = config.sections.flatMap((section) => section.fields).find((field) => field.kind === "slug");
  const [slug, setSlug] = useState(slugField ? String(values[slugField.name] ?? "") : "");
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

  return (
    <form
      onSubmit={onSubmit}
      onInput={(event) => {
        const target = event.target as HTMLInputElement;
        if (slugSource && target.name === slugSource && !slugTouched) setSlug(slugify(target.value));
      }}
      className="flex flex-col gap-8"
      noValidate
    >
      <input type="hidden" name="type" value={type} />
      {id && <input type="hidden" name="id" value={id} />}

      {state.message && !state.ok && (
        <div role="alert" className="flex items-start gap-3 rounded-2xl bg-accent/10 px-5 py-4 text-sm font-medium text-midnight ring-1 ring-accent/30">
          <AlertCircle size={18} className="mt-0.5 shrink-0 text-accent-dark" />
          <p>{state.message}</p>
        </div>
      )}

      {config.sections.map((section) => (
        <fieldset key={section.title} className="flex flex-col gap-5 rounded-2xl bg-surface p-5 shadow-card sm:p-7">
          <legend className="sr-only">{section.title}</legend>
          <h2 className="font-display text-lg font-semibold text-midnight">{section.title}</h2>
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
        </fieldset>
      ))}

      <div className="sticky bottom-4 z-10 flex flex-wrap items-center justify-end gap-3 rounded-2xl bg-surface/95 p-4 shadow-card-hover ring-1 ring-border backdrop-blur">
        {uploading > 0 && <span className="mr-auto text-sm text-slate">Uploading image…</span>}
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
  const wide = ["textarea", "list", "image", "objectList", "multiselect"].includes(field.kind);
  const label = (
    <span className={labelClass}>
      {field.label}
      {field.required && <span className="text-accent-dark"> *</span>}
    </span>
  );
  const help = field.help && <span className="text-xs text-slate">{field.help}</span>;
  const errorText = error && <span className="text-xs font-medium text-accent-dark">{error}</span>;
  const invalid = error ? "border-accent" : "";

  let control: React.ReactNode;
  switch (field.kind) {
    case "text":
      control = <input name={field.name} defaultValue={value as string} className={cn(inputClass, "h-11", invalid)} />;
      break;
    case "textarea":
      control = (
        <textarea
          name={field.name}
          defaultValue={value as string}
          rows={field.name === "body" ? 12 : 4}
          className={cn(inputClass, "resize-y py-2.5", invalid)}
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
      control = <input type="date" name={field.name} defaultValue={value as string} className={cn(inputClass, "h-11", invalid)} />;
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
        <label className="flex items-center gap-3 self-end rounded-xl border border-border bg-surface px-4 py-3">
          <input type="checkbox" name={field.name} defaultChecked={value === true} className="h-4 w-4 accent-primary" />
          <span className="text-sm font-medium text-midnight">{field.label}</span>
        </label>
      );
    case "select":
      control = (
        <select name={field.name} defaultValue={value as string} className={cn(inputClass, "h-11", invalid)}>
          <option value="">{field.required ? "Choose…" : "— None —"}</option>
          {field.options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      );
      break;
    case "list":
      control = (
        <textarea name={field.name} defaultValue={value as string} rows={4} className={cn(inputClass, "resize-y py-2.5", invalid)} />
      );
      break;
    case "reference":
      control = (
        <select name={field.name} defaultValue={value as string} className={cn(inputClass, "h-11", invalid)}>
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
          <p className="text-sm text-slate">No {field.label.toLowerCase()} yet — add them first.</p>
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
    case "objectList":
      control = <ObjectListInput name={field.name} fields={field.fields} initial={value as Record<string, string | number>[]} />;
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
      const size = await readImageSize(file);
      const body = new FormData();
      body.set("file", file);
      body.set("folder", folder);
      const res = await fetch("/api/admin/upload", { method: "POST", body });
      const result = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!res.ok || !result.url) throw new Error(result.error ?? "Upload failed — please try again.");
      setImage((current) => ({ url: result.url!, alt: current.alt || fallbackAlt, ...size }));
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Upload failed — please try again.");
    } finally {
      setBusy(false);
      onUploading(-1);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  return (
    <div className={cn("flex flex-col gap-3 rounded-xl border border-dashed p-4", invalid ? "border-accent" : "border-border")}>
      <input type="hidden" name={`${name}Url`} value={image.url} />
      <input type="hidden" name={`${name}Width`} value={image.width ?? ""} />
      <input type="hidden" name={`${name}Height`} value={image.height ?? ""} />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        {image.url ? (
          // eslint-disable-next-line @next/next/no-img-element -- admin preview of an arbitrary uploaded URL
          <img src={image.url} alt="" className="h-28 w-44 shrink-0 rounded-lg object-cover ring-1 ring-border" />
        ) : (
          <div className="flex h-28 w-44 shrink-0 items-center justify-center rounded-lg bg-ivory text-slate ring-1 ring-border">
            <ImagePlus size={24} />
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-white hover:bg-primary-dark">
            {busy ? <Loader2 size={16} className="animate-spin" /> : <ImagePlus size={16} />}
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
          <span className="w-full text-xs text-slate">JPEG, PNG, WebP or AVIF, up to 8 MB.</span>
        </div>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className={labelClass}>Alt text (describe the image)</span>
        <input
          name={`${name}Alt`}
          value={image.alt}
          onChange={(event) => setImage((current) => ({ ...current, alt: event.target.value }))}
          className={cn(inputClass, "h-10")}
        />
      </label>
      {error && <span className="text-xs font-medium text-accent-dark">{error}</span>}
    </div>
  );
}

function readImageSize(file: File) {
  return new Promise<{ width?: number; height?: number }>((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      resolve({});
      URL.revokeObjectURL(url);
    };
    img.src = url;
  });
}

function ObjectListInput({ name, fields, initial }: { name: string; fields: SubField[]; initial: Record<string, string | number>[] }) {
  const [rows, setRows] = useState(() => initial.map((row) => ({ key: crypto.randomUUID(), row })));

  const update = (key: string, field: string, value: string) =>
    setRows((current) => current.map((entry) => (entry.key === key ? { ...entry, row: { ...entry.row, [field]: value } } : entry)));

  return (
    <div className="flex flex-col gap-3">
      <input type="hidden" name={name} value={JSON.stringify(rows.map((entry) => entry.row))} />
      {rows.map((entry, index) => (
        <div key={entry.key} className="flex flex-col gap-3 rounded-xl border border-border bg-ivory/60 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate">#{index + 1}</span>
            <button
              type="button"
              onClick={() => setRows((current) => current.filter((item) => item.key !== entry.key))}
              className="inline-flex items-center gap-1 text-xs font-medium text-slate hover:text-accent-dark"
            >
              <Trash2 size={14} /> Remove
            </button>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {fields.map((sub) => (
              <label key={sub.name} className={cn("flex flex-col gap-1", sub.kind === "textarea" && "sm:col-span-2")}>
                <span className={labelClass}>
                  {sub.label}
                  {sub.required && <span className="text-accent-dark"> *</span>}
                </span>
                {sub.kind === "textarea" ? (
                  <textarea
                    value={String(entry.row[sub.name] ?? "")}
                    onChange={(event) => update(entry.key, sub.name, event.target.value)}
                    rows={3}
                    className={cn(inputClass, "resize-y bg-surface py-2")}
                  />
                ) : (
                  <input
                    type={sub.kind === "number" ? "number" : "text"}
                    step="any"
                    value={String(entry.row[sub.name] ?? "")}
                    onChange={(event) => update(entry.key, sub.name, event.target.value)}
                    className={cn(inputClass, "h-10 bg-surface")}
                  />
                )}
              </label>
            ))}
          </div>
        </div>
      ))}
      <button
        type="button"
        onClick={() => setRows((current) => [...current, { key: crypto.randomUUID(), row: {} }])}
        className="inline-flex h-10 items-center gap-1.5 self-start rounded-full border border-dashed border-midnight/25 px-4 text-sm font-medium text-midnight hover:bg-midnight/5"
      >
        <Plus size={15} /> Add row
      </button>
    </div>
  );
}
