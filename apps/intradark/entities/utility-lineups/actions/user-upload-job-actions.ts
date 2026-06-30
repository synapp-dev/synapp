"use server";

import { track } from "@vercel/analytics/server";
import { createClient } from "@supabase/supabase-js";
import { and, asc, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { formatZodErrorForClient } from "@/entities/utility-lineups/lib/format-zod-error";
import {
  userLineupFinalizeSchema,
  type UserLineupJobPayload,
  utilityLineupUploadJobCreateSchema,
} from "@/entities/utility-lineups/lib/user-lineup-submit-schema";
import { resolveUtilityLineupUploadEligibility } from "@/entities/utility-lineups/lib/utility-lineup-upload-eligibility";
import { getEffectiveRoleSlugsForUser } from "@/entities/rbac/lib/get-effective-role-slugs";
import { hasUtilityEditorRole } from "@/entities/utility-lineups/lib/roles";
import { INTRADARK_MEDIA_BUCKET } from "@/lib/media/constants";
import { validateMediaObjectPath } from "@/lib/media/storage-paths";
import { buildUtilityLineupVideoObjectPath } from "@/lib/media/utility-lineup-upload-path";
import { db } from "@/server/db/drizzle";
import { maps, utilityLineupUploadJobs } from "@/server/db/schema";

import { insertPendingUtilityLineupRow } from "./user-lineup-submit-actions";
import { videoObjectPathMatchesSubmit } from "@/entities/utility-lineups/lib/video-object-path-matches-submit";

const extForMime: Record<string, string> = {
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
};

const ACTIVE_JOB_STATUSES = ["queued", "uploading", "finalizing", "failed"] as const;

export type ListedUtilityUploadJob = {
  id: string;
  status: string;
  mapSlug: string;
  createdAt: string;
  errorMessage: string | null;
  kind: "lineup" | "enemy_pov";
  parentLineupId: string | null;
};

export type CreateUtilityUploadJobResult =
  | { ok: true; jobId: string; objectPath: string }
  | {
      ok: false;
      code: "VALIDATION" | "UNAUTHORIZED" | "FORBIDDEN" | "NOT_FOUND" | "SERVER";
      message: string;
    };

export type SimpleJobActionResult =
  | { ok: true }
  | {
      ok: false;
      code: "UNAUTHORIZED" | "FORBIDDEN" | "NOT_FOUND" | "CONFLICT" | "SERVER";
      message: string;
    };

export type FinalizeUtilityUploadJobResult =
  | { ok: true; lineupId: string }
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
  const { data, error } = await admin.storage.from(INTRADARK_MEDIA_BUCKET).list(dir, {
    limit: 100,
    search: name,
  });
  if (error || !data?.length) return false;
  return data.some((o) => o.name === name);
}

export async function createUtilityLineupUploadJobAction(
  raw: unknown,
): Promise<CreateUtilityUploadJobResult> {
  const gate = await resolveUtilityLineupUploadEligibility();
  if (!gate.ok) {
    return {
      ok: false,
      code: gate.code === "NOT_SIGNED_IN" ? "UNAUTHORIZED" : "FORBIDDEN",
      message: gate.message,
    };
  }

  const parsed = utilityLineupUploadJobCreateSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      code: "VALIDATION",
      message: formatZodErrorForClient(parsed.error),
    };
  }

  const { videoContentType, videoByteLength, ...jobPayload } = parsed.data;

  const mapRow = await db
    .select({ id: maps.id, slug: maps.slug })
    .from(maps)
    .where(
      and(
        eq(maps.id, jobPayload.mapId),
        eq(maps.slug, jobPayload.mapSlug),
        eq(maps.isActive, true),
      ),
    )
    .limit(1);
  if (!mapRow.length) {
    return { ok: false, code: "NOT_FOUND", message: "Map not found." };
  }

  const ext = extForMime[videoContentType];
  if (!ext) {
    return { ok: false, code: "VALIDATION", message: "Unsupported video type." };
  }

  const fileName = `${crypto.randomUUID()}.${ext}`;
  let objectPath: string;
  try {
    objectPath = buildUtilityLineupVideoObjectPath({
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
    const [row] = await db
      .insert(utilityLineupUploadJobs)
      .values({
        authorProfileId: gate.profileId,
        status: "queued",
        payloadJson: jobPayload,
        videoObjectPath: pathResult.path,
        expectedByteLength: videoByteLength,
        updatedAt: new Date().toISOString(),
      })
      .returning({ id: utilityLineupUploadJobs.id });

    if (!row) {
      return { ok: false, code: "SERVER", message: "Could not create upload job." };
    }

    void track("utility_upload_job_enqueued", {
      job_id: row.id,
      map_slug: jobPayload.mapSlug,
    });
    return { ok: true, jobId: row.id, objectPath: pathResult.path };
  } catch (e) {
    console.error("createUtilityLineupUploadJobAction", e);
    return { ok: false, code: "SERVER", message: "Could not create upload job." };
  }
}

export async function listUtilityLineupUploadJobsAction(): Promise<
  ListedUtilityUploadJob[]
> {
  const gate = await resolveUtilityLineupUploadEligibility();
  if (!gate.ok) {
    return [];
  }

  const rows = await db
    .select({
      id: utilityLineupUploadJobs.id,
      status: utilityLineupUploadJobs.status,
      payloadJson: utilityLineupUploadJobs.payloadJson,
      createdAt: utilityLineupUploadJobs.createdAt,
      errorMessage: utilityLineupUploadJobs.errorMessage,
      kind: utilityLineupUploadJobs.kind,
      parentLineupId: utilityLineupUploadJobs.parentLineupId,
    })
    .from(utilityLineupUploadJobs)
    .where(
      and(
        eq(utilityLineupUploadJobs.authorProfileId, gate.profileId),
        inArray(utilityLineupUploadJobs.status, [...ACTIVE_JOB_STATUSES]),
      ),
    )
    .orderBy(asc(utilityLineupUploadJobs.createdAt));

  return rows.map((r) => {
    const payload = r.payloadJson as { mapSlug?: string };
    const kind = r.kind === "enemy_pov" ? "enemy_pov" : "lineup";
    return {
      id: r.id,
      status: r.status,
      mapSlug: payload.mapSlug ?? "",
      createdAt: r.createdAt,
      errorMessage: r.errorMessage,
      kind,
      parentLineupId: r.parentLineupId,
    };
  });
}

export async function markUtilityLineupUploadJobUploadingAction(
  jobId: string,
): Promise<SimpleJobActionResult> {
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

export async function cancelUtilityLineupUploadJobAction(
  jobId: string,
): Promise<SimpleJobActionResult> {
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
      status: "cancelled",
      updatedAt: new Date().toISOString(),
    })
    .where(
      and(
        eq(utilityLineupUploadJobs.id, jobId),
        eq(utilityLineupUploadJobs.authorProfileId, gate.profileId),
        inArray(utilityLineupUploadJobs.status, ["queued", "uploading", "failed"]),
      ),
    )
    .returning({ id: utilityLineupUploadJobs.id });

  if (!updated.length) {
    return {
      ok: false,
      code: "CONFLICT",
      message: "Could not cancel this job.",
    };
  }
  return { ok: true };
}

export async function failUtilityLineupUploadJobAction(
  jobId: string,
  message: string,
): Promise<SimpleJobActionResult> {
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
        inArray(utilityLineupUploadJobs.status, ["queued", "uploading"]),
      ),
    )
    .returning({ id: utilityLineupUploadJobs.id });

  if (!updated.length) {
    return { ok: false, code: "NOT_FOUND", message: "Job not found." };
  }

  void track("utility_upload_job_failed", {
    job_id: jobId,
    error_code: "UPLOAD",
  });
  return { ok: true };
}

export async function retryUtilityLineupUploadJobAction(
  jobId: string,
): Promise<SimpleJobActionResult> {
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
      status: "queued",
      errorMessage: null,
      updatedAt: new Date().toISOString(),
    })
    .where(
      and(
        eq(utilityLineupUploadJobs.id, jobId),
        eq(utilityLineupUploadJobs.authorProfileId, gate.profileId),
        eq(utilityLineupUploadJobs.status, "failed"),
      ),
    )
    .returning({ id: utilityLineupUploadJobs.id });

  if (!updated.length) {
    return {
      ok: false,
      code: "NOT_FOUND",
      message: "No failed job to retry.",
    };
  }

  void track("utility_upload_job_retry_clicked", { job_id: jobId });
  return { ok: true };
}

export async function finalizeUtilityLineupUploadJobAction(
  jobId: string,
): Promise<FinalizeUtilityUploadJobResult> {
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

  const payload = job.payloadJson as UserLineupJobPayload;
  const merged = {
    ...payload,
    videoObjectPath: job.videoObjectPath,
  };

  const parsed = userLineupFinalizeSchema.safeParse(merged);
  if (!parsed.success) {
    await db
      .update(utilityLineupUploadJobs)
      .set({
        status: "failed",
        errorMessage: formatZodErrorForClient(parsed.error),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(utilityLineupUploadJobs.id, jobId));
    void track("utility_upload_job_failed", {
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
  if (!videoObjectPathMatchesSubmit(v.videoObjectPath, v.mapSlug, v.grenadeType)) {
    await db
      .update(utilityLineupUploadJobs)
      .set({
        status: "failed",
        errorMessage: "Video path does not match map and grenade.",
        updatedAt: new Date().toISOString(),
      })
      .where(eq(utilityLineupUploadJobs.id, jobId));
    void track("utility_upload_job_failed", {
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
    void track("utility_upload_job_failed", {
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

  // Utility editors (and developers) skip the moderation queue: publish on submit.
  const slugs = await getEffectiveRoleSlugsForUser(gate.userId);
  const autoPublish = hasUtilityEditorRole(slugs);

  const inserted = await insertPendingUtilityLineupRow(
    gate.profileId,
    v,
    autoPublish ? "published" : "pending",
  );
  if (!inserted.ok) {
    await db
      .update(utilityLineupUploadJobs)
      .set({
        status: "failed",
        errorMessage: inserted.message,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(utilityLineupUploadJobs.id, jobId));
    void track("utility_upload_job_failed", {
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
      lineupId: inserted.lineupId,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(utilityLineupUploadJobs.id, jobId));

  void track("utility_upload_job_completed", {
    job_id: jobId,
    lineup_id: inserted.lineupId,
    auto_published: autoPublish,
  });
  revalidatePath("/utility");
  revalidatePath(`/utility/${v.mapSlug}`);
  revalidatePath("/admin/utility/pending");
  return { ok: true, lineupId: inserted.lineupId };
}
