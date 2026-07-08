import type { RequestAuthContext } from "@/server/auth/context";
import { AuthError } from "@/server/auth/errors";
import { resolveVenueScopeForService } from "@/server/access/require-venue-scope";
import { assertInventorySetupWriteAccess } from "@/server/inventory-setup/inventory-setup-auth";
import { suppliersRepo } from "@/server/suppliers/suppliers.repo";
import {
  normalizeRawDescription,
  normalizeRawUnit,
} from "@/server/supplier-raw-items/normalize-raw-description";
import {
  clusterRawItems,
  packsForRawItems,
  type ClusterableRawItem,
  type ReviewCluster,
} from "@/server/supplier-raw-items/review-clustering";
import {
  approveAsProductsSchema,
  approveRawItemsSchema,
  confirmItemsTriageSchema,
  createRawItemSchema,
  skipRawItemsSchema,
  updateRawItemSchema,
  type ApproveAsProductsInput,
  type ApproveRawItemsInput,
  type ConfirmItemsTriageInput,
  type CreateRawItemInput,
  type SkipRawItemsInput,
  type UpdateRawItemInput,
} from "@/server/supplier-raw-items/supplier-raw-items.schemas";
import { supplierRawItemsRepo } from "@/server/supplier-raw-items/supplier-raw-items.repo";
import { supplierProductsRepo } from "@/server/supplier-products/supplier-products.repo";
import { packToCatalogFields } from "@/server/supplier-raw-items/pack-to-product";
import { resetVenueSupplierApprovals } from "@/server/inventory-setup/inventory-setup-restart.repo";
import { parseDeliverySchedule } from "@/server/suppliers/supplier-schedule";

function rowToClusterable(row: {
  id: string;
  rawDescription: string;
  rawDescriptionNormalized: string;
  rawUnit: string | null;
  rawUnitNormalized: string;
  lastUnitPriceCents: number | null;
  lastSeenAt: string;
  isLikelyInventory: boolean | null;
  reviewedAt: string | null;
}): ClusterableRawItem {
  return {
    id: row.id,
    rawDescription: row.rawDescription,
    rawDescriptionNormalized: row.rawDescriptionNormalized,
    rawUnit: row.rawUnit,
    rawUnitNormalized: row.rawUnitNormalized,
    lastUnitPriceCents: row.lastUnitPriceCents,
    lastSeenAt: row.lastSeenAt,
    isLikelyInventory: row.isLikelyInventory,
    reviewedAt: row.reviewedAt,
  };
}

export type SupplierRawItemSummary = {
  id: string;
  supplierId: string;
  rawDescription: string;
  rawUnit: string | null;
  lastQuantity: number | null;
  lastUnitPriceCents: number | null;
  lastLineTotalCents: number | null;
  isLikelyInventory: boolean | null;
  source: string;
  normalisationStatus: string;
  reviewedAt: string | null;
  firstSeenAt: string;
  lastSeenAt: string;
  updatedAt: string;
};

export class SupplierRawItemsServiceError extends Error {
  status: number;
  existingId?: string;

  constructor(status: number, message: string, existingId?: string) {
    super(message);
    this.status = status;
    this.existingId = existingId;
  }
}

function mapAuthError(error: unknown): never {
  if (error instanceof AuthError) {
    throw new SupplierRawItemsServiceError(error.status, error.message);
  }
  throw error;
}

function mapRow(row: Awaited<ReturnType<typeof supplierRawItemsRepo.findById>>): SupplierRawItemSummary {
  if (!row) {
    throw new SupplierRawItemsServiceError(404, "Raw item not found");
  }
  return {
    id: row.id,
    supplierId: row.supplierId,
    rawDescription: row.rawDescription,
    rawUnit: row.rawUnit,
    lastQuantity: row.lastQuantity != null ? Number(row.lastQuantity) : null,
    lastUnitPriceCents: row.lastUnitPriceCents,
    lastLineTotalCents: row.lastLineTotalCents,
    isLikelyInventory: row.isLikelyInventory,
    source: row.source,
    normalisationStatus: row.normalisationStatus,
    reviewedAt: row.reviewedAt,
    firstSeenAt: row.firstSeenAt,
    lastSeenAt: row.lastSeenAt,
    updatedAt: row.updatedAt,
  };
}

async function resolveScope(
  ctx: RequestAuthContext,
  organisationSlug: string,
  venueSlug: string,
) {
  try {
    return await resolveVenueScopeForService(ctx, organisationSlug, venueSlug, {
      notFound: (message) => new SupplierRawItemsServiceError(404, message),
      forbidden: (auth) => new SupplierRawItemsServiceError(auth.status, auth.message),
    });
  } catch (error) {
    mapAuthError(error);
  }
}

async function assertSupplierInScope(
  ctx: RequestAuthContext,
  args: {
    organisationId: string;
    venueId: string;
    supplierId: string;
  },
) {
  const supplier = await ctx.appDb.rls((tx) =>
    suppliersRepo.getSupplierById(tx, {
      organisationId: args.organisationId,
      venueId: args.venueId,
      supplierId: args.supplierId,
    }),
  );
  if (!supplier) {
    throw new SupplierRawItemsServiceError(404, "Supplier not found");
  }
}

/** One invoice a raw item was seen on (for the Items "Invoice (N)" source dialog). */
export type SupplierRawItemSource = {
  invoiceId: string;
  invoiceNumber: string | null;
  invoiceDate: string | null;
  parsed: boolean;
};

/** A single observed price for a review product, newest first in the list. */
export type SupplierReviewPricePoint = {
  invoiceId: string;
  date: string | null;
  unitPriceCents: number;
};

/** A clustered, pack-aware product for the wizard's item-approval flow. */
export type SupplierReviewProduct = ReviewCluster & {
  priceHistory: SupplierReviewPricePoint[];
};

const SMART_FILL_EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type SmartFillProfileFields = {
  id: string;
  abn: string | null;
  category: string;
  email: string | null;
  contactPerson: string | null;
  phone: string | null;
  paymentTerms: string | null;
  deliveryDays: string | null;
  deliverySchedule: unknown;
};

/**
 * Testing convenience: a plausible bare-minimum value for each profile field
 * the supplier readiness rules (entities/suppliers/model/supplier-readiness.ts)
 * require — so a smart-filled supplier clears "Needs attention" and the
 * wizard's mandatory-field gate. Returns null if every field is already set.
 */
function buildBareMinimumProfilePatch(
  supplier: SmartFillProfileFields,
): Record<string, string> | null {
  const isBlank = (value: string | null) => !value || value.trim().length === 0;
  const patch: Record<string, string> = {};

  if (isBlank(supplier.abn)) patch.abn = "00 000 000 000";
  if (isBlank(supplier.category) || supplier.category === "other") {
    patch.category = "produce";
  }
  if (!SMART_FILL_EMAIL_PATTERN.test((supplier.email ?? "").trim())) {
    patch.email = `orders+${supplier.id.slice(0, 8)}@example.com`;
  }
  if (isBlank(supplier.contactPerson)) patch.contactPerson = "Accounts Team";
  if (isBlank(supplier.phone)) patch.phone = "0000 000 000";
  if (isBlank(supplier.paymentTerms)) patch.paymentTerms = "Net 30";

  const hasDeliveryDay =
    parseDeliverySchedule(supplier.deliverySchedule as never).some(
      (entry) => entry.is_order_day,
    ) || !isBlank(supplier.deliveryDays);
  if (!hasDeliveryDay) patch.deliveryDays = "Weekly";

  return Object.keys(patch).length > 0 ? patch : null;
}

export const supplierRawItemsService = {
  /**
   * For each raw item of a supplier, the distinct invoices whose parsed lines
   * normalise to the same description — keyed by raw item id. Powers the Items
   * step's "Invoice (N)" source button and its related-invoices dialog.
   */
  async listSources(
    ctx: RequestAuthContext,
    args: { organisationSlug: string; venueSlug: string; supplierId: string },
  ): Promise<{ sources: Record<string, SupplierRawItemSource[]> }> {
    const scope = await resolveScope(ctx, args.organisationSlug, args.venueSlug);
    await assertSupplierInScope(ctx, {
      organisationId: scope.organisationId,
      venueId: scope.venueId,
      supplierId: args.supplierId,
    });

    const { rawItems, lines } = await ctx.appDb.rls(async (tx) => ({
      rawItems: await supplierRawItemsRepo.listForSupplier(tx, {
        organisationId: scope.organisationId,
        supplierId: args.supplierId,
      }),
      lines: await supplierRawItemsRepo.listLinesForSupplierSources(tx, {
        organisationId: scope.organisationId,
        supplierId: args.supplierId,
      }),
    }));

    // Group distinct invoices by the normalised line description.
    const byNorm = new Map<string, Map<string, SupplierRawItemSource>>();
    for (const line of lines) {
      const desc = line.parsedDescription?.trim();
      if (!desc) continue;
      const norm = normalizeRawDescription(desc);
      let invoices = byNorm.get(norm);
      if (!invoices) {
        invoices = new Map();
        byNorm.set(norm, invoices);
      }
      if (!invoices.has(line.invoiceId)) {
        invoices.set(line.invoiceId, {
          invoiceId: line.invoiceId,
          invoiceNumber: line.invoiceNumber,
          invoiceDate: line.invoiceDate,
          parsed: line.attachmentParsedAt != null,
        });
      }
    }

    const sources: Record<string, SupplierRawItemSource[]> = {};
    for (const item of rawItems) {
      const invoices = byNorm.get(item.rawDescriptionNormalized);
      sources[item.id] = invoices
        ? [...invoices.values()].sort((a, b) =>
            (b.invoiceDate ?? "").localeCompare(a.invoiceDate ?? ""),
          )
        : [];
    }
    return { sources };
  },

  /**
   * The supplier's raw items clustered into pack-aware products (typos and
   * pk/unit splits merged), each with its price history. Drives the wizard's
   * one-at-a-time item-approval step.
   */
  async listReviewProducts(
    ctx: RequestAuthContext,
    args: { organisationSlug: string; venueSlug: string; supplierId: string },
  ): Promise<{ products: SupplierReviewProduct[] }> {
    const scope = await resolveScope(ctx, args.organisationSlug, args.venueSlug);
    await assertSupplierInScope(ctx, {
      organisationId: scope.organisationId,
      venueId: scope.venueId,
      supplierId: args.supplierId,
    });

    const { rawItems, priceLines } = await ctx.appDb.rls(async (tx) => ({
      rawItems: await supplierRawItemsRepo.listForSupplier(tx, {
        organisationId: scope.organisationId,
        supplierId: args.supplierId,
      }),
      priceLines: await supplierRawItemsRepo.listPriceLinesForSupplier(tx, {
        organisationId: scope.organisationId,
        supplierId: args.supplierId,
      }),
    }));

    const clusters = clusterRawItems(rawItems.map(rowToClusterable));

    // Invoice price points per normalised description. This — not the raw item's
    // lastUnitPriceCents, which is stamped in ingestion order and can be stale —
    // is the source of truth for the "current" (most recent by date) price.
    const pointsByNorm = new Map<string, SupplierReviewPricePoint[]>();
    for (const line of priceLines) {
      if (line.unitPriceCents == null || !line.parsedDescription?.trim()) continue;
      const norm = normalizeRawDescription(line.parsedDescription);
      const points = pointsByNorm.get(norm) ?? [];
      points.push({
        invoiceId: line.invoiceId,
        date: line.invoiceDate,
        unitPriceCents: line.unitPriceCents,
      });
      pointsByNorm.set(norm, points);
    }
    const normByRawItem = new Map(rawItems.map((row) => [row.id, row.rawDescriptionNormalized]));

    // Newest-first, duplicate-collapsed price points for a set of raw items.
    const historyForRawItems = (rawItemIds: string[]): SupplierReviewPricePoint[] => {
      const seen = new Set<string>();
      return rawItemIds
        .map((id) => normByRawItem.get(id))
        .filter((norm): norm is string => Boolean(norm))
        .flatMap((norm) => pointsByNorm.get(norm) ?? [])
        .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""))
        .filter((p) => {
          const dedupe = `${p.invoiceId}:${p.unitPriceCents}`;
          if (seen.has(dedupe)) return false;
          seen.add(dedupe);
          return true;
        });
    };

    const products = clusters.map((cluster): SupplierReviewProduct => {
      const priceHistory = historyForRawItems(cluster.rawItemIds);
      const packs = cluster.packs.map((pack) => {
        const latest = historyForRawItems(pack.rawItemIds)[0];
        return latest ? { ...pack, currentPriceCents: latest.unitPriceCents } : pack;
      });
      return {
        ...cluster,
        packs,
        currentPriceCents: priceHistory[0]?.unitPriceCents ?? cluster.currentPriceCents,
        priceHistory,
      };
    });

    return { products };
  },

  /**
   * Approve clustered products into the catalog: one supplier_product per
   * inferred pack size, seeded with its invoice price history, with the
   * contributing raw items linked + marked reviewed. The write side of the
   * wizard's item-approval step.
   */
  async approveAsProducts(
    ctx: RequestAuthContext,
    args: {
      organisationSlug: string;
      venueSlug: string;
      supplierId: string;
      input: ApproveAsProductsInput;
    },
  ): Promise<{ createdProducts: number; updatedProducts: number; reviewedItems: number }> {
    const scope = await resolveScope(ctx, args.organisationSlug, args.venueSlug);
    assertInventorySetupWriteAccess(ctx.tenantRoles, {
      organisationId: scope.organisationId,
      venueId: scope.venueId,
    });
    await assertSupplierInScope(ctx, {
      organisationId: scope.organisationId,
      venueId: scope.venueId,
      supplierId: args.supplierId,
    });

    const parsed = approveAsProductsSchema.parse(args.input);

    const { supplier, rawItems, priceLines } = await ctx.appDb.rls(async (tx) => ({
      supplier: await suppliersRepo.getSupplierById(tx, {
        organisationId: scope.organisationId,
        venueId: scope.venueId,
        supplierId: args.supplierId,
      }),
      rawItems: await supplierRawItemsRepo.listForSupplier(tx, {
        organisationId: scope.organisationId,
        supplierId: args.supplierId,
      }),
      priceLines: await supplierRawItemsRepo.listPriceLinesForSupplier(tx, {
        organisationId: scope.organisationId,
        supplierId: args.supplierId,
      }),
    }));
    if (!supplier) throw new SupplierRawItemsServiceError(404, "Supplier not found");

    const byId = new Map(rawItems.map((row) => [row.id, row]));

    // Invoice price points keyed by normalised description, for history seeding.
    const pointsByNorm = new Map<
      string,
      Array<{ date: string | null; priceCents: number; invoiceId: string }>
    >();
    for (const line of priceLines) {
      if (line.unitPriceCents == null || !line.parsedDescription?.trim()) continue;
      const norm = normalizeRawDescription(line.parsedDescription);
      const list = pointsByNorm.get(norm) ?? [];
      list.push({ date: line.invoiceDate, priceCents: line.unitPriceCents, invoiceId: line.invoiceId });
      pointsByNorm.set(norm, list);
    }

    let createdProducts = 0;
    let updatedProducts = 0;
    let reviewedItems = 0;

    await ctx.appDb.rls(async (tx) => {
      for (const productInput of parsed.products) {
        const items = productInput.rawItemIds
          .map((id) => byId.get(id))
          .filter((row): row is NonNullable<typeof row> => row != null);
        if (items.length === 0) continue;

        const name = productInput.name.trim();
        const packs = packsForRawItems(items.map(rowToClusterable));

        for (const pack of packs) {
          const fields = packToCatalogFields(pack);

          // This pack's invoice price points (oldest first). The newest is the
          // catalog price — same source of truth as the review screen, not the
          // raw item's stale lastUnitPriceCents.
          const norms = new Set(
            pack.rawItemIds
              .map((id) => byId.get(id)?.rawDescriptionNormalized)
              .filter((value): value is string => Boolean(value)),
          );
          const points = [...norms]
            .flatMap((norm) => pointsByNorm.get(norm) ?? [])
            .sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""));
          const unitPriceCents = Math.max(
            0,
            points.length ? points[points.length - 1]!.priceCents : pack.currentPriceCents ?? 0,
          );

          const productFields = {
            name,
            packLabel: pack.label,
            unitsPerPack: String(fields.unitsPerPack),
            packUnit: fields.packUnit,
            unitPriceCents,
            portionSize: fields.portionSize != null ? String(fields.portionSize) : null,
            portionUnit: fields.portionUnit,
          };

          // Idempotency: if this pack's items are already linked to a single
          // product, update it in place rather than minting a duplicate.
          const linkedIds = new Set(
            pack.rawItemIds
              .map((id) => byId.get(id)?.supplierProductId)
              .filter((value): value is string => Boolean(value)),
          );
          const existingProductId = linkedIds.size === 1 ? [...linkedIds][0]! : null;

          let product = existingProductId
            ? await supplierProductsRepo.updateProduct(tx, {
                organisationId: scope.organisationId,
                productId: existingProductId,
                row: { ...productFields, updatedBy: ctx.userId },
              })
            : null;

          if (product) {
            updatedProducts += 1;
          } else {
            product = await supplierProductsRepo.createProduct(tx, {
              organisationId: scope.organisationId,
              venueId: supplier.venueId,
              supplierId: args.supplierId,
              ingredientId: null,
              skuCode: null,
              ...productFields,
              isActiveForIngredient: false,
              createdBy: ctx.userId,
              updatedBy: ctx.userId,
            });
            createdProducts += 1;

            // Seed price history from this pack's invoice observations (oldest
            // first, one point per invoice, skipping unchanged prices).
            let prevPrice: number | null = null;
            const seenInvoices = new Set<string>();
            for (const point of points) {
              if (seenInvoices.has(point.invoiceId)) continue;
              seenInvoices.add(point.invoiceId);
              if (prevPrice === point.priceCents) continue;
              await supplierProductsRepo.insertPriceHistory(tx, {
                organisationId: scope.organisationId,
                supplierProductId: product.id,
                oldPriceCents: prevPrice,
                newPriceCents: point.priceCents,
                source: "invoice",
                sourceRef: point.invoiceId,
                changedByUserId: ctx.userId,
                ...(point.date ? { changedAt: new Date(point.date).toISOString() } : {}),
              });
              prevPrice = point.priceCents;
            }
            if (prevPrice === null) {
              await supplierProductsRepo.insertPriceHistory(tx, {
                organisationId: scope.organisationId,
                supplierProductId: product.id,
                oldPriceCents: null,
                newPriceCents: unitPriceCents,
                source: "manual_edit",
                changedByUserId: ctx.userId,
              });
            }
          }

          // Link the raw items to the product and mark them reviewed, but leave
          // them 'pending' normalisation — converting them to ingredients (with
          // measured weights/units) is the separate normalisation step.
          reviewedItems += await supplierRawItemsRepo.linkSupplierProductForReview(tx, {
            organisationId: scope.organisationId,
            supplierId: args.supplierId,
            rawItemIds: pack.rawItemIds,
            supplierProductId: product.id,
            reviewedAt: new Date().toISOString(),
            reviewedBy: ctx.userId,
          });
        }
      }
    });

    // Auto-clear a stale "no catalog yet" parking once this supplier has real
    // products. Readiness already ignores the ack when productCount > 0; this
    // just stops the flag from contradicting reality.
    if (createdProducts > 0 && supplier.noCatalogAckedAt != null) {
      await ctx.appDb.rls((tx) =>
        suppliersRepo.updateSupplier(tx, {
          organisationId: scope.organisationId,
          venueId: scope.venueId,
          supplierId: args.supplierId,
          row: {
            noCatalogAckedAt: null,
            noCatalogAckedBy: null,
            updatedAt: new Date().toISOString(),
          },
        }),
      );
    }

    return { createdProducts, updatedProducts, reviewedItems };
  },

  /**
   * Mark a product's raw items as "not inventory" and reviewed — the wizard's
   * Skip. Clears them from the unreviewed backlog without creating a product.
   */
  async skipAsNotInventory(
    ctx: RequestAuthContext,
    args: {
      organisationSlug: string;
      venueSlug: string;
      supplierId: string;
      input: SkipRawItemsInput;
    },
  ): Promise<{ updated: number }> {
    const scope = await resolveScope(ctx, args.organisationSlug, args.venueSlug);
    assertInventorySetupWriteAccess(ctx.tenantRoles, {
      organisationId: scope.organisationId,
      venueId: scope.venueId,
    });
    await assertSupplierInScope(ctx, {
      organisationId: scope.organisationId,
      venueId: scope.venueId,
      supplierId: args.supplierId,
    });

    const parsed = skipRawItemsSchema.parse(args.input);
    const updated = await ctx.appDb.rls((tx) =>
      supplierRawItemsRepo.setNotInventory(tx, {
        organisationId: scope.organisationId,
        supplierId: args.supplierId,
        rawItemIds: parsed.rawItemIds,
        reviewedAt: new Date().toISOString(),
        reviewedBy: ctx.userId,
      }),
    );
    return { updated };
  },

  /**
   * One-shot close of the wizard's items step: rescue any rows the parser
   * wrongly flagged non-inventory (flip them back to inventory), then stamp
   * every still-unreviewed row reviewed. Mints NO products — mapping items into
   * ingredients (and creating priced products) is the normalisation stage's
   * job; this step only corrects the inventory flags before it.
   */
  async confirmItemsTriage(
    ctx: RequestAuthContext,
    args: {
      organisationSlug: string;
      venueSlug: string;
      supplierId: string;
      input: ConfirmItemsTriageInput;
    },
  ): Promise<{ rescued: number; confirmed: number }> {
    const scope = await resolveScope(ctx, args.organisationSlug, args.venueSlug);
    assertInventorySetupWriteAccess(ctx.tenantRoles, {
      organisationId: scope.organisationId,
      venueId: scope.venueId,
    });
    await assertSupplierInScope(ctx, {
      organisationId: scope.organisationId,
      venueId: scope.venueId,
      supplierId: args.supplierId,
    });

    const parsed = confirmItemsTriageSchema.parse(args.input);
    const reviewedAt = new Date().toISOString();
    return ctx.appDb.rls(async (tx) => {
      const rescued = await supplierRawItemsRepo.restoreToInventory(tx, {
        organisationId: scope.organisationId,
        supplierId: args.supplierId,
        rawItemIds: parsed.rescueRawItemIds,
        reviewedAt,
        reviewedBy: ctx.userId,
      });
      const confirmed = await supplierRawItemsRepo.setAllReviewedForSupplier(tx, {
        organisationId: scope.organisationId,
        supplierId: args.supplierId,
        reviewedAt,
        reviewedBy: ctx.userId,
      });
      return { rescued, confirmed };
    });
  },

  /**
   * Testing convenience: auto-complete the supplier stage across every active
   * inventory-source supplier — fill any missing profile fields with a bare
   * minimum, approve all likely-inventory products (using the inferred names),
   * clear all flagged non-inventory ones, and deactivate suppliers with no
   * detected items. Lets you jump straight to normalisation.
   */
  async smartFillSetup(
    ctx: RequestAuthContext,
    args: { organisationSlug: string; venueSlug: string },
  ): Promise<{
    suppliersProcessed: number;
    profilesFilled: number;
    deactivated: number;
    productsCreated: number;
    itemsCleared: number;
  }> {
    const scope = await resolveScope(ctx, args.organisationSlug, args.venueSlug);
    assertInventorySetupWriteAccess(ctx.tenantRoles, {
      organisationId: scope.organisationId,
      venueId: scope.venueId,
    });

    const { rows: supplierRows } = await ctx.appDb.rls((tx) =>
      suppliersRepo.listSuppliers(tx, {
        organisationId: scope.organisationId,
        venueId: scope.venueId,
        inventorySource: true,
        status: "active",
        page: 1,
        pageSize: 500,
      }),
    );

    let suppliersProcessed = 0;
    let profilesFilled = 0;
    let deactivated = 0;
    let productsCreated = 0;
    let itemsCleared = 0;

    for (const supplier of supplierRows) {
      suppliersProcessed += 1;

      const profilePatch = buildBareMinimumProfilePatch(supplier);
      if (profilePatch) {
        await ctx.appDb.rls((tx) =>
          suppliersRepo.updateSupplier(tx, {
            organisationId: scope.organisationId,
            venueId: scope.venueId,
            supplierId: supplier.id,
            row: { ...profilePatch, updatedAt: new Date().toISOString() },
          }),
        );
        profilesFilled += 1;
      }
      const { products } = await supplierRawItemsService.listReviewProducts(ctx, {
        organisationSlug: args.organisationSlug,
        venueSlug: args.venueSlug,
        supplierId: supplier.id,
      });

      if (products.length === 0) {
        // Deactivate AND park as "no catalog yet" — deactivating alone doesn't
        // unblock the Suppliers stage (countInventorySupplierResolutionForVenue
        // ignores active status), only the ack does.
        await ctx.appDb.rls((tx) =>
          suppliersRepo.updateSupplier(tx, {
            organisationId: scope.organisationId,
            venueId: scope.venueId,
            supplierId: supplier.id,
            row: {
              active: false,
              noCatalogAckedAt: new Date().toISOString(),
              noCatalogAckedBy: ctx.userId,
              updatedAt: new Date().toISOString(),
            },
          }),
        );
        deactivated += 1;
        continue;
      }

      const toApprove = products.filter((p) => p.isLikelyInventory && !p.reviewed);
      const toClear = products.filter((p) => !p.isLikelyInventory && !p.reviewed);

      if (toApprove.length > 0) {
        const result = await supplierRawItemsService.approveAsProducts(ctx, {
          organisationSlug: args.organisationSlug,
          venueSlug: args.venueSlug,
          supplierId: supplier.id,
          input: {
            products: toApprove.map((p) => ({
              rawItemIds: p.rawItemIds,
              name: p.canonicalName,
            })),
          },
        });
        productsCreated += result.createdProducts + result.updatedProducts;
      }

      if (toClear.length > 0) {
        const result = await supplierRawItemsService.skipAsNotInventory(ctx, {
          organisationSlug: args.organisationSlug,
          venueSlug: args.venueSlug,
          supplierId: supplier.id,
          input: { rawItemIds: toClear.flatMap((p) => p.rawItemIds) },
        });
        itemsCleared += result.updated;
      }
    }

    return {
      suppliersProcessed,
      profilesFilled,
      deactivated,
      productsCreated,
      itemsCleared,
    };
  },

  /**
   * Testing convenience: the inverse of Smart Fill. Every raw item across the
   * venue's suppliers goes back to unreviewed with no product link, the
   * supplier_products created by approvals are removed, and suppliers Smart
   * Fill deactivated are reactivated — back to "just detected raw items,
   * nothing approved".
   */
  async resetSupplierApprovals(
    ctx: RequestAuthContext,
    args: { organisationSlug: string; venueSlug: string },
  ): Promise<{
    itemsReset: number;
    productsRemoved: number;
    suppliersReactivated: number;
  }> {
    const scope = await resolveScope(ctx, args.organisationSlug, args.venueSlug);
    assertInventorySetupWriteAccess(ctx.tenantRoles, {
      organisationId: scope.organisationId,
      venueId: scope.venueId,
    });

    return resetVenueSupplierApprovals(ctx.appDb, {
      organisationId: scope.organisationId,
      venueId: scope.venueId,
    });
  },

  async list(
    ctx: RequestAuthContext,
    args: {
      organisationSlug: string;
      venueSlug: string;
      supplierId: string;
      search?: string;
    },
  ): Promise<{ items: SupplierRawItemSummary[] }> {
    const scope = await resolveScope(ctx, args.organisationSlug, args.venueSlug);
    await assertSupplierInScope(ctx, {
      organisationId: scope.organisationId,
      venueId: scope.venueId,
      supplierId: args.supplierId,
    });

    const rows = await ctx.appDb.rls((tx) =>
      supplierRawItemsRepo.listForSupplier(tx, {
        organisationId: scope.organisationId,
        supplierId: args.supplierId,
        search: args.search,
      }),
    );

    return { items: rows.map((row) => mapRow(row)) };
  },

  async create(
    ctx: RequestAuthContext,
    args: {
      organisationSlug: string;
      venueSlug: string;
      supplierId: string;
      input: CreateRawItemInput;
    },
  ): Promise<SupplierRawItemSummary> {
    const scope = await resolveScope(ctx, args.organisationSlug, args.venueSlug);
    assertInventorySetupWriteAccess(ctx.tenantRoles, {
      organisationId: scope.organisationId,
      venueId: scope.venueId,
    });
    await assertSupplierInScope(ctx, {
      organisationId: scope.organisationId,
      venueId: scope.venueId,
      supplierId: args.supplierId,
    });

    const parsed = createRawItemSchema.parse(args.input);
    const normalized = normalizeRawDescription(parsed.rawDescription);
    const unitNormalized = normalizeRawUnit(parsed.rawUnit, parsed.rawDescription);
    const now = new Date().toISOString();

    const existing = await ctx.appDb.rls((tx) =>
      supplierRawItemsRepo.findByDedupeKey(tx, {
        supplierId: args.supplierId,
        rawDescriptionNormalized: normalized,
        rawUnitNormalized: unitNormalized,
      }),
    );
    if (existing) {
      throw new SupplierRawItemsServiceError(
        409,
        "This item already exists for this supplier",
        existing.id,
      );
    }

    const row = await ctx.appDb.rls((tx) =>
      supplierRawItemsRepo.create(tx, {
        organisationId: scope.organisationId,
        supplierId: args.supplierId,
        rawDescription: parsed.rawDescription,
        rawDescriptionNormalized: normalized,
        rawUnit: parsed.rawUnit?.trim() || null,
        rawUnitNormalized: unitNormalized,
        lastQuantity:
          parsed.lastQuantity != null ? String(parsed.lastQuantity) : null,
        lastUnitPriceCents: parsed.lastUnitPriceCents ?? null,
        lastLineTotalCents: parsed.lastLineTotalCents ?? null,
        source: "manual",
        firstSeenAt: now,
        lastSeenAt: now,
        normalisationStatus: "pending",
        createdBy: ctx.userId,
        updatedBy: ctx.userId,
      }),
    );

    return mapRow(row);
  },

  async update(
    ctx: RequestAuthContext,
    args: {
      organisationSlug: string;
      venueSlug: string;
      supplierId: string;
      rawItemId: string;
      input: UpdateRawItemInput;
    },
  ): Promise<SupplierRawItemSummary> {
    const scope = await resolveScope(ctx, args.organisationSlug, args.venueSlug);
    assertInventorySetupWriteAccess(ctx.tenantRoles, {
      organisationId: scope.organisationId,
      venueId: scope.venueId,
    });

    const parsed = updateRawItemSchema.parse(args.input);
    const existing = await ctx.appDb.rls((tx) =>
      supplierRawItemsRepo.findById(tx, {
        organisationId: scope.organisationId,
        supplierId: args.supplierId,
        rawItemId: args.rawItemId,
      }),
    );
    if (!existing) {
      throw new SupplierRawItemsServiceError(404, "Raw item not found");
    }

    const rawDescriptionNormalized = parsed.rawDescription
      ? normalizeRawDescription(parsed.rawDescription)
      : existing.rawDescriptionNormalized;
    const rawUnitNormalized =
      parsed.rawUnit !== undefined
        ? normalizeRawUnit(parsed.rawUnit, parsed.rawDescription ?? existing.rawDescription)
        : existing.rawUnitNormalized;
    // Re-check the (supplier, description, unit) dedupe key if either part moved.
    if (
      rawDescriptionNormalized !== existing.rawDescriptionNormalized ||
      rawUnitNormalized !== existing.rawUnitNormalized
    ) {
      const duplicate = await ctx.appDb.rls((tx) =>
        supplierRawItemsRepo.findByDedupeKey(tx, {
          supplierId: args.supplierId,
          rawDescriptionNormalized,
          rawUnitNormalized,
        }),
      );
      if (duplicate && duplicate.id !== args.rawItemId) {
        throw new SupplierRawItemsServiceError(
          409,
          "This item already exists for this supplier",
          duplicate.id,
        );
      }
    }

    const reviewPatch =
      parsed.reviewed === undefined
        ? {}
        : {
            reviewedAt: parsed.reviewed ? new Date().toISOString() : null,
            reviewedBy: parsed.reviewed ? ctx.userId : null,
          };

    const row = await ctx.appDb.rls((tx) =>
      supplierRawItemsRepo.update(tx, {
        rawItemId: args.rawItemId,
        patch: {
          rawDescription: parsed.rawDescription ?? existing.rawDescription,
          rawDescriptionNormalized,
          rawUnit:
            parsed.rawUnit !== undefined
              ? parsed.rawUnit?.trim() || null
              : existing.rawUnit,
          rawUnitNormalized,
          lastQuantity:
            parsed.lastQuantity != null
              ? String(parsed.lastQuantity)
              : existing.lastQuantity,
          lastUnitPriceCents:
            parsed.lastUnitPriceCents ?? existing.lastUnitPriceCents,
          lastLineTotalCents:
            parsed.lastLineTotalCents ?? existing.lastLineTotalCents,
          updatedBy: ctx.userId,
          ...reviewPatch,
        },
      }),
    );

    return mapRow(row);
  },

  /** Bulk approve (or clear approval for) a set of this supplier's raw items. */
  async approveMany(
    ctx: RequestAuthContext,
    args: {
      organisationSlug: string;
      venueSlug: string;
      supplierId: string;
      input: ApproveRawItemsInput;
    },
  ): Promise<{ updated: number }> {
    const scope = await resolveScope(ctx, args.organisationSlug, args.venueSlug);
    assertInventorySetupWriteAccess(ctx.tenantRoles, {
      organisationId: scope.organisationId,
      venueId: scope.venueId,
    });
    await assertSupplierInScope(ctx, {
      organisationId: scope.organisationId,
      venueId: scope.venueId,
      supplierId: args.supplierId,
    });

    const parsed = approveRawItemsSchema.parse(args.input);
    const updated = await ctx.appDb.rls((tx) =>
      supplierRawItemsRepo.setReviewed(tx, {
        organisationId: scope.organisationId,
        supplierId: args.supplierId,
        rawItemIds: parsed.rawItemIds,
        reviewedAt: parsed.reviewed ? new Date().toISOString() : null,
        reviewedBy: parsed.reviewed ? ctx.userId : null,
      }),
    );
    return { updated };
  },

  async archive(
    ctx: RequestAuthContext,
    args: {
      organisationSlug: string;
      venueSlug: string;
      supplierId: string;
      rawItemId: string;
    },
  ): Promise<{ archived: boolean }> {
    const scope = await resolveScope(ctx, args.organisationSlug, args.venueSlug);
    assertInventorySetupWriteAccess(ctx.tenantRoles, {
      organisationId: scope.organisationId,
      venueId: scope.venueId,
    });

    const existing = await ctx.appDb.rls((tx) =>
      supplierRawItemsRepo.findById(tx, {
        organisationId: scope.organisationId,
        supplierId: args.supplierId,
        rawItemId: args.rawItemId,
      }),
    );
    if (!existing) {
      throw new SupplierRawItemsServiceError(404, "Raw item not found");
    }

    const archived = await ctx.appDb.rls((tx) =>
      supplierRawItemsRepo.archive(tx, args.rawItemId),
    );
    return { archived };
  },
};
