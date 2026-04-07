import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/utils/supabase/types";
import { ingredientsRepo } from "./ingredients.repo";
import { suppliersRepo } from "@/server/suppliers/suppliers.repo";

type Supabase = SupabaseClient<Database>;

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

function toSummary(
  row: Database["public"]["Tables"]["ingredients"]["Row"]
): IngredientSummary {
  return {
    id: row.id,
    name: row.name,
    category: row.category as IngredientCategory,
    unit: row.unit,
    costPerUnitCents: row.cost_per_unit_cents,
    bestSupplierCostCents: row.best_supplier_cost_cents,
    currentStockLevel: Number(row.current_stock_level),
    status: row.status as IngredientStatus,
    supplierId: row.supplier_id ?? null,
    updatedAt: row.updated_at,
  };
}

type SupplierIdMutation =
  | { mode: "omit" }
  | { mode: "set"; value: string | null };

async function resolveSupplierIdMutation(
  supabase: Supabase,
  args: {
    organisationId: string;
    venueId: string;
    supplierId: string | null | undefined;
  }
): Promise<SupplierIdMutation> {
  if (args.supplierId === undefined) {
    return { mode: "omit" };
  }
  if (args.supplierId === null || args.supplierId === "") {
    return { mode: "set", value: null };
  }
  const supplier = await suppliersRepo.getSupplierById(supabase, {
    organisationId: args.organisationId,
    venueId: args.venueId,
    supplierId: args.supplierId,
  });
  if (!supplier) {
    throw new IngredientsServiceError(400, "Invalid supplier for this venue");
  }
  return { mode: "set", value: args.supplierId };
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
    throw new IngredientsServiceError(500, error.message);
  }

  const membershipIds = (data ?? []).map((item) => item.id);
  if (membershipIds.length === 0) {
    throw new IngredientsServiceError(403, "Forbidden");
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
    throw new IngredientsServiceError(500, venueError.message);
  }

  if (!venueAccess || venueAccess.length === 0) {
    throw new IngredientsServiceError(403, "Forbidden");
  }
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
    costPerUnitCents: Math.max(0, Math.round(Number(input.costPerUnitCents || 0))),
    bestSupplierCostCents:
      input.bestSupplierCostCents === null || input.bestSupplierCostCents === undefined
        ? null
        : Math.max(0, Math.round(Number(input.bestSupplierCostCents))),
    currentStockLevel: clampNumber(Number(input.currentStockLevel || 0), 0, 1_000_000_000),
    status: assertIngredientStatus(input.status),
  };
}

export const ingredientsService = {
  async list(
    supabase: Supabase,
    args: {
      userId: string;
      organisationSlug: string;
      venueSlug: string;
      search?: string;
      category?: string;
      status?: string;
      supplierId?: string;
      page?: number;
      pageSize?: number;
    }
  ): Promise<{ ingredients: IngredientSummary[]; total: number }> {
    const context = await ingredientsRepo.getVenueContextBySlugs(
      supabase,
      args.organisationSlug,
      args.venueSlug
    );

    if (!context) {
      throw new IngredientsServiceError(404, "Venue not found");
    }

    await assertVenueAccess(supabase, {
      userId: args.userId,
      organisationId: context.organisationId,
      venueId: context.venueId,
    });

    const page = Math.max(1, Number(args.page ?? 1));
    const pageSize = clampNumber(Number(args.pageSize ?? 20), 1, 200);
    const category = args.category
      ? assertIngredientCategory(args.category)
      : undefined;
    const status = args.status ? assertIngredientStatus(args.status) : undefined;

    const result = await ingredientsRepo.listIngredients(supabase, {
      organisationId: context.organisationId,
      venueId: context.venueId,
      search: args.search?.trim() || undefined,
      category,
      status,
      supplierId: args.supplierId,
      page,
      pageSize,
    });

    return {
      ingredients: result.rows.map(toSummary),
      total: result.total,
    };
  },

  async getById(
    supabase: Supabase,
    args: {
      userId: string;
      organisationSlug: string;
      venueSlug: string;
      ingredientId: string;
    }
  ): Promise<IngredientDetail | null> {
    const context = await ingredientsRepo.getVenueContextBySlugs(
      supabase,
      args.organisationSlug,
      args.venueSlug
    );

    if (!context) {
      throw new IngredientsServiceError(404, "Venue not found");
    }

    await assertVenueAccess(supabase, {
      userId: args.userId,
      organisationId: context.organisationId,
      venueId: context.venueId,
    });

    const ingredient = await ingredientsRepo.getIngredientById(supabase, {
      organisationId: context.organisationId,
      venueId: context.venueId,
      ingredientId: args.ingredientId,
    });

    if (!ingredient) {
      return null;
    }

    return toSummary(ingredient);
  },

  async create(
    supabase: Supabase,
    args: {
      userId: string;
      organisationSlug: string;
      venueSlug: string;
      input: UpsertIngredientInput;
    }
  ): Promise<IngredientDetail> {
    const context = await ingredientsRepo.getVenueContextBySlugs(
      supabase,
      args.organisationSlug,
      args.venueSlug
    );

    if (!context) {
      throw new IngredientsServiceError(404, "Venue not found");
    }

    await assertVenueAccess(supabase, {
      userId: args.userId,
      organisationId: context.organisationId,
      venueId: context.venueId,
    });

    const payload = normalizeUpsertInput(args.input);
    const supplierMutation = await resolveSupplierIdMutation(supabase, {
      organisationId: context.organisationId,
      venueId: context.venueId,
      supplierId: args.input.supplierId,
    });

    const created = await ingredientsRepo.createIngredient(supabase, {
      organisation_id: context.organisationId,
      venue_id: context.venueId,
      name: payload.name,
      category: payload.category,
      unit: payload.unit,
      cost_per_unit_cents: payload.costPerUnitCents,
      best_supplier_cost_cents: payload.bestSupplierCostCents,
      current_stock_level: payload.currentStockLevel,
      status: payload.status,
      is_active: payload.status === "active",
      ...(supplierMutation.mode === "set" ? { supplier_id: supplierMutation.value } : {}),
      created_by: args.userId,
      updated_by: args.userId,
      updated_at: new Date().toISOString(),
    });

    return toSummary(created);
  },

  async update(
    supabase: Supabase,
    args: {
      userId: string;
      organisationSlug: string;
      venueSlug: string;
      ingredientId: string;
      input: UpsertIngredientInput;
    }
  ): Promise<IngredientDetail | null> {
    const context = await ingredientsRepo.getVenueContextBySlugs(
      supabase,
      args.organisationSlug,
      args.venueSlug
    );

    if (!context) {
      throw new IngredientsServiceError(404, "Venue not found");
    }

    await assertVenueAccess(supabase, {
      userId: args.userId,
      organisationId: context.organisationId,
      venueId: context.venueId,
    });

    const payload = normalizeUpsertInput(args.input);
    const supplierMutation = await resolveSupplierIdMutation(supabase, {
      organisationId: context.organisationId,
      venueId: context.venueId,
      supplierId: args.input.supplierId,
    });

    const updated = await ingredientsRepo.updateIngredient(supabase, {
      organisationId: context.organisationId,
      venueId: context.venueId,
      ingredientId: args.ingredientId,
      row: {
        name: payload.name,
        category: payload.category,
        unit: payload.unit,
        cost_per_unit_cents: payload.costPerUnitCents,
        best_supplier_cost_cents: payload.bestSupplierCostCents,
        current_stock_level: payload.currentStockLevel,
        status: payload.status,
        is_active: payload.status === "active",
        ...(supplierMutation.mode === "set" ? { supplier_id: supplierMutation.value } : {}),
        updated_by: args.userId,
        updated_at: new Date().toISOString(),
      },
    });

    if (!updated) {
      return null;
    }

    return toSummary(updated);
  },

  async delete(
    supabase: Supabase,
    args: {
      userId: string;
      organisationSlug: string;
      venueSlug: string;
      ingredientId: string;
    }
  ): Promise<boolean> {
    const context = await ingredientsRepo.getVenueContextBySlugs(
      supabase,
      args.organisationSlug,
      args.venueSlug
    );

    if (!context) {
      throw new IngredientsServiceError(404, "Venue not found");
    }

    await assertVenueAccess(supabase, {
      userId: args.userId,
      organisationId: context.organisationId,
      venueId: context.venueId,
    });

    return ingredientsRepo.softDeleteIngredient(supabase, {
      organisationId: context.organisationId,
      venueId: context.venueId,
      ingredientId: args.ingredientId,
    });
  },
};
