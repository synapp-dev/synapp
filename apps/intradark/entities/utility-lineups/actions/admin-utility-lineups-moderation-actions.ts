"use server";

import { track } from "@vercel/analytics/server";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getSessionUserId } from "@/entities/admin/lib/auth-session";
import { getEffectiveRoleSlugsForUser } from "@/entities/rbac/lib/get-effective-role-slugs";
import { hasUtilityEditorRole } from "@/entities/utility-lineups/lib/roles";
import { formatZodErrorForClient } from "@/entities/utility-lineups/lib/format-zod-error";
import {
  optionalUtilityLineupMarkerMs,
  refineUtilityLineupTimelineFields,
} from "@/entities/utility-lineups/lib/user-lineup-submit-schema";
import { db } from "@/server/db/drizzle";
import { maps, utilityLineups } from "@/server/db/schema";

export type AdminUtilityModerationResult =
  | { ok: true }
  | {
      ok: false;
      code: "UNAUTHORIZED" | "FORBIDDEN" | "NOT_FOUND" | "VALIDATION" | "SERVER";
      message: string;
    };

async function requireUtilityEditor(): Promise<AdminUtilityModerationResult | { ok: true }> {
  const userId = await getSessionUserId();
  if (!userId) {
    return { ok: false, code: "UNAUTHORIZED", message: "Sign in required." };
  }
  const slugs = await getEffectiveRoleSlugsForUser(userId);
  if (!hasUtilityEditorRole(slugs)) {
    return {
      ok: false,
      code: "FORBIDDEN",
      message: "Utility editor role required.",
    };
  }
  return { ok: true };
}

const publishSchema = z.object({
  lineupId: z.string().uuid(),
  mapSlug: z.string().min(1).max(128),
});

const updateSpotsSchema = z.object({
  lineupId: z.string().uuid(),
  mapSlug: z.string().min(1).max(128),
  throwSpotX: z.number().min(0).max(1),
  throwSpotY: z.number().min(0).max(1),
  landSpotX: z.number().min(0).max(1),
  landSpotY: z.number().min(0).max(1),
});

const updateDetailsSchema = z.object({
  lineupId: z.string().uuid(),
  mapSlug: z.string().min(1).max(128),
  throwLabel: z.string().min(1).max(500),
  landLabel: z.string().min(1).max(500),
  grenadeType: z.enum(["smoke", "molotov", "flashbang", "he"]),
  side: z.enum(["t", "ct", "both"]),
  movement: z.enum([
    "stationary",
    "running",
    "walking",
    "crouched",
    "crouched_walking",
  ]),
  technique: z.enum([
    "left_click",
    "right_click",
    "left_and_right_click",
    "jump_left_click",
    "jump_right_click",
    "jump_left_and_right_click",
  ]),
  margin: z.enum(["low", "medium", "high"]),
  description: z.string().min(1).max(8000),
  setposText: z.string().max(4000).nullable().optional(),
  youtubeUrl: z
    .union([z.string().url().max(2000), z.literal(""), z.null()])
    .optional()
    .transform((s) => (s === "" || s === undefined || s === null ? null : s)),
});

const updateTimelineSchema = z
  .object({
    lineupId: z.string().uuid(),
    mapSlug: z.string().min(1).max(128),
    videoStartMs: z.number().int().min(0),
    videoEndMs: z.number().int().min(0).nullable().optional(),
    stillStandMs: optionalUtilityLineupMarkerMs,
    stillThrowMs: optionalUtilityLineupMarkerMs,
    stillLandMs: optionalUtilityLineupMarkerMs,
    grenadeReleaseMs: optionalUtilityLineupMarkerMs,
    grenadeBloomMs: optionalUtilityLineupMarkerMs,
  })
  .superRefine((data, ctx) =>
    refineUtilityLineupTimelineFields(
      {
        videoStartMs: data.videoStartMs,
        videoEndMs: data.videoEndMs,
        stillStandMs: data.stillStandMs,
        stillThrowMs: data.stillThrowMs,
        stillLandMs: data.stillLandMs,
        grenadeReleaseMs: data.grenadeReleaseMs,
        grenadeBloomMs: data.grenadeBloomMs,
      },
      ctx,
    ),
  );

export async function publishPendingUtilityLineupAction(
  raw: unknown,
): Promise<AdminUtilityModerationResult> {
  const gate = await requireUtilityEditor();
  if (!gate.ok) return gate;

  const parsed = publishSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, code: "VALIDATION", message: "Invalid input." };
  }

  const { lineupId, mapSlug } = parsed.data;

  try {
    const existing = await db
      .select({
        id: utilityLineups.id,
        status: utilityLineups.status,
        mapSlug: maps.slug,
      })
      .from(utilityLineups)
      .innerJoin(maps, eq(utilityLineups.mapId, maps.id))
      .where(eq(utilityLineups.id, lineupId))
      .limit(1);

    const row = existing[0];
    if (!row) {
      return { ok: false, code: "NOT_FOUND", message: "Lineup not found." };
    }
    if (row.status !== "pending") {
      return {
        ok: false,
        code: "VALIDATION",
        message: "Only pending lineups can be published from this action.",
      };
    }
    if (row.mapSlug !== mapSlug) {
      return { ok: false, code: "VALIDATION", message: "Map slug mismatch." };
    }

    await db
      .update(utilityLineups)
      .set({
        status: "published",
        updatedAt: new Date().toISOString(),
      })
      .where(eq(utilityLineups.id, lineupId));

    void track("utility_lineup_moderation_publish", { ok: true, lineup_id: lineupId });
    revalidatePath("/utility");
    revalidatePath(`/utility/${mapSlug}`);
    revalidatePath("/admin/utility/pending");
    return { ok: true };
  } catch (e) {
    console.error("publishPendingUtilityLineupAction", e);
    void track("utility_lineup_moderation_publish", { ok: false });
    return {
      ok: false,
      code: "SERVER",
      message: "Could not publish lineup.",
    };
  }
}

/** Utility-editor only: update stored throw / land normalized coords for a lineup on a map. */
export async function updateUtilityLineupSpotsAction(
  raw: unknown,
): Promise<AdminUtilityModerationResult> {
  const gate = await requireUtilityEditor();
  if (!gate.ok) return gate;

  const parsed = updateSpotsSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      code: "VALIDATION",
      message: formatZodErrorForClient(parsed.error),
    };
  }

  const { lineupId, mapSlug, throwSpotX, throwSpotY, landSpotX, landSpotY } = parsed.data;

  try {
    const existing = await db
      .select({
        id: utilityLineups.id,
        mapSlug: maps.slug,
      })
      .from(utilityLineups)
      .innerJoin(maps, eq(utilityLineups.mapId, maps.id))
      .where(eq(utilityLineups.id, lineupId))
      .limit(1);

    const row = existing[0];
    if (!row) {
      return { ok: false, code: "NOT_FOUND", message: "Lineup not found." };
    }
    if (row.mapSlug !== mapSlug) {
      return { ok: false, code: "VALIDATION", message: "Map slug mismatch." };
    }

    await db
      .update(utilityLineups)
      .set({
        throwSpotX,
        throwSpotY,
        landSpotX,
        landSpotY,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(utilityLineups.id, lineupId));

    void track("utility_lineup_spots_update", { ok: true, lineup_id: lineupId });
    revalidatePath("/utility");
    revalidatePath(`/utility/${mapSlug}`);
    revalidatePath("/admin/utility/pending");
    return { ok: true };
  } catch (e) {
    console.error("updateUtilityLineupSpotsAction", e);
    void track("utility_lineup_spots_update", { ok: false });
    return {
      ok: false,
      code: "SERVER",
      message: "Could not update lineup positions.",
    };
  }
}

/** Utility-editor only: playback trim + editorial / event timestamps (ms). */
export async function updateUtilityLineupTimelineAction(
  raw: unknown,
): Promise<AdminUtilityModerationResult> {
  const gate = await requireUtilityEditor();
  if (!gate.ok) return gate;

  const parsed = updateTimelineSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      code: "VALIDATION",
      message: formatZodErrorForClient(parsed.error),
    };
  }

  const {
    lineupId,
    mapSlug,
    videoStartMs,
    videoEndMs,
    stillStandMs,
    stillThrowMs,
    stillLandMs,
    grenadeReleaseMs,
    grenadeBloomMs,
  } = parsed.data;

  try {
    const existing = await db
      .select({
        id: utilityLineups.id,
        mapSlug: maps.slug,
      })
      .from(utilityLineups)
      .innerJoin(maps, eq(utilityLineups.mapId, maps.id))
      .where(eq(utilityLineups.id, lineupId))
      .limit(1);

    const row = existing[0];
    if (!row) {
      return { ok: false, code: "NOT_FOUND", message: "Lineup not found." };
    }
    if (row.mapSlug !== mapSlug) {
      return { ok: false, code: "VALIDATION", message: "Map slug mismatch." };
    }

    await db
      .update(utilityLineups)
      .set({
        videoStartMs,
        videoEndMs: videoEndMs ?? null,
        stillStandMs: stillStandMs ?? null,
        stillThrowMs: stillThrowMs ?? null,
        stillLandMs: stillLandMs ?? null,
        grenadeReleaseMs: grenadeReleaseMs ?? null,
        grenadeBloomMs: grenadeBloomMs ?? null,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(utilityLineups.id, lineupId));

    void track("utility_lineup_timeline_update", { ok: true, lineup_id: lineupId });
    revalidatePath("/utility");
    revalidatePath(`/utility/${mapSlug}`);
    revalidatePath("/admin/utility/pending");
    return { ok: true };
  } catch (e) {
    console.error("updateUtilityLineupTimelineAction", e);
    void track("utility_lineup_timeline_update", { ok: false });
    return {
      ok: false,
      code: "SERVER",
      message: "Could not update lineup timeline.",
    };
  }
}

/** Utility-editor only: nade metadata + text fields (everything the upload wizard collects besides spots/timeline/video). */
export async function updateUtilityLineupDetailsAction(
  raw: unknown,
): Promise<AdminUtilityModerationResult> {
  const gate = await requireUtilityEditor();
  if (!gate.ok) return gate;

  const parsed = updateDetailsSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      code: "VALIDATION",
      message: formatZodErrorForClient(parsed.error),
    };
  }

  const {
    lineupId,
    mapSlug,
    throwLabel,
    landLabel,
    grenadeType,
    side,
    movement,
    technique,
    margin,
    description,
    setposText,
    youtubeUrl,
  } = parsed.data;

  try {
    const existing = await db
      .select({
        id: utilityLineups.id,
        mapSlug: maps.slug,
      })
      .from(utilityLineups)
      .innerJoin(maps, eq(utilityLineups.mapId, maps.id))
      .where(eq(utilityLineups.id, lineupId))
      .limit(1);

    const row = existing[0];
    if (!row) {
      return { ok: false, code: "NOT_FOUND", message: "Lineup not found." };
    }
    if (row.mapSlug !== mapSlug) {
      return { ok: false, code: "VALIDATION", message: "Map slug mismatch." };
    }

    await db
      .update(utilityLineups)
      .set({
        throwLabel,
        landLabel,
        grenadeType,
        side,
        movement,
        technique,
        margin,
        description,
        setposText: setposText ?? null,
        youtubeUrl: youtubeUrl ?? null,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(utilityLineups.id, lineupId));

    void track("utility_lineup_details_update", { ok: true, lineup_id: lineupId });
    revalidatePath("/utility");
    revalidatePath(`/utility/${mapSlug}`);
    revalidatePath("/admin/utility/pending");
    return { ok: true };
  } catch (e) {
    console.error("updateUtilityLineupDetailsAction", e);
    void track("utility_lineup_details_update", { ok: false });
    return {
      ok: false,
      code: "SERVER",
      message: "Could not update lineup details.",
    };
  }
}
