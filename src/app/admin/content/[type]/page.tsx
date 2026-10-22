import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Pencil, Plus, Trash2 } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { Badge } from "@/components/ui/Badge";
import { AdminNav } from "@/components/admin/AdminNav";
import { AdminNotice } from "@/components/admin/AdminNotice";
import { deleteContentAction } from "@/app/admin/content/actions";
import { getAdminSession } from "@/lib/auth/admin";
import { CONTENT_CONFIG, isContentType } from "@/lib/cms/config";
import { listContent } from "@/lib/cms/repository";

export const metadata: Metadata = {
  title: "Manage Content",
  robots: { index: false, follow: false },
};

const NOTICES: Record<string, string> = {
  published: "Saved and published — the website now shows this change.",
  saved: "Saved as draft — it is not visible on the website.",
  deleted: "Deleted.",
  "delete-failed": "Could not delete that item — please try again.",
};

function formatUpdated(date: Date) {
  return date.toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default async function ContentListPage({
  params,
  searchParams,
}: {
  params: Promise<{ type: string }>;
  searchParams: Promise<{ notice?: string }>;
}) {
  if (!(await getAdminSession())) notFound();
  const { type } = await params;
  if (!isContentType(type)) notFound();

  const { notice } = await searchParams;
  const config = CONTENT_CONFIG[type];
  const items = await listContent(type);

  return (
    <section className="bg-ivory py-12 lg:py-16">
      <Container className="flex flex-col gap-8">
        <header className="flex flex-col gap-4">
          <AdminNav active="content" />
          <Link href="/admin/content" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate hover:text-midnight">
            <ArrowLeft size={15} /> All content
          </Link>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h1 className="font-display text-3xl font-semibold text-midnight sm:text-4xl">{config.label}</h1>
            <Link
              href={`/admin/content/${type}/new`}
              className="inline-flex h-11 items-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-white hover:bg-primary-dark"
            >
              <Plus size={16} /> New {config.singular.toLowerCase()}
            </Link>
          </div>
        </header>

        {notice && NOTICES[notice] && <AdminNotice message={NOTICES[notice]} />}

        {items.length === 0 ? (
          <p className="rounded-2xl bg-surface p-8 text-center text-sm text-slate shadow-card">
            No {config.label.toLowerCase()} yet. Until you publish some, the website shows its built-in sample content.
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-border overflow-hidden rounded-2xl bg-surface shadow-card">
            {items.map((item) => (
              <li key={item.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-4">
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <Link href={`/admin/content/${type}/${item.id}`} className="truncate font-semibold text-midnight hover:text-primary">
                    {item.title}
                  </Link>
                  <span className="text-xs text-slate">
                    {item.slug && <span className="font-mono">/{item.slug} · </span>}
                    Updated {formatUpdated(item.updatedAt)}
                  </span>
                </div>
                <Badge tone={item.status === "PUBLISHED" ? "nature" : "gold"}>
                  {item.status === "PUBLISHED" ? "Published" : "Draft"}
                </Badge>
                <Link
                  href={`/admin/content/${type}/${item.id}`}
                  className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-sm font-medium text-midnight hover:bg-midnight/5"
                >
                  <Pencil size={14} /> Edit
                </Link>
                {/* Two-step delete without a JavaScript dialog: open, then confirm */}
                <details className="group relative">
                  <summary className="inline-flex h-9 cursor-pointer list-none items-center gap-1.5 rounded-full px-3 text-sm font-medium text-slate hover:bg-accent/10 hover:text-accent-dark">
                    <Trash2 size={14} /> Delete
                  </summary>
                  <form
                    action={deleteContentAction}
                    className="absolute right-0 z-10 mt-2 flex w-64 flex-col gap-3 rounded-xl bg-surface p-4 text-sm shadow-card-hover ring-1 ring-border"
                  >
                    <input type="hidden" name="type" value={type} />
                    <input type="hidden" name="id" value={item.id} />
                    <p className="text-midnight">Delete “{item.title}” permanently?</p>
                    <button type="submit" className="h-9 rounded-full bg-accent-dark px-4 font-semibold text-white hover:bg-accent">
                      Yes, delete
                    </button>
                  </form>
                </details>
              </li>
            ))}
          </ul>
        )}
      </Container>
    </section>
  );
}
