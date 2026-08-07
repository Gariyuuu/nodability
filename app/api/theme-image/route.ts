import { NextResponse } from "next/server";
import { requireUserId, UnauthorizedError } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

const BUCKET = "theme-uploads";
const MAX_BYTES = 5 * 1024 * 1024; // 5MB — a background photo, not a full gallery.
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export async function POST(req: Request) {
  try {
    const userId = await requireUserId();

    const form = await req.formData();
    const file = form.get("image");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "image file is required" }, { status: 400 });
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "unsupported image type — use JPEG, PNG, WebP, or GIF" },
        { status: 400 },
      );
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "image is too large (max 5MB)" }, { status: 400 });
    }

    const extension = file.type.split("/")[1];
    const path = `${userId}/${Date.now()}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, { contentType: file.type, upsert: false });
    if (uploadError) throw uploadError;

    const {
      data: { publicUrl },
    } = supabase.storage.from(BUCKET).getPublicUrl(path);

    const { data: existing } = await supabase.storage.from(BUCKET).list(userId);
    const staleFiles = existing?.filter((f) => `${userId}/${f.name}` !== path) ?? [];
    if (staleFiles.length > 0) {
      await supabase.storage.from(BUCKET).remove(staleFiles.map((f) => `${userId}/${f.name}`));
    }

    return NextResponse.json({ url: publicUrl });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    console.error("theme-image upload failed:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "upload failed" }, { status: 500 });
  }
}
