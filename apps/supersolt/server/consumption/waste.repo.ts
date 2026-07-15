import { and, desc, eq, gte, isNull, lte } from "drizzle-orm";

import type { RlsTx } from "@/server/db/drizzle";
import { ingredients, recipes, userProfiles, wasteEntries } from "@/server/db/schema";

export type WasteEntryInsert = {
  organisationId: string;
  venueId: string;
  ingredientId: string | null;
  recipeId: string | null;
  qty: number;
  unit: string;
  qtyBaseUnits: number | null;
  costCents: number;
  reason: string;
  note: string | null;
  source: "manual" | "batch_explosion";
  occurredAt: string;
  createdBy: string | null;
};

export const wasteRepo = {
  async insertEntryWithChildren(
    tx: RlsTx,
    args: { parent: WasteEntryInsert; children: WasteEntryInsert[] },
  ): Promise<{ id: string }> {
    const [parent] = await tx
      .insert(wasteEntries)
      .values({
        organisationId: args.parent.organisationId,
        venueId: args.parent.venueId,
        ingredientId: args.parent.ingredientId,
        recipeId: args.parent.recipeId,
        qty: String(args.parent.qty),
        unit: args.parent.unit,
        qtyBaseUnits:
          args.parent.qtyBaseUnits !== null
            ? String(args.parent.qtyBaseUnits)
            : null,
        costCents: args.parent.costCents,
        reason: args.parent.reason,
        note: args.parent.note,
        source: args.parent.source,
        occurredAt: args.parent.occurredAt,
        createdBy: args.parent.createdBy,
      })
      .returning({ id: wasteEntries.id });

    if (!parent) {
      throw new Error("waste entry insert returned no row");
    }

    if (args.children.length > 0) {
      await tx.insert(wasteEntries).values(
        args.children.map((c) => ({
          organisationId: c.organisationId,
          venueId: c.venueId,
          ingredientId: c.ingredientId,
          recipeId: c.recipeId,
          parentEntryId: parent.id,
          qty: String(c.qty),
          unit: c.unit,
          qtyBaseUnits: c.qtyBaseUnits !== null ? String(c.qtyBaseUnits) : null,
          costCents: c.costCents,
          reason: c.reason,
          note: c.note,
          source: c.source,
          occurredAt: c.occurredAt,
          createdBy: c.createdBy,
        })),
      );
    }

    return { id: parent.id };
  },

  /** Top-level entries only (children are an explosion detail). */
  async listEntries(
    tx: RlsTx,
    args: { venueId: string; fromIso: string; toIso: string },
  ) {
    return tx
      .select({
        id: wasteEntries.id,
        ingredientId: wasteEntries.ingredientId,
        recipeId: wasteEntries.recipeId,
        qty: wasteEntries.qty,
        unit: wasteEntries.unit,
        qtyBaseUnits: wasteEntries.qtyBaseUnits,
        costCents: wasteEntries.costCents,
        reason: wasteEntries.reason,
        note: wasteEntries.note,
        source: wasteEntries.source,
        occurredAt: wasteEntries.occurredAt,
        createdBy: wasteEntries.createdBy,
        createdAt: wasteEntries.createdAt,
        ingredientName: ingredients.name,
        recipeName: recipes.name,
        createdByFullName: userProfiles.fullName,
        createdByFirstName: userProfiles.firstName,
        createdByLastName: userProfiles.lastName,
        createdByEmail: userProfiles.email,
      })
      .from(wasteEntries)
      .leftJoin(ingredients, eq(wasteEntries.ingredientId, ingredients.id))
      .leftJoin(recipes, eq(wasteEntries.recipeId, recipes.id))
      .leftJoin(userProfiles, eq(wasteEntries.createdBy, userProfiles.id))
      .where(
        and(
          eq(wasteEntries.venueId, args.venueId),
          isNull(wasteEntries.parentEntryId),
          gte(wasteEntries.occurredAt, args.fromIso),
          lte(wasteEntries.occurredAt, args.toIso),
        ),
      )
      .orderBy(desc(wasteEntries.occurredAt));
  },

  async getEntry(tx: RlsTx, args: { id: string; venueId: string }) {
    const [row] = await tx
      .select({
        id: wasteEntries.id,
        venueId: wasteEntries.venueId,
        parentEntryId: wasteEntries.parentEntryId,
      })
      .from(wasteEntries)
      .where(
        and(eq(wasteEntries.id, args.id), eq(wasteEntries.venueId, args.venueId)),
      )
      .limit(1);
    return row ?? null;
  },

  /** Children cascade via waste_entries_parent_entry_id_fkey. */
  async deleteEntry(tx: RlsTx, args: { id: string; venueId: string }) {
    const deleted = await tx
      .delete(wasteEntries)
      .where(
        and(eq(wasteEntries.id, args.id), eq(wasteEntries.venueId, args.venueId)),
      )
      .returning({ id: wasteEntries.id });
    return deleted.length;
  },
};
