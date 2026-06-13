import {
  and,
  asc,
  count,
  desc,
  eq,
  ilike,
  inArray,
  isNull,
  type SQL,
} from "drizzle-orm";

import type { RlsTx } from "@/server/db/drizzle";
import {
  menuItemRecipes,
  menuItems,
  recipes,
} from "@/server/db/schema";

export type MenuItemRow = typeof menuItems.$inferSelect;
export type MenuItemInsert = typeof menuItems.$inferInsert;
export type MenuItemUpdate = Partial<
  Omit<MenuItemInsert, "id" | "organisationId" | "venueId">
>;
export type RecipeRow = typeof recipes.$inferSelect;

export type MenuItemRecipeInput = {
  recipeId: string;
  quantity: number;
};

export type ComponentLookupRow = {
  id: string;
  menuItemId: string;
  recipeId: string;
  quantity: number;
  sortOrder: number;
  recipeName: string | null;
  recipeCostPerServeCents: number | null;
};

export const menuItemsRepo = {
  async listMenuItems(
    tx: RlsTx,
    args: {
      organisationId: string;
      venueId: string;
      search?: string;
      sectionName?: string;
      page: number;
      pageSize: number;
    },
  ): Promise<{ rows: MenuItemRow[]; total: number }> {
    const conditions: SQL[] = [
      eq(menuItems.organisationId, args.organisationId),
      eq(menuItems.venueId, args.venueId),
      isNull(menuItems.archivedAt),
    ];

    if (args.search) {
      conditions.push(ilike(menuItems.name, `%${args.search}%`));
    }
    if (args.sectionName) {
      conditions.push(eq(menuItems.sectionName, args.sectionName));
    }

    const where = and(...conditions);
    const offset = (args.page - 1) * args.pageSize;

    const [rows, totalRow] = await Promise.all([
      tx
        .select()
        .from(menuItems)
        .where(where)
        .orderBy(desc(menuItems.updatedAt))
        .limit(args.pageSize)
        .offset(offset),
      tx.select({ value: count() }).from(menuItems).where(where),
    ]);

    return {
      rows,
      total: Number(totalRow[0]?.value ?? 0),
    };
  },

  async getMenuItemById(
    tx: RlsTx,
    args: { organisationId: string; venueId: string; menuItemId: string },
  ): Promise<MenuItemRow | null> {
    const rows = await tx
      .select()
      .from(menuItems)
      .where(
        and(
          eq(menuItems.id, args.menuItemId),
          eq(menuItems.organisationId, args.organisationId),
          eq(menuItems.venueId, args.venueId),
          isNull(menuItems.archivedAt),
        ),
      )
      .limit(1);

    return rows[0] ?? null;
  },

  async createMenuItem(tx: RlsTx, row: MenuItemInsert): Promise<MenuItemRow> {
    const inserted = await tx.insert(menuItems).values(row).returning();
    const created = inserted[0];
    if (!created) {
      throw new Error("Failed to create menu item");
    }
    return created;
  },

  async updateMenuItem(
    tx: RlsTx,
    args: {
      organisationId: string;
      venueId: string;
      menuItemId: string;
      row: MenuItemUpdate;
    },
  ): Promise<MenuItemRow | null> {
    const updated = await tx
      .update(menuItems)
      .set(args.row)
      .where(
        and(
          eq(menuItems.id, args.menuItemId),
          eq(menuItems.organisationId, args.organisationId),
          eq(menuItems.venueId, args.venueId),
          isNull(menuItems.archivedAt),
        ),
      )
      .returning();

    return updated[0] ?? null;
  },

  async softDeleteMenuItem(
    tx: RlsTx,
    args: { organisationId: string; venueId: string; menuItemId: string },
  ): Promise<boolean> {
    const now = new Date().toISOString();
    const updated = await tx
      .update(menuItems)
      .set({
        status: "inactive",
        isActive: false,
        archivedAt: now,
        updatedAt: now,
      })
      .where(
        and(
          eq(menuItems.id, args.menuItemId),
          eq(menuItems.organisationId, args.organisationId),
          eq(menuItems.venueId, args.venueId),
          isNull(menuItems.archivedAt),
        ),
      )
      .returning({ id: menuItems.id });

    return updated.length > 0;
  },

  async listComponentsForMenuItems(
    tx: RlsTx,
    menuItemIds: string[],
  ): Promise<ComponentLookupRow[]> {
    if (menuItemIds.length === 0) {
      return [];
    }

    const rows = await tx
      .select({
        id: menuItemRecipes.id,
        menuItemId: menuItemRecipes.menuItemId,
        recipeId: menuItemRecipes.recipeId,
        quantity: menuItemRecipes.quantity,
        sortOrder: menuItemRecipes.sortOrder,
        recipeName: recipes.name,
        recipeCostPerServeCents: recipes.costPerServeCents,
      })
      .from(menuItemRecipes)
      .leftJoin(recipes, eq(recipes.id, menuItemRecipes.recipeId))
      .where(inArray(menuItemRecipes.menuItemId, menuItemIds))
      .orderBy(asc(menuItemRecipes.sortOrder));

    return rows.map((r) => ({
      id: r.id,
      menuItemId: r.menuItemId,
      recipeId: r.recipeId,
      quantity: Number(r.quantity),
      sortOrder: r.sortOrder,
      recipeName: r.recipeName,
      recipeCostPerServeCents: r.recipeCostPerServeCents,
    }));
  },

  async listComponentsForMenuItem(
    tx: RlsTx,
    menuItemId: string,
  ): Promise<ComponentLookupRow[]> {
    return menuItemsRepo.listComponentsForMenuItems(tx, [menuItemId]);
  },

  async listScopedRecipesByIds(
    tx: RlsTx,
    args: { organisationId: string; venueId: string; recipeIds: string[] },
  ): Promise<RecipeRow[]> {
    if (args.recipeIds.length === 0) {
      return [];
    }

    return tx
      .select()
      .from(recipes)
      .where(
        and(
          inArray(recipes.id, args.recipeIds),
          eq(recipes.organisationId, args.organisationId),
          eq(recipes.venueId, args.venueId),
          isNull(recipes.archivedAt),
        ),
      );
  },

  async replaceComponents(
    tx: RlsTx,
    menuItemId: string,
    components: MenuItemRecipeInput[],
  ): Promise<void> {
    await tx
      .delete(menuItemRecipes)
      .where(eq(menuItemRecipes.menuItemId, menuItemId));

    if (components.length === 0) {
      return;
    }

    const deduped = Array.from(
      components.reduce((map, item) => {
        const current = map.get(item.recipeId) ?? 0;
        map.set(item.recipeId, current + item.quantity);
        return map;
      }, new Map<string, number>()),
    );

    await tx.insert(menuItemRecipes).values(
      deduped.map(([recipeId, quantity], index) => ({
        menuItemId,
        recipeId,
        quantity: String(quantity),
        sortOrder: index + 1,
      })),
    );
  },
};
