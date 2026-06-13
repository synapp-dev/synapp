import { resolveVenueScopeForService } from "@/server/access/require-venue-scope";
import { canCreateStockCount } from "@/server/auth/capabilities";
import type { RequestAuthContext } from "@/server/auth/context";
import { StockCountsServiceError } from "@/server/stock-counts/stock-counts-errors";
import { stockCountSchedulesRepo } from "@/server/stock-counts/stock-count-schedules.repo";
import type { StockCountScopeType } from "@/server/stock-counts/stock-counts.types";

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

export type StockCountScheduleDto = {
  id: string;
  cadence: string;
  defaultScopeType: StockCountScopeType;
  defaultScopeFilter: Record<string, unknown>;
  defaultAssigneeUserId: string | null;
  isPaused: boolean;
  createdAt: string;
};

export const stockCountSchedulesService = {
  async get(
    ctx: RequestAuthContext,
    args: { organisationSlug: string; venueSlug: string },
  ): Promise<StockCountScheduleDto | null> {
    const scope = await getContext(ctx, args.organisationSlug, args.venueSlug);
    const rows = await ctx.appDb.rls((tx) =>
      stockCountSchedulesRepo.listForVenue(tx, scope.venueId),
    );
    const row = rows[0];
    if (!row) return null;
    return {
      id: row.id,
      cadence: row.cadence,
      defaultScopeType: row.defaultScopeType as StockCountScopeType,
      defaultScopeFilter: (row.defaultScopeFilter as Record<string, unknown>) ?? {},
      defaultAssigneeUserId: row.defaultAssigneeUserId,
      isPaused: row.isPaused,
      createdAt: row.createdAt,
    };
  },

  async upsert(
    ctx: RequestAuthContext,
    args: {
      organisationSlug: string;
      venueSlug: string;
      cadence?: string;
      defaultScopeType?: StockCountScopeType;
      defaultScopeFilter?: Record<string, unknown>;
      defaultAssigneeUserId?: string | null;
      isPaused?: boolean;
    },
  ): Promise<StockCountScheduleDto> {
    const scope = await getContext(ctx, args.organisationSlug, args.venueSlug);
    if (!canCreateStockCount(ctx.tenantRoles, scope.organisationId)) {
      throw new StockCountsServiceError("stock_counts.forbidden", "Forbidden");
    }

    const row = await ctx.appDb.rls((tx) =>
      stockCountSchedulesRepo.upsert(tx, {
        organisationId: scope.organisationId,
        venueId: scope.venueId,
        cadence: args.cadence ?? "weekly",
        defaultScopeType: args.defaultScopeType ?? "full",
        defaultScopeFilter: args.defaultScopeFilter ?? {},
        defaultAssigneeUserId: args.defaultAssigneeUserId ?? ctx.userId,
        isPaused: args.isPaused ?? false,
      }),
    );

    return {
      id: row.id,
      cadence: row.cadence,
      defaultScopeType: row.defaultScopeType as StockCountScopeType,
      defaultScopeFilter: (row.defaultScopeFilter as Record<string, unknown>) ?? {},
      defaultAssigneeUserId: row.defaultAssigneeUserId,
      isPaused: row.isPaused,
      createdAt: row.createdAt,
    };
  },
};
