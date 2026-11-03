import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { ContentForm } from "@/components/admin/cms/ContentForm";
import { CONTENT_CONFIG, contentListHref, type ContentType } from "@/lib/cms/config";
import type { FormValues } from "@/lib/cms/form-values";
import type { FieldOptions } from "@/lib/cms/repository";

/** Public page for an item, where one exists */
const publicPath: Partial<Record<ContentType, (slug: string) => string>> = {
  "tour-packages": (slug) => `/tour-packages/${slug}`,
};

/** Shared layout for the "new" and "edit" admin pages. */
export function ContentEditorPage({
  type,
  id,
  status,
  values,
  options,
}: {
  type: ContentType;
  id?: string;
  status: "DRAFT" | "PUBLISHED";
  values: FormValues;
  options: FieldOptions;
}) {
  const config = CONTENT_CONFIG[type];
  const slug = typeof values.slug === "string" ? values.slug : "";
  const viewHref = id && status === "PUBLISHED" && slug ? publicPath[type]?.(slug) : undefined;

  return (
    <AdminShell
      narrow
      title={id ? `Edit ${config.singular.toLowerCase()}` : `New ${config.singular.toLowerCase()}`}
      back={{ href: contentListHref(type), label: type === "tour-packages" ? "Tours & options" : config.label }}
      actions={
        viewHref && (
          <Link href={viewHref} target="_blank" className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary-dark">
            View on site <ExternalLink size={14} />
          </Link>
        )
      }
      description={
        id && (
          <>
            Status: <strong>{status === "PUBLISHED" ? "Published" : "Draft"}</strong>. “Save as draft” hides it from the website.
          </>
        )
      }
    >
      <ContentForm type={type} id={id} status={status} values={values} options={options} />
    </AdminShell>
  );
}
