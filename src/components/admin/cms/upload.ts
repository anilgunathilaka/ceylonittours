import type { ContentType } from "@/lib/cms/config";
import type { ImageValue } from "@/lib/cms/form-values";

/** Uploads one image through the admin upload route and returns its public URL and size. */
export async function uploadFile(file: File, folder: ContentType): Promise<ImageValue> {
  const size = await readImageSize(file);
  const body = new FormData();
  body.set("file", file);
  body.set("folder", folder);
  const res = await fetch("/api/admin/upload", { method: "POST", body });
  const result = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
  if (!res.ok || !result.url) throw new Error(result.error ?? "Upload failed — please try again.");
  return { url: result.url, alt: "", ...size };
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
