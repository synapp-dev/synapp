import { and, eq, isNull } from "drizzle-orm";

import type { RequestAuthContext } from "@/server/auth/context";
import type { RlsTx } from "@/server/db/drizzle";
import { AuthError } from "@/server/auth/errors";
import { resolveVenueScopeForService } from "@/server/access/require-venue-scope";
import { assertInventorySetupWriteAccess } from "@/server/inventory-setup/inventory-setup-auth";
import { classifyRawItemBucket } from "@/server/inventory-normalisation/classify-raw-item-bucket";
import {
  attachSimilarPendingItems,
  descriptionsLikelySameProduct,
} from "@/server/inventory-normalisation/find-similar-pending-raw-items";
import type { SimilarPendingRawItem } from "@/server/inventory-normalisation/find-similar-pending-raw-items";
import {
  extractPackHint,
  type PackHint,
} from "@/server/inventory-normalisation/extract-pack-hint";
import { computeCostPerBaseUnitCents } from "@/server/inventory-normalisation/compute-cost-per-base-unit";
import {
  normaliseCommitBodySchema,
  normalisationSuggestionSchema,
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
  /** How many quantity-variant raw items were folded into the same product. */
  cascadedCount: number;
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

/**
 * The per-portion pack size for a raw item, read off invoice wording like
 * "(150 pieces @160g)". Scans this item plus its quantity variants (same product,
 * different invoice wording) so a "@160g" written on any one variant seeds the
 * answer — even when normalising the bare product line that omits it. Shared by
 * `suggest` (seeds the LLM) and `commit` (persists it onto the product).
 */
async function derivePackHintForRawItem(
  tx: RlsTx,
  args: {
    organisationId: string;
    rawItem: { id: string; supplierId: string; rawDescription: string };
  },
): Promise<PackHint | null> {
  const supplierItems = await supplierRawItemsRepo.listForSupplier(tx, {
    organisationId: args.organisationId,
    supplierId: args.rawItem.supplierId,
  });
  const groupDescriptions = [
    args.rawItem.rawDescription,
    ...supplierItems
      .filter(
        (item) =>
          item.id !== args.rawItem.id &&
          descriptionsLikelySameProduct(
            item.rawDescription,
            args.rawItem.rawDescription,
          ),
      )
      .map((item) => item.rawDescription),
  ];
  return extractPackHint(groupDescriptions);
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

    // Reuse a stored suggestion (survives reloads) unless the user asked to retry.
    if (!parsed.data.regenerate) {
      const cached = await ctx.appDb.rls((tx) =>
        supplierRawItemsRepo.getStoredSuggestion(tx, {
          organisationId: scope.organisationId,
          rawItemId: rawItem.id,
        }),
      );
      if (cached) {
        const reParsed = normalisationSuggestionSchema.safeParse(cached);
        if (reParsed.success) {
          console.info("[inventory-normalisation] suggest_cache_hit", {
            rawItemId: rawItem.id,
          });
          return reParsed.data;
        }
      }
    }

    console.info("[inventory-normalisation] suggest_started", {
      rawItemId: rawItem.id,
      venueId: scope.venueId,
    });

    const packHint = await ctx.appDb.rls((tx) =>
      derivePackHintForRawItem(tx, {
        organisationId: scope.organisationId,
        rawItem,
      }),
    );

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
        vary: parsed.data.regenerate ?? false,
      });

      console.info("[inventory-normalisation] suggest_completed", {
        rawItemId: rawItem.id,
        confidence: suggestion.confidence,
        likelyNonInventory: suggestion.likelyNonInventory,
      });

      // Cache it on the raw item so a reload doesn't re-hit the LLM.
      await ctx.appDb.rls((tx) =>
        supplierRawItemsRepo.setStoredSuggestion(tx, {
          organisationId: scope.organisationId,
          rawItemId: rawItem.id,
          suggestion,
        }),
      );

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

      // Wording-drift twins folded onto this product (alsoRawItemIds minus any
      // claimed as their own pack) may carry a newer invoice than the base line.
      // When the user kept the detected base price (didn't type their own), seed
      // the product from the NEWEST invoice across base + twins, so a stale base
      // line can't underprice the catalog — e.g. eggs invoiced as "pack" $36.16
      // in May then "box" $39.55 in June are one product whose price rose.
      const additionalPackIdSet = new Set(
        (input.additionalPacks ?? []).map((p) => p.rawItemId),
      );
      const foldableIds = (input.alsoRawItemIds ?? []).filter(
        (id) => id !== rawItem.id && !additionalPackIdSet.has(id),
      );
      let effectiveUnitPriceCents = unitPriceCents;
      if (
        foldableIds.length > 0 &&
        rawItem.lastUnitPriceCents != null &&
        unitPriceCents === rawItem.lastUnitPriceCents
      ) {
        const dated = await supplierRawItemsRepo.listInvoiceDatedPricesByIds(tx, {
          organisationId: scope.organisationId,
          supplierId: rawItem.supplierId,
          rawItemIds: [rawItem.id, ...foldableIds],
        });
        const base = dated.find((d) => d.rawItemId === rawItem.id);
        let newest: (typeof dated)[number] | null = null;
        for (const candidate of dated) {
          if (!newest || Date.parse(candidate.invoiceDate) > Date.parse(newest.invoiceDate)) {
            newest = candidate;
          }
        }
        if (
          newest &&
          newest.rawItemId !== rawItem.id &&
          (!base || Date.parse(newest.invoiceDate) > Date.parse(base.invoiceDate))
        ) {
          effectiveUnitPriceCents = newest.priceCents;
        }
      }
      const { costPerBaseUnitCents: effectiveCostPerBaseUnitCents } =
        computeCostPerBaseUnitCents({
          unitPriceCents: effectiveUnitPriceCents,
          unitsPerPack,
          packUnit,
        });

      let ingredientId: string;

      if (input.mode === "create") {
        const created = await ingredientsRepo.createIngredient(tx, {
          organisationId: scope.organisationId,
          venueId: scope.venueId,
          name: input.ingredient.name.trim(),
          category: input.ingredient.category,
          unit: input.ingredient.unit.trim(),
          costPerUnitCents:
            input.ingredient.costPerUnitCents ?? effectiveCostPerBaseUnitCents,
          bestSupplierCostCents: effectiveCostPerBaseUnitCents,
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

      // Per-piece size (e.g. a 160 g fillet sold by the kg). Prefer the value the
      // user confirmed in the wizard; otherwise derive it from invoice wording
      // ("@160g"). Omitted (not nulled) when neither has one, so a later edit isn't
      // clobbered by a non-portioned line.
      let portionFields: {
        portionSize?: string;
        portionUnit?: string;
        portionLabel?: string;
      };
      if (
        input.supplierProduct.portionSize != null &&
        input.supplierProduct.portionUnit != null
      ) {
        portionFields = {
          portionSize: String(input.supplierProduct.portionSize),
          portionUnit: input.supplierProduct.portionUnit,
          portionLabel: input.supplierProduct.portionLabel ?? "piece",
        };
      } else {
        const packHint = await derivePackHintForRawItem(tx, {
          organisationId: scope.organisationId,
          rawItem,
        });
        portionFields = packHint
          ? {
              portionSize: String(packHint.unitsPerPack),
              portionUnit: packHint.packUnit,
              portionLabel: packHint.packLabel,
            }
          : {};
      }

      const productPayload = {
        name: input.supplierProduct.name.trim(),
        skuCode: input.supplierProduct.skuCode?.trim() || null,
        packLabel: input.supplierProduct.packLabel.trim() || "each",
        unitsPerPack: String(unitsPerPack),
        packUnit,
        unitPriceCents: effectiveUnitPriceCents,
        ingredientId,
        ...portionFields,
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

        if (beforeUpdate.unitPriceCents !== effectiveUnitPriceCents) {
          await supplierProductsRepo.insertPriceHistory(tx, {
            organisationId: scope.organisationId,
            supplierProductId: productId,
            oldPriceCents: beforeUpdate.unitPriceCents,
            newPriceCents: effectiveUnitPriceCents,
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
          portionSize: portionFields.portionSize ?? null,
          portionUnit: portionFields.portionUnit ?? null,
          portionLabel: portionFields.portionLabel ?? null,
          isActiveForIngredient: false,
          createdBy: ctx.userId,
          updatedBy: ctx.userId,
        });
        productId = productRow.id;
        await supplierProductsRepo.insertPriceHistory(tx, {
          organisationId: scope.organisationId,
          supplierProductId: productId,
          oldPriceCents: null,
          newPriceCents: effectiveUnitPriceCents,
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
            costPerUnitCents: effectiveCostPerBaseUnitCents,
          });
        }
      }

      await supplierRawItemsRepo.update(tx, {
        rawItemId: rawItem.id,
        patch: {
          normalisationStatus: "normalised",
          supplierProductId: productId,
          // Normalising is the review decision — stamp it if the supplier stage
          // hasn't, so this row qualifies for re-import price propagation.
          ...(rawItem.reviewedAt
            ? {}
            : { reviewedAt: new Date().toISOString(), reviewedBy: ctx.userId }),
          updatedBy: ctx.userId,
        },
      });

      // Extra pack representations of the same ingredient (e.g. "bag" alongside
      // the base "each"). Each becomes its own supplier_product linked to its own
      // raw item, so both pricings are kept; the base product stays the active
      // costing source. Their raw items are excluded from the base cascade below.
      const additionalPacks = (input.additionalPacks ?? []).filter(
        (p) => p.rawItemId !== rawItem.id,
      );
      const additionalProductIds: string[] = [];
      for (const pack of additionalPacks) {
        const packRawItem = await supplierRawItemsRepo.findByIdForOrganisation(tx, {
          organisationId: scope.organisationId,
          venueId: scope.venueId,
          rawItemId: pack.rawItemId,
        });
        if (!packRawItem || packRawItem.supplierId !== rawItem.supplierId) {
          continue;
        }

        let packPortion: {
          portionSize?: string;
          portionUnit?: string;
          portionLabel?: string;
        };
        if (
          pack.supplierProduct.portionSize != null &&
          pack.supplierProduct.portionUnit != null
        ) {
          packPortion = {
            portionSize: String(pack.supplierProduct.portionSize),
            portionUnit: pack.supplierProduct.portionUnit,
            portionLabel: pack.supplierProduct.portionLabel ?? "piece",
          };
        } else {
          const hint = await derivePackHintForRawItem(tx, {
            organisationId: scope.organisationId,
            rawItem: packRawItem,
          });
          packPortion = hint
            ? {
                portionSize: String(hint.unitsPerPack),
                portionUnit: hint.packUnit,
                portionLabel: hint.packLabel,
              }
            : {};
        }

        // Reuse an existing product if this raw item is already linked to one for
        // the same supplier; otherwise create a fresh (non-active) pack product.
        let packProductId = packRawItem.supplierProductId;
        if (packProductId) {
          const existingPackProduct = await supplierProductsRepo.getById(tx, {
            organisationId: scope.organisationId,
            venueId: scope.venueId,
            productId: packProductId,
          });
          if (!existingPackProduct || existingPackProduct.supplierId !== rawItem.supplierId) {
            packProductId = null;
          }
        }

        const packBasePayload = {
          name: pack.supplierProduct.name.trim(),
          skuCode: pack.supplierProduct.skuCode?.trim() || null,
          packLabel: pack.supplierProduct.packLabel.trim() || "each",
          unitsPerPack: String(pack.supplierProduct.unitsPerPack),
          packUnit: pack.supplierProduct.packUnit,
          unitPriceCents: pack.supplierProduct.unitPriceCents,
        };

        if (packProductId) {
          const before = await supplierProductsRepo.getById(tx, {
            organisationId: scope.organisationId,
            venueId: scope.venueId,
            productId: packProductId,
          });
          await supplierProductsRepo.updateProduct(tx, {
            organisationId: scope.organisationId,
            productId: packProductId,
            row: {
              ...packBasePayload,
              ingredientId,
              ...packPortion,
              updatedBy: ctx.userId,
              updatedAt: new Date().toISOString(),
            },
          });
          if (before && before.unitPriceCents !== pack.supplierProduct.unitPriceCents) {
            await supplierProductsRepo.insertPriceHistory(tx, {
              organisationId: scope.organisationId,
              supplierProductId: packProductId,
              oldPriceCents: before.unitPriceCents,
              newPriceCents: pack.supplierProduct.unitPriceCents,
              source: "manual_edit",
              changedByUserId: ctx.userId,
            });
          }
        } else {
          const packProductRow = await supplierProductsRepo.createProduct(tx, {
            organisationId: scope.organisationId,
            venueId: scope.venueId,
            supplierId: rawItem.supplierId,
            ingredientId,
            name: packBasePayload.name,
            skuCode: packBasePayload.skuCode,
            packLabel: packBasePayload.packLabel,
            unitsPerPack: packBasePayload.unitsPerPack,
            packUnit: packBasePayload.packUnit,
            unitPriceCents: packBasePayload.unitPriceCents,
            portionSize: packPortion.portionSize ?? null,
            portionUnit: packPortion.portionUnit ?? null,
            portionLabel: packPortion.portionLabel ?? null,
            isActiveForIngredient: false,
            createdBy: ctx.userId,
            updatedBy: ctx.userId,
          });
          packProductId = packProductRow.id;
          await supplierProductsRepo.insertPriceHistory(tx, {
            organisationId: scope.organisationId,
            supplierProductId: packProductId,
            oldPriceCents: null,
            newPriceCents: pack.supplierProduct.unitPriceCents,
            source: "manual_edit",
            changedByUserId: ctx.userId,
          });
        }

        await supplierRawItemsRepo.update(tx, {
          rawItemId: packRawItem.id,
          patch: {
            normalisationStatus: "normalised",
            supplierProductId: packProductId,
            ...(packRawItem.reviewedAt
              ? {}
              : { reviewedAt: new Date().toISOString(), reviewedBy: ctx.userId }),
            updatedBy: ctx.userId,
          },
        });
        additionalProductIds.push(packProductId);
      }

      // Fold this product's other quantity variants into the same product, so the
      // user normalises "Breast Fillet" once, not once per pack size. Raw items
      // claimed as their own pack above are excluded so they keep their pricing.
      // (foldableIds — computed up top — already excludes the base and the packs;
      // it also drove the newest-invoice price seeding above.)
      const cascaded = await supplierRawItemsRepo.markNormalisedForProduct(tx, {
        organisationId: scope.organisationId,
        supplierId: rawItem.supplierId,
        rawItemIds: foldableIds,
        supplierProductId: productId,
        userId: ctx.userId,
      });

      return {
        rawItemId: rawItem.id,
        ingredientId,
        supplierProductId: productId,
        normalisationStatus: "normalised" as const,
        cascadedCount: cascaded + additionalProductIds.length,
      };
    });

    console.info("[inventory-normalisation] committed", {
      rawItemId: result.rawItemId,
      ingredientId: result.ingredientId,
      supplierProductId: result.supplierProductId,
      mode: parsed.data.mode,
      cascadedCount: result.cascadedCount,
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

  /**
   * What a normalised raw item became: its supplier product + master
   * ingredient. Read-only — feeds the wizard's review pass.
   */
  async mapping(
    ctx: RequestAuthContext,
    args: {
      organisationSlug: string;
      venueSlug: string;
      rawItemId: string;
    },
  ): Promise<{
    rawDescription: string;
    rawUnit: string | null;
    lastUnitPriceCents: number | null;
    product: {
      name: string;
      packLabel: string;
      unitsPerPack: string;
      packUnit: string;
      unitPriceCents: number;
    } | null;
    ingredient: {
      id: string;
      name: string;
      unit: string;
      category: string;
      costPerUnitCents: number;
      currentStockLevel: number;
    } | null;
  }> {
    const scope = await resolveScope(ctx, args.organisationSlug, args.venueSlug);

    return ctx.appDb.rls(async (tx) => {
      const rawItem = await supplierRawItemsRepo.findByIdForOrganisation(tx, {
        organisationId: scope.organisationId,
        venueId: scope.venueId,
        rawItemId: args.rawItemId,
      });
      if (!rawItem) {
        throw new InventoryNormalisationServiceError(404, "Raw item not found");
      }

      const product = rawItem.supplierProductId
        ? await supplierProductsRepo.getById(tx, {
            organisationId: scope.organisationId,
            venueId: scope.venueId,
            productId: rawItem.supplierProductId,
          })
        : null;

      const ingredient = product?.ingredientId
        ? await ingredientsRepo.getIngredientById(tx, {
            organisationId: scope.organisationId,
            venueId: scope.venueId,
            ingredientId: product.ingredientId,
          })
        : null;

      return {
        rawDescription: rawItem.rawDescription,
        rawUnit: rawItem.rawUnit,
        lastUnitPriceCents: rawItem.lastUnitPriceCents,
        product: product
          ? {
              name: product.name,
              packLabel: product.packLabel,
              unitsPerPack: String(product.unitsPerPack),
              packUnit: product.packUnit,
              unitPriceCents: product.unitPriceCents,
            }
          : null,
        ingredient: ingredient
          ? {
              id: ingredient.id,
              name: ingredient.name,
              unit: ingredient.unit,
              category: ingredient.category,
              costPerUnitCents: ingredient.costPerUnitCents,
              currentStockLevel: Number(ingredient.currentStockLevel ?? 0),
            }
          : null,
      };
    });
  },
};
