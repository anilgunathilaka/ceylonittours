"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/auth/admin";
import { CONTENT_CONFIG, isContentType } from "@/lib/cms/config";
import { createContent, deleteContent, updateContent } from "@/lib/cms/repository";
import { parseContentForm } from "@/lib/cms/validation";
import { CONTENT_CACHE_TAG } from "@/lib/content/database";
import { isUniqueViolation } from "@/lib/db";

export type SaveContentState = {
  ok: boolean;
  message?: string;
  /** Field name → error message, shown next to the field */
  errors?: Record<string, string>;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Expire cached content and every pre-rendered page, so the next visit shows the change. */
function refreshSite() {
  updateTag(CONTENT_CACHE_TAG);
  revalidatePath("/", "layout");
}

const isForeignKeyViolation = (error: unknown) =>
  typeof error === "object" && error !== null && (error as { code?: string }).code === "P2003";

export async function saveContentAction(_prev: SaveContentState, formData: FormData): Promise<SaveContentState> {
  // Server Functions are reachable by direct POST, so always re-check authorization here
  if (!(await getAdminSession())) {
    return { ok: false, message: "You are not authorised to manage content." };
  }

  const type = formData.get("type");
  if (!isContentType(type)) return { ok: false, message: "Unknown content type." };

  const idValue = formData.get("id");
  const id = typeof idValue === "string" && idValue ? idValue : null;
  if (id && !UUID.test(id)) return { ok: false, message: "Invalid item." };

  const parsed = parseContentForm(type, formData);
  if (!parsed.ok) {
    return { ok: false, message: "Please fix the highlighted fields.", errors: parsed.errors };
  }

  try {
    if (id) {
      await updateContent(type, id, parsed.status, parsed.data);
    } else {
      await createContent(type, parsed.status, parsed.data);
    }
  } catch (error) {
    if (isUniqueViolation(error)) {
      return { ok: false, message: "That slug is already used.", errors: { slug: "Choose a different slug" } };
    }
    if (isForeignKeyViolation(error)) {
      return { ok: false, message: "The selected tour package no longer exists.", errors: { tourPackageId: "Choose again" } };
    }
    console.error("Saving content failed:", error);
    return { ok: false, message: "Could not save — please try again." };
  }

  refreshSite();
  const notice = parsed.status === "PUBLISHED" ? "published" : "saved";
  redirect(`/admin/content/${type}?notice=${notice}`);
}

export async function deleteContentAction(formData: FormData) {
  if (!(await getAdminSession())) return;

  const type = formData.get("type");
  const id = formData.get("id");
  if (!isContentType(type) || typeof id !== "string" || !UUID.test(id)) return;

  try {
    await deleteContent(type, id);
  } catch (error) {
    console.error(`Deleting ${CONTENT_CONFIG[type].singular} failed:`, error);
    redirect(`/admin/content/${type}?notice=delete-failed`);
  }

  refreshSite();
  redirect(`/admin/content/${type}?notice=deleted`);
}
