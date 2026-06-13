import { resolveVenueScopeForService } from "@/server/access/require-venue-scope";
import { canCreateStockCount } from "@/server/auth/capabilities";
import type { RequestAuthContext } from "@/server/auth/context";
import { StockCountsServiceError } from "@/server/stock-counts/stock-counts-errors";
import { storageLocationsRepo } from "@/server/stock-counts/storage-locations.repo";

async function getContext(
  ctx: RequestAuthContext,
  organisationSlug: string,
  venueSlug: string,
) {
  return resolveVenueScopeForService(ctx, organisationSlug, venueSlug, {
    notFound: (message) =>
      new StockCountsServiceError("stock_counts.not_found", message),
    forbidden: (auth) =>
      new StockCountsServiceError("stock_counts.forbidden", auth.message),
  });
}

export const storageLocationsService = {
  async list(
    ctx: RequestAuthContext,
    args: { organisationSlug: string; venueSlug: string },
  ) {
    const scope = await getContext(ctx, args.organisationSlug, args.venueSlug);
    return ctx.appDb.rls((tx) =>
      storageLocationsRepo.listForVenue(tx, scope.venueId),
    );
  },

  async create(
    ctx: RequestAuthContext,
    args: {
      organisationSlug: string;
      venueSlug: string;
      name: string;
      displayOrder?: number;
    },
  ) {
    const scope = await getContext(ctx, args.organisationSlug, args.venueSlug);
    if (!canCreateStockCount(ctx.tenantRoles, scope.organisationId)) {
      throw new StockCountsServiceError("stock_counts.forbidden", "Forbidden");
    }

    return ctx.appDb.rls((tx) =>
      storageLocationsRepo.create(tx, {
        organisationId: scope.organisationId,
        venueId: scope.venueId,
        name: args.name.trim(),
        displayOrder: args.displayOrder ?? 0,
      }),
    );
  },

  async update(
    ctx: RequestAuthContext,
    args: {
      organisationSlug: string;
      venueSlug: string;
      locationId: string;
      name?: string;
      displayOrder?: number;
    },
  ) {
    const scope = await getContext(ctx, args.organisationSlug, args.venueSlug);
    if (!canCreateStockCount(ctx.tenantRoles, scope.organisationId)) {
      throw new StockCountsServiceError("stock_counts.forbidden", "Forbidden");
    }

    const row = await ctx.appDb.rls((tx) =>
      storageLocationsRepo.update(tx, args.locationId, {
        ...(args.name !== undefined ? { name: args.name.trim() } : {}),
        ...(args.displayOrder !== undefined
          ? { displayOrder: args.displayOrder }
          : {}),
      }),
    );
    if (!row || row.venueId !== scope.venueId) {
      throw new StockCountsServiceError("stock_counts.not_found", "Location not found");
    }
    return row;
  },

  async remove(
    ctx: RequestAuthContext,
    args: {
      organisationSlug: string;
      venueSlug: string;
      locationId: string;
    },
  ) {
    const scope = await getContext(ctx, args.organisationSlug, args.venueSlug);
    if (!canCreateStockCount(ctx.tenantRoles, scope.organisationId)) {
      throw new StockCountsServiceError("stock_counts.forbidden", "Forbidden");
    }

    const locations = await ctx.appDb.rls((tx) =>
      storageLocationsRepo.listForVenue(tx, scope.venueId),
    );
    const target = locations.find((l) => l.id === args.locationId);
    if (!target) {
      throw new StockCountsServiceError("stock_counts.not_found", "Location not found");
    }

    await ctx.appDb.rls((tx) => storageLocationsRepo.delete(tx, args.locationId));
    return { ok: true as const };
  },
};
