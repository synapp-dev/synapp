import { and, asc, count, eq } from "drizzle-orm";

import type { RlsTx } from "@/server/db/drizzle";
import {
  ingredientStorageLocations,
  venueStorageLocations,
} from "@/server/db/schema";

export const storageLocationsRepo = {
  async countForVenue(tx: RlsTx, venueId: string): Promise<number> {
    const rows = await tx
      .select({ value: count() })
      .from(venueStorageLocations)
      .where(eq(venueStorageLocations.venueId, venueId));
    return rows[0]?.value ?? 0;
  },

  async listForVenue(tx: RlsTx, venueId: string) {
    return tx
      .select()
      .from(venueStorageLocations)
      .where(eq(venueStorageLocations.venueId, venueId))
      .orderBy(asc(venueStorageLocations.displayOrder), asc(venueStorageLocations.name));
  },

  async create(
    tx: RlsTx,
    row: typeof venueStorageLocations.$inferInsert,
  ) {
    const inserted = await tx.insert(venueStorageLocations).values(row).returning();
    const created = inserted[0];
    if (!created) throw new Error("Failed to create storage location");
    return created;
  },

  async update(
    tx: RlsTx,
    locationId: string,
    patch: Partial<typeof venueStorageLocations.$inferInsert>,
  ) {
    const updated = await tx
      .update(venueStorageLocations)
      .set(patch)
      .where(eq(venueStorageLocations.id, locationId))
      .returning();
    return updated[0] ?? null;
  },

  async delete(tx: RlsTx, locationId: string): Promise<void> {
    await tx
      .delete(venueStorageLocations)
      .where(eq(venueStorageLocations.id, locationId));
  },

  async setIngredientLocations(
    tx: RlsTx,
    args: { ingredientId: string; locationIds: string[]; primaryLocationId?: string },
  ): Promise<void> {
    await tx
      .delete(ingredientStorageLocations)
      .where(eq(ingredientStorageLocations.ingredientId, args.ingredientId));

    if (args.locationIds.length === 0) return;

    await tx.insert(ingredientStorageLocations).values(
      args.locationIds.map((locationId) => ({
        ingredientId: args.ingredientId,
        locationId,
        isPrimary: locationId === args.primaryLocationId,
      })),
    );
  },

  async listForIngredient(tx: RlsTx, ingredientId: string) {
    return tx
      .select({
        locationId: ingredientStorageLocations.locationId,
        isPrimary: ingredientStorageLocations.isPrimary,
        name: venueStorageLocations.name,
      })
      .from(ingredientStorageLocations)
      .innerJoin(
        venueStorageLocations,
        eq(venueStorageLocations.id, ingredientStorageLocations.locationId),
      )
      .where(eq(ingredientStorageLocations.ingredientId, ingredientId));
  },
};
