"use server";

import { track } from "@vercel/analytics/server";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { formatZodErrorForClient } from "@/entities/utility-lineups/lib/format-zod-error";
import {
  userLineupFinalizeSchema,
  type UserLineupFinalizeInput,
} from "@/entities/utility-lineups/lib/user-lineup-submit-schema";
import { videoObjectPathMatchesSubmit } from "@/entities/utility-lineups/lib/video-object-path-matches-submit";
import { resolveUtilityLineupUploadEligibility } from "@/entities/utility-lineups/lib/utility-lineup-upload-eligibility";
import type { EnemyPovFinalizeInput } from "@/entities/utility-lineups/lib/enemy-pov-submit-schema";
import { db } from "@/server/db/drizzle";
import {
  maps,
  utilityLineupEnemyPovVideos,
  utilityLineups,
} from "@/server/db/schema";

export type UserLineupSubmitActionResult =
  | { ok: true; lineupId: string }
  | {
      ok: false;
      code:
        | "VALIDATION"
        | "UNAUTHORIZED"
        | "FORBIDDEN"
        | "NOT_FOUND"
        | "PATH_MISMATCH"
        | "SERVER";
      message: string;
    };

export type InsertEnemyPovVideoResult =
  | { ok: true; enemyPovVideoId: string }
  | {
      ok: false;
      code: "NOT_FOUND" | "SERVER";
      message: string;
    };

/** Shared insert for direct finalize and upload-job finalize (Drizzle / service role). */
export async function insertPendingUtilityLineupRow(
  profileId: string,
  v: UserLineupFinalizeInput,
): Promise<UserLineupSubmitActionResult> {
  try {
    const mapRow = await db
      .select({ id: maps.id, slug: maps.slug })
      .from(maps)
      .where(and(eq(maps.id, v.mapId), eq(maps.slug, v.mapSlug), eq(maps.isActive, true)))
      .limit(1);
    if (!mapRow.length) {
      return { ok: false, code: "NOT_FOUND", message: "Map not found." };
    }

    const [inserted] = await db
      .insert(utilityLineups)
      .values({
        mapId: v.mapId,
        throwSpotX: v.throwSpotX,
        throwSpotY: v.throwSpotY,
        landSpotX: v.landSpotX,
        landSpotY: v.landSpotY,
        throwLabel: v.throwLabel,
        landLabel: v.landLabel,
        grenadeType: v.grenadeType,
        side: v.side,
        movement: v.movement,
        technique: v.technique,
        margin: v.margin,
        youtubeUrl: v.youtubeUrl,
        videoObjectPath: v.videoObjectPath.trim(),
        videoStartMs: v.videoStartMs,
        videoEndMs: v.videoEndMs ?? null,
        stillStandMs: v.stillStandMs ?? null,
        stillThrowMs: v.stillThrowMs ?? null,
        stillLandMs: v.stillLandMs ?? null,
        grenadeReleaseMs: v.grenadeReleaseMs ?? null,
        grenadeBloomMs: v.grenadeBloomMs ?? null,
        lineupImageUrl: v.lineupImageUrl ?? null,
        description: v.description,
        setposText: v.setposText ?? null,
        authorProfileId: profileId,
        status: "pending",
        proVerified: false,
        intradarkVerified: false,
        updatedAt: new Date().toISOString(),
      })
      .returning({ id: utilityLineups.id });

    if (!inserted) {
      return {
        ok: false,
        code: "SERVER",
        message: "Could not save lineup.",
      };
    }

    return { ok: true, lineupId: inserted.id };
  } catch (e) {
    console.error("insertPendingUtilityLineupRow", e);
    return {
      ok: false,
      code: "SERVER",
      message: "Could not save lineup. Try again.",
    };
  }
}

/** Insert a single enemy POV companion row tied to an existing parent lineup. */
export async function insertEnemyPovVideoRow(
  profileId: string,
  v: EnemyPovFinalizeInput,
): Promise<InsertEnemyPovVideoResult> {
  try {
    const parent = await db
      .select({ id: utilityLineups.id, authorProfileId: utilityLineups.authorProfileId })
      .from(utilityLineups)
      .where(eq(utilityLineups.id, v.lineupId))
      .limit(1);
    const parentRow = parent[0];
    if (!parentRow) {
      return { ok: false, code: "NOT_FOUND", message: "Parent lineup not found." };
    }
    if (parentRow.authorProfileId !== profileId) {
      return { ok: false, code: "NOT_FOUND", message: "Parent lineup not found." };
    }

    const [inserted] = await db
      .insert(utilityLineupEnemyPovVideos)
      .values({
        lineupId: v.lineupId,
        authorProfileId: profileId,
        videoObjectPath: v.videoObjectPath.trim(),
        description: v.description ?? null,
        videoStartMs: v.videoStartMs,
        videoEndMs: v.videoEndMs ?? null,
        updatedAt: new Date().toISOString(),
      })
      .returning({ id: utilityLineupEnemyPovVideos.id });

    if (!inserted) {
      return { ok: false, code: "SERVER", message: "Could not save enemy POV video." };
    }

    return { ok: true, enemyPovVideoId: inserted.id };
  } catch (e) {
    console.error("insertEnemyPovVideoRow", e);
    return {
      ok: false,
      code: "SERVER",
      message: "Could not save enemy POV video. Try again.",
    };
  }
}

export async function finalizeUserUtilityLineupAction(
  raw: unknown,
): Promise<UserLineupSubmitActionResult> {
  const gate = await resolveUtilityLineupUploadEligibility();
  if (!gate.ok) {
    return {
      ok: false,
      code: gate.code === "NOT_SIGNED_IN" ? "UNAUTHORIZED" : "FORBIDDEN",
      message: gate.message,
    };
  }
  const profileId = gate.profileId;

  const parsed = userLineupFinalizeSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      code: "VALIDATION",
      message: formatZodErrorForClient(parsed.error),
    };
  }

  const v = parsed.data;

  if (
    !videoObjectPathMatchesSubmit(v.videoObjectPath, v.mapSlug, v.grenadeType)
  ) {
    return {
      ok: false,
      code: "PATH_MISMATCH",
      message: "Video path does not match this map and grenade type.",
    };
  }

  const inserted = await insertPendingUtilityLineupRow(profileId, v);
  if (!inserted.ok) {
    void track("utility_lineup_submit_finalize", { ok: false });
    return inserted;
  }

  void track("utility_lineup_submit_finalize", {
    ok: true,
    map_slug: v.mapSlug,
  });
  revalidatePath("/utility");
  revalidatePath(`/utility/${v.mapSlug}`);
  revalidatePath("/admin/utility/pending");
  return { ok: true, lineupId: inserted.lineupId };
}
