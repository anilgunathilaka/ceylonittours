import { prisma } from "@/lib/db";
import { CONTENT_CONFIG, type ContentType } from "@/lib/cms/config";
import type { ContentStatusValue } from "@/lib/cms/validation";

/** The subset of a Prisma model delegate the admin uses; every content model shares this shape. */
type Row = Record<string, unknown> & { id: string; status: ContentStatusValue; updatedAt: Date };
type Delegate = {
  findMany(args: object): Promise<Row[]>;
  findUnique(args: object): Promise<Row | null>;
  create(args: object): Promise<Row>;
  update(args: object): Promise<Row>;
  delete(args: object): Promise<Row>;
  count(args?: object): Promise<number>;
};

function delegateFor(type: ContentType): Delegate {
  const delegates = {
    "tour-packages": prisma.tourPackage,
    destinations: prisma.destination,
    experiences: prisma.experience,
    testimonials: prisma.testimonial,
    "blog-posts": prisma.blogPost,
  } satisfies Record<ContentType, unknown>;
  return delegates[type] as unknown as Delegate;
}

/** Values used when an optional form field is left empty but the column itself is NOT NULL */
const NOT_NULL_DEFAULTS: Record<ContentType, Record<string, string | number>> = {
  "tour-packages": { groupSize: "" },
  destinations: { region: "", tagline: "", description: "", tourCount: 0, startingPrice: 0, mapX: 50, mapY: 50 },
  experiences: { description: "", tourCount: 0 },
  testimonials: { country: "", countryFlag: "", rating: 5 },
  "blog-posts": { excerpt: "", category: "", readTimeMinutes: 5, body: "" },
};

function toColumns(type: ContentType, status: ContentStatusValue, data: Record<string, unknown>) {
  const defaults = NOT_NULL_DEFAULTS[type];
  const columns: Record<string, unknown> = { status };
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined) continue;
    columns[key] = value === null && key in defaults ? defaults[key] : value;
  }
  return columns;
}

export type ContentListItem = { id: string; title: string; slug?: string; status: ContentStatusValue; updatedAt: Date };

export async function listContent(type: ContentType): Promise<ContentListItem[]> {
  const titleField = CONTENT_CONFIG[type].titleField;
  const rows = await delegateFor(type).findMany({ orderBy: { updatedAt: "desc" } });
  return rows.map((row) => ({
    id: row.id,
    title: String(row[titleField] ?? "(untitled)"),
    slug: typeof row.slug === "string" ? row.slug : undefined,
    status: row.status,
    updatedAt: row.updatedAt,
  }));
}

export async function countContent(type: ContentType) {
  const delegate = delegateFor(type);
  const [total, published] = await Promise.all([
    delegate.count(),
    delegate.count({ where: { status: "PUBLISHED" } }),
  ]);
  return { total, published };
}

export function getContent(type: ContentType, id: string) {
  return delegateFor(type).findUnique({ where: { id } });
}

export async function createContent(type: ContentType, status: ContentStatusValue, data: Record<string, unknown>) {
  const row = await delegateFor(type).create({ data: toColumns(type, status, data) });
  return row.id;
}

export async function updateContent(
  type: ContentType,
  id: string,
  status: ContentStatusValue,
  data: Record<string, unknown>,
) {
  await delegateFor(type).update({ where: { id }, data: toColumns(type, status, data) });
}

export async function deleteContent(type: ContentType, id: string) {
  await delegateFor(type).delete({ where: { id } });
}

/** Choices for the destinations multi-select and the testimonial → tour package reference */
export async function getFieldOptions() {
  const [destinations, tourPackages] = await Promise.all([
    prisma.destination.findMany({ select: { slug: true, name: true }, orderBy: { name: "asc" } }),
    prisma.tourPackage.findMany({ select: { id: true, title: true }, orderBy: { title: "asc" } }),
  ]);
  return {
    destinations: destinations.map((d) => ({ value: d.slug, label: d.name })),
    tourPackages: tourPackages.map((p) => ({ value: p.id, label: p.title })),
  };
}
export type FieldOptions = Awaited<ReturnType<typeof getFieldOptions>>;
