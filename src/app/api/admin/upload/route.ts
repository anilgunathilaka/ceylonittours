import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth/admin";
import { isContentType } from "@/lib/cms/config";
import { InvalidImageError, StorageNotConfiguredError, uploadImage } from "@/lib/storage";

/**
 * Image upload for the admin content forms. A route handler (not a server action) so images
 * aren't limited by the 1 MB server-action body size. Admins only.
 */
export async function POST(request: Request) {
  if (!(await getAdminSession())) {
    return NextResponse.json({ error: "Not authorised" }, { status: 403 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid upload" }, { status: 400 });
  }

  const file = formData.get("file");
  const folder = formData.get("folder");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Choose an image to upload" }, { status: 400 });
  }

  try {
    const url = await uploadImage(file, isContentType(folder) ? folder : "misc");
    return NextResponse.json({ url });
  } catch (error) {
    if (error instanceof InvalidImageError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof StorageNotConfiguredError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    console.error("Image upload failed:", error);
    return NextResponse.json({ error: "Upload failed — please try again." }, { status: 502 });
  }
}
