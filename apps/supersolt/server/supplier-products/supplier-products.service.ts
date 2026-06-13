import { and, eq, inArray, isNull } from "drizzle-orm";

import type { CostChangePreview } from "@/entities/invoices/model/types";
import type { RequestAuthContext } from "@/server/auth/context";
import { AuthError } from "@/server/auth/errors";
import { resolveVenueScopeForService } from "@/server/access/require-venue-scope";
import {
  ingredients,
  recipeIngredients,
  recipes,
} from "@/server/db/schema";
import { suppliersRepo } from "@/server/suppliers/suppliers.repo";
import {
  supplierProductsRepo,
  type PriceHistorySource,
  type SupplierProductRow,
} from "@/server/supplier-products/supplier-products.repo";
import { supplierProducts } from "@/server/db/schema";

const PACK_UNITS = ["g", "kg", "mL", "L", "each"] as const;
export type PackUnit = (typeof PACK_UNITS)[number];

export type SupplierProductSummary = {
  id: string;
  supplierId: string;
  name: string;
  skuCode: string | null;
  packLabel: string;
  unitsPerPack: number;
  packUnit: string;
  unitPriceCents: number;
  ingredientId: string | null;
  ingredientName: string | null;
  isActiveForIngredient: boolean;
  updatedAt: string;
};

export type SupplierProductDetail = SupplierProductSummary & {
  priceHistory: Array<{
    id: string;
    oldPriceCents: number | null;
    newPriceCents: number;
    source: string;
    sourceRef: string | null;
    changedAt: string;
  }>;
};

export type UpsertSupplierProductInput = {
  name: string;
  skuCode?: string | null;
  packLabel?: string;
  unitsPerPack?: number;
  packUnit?: string;
  unitPriceCents: number;
  ingredientId?: string | null;
  makeActive?: boolean;
};

export class SupplierProductsServiceError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function mapAuthError(error: unknown): never {
  if (error instanceof AuthError) {
    throw new SupplierProductsServiceError(error.status, error.message);
  }
  throw error;
}

function assertPackUnit(value: string): PackUnit {
  if (!PACK_UNITS.includes(value as PackUnit)) {
    throw new SupplierProductsServiceError(400, "Invalid pack unit");
  }
  return value as PackUnit;
}

async function resolveScope(
  ctx: RequestAuthContext,
  organisationSlug: string,
  venueSlug: string,
) {
  return resolveVenueScopeForService(ctx, organisationSlug, venueSlug, {
    notFound: (message) => new SupplierProductsServiceError(404, message),
    forbidden: (auth) => new SupplierProductsServiceError(auth.status, auth.message),
  });
}

async function loadIngredientNames(
  ctx: RequestAuthContext,
  ingredientIds: string[],
): Promise<Map<string, string>> {
  if (ingredientIds.length === 0) return new Map();
  const rows = await ctx.appDb.rls(async (tx) =>
    tx
      .select({ id: ingredients.id, name: ingredients.name })
      .from(ingredients)
      .where(inArray(ingredients.id, ingredientIds)),
  );
  return new Map(rows.map((r) => [r.id, r.name]));
}

function toSummary(
  row: SupplierProductRow,
  ingredientNames: Map<string, string>,
): SupplierProductSummary {
  return {
    id: row.id,
    supplierId: row.supplierId,
    name: row.name,
    skuCode: row.skuCode,
    packLabel: row.packLabel,
    unitsPerPack: Number(row.unitsPerPack),
    packUnit: row.packUnit,
    unitPriceCents: row.unitPriceCents,
    ingredientId: row.ingredientId,
    ingredientName: row.ingredientId ? ingredientNames.get(row.ingredientId) ?? null : null,
    isActiveForIngredient: row.isActiveForIngredient,
    updatedAt: row.updatedAt,
  };
}

async function recomputeRecipesForIngredient(
  ctx: RequestAuthContext,
  ingredientId: string,
): Promise<number> {
  const links = await ctx.appDb.admin
    .select()
    .from(recipeIngredients)
    .where(eq(recipeIngredients.ingredientId, ingredientId));

  const recipeIds = [...new Set(links.map((l) => l.recipeId))];

  for (const recipeId of recipeIds) {
    const allLines = await ctx.appDb.admin
      .select()
      .from(recipeIngredients)
      .where(eq(recipeIngredients.recipeId, recipeId));

    let totalCents = 0;
    for (const rl of allLines) {
      if (!rl.ingredientId) continue;
      const ingRow = await ctx.appDb.admin
        .select()
        .from(ingredients)
        .where(eq(ingredients.id, rl.ingredientId))
        .limit(1);
      const unitCost = ingRow[0]?.bestSupplierCostCents ?? ingRow[0]?.costPerUnitCents ?? 0;
      const qty = Number(rl.quantity) || 0;
      totalCents += Math.round(unitCost * qty);
    }

    const recipeRow = await ctx.appDb.admin
      .select({ serves: recipes.serves })
      .from(recipes)
      .where(eq(recipes.id, recipeId))
      .limit(1);
    const serves = recipeRow[0]?.serves ?? 1;
    const perServe = Math.round(totalCents / Math.max(serves, 1));

    await ctx.appDb.admin
      .update(recipes)
      .set({
        costPerServeCents: perServe,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(recipes.id, recipeId));
  }

  return recipeIds.length;
}

export async function buildProductCostChangePreview(
  ctx: RequestAuthContext,
  args: {
    productId: string;
    newPriceCents: number;
    organisationId: string;
    venueId: string;
  },
): Promise<CostChangePreview | null> {
  const product = await ctx.appDb.rls((tx) =>
    supplierProductsRepo.getById(tx, {
      organisationId: args.organisationId,
      venueId: args.venueId,
      productId: args.productId,
    }),
  );
  if (!product?.ingredientId || !product.isActiveForIngredient) return null;
  if (product.unitPriceCents === args.newPriceCents) return null;

  const recipeRows = await ctx.appDb.admin
    .select({ recipeId: recipeIngredients.recipeId })
    .from(recipeIngredients)
    .where(eq(recipeIngredients.ingredientId, product.ingredientId));

  return {
    lines: [
      {
        lineItemId: product.id,
        description: product.name,
        supplierProductId: product.id,
        oldPriceCents: product.unitPriceCents,
        newPriceCents: args.newPriceCents,
      },
    ],
    affectedRecipeCount: new Set(recipeRows.map((r) => r.recipeId)).size,
  };
}

async function propagateIngredientCost(
  ctx: RequestAuthContext,
  args: {
    ingredientId: string;
    unitPriceCents: number;
    propagate: boolean;
  },
): Promise<number> {
  if (!args.propagate) return 0;

  await ctx.appDb.admin
    .update(ingredients)
    .set({
      bestSupplierCostCents: args.unitPriceCents,
      costPerUnitCents: args.unitPriceCents,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(ingredients.id, args.ingredientId));

  return recomputeRecipesForIngredient(ctx, args.ingredientId);
}

export const supplierProductsService = {
  async listForSupplier(
    ctx: RequestAuthContext,
    args: {
      organisationSlug: string;
      venueSlug: string;
      supplierId: string;
      search?: string;
    },
  ): Promise<{ products: SupplierProductSummary[] }> {
    const scope = await resolveScope(ctx, args.organisationSlug, args.venueSlug);

    const supplier = await ctx.appDb.rls((tx) =>
      suppliersRepo.getSupplierById(tx, {
        organisationId: scope.organisationId,
        venueId: scope.venueId,
        supplierId: args.supplierId,
      }),
    );
    if (!supplier) throw new SupplierProductsServiceError(404, "Supplier not found");

    const rows = await ctx.appDb.rls((tx) =>
      supplierProductsRepo.listForSupplier(tx, {
        organisationId: scope.organisationId,
        venueId: scope.venueId,
        supplierId: args.supplierId,
        search: args.search,
      }),
    );

    const ingredientIds = rows
      .map((r) => r.ingredientId)
      .filter((id): id is string => Boolean(id));
    const ingredientNames = await loadIngredientNames(ctx, ingredientIds);

    return { products: rows.map((r) => toSummary(r, ingredientNames)) };
  },

  async getById(
    ctx: RequestAuthContext,
    args: {
      organisationSlug: string;
      venueSlug: string;
      supplierId: string;
      productId: string;
    },
  ): Promise<SupplierProductDetail | null> {
    const scope = await resolveScope(ctx, args.organisationSlug, args.venueSlug);

    const row = await ctx.appDb.rls((tx) =>
      supplierProductsRepo.getById(tx, {
        organisationId: scope.organisationId,
        venueId: scope.venueId,
        productId: args.productId,
      }),
    );
    if (!row || row.supplierId !== args.supplierId) return null;

    const ingredientNames = row.ingredientId
      ? await loadIngredientNames(ctx, [row.ingredientId])
      : new Map<string, string>();

    const history = await ctx.appDb.rls((tx) =>
      supplierProductsRepo.listPriceHistory(tx, {
        organisationId: scope.organisationId,
        productId: args.productId,
      }),
    );

    return {
      ...toSummary(row, ingredientNames),
      priceHistory: history.map((h) => ({
        id: h.id,
        oldPriceCents: h.oldPriceCents,
        newPriceCents: h.newPriceCents,
        source: h.source,
        sourceRef: h.sourceRef,
        changedAt: h.changedAt,
      })),
    };
  },

  async create(
    ctx: RequestAuthContext,
    args: {
      organisationSlug: string;
      venueSlug: string;
      supplierId: string;
      input: UpsertSupplierProductInput;
    },
  ): Promise<SupplierProductSummary> {
    const scope = await resolveScope(ctx, args.organisationSlug, args.venueSlug);
    const name = args.input.name.trim();
    if (!name) throw new SupplierProductsServiceError(400, "Product name is required");

    const supplier = await ctx.appDb.rls((tx) =>
      suppliersRepo.getSupplierById(tx, {
        organisationId: scope.organisationId,
        venueId: scope.venueId,
        supplierId: args.supplierId,
      }),
    );
    if (!supplier) throw new SupplierProductsServiceError(404, "Supplier not found");

    const packUnit = assertPackUnit(args.input.packUnit ?? "each");
    const unitsPerPack = Math.max(0.001, Number(args.input.unitsPerPack ?? 1));
    const unitPriceCents = Math.max(0, Math.round(args.input.unitPriceCents));
    const ingredientId = args.input.ingredientId ?? null;

    const created = await ctx.appDb.rls(async (tx) => {
      const row = await supplierProductsRepo.createProduct(tx, {
        organisationId: scope.organisationId,
        venueId: supplier.venueId,
        supplierId: args.supplierId,
        ingredientId,
        name,
        skuCode: args.input.skuCode?.trim() || null,
        packLabel: args.input.packLabel?.trim() || "each",
        unitsPerPack: String(unitsPerPack),
        packUnit,
        unitPriceCents,
        isActiveForIngredient: false,
        createdBy: ctx.userId,
        updatedBy: ctx.userId,
      });

      await supplierProductsRepo.insertPriceHistory(tx, {
        organisationId: scope.organisationId,
        supplierProductId: row.id,
        oldPriceCents: null,
        newPriceCents: unitPriceCents,
        source: "manual_edit",
        changedByUserId: ctx.userId,
      });

      if (ingredientId) {
        const activeProducts = await tx
          .select({ id: supplierProducts.id })
          .from(supplierProducts)
          .where(
            and(
              eq(supplierProducts.organisationId, scope.organisationId),
              eq(supplierProducts.ingredientId, ingredientId),
              eq(supplierProducts.isActiveForIngredient, true),
              isNull(supplierProducts.archivedAt),
            ),
          )
          .limit(1);

        const shouldActivate =
          args.input.makeActive === true ||
          (args.input.makeActive !== false && activeProducts.length === 0);

        if (shouldActivate) {
          await supplierProductsRepo.setActiveForIngredient(tx, {
            organisationId: scope.organisationId,
            productId: row.id,
            ingredientId,
          });
          row.isActiveForIngredient = true;
        }
      }

      return row;
    });

    const ingredientNames = ingredientId
      ? await loadIngredientNames(ctx, [ingredientId])
      : new Map<string, string>();

    if (created.isActiveForIngredient && ingredientId) {
      await propagateIngredientCost(ctx, {
        ingredientId,
        unitPriceCents,
        propagate: true,
      });
    }

    return toSummary(created, ingredientNames);
  },

  async update(
    ctx: RequestAuthContext,
    args: {
      organisationSlug: string;
      venueSlug: string;
      supplierId: string;
      productId: string;
      input: UpsertSupplierProductInput;
      propagateCost?: boolean;
    },
  ): Promise<SupplierProductDetail | null> {
    const scope = await resolveScope(ctx, args.organisationSlug, args.venueSlug);

    const updated = await ctx.appDb.rls(async (tx) => {
      const existing = await supplierProductsRepo.getById(tx, {
        organisationId: scope.organisationId,
        venueId: scope.venueId,
        productId: args.productId,
      });
      if (!existing || existing.supplierId !== args.supplierId) return null;

      const name = args.input.name.trim();
      if (!name) throw new SupplierProductsServiceError(400, "Product name is required");

      const packUnit = assertPackUnit(args.input.packUnit ?? existing.packUnit);
      const unitsPerPack = Math.max(0.001, Number(args.input.unitsPerPack ?? existing.unitsPerPack));
      const unitPriceCents = Math.max(0, Math.round(args.input.unitPriceCents));
      const ingredientId =
        args.input.ingredientId !== undefined ? args.input.ingredientId : existing.ingredientId;

      const priceChanged = existing.unitPriceCents !== unitPriceCents;

      const row = await supplierProductsRepo.updateProduct(tx, {
        organisationId: scope.organisationId,
        productId: args.productId,
        row: {
          name,
          skuCode: args.input.skuCode?.trim() || null,
          packLabel: args.input.packLabel?.trim() || existing.packLabel,
          unitsPerPack: String(unitsPerPack),
          packUnit,
          unitPriceCents,
          ingredientId,
          updatedBy: ctx.userId,
        },
      });
      if (!row) return null;

      if (priceChanged) {
        await supplierProductsRepo.insertPriceHistory(tx, {
          organisationId: scope.organisationId,
          supplierProductId: args.productId,
          oldPriceCents: existing.unitPriceCents,
          newPriceCents: unitPriceCents,
          source: "manual_edit" satisfies PriceHistorySource,
          changedByUserId: ctx.userId,
        });
      }

      if (ingredientId && args.input.makeActive) {
        await supplierProductsRepo.setActiveForIngredient(tx, {
          organisationId: scope.organisationId,
          productId: args.productId,
          ingredientId,
        });
        row.isActiveForIngredient = true;
      }

      return { row, priceChanged, ingredientId };
    });

    if (!updated) return null;

    if (
      updated.priceChanged &&
      updated.row.isActiveForIngredient &&
      updated.ingredientId &&
      args.propagateCost !== false
    ) {
      await propagateIngredientCost(ctx, {
        ingredientId: updated.ingredientId,
        unitPriceCents: updated.row.unitPriceCents,
        propagate: true,
      });
    }

    return supplierProductsService.getById(ctx, {
      organisationSlug: args.organisationSlug,
      venueSlug: args.venueSlug,
      supplierId: args.supplierId,
      productId: args.productId,
    });
  },

  async makeActive(
    ctx: RequestAuthContext,
    args: {
      organisationSlug: string;
      venueSlug: string;
      supplierId: string;
      productId: string;
      propagateCost?: boolean;
    },
  ): Promise<SupplierProductSummary | null> {
    const scope = await resolveScope(ctx, args.organisationSlug, args.venueSlug);

    const result = await ctx.appDb.rls(async (tx) => {
      const product = await supplierProductsRepo.getById(tx, {
        organisationId: scope.organisationId,
        venueId: scope.venueId,
        productId: args.productId,
      });
      if (!product || product.supplierId !== args.supplierId) return null;
      if (!product.ingredientId) {
        throw new SupplierProductsServiceError(
          400,
          "Map this product to an ingredient before making it active",
        );
      }

      await supplierProductsRepo.setActiveForIngredient(tx, {
        organisationId: scope.organisationId,
        productId: args.productId,
        ingredientId: product.ingredientId,
      });

      return product;
    });

    if (!result?.ingredientId) return null;

    if (args.propagateCost !== false) {
      await propagateIngredientCost(ctx, {
        ingredientId: result.ingredientId,
        unitPriceCents: result.unitPriceCents,
        propagate: true,
      });
    }

    const ingredientNames = await loadIngredientNames(ctx, [result.ingredientId]);
    return toSummary({ ...result, isActiveForIngredient: true }, ingredientNames);
  },

  async archive(
    ctx: RequestAuthContext,
    args: {
      organisationSlug: string;
      venueSlug: string;
      supplierId: string;
      productId: string;
    },
  ): Promise<boolean> {
    const scope = await resolveScope(ctx, args.organisationSlug, args.venueSlug);

    return ctx.appDb.rls(async (tx) => {
      const product = await supplierProductsRepo.getById(tx, {
        organisationId: scope.organisationId,
        venueId: scope.venueId,
        productId: args.productId,
      });
      if (!product || product.supplierId !== args.supplierId) return false;

      if (product.isActiveForIngredient && product.ingredientId) {
        await tx
          .update(ingredients)
          .set({ activeSupplierProductId: null, updatedAt: new Date().toISOString() })
          .where(eq(ingredients.id, product.ingredientId));
      }

      return supplierProductsRepo.archiveProduct(tx, {
        organisationId: scope.organisationId,
        productId: args.productId,
      });
    });
  },

  buildCostChangePreview: buildProductCostChangePreview,
};
