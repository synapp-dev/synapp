import { and, eq, isNull } from "drizzle-orm";

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
          set: {
            squareOrderId: venueSquareOrderLines.squareOrderId,
            quantity: venueSquareOrderLines.quantity,
            lineName: venueSquareOrderLines.lineName,
            squareCatalogObjectId: venueSquareOrderLines.squareCatalogObjectId,
            grossAmountCents: venueSquareOrderLines.grossAmountCents,
            currency: venueSquareOrderLines.currency,
            menuItemId: venueSquareOrderLines.menuItemId,
            matchSource: venueSquareOrderLines.matchSource,
            observedAt: venueSquareOrderLines.observedAt,
            updatedAt: venueSquareOrderLines.updatedAt,
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
