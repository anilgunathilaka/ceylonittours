import { CONTENT_CONFIG, type ContentType } from "@/lib/cms/config";

export type ImageValue = { url: string; alt: string; width?: number; height?: number };
export type ObjectRow = Record<string, string | number | boolean>;
export type LocationValue = { lat: string; lng: string };
export type FormValue = string | boolean | string[] | ImageValue | ImageValue[] | LocationValue | ObjectRow[];
export type FormValues = Record<string, FormValue>;

/** Converts a database row (or nothing, for a new item) into plain, serialisable form values. */
export function toFormValues(type: ContentType, row: Record<string, unknown> | null): FormValues {
  const values: FormValues = {};
  for (const field of CONTENT_CONFIG[type].sections.flatMap((section) => section.fields)) {
    const raw = row?.[field.name];
    switch (field.kind) {
      case "checkbox":
        values[field.name] = raw === true;
        break;
      case "list":
        values[field.name] = Array.isArray(raw) ? raw.join("\n") : "";
        break;
      case "choices":
      case "multiselect":
        values[field.name] = Array.isArray(raw) ? raw.map(String) : [];
        break;
      case "objectList":
        values[field.name] = Array.isArray(raw) ? (raw as ObjectRow[]) : [];
        break;
      case "gallery":
        values[field.name] = Array.isArray(raw) ? (raw as ImageValue[]) : [];
        break;
      case "location": {
        const lat = row?.[`${field.name}Lat`];
        const lng = row?.[`${field.name}Lng`];
        values[field.name] = { lat: typeof lat === "number" ? String(lat) : "", lng: typeof lng === "number" ? String(lng) : "" };
        break;
      }
      case "date":
        values[field.name] = raw instanceof Date ? raw.toISOString().slice(0, 10) : "";
        break;
      case "image": {
        const width = row?.[`${field.name}Width`];
        const height = row?.[`${field.name}Height`];
        values[field.name] = {
          url: String(row?.[`${field.name}Url`] ?? ""),
          alt: String(row?.[`${field.name}Alt`] ?? ""),
          width: typeof width === "number" ? width : undefined,
          height: typeof height === "number" ? height : undefined,
        };
        break;
      }
      default:
        values[field.name] = raw === null || raw === undefined ? "" : String(raw);
    }
  }
  return values;
}
