import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { AdminNav } from "@/components/admin/AdminNav";
import { ContentForm } from "@/components/admin/cms/ContentForm";
import { CONTENT_CONFIG, type ContentType } from "@/lib/cms/config";
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
    <section className="bg-ivory py-12 lg:py-16">
      <Container className="flex max-w-4xl flex-col gap-8">
        <header className="flex flex-col gap-4">
          <AdminNav active="content" />
          <Link href={`/admin/content/${type}`} className="inline-flex items-center gap-1.5 text-sm font-medium text-slate hover:text-midnight">
            <ArrowLeft size={15} /> {config.label}
          </Link>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="font-display text-3xl font-semibold text-midnight">
              {id ? `Edit ${config.singular.toLowerCase()}` : `New ${config.singular.toLowerCase()}`}
            </h1>
            {viewHref && (
              <Link href={viewHref} target="_blank" className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary-dark">
                View on site <ExternalLink size={14} />
              </Link>
            )}
          </div>
          {id && (
            <p className="text-sm text-slate">
              Status: <strong>{status === "PUBLISHED" ? "Published" : "Draft"}</strong>. “Save as draft” hides it from the website.
            </p>
          )}
        </header>

        <ContentForm type={type} id={id} status={status} values={values} options={options} />
      </Container>
    </section>
  );
}
