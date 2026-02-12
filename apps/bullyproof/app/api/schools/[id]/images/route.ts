/**
 * School avatar and banner image upload API.
 *
 * POST /api/schools/[id]/images
 * - Requires /admin/schools feature access
 * - FormData: type ("avatar" | "banner"), file (image file)
 * - Uploads to content bucket at schools/{schoolId}/images/avatar.{ext} or schools/{schoolId}/images/banner.{ext}
 * - Updates school record with storage path
 */
import { NextResponse } from "next/server";
import { getUserIdFromRequest } from "@/utils/getUserIdFromRequest";
import { createServerClient } from "@/utils/supabase/server";
import { checkFeatureAccess } from "@/server/features/features.service";
import { schoolRepo } from "@/server/school/school.repo";

const BUCKET = "content";
const ALLOWED_TYPES = ["avatar", "banner"] as const;
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

function getStoragePath(schoolId: string, type: "avatar" | "banner", ext: string): string {
  return `schools/${schoolId}/images/${type}.${ext}`;
}

function getExtensionFromMime(mime: string): string {
  const map: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
  };
  return map[mime] ?? "jpg";
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hasAdminSchools = await checkFeatureAccess(userId, "/admin/schools");
    if (!hasAdminSchools) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id: schoolId } = await params;
    const formData = await request.formData();

    const type = formData.get("type") as string | null;
    const file = formData.get("file") as File | null;

    if (!type || !ALLOWED_TYPES.includes(type as (typeof ALLOWED_TYPES)[number])) {
      return NextResponse.json(
        { error: "Invalid or missing type. Must be 'avatar' or 'banner'." },
        { status: 400 }
      );
    }

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "Invalid or missing file." },
        { status: 400 }
      );
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Allowed: JPEG, PNG, WebP, GIF." },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 5MB." },
        { status: 400 }
      );
    }

    const supabase = await createServerClient();

    // Verify school exists
    const schools = await schoolRepo.getByIds([schoolId]);
    const school = schools[0] ?? null;
    if (!school) {
      return NextResponse.json({ error: "School not found" }, { status: 404 });
    }

    const ext = getExtensionFromMime(file.type);
    const storagePath = getStoragePath(schoolId, type as "avatar" | "banner", ext);

    // Delete existing file if it's a storage path (supports both old and new path formats)
    const currentUrl =
      type === "avatar" ? school.avatarUrl : school.bannerUrl;
    if (currentUrl && currentUrl.startsWith("schools/")) {
      await supabase.storage.from(BUCKET).remove([currentUrl]);
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, buffer, {
        cacheControl: "3600",
        upsert: true,
        contentType: file.type,
      });

    if (uploadError) {
      console.error("[schools/images] Upload failed:", uploadError);
      return NextResponse.json(
        { error: `Upload failed: ${uploadError.message}` },
        { status: 500 }
      );
    }

    const updateData =
      type === "avatar"
        ? { avatarUrl: storagePath }
        : { bannerUrl: storagePath };

    const updated = await schoolRepo.update(schoolId, updateData);
    if (!updated) {
      return NextResponse.json(
        { error: "Failed to update school record" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { data: { path: storagePath, school: updated } },
      { status: 200 }
    );
  } catch (e: any) {
    console.error("[schools/images] Error:", e);
    return NextResponse.json(
      { error: e.message ?? "Internal error" },
      { status: 500 }
    );
  }
}
