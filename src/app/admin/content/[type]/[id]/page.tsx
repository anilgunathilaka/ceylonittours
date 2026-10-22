import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ContentEditorPage } from "@/components/admin/cms/ContentEditorPage";
import { getAdminSession } from "@/lib/auth/admin";
import { isContentType } from "@/lib/cms/config";
import { toFormValues } from "@/lib/cms/form-values";
import { getContent, getFieldOptions } from "@/lib/cms/repository";

export const metadata: Metadata = {
  title: "Edit Content",
  robots: { index: false, follow: false },
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function EditContentPage({ params }: { params: Promise<{ type: string; id: string }> }) {
  if (!(await getAdminSession())) notFound();
  const { type, id } = await params;
  if (!isContentType(type) || !UUID.test(id)) notFound();

  const [row, options] = await Promise.all([getContent(type, id), getFieldOptions()]);
  if (!row) notFound();

  return <ContentEditorPage type={type} id={id} status={row.status} values={toFormValues(type, row)} options={options} />;
}
