import { and, eq, isNull, sql } from "drizzle-orm";

import type { RlsTx } from "@/server/db/drizzle";
import {
  ingredients,
  suppliers,
  userOrganisations,
  userVenues,
} from "@/server/db/schema";

export type ReadinessVenueCounts = {
  supplierCount: number;
  mappedIngredientCount: number;
  venueStaffCount: number;
};

export const readinessRepo = {
  async getVenueCounts(
    tx: RlsTx,
    args: { organisationId: string; venueId: string },
  ): Promise<ReadinessVenueCounts> {
    const baseScope = and(
      eq(suppliers.organisationId, args.organisationId),
      isNull(suppliers.archivedAt),
      sql`(${suppliers.venueId} IS NULL OR ${suppliers.venueId} = ${args.venueId})`,
    );

    const supplierRows = await tx
      .select({ count: sql<number>`count(*)::int` })
      .from(suppliers)
      .where(baseScope);

    const mappedIngredientRows = await tx
      .select({ count: sql<number>`count(*)::int` })
      .from(ingredients)
      .where(
        and(
          eq(ingredients.organisationId, args.organisationId),
          eq(ingredients.venueId, args.venueId),
          isNull(ingredients.archivedAt),
          sql`(
            ${ingredients.activeSupplierProductId} IS NOT NULL
            OR ${ingredients.supplierId} IS NOT NULL
          )`,
        ),
      );

    const staffRows = await tx
      .select({ count: sql<number>`count(*)::int` })
      .from(userVenues)
      .innerJoin(
        userOrganisations,
        eq(userOrganisations.id, userVenues.userOrganisationId),
      )
      .where(
        and(
          eq(userVenues.venueId, args.venueId),
          eq(userOrganisations.organisationId, args.organisationId),
          eq(userVenues.isActive, true),
          isNull(userVenues.archivedAt),
          eq(userOrganisations.isActive, true),
          isNull(userOrganisations.archivedAt),
        ),
      );

    return {
      supplierCount: supplierRows[0]?.count ?? 0,
      mappedIngredientCount: mappedIngredientRows[0]?.count ?? 0,
      venueStaffCount: staffRows[0]?.count ?? 0,
    };
  },
};
