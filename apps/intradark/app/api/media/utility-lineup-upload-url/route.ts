import { track } from "@vercel/analytics/server";
import { createClient } from "@supabase/supabase-js";
import { and, eq, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getActiveUtilityMapBySlug } from "@/entities/utility-lineups/lib/queries";
import { resolveUtilityLineupUploadEligibility } from "@/entities/utility-lineups/lib/utility-lineup-upload-eligibility";
import { INTRADARK_MEDIA_BUCKET } from "@/lib/media/constants";
import { validateMediaObjectPath } from "@/lib/media/storage-paths";
import { buildUtilityLineupVideoObjectPath } from "@/lib/media/utility-lineup-upload-path";
import {
  isAllowedUtilityLineupVideoMime,
  isAllowedUtilityLineupVideoSize,
} from "@/lib/media/utility-lineup-video-validation";
import { db } from "@/server/db/drizzle";
import { utilityLineupUploadJobs } from "@/server/db/schema";

const commonVideoFields = {
  contentType: z.string().min(1).max(128),
  byteLength: z.number().int().positive(),
};

const bodySchema = z.union([
  z.object({
    jobId: z.string().uuid(),
    ...commonVideoFields,
  }),
  z.object({
    mapSlug: z.string().min(1).max(128),
    grenadeType: z.enum(["smoke", "molotov", "flashbang", "he"]),
    ...commonVideoFields,
  }),
]);

const extForMime: Record<string, string> = {
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
};

export async function POST(request: Request) {
  const gate = await resolveUtilityLineupUploadEligibility();
  if (!gate.ok) {
    const status = gate.code === "NOT_SIGNED_IN" ? 401 : 403;
    return NextResponse.json({ error: gate.message }, { status });
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

  const { contentType, byteLength } = parsed.data;
  if (!isAllowedUtilityLineupVideoMime(contentType)) {
    return NextResponse.json({ error: "Unsupported content type" }, { status: 400 });
  }
  if (!isAllowedUtilityLineupVideoSize(byteLength)) {
    return NextResponse.json({ error: "File too large" }, { status: 400 });
  }

  let pathResult: { ok: true; path: string } | { ok: false; error: string };
  let trackSlug: string;
  let trackGrenade: string;

  if ("jobId" in parsed.data) {
    const rows = await db
      .select({
        videoObjectPath: utilityLineupUploadJobs.videoObjectPath,
        expectedByteLength: utilityLineupUploadJobs.expectedByteLength,
        payloadJson: utilityLineupUploadJobs.payloadJson,
        status: utilityLineupUploadJobs.status,
      })
      .from(utilityLineupUploadJobs)
      .where(
        and(
          eq(utilityLineupUploadJobs.id, parsed.data.jobId),
          eq(utilityLineupUploadJobs.authorProfileId, gate.profileId),
          inArray(utilityLineupUploadJobs.status, ["queued", "failed", "uploading"]),
        ),
      )
      .limit(1);

    const job = rows[0];
    if (!job) {
      return NextResponse.json({ error: "Upload job not found." }, { status: 404 });
    }

    if (job.expectedByteLength !== byteLength) {
      return NextResponse.json(
        { error: "File size does not match the queued upload." },
        { status: 400 },
      );
    }

    const payload = job.payloadJson as { mapSlug?: string; grenadeType?: string };
    trackSlug = payload.mapSlug ?? "";
    trackGrenade = payload.grenadeType ?? "";

    pathResult = validateMediaObjectPath(job.videoObjectPath);
    if (!pathResult.ok) {
      return NextResponse.json({ error: pathResult.error }, { status: 400 });
    }
  } else {
    const { mapSlug, grenadeType } = parsed.data;
    const map = await getActiveUtilityMapBySlug(mapSlug);
    if (!map) {
      return NextResponse.json({ error: "Map not found" }, { status: 404 });
    }

    const ext = extForMime[contentType];
    if (!ext) {
      return NextResponse.json({ error: "Unsupported content type" }, { status: 400 });
    }

    const fileName = `${crypto.randomUUID()}.${ext}`;
    let objectPath: string;
    try {
      objectPath = buildUtilityLineupVideoObjectPath({
        mapSlug: map.slug,
        grenadeType,
        fileName,
      });
    } catch {
      return NextResponse.json({ error: "Invalid path" }, { status: 400 });
    }

    pathResult = validateMediaObjectPath(objectPath);
    if (!pathResult.ok) {
      return NextResponse.json({ error: pathResult.error }, { status: 400 });
    }
    trackSlug = map.slug;
    trackGrenade = grenadeType;
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
    console.error("createSignedUploadUrl utility lineup", error);
    void track("utility_lineup_upload_sign", { ok: false, code: "supabase" });
    return NextResponse.json(
      { error: error?.message ?? "Could not create upload URL" },
      { status: 500 },
    );
  }

  void track("utility_lineup_upload_sign", {
    ok: true,
    map_slug: trackSlug,
    grenade_type: trackGrenade,
  });

  const publicUrl = `${url.replace(/\/+$/, "")}/storage/v1/object/public/${INTRADARK_MEDIA_BUCKET}/${pathResult.path
    .split("/")
    .map((s) => encodeURIComponent(s))
    .join("/")}`;

  return NextResponse.json({
    signedUrl: data.signedUrl,
    path: data.path,
    token: data.token,
    publicUrl,
    objectPath: pathResult.path,
  });
}
