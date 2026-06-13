import { and, asc, desc, eq, inArray, isNull } from "drizzle-orm";

import type { AppDb } from "@/server/db/create-app-db";
import type { RlsTx } from "@/server/db/drizzle";
import {
  organisations,
  userOrganisations,
  userProfiles,
  userVenues,
  venues,
} from "@/server/db/schema";
import {
  PLATFORM_OWNER_ROLE_ID,
} from "@/server/onboarding/constants";

export const onboardingRepo = {
  async getProfileSetupCompletedAt(tx: RlsTx, userId: string) {
    const rows = await tx
      .select({ setupCompletedAt: userProfiles.setupCompletedAt })
      .from(userProfiles)
      .where(eq(userProfiles.id, userId))
      .limit(1);
    return rows[0]?.setupCompletedAt ?? null;
  },

  async listOwnerMemberships(tx: RlsTx, userId: string) {
    return tx
      .select({
        id: userOrganisations.id,
        organisationId: userOrganisations.organisationId,
      })
      .from(userOrganisations)
      .where(
        and(
          eq(userOrganisations.userProfileId, userId),
          eq(userOrganisations.roleId, PLATFORM_OWNER_ROLE_ID),
          eq(userOrganisations.isActive, true),
          isNull(userOrganisations.archivedAt),
        ),
      );
  },

  async listOrganisationsByIds(tx: RlsTx, orgIds: string[]) {
    if (orgIds.length === 0) return [];
    return tx
      .select({
        id: organisations.id,
        name: organisations.name,
        slug: organisations.slug,
        abn: organisations.abn,
        isGstRegistered: organisations.isGstRegistered,
        setupProgress: organisations.setupProgress,
        createdAt: organisations.createdAt,
      })
      .from(organisations)
      .where(
        and(inArray(organisations.id, orgIds), isNull(organisations.archivedAt)),
      )
      .orderBy(desc(organisations.createdAt));
  },

  async listVenuesForOrganisation(tx: RlsTx, organisationId: string) {
    return tx
      .select({
        id: venues.id,
        name: venues.name,
        slug: venues.slug,
        timezone: venues.timezone,
        dataStartsFrom: venues.dataStartsFrom,
      })
      .from(venues)
      .where(
        and(
          eq(venues.organisationId, organisationId),
          eq(venues.isActive, true),
          isNull(venues.archivedAt),
        ),
      )
      .orderBy(asc(venues.createdAt));
  },

  async requireOwnerMembership(
    tx: RlsTx,
    userId: string,
    organisationId: string,
  ) {
    const rows = await tx
      .select({ id: userOrganisations.id })
      .from(userOrganisations)
      .where(
        and(
          eq(userOrganisations.userProfileId, userId),
          eq(userOrganisations.organisationId, organisationId),
          eq(userOrganisations.roleId, PLATFORM_OWNER_ROLE_ID),
          eq(userOrganisations.isActive, true),
          isNull(userOrganisations.archivedAt),
        ),
      )
      .limit(1);
    return rows[0] ?? null;
  },

  async updateOrganisation(
    tx: RlsTx,
    organisationId: string,
    row: {
      name: string;
      abn: string | null;
      isGstRegistered: boolean;
      updatedAt: string;
    },
  ) {
    const updated = await tx
      .update(organisations)
      .set(row)
      .where(eq(organisations.id, organisationId))
      .returning({
        id: organisations.id,
        name: organisations.name,
        slug: organisations.slug,
        abn: organisations.abn,
        isGstRegistered: organisations.isGstRegistered,
        setupProgress: organisations.setupProgress,
      });
    return updated[0] ?? null;
  },

  async mergeSetupProgress(
    tx: RlsTx,
    organisationId: string,
    patch: Record<string, unknown>,
    updatedAt: string,
  ) {
    const rows = await tx
      .select({ setupProgress: organisations.setupProgress })
      .from(organisations)
      .where(eq(organisations.id, organisationId))
      .limit(1);
    const current = (rows[0]?.setupProgress ?? {}) as Record<string, unknown>;
    const merged = { ...current, ...patch };
    await tx
      .update(organisations)
      .set({ setupProgress: merged, updatedAt })
      .where(eq(organisations.id, organisationId));
    return merged;
  },

  async insertOrganisation(
    appDb: AppDb,
    row: typeof organisations.$inferInsert,
  ) {
    // Bootstrap insert before user_organisations exists; RLS INSERT policies do not apply reliably
    // when combined with FOR ALL admin policies (see 20260602160000 migration).
    const inserted = await appDb.admin
      .insert(organisations)
      .values(row)
      .returning({
        id: organisations.id,
        name: organisations.name,
        slug: organisations.slug,
        abn: organisations.abn,
        isGstRegistered: organisations.isGstRegistered,
        setupProgress: organisations.setupProgress,
      });
    return inserted[0];
  },

  async insertUserOrganisation(
    appDb: AppDb,
    row: typeof userOrganisations.$inferInsert,
  ) {
    await appDb.rls((tx) => tx.insert(userOrganisations).values(row));
  },

  async insertVenue(appDb: AppDb, row: typeof venues.$inferInsert) {
    const inserted = await appDb.rls((tx) =>
      tx.insert(venues).values(row).returning({
        id: venues.id,
        name: venues.name,
        slug: venues.slug,
        timezone: venues.timezone,
        dataStartsFrom: venues.dataStartsFrom,
      }),
    );
    return inserted[0];
  },

  async insertUserVenue(appDb: AppDb, row: typeof userVenues.$inferInsert) {
    await appDb.rls((tx) => tx.insert(userVenues).values(row));
  },

  async markSetupCompleted(appDb: AppDb, userId: string, completedAt: string) {
    await appDb.rls((tx) =>
      tx
        .update(userProfiles)
        .set({ setupCompletedAt: completedAt, updatedAt: completedAt })
        .where(eq(userProfiles.id, userId)),
    );
  },
};
