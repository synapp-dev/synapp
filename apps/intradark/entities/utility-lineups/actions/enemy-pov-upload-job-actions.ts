"use server";

import { track } from "@vercel/analytics/server";
import { createClient } from "@supabase/supabase-js";
import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { insertEnemyPovVideoRow } from "@/entities/utility-lineups/actions/user-lineup-submit-actions";
import {
  enemyPovFinalizeSchema,
  enemyPovUploadJobCreateSchema,
  type EnemyPovJobPayload,
} from "@/entities/utility-lineups/lib/enemy-pov-submit-schema";
import { formatZodErrorForClient } from "@/entities/utility-lineups/lib/format-zod-error";
import { resolveUtilityLineupUploadEligibility } from "@/entities/utility-lineups/lib/utility-lineup-upload-eligibility";
import { videoObjectPathMatchesSubmit } from "@/entities/utility-lineups/lib/video-object-path-matches-submit";
import { INTRADARK_MEDIA_BUCKET } from "@/lib/media/constants";
import { validateMediaObjectPath } from "@/lib/media/storage-paths";
import { buildUtilityLineupEnemyPovObjectPath } from "@/lib/media/utility-lineup-enemy-pov-upload-path";
import { db } from "@/server/db/drizzle";
import { utilityLineups, utilityLineupUploadJobs } from "@/server/db/schema";

const extForMime: Record<string, string> = {
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
};

export type CreateEnemyPovJobResult =
  | { ok: true; jobId: string; objectPath: string }
  | {
      ok: false;
      code: "VALIDATION" | "UNAUTHORIZED" | "FORBIDDEN" | "NOT_FOUND" | "SERVER";
      message: string;
    };

export type SimpleEnemyPovJobResult =
  | { ok: true }
  | {
      ok: false;
      code: "UNAUTHORIZED" | "FORBIDDEN" | "NOT_FOUND" | "CONFLICT" | "SERVER";
      message: string;
    };

export type FinalizeEnemyPovJobResult =
  | { ok: true; enemyPovVideoId: string }
  | {
      ok: false;
      code:
        | "VALIDATION"
        | "UNAUTHORIZED"
        | "FORBIDDEN"
        | "NOT_FOUND"
        | "PATH_MISMATCH"
        | "STORAGE"
        | "SERVER";
      message: string;
    };

async function storageObjectExists(objectPath: string): Promise<boolean> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_ADMIN_KEY;
  if (!url || !serviceKey) return false;
  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const trimmed = objectPath.trim().replace(/^\/+/, "");
  const lastSlash = trimmed.lastIndexOf("/");
  const dir = lastSlash >= 0 ? trimmed.slice(0, lastSlash) : "";
  const name = lastSlash >= 0 ? trimmed.slice(lastSlash + 1) : trimmed;
  const { data, error } = await admin.storage
    .from(INTRADARK_MEDIA_BUCKET)
    .list(dir, { limit: 100, search: name });
  if (error || !data?.length) return false;
  return data.some((o) => o.name === name);
}

export async function createEnemyPovUploadJobAction(
  raw: unknown,
): Promise<CreateEnemyPovJobResult> {
  const gate = await resolveUtilityLineupUploadEligibility();
  if (!gate.ok) {
    return {
      ok: false,
      code: gate.code === "NOT_SIGNED_IN" ? "UNAUTHORIZED" : "FORBIDDEN",
      message: gate.message,
    };
  }

  const parsed = enemyPovUploadJobCreateSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      code: "VALIDATION",
      message: formatZodErrorForClient(parsed.error),
    };
  }

  const { videoContentType, videoByteLength, ...jobPayload } = parsed.data;

  // Cross-check that the parent lineup belongs to this user.
  const parentRows = await db
    .select({
      id: utilityLineups.id,
      authorProfileId: utilityLineups.authorProfileId,
      grenadeType: utilityLineups.grenadeType,
      mapId: utilityLineups.mapId,
    })
    .from(utilityLineups)
    .where(eq(utilityLineups.id, jobPayload.lineupId))
    .limit(1);
  const parent = parentRows[0];
  if (!parent || parent.authorProfileId !== gate.profileId) {
    return { ok: false, code: "NOT_FOUND", message: "Parent lineup not found." };
  }
  if (parent.grenadeType !== jobPayload.grenadeType) {
    return {
      ok: false,
      code: "VALIDATION",
      message: "Grenade type does not match the parent lineup.",
    };
  }

  const ext = extForMime[videoContentType];
  if (!ext) {
    return { ok: false, code: "VALIDATION", message: "Unsupported video type." };
  }

  const fileName = `${crypto.randomUUID()}.${ext}`;
  let objectPath: string;
  try {
    objectPath = buildUtilityLineupEnemyPovObjectPath({
      mapSlug: jobPayload.mapSlug,
      grenadeType: jobPayload.grenadeType,
      fileName,
    });
  } catch {
    return { ok: false, code: "VALIDATION", message: "Invalid storage path." };
  }

  const pathResult = validateMediaObjectPath(objectPath);
  if (!pathResult.ok) {
    return { ok: false, code: "VALIDATION", message: pathResult.error };
  }

  try {
    const persistedPayload: EnemyPovJobPayload = {
      lineupId: jobPayload.lineupId,
      mapSlug: jobPayload.mapSlug,
      grenadeType: jobPayload.grenadeType,
      description: jobPayload.description,
      videoStartMs: jobPayload.videoStartMs,
      videoEndMs: jobPayload.videoEndMs,
    };

    const [row] = await db
      .insert(utilityLineupUploadJobs)
      .values({
        authorProfileId: gate.profileId,
        status: "queued",
        kind: "enemy_pov",
        parentLineupId: jobPayload.lineupId,
        payloadJson: persistedPayload,
        videoObjectPath: pathResult.path,
        expectedByteLength: videoByteLength,
        updatedAt: new Date().toISOString(),
      })
      .returning({ id: utilityLineupUploadJobs.id });

    if (!row) {
      return { ok: false, code: "SERVER", message: "Could not create upload job." };
    }

    void track("utility_enemy_pov_job_enqueued", {
      job_id: row.id,
      lineup_id: jobPayload.lineupId,
      map_slug: jobPayload.mapSlug,
    });
    return { ok: true, jobId: row.id, objectPath: pathResult.path };
  } catch (e) {
    console.error("createEnemyPovUploadJobAction", e);
    return { ok: false, code: "SERVER", message: "Could not create upload job." };
  }
}

export async function markEnemyPovUploadJobUploadingAction(
  jobId: string,
): Promise<SimpleEnemyPovJobResult> {
  const gate = await resolveUtilityLineupUploadEligibility();
  if (!gate.ok) {
    return {
      ok: false,
      code: gate.code === "NOT_SIGNED_IN" ? "UNAUTHORIZED" : "FORBIDDEN",
      message: gate.message,
    };
  }

  const updated = await db
    .update(utilityLineupUploadJobs)
    .set({ status: "uploading", updatedAt: new Date().toISOString() })
    .where(
      and(
        eq(utilityLineupUploadJobs.id, jobId),
        eq(utilityLineupUploadJobs.authorProfileId, gate.profileId),
        eq(utilityLineupUploadJobs.kind, "enemy_pov"),
        eq(utilityLineupUploadJobs.status, "queued"),
      ),
    )
    .returning({ id: utilityLineupUploadJobs.id });

  if (!updated.length) {
    return {
      ok: false,
      code: "NOT_FOUND",
      message: "Upload job not found or already started.",
    };
  }
  return { ok: true };
}

export async function failEnemyPovUploadJobAction(
  jobId: string,
  message: string,
): Promise<SimpleEnemyPovJobResult> {
  const gate = await resolveUtilityLineupUploadEligibility();
  if (!gate.ok) {
    return {
      ok: false,
      code: gate.code === "NOT_SIGNED_IN" ? "UNAUTHORIZED" : "FORBIDDEN",
      message: gate.message,
    };
  }

  const updated = await db
    .update(utilityLineupUploadJobs)
    .set({
      status: "failed",
      errorMessage: message.slice(0, 2000),
      updatedAt: new Date().toISOString(),
    })
    .where(
      and(
        eq(utilityLineupUploadJobs.id, jobId),
        eq(utilityLineupUploadJobs.authorProfileId, gate.profileId),
        eq(utilityLineupUploadJobs.kind, "enemy_pov"),
        inArray(utilityLineupUploadJobs.status, ["queued", "uploading"]),
      ),
    )
    .returning({ id: utilityLineupUploadJobs.id });

  if (!updated.length) {
    return { ok: false, code: "NOT_FOUND", message: "Job not found." };
  }

  void track("utility_enemy_pov_job_failed", {
    job_id: jobId,
    error_code: "UPLOAD",
  });
  return { ok: true };
}

export async function finalizeEnemyPovUploadJobAction(
  jobId: string,
): Promise<FinalizeEnemyPovJobResult> {
  const gate = await resolveUtilityLineupUploadEligibility();
  if (!gate.ok) {
    return {
      ok: false,
      code: gate.code === "NOT_SIGNED_IN" ? "UNAUTHORIZED" : "FORBIDDEN",
      message: gate.message,
    };
  }

  const jobs = await db
    .select()
    .from(utilityLineupUploadJobs)
    .where(
      and(
        eq(utilityLineupUploadJobs.id, jobId),
        eq(utilityLineupUploadJobs.authorProfileId, gate.profileId),
        eq(utilityLineupUploadJobs.kind, "enemy_pov"),
        inArray(utilityLineupUploadJobs.status, ["queued", "uploading"]),
      ),
    )
    .limit(1);

  const job = jobs[0];
  if (!job) {
    return {
      ok: false,
      code: "NOT_FOUND",
      message: "Upload job not found or already processed.",
    };
  }

  const merged = {
    ...(job.payloadJson as EnemyPovJobPayload),
    videoObjectPath: job.videoObjectPath,
  };

  const parsed = enemyPovFinalizeSchema.safeParse(merged);
  if (!parsed.success) {
    await db
      .update(utilityLineupUploadJobs)
      .set({
        status: "failed",
        errorMessage: formatZodErrorForClient(parsed.error),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(utilityLineupUploadJobs.id, jobId));
    void track("utility_enemy_pov_job_failed", {
      job_id: jobId,
      error_code: "VALIDATION",
    });
    return {
      ok: false,
      code: "VALIDATION",
      message: formatZodErrorForClient(parsed.error),
    };
  }

  const v = parsed.data;
  if (
    !videoObjectPathMatchesSubmit(
      v.videoObjectPath,
      v.mapSlug,
      v.grenadeType,
      "enemy_pov",
    )
  ) {
    await db
      .update(utilityLineupUploadJobs)
      .set({
        status: "failed",
        errorMessage: "Video path does not match map and grenade.",
        updatedAt: new Date().toISOString(),
      })
      .where(eq(utilityLineupUploadJobs.id, jobId));
    void track("utility_enemy_pov_job_failed", {
      job_id: jobId,
      error_code: "PATH_MISMATCH",
    });
    return {
      ok: false,
      code: "PATH_MISMATCH",
      message: "Video path does not match this map and grenade type.",
    };
  }

  const exists = await storageObjectExists(job.videoObjectPath);
  if (!exists) {
    await db
      .update(utilityLineupUploadJobs)
      .set({
        status: "failed",
        errorMessage: "Video not found in storage yet. Finish uploading and try again.",
        updatedAt: new Date().toISOString(),
      })
      .where(eq(utilityLineupUploadJobs.id, jobId));
    void track("utility_enemy_pov_job_failed", {
      job_id: jobId,
      error_code: "STORAGE",
    });
    return {
      ok: false,
      code: "STORAGE",
      message:
        "Video not found in storage yet. Wait for upload to finish, then retry finalize.",
    };
  }

  await db
    .update(utilityLineupUploadJobs)
    .set({ status: "finalizing", updatedAt: new Date().toISOString() })
    .where(eq(utilityLineupUploadJobs.id, jobId));

  const inserted = await insertEnemyPovVideoRow(gate.profileId, v);
  if (!inserted.ok) {
    await db
      .update(utilityLineupUploadJobs)
      .set({
        status: "failed",
        errorMessage: inserted.message,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(utilityLineupUploadJobs.id, jobId));
    void track("utility_enemy_pov_job_failed", {
      job_id: jobId,
      error_code: inserted.code,
    });
    return {
      ok: false,
      code: inserted.code === "NOT_FOUND" ? "NOT_FOUND" : "SERVER",
      message: inserted.message,
    };
  }

  await db
    .update(utilityLineupUploadJobs)
    .set({
      status: "completed",
      enemyPovVideoId: inserted.enemyPovVideoId,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(utilityLineupUploadJobs.id, jobId));

  void track("utility_enemy_pov_job_completed", {
    job_id: jobId,
    enemy_pov_video_id: inserted.enemyPovVideoId,
    lineup_id: v.lineupId,
  });
  revalidatePath("/utility");
  revalidatePath(`/utility/${v.mapSlug}`);
  return { ok: true, enemyPovVideoId: inserted.enemyPovVideoId };
}
