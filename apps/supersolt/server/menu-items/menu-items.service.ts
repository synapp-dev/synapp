import type { RequestAuthContext } from "@/server/auth/context";
import { AuthError } from "@/server/auth/errors";
import { resolveVenueScopeForService } from "@/server/access/require-venue-scope";
import {
  menuItemsRepo,
  type MenuItemRecipeInput,
  type MenuItemRow,
} from "./menu-items.repo";

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

export type MenuItemDetail = Omit<
  MenuItemSummary,
  "recipeSummary" | "recipeCount"
> & {
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

function mapAuthError(error: unknown): never {
  if (error instanceof AuthError) {
    throw new MenuItemsServiceError(error.status, error.message);
  }
  throw error;
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

export function computeGpPercent(priceCents: number, costPerServeCents: number): number {
  if (priceCents <= 0) {
    return 0;
  }
  return Number(
    (((priceCents - costPerServeCents) / priceCents) * 100).toFixed(2),
  );
}

async function resolveScope(
  ctx: RequestAuthContext,
  organisationSlug: string,
  venueSlug: string,
) {
  return resolveVenueScopeForService(ctx, organisationSlug, venueSlug, {
    notFound: (message) => new MenuItemsServiceError(404, message),
    forbidden: (auth) => new MenuItemsServiceError(auth.status, auth.message),
  });
}

function normalizeInput(input: UpsertMenuItemInput) {
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
      "At least one recipe component is required",
    );
  }

  return {
    name,
    sectionName,
    tags: Array.from(
      new Set((input.tags ?? []).map((tag) => tag.trim()).filter(Boolean)),
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

function componentsFromLookup(
  rows: Awaited<ReturnType<typeof menuItemsRepo.listComponentsForMenuItems>>,
): MenuItemRecipeComponent[] {
  return rows.map((component) => ({
    recipeId: component.recipeId,
    recipeName: component.recipeName ?? "Unknown recipe",
    recipeCostPerServeCents: component.recipeCostPerServeCents ?? 0,
    quantity: component.quantity,
  }));
}

function toSummary(
  row: MenuItemRow,
  components: MenuItemRecipeComponent[],
): MenuItemSummary {
  const recipeNames = components.map((component) => component.recipeName);
  const recipeSummary =
    recipeNames.length === 0
      ? "No recipes"
      : recipeNames.length === 1
        ? (recipeNames[0] ?? "No recipes")
        : `${recipeNames[0] ?? "Recipe"} +${recipeNames.length - 1}`;

  return {
    id: row.id,
    sectionName: row.sectionName,
    name: row.name,
    tags: row.tags ?? [],
    priceMode: row.priceMode as PriceMode,
    priceCents: row.priceCents,
    gstMode: row.gstMode as GstMode,
    costPerServeCents: row.costPerServeCents,
    gpPercent: Number(row.gpPercent),
    pluCode: row.pluCode ?? "",
    showOnMenu: row.showOnMenu,
    status: row.status as MenuItemStatus,
    updatedAt: row.updatedAt,
    recipeSummary,
    recipeCount: components.length,
  };
}

async function computeCostFromRecipes(
  ctx: RequestAuthContext,
  scope: { organisationId: string; venueId: string },
  components: MenuItemRecipeInput[],
) {
  const recipeRows = await ctx.appDb.rls((tx) =>
    menuItemsRepo.listScopedRecipesByIds(tx, {
      organisationId: scope.organisationId,
      venueId: scope.venueId,
      recipeIds: components.map((c) => c.recipeId),
    }),
  );
  if (recipeRows.length !== components.length) {
    throw new MenuItemsServiceError(400, "One or more recipes are invalid");
  }

  const recipeCostMap = new Map(
    recipeRows.map((recipe) => [recipe.id, recipe.costPerServeCents] as const),
  );
  return components.reduce((sum, component) => {
    return (
      sum +
      Math.round(
        (recipeCostMap.get(component.recipeId) ?? 0) * component.quantity,
      )
    );
  }, 0);
}

export const menuItemsService = {
  async list(
    ctx: RequestAuthContext,
    args: {
      organisationSlug: string;
      venueSlug: string;
      search?: string;
      sectionName?: string;
      page?: number;
      pageSize?: number;
    },
  ) {
    const scope = await resolveScope(ctx, args.organisationSlug, args.venueSlug);
    const page = Math.max(1, Number(args.page ?? 1));
    const pageSize = clampNumber(Number(args.pageSize ?? 20), 1, 200);

    const result = await ctx.appDb.rls((tx) =>
      menuItemsRepo.listMenuItems(tx, {
        organisationId: scope.organisationId,
        venueId: scope.venueId,
        search: args.search?.trim() || undefined,
        sectionName: args.sectionName?.trim() || undefined,
        page,
        pageSize,
      }),
    );

    const components = await ctx.appDb.rls((tx) =>
      menuItemsRepo.listComponentsForMenuItems(
        tx,
        result.rows.map((row) => row.id),
      ),
    );

    const componentMap = new Map<string, MenuItemRecipeComponent[]>();
    for (const component of components) {
      const list = componentMap.get(component.menuItemId) ?? [];
      list.push({
        recipeId: component.recipeId,
        recipeName: component.recipeName ?? "Unknown recipe",
        recipeCostPerServeCents: component.recipeCostPerServeCents ?? 0,
        quantity: component.quantity,
      });
      componentMap.set(component.menuItemId, list);
    }

    const menuItems = result.rows.map((row) =>
      toSummary(row, componentMap.get(row.id) ?? []),
    );

    const sections = Array.from(
      new Set(menuItems.map((item) => item.sectionName)),
    ).sort((a, b) => a.localeCompare(b));

    return {
      menuItems,
      total: result.total,
      sections,
    };
  },

  async getById(
    ctx: RequestAuthContext,
    args: {
      organisationSlug: string;
      venueSlug: string;
      menuItemId: string;
    },
  ): Promise<MenuItemDetail | null> {
    const scope = await resolveScope(ctx, args.organisationSlug, args.venueSlug);

    const row = await ctx.appDb.rls((tx) =>
      menuItemsRepo.getMenuItemById(tx, {
        organisationId: scope.organisationId,
        venueId: scope.venueId,
        menuItemId: args.menuItemId,
      }),
    );
    if (!row) {
      return null;
    }

    const componentsRows = await ctx.appDb.rls((tx) =>
      menuItemsRepo.listComponentsForMenuItem(tx, row.id),
    );
    const components = componentsFromLookup(componentsRows);
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
    ctx: RequestAuthContext,
    args: {
      organisationSlug: string;
      venueSlug: string;
      input: UpsertMenuItemInput;
    },
  ): Promise<MenuItemDetail> {
    const scope = await resolveScope(ctx, args.organisationSlug, args.venueSlug);
    const payload = normalizeInput(args.input);
    const costPerServeCents = await computeCostFromRecipes(
      ctx,
      scope,
      payload.components,
    );
    const gpPercent = computeGpPercent(payload.priceCents, costPerServeCents);

    const created = await ctx.appDb.rls(async (tx) => {
      const row = await menuItemsRepo.createMenuItem(tx, {
        organisationId: scope.organisationId,
        venueId: scope.venueId,
        sectionName: payload.sectionName,
        name: payload.name,
        tags: payload.tags,
        priceMode: payload.priceMode,
        priceCents: payload.priceCents,
        gstMode: payload.gstMode,
        costPerServeCents,
        gpPercent: Math.round(gpPercent),
        pluCode: payload.pluCode,
        showOnMenu: payload.showOnMenu,
        status: payload.status,
        isActive: payload.status === "active",
        createdBy: ctx.userId,
        updatedBy: ctx.userId,
        updatedAt: new Date().toISOString(),
      });
      await menuItemsRepo.replaceComponents(tx, row.id, payload.components);
      return row;
    });

    const detail = await this.getById(ctx, {
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
    ctx: RequestAuthContext,
    args: {
      organisationSlug: string;
      venueSlug: string;
      menuItemId: string;
      input: UpsertMenuItemInput;
    },
  ): Promise<MenuItemDetail | null> {
    const scope = await resolveScope(ctx, args.organisationSlug, args.venueSlug);
    const payload = normalizeInput(args.input);
    const costPerServeCents = await computeCostFromRecipes(
      ctx,
      scope,
      payload.components,
    );
    const gpPercent = computeGpPercent(payload.priceCents, costPerServeCents);

    const updated = await ctx.appDb.rls(async (tx) => {
      const row = await menuItemsRepo.updateMenuItem(tx, {
        organisationId: scope.organisationId,
        venueId: scope.venueId,
        menuItemId: args.menuItemId,
        row: {
          sectionName: payload.sectionName,
          name: payload.name,
          tags: payload.tags,
          priceMode: payload.priceMode,
          priceCents: payload.priceCents,
          gstMode: payload.gstMode,
          costPerServeCents,
          gpPercent: Math.round(gpPercent),
          pluCode: payload.pluCode,
          showOnMenu: payload.showOnMenu,
          status: payload.status,
          isActive: payload.status === "active",
          updatedBy: ctx.userId,
          updatedAt: new Date().toISOString(),
        },
      });
      if (!row) {
        return null;
      }
      await menuItemsRepo.replaceComponents(tx, row.id, payload.components);
      return row;
    });

    if (!updated) {
      return null;
    }

    return this.getById(ctx, {
      organisationSlug: args.organisationSlug,
      venueSlug: args.venueSlug,
      menuItemId: updated.id,
    });
  },

  async delete(
    ctx: RequestAuthContext,
    args: {
      organisationSlug: string;
      venueSlug: string;
      menuItemId: string;
    },
  ): Promise<boolean> {
    const scope = await resolveScope(ctx, args.organisationSlug, args.venueSlug);

    return ctx.appDb.rls((tx) =>
      menuItemsRepo.softDeleteMenuItem(tx, {
        organisationId: scope.organisationId,
        venueId: scope.venueId,
        menuItemId: args.menuItemId,
      }),
    );
  },
};
