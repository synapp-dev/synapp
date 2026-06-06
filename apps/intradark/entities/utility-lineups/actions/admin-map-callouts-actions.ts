"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { getSessionUserId } from "@/entities/admin/lib/auth-session";
import { getEffectiveRoleSlugsForUser } from "@/entities/rbac/lib/get-effective-role-slugs";
import { ROLE_DEVELOPER } from "@/entities/admin/lib/rbac-constants";
import { hasRoleSlug } from "@/entities/admin/lib/role-slugs";
import {
  adminMapCalloutCreateSchema,
  adminMapCalloutDeleteSchema,
  adminMapCalloutUpdateSchema,
} from "@/entities/utility-lineups/lib/admin-map-callouts-schema";
import { db } from "@/server/db/drizzle";
import { mapCallouts, maps } from "@/server/db/schema";

export type AdminMapCalloutActionResult =
  | { ok: true }
  | { ok: false; code: "FORBIDDEN" | "VALIDATION" | "NOT_FOUND" | "CONFLICT" | "SERVER"; message: string };

async function requireDeveloper(): Promise<AdminMapCalloutActionResult | { ok: true }> {
  const userId = await getSessionUserId();
  if (!userId) {
    return { ok: false, code: "FORBIDDEN", message: "Sign in required." };
  }
  const slugs = await getEffectiveRoleSlugsForUser(userId);
  if (!hasRoleSlug(slugs, ROLE_DEVELOPER)) {
    return { ok: false, code: "FORBIDDEN", message: "Developer role required." };
  }
  return { ok: true };
}

function revalidateCallouts(mapSlug: string) {
  revalidatePath("/theory/callouts");
  revalidatePath(`/theory/callouts/${mapSlug}`);
  revalidatePath("/utility");
}

export async function createMapCalloutAction(
  raw: unknown,
): Promise<AdminMapCalloutActionResult> {
  const gate = await requireDeveloper();
  if (!gate.ok) return gate;

  const parsed = adminMapCalloutCreateSchema.safeParse(raw);
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

    await db.insert(mapCallouts).values({
      mapId: v.mapId,
      slug: v.slug,
      label: v.label,
      priority: v.priority,
      polygonRing: v.polygonRing,
    });
    revalidateCallouts(v.mapSlug);
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Could not save callout.";
    if (msg.includes("unique") || msg.includes("duplicate")) {
      return {
        ok: false,
        code: "CONFLICT",
        message: "A callout with this slug already exists for this map.",
      };
    }
    return { ok: false, code: "SERVER", message: msg };
  }
}

export async function updateMapCalloutAction(
  raw: unknown,
): Promise<AdminMapCalloutActionResult> {
  const gate = await requireDeveloper();
  if (!gate.ok) return gate;

  const parsed = adminMapCalloutUpdateSchema.safeParse(raw);
  if (!parsed.success) {
    const first =
      parsed.error.flatten().formErrors[0] ??
      Object.values(parsed.error.flatten().fieldErrors).flat()[0] ??
      "Invalid input.";
    return { ok: false, code: "VALIDATION", message: first };
  }

  const v = parsed.data;
  try {
    const updated = await db
      .update(mapCallouts)
      .set({
        slug: v.slug,
        label: v.label,
        priority: v.priority,
        polygonRing: v.polygonRing,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(mapCallouts.id, v.id))
      .returning({ id: mapCallouts.id });
    if (!updated.length) {
      return { ok: false, code: "NOT_FOUND", message: "Callout not found." };
    }
    revalidateCallouts(v.mapSlug);
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Could not update callout.";
    if (msg.includes("unique") || msg.includes("duplicate")) {
      return {
        ok: false,
        code: "CONFLICT",
        message: "A callout with this slug already exists for this map.",
      };
    }
    return { ok: false, code: "SERVER", message: msg };
  }
}

export async function deleteMapCalloutAction(
  raw: unknown,
): Promise<AdminMapCalloutActionResult> {
  const gate = await requireDeveloper();
  if (!gate.ok) return gate;

  const parsed = adminMapCalloutDeleteSchema.safeParse(raw);
  if (!parsed.success) {
    const first =
      parsed.error.flatten().formErrors[0] ??
      Object.values(parsed.error.flatten().fieldErrors).flat()[0] ??
      "Invalid input.";
    return { ok: false, code: "VALIDATION", message: first };
  }

  const v = parsed.data;
  try {
    const deleted = await db
      .delete(mapCallouts)
      .where(eq(mapCallouts.id, v.id))
      .returning({ id: mapCallouts.id });
    if (!deleted.length) {
      return { ok: false, code: "NOT_FOUND", message: "Callout not found." };
    }
    revalidateCallouts(v.mapSlug);
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Could not delete callout.";
    return { ok: false, code: "SERVER", message: msg };
  }
}
