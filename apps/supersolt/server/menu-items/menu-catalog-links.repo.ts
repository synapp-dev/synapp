import { and, desc, eq, inArray } from "drizzle-orm";

import type { RlsTx } from "@/server/db/drizzle";
import { menuItemSquareCatalogLinks, menuItems } from "@/server/db/schema";

export type MenuCatalogLinkRow = {
  id: string;
  menuItemId: string;
  squareCatalogObjectId: string;
  menuItemName: string | null;
};

export const menuCatalogLinksRepo = {
  async listForVenue(tx: RlsTx, venueId: string) {
    return tx
      .select({
        id: menuItemSquareCatalogLinks.id,
        menuItemId: menuItemSquareCatalogLinks.menuItemId,
        squareCatalogObjectId: menuItemSquareCatalogLinks.squareCatalogObjectId,
      })
      .from(menuItemSquareCatalogLinks)
      .where(eq(menuItemSquareCatalogLinks.venueId, venueId))
      .orderBy(desc(menuItemSquareCatalogLinks.createdAt));
  },

  async getMenuItemNames(
    tx: RlsTx,
    menuItemIds: string[],
  ): Promise<Map<string, string>> {
    if (menuItemIds.length === 0) {
      return new Map();
    }

    const rows = await tx
      .select({ id: menuItems.id, name: menuItems.name })
      .from(menuItems)
      .where(inArray(menuItems.id, menuItemIds));

    return new Map(rows.map((row) => [row.id, row.name]));
  },

  async getMenuItemForVenue(
    tx: RlsTx,
    args: { menuItemId: string; venueId: string },
  ) {
    const rows = await tx
      .select({
        id: menuItems.id,
        venueId: menuItems.venueId,
        organisationId: menuItems.organisationId,
      })
      .from(menuItems)
      .where(and(eq(menuItems.id, args.menuItemId), eq(menuItems.venueId, args.venueId)))
      .limit(1);

    return rows[0] ?? null;
  },

  async createLink(
    tx: RlsTx,
    args: {
      organisationId: string;
      venueId: string;
      menuItemId: string;
      squareCatalogObjectId: string;
      updatedAt: string;
    },
  ) {
    const inserted = await tx
      .insert(menuItemSquareCatalogLinks)
      .values({
        organisationId: args.organisationId,
        venueId: args.venueId,
        menuItemId: args.menuItemId,
        squareCatalogObjectId: args.squareCatalogObjectId,
        updatedAt: args.updatedAt,
      })
      .returning({
        id: menuItemSquareCatalogLinks.id,
        menuItemId: menuItemSquareCatalogLinks.menuItemId,
        squareCatalogObjectId: menuItemSquareCatalogLinks.squareCatalogObjectId,
      });

    return inserted[0] ?? null;
  },

  async deleteLink(tx: RlsTx, args: { linkId: string; venueId: string }) {
    await tx
      .delete(menuItemSquareCatalogLinks)
      .where(
        and(
          eq(menuItemSquareCatalogLinks.id, args.linkId),
          eq(menuItemSquareCatalogLinks.venueId, args.venueId),
        ),
      );
  },
};
