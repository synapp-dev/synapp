import type { RequestAuthContext } from "@/server/auth/context";
import { resolveVenueScopeForService } from "@/server/access/require-venue-scope";
import { suppliersRepo } from "@/server/suppliers/suppliers.repo";
import {
  ingredientsRepo,
  type IngredientRow,
} from "./ingredients.repo";

const INGREDIENT_CATEGORIES = [
  "proteins",
  "produce",
  "dairy",
  "dry-goods",
  "beverages",
  "oils-condiments",
  "other",
] as const;

const INGREDIENT_STATUSES = ["active", "inactive"] as const;

export type IngredientCategory = (typeof INGREDIENT_CATEGORIES)[number];
export type IngredientStatus = (typeof INGREDIENT_STATUSES)[number];

export type IngredientSummary = {
  id: string;
  name: string;
  category: IngredientCategory;
  unit: string;
  costPerUnitCents: number;
  bestSupplierCostCents: number | null;
  currentStockLevel: number;
  status: IngredientStatus;
  supplierId: string | null;
  updatedAt: string;
};

export type IngredientDetail = IngredientSummary;

export type UpsertIngredientInput = {
  name: string;
  category: string;
  unit: string;
  costPerUnitCents: number;
  bestSupplierCostCents?: number | null;
  currentStockLevel: number;
  status: string;
  supplierId?: string | null;
};

export class IngredientsServiceError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function assertIngredientCategory(value: string): IngredientCategory {
  if (!INGREDIENT_CATEGORIES.includes(value as IngredientCategory)) {
    throw new IngredientsServiceError(400, "Invalid ingredient category");
  }
  return value as IngredientCategory;
}

function assertIngredientStatus(value: string): IngredientStatus {
  if (!INGREDIENT_STATUSES.includes(value as IngredientStatus)) {
    throw new IngredientsServiceError(400, "Invalid ingredient status");
  }
  return value as IngredientStatus;
}

function clampNumber(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function toSummary(row: IngredientRow): IngredientSummary {
  return {
    id: row.id,
    name: row.name,
    category: row.category as IngredientCategory,
    unit: row.unit,
    costPerUnitCents: row.costPerUnitCents,
    bestSupplierCostCents: row.bestSupplierCostCents,
    currentStockLevel: Number(row.currentStockLevel),
    status: row.status as IngredientStatus,
    supplierId: row.supplierId ?? null,
    updatedAt: row.updatedAt,
  };
}

async function resolveScope(
  ctx: RequestAuthContext,
  organisationSlug: string,
  venueSlug: string,
) {
  return resolveVenueScopeForService(ctx, organisationSlug, venueSlug, {
    notFound: (message) => new IngredientsServiceError(404, message),
    forbidden: (auth) => new IngredientsServiceError(auth.status, auth.message),
  });
}

function normalizeUpsertInput(input: UpsertIngredientInput) {
  const name = input.name.trim();
  if (name.length === 0) {
    throw new IngredientsServiceError(400, "Ingredient name is required");
  }

  const unit = input.unit.trim();
  if (unit.length === 0) {
    throw new IngredientsServiceError(400, "Ingredient unit is required");
  }

  return {
    name,
    category: assertIngredientCategory(input.category),
    unit,
    costPerUnitCents: Math.max(
      0,
      Math.round(Number(input.costPerUnitCents || 0)),
    ),
    bestSupplierCostCents:
      input.bestSupplierCostCents === null ||
      input.bestSupplierCostCents === undefined
        ? null
        : Math.max(0, Math.round(Number(input.bestSupplierCostCents))),
    currentStockLevel: clampNumber(
      Number(input.currentStockLevel || 0),
      0,
      1_000_000_000,
    ),
    status: assertIngredientStatus(input.status),
  };
}

export const ingredientsService = {
  async list(
    ctx: RequestAuthContext,
    args: {
      organisationSlug: string;
      venueSlug: string;
      search?: string;
      category?: string;
      status?: string;
      supplierId?: string;
      page?: number;
      pageSize?: number;
    },
  ): Promise<{ ingredients: IngredientSummary[]; total: number }> {
    const scope = await resolveScope(
      ctx,
      args.organisationSlug,
      args.venueSlug,
    );

    const page = Math.max(1, Number(args.page ?? 1));
    // 1000 cap so selector-style consumers (recipe editor, products wizard) can
    // load the whole catalog — venues run to a few hundred ingredients.
    const pageSize = clampNumber(Number(args.pageSize ?? 20), 1, 1000);
    const category = args.category
      ? assertIngredientCategory(args.category)
      : undefined;
    const status = args.status ? assertIngredientStatus(args.status) : undefined;

    const result = await ctx.appDb.rls((tx) =>
      ingredientsRepo.listIngredients(tx, {
        organisationId: scope.organisationId,
        venueId: scope.venueId,
        search: args.search?.trim() || undefined,
        category,
        status,
        supplierId: args.supplierId,
        page,
        pageSize,
      }),
    );

    return {
      ingredients: result.rows.map(toSummary),
      total: result.total,
    };
  },

  async getById(
    ctx: RequestAuthContext,
    args: {
      organisationSlug: string;
      venueSlug: string;
      ingredientId: string;
    },
  ): Promise<IngredientDetail | null> {
    const scope = await resolveScope(
      ctx,
      args.organisationSlug,
      args.venueSlug,
    );

    const ingredient = await ctx.appDb.rls((tx) =>
      ingredientsRepo.getIngredientById(tx, {
        organisationId: scope.organisationId,
        venueId: scope.venueId,
        ingredientId: args.ingredientId,
      }),
    );

    return ingredient ? toSummary(ingredient) : null;
  },

  async create(
    ctx: RequestAuthContext,
    args: {
      organisationSlug: string;
      venueSlug: string;
      input: UpsertIngredientInput;
    },
  ): Promise<IngredientDetail> {
    const scope = await resolveScope(
      ctx,
      args.organisationSlug,
      args.venueSlug,
    );
    const payload = normalizeUpsertInput(args.input);

    const created = await ctx.appDb.rls(async (tx) => {
      let supplierId: string | null | undefined;
      if (args.input.supplierId !== undefined) {
        if (args.input.supplierId === null || args.input.supplierId === "") {
          supplierId = null;
        } else {
          const supplier = await suppliersRepo.getSupplierById(tx, {
            organisationId: scope.organisationId,
            venueId: scope.venueId,
            supplierId: args.input.supplierId,
          });
          if (!supplier) {
            throw new IngredientsServiceError(
              400,
              "Invalid supplier for this venue",
            );
          }
          supplierId = args.input.supplierId;
        }
      }

      return ingredientsRepo.createIngredient(tx, {
        organisationId: scope.organisationId,
        venueId: scope.venueId,
        name: payload.name,
        category: payload.category,
        unit: payload.unit,
        costPerUnitCents: payload.costPerUnitCents,
        bestSupplierCostCents: payload.bestSupplierCostCents,
        currentStockLevel: String(payload.currentStockLevel),
        status: payload.status,
        isActive: payload.status === "active",
        ...(supplierId !== undefined ? { supplierId } : {}),
        createdBy: ctx.userId,
        updatedBy: ctx.userId,
        updatedAt: new Date().toISOString(),
      });
    });

    return toSummary(created);
  },

  async update(
    ctx: RequestAuthContext,
    args: {
      organisationSlug: string;
      venueSlug: string;
      ingredientId: string;
      input: UpsertIngredientInput;
    },
  ): Promise<IngredientDetail | null> {
    const scope = await resolveScope(
      ctx,
      args.organisationSlug,
      args.venueSlug,
    );
    const payload = normalizeUpsertInput(args.input);

    const updated = await ctx.appDb.rls(async (tx) => {
      let supplierId: string | null | undefined;
      if (args.input.supplierId !== undefined) {
        if (args.input.supplierId === null || args.input.supplierId === "") {
          supplierId = null;
        } else {
          const supplier = await suppliersRepo.getSupplierById(tx, {
            organisationId: scope.organisationId,
            venueId: scope.venueId,
            supplierId: args.input.supplierId,
          });
          if (!supplier) {
            throw new IngredientsServiceError(
              400,
              "Invalid supplier for this venue",
            );
          }
          supplierId = args.input.supplierId;
        }
      }

      return ingredientsRepo.updateIngredient(tx, {
        organisationId: scope.organisationId,
        venueId: scope.venueId,
        ingredientId: args.ingredientId,
        row: {
          name: payload.name,
          category: payload.category,
          unit: payload.unit,
          costPerUnitCents: payload.costPerUnitCents,
          bestSupplierCostCents: payload.bestSupplierCostCents,
          currentStockLevel: String(payload.currentStockLevel),
          status: payload.status,
          isActive: payload.status === "active",
          ...(supplierId !== undefined ? { supplierId } : {}),
          updatedBy: ctx.userId,
          updatedAt: new Date().toISOString(),
        },
      });
    });

    return updated ? toSummary(updated) : null;
  },

  async delete(
    ctx: RequestAuthContext,
    args: {
      organisationSlug: string;
      venueSlug: string;
      ingredientId: string;
    },
  ): Promise<boolean> {
    const scope = await resolveScope(
      ctx,
      args.organisationSlug,
      args.venueSlug,
    );

    return ctx.appDb.rls((tx) =>
      ingredientsRepo.softDeleteIngredient(tx, {
        organisationId: scope.organisationId,
        venueId: scope.venueId,
        ingredientId: args.ingredientId,
      }),
    );
  },
};
