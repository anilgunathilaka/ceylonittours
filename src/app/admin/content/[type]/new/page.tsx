import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ContentEditorPage } from "@/components/admin/cms/ContentEditorPage";
import { getAdminSession } from "@/lib/auth/admin";
import { isContentType } from "@/lib/cms/config";
import { toFormValues } from "@/lib/cms/form-values";
import { getFieldOptions } from "@/lib/cms/repository";

export const metadata: Metadata = {
  title: "New Content",
  robots: { index: false, follow: false },
};

export default async function NewContentPage({ params }: { params: Promise<{ type: string }> }) {
  if (!(await getAdminSession())) notFound();
  const { type } = await params;
  if (!isContentType(type)) notFound();

  return <ContentEditorPage type={type} status="DRAFT" values={toFormValues(type, null)} options={await getFieldOptions()} />;
}
