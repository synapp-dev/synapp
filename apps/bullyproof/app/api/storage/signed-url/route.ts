/**
 * Storage Signed URL API route.
 *
 * GET /api/storage/signed-url?path=<storage-path>
 *
 * Generates a signed URL for storage paths in the content bucket.
 * Currently supports school images: schools/... (both old and new path formats).
 *
 * - Requires authenticated user (401 if missing)
 * - Validates path matches allowed patterns (school images only)
 * - Returns { url: string } with 1-hour expiry
 */
import { NextResponse } from "next/server";
import { createServerClient } from "@/utils/supabase/server";
import { getUserIdFromRequest } from "@/utils/getUserIdFromRequest";
import { toStorageUrl } from "@/utils/supabase/storage-url";

const BUCKET = "content";
const EXPIRES_IN = 3600; // 1 hour

/** Allowed path patterns: schools/images/... (old) or schools/{uuid}/images/... (new) */
function isAllowedSchoolImagePath(path: string): boolean {
  return (
    path.startsWith("schools/images/avatar/") ||
    path.startsWith("schools/images/banner/") ||
    /^schools\/[a-f0-9-]+\/images\/(avatar|banner)\./.test(path)
  );
}

export async function GET(request: Request) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const path = searchParams.get("path");

    if (!path || typeof path !== "string" || path.trim() === "") {
      return NextResponse.json(
        { error: "Missing or invalid path parameter" },
        { status: 400 }
      );
    }

    const decodedPath = decodeURIComponent(path.trim());

    if (!isAllowedSchoolImagePath(decodedPath)) {
      return NextResponse.json(
        { error: "Path not allowed for signed URL" },
        { status: 403 }
      );
    }

    const supabase = await createServerClient();
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(decodedPath, EXPIRES_IN);

    if (error) {
      console.warn(
        `[storage/signed-url] Failed for ${decodedPath}:`,
        error.message
      );
      return NextResponse.json(
        { error: "Failed to generate signed URL" },
        { status: 500 }
      );
    }

    const url = toStorageUrl(data.signedUrl) ?? data.signedUrl;
    return NextResponse.json({ url }, { status: 200 });
  } catch (e: any) {
    console.error("[storage/signed-url] Error:", e);
    return NextResponse.json(
      { error: e.message ?? "Internal error" },
      { status: 500 }
    );
  }
}
