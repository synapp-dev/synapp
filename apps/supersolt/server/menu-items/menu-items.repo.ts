import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/utils/supabase/types";

type Supabase = SupabaseClient<Database>;

export type MenuItemRow = Database["public"]["Tables"]["menu_items"]["Row"];
export type MenuItemRecipeRow = Database["public"]["Tables"]["menu_item_recipes"]["Row"];
export type RecipeRow = Database["public"]["Tables"]["recipes"]["Row"];

export type MenuItemRecipeInput = {
  recipeId: string;
  quantity: number;
};

type RecipeLookupRow = {
  id: string;
  name: string;
  cost_per_serve_cents: number;
};

type ComponentLookupRow = {
  id: string;
  menu_item_id: string;
  recipe_id: string;
  quantity: number;
  sort_order: number;
  recipes: RecipeLookupRow | null;
};

export const menuItemsRepo = {
  async getVenueContextBySlugs(
    supabase: Supabase,
    organisationSlug: string,
    venueSlug: string
  ): Promise<{ organisationId: string; venueId: string } | null> {
    const { data, error } = await supabase
      .from("venues")
      .select("id, organisation_id, organisations:organisation_id (slug)")
      .eq("slug", venueSlug)
      .eq("is_active", true)
      .is("archived_at", null)
      .eq("organisations.slug", organisationSlug)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    const venueRow = data as { id: string; organisation_id: string };
    return {
      organisationId: venueRow.organisation_id,
      venueId: venueRow.id,
    };
  },

  async listMenuItems(
    supabase: Supabase,
    args: {
      organisationId: string;
      venueId: string;
      search?: string;
      sectionName?: string;
      page: number;
      pageSize: number;
    }
  ): Promise<{ rows: MenuItemRow[]; total: number }> {
    const from = (args.page - 1) * args.pageSize;
    const to = from + args.pageSize - 1;

    let query = supabase
      .from("menu_items")
      .select("*", { count: "exact" })
      .eq("organisation_id", args.organisationId)
      .eq("venue_id", args.venueId)
      .is("archived_at", null);

    if (args.search) {
      query = query.ilike("name", `%${args.search}%`);
    }
    if (args.sectionName) {
      query = query.eq("section_name", args.sectionName);
    }

    const { data, error, count } = await query
      .order("updated_at", { ascending: false })
      .range(from, to);

    if (error) {
      throw new Error(error.message);
    }

    return {
      rows: (data ?? []) as MenuItemRow[],
      total: count ?? 0,
    };
  },

  async getMenuItemById(
    supabase: Supabase,
    args: { organisationId: string; venueId: string; menuItemId: string }
  ): Promise<MenuItemRow | null> {
    const { data, error } = await supabase
      .from("menu_items")
      .select("*")
      .eq("id", args.menuItemId)
      .eq("organisation_id", args.organisationId)
      .eq("venue_id", args.venueId)
      .is("archived_at", null)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    return (data as MenuItemRow | null) ?? null;
  },

  async createMenuItem(
    supabase: Supabase,
    row: Database["public"]["Tables"]["menu_items"]["Insert"]
  ): Promise<MenuItemRow> {
    const { data, error } = await supabase
      .from("menu_items")
      .insert(row)
      .select("*")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data as MenuItemRow;
  },

  async updateMenuItem(
    supabase: Supabase,
    args: {
      organisationId: string;
      venueId: string;
      menuItemId: string;
      row: Database["public"]["Tables"]["menu_items"]["Update"];
    }
  ): Promise<MenuItemRow | null> {
    const { data, error } = await supabase
      .from("menu_items")
      .update(args.row)
      .eq("id", args.menuItemId)
      .eq("organisation_id", args.organisationId)
      .eq("venue_id", args.venueId)
      .is("archived_at", null)
      .select("*")
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    return (data as MenuItemRow | null) ?? null;
  },

  async softDeleteMenuItem(
    supabase: Supabase,
    args: { organisationId: string; venueId: string; menuItemId: string }
  ): Promise<boolean> {
    const { data, error } = await supabase
      .from("menu_items")
      .update({
        status: "inactive",
        is_active: false,
        archived_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", args.menuItemId)
      .eq("organisation_id", args.organisationId)
      .eq("venue_id", args.venueId)
      .is("archived_at", null)
      .select("id")
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    return Boolean(data?.id);
  },

  async listComponentsForMenuItems(
    supabase: Supabase,
    menuItemIds: string[]
  ): Promise<ComponentLookupRow[]> {
    if (menuItemIds.length === 0) {
      return [];
    }

    const { data, error } = await supabase
      .from("menu_item_recipes")
      .select(
        "id, menu_item_id, recipe_id, quantity, sort_order, recipes:recipe_id(id, name, cost_per_serve_cents)"
      )
      .in("menu_item_id", menuItemIds)
      .order("sort_order", { ascending: true });

    if (error) {
      throw new Error(error.message);
    }

    return (data ?? []) as ComponentLookupRow[];
  },

  async listComponentsForMenuItem(
    supabase: Supabase,
    menuItemId: string
  ): Promise<ComponentLookupRow[]> {
    const { data, error } = await supabase
      .from("menu_item_recipes")
      .select(
        "id, menu_item_id, recipe_id, quantity, sort_order, recipes:recipe_id(id, name, cost_per_serve_cents)"
      )
      .eq("menu_item_id", menuItemId)
      .order("sort_order", { ascending: true });

    if (error) {
      throw new Error(error.message);
    }

    return (data ?? []) as ComponentLookupRow[];
  },

  async listScopedRecipesByIds(
    supabase: Supabase,
    args: { organisationId: string; venueId: string; recipeIds: string[] }
  ): Promise<RecipeRow[]> {
    if (args.recipeIds.length === 0) {
      return [];
    }

    const { data, error } = await supabase
      .from("recipes")
      .select("*")
      .in("id", args.recipeIds)
      .eq("organisation_id", args.organisationId)
      .eq("venue_id", args.venueId)
      .is("archived_at", null);

    if (error) {
      throw new Error(error.message);
    }

    return (data ?? []) as RecipeRow[];
  },

  async replaceComponents(
    supabase: Supabase,
    menuItemId: string,
    components: MenuItemRecipeInput[]
  ): Promise<void> {
    const { error: deleteError } = await supabase
      .from("menu_item_recipes")
      .delete()
      .eq("menu_item_id", menuItemId);
    if (deleteError) {
      throw new Error(deleteError.message);
    }

    if (components.length === 0) {
      return;
    }

    const deduped = Array.from(
      components.reduce((map, item) => {
        const current = map.get(item.recipeId) ?? 0;
        map.set(item.recipeId, current + item.quantity);
        return map;
      }, new Map<string, number>())
    );

    const { error: insertError } = await supabase
      .from("menu_item_recipes")
      .insert(
        deduped.map(([recipeId, quantity], index) => ({
          menu_item_id: menuItemId,
          recipe_id: recipeId,
          quantity,
          sort_order: index + 1,
        }))
      );

    if (insertError) {
      throw new Error(insertError.message);
    }
  },
};
