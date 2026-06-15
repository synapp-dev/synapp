import { and, eq, isNull } from "drizzle-orm";

import type { RequestAuthContext } from "@/server/auth/context";
import { AuthError } from "@/server/auth/errors";
import { resolveVenueScopeForService } from "@/server/access/require-venue-scope";
import { assertInventorySetupWriteAccess } from "@/server/inventory-setup/inventory-setup-auth";
import { classifyRawItemBucket } from "@/server/inventory-normalisation/classify-raw-item-bucket";
import {
  attachSimilarPendingItems,
  descriptionsLikelySameProduct,
} from "@/server/inventory-normalisation/find-similar-pending-raw-items";
import type { SimilarPendingRawItem } from "@/server/inventory-normalisation/find-similar-pending-raw-items";
import { extractPackHint } from "@/server/inventory-normalisation/extract-pack-hint";
import { computeCostPerBaseUnitCents } from "@/server/inventory-normalisation/compute-cost-per-base-unit";
import {
  normaliseCommitBodySchema,
  suggestNormalisationBodySchema,
  type NormalisationSuggestion,
  type NormaliseCommitInput,
} from "@/server/inventory-normalisation/inventory-normalisation.schemas";
import {
  suggestNormalisationForRawItem,
  SuggestUnavailableError,
} from "@/server/inventory-normalisation/normalisation-suggest.service";
import { ingredientsRepo } from "@/server/ingredients/ingredients.repo";
import { supplierProductsRepo } from "@/server/supplier-products/supplier-products.repo";
import { supplierRawItemsRepo } from "@/server/supplier-raw-items/supplier-raw-items.repo";
import { supplierProducts } from "@/server/db/schema";

export type NormalisationQueueItem = {
  id: string;
  supplierId: string;
  supplierName: string;
  rawDescription: string;
  rawUnit: string | null;
  lastQuantity: number | null;
  lastUnitPriceCents: number | null;
  lastLineTotalCents: number | null;
  source: string;
  normalisationStatus: string;
  supplierProductId: string | null;
  lastSeenAt: string;
  bucket: "main" | "likely_non_inventory";
  similarPendingItems: SimilarPendingRawItem[];
};

export type NormalisationQueueResponse = {
  items: NormalisationQueueItem[];
  counts: {
    pending: number;
    normalised: number;
    skipped: number;
    actioned: number;
    total: number;
  };
};

export type NormaliseCommitResult = {
  rawItemId: string;
  ingredientId: string;
  supplierProductId: string;
  normalisationStatus: "normalised";
};

export class InventoryNormalisationServiceError extends Error {
  status: number;
  code?: string;

  constructor(status: number, message: string, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function mapAuthError(error: unknown): never {
  if (error instanceof AuthError) {
    throw new InventoryNormalisationServiceError(error.status, error.message);
  }
  throw error;
}

async function resolveScope(
  ctx: RequestAuthContext,
  organisationSlug: string,
  venueSlug: string,
) {
  try {
    return await resolveVenueScopeForService(ctx, organisationSlug, venueSlug, {
      notFound: (message) => new InventoryNormalisationServiceError(404, message),
      forbidden: (auth) =>
        new InventoryNormalisationServiceError(auth.status, auth.message),
    });
  } catch (error) {
    mapAuthError(error);
  }
}

function mapQueueRow(
  row: Awaited<
    ReturnType<typeof supplierRawItemsRepo.listQueueForOrganisationVenue>
  >[number],
): Omit<NormalisationQueueItem, "similarPendingItems"> {
  return {
    id: row.id,
    supplierId: row.supplierId,
    supplierName: row.supplierName,
    rawDescription: row.rawDescription,
    rawUnit: row.rawUnit,
    lastQuantity: row.lastQuantity != null ? Number(row.lastQuantity) : null,
    lastUnitPriceCents: row.lastUnitPriceCents,
    lastLineTotalCents: row.lastLineTotalCents,
    source: row.source,
    normalisationStatus: row.normalisationStatus,
    supplierProductId: row.supplierProductId,
    lastSeenAt: row.lastSeenAt,
    bucket: classifyRawItemBucket({
      rawDescription: row.rawDescription,
      rawUnit: row.rawUnit,
    }),
  };
}

async function propagateIngredientCostInTx(
  tx: Parameters<typeof ingredientsRepo.updateIngredient>[0],
  args: {
    ingredientId: string;
    organisationId: string;
    venueId: string;
    costPerUnitCents: number;
  },
): Promise<void> {
  await ingredientsRepo.updateIngredient(tx, {
    organisationId: args.organisationId,
    venueId: args.venueId,
    ingredientId: args.ingredientId,
    row: {
      costPerUnitCents: args.costPerUnitCents,
      bestSupplierCostCents: args.costPerUnitCents,
      updatedAt: new Date().toISOString(),
    },
  });
}

export const inventoryNormalisationService = {
  async getQueue(
    ctx: RequestAuthContext,
    args: {
      organisationSlug: string;
      venueSlug: string;
      search?: string;
    },
  ): Promise<NormalisationQueueResponse> {
    const scope = await resolveScope(ctx, args.organisationSlug, args.venueSlug);

    const [rows, statusCounts] = await ctx.appDb.rls(async (tx) => {
      const queueRows = await supplierRawItemsRepo.listQueueForOrganisationVenue(tx, {
        organisationId: scope.organisationId,
        venueId: scope.venueId,
        search: args.search,
      });
      const counts = await supplierRawItemsRepo.countByStatusForOrganisationVenue(tx, {
        organisationId: scope.organisationId,
        venueId: scope.venueId,
      });
      return [queueRows, counts] as const;
    });

    const items = attachSimilarPendingItems(rows.map(mapQueueRow));
    const total = statusCounts.pending + statusCounts.normalised + statusCounts.skipped;

    console.info("[inventory-normalisation] queue_loaded", {
      venueId: scope.venueId,
      pending: statusCounts.pending,
      skipped: statusCounts.skipped,
      normalised: statusCounts.normalised,
    });

    return {
      items,
      counts: {
        pending: statusCounts.pending,
        normalised: statusCounts.normalised,
        skipped: statusCounts.skipped,
        actioned: statusCounts.normalised + statusCounts.skipped,
        total,
      },
    };
  },

  async suggest(
    ctx: RequestAuthContext,
    args: {
      organisationSlug: string;
      venueSlug: string;
      body: unknown;
    },
  ): Promise<NormalisationSuggestion> {
    const scope = await resolveScope(ctx, args.organisationSlug, args.venueSlug);
    assertInventorySetupWriteAccess(ctx.tenantRoles, {
      organisationId: scope.organisationId,
      venueId: scope.venueId,
    });

    const parsed = suggestNormalisationBodySchema.safeParse(args.body);
    if (!parsed.success) {
      throw new InventoryNormalisationServiceError(400, "Invalid request body");
    }

    const rawItem = await ctx.appDb.rls((tx) =>
      supplierRawItemsRepo.findByIdForOrganisation(tx, {
        organisationId: scope.organisationId,
        venueId: scope.venueId,
        rawItemId: parsed.data.rawItemId,
      }),
    );
    if (!rawItem) {
      throw new InventoryNormalisationServiceError(404, "Raw item not found");
    }

    console.info("[inventory-normalisation] suggest_started", {
      rawItemId: rawItem.id,
      venueId: scope.venueId,
    });

    // Gather this product's quantity variants so a pack size ("@160g") written
    // on any one of them seeds the suggestion — even when normalising the bare
    // product line that omits it.
    const supplierItems = await ctx.appDb.rls((tx) =>
      supplierRawItemsRepo.listForSupplier(tx, {
        organisationId: scope.organisationId,
        supplierId: rawItem.supplierId,
      }),
    );
    const groupDescriptions = [
      rawItem.rawDescription,
      ...supplierItems
        .filter(
          (item) =>
            item.id !== rawItem.id &&
            descriptionsLikelySameProduct(item.rawDescription, rawItem.rawDescription),
        )
        .map((item) => item.rawDescription),
    ];
    const packHint = extractPackHint(groupDescriptions);

    try {
      const suggestion = await suggestNormalisationForRawItem({
        rawDescription: rawItem.rawDescription,
        rawUnit: rawItem.rawUnit,
        supplierName: rawItem.supplierName,
        lastUnitPriceCents: rawItem.lastUnitPriceCents,
        lastLineTotalCents: rawItem.lastLineTotalCents,
        lastQuantity:
          rawItem.lastQuantity != null ? Number(rawItem.lastQuantity) : null,
        packHint,
      });

      console.info("[inventory-normalisation] suggest_completed", {
        rawItemId: rawItem.id,
        confidence: suggestion.confidence,
        likelyNonInventory: suggestion.likelyNonInventory,
      });

      return suggestion;
    } catch (error) {
      console.warn("[inventory-normalisation] suggest_failed", {
        rawItemId: rawItem.id,
        reason: error instanceof Error ? error.message : "unknown",
      });

      if (error instanceof SuggestUnavailableError) {
        throw new InventoryNormalisationServiceError(
          503,
          error.message,
          "suggest_unavailable",
        );
      }
      throw new InventoryNormalisationServiceError(
        503,
        "Suggestion failed — enter details manually",
        "suggest_unavailable",
      );
    }
  },

  async commit(
    ctx: RequestAuthContext,
    args: {
      organisationSlug: string;
      venueSlug: string;
      body: unknown;
    },
  ): Promise<NormaliseCommitResult> {
    const scope = await resolveScope(ctx, args.organisationSlug, args.venueSlug);
    assertInventorySetupWriteAccess(ctx.tenantRoles, {
      organisationId: scope.organisationId,
      venueId: scope.venueId,
    });

    const parsed = normaliseCommitBodySchema.safeParse(args.body);
    if (!parsed.success) {
      throw new InventoryNormalisationServiceError(400, "Invalid request body");
    }

    const input: NormaliseCommitInput = parsed.data;
    const packUnit = input.supplierProduct.packUnit;
    const unitsPerPack = input.supplierProduct.unitsPerPack;
    const unitPriceCents = input.supplierProduct.unitPriceCents;

    const { costPerBaseUnitCents } = computeCostPerBaseUnitCents({
      unitPriceCents,
      unitsPerPack,
      packUnit,
    });

    const result = await ctx.appDb.rls(async (tx) => {
      const rawItem = await supplierRawItemsRepo.findByIdForOrganisation(tx, {
        organisationId: scope.organisationId,
        venueId: scope.venueId,
        rawItemId: input.rawItemId,
      });
      if (!rawItem) {
        throw new InventoryNormalisationServiceError(404, "Raw item not found");
      }

      let ingredientId: string;

      if (input.mode === "create") {
        const created = await ingredientsRepo.createIngredient(tx, {
          organisationId: scope.organisationId,
          venueId: scope.venueId,
          name: input.ingredient.name.trim(),
          category: input.ingredient.category,
          unit: input.ingredient.unit.trim(),
          costPerUnitCents:
            input.ingredient.costPerUnitCents ?? costPerBaseUnitCents,
          bestSupplierCostCents: costPerBaseUnitCents,
          currentStockLevel: String(input.ingredient.currentStockLevel ?? 0),
          status: input.ingredient.status ?? "active",
          isActive: (input.ingredient.status ?? "active") === "active",
          supplierId: input.ingredient.supplierId ?? rawItem.supplierId,
          createdBy: ctx.userId,
          updatedBy: ctx.userId,
          updatedAt: new Date().toISOString(),
        });
        ingredientId = created.id;
      } else {
        const existing = await ingredientsRepo.getIngredientById(tx, {
          organisationId: scope.organisationId,
          venueId: scope.venueId,
          ingredientId: input.ingredientId,
        });
        if (!existing) {
          throw new InventoryNormalisationServiceError(404, "Ingredient not found");
        }
        ingredientId = existing.id;
      }

      let productId = rawItem.supplierProductId;

      if (productId) {
        const existingProduct = await supplierProductsRepo.getById(tx, {
          organisationId: scope.organisationId,
          venueId: scope.venueId,
          productId,
        });
        if (!existingProduct || existingProduct.supplierId !== rawItem.supplierId) {
          productId = null;
        }
      }

      const productPayload = {
        name: input.supplierProduct.name.trim(),
        skuCode: input.supplierProduct.skuCode?.trim() || null,
        packLabel: input.supplierProduct.packLabel.trim() || "each",
        unitsPerPack: String(unitsPerPack),
        packUnit,
        unitPriceCents,
        ingredientId,
        updatedBy: ctx.userId,
        updatedAt: new Date().toISOString(),
      };

      if (productId) {
        const beforeUpdate = await supplierProductsRepo.getById(tx, {
          organisationId: scope.organisationId,
          venueId: scope.venueId,
          productId,
        });
        if (!beforeUpdate) {
          throw new InventoryNormalisationServiceError(404, "Supplier product not found");
        }

        const updated = await supplierProductsRepo.updateProduct(tx, {
          organisationId: scope.organisationId,
          productId,
          row: productPayload,
        });
        if (!updated) {
          throw new InventoryNormalisationServiceError(404, "Supplier product not found");
        }

        if (beforeUpdate.unitPriceCents !== unitPriceCents) {
          await supplierProductsRepo.insertPriceHistory(tx, {
            organisationId: scope.organisationId,
            supplierProductId: productId,
            oldPriceCents: beforeUpdate.unitPriceCents,
            newPriceCents: unitPriceCents,
            source: "manual_edit",
            changedByUserId: ctx.userId,
          });
        }
      } else {
        const productRow = await supplierProductsRepo.createProduct(tx, {
          organisationId: scope.organisationId,
          venueId: scope.venueId,
          supplierId: rawItem.supplierId,
          ingredientId,
          name: productPayload.name,
          skuCode: productPayload.skuCode,
          packLabel: productPayload.packLabel,
          unitsPerPack: productPayload.unitsPerPack,
          packUnit: productPayload.packUnit,
          unitPriceCents: productPayload.unitPriceCents,
          isActiveForIngredient: false,
          createdBy: ctx.userId,
          updatedBy: ctx.userId,
        });
        productId = productRow.id;
        await supplierProductsRepo.insertPriceHistory(tx, {
          organisationId: scope.organisationId,
          supplierProductId: productId,
          oldPriceCents: null,
          newPriceCents: unitPriceCents,
          source: "manual_edit",
          changedByUserId: ctx.userId,
        });
      }

      const makeActive = input.makeActiveSource !== false;
      if (makeActive) {
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

        if (activeProducts.length === 0 || input.makeActiveSource === true) {
          await supplierProductsRepo.setActiveForIngredient(tx, {
            organisationId: scope.organisationId,
            productId,
            ingredientId,
          });
          await propagateIngredientCostInTx(tx, {
            ingredientId,
            organisationId: scope.organisationId,
            venueId: scope.venueId,
            costPerUnitCents: costPerBaseUnitCents,
          });
        }
      }

      await supplierRawItemsRepo.update(tx, {
        rawItemId: rawItem.id,
        patch: {
          normalisationStatus: "normalised",
          supplierProductId: productId,
          updatedBy: ctx.userId,
        },
      });

      return {
        rawItemId: rawItem.id,
        ingredientId,
        supplierProductId: productId,
        normalisationStatus: "normalised" as const,
      };
    });

    console.info("[inventory-normalisation] committed", {
      rawItemId: result.rawItemId,
      ingredientId: result.ingredientId,
      supplierProductId: result.supplierProductId,
      mode: parsed.data.mode,
    });

    return result;
  },

  async skip(
    ctx: RequestAuthContext,
    args: {
      organisationSlug: string;
      venueSlug: string;
      rawItemId: string;
    },
  ): Promise<{ rawItemId: string; normalisationStatus: "skipped" }> {
    const scope = await resolveScope(ctx, args.organisationSlug, args.venueSlug);
    assertInventorySetupWriteAccess(ctx.tenantRoles, {
      organisationId: scope.organisationId,
      venueId: scope.venueId,
    });

    await ctx.appDb.rls(async (tx) => {
      const rawItem = await supplierRawItemsRepo.findByIdForOrganisation(tx, {
        organisationId: scope.organisationId,
        venueId: scope.venueId,
        rawItemId: args.rawItemId,
      });
      if (!rawItem) {
        throw new InventoryNormalisationServiceError(404, "Raw item not found");
      }

      await supplierRawItemsRepo.update(tx, {
        rawItemId: rawItem.id,
        patch: {
          normalisationStatus: "skipped",
          updatedBy: ctx.userId,
        },
      });
    });

    console.info("[inventory-normalisation] skipped", { rawItemId: args.rawItemId });

    return { rawItemId: args.rawItemId, normalisationStatus: "skipped" };
  },

  async unskip(
    ctx: RequestAuthContext,
    args: {
      organisationSlug: string;
      venueSlug: string;
      rawItemId: string;
    },
  ): Promise<{ rawItemId: string; normalisationStatus: "pending" }> {
    const scope = await resolveScope(ctx, args.organisationSlug, args.venueSlug);
    assertInventorySetupWriteAccess(ctx.tenantRoles, {
      organisationId: scope.organisationId,
      venueId: scope.venueId,
    });

    await ctx.appDb.rls(async (tx) => {
      const rawItem = await supplierRawItemsRepo.findByIdForOrganisation(tx, {
        organisationId: scope.organisationId,
        venueId: scope.venueId,
        rawItemId: args.rawItemId,
      });
      if (!rawItem) {
        throw new InventoryNormalisationServiceError(404, "Raw item not found");
      }

      await supplierRawItemsRepo.update(tx, {
        rawItemId: rawItem.id,
        patch: {
          normalisationStatus: "pending",
          updatedBy: ctx.userId,
        },
      });
    });

    return { rawItemId: args.rawItemId, normalisationStatus: "pending" };
  },
};
