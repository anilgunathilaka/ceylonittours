/**
 * Image storage in Supabase Storage, through its REST API (no SDK needed).
 * Server-only: uses the service-role key, which must never reach the browser.
 */

const BUCKET = "site-media";
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};

export class StorageNotConfiguredError extends Error {
  constructor() {
    super("Image uploads are not configured (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).");
  }
}

export class InvalidImageError extends Error {}

function config() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new StorageNotConfiguredError();
  return { url, key };
}

const authHeaders = (key: string) => ({ Authorization: `Bearer ${key}`, apikey: key });

/** Creates the public bucket the first time; a "already exists" reply is fine. */
async function ensureBucket(url: string, key: string) {
  const res = await fetch(`${url}/storage/v1/bucket`, {
    method: "POST",
    headers: { ...authHeaders(key), "Content-Type": "application/json" },
    body: JSON.stringify({
      id: BUCKET,
      name: BUCKET,
      public: true,
      file_size_limit: MAX_IMAGE_BYTES,
      allowed_mime_types: Object.keys(ALLOWED_TYPES),
    }),
  });
  if (res.ok || res.status === 409) return;
  const body = await res.text();
  if (/already exists/i.test(body)) return;
  throw new Error(`Could not create storage bucket (${res.status})`);
}

/**
 * Uploads an image under `folder/` with a random file name and returns its public URL.
 * The file type is checked from its bytes, not just the browser-supplied type.
 */
export async function uploadImage(file: File, folder: string) {
  const { url, key } = config();

  if (file.size === 0) throw new InvalidImageError("The file is empty.");
  if (file.size > MAX_IMAGE_BYTES) throw new InvalidImageError("Images must be 8 MB or smaller.");

  const bytes = new Uint8Array(await file.arrayBuffer());
  const type = sniffImageType(bytes);
  if (!type) throw new InvalidImageError("Only JPEG, PNG, WebP or AVIF images can be uploaded.");

  const safeFolder = folder.replace(/[^a-z0-9-]/g, "") || "misc";
  const path = `${safeFolder}/${crypto.randomUUID()}.${ALLOWED_TYPES[type]}`;

  const upload = () =>
    fetch(`${url}/storage/v1/object/${BUCKET}/${path}`, {
      method: "POST",
      headers: { ...authHeaders(key), "Content-Type": type, "Cache-Control": "31536000" },
      body: bytes,
    });

  let res = await upload();
  if (res.status === 404 || res.status === 400) {
    // Bucket missing on a fresh project: create it once, then retry
    await ensureBucket(url, key);
    res = await upload();
  }
  if (!res.ok) throw new Error(`Image upload failed (${res.status})`);

  return `${url}/storage/v1/object/public/${BUCKET}/${path}`;
}

function sniffImageType(bytes: Uint8Array): keyof typeof ALLOWED_TYPES | null {
  const starts = (...sig: number[]) => sig.every((b, i) => bytes[i] === b);
  const ascii = (offset: number, value: string) =>
    [...value].every((char, i) => bytes[offset + i] === char.charCodeAt(0));

  if (starts(0xff, 0xd8, 0xff)) return "image/jpeg";
  if (starts(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) return "image/png";
  if (ascii(0, "RIFF") && ascii(8, "WEBP")) return "image/webp";
  if (ascii(4, "ftyp") && (ascii(8, "avif") || ascii(8, "avis"))) return "image/avif";
  return null;
}
