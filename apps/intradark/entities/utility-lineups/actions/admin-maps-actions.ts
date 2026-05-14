"use server";

import { track } from "@vercel/analytics/server";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { getSessionUserId } from "@/entities/admin/lib/auth-session";
import { getRoleSlugsForUser } from "@/entities/admin/lib/get-role-slugs-for-user";
import { ROLE_DEVELOPER } from "@/entities/admin/lib/rbac-constants";
import { hasRoleSlug } from "@/entities/admin/lib/role-slugs";
import { adminMapUpdateSchema } from "@/entities/utility-lineups/lib/admin-maps-schema";
import { db } from "@/server/db/drizzle";
import { maps } from "@/server/db/schema";

export type AdminMapActionResult =
  | { ok: true }
  | { ok: false; code: "FORBIDDEN" | "VALIDATION" | "NOT_FOUND" | "SERVER"; message: string };

async function requireDeveloper(): Promise<AdminMapActionResult | { ok: true }> {
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

export async function updateAdminMapAction(
  raw: unknown,
): Promise<AdminMapActionResult> {
  const gate = await requireDeveloper();
  if (!gate.ok) return gate;

  const parsed = adminMapUpdateSchema.safeParse(raw);
  if (!parsed.success) {
    const first = parsed.error.flatten().formErrors[0]
      ?? parsed.error.flatten().fieldErrors.slug?.[0]
      ?? "Invalid input.";
    return { ok: false, code: "VALIDATION", message: first };
  }

  const v = parsed.data;
  try {
    const updated = await db
      .update(maps)
      .set({
        slug: v.slug,
        displayName: v.displayName,
        poolId: v.poolId,
        radarImageUrl: v.radarImageUrl,
        badgeImageUrl: v.badgeImageUrl,
        mapScreenshotUrl: v.mapScreenshotUrl,
        isActive: v.isActive,
        sortOrder: v.sortOrder,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(maps.id, v.id))
      .returning({ id: maps.id });

    if (!updated.length) {
      return { ok: false, code: "NOT_FOUND", message: "Map not found." };
    }

    void track("utility_admin_map_upsert", {
      ok: true,
      map_slug: v.slug,
    });
    revalidatePath("/admin/maps");
    revalidatePath("/admin/utility");
    revalidatePath("/utility");
    revalidatePath(`/utility/${v.slug}`);
    return { ok: true };
  } catch (e) {
    console.error("updateAdminMapAction", e);
    void track("utility_admin_map_upsert", { ok: false, code: "server" });
    return {
      ok: false,
      code: "SERVER",
      message: "Could not save map. Try again.",
    };
  }
}
