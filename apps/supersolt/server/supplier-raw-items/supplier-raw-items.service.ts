import type { RequestAuthContext } from "@/server/auth/context";
import { AuthError } from "@/server/auth/errors";
import { resolveVenueScopeForService } from "@/server/access/require-venue-scope";
import { assertInventorySetupWriteAccess } from "@/server/inventory-setup/inventory-setup-auth";
import { suppliersRepo } from "@/server/suppliers/suppliers.repo";
import { normalizeRawDescription } from "@/server/supplier-raw-items/normalize-raw-description";
import {
  createRawItemSchema,
  updateRawItemSchema,
  type CreateRawItemInput,
  type UpdateRawItemInput,
} from "@/server/supplier-raw-items/supplier-raw-items.schemas";
import { supplierRawItemsRepo } from "@/server/supplier-raw-items/supplier-raw-items.repo";

export type SupplierRawItemSummary = {
  id: string;
  supplierId: string;
  rawDescription: string;
  rawUnit: string | null;
  lastQuantity: number | null;
  lastUnitPriceCents: number | null;
  lastLineTotalCents: number | null;
  source: string;
  normalisationStatus: string;
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
    source: row.source,
    normalisationStatus: row.normalisationStatus,
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

export const supplierRawItemsService = {
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
    const now = new Date().toISOString();

    const existing = await ctx.appDb.rls((tx) =>
      supplierRawItemsRepo.findByDedupeKey(tx, {
        supplierId: args.supplierId,
        rawDescriptionNormalized: normalized,
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

    let rawDescriptionNormalized = existing.rawDescriptionNormalized;
    if (parsed.rawDescription) {
      rawDescriptionNormalized = normalizeRawDescription(parsed.rawDescription);
      const duplicate = await ctx.appDb.rls((tx) =>
        supplierRawItemsRepo.findByDedupeKey(tx, {
          supplierId: args.supplierId,
          rawDescriptionNormalized,
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
          lastQuantity:
            parsed.lastQuantity != null
              ? String(parsed.lastQuantity)
              : existing.lastQuantity,
          lastUnitPriceCents:
            parsed.lastUnitPriceCents ?? existing.lastUnitPriceCents,
          lastLineTotalCents:
            parsed.lastLineTotalCents ?? existing.lastLineTotalCents,
          updatedBy: ctx.userId,
        },
      }),
    );

    return mapRow(row);
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
