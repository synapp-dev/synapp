"use server";

import { track } from "@vercel/analytics/server";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { getSessionUserId } from "@/entities/admin/lib/auth-session";
import { getRoleSlugsForUser } from "@/entities/admin/lib/get-role-slugs-for-user";
import { ROLE_DEVELOPER } from "@/entities/admin/lib/rbac-constants";
import { hasRoleSlug } from "@/entities/admin/lib/role-slugs";
import {
  adminMapSpotCreateSchema,
  adminMapSpotDeleteSchema,
  adminMapSpotUpdateSchema,
} from "@/entities/utility-lineups/lib/admin-map-spots-schema";
import { db } from "@/server/db/drizzle";
import { maps, utilityMapSpots } from "@/server/db/schema";

export type AdminMapSpotActionResult =
  | { ok: true }
  | { ok: false; code: "FORBIDDEN" | "VALIDATION" | "NOT_FOUND" | "CONFLICT" | "SERVER"; message: string };

async function requireDeveloper(): Promise<AdminMapSpotActionResult | { ok: true }> {
  const userId = await getSessionUserId();
  if (!userId) {
    return { ok: false, code: "FORBIDDEN", message: "Sign in required." };
  }
  const slugs = await getRoleSlugsForUser(userId);
  if (!hasRoleSlug(slugs, ROLE_DEVELOPER)) {
    return { ok: false, code: "FORBIDDEN", message: "Developer role required." };
  }
  return { ok: true };
}

function revalidateMapsAdmin() {
  revalidatePath("/admin/maps");
  revalidatePath("/admin/utility");
  revalidatePath("/utility");
}

export async function createUtilityMapSpotAction(
  raw: unknown,
): Promise<AdminMapSpotActionResult> {
  const gate = await requireDeveloper();
  if (!gate.ok) return gate;

  const parsed = adminMapSpotCreateSchema.safeParse(raw);
  if (!parsed.success) {
    const first =
      parsed.error.flatten().formErrors[0] ??
      Object.values(parsed.error.flatten().fieldErrors).flat()[0] ??
      "Invalid input.";
    return { ok: false, code: "VALIDATION", message: first };
  }

  const v = parsed.data;
  try {
    const mapRow = await db
      .select({ id: maps.id })
      .from(maps)
      .where(eq(maps.id, v.mapId))
      .limit(1);
    if (!mapRow.length) {
      return { ok: false, code: "NOT_FOUND", message: "Map not found." };
    }

    await db.insert(utilityMapSpots).values({
      mapId: v.mapId,
      slug: v.slug,
      label: v.label,
      radarX: v.radarX,
      radarY: v.radarY,
      updatedAt: new Date().toISOString(),
    });

    void track("utility_admin_map_spot_create", { ok: true });
    revalidateMapsAdmin();
    return { ok: true };
  } catch (e) {
    console.error("createUtilityMapSpotAction", e);
    const msg = e instanceof Error ? e.message : "";
    if (msg.includes("unique") || msg.includes("duplicate")) {
      return {
        ok: false,
        code: "CONFLICT",
        message: "A spot with this slug already exists on this map.",
      };
    }
    void track("utility_admin_map_spot_create", { ok: false });
    return {
      ok: false,
      code: "SERVER",
      message: "Could not create spot. Try again.",
    };
  }
}

export async function updateUtilityMapSpotAction(
  raw: unknown,
): Promise<AdminMapSpotActionResult> {
  const gate = await requireDeveloper();
  if (!gate.ok) return gate;

  const parsed = adminMapSpotUpdateSchema.safeParse(raw);
  if (!parsed.success) {
    const first =
      parsed.error.flatten().formErrors[0] ??
      Object.values(parsed.error.flatten().fieldErrors).flat()[0] ??
      "Invalid input.";
    return { ok: false, code: "VALIDATION", message: first };
  }

  const v = parsed.data;
  try {
    const existing = await db
      .select({ id: utilityMapSpots.id })
      .from(utilityMapSpots)
      .where(eq(utilityMapSpots.id, v.id))
      .limit(1);
    if (!existing.length) {
      return { ok: false, code: "NOT_FOUND", message: "Spot not found." };
    }

    await db
      .update(utilityMapSpots)
      .set({
        slug: v.slug,
        label: v.label,
        radarX: v.radarX,
        radarY: v.radarY,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(utilityMapSpots.id, v.id));

    void track("utility_admin_map_spot_update", { ok: true });
    revalidateMapsAdmin();
    return { ok: true };
  } catch (e) {
    console.error("updateUtilityMapSpotAction", e);
    const msg = e instanceof Error ? e.message : "";
    if (msg.includes("unique") || msg.includes("duplicate")) {
      return {
        ok: false,
        code: "CONFLICT",
        message: "A spot with this slug already exists on this map.",
      };
    }
    return {
      ok: false,
      code: "SERVER",
      message: "Could not update spot. Try again.",
    };
  }
}

export async function deleteUtilityMapSpotAction(
  raw: unknown,
): Promise<AdminMapSpotActionResult> {
  const gate = await requireDeveloper();
  if (!gate.ok) return gate;

  const parsed = adminMapSpotDeleteSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, code: "VALIDATION", message: "Invalid spot id." };
  }

  const { id } = parsed.data;
  try {
    const existing = await db
      .select({ mapId: utilityMapSpots.mapId })
      .from(utilityMapSpots)
      .where(eq(utilityMapSpots.id, id))
      .limit(1);
    if (!existing.length) {
      return { ok: false, code: "NOT_FOUND", message: "Spot not found." };
    }

    await db.delete(utilityMapSpots).where(eq(utilityMapSpots.id, id));

    void track("utility_admin_map_spot_delete", { ok: true });
    revalidateMapsAdmin();
    return { ok: true };
  } catch (e) {
    console.error("deleteUtilityMapSpotAction", e);
    return {
      ok: false,
      code: "SERVER",
      message: "Could not delete spot. Try again.",
    };
  }
}
