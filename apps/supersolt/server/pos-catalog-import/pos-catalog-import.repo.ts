import { and, count, desc, eq, inArray, isNull } from "drizzle-orm";

import type { RlsTx } from "@/server/db/drizzle";
import {
  inventorySetupImportJobs,
  menuItemGroupModifierLists,
  menuItemGroups,
  menuItemRecipes,
  menuItemSquareCatalogLinks,
  menuItems,
  recipes,
} from "@/server/db/schema";

export type PosCatalogImportRow = {
  menuItemId: string;
  name: string;
  sectionName: string;
  groupId: string | null;
  groupName: string | null;
  description: string | null;
  priceCents: number;
  showOnMenu: boolean;
  status: string;
  squareCatalogObjectId: string | null;
  recipeId: string | null;
  recipeName: string | null;
  costPerServeCents: number | null;
  gpPercent: number | null;
  recipeCostIncomplete: boolean;
  modifierListCount: number;
  missingFromSquare: boolean;
};

function computeGpPercent(priceCents: number, costCents: number | null): number | null {
  if (costCents === null || priceCents <= 0) {
    return null;
  }
  return Math.round(((priceCents - costCents) / priceCents) * 1000) / 10;
}

export const posCatalogImportRepo = {
  async listPosSetupRows(
    tx: RlsTx,
    args: {
      organisationId: string;
      venueId: string;
      missingCatalogObjectIds: Set<string>;
    },
  ): Promise<PosCatalogImportRow[]> {
    const rows = await tx
      .select({
        menuItemId: menuItems.id,
        name: menuItems.name,
        sectionName: menuItems.sectionName,
        groupId: menuItems.groupId,
        groupName: menuItemGroups.name,
        description: menuItemGroups.description,
        priceCents: menuItems.priceCents,
        showOnMenu: menuItems.showOnMenu,
        status: menuItems.status,
        squareCatalogObjectId: menuItemSquareCatalogLinks.squareCatalogObjectId,
        recipeId: menuItemRecipes.recipeId,
      })
      .from(menuItems)
      .innerJoin(
        menuItemSquareCatalogLinks,
        eq(menuItemSquareCatalogLinks.menuItemId, menuItems.id),
      )
      .leftJoin(menuItemRecipes, eq(menuItemRecipes.menuItemId, menuItems.id))
      .leftJoin(menuItemGroups, eq(menuItemGroups.id, menuItems.groupId))
      .where(
        and(
          eq(menuItems.organisationId, args.organisationId),
          eq(menuItems.venueId, args.venueId),
          isNull(menuItems.archivedAt),
        ),
      )
      .orderBy(desc(menuItems.updatedAt));

    const recipeIds = [
      ...new Set(rows.map((row) => row.recipeId).filter((id): id is string => Boolean(id))),
    ];
    const recipeNameById = new Map<string, string>();
    const recipeCostById = new Map<string, number | null>();
    if (recipeIds.length > 0) {
      const recipeRows = await tx
        .select({
          id: recipes.id,
          name: recipes.name,
          costPerServeCents: recipes.costPerServeCents,
        })
        .from(recipes)
        .where(and(inArray(recipes.id, recipeIds), isNull(recipes.archivedAt)));
      for (const recipe of recipeRows) {
        recipeNameById.set(recipe.id, recipe.name);
        recipeCostById.set(recipe.id, recipe.costPerServeCents);
      }
    }

    const groupIds = [
      ...new Set(rows.map((row) => row.groupId).filter((id): id is string => Boolean(id))),
    ];
    const modifierCountByGroup = new Map<string, number>();
    if (groupIds.length > 0) {
      const countRows = await tx
        .select({
          groupId: menuItemGroupModifierLists.groupId,
          value: count(),
        })
        .from(menuItemGroupModifierLists)
        .where(inArray(menuItemGroupModifierLists.groupId, groupIds))
        .groupBy(menuItemGroupModifierLists.groupId);
      for (const row of countRows) {
        modifierCountByGroup.set(row.groupId, Number(row.value));
      }
    }

    return rows.map((row) => {
      const costPerServeCents = row.recipeId
        ? (recipeCostById.get(row.recipeId) ?? null)
        : null;
      return {
        menuItemId: row.menuItemId,
        name: row.name,
        sectionName: row.sectionName,
        groupId: row.groupId,
        groupName: row.groupName,
        description: row.description,
        priceCents: row.priceCents,
        showOnMenu: row.showOnMenu,
        status: row.status,
        squareCatalogObjectId: row.squareCatalogObjectId,
        recipeId: row.recipeId,
        recipeName: row.recipeId ? (recipeNameById.get(row.recipeId) ?? null) : null,
        costPerServeCents,
        gpPercent: computeGpPercent(row.priceCents, costPerServeCents),
        recipeCostIncomplete:
          row.recipeId !== null && (costPerServeCents === null || costPerServeCents === 0),
        modifierListCount: row.groupId
          ? (modifierCountByGroup.get(row.groupId) ?? 0)
          : 0,
        missingFromSquare: row.squareCatalogObjectId
          ? args.missingCatalogObjectIds.has(row.squareCatalogObjectId)
          : false,
      };
    });
  },

  async getLinkByCatalogObjectId(
    tx: RlsTx,
    args: { venueId: string; squareCatalogObjectId: string },
  ) {
    const rows = await tx
      .select({
        linkId: menuItemSquareCatalogLinks.id,
        menuItemId: menuItemSquareCatalogLinks.menuItemId,
      })
      .from(menuItemSquareCatalogLinks)
      .where(
        and(
          eq(menuItemSquareCatalogLinks.venueId, args.venueId),
          eq(menuItemSquareCatalogLinks.squareCatalogObjectId, args.squareCatalogObjectId),
        ),
      )
      .limit(1);
    return rows[0] ?? null;
  },

  async listLinkedCatalogObjectIds(tx: RlsTx, venueId: string): Promise<string[]> {
    const rows = await tx
      .select({ squareCatalogObjectId: menuItemSquareCatalogLinks.squareCatalogObjectId })
      .from(menuItemSquareCatalogLinks)
      .where(eq(menuItemSquareCatalogLinks.venueId, venueId));
    return rows.map((row) => row.squareCatalogObjectId);
  },

  async hasCompletedSquareImport(tx: RlsTx, venueId: string): Promise<boolean> {
    const rows = await tx
      .select({ value: count() })
      .from(inventorySetupImportJobs)
      .where(
        and(
          eq(inventorySetupImportJobs.venueId, venueId),
          eq(inventorySetupImportJobs.jobType, "square_catalog"),
          eq(inventorySetupImportJobs.status, "completed"),
        ),
      );
    return Number(rows[0]?.value ?? 0) > 0;
  },

  async countInUseWithSquareLink(
    tx: RlsTx,
    args: { organisationId: string; venueId: string },
  ): Promise<number> {
    const rows = await tx
      .select({ value: count() })
      .from(menuItems)
      .innerJoin(
        menuItemSquareCatalogLinks,
        eq(menuItemSquareCatalogLinks.menuItemId, menuItems.id),
      )
      .where(
        and(
          eq(menuItems.organisationId, args.organisationId),
          eq(menuItems.venueId, args.venueId),
          eq(menuItems.showOnMenu, true),
          isNull(menuItems.archivedAt),
        ),
      );
    return Number(rows[0]?.value ?? 0);
  },

  async countMappedInUse(
    tx: RlsTx,
    args: { organisationId: string; venueId: string },
  ): Promise<number> {
    const rows = await tx
      .select({ value: count() })
      .from(menuItems)
      .innerJoin(
        menuItemSquareCatalogLinks,
        eq(menuItemSquareCatalogLinks.menuItemId, menuItems.id),
      )
      .innerJoin(menuItemRecipes, eq(menuItemRecipes.menuItemId, menuItems.id))
      .where(
        and(
          eq(menuItems.organisationId, args.organisationId),
          eq(menuItems.venueId, args.venueId),
          eq(menuItems.showOnMenu, true),
          isNull(menuItems.archivedAt),
        ),
      );
    return Number(rows[0]?.value ?? 0);
  },

  async getLastCompletedSquareImportSeenIds(
    tx: RlsTx,
    venueId: string,
  ): Promise<Set<string>> {
    const rows = await tx
      .select({ result: inventorySetupImportJobs.result })
      .from(inventorySetupImportJobs)
      .where(
        and(
          eq(inventorySetupImportJobs.venueId, venueId),
          eq(inventorySetupImportJobs.jobType, "square_catalog"),
          eq(inventorySetupImportJobs.status, "completed"),
        ),
      )
      .orderBy(desc(inventorySetupImportJobs.completedAt))
      .limit(1);

    const result = rows[0]?.result as { seenCatalogObjectIds?: string[] } | null;
    return new Set(result?.seenCatalogObjectIds ?? []);
  },
};
