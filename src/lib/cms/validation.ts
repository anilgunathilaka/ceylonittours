import { CONTENT_CONFIG, type ContentType, type Field } from "@/lib/cms/config";

export type ContentStatusValue = "DRAFT" | "PUBLISHED";

export type ParsedContent =
  | { ok: true; status: ContentStatusValue; data: Record<string, unknown> }
  | { ok: false; errors: Record<string, string> };

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MAX_TEXT = 20_000;

const text = (formData: FormData, name: string) => {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
};

function parseNumber(raw: string, field: { label: string; min?: number; max?: number }) {
  if (raw === "") return { value: null as number | null };
  const value = Number(raw);
  if (!Number.isFinite(value)) return { error: `${field.label} must be a number` };
  if (field.min !== undefined && value < field.min) return { error: `${field.label} must be at least ${field.min}` };
  if (field.max !== undefined && value > field.max) return { error: `${field.label} must be at most ${field.max}` };
  return { value };
}

function isHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

/**
 * Turns an admin form submission into column values for the matching Prisma model.
 * Every rule comes from CONTENT_CONFIG, so the form and the server can't drift apart.
 */
export function parseContentForm(type: ContentType, formData: FormData): ParsedContent {
  const config = CONTENT_CONFIG[type];
  const data: Record<string, unknown> = {};
  const errors: Record<string, string> = {};

  const status = text(formData, "status") === "PUBLISHED" ? "PUBLISHED" : "DRAFT";

  for (const field of config.sections.flatMap((section) => section.fields)) {
    const error = parseField(field, formData, data);
    if (error) errors[field.name] = error;
  }

  return Object.keys(errors).length > 0 ? { ok: false, errors } : { ok: true, status, data };
}

function parseField(field: Field, formData: FormData, data: Record<string, unknown>): string | undefined {
  const missing = `${field.label} is required`;

  switch (field.kind) {
    case "text":
    case "textarea": {
      const value = text(formData, field.name);
      if (field.required && !value) return missing;
      if (value.length > MAX_TEXT) return `${field.label} is too long`;
      data[field.name] = value || null;
      return;
    }
    case "slug": {
      const value = text(formData, field.name).toLowerCase();
      if (!value) return missing;
      if (!SLUG_PATTERN.test(value) || value.length > 96) {
        return "Use lower-case letters, numbers and single hyphens only (e.g. kandy-day-tour)";
      }
      data[field.name] = value;
      return;
    }
    case "select": {
      const value = text(formData, field.name);
      if (!value) {
        if (field.required) return missing;
        data[field.name] = null;
        return;
      }
      if (!field.options.includes(value)) return `Choose a valid ${field.label.toLowerCase()}`;
      data[field.name] = value;
      return;
    }
    case "number": {
      const result = parseNumber(text(formData, field.name), field);
      if ("error" in result) return result.error;
      if (field.required && result.value === null) return missing;
      // Whole-number columns (step not set) must not receive fractions
      if (result.value !== null && field.step === undefined && !Number.isInteger(result.value)) {
        return `${field.label} must be a whole number`;
      }
      data[field.name] = result.value;
      return;
    }
    case "checkbox":
      data[field.name] = formData.get(field.name) === "on";
      return;
    case "date": {
      const value = text(formData, field.name);
      if (!value) {
        if (field.required) return missing;
        data[field.name] = undefined; // keep the database default
        return;
      }
      const date = new Date(`${value}T00:00:00Z`);
      if (Number.isNaN(date.getTime())) return `${field.label} is not a valid date`;
      data[field.name] = date;
      return;
    }
    case "list":
      data[field.name] = text(formData, field.name)
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .slice(0, 100);
      return;
    case "multiselect":
      data[field.name] = formData
        .getAll(field.name)
        .filter((value): value is string => typeof value === "string" && SLUG_PATTERN.test(value));
      return;
    case "reference": {
      const value = text(formData, field.name);
      data[field.name] = value || null;
      return;
    }
    case "image": {
      const url = text(formData, `${field.name}Url`);
      if (!url) {
        if (field.required) return missing;
        data[`${field.name}Url`] = null;
        data[`${field.name}Alt`] = "";
        return;
      }
      if (!isHttpUrl(url)) return `${field.label} must be an uploaded image`;
      data[`${field.name}Url`] = url;
      data[`${field.name}Alt`] = text(formData, `${field.name}Alt`).slice(0, 300);
      if (field.storeSize !== false) {
        const width = Number(text(formData, `${field.name}Width`));
        const height = Number(text(formData, `${field.name}Height`));
        data[`${field.name}Width`] = Number.isInteger(width) && width > 0 ? width : null;
        data[`${field.name}Height`] = Number.isInteger(height) && height > 0 ? height : null;
      }
      return;
    }
    case "objectList": {
      let rows: unknown;
      try {
        rows = JSON.parse(text(formData, field.name) || "[]");
      } catch {
        return `${field.label} could not be read — please re-enter it`;
      }
      if (!Array.isArray(rows)) return `${field.label} could not be read — please re-enter it`;

      const clean: Record<string, string | number>[] = [];
      for (const [index, row] of rows.slice(0, 100).entries()) {
        if (typeof row !== "object" || row === null) continue;
        const item: Record<string, string | number> = {};
        for (const sub of field.fields) {
          const raw = String((row as Record<string, unknown>)[sub.name] ?? "").trim();
          if (!raw) {
            if (sub.required) return `${field.label}: row ${index + 1} needs a ${sub.label.toLowerCase()}`;
            continue;
          }
          if (sub.kind === "number") {
            const value = Number(raw);
            if (!Number.isFinite(value)) return `${field.label}: row ${index + 1} ${sub.label.toLowerCase()} must be a number`;
            item[sub.name] = value;
          } else {
            item[sub.name] = raw.slice(0, 5000);
          }
        }
        clean.push(item);
      }
      data[field.name] = clean;
      return;
    }
  }
}
