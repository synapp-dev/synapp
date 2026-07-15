import { and, asc, eq, inArray, sql } from "drizzle-orm";

import type { RlsTx } from "@/server/db/drizzle";
import {
  menuItemGroupModifierLists,
  menuItemGroups,
  venueModifierLists,
  venueModifiers,
} from "@/server/db/schema";

export type GroupModifierDetail = {
  modifierId: string;
  name: string;
  priceCents: number;
};

export type GroupModifierListDetail = {
  modifierListId: string;
  name: string;
  selectionType: string;
  enabled: boolean;
  minSelected: number | null;
  maxSelected: number | null;
  modifiers: GroupModifierDetail[];
};

/**
 * Upserts for the enriched POS catalog tier (Square ITEM groups + modifier
 * catalog). All upserts are keyed on the Square identifiers so repeated imports
 * are idempotent.
 */
export const posCatalogGroupsRepo = {
  async upsertGroup(
    tx: RlsTx,
    args: {
      organisationId: string;
      venueId: string;
      squareItemId: string;
      name: string;
      sectionName: string;
      description: string | null;
      squareRaw: unknown;
      updatedAt: string;
    },
  ): Promise<string> {
    const inserted = await tx
      .insert(menuItemGroups)
      .values({
        organisationId: args.organisationId,
        venueId: args.venueId,
        squareItemId: args.squareItemId,
        name: args.name,
        sectionName: args.sectionName,
        description: args.description,
        squareRaw: args.squareRaw,
        updatedAt: args.updatedAt,
      })
      .onConflictDoUpdate({
        target: [menuItemGroups.venueId, menuItemGroups.squareItemId],
        set: {
          name: sql`excluded.name`,
          sectionName: sql`excluded.section_name`,
          description: sql`excluded.description`,
          squareRaw: sql`excluded.square_raw`,
          updatedAt: sql`excluded.updated_at`,
        },
      })
      .returning({ id: menuItemGroups.id });

    const id = inserted[0]?.id;
    if (!id) {
      throw new Error("Failed to upsert menu item group");
    }
    return id;
  },

  async getGroupDescription(
    tx: RlsTx,
    args: { groupId: string },
  ): Promise<string | null> {
    const rows = await tx
      .select({ description: menuItemGroups.description })
      .from(menuItemGroups)
      .where(eq(menuItemGroups.id, args.groupId))
      .limit(1);
    return rows[0]?.description ?? null;
  },

  async upsertModifierList(
    tx: RlsTx,
    args: {
      organisationId: string;
      venueId: string;
      squareModifierListId: string;
      name: string;
      selectionType: "single" | "multi";
      minSelected: number | null;
      maxSelected: number | null;
      squareRaw: unknown;
      updatedAt: string;
    },
  ): Promise<string> {
    const inserted = await tx
      .insert(venueModifierLists)
      .values({
        organisationId: args.organisationId,
        venueId: args.venueId,
        squareModifierListId: args.squareModifierListId,
        name: args.name,
        selectionType: args.selectionType,
        minSelected: args.minSelected,
        maxSelected: args.maxSelected,
        squareRaw: args.squareRaw,
        updatedAt: args.updatedAt,
      })
      .onConflictDoUpdate({
        target: [venueModifierLists.venueId, venueModifierLists.squareModifierListId],
        set: {
          name: sql`excluded.name`,
          selectionType: sql`excluded.selection_type`,
          minSelected: sql`excluded.min_selected`,
          maxSelected: sql`excluded.max_selected`,
          squareRaw: sql`excluded.square_raw`,
          updatedAt: sql`excluded.updated_at`,
        },
      })
      .returning({ id: venueModifierLists.id });

    const id = inserted[0]?.id;
    if (!id) {
      throw new Error("Failed to upsert modifier list");
    }
    return id;
  },

  async upsertModifier(
    tx: RlsTx,
    args: {
      organisationId: string;
      venueId: string;
      modifierListId: string;
      squareModifierId: string;
      name: string;
      priceCents: number;
      squareRaw: unknown;
      updatedAt: string;
    },
  ): Promise<void> {
    await tx
      .insert(venueModifiers)
      .values({
        organisationId: args.organisationId,
        venueId: args.venueId,
        modifierListId: args.modifierListId,
        squareModifierId: args.squareModifierId,
        name: args.name,
        priceCents: args.priceCents,
        squareRaw: args.squareRaw,
        updatedAt: args.updatedAt,
      })
      .onConflictDoUpdate({
        target: [venueModifiers.venueId, venueModifiers.squareModifierId],
        set: {
          modifierListId: sql`excluded.modifier_list_id`,
          name: sql`excluded.name`,
          priceCents: sql`excluded.price_cents`,
          squareRaw: sql`excluded.square_raw`,
          updatedAt: sql`excluded.updated_at`,
        },
      });
  },

  async listGroupModifiers(
    tx: RlsTx,
    args: { groupId: string },
  ): Promise<GroupModifierListDetail[]> {
    const lists = await tx
      .select({
        modifierListId: venueModifierLists.id,
        name: venueModifierLists.name,
        selectionType: venueModifierLists.selectionType,
        enabled: menuItemGroupModifierLists.enabled,
        minSelected: menuItemGroupModifierLists.minSelected,
        maxSelected: menuItemGroupModifierLists.maxSelected,
      })
      .from(menuItemGroupModifierLists)
      .innerJoin(
        venueModifierLists,
        eq(venueModifierLists.id, menuItemGroupModifierLists.modifierListId),
      )
      .where(eq(menuItemGroupModifierLists.groupId, args.groupId))
      .orderBy(asc(venueModifierLists.name));

    if (lists.length === 0) {
      return [];
    }

    const listIds = lists.map((list) => list.modifierListId);
    const modifierRows = await tx
      .select({
        modifierListId: venueModifiers.modifierListId,
        modifierId: venueModifiers.id,
        name: venueModifiers.name,
        priceCents: venueModifiers.priceCents,
      })
      .from(venueModifiers)
      .where(inArray(venueModifiers.modifierListId, listIds))
      .orderBy(asc(venueModifiers.name));

    const modifiersByList = new Map<string, GroupModifierDetail[]>();
    for (const row of modifierRows) {
      const bucket = modifiersByList.get(row.modifierListId) ?? [];
      bucket.push({
        modifierId: row.modifierId,
        name: row.name,
        priceCents: row.priceCents,
      });
      modifiersByList.set(row.modifierListId, bucket);
    }

    return lists.map((list) => ({
      modifierListId: list.modifierListId,
      name: list.name,
      selectionType: list.selectionType,
      enabled: list.enabled,
      minSelected: list.minSelected,
      maxSelected: list.maxSelected,
      modifiers: modifiersByList.get(list.modifierListId) ?? [],
    }));
  },

  async setGroupModifierListEnabled(
    tx: RlsTx,
    args: {
      groupId: string;
      modifierListId: string;
      enabled: boolean;
      updatedAt: string;
    },
  ): Promise<boolean> {
    const updated = await tx
      .update(menuItemGroupModifierLists)
      .set({ enabled: args.enabled, updatedAt: args.updatedAt })
      .where(
        and(
          eq(menuItemGroupModifierLists.groupId, args.groupId),
          eq(menuItemGroupModifierLists.modifierListId, args.modifierListId),
        ),
      )
      .returning({ id: menuItemGroupModifierLists.id });
    return updated.length > 0;
  },

  async upsertGroupModifierLink(
    tx: RlsTx,
    args: {
      organisationId: string;
      venueId: string;
      groupId: string;
      modifierListId: string;
      enabled: boolean;
      minSelected: number | null;
      maxSelected: number | null;
      updatedAt: string;
    },
  ): Promise<void> {
    await tx
      .insert(menuItemGroupModifierLists)
      .values({
        organisationId: args.organisationId,
        venueId: args.venueId,
        groupId: args.groupId,
        modifierListId: args.modifierListId,
        enabled: args.enabled,
        minSelected: args.minSelected,
        maxSelected: args.maxSelected,
        updatedAt: args.updatedAt,
      })
      .onConflictDoUpdate({
        target: [
          menuItemGroupModifierLists.groupId,
          menuItemGroupModifierLists.modifierListId,
        ],
        set: {
          enabled: sql`excluded.enabled`,
          minSelected: sql`excluded.min_selected`,
          maxSelected: sql`excluded.max_selected`,
          updatedAt: sql`excluded.updated_at`,
        },
      });
  },
};
