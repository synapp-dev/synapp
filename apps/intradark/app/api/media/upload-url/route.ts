import { track } from "@vercel/analytics/server";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getSessionUserId } from "@/entities/admin/lib/auth-session";
import { getRoleSlugsForUser } from "@/entities/admin/lib/get-role-slugs-for-user";
import { ROLE_DEVELOPER } from "@/entities/admin/lib/rbac-constants";
import { hasRoleSlug } from "@/entities/admin/lib/role-slugs";
import { INTRADARK_MEDIA_BUCKET } from "@/lib/media/constants";
import { validateMediaObjectPath } from "@/lib/media/storage-paths";
import { isAllowedUploadMime } from "@/lib/media/upload-validation";

const bodySchema = z.object({
  objectPath: z.string().min(1).max(2048),
  contentType: z.string().min(1).max(128),
});

export async function POST(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const slugs = await getRoleSlugsForUser(userId);
  if (!hasRoleSlug(slugs, ROLE_DEVELOPER)) {
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

  const { objectPath, contentType } = parsed.data;
  if (!isAllowedUploadMime(contentType)) {
    return NextResponse.json({ error: "Unsupported content type" }, { status: 400 });
  }

  const pathResult = validateMediaObjectPath(objectPath);
  if (!pathResult.ok) {
    return NextResponse.json({ error: pathResult.error }, { status: 400 });
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
    .createSignedUploadUrl(pathResult.path, { upsert: true });

  if (error || !data) {
    console.error("createSignedUploadUrl", error);
    void track("utility_admin_storage_sign", { ok: false, code: "supabase" });
    return NextResponse.json(
      { error: error?.message ?? "Could not create upload URL" },
      { status: 500 },
    );
  }

  void track("utility_admin_storage_sign", {
    ok: true,
    prefix: pathResult.path.split("/")[0],
  });

  return NextResponse.json({
    signedUrl: data.signedUrl,
    path: data.path,
    token: data.token,
    publicUrl: `${url.replace(/\/+$/, "")}/storage/v1/object/public/${INTRADARK_MEDIA_BUCKET}/${pathResult.path
      .split("/")
      .map((s) => encodeURIComponent(s))
      .join("/")}`,
  });
}
