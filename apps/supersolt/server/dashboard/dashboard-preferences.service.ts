import { and, eq, isNull } from "drizzle-orm";

import type { RequestAuthContext } from "@/server/auth/context";
import type { AppDb } from "@/server/db/create-app-db";
import {
  dashboardUserPreferences,
  organisations,
  userOrganisations,
} from "@/server/db/schema";
import type { DashboardPreferencesRow } from "@/entities/dashboard/model/dashboard-preferences-types";
import type { DashboardPreferencesPatch } from "@/server/dashboard/dashboard-preferences.schema";

function rowFromDb(r: {
  timeWindow: string;
  venueScopeMode: string;
  selectedVenueIds: string[] | null;
  customRangeStart: string | null;
  customRangeEnd: string | null;
  updatedAt: string;
}): DashboardPreferencesRow {
  return {
    timeWindow: r.timeWindow,
    venueScopeMode: r.venueScopeMode,
    selectedVenueIds: r.selectedVenueIds,
    customRangeStart: r.customRangeStart,
    customRangeEnd: r.customRangeEnd,
    updatedAt: r.updatedAt,
  };
}

const DEFAULTS: DashboardPreferencesRow = {
  timeWindow: "today",
  venueScopeMode: "all",
  selectedVenueIds: null,
  customRangeStart: null,
  customRangeEnd: null,
  updatedAt: new Date(0).toISOString(),
};

export async function getDashboardPreferencesForUserOrg(
  ctx: RequestAuthContext,
  organisationId: string,
): Promise<DashboardPreferencesRow> {
  const row = await ctx.appDb.rls((tx) =>
    tx
      .select({
        timeWindow: dashboardUserPreferences.timeWindow,
        venueScopeMode: dashboardUserPreferences.venueScopeMode,
        selectedVenueIds: dashboardUserPreferences.selectedVenueIds,
        customRangeStart: dashboardUserPreferences.customRangeStart,
        customRangeEnd: dashboardUserPreferences.customRangeEnd,
        updatedAt: dashboardUserPreferences.updatedAt,
      })
      .from(dashboardUserPreferences)
      .where(
        and(
          eq(dashboardUserPreferences.userProfileId, ctx.userId),
          eq(dashboardUserPreferences.organisationId, organisationId),
        ),
      )
      .limit(1),
  );

  if (!row[0]) {
    return DEFAULTS;
  }
  return rowFromDb(row[0]);
}

export async function upsertDashboardPreferencesForUserOrg(
  ctx: RequestAuthContext,
  organisationId: string,
  patch: DashboardPreferencesPatch,
): Promise<DashboardPreferencesRow> {
  const payload = {
    userProfileId: ctx.userId,
    organisationId,
    timeWindow: patch.timeWindow,
    venueScopeMode: patch.venueScopeMode,
    selectedVenueIds:
      patch.venueScopeMode === "all" ? null : (patch.selectedVenueIds ?? null),
    customRangeStart:
      patch.timeWindow === "custom" ? patch.customRangeStart : null,
    customRangeEnd: patch.timeWindow === "custom" ? patch.customRangeEnd : null,
    updatedAt: new Date().toISOString(),
  };

  const rows = await ctx.appDb.rls((tx) =>
    tx
      .insert(dashboardUserPreferences)
      .values(payload)
      .onConflictDoUpdate({
        target: [
          dashboardUserPreferences.userProfileId,
          dashboardUserPreferences.organisationId,
        ],
        set: {
          timeWindow: payload.timeWindow,
          venueScopeMode: payload.venueScopeMode,
          selectedVenueIds: payload.selectedVenueIds,
          customRangeStart: payload.customRangeStart,
          customRangeEnd: payload.customRangeEnd,
          updatedAt: payload.updatedAt,
        },
      })
      .returning({
        timeWindow: dashboardUserPreferences.timeWindow,
        venueScopeMode: dashboardUserPreferences.venueScopeMode,
        selectedVenueIds: dashboardUserPreferences.selectedVenueIds,
        customRangeStart: dashboardUserPreferences.customRangeStart,
        customRangeEnd: dashboardUserPreferences.customRangeEnd,
        updatedAt: dashboardUserPreferences.updatedAt,
      }),
  );

  const saved = rows[0];
  if (!saved) {
    throw new Error("Failed to save dashboard preferences");
  }
  return rowFromDb(saved);
}

export async function resolveOrganisationIdForMemberSlug(
  appDb: AppDb,
  userId: string,
  organisationSlug: string,
): Promise<string | null> {
  return appDb.rls(async (tx) => {
    const orgRows = await tx
      .select({ id: organisations.id })
      .from(organisations)
      .where(
        and(
          eq(organisations.slug, organisationSlug),
          eq(organisations.isActive, true),
          isNull(organisations.archivedAt),
        ),
      )
      .limit(1);

    const org = orgRows[0];
    if (!org) {
      return null;
    }

    const membership = await tx
      .select({ id: userOrganisations.id })
      .from(userOrganisations)
      .where(
        and(
          eq(userOrganisations.userProfileId, userId),
          eq(userOrganisations.organisationId, org.id),
          eq(userOrganisations.isActive, true),
          isNull(userOrganisations.archivedAt),
        ),
      )
      .limit(1);

    if (!membership[0]) {
      return null;
    }

    return org.id;
  });
}
