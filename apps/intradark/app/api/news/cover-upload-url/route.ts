import { track } from "@vercel/analytics/server";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getSessionUserId } from "@/entities/admin/lib/auth-session";
import { getEffectiveRoleSlugsForUser } from "@/entities/rbac/lib/get-effective-role-slugs";
import { hasNewsEditorRole } from "@/entities/news/lib/roles";
import { INTRADARK_MEDIA_BUCKET } from "@/lib/media/constants";
import { intradarkMediaPublicUrl } from "@/lib/media/public-media-url";
import { validateMediaObjectPath } from "@/lib/media/storage-paths";
import {
  assertNewsCoverObjectPath,
  buildNewsCoverObjectPath,
  newsCoverFileName,
} from "@/lib/media/news-cover-path";
import {
  isAllowedUploadMime,
  isAllowedUploadSize,
} from "@/lib/media/upload-validation";

const bodySchema = z.object({
  articleId: z.string().uuid(),
  contentType: z.string().min(1).max(128),
  byteLength: z.number().int().positive(),
});

export async function POST(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const slugs = await getEffectiveRoleSlugsForUser(userId);
  if (!hasNewsEditorRole(slugs)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { articleId, contentType, byteLength } = parsed.data;
  if (!isAllowedUploadMime(contentType)) {
    return NextResponse.json(
      { error: "Unsupported content type" },
      { status: 400 },
    );
  }
  if (!isAllowedUploadSize(byteLength)) {
    return NextResponse.json({ error: "File too large" }, { status: 400 });
  }

  const fileName = newsCoverFileName(contentType);
  if (!fileName) {
    return NextResponse.json(
      { error: "Unsupported content type" },
      { status: 400 },
    );
  }

  let objectPath: string;
  try {
    objectPath = buildNewsCoverObjectPath({ articleId, fileName });
  } catch {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }

  const pathResult = validateMediaObjectPath(objectPath);
  if (!pathResult.ok) {
    return NextResponse.json({ error: pathResult.error }, { status: 400 });
  }

  const coverPath = assertNewsCoverObjectPath(pathResult.path, articleId);
  if (!coverPath.ok) {
    return NextResponse.json({ error: coverPath.error }, { status: 400 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_ADMIN_KEY;
  if (!url || !serviceKey) {
    return NextResponse.json(
      { error: "Server misconfigured (Supabase URL or SUPABASE_ADMIN_KEY)." },
      { status: 500 },
    );
  }

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await admin.storage
    .from(INTRADARK_MEDIA_BUCKET)
    .createSignedUploadUrl(coverPath.path, { upsert: true });

  if (error || !data) {
    console.error("createSignedUploadUrl news cover", error);
    void track("news_cover_upload_sign", { ok: false, code: "supabase" });
    return NextResponse.json(
      { error: error?.message ?? "Could not create upload URL" },
      { status: 500 },
    );
  }

  void track("news_cover_upload_sign", { ok: true });

  return NextResponse.json({
    signedUrl: data.signedUrl,
    path: data.path,
    token: data.token,
    objectPath: coverPath.path,
    publicUrl: intradarkMediaPublicUrl(coverPath.path),
  });
}
