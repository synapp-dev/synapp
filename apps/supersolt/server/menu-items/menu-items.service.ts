import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/utils/supabase/types";
import {
  menuItemsRepo,
  type MenuItemRecipeInput,
} from "./menu-items.repo";

type Supabase = SupabaseClient<Database>;

const PRICE_MODES = ["MANUAL", "AUTO_FROM_RECIPE"] as const;
const GST_MODES = ["INC", "EX"] as const;
const STATUSES = ["active", "inactive"] as const;

type PriceMode = (typeof PRICE_MODES)[number];
type GstMode = (typeof GST_MODES)[number];
type MenuItemStatus = (typeof STATUSES)[number];

export type MenuItemRecipeComponent = {
  recipeId: string;
  recipeName: string;
  recipeCostPerServeCents: number;
  quantity: number;
};

export type MenuItemSummary = {
  id: string;
  sectionName: string;
  name: string;
  tags: string[];
  priceMode: PriceMode;
  priceCents: number;
  gstMode: GstMode;
  costPerServeCents: number;
  gpPercent: number;
  pluCode: string;
  showOnMenu: boolean;
  status: MenuItemStatus;
  updatedAt: string;
  recipeSummary: string;
  recipeCount: number;
};

export type MenuItemDetail = Omit<MenuItemSummary, "recipeSummary" | "recipeCount"> & {
  components: MenuItemRecipeComponent[];
};

export type UpsertMenuItemInput = {
  sectionName: string;
  name: string;
  tags?: string[];
  priceMode: string;
  priceCents: number;
  gstMode: string;
  pluCode?: string | null;
  showOnMenu: boolean;
  status: string;
  components: MenuItemRecipeInput[];
};

export class MenuItemsServiceError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function assertPriceMode(value: string): PriceMode {
  if (!PRICE_MODES.includes(value as PriceMode)) {
    throw new MenuItemsServiceError(400, "Invalid price mode");
  }
  return value as PriceMode;
}

function assertGstMode(value: string): GstMode {
  if (!GST_MODES.includes(value as GstMode)) {
    throw new MenuItemsServiceError(400, "Invalid GST mode");
  }
  return value as GstMode;
}

function assertStatus(value: string): MenuItemStatus {
  if (!STATUSES.includes(value as MenuItemStatus)) {
    throw new MenuItemsServiceError(400, "Invalid menu line status");
  }
  return value as MenuItemStatus;
}

function clampNumber(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function computeGpPercent(priceCents: number, costPerServeCents: number): number {
  if (priceCents <= 0) {
    return 0;
  }
  return Number((((priceCents - costPerServeCents) / priceCents) * 100).toFixed(2));
}

async function assertVenueAccess(
  supabase: Supabase,
  args: {
    userId: string;
    organisationId: string;
    venueId: string;
  }
): Promise<void> {
  const { data, error } = await supabase
    .from("user_organisations")
    .select("id")
    .eq("user_profile_id", args.userId)
    .eq("organisation_id", args.organisationId)
    .eq("is_active", true)
    .is("archived_at", null);

  if (error) {
    throw new MenuItemsServiceError(500, error.message);
  }

  const membershipIds = (data ?? []).map((item) => item.id);
  if (membershipIds.length === 0) {
    throw new MenuItemsServiceError(403, "Forbidden");
  }

  const { data: venueAccess, error: venueError } = await supabase
    .from("user_venues")
    .select("id")
    .in("user_organisation_id", membershipIds)
    .eq("venue_id", args.venueId)
    .eq("is_active", true)
    .is("archived_at", null)
    .limit(1);

  if (venueError) {
    throw new MenuItemsServiceError(500, venueError.message);
  }

  if (!venueAccess || venueAccess.length === 0) {
    throw new MenuItemsServiceError(403, "Forbidden");
  }
}

function normalizeInput(input: UpsertMenuItemInput): {
  name: string;
  sectionName: string;
  tags: string[];
  priceMode: PriceMode;
  gstMode: GstMode;
  priceCents: number;
  pluCode: string | null;
  showOnMenu: boolean;
  status: MenuItemStatus;
  components: MenuItemRecipeInput[];
} {
  const name = input.name.trim();
  if (name.length === 0) {
    throw new MenuItemsServiceError(400, "Menu name is required");
  }

  const sectionName = input.sectionName.trim();
  if (sectionName.length === 0) {
    throw new MenuItemsServiceError(400, "Menu section is required");
  }

  const components = (input.components ?? [])
    .map((component) => ({
      recipeId: component.recipeId,
      quantity: clampNumber(Number(component.quantity || 0), 0, 1_000_000),
    }))
    .filter((component) => component.recipeId && component.quantity > 0);

  if (components.length === 0) {
    throw new MenuItemsServiceError(
      400,
      "At least one recipe component is required"
    );
  }

  return {
    name,
    sectionName,
    tags: Array.from(
      new Set((input.tags ?? []).map((tag) => tag.trim()).filter(Boolean))
    ),
    priceMode: assertPriceMode(input.priceMode),
    gstMode: assertGstMode(input.gstMode),
    priceCents: Math.max(0, Math.round(Number(input.priceCents || 0))),
    pluCode: input.pluCode?.trim() || null,
    showOnMenu: Boolean(input.showOnMenu),
    status: assertStatus(input.status),
    components,
  };
}

function toSummary(
  row: Database["public"]["Tables"]["menu_items"]["Row"],
  components: MenuItemRecipeComponent[]
): MenuItemSummary {
  const recipeNames = components.map((component) => component.recipeName);
  const recipeSummary =
    recipeNames.length === 0
      ? "No recipes"
      : recipeNames.length === 1
        ? recipeNames[0] ?? "No recipes"
        : `${recipeNames[0] ?? "Recipe"} +${recipeNames.length - 1}`;

  return {
    id: row.id,
    sectionName: row.section_name,
    name: row.name,
    tags: row.tags,
    priceMode: row.price_mode as PriceMode,
    priceCents: row.price_cents,
    gstMode: row.gst_mode as GstMode,
    costPerServeCents: row.cost_per_serve_cents,
    gpPercent: Number(row.gp_percent),
    pluCode: row.plu_code ?? "",
    showOnMenu: row.show_on_menu,
    status: row.status as MenuItemStatus,
    updatedAt: row.updated_at,
    recipeSummary,
    recipeCount: components.length,
  };
}

export const menuItemsService = {
  async list(
    supabase: Supabase,
    args: {
      userId: string;
      organisationSlug: string;
      venueSlug: string;
      search?: string;
      sectionName?: string;
      page?: number;
      pageSize?: number;
    }
  ): Promise<{
    menuItems: MenuItemSummary[];
    total: number;
    sections: string[];
  }> {
    const context = await menuItemsRepo.getVenueContextBySlugs(
      supabase,
      args.organisationSlug,
      args.venueSlug
    );
    if (!context) {
      throw new MenuItemsServiceError(404, "Venue not found");
    }

    await assertVenueAccess(supabase, {
      userId: args.userId,
      organisationId: context.organisationId,
      venueId: context.venueId,
    });

    const page = Math.max(1, Number(args.page ?? 1));
    const pageSize = clampNumber(Number(args.pageSize ?? 20), 1, 200);
    const result = await menuItemsRepo.listMenuItems(supabase, {
      organisationId: context.organisationId,
      venueId: context.venueId,
      search: args.search?.trim() || undefined,
      sectionName: args.sectionName?.trim() || undefined,
      page,
      pageSize,
    });

    const components = await menuItemsRepo.listComponentsForMenuItems(
      supabase,
      result.rows.map((row) => row.id)
    );

    const componentMap = new Map<string, MenuItemRecipeComponent[]>();
    for (const component of components) {
      const list = componentMap.get(component.menu_item_id) ?? [];
      list.push({
        recipeId: component.recipe_id,
        recipeName: component.recipes?.name ?? "Unknown recipe",
        recipeCostPerServeCents: component.recipes?.cost_per_serve_cents ?? 0,
        quantity: Number(component.quantity),
      });
      componentMap.set(component.menu_item_id, list);
    }

    const menuItems = result.rows.map((row) =>
      toSummary(row, componentMap.get(row.id) ?? [])
    );

    const sections = Array.from(
      new Set(menuItems.map((item) => item.sectionName))
    ).sort((a, b) => a.localeCompare(b));

    return {
      menuItems,
      total: result.total,
      sections,
    };
  },

  async getById(
    supabase: Supabase,
    args: {
      userId: string;
      organisationSlug: string;
      venueSlug: string;
      menuItemId: string;
    }
  ): Promise<MenuItemDetail | null> {
    const context = await menuItemsRepo.getVenueContextBySlugs(
      supabase,
      args.organisationSlug,
      args.venueSlug
    );
    if (!context) {
      throw new MenuItemsServiceError(404, "Venue not found");
    }

    await assertVenueAccess(supabase, {
      userId: args.userId,
      organisationId: context.organisationId,
      venueId: context.venueId,
    });

    const row = await menuItemsRepo.getMenuItemById(supabase, {
      organisationId: context.organisationId,
      venueId: context.venueId,
      menuItemId: args.menuItemId,
    });
    if (!row) {
      return null;
    }

    const componentsRows = await menuItemsRepo.listComponentsForMenuItem(
      supabase,
      row.id
    );
    const components: MenuItemRecipeComponent[] = componentsRows.map((component) => ({
      recipeId: component.recipe_id,
      recipeName: component.recipes?.name ?? "Unknown recipe",
      recipeCostPerServeCents: component.recipes?.cost_per_serve_cents ?? 0,
      quantity: Number(component.quantity),
    }));

    const summary = toSummary(row, components);
    return {
      id: summary.id,
      sectionName: summary.sectionName,
      name: summary.name,
      tags: summary.tags,
      priceMode: summary.priceMode,
      priceCents: summary.priceCents,
      gstMode: summary.gstMode,
      costPerServeCents: summary.costPerServeCents,
      gpPercent: summary.gpPercent,
      pluCode: summary.pluCode,
      showOnMenu: summary.showOnMenu,
      status: summary.status,
      updatedAt: summary.updatedAt,
      components,
    };
  },

  async create(
    supabase: Supabase,
    args: {
      userId: string;
      organisationSlug: string;
      venueSlug: string;
      input: UpsertMenuItemInput;
    }
  ): Promise<MenuItemDetail> {
    const context = await menuItemsRepo.getVenueContextBySlugs(
      supabase,
      args.organisationSlug,
      args.venueSlug
    );
    if (!context) {
      throw new MenuItemsServiceError(404, "Venue not found");
    }

    await assertVenueAccess(supabase, {
      userId: args.userId,
      organisationId: context.organisationId,
      venueId: context.venueId,
    });

    const payload = normalizeInput(args.input);
    const recipeRows = await menuItemsRepo.listScopedRecipesByIds(supabase, {
      organisationId: context.organisationId,
      venueId: context.venueId,
      recipeIds: payload.components.map((component) => component.recipeId),
    });
    if (recipeRows.length !== payload.components.length) {
      throw new MenuItemsServiceError(400, "One or more recipes are invalid");
    }

    const recipeCostMap = new Map(
      recipeRows.map((recipe) => [recipe.id, recipe.cost_per_serve_cents] as const)
    );
    const costPerServeCents = payload.components.reduce((sum, component) => {
      return (
        sum +
        Math.round(
          (recipeCostMap.get(component.recipeId) ?? 0) * component.quantity
        )
      );
    }, 0);
    const gpPercent = computeGpPercent(payload.priceCents, costPerServeCents);

    const created = await menuItemsRepo.createMenuItem(supabase, {
      organisation_id: context.organisationId,
      venue_id: context.venueId,
      section_name: payload.sectionName,
      name: payload.name,
      tags: payload.tags,
      price_mode: payload.priceMode,
      price_cents: payload.priceCents,
      gst_mode: payload.gstMode,
      cost_per_serve_cents: costPerServeCents,
      gp_percent: gpPercent,
      plu_code: payload.pluCode,
      show_on_menu: payload.showOnMenu,
      status: payload.status,
      is_active: payload.status === "active",
      created_by: args.userId,
      updated_by: args.userId,
      updated_at: new Date().toISOString(),
    });

    await menuItemsRepo.replaceComponents(
      supabase,
      created.id,
      payload.components
    );

    const detail = await this.getById(supabase, {
      userId: args.userId,
      organisationSlug: args.organisationSlug,
      venueSlug: args.venueSlug,
      menuItemId: created.id,
    });

    if (!detail) {
      throw new MenuItemsServiceError(500, "Created menu line not found");
    }
    return detail;
  },

  async update(
    supabase: Supabase,
    args: {
      userId: string;
      organisationSlug: string;
      venueSlug: string;
      menuItemId: string;
      input: UpsertMenuItemInput;
    }
  ): Promise<MenuItemDetail | null> {
    const context = await menuItemsRepo.getVenueContextBySlugs(
      supabase,
      args.organisationSlug,
      args.venueSlug
    );
    if (!context) {
      throw new MenuItemsServiceError(404, "Venue not found");
    }

    await assertVenueAccess(supabase, {
      userId: args.userId,
      organisationId: context.organisationId,
      venueId: context.venueId,
    });

    const payload = normalizeInput(args.input);
    const recipeRows = await menuItemsRepo.listScopedRecipesByIds(supabase, {
      organisationId: context.organisationId,
      venueId: context.venueId,
      recipeIds: payload.components.map((component) => component.recipeId),
    });
    if (recipeRows.length !== payload.components.length) {
      throw new MenuItemsServiceError(400, "One or more recipes are invalid");
    }

    const recipeCostMap = new Map(
      recipeRows.map((recipe) => [recipe.id, recipe.cost_per_serve_cents] as const)
    );
    const costPerServeCents = payload.components.reduce((sum, component) => {
      return (
        sum +
        Math.round(
          (recipeCostMap.get(component.recipeId) ?? 0) * component.quantity
        )
      );
    }, 0);
    const gpPercent = computeGpPercent(payload.priceCents, costPerServeCents);

    const updated = await menuItemsRepo.updateMenuItem(supabase, {
      organisationId: context.organisationId,
      venueId: context.venueId,
      menuItemId: args.menuItemId,
      row: {
        section_name: payload.sectionName,
        name: payload.name,
        tags: payload.tags,
        price_mode: payload.priceMode,
        price_cents: payload.priceCents,
        gst_mode: payload.gstMode,
        cost_per_serve_cents: costPerServeCents,
        gp_percent: gpPercent,
        plu_code: payload.pluCode,
        show_on_menu: payload.showOnMenu,
        status: payload.status,
        is_active: payload.status === "active",
        updated_by: args.userId,
        updated_at: new Date().toISOString(),
      },
    });

    if (!updated) {
      return null;
    }

    await menuItemsRepo.replaceComponents(
      supabase,
      updated.id,
      payload.components
    );

    return this.getById(supabase, {
      userId: args.userId,
      organisationSlug: args.organisationSlug,
      venueSlug: args.venueSlug,
      menuItemId: updated.id,
    });
  },

  async delete(
    supabase: Supabase,
    args: {
      userId: string;
      organisationSlug: string;
      venueSlug: string;
      menuItemId: string;
    }
  ): Promise<boolean> {
    const context = await menuItemsRepo.getVenueContextBySlugs(
      supabase,
      args.organisationSlug,
      args.venueSlug
    );
    if (!context) {
      throw new MenuItemsServiceError(404, "Venue not found");
    }

    await assertVenueAccess(supabase, {
      userId: args.userId,
      organisationId: context.organisationId,
      venueId: context.venueId,
    });

    return menuItemsRepo.softDeleteMenuItem(supabase, {
      organisationId: context.organisationId,
      venueId: context.venueId,
      menuItemId: args.menuItemId,
    });
  },
};
