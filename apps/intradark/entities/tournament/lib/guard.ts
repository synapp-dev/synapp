/**
 * Tournament authority gates. Two layers (plan §7.4):
 *  - platform-wide `tournament.admin` capability (developer implies it)
 *  - per-competition delegation via competition_organizers
 */
import "server-only";

import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { getSessionUserId } from "@/entities/admin/lib/auth-session";
import { ROLE_TOURNAMENT_ADMIN } from "@/entities/admin/lib/rbac-constants";
import { hasCapability } from "@/entities/admin/lib/role-slugs";
import { getEffectiveRoleSlugsForUser } from "@/entities/rbac/lib/get-effective-role-slugs";
import { db } from "@/server/db/drizzle";
import { competitionOrganizers } from "@/server/db/schema";

export async function isTournamentAdmin(userId: string): Promise<boolean> {
  const slugs = await getEffectiveRoleSlugsForUser(userId);
  return hasCapability(slugs, ROLE_TOURNAMENT_ADMIN);
}

/** Platform admin OR an organizer (any role) on this competition. */
export async function canManageCompetition(
  userId: string,
  competitionId: string,
): Promise<boolean> {
  if (await isTournamentAdmin(userId)) return true;
  const [row] = await db
    .select({ role: competitionOrganizers.role })
    .from(competitionOrganizers)
    .where(
      and(
        eq(competitionOrganizers.competitionId, competitionId),
        eq(competitionOrganizers.userId, userId),
      ),
    )
    .limit(1);
  return Boolean(row);
}

/** API-route guard: returns the userId, or a NextResponse to short-circuit. */
export async function requireTournamentAdmin(): Promise<
  { userId: string } | NextResponse
> {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  if (!(await isTournamentAdmin(userId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return { userId };
}

/** API-route guard scoped to one competition (admin or its organizer). */
export async function requireCompetitionManager(
  competitionId: string,
): Promise<{ userId: string } | NextResponse> {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  if (!(await canManageCompetition(userId, competitionId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return { userId };
}
