import { and, eq, isNull, sql } from "drizzle-orm";

import type { AppDb } from "@/server/db/create-app-db";
import type { RlsTx } from "@/server/db/drizzle";
import {
  menuItemSquareCatalogLinks,
  menuItems,
  venueSquareConnections,
  venueSquareOrderLines,
} from "@/server/db/schema";

export type SquareOrderLineInsert = typeof venueSquareOrderLines.$inferInsert;

export const salesInsightsRepo = {
  async listMenuItemSections(
    tx: RlsTx,
    venueId: string,
  ): Promise<Array<{ id: string; sectionName: string }>> {
    return tx
      .select({ id: menuItems.id, sectionName: menuItems.sectionName })
      .from(menuItems)
      .where(
        and(
          eq(menuItems.venueId, venueId),
          isNull(menuItems.archivedAt),
          eq(menuItems.isActive, true),
        ),
      );
  },

  async loadSquareLineMappingContext(
    tx: RlsTx,
    venueId: string,
  ): Promise<{
    links: Array<{ squareCatalogObjectId: string; menuItemId: string }>;
    menus: Array<{ id: string; name: string }>;
  }> {
    const [links, menus] = await Promise.all([
      tx
        .select({
          squareCatalogObjectId: menuItemSquareCatalogLinks.squareCatalogObjectId,
          menuItemId: menuItemSquareCatalogLinks.menuItemId,
        })
        .from(menuItemSquareCatalogLinks)
        .where(eq(menuItemSquareCatalogLinks.venueId, venueId)),
      tx
        .select({ id: menuItems.id, name: menuItems.name })
        .from(menuItems)
        .where(
          and(
            eq(menuItems.venueId, venueId),
            isNull(menuItems.archivedAt),
            eq(menuItems.isActive, true),
          ),
        ),
    ]);

    return { links, menus };
  },

  async loadSquareLineMappingContextAdmin(
    appDb: AppDb,
    venueId: string,
  ): Promise<{
    links: Array<{ squareCatalogObjectId: string; menuItemId: string }>;
    menus: Array<{ id: string; name: string }>;
  }> {
    const [links, menus] = await Promise.all([
      appDb.admin
        .select({
          squareCatalogObjectId: menuItemSquareCatalogLinks.squareCatalogObjectId,
          menuItemId: menuItemSquareCatalogLinks.menuItemId,
        })
        .from(menuItemSquareCatalogLinks)
        .where(eq(menuItemSquareCatalogLinks.venueId, venueId)),
      appDb.admin
        .select({ id: menuItems.id, name: menuItems.name })
        .from(menuItems)
        .where(
          and(
            eq(menuItems.venueId, venueId),
            isNull(menuItems.archivedAt),
            eq(menuItems.isActive, true),
          ),
        ),
    ]);

    return { links, menus };
  },

  async upsertSquareOrderLines(
    appDb: AppDb,
    rows: SquareOrderLineInsert[],
  ): Promise<void> {
    if (rows.length === 0) {
      return;
    }
    const chunkSize = 200;
    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize);
      await appDb.admin
        .insert(venueSquareOrderLines)
        .values(chunk)
        .onConflictDoUpdate({
          target: [
            venueSquareOrderLines.venueId,
            venueSquareOrderLines.squarePaymentId,
            venueSquareOrderLines.squareLineUid,
          ],
          // `excluded.*` takes the incoming row's values; referencing the
          // table's own columns here is a self-assignment no-op on conflict.
          set: {
            squareOrderId: sql`excluded.square_order_id`,
            quantity: sql`excluded.quantity`,
            lineName: sql`excluded.line_name`,
            variationName: sql`excluded.variation_name`,
            modifiers: sql`excluded.modifiers`,
            squareCatalogObjectId: sql`excluded.square_catalog_object_id`,
            grossAmountCents: sql`excluded.gross_amount_cents`,
            currency: sql`excluded.currency`,
            menuItemId: sql`excluded.menu_item_id`,
            matchSource: sql`excluded.match_source`,
            observedAt: sql`excluded.observed_at`,
            updatedAt: sql`excluded.updated_at`,
          },
        });
    }
  },

  async getConnectionSummaryRls(
    tx: RlsTx,
    venueId: string,
  ): Promise<{
    squareMerchantId: string;
    environment: string;
    squareLocationId: string | null;
    updatedAt: string;
  } | null> {
    const rows = await tx
      .select({
        squareMerchantId: venueSquareConnections.squareMerchantId,
        environment: venueSquareConnections.environment,
        squareLocationId: venueSquareConnections.squareLocationId,
        updatedAt: venueSquareConnections.updatedAt,
      })
      .from(venueSquareConnections)
      .where(eq(venueSquareConnections.venueId, venueId))
      .limit(1);

    const row = rows[0];
    return row?.squareMerchantId ? row : null;
  },

  async getConnectionSummaryAdmin(
    appDb: AppDb,
    venueId: string,
  ): Promise<{
    squareMerchantId: string;
    environment: string;
    squareLocationId: string | null;
    updatedAt: string;
  } | null> {
    const rows = await appDb.admin
      .select({
        squareMerchantId: venueSquareConnections.squareMerchantId,
        environment: venueSquareConnections.environment,
        squareLocationId: venueSquareConnections.squareLocationId,
        updatedAt: venueSquareConnections.updatedAt,
      })
      .from(venueSquareConnections)
      .where(eq(venueSquareConnections.venueId, venueId))
      .limit(1);

    const row = rows[0];
    return row?.squareMerchantId ? row : null;
  },
};
