import { resolveVenueScopeForService } from "@/server/access/require-venue-scope";
import {
  canApproveLargeVarianceStockCount,
  canApproveStockCount,
  canCreateStockCount,
  canRunStockCount,
} from "@/server/auth/capabilities";
import type { RequestAuthContext } from "@/server/auth/context";
import { consumptionDailyService } from "@/server/stock-counts/consumption-daily.service";
import { StockCountsServiceError } from "@/server/stock-counts/stock-counts-errors";
import {
  assertValidStatusTransition,
  buildAllowedActions,
  type StockCountStatus,
} from "@/server/stock-counts/stock-counts-policy";
import { stockCountsRepo } from "@/server/stock-counts/stock-counts.repo";
import { trackStockCountsEvent } from "@/server/stock-counts/stock-counts-telemetry";
import type {
  CreateStockCountInput,
  PatchStockCountInput,
  StockCountActionInput,
  StockCountDetailDto,
  StockCountEntryDto,
  StockCountListResponse,
  StockCountSummaryDto,
} from "@/server/stock-counts/stock-counts.types";
import {
  buildPackUnitLines,
  convertMixedUnitsToBase,
} from "@/server/stock-counts/mixed-unit-convert";
import {
  computeVariance,
  isNonTrackedCategory,
} from "@/server/stock-counts/variance-compute";

function resolveEntryQuantities(entry: {
  countedQty?: number | null;
  mixedUnitBreakdown?: unknown;
}): { countedQty: number | null | undefined; mixedUnitBreakdown: unknown } {
  if (entry.mixedUnitBreakdown && typeof entry.mixedUnitBreakdown === "object") {
    const raw = entry.mixedUnitBreakdown as Record<string, unknown>;
    if (Array.isArray(raw.lines)) {
      const breakdown = convertMixedUnitsToBase(
        raw.lines as Array<{
          unitKey: string;
          quantity: number;
          multiplierToBase: number;
        }>,
      );
      return { countedQty: breakdown.totalBaseUnits, mixedUnitBreakdown: breakdown };
    }
    if ("cartons" in raw || "looseUnits" in raw || "partialBaseUnits" in raw) {
      const breakdown = buildPackUnitLines({
        cartons: Number(raw.cartons) || undefined,
        unitsPerCarton: Number(raw.unitsPerCarton) || 1,
        looseUnits: Number(raw.looseUnits) || undefined,
        partialBaseUnits: Number(raw.partialBaseUnits) || undefined,
      });
      return { countedQty: breakdown.totalBaseUnits, mixedUnitBreakdown: breakdown };
    }
  }
  return {
    countedQty: entry.countedQty,
    mixedUnitBreakdown: entry.mixedUnitBreakdown,
  };
}

function pickCycleIngredients<T extends { id: string }>(
  rows: T[],
  fraction = 0.25,
): T[] {
  const shuffled = [...rows].sort(() => Math.random() - 0.5);
  const count = Math.max(1, Math.ceil(shuffled.length * fraction));
  return shuffled.slice(0, count);
}

function formatCountName(date = new Date()): string {
  return `Count ${date.toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })}`;
}

function toSummaryDto(args: {
  row: Awaited<ReturnType<typeof stockCountsRepo.getCountById>>;
  itemCount: number;
  completedItemCount: number;
  ctx: RequestAuthContext;
  organisationId: string;
}): StockCountSummaryDto {
  const row = args.row!;
  return {
    id: row.id,
    name: row.name,
    status: row.status as StockCountStatus,
    scopeType: row.scopeType as StockCountSummaryDto["scopeType"],
    assigneeUserId: row.assigneeUserId,
    itemCount: args.itemCount,
    completedItemCount: args.completedItemCount,
    totalVarianceCents: row.totalVarianceCents ?? null,
    submittedAt: row.submittedAt,
    approvedAt: row.approvedAt,
    createdAt: row.createdAt,
    allowedActions: buildAllowedActions({
      status: row.status as StockCountStatus,
      roles: args.ctx.tenantRoles,
      organisationId: args.organisationId,
      assigneeUserId: row.assigneeUserId,
      userId: args.ctx.userId,
      largeVarianceOwnerRequired: row.largeVarianceOwnerRequired,
    }),
  };
}

function toEntryDto(
  row: Awaited<ReturnType<typeof stockCountsRepo.listEntriesForCount>>[number],
): StockCountEntryDto {
  return {
    id: row.id,
    ingredientId: row.ingredientId,
    ingredientName: row.ingredientName,
    ingredientUnit: row.ingredientUnit,
    category: row.category,
    locationId: row.locationId,
    previousCountQty:
      row.previousCountQty !== null ? Number(row.previousCountQty) : null,
    expectedQty: row.expectedQty !== null ? Number(row.expectedQty) : null,
    countedQty: row.countedQty !== null ? Number(row.countedQty) : null,
    unitUsed: row.unitUsed,
    mixedUnitBreakdown: row.mixedUnitBreakdown,
    varianceQty: row.varianceQty !== null ? Number(row.varianceQty) : null,
    varianceCents: row.varianceCents ?? null,
    notes: row.notes,
    photoUrls: row.photoUrls?.filter(Boolean) ?? [],
    unitsPerPack:
      row.unitsPerPack !== null && row.unitsPerPack !== undefined
        ? Number(row.unitsPerPack)
        : null,
    packLabel: row.packLabel ?? null,
    needsVerification: row.needsVerification,
    isRecountRequired: row.isRecountRequired,
    isSkipped: row.isSkipped,
    isRowComplete: row.isRowComplete,
    countedAt: row.countedAt,
  };
}

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

async function loadDetail(
  ctx: RequestAuthContext,
  scope: Awaited<ReturnType<typeof getContext>>,
  countId: string,
): Promise<StockCountDetailDto> {
  const row = await ctx.appDb.rls((tx) =>
    stockCountsRepo.getCountById(tx, {
      venueId: scope.venueId,
      countId,
    }),
  );
  if (!row) {
    throw new StockCountsServiceError("stock_counts.not_found", "Count not found");
  }

  const entries = await ctx.appDb.rls((tx) =>
    stockCountsRepo.listEntriesForCount(tx, countId),
  );
  const completedItemCount = entries.filter(
    (e) => e.isRowComplete || e.isSkipped || e.countedQty !== null,
  ).length;

  const summary = toSummaryDto({
    row,
    itemCount: entries.length,
    completedItemCount,
    ctx,
    organisationId: scope.organisationId,
  });

  trackStockCountsEvent("stock_counts.viewed", {
    venueId: scope.venueId,
    countId,
  });

  return {
    ...summary,
    scopeFilter: (row.scopeFilter as Record<string, unknown>) ?? {},
    isBaseline: row.isBaseline,
    largeVarianceOwnerRequired: row.largeVarianceOwnerRequired,
    notes: row.notes,
    rejectionReason: row.rejectionReason,
    startedAt: row.startedAt,
    entries: entries.map(toEntryDto),
  };
}

function resolveScopeIngredientIds(
  scopeFilter: Record<string, unknown>,
): string[] | undefined {
  const ids = scopeFilter.ingredientIds;
  if (Array.isArray(ids) && ids.every((id) => typeof id === "string")) {
    return ids as string[];
  }
  return undefined;
}

function resolveScopeCategories(
  scopeFilter: Record<string, unknown>,
): string[] | undefined {
  const categories = scopeFilter.categories;
  if (
    Array.isArray(categories) &&
    categories.every((c) => typeof c === "string")
  ) {
    return categories as string[];
  }
  return undefined;
}

export const stockCountsService = {
  async list(
    ctx: RequestAuthContext,
    args: {
      organisationSlug: string;
      venueSlug: string;
      status?: string;
    },
  ): Promise<StockCountListResponse> {
    const scope = await getContext(ctx, args.organisationSlug, args.venueSlug);

    const [rows, lastApprovedAt, activeIngredientCount] = await ctx.appDb.rls(async (tx) => {
      const counts = await stockCountsRepo.listCounts(tx, {
        venueId: scope.venueId,
        status: args.status,
      });
      const lastAt = await stockCountsRepo.getLastApprovedAt(tx, scope.venueId);
      const ingredientCount = await stockCountsRepo.countActiveIngredients(tx, {
        organisationId: scope.organisationId,
        venueId: scope.venueId,
      });
      return [counts, lastAt, ingredientCount] as const;
    });

    const counts: StockCountSummaryDto[] = [];
    for (const row of rows) {
      const entries = await ctx.appDb.rls((tx) =>
        stockCountsRepo.listEntriesForCount(tx, row.id),
      );
      const completedItemCount = entries.filter(
        (e) => e.isRowComplete || e.isSkipped || e.countedQty !== null,
      ).length;
      counts.push(
        toSummaryDto({
          row,
          itemCount: entries.length,
          completedItemCount,
          ctx,
          organisationId: scope.organisationId,
        }),
      );
    }

    const daysSinceLastCount = lastApprovedAt
      ? Math.floor(
          (Date.now() - new Date(lastApprovedAt).getTime()) / (1000 * 60 * 60 * 24),
        )
      : null;

    trackStockCountsEvent("stock_counts.viewed", { venueId: scope.venueId });

    return { counts, lastApprovedAt, daysSinceLastCount, activeIngredientCount };
  },

  async get(
    ctx: RequestAuthContext,
    args: {
      organisationSlug: string;
      venueSlug: string;
      countId: string;
    },
  ): Promise<StockCountDetailDto> {
    const scope = await getContext(ctx, args.organisationSlug, args.venueSlug);
    return loadDetail(ctx, scope, args.countId);
  },

  async create(
    ctx: RequestAuthContext,
    args: {
      organisationSlug: string;
      venueSlug: string;
      input: CreateStockCountInput;
    },
  ): Promise<StockCountDetailDto> {
    const scope = await getContext(ctx, args.organisationSlug, args.venueSlug);

    if (!canCreateStockCount(ctx.tenantRoles, scope.organisationId)) {
      throw new StockCountsServiceError(
        "stock_counts.forbidden",
        "You cannot create stock counts",
      );
    }

    const scopeType = args.input.scopeType ?? "full";
    const scopeFilter = args.input.scopeFilter ?? {};
    const now = new Date().toISOString();

    const { countId } = await ctx.appDb.rls(async (tx) => {
      let ingredientRows = await stockCountsRepo.listActiveIngredients(tx, {
        organisationId: scope.organisationId,
        venueId: scope.venueId,
        ingredientIds: resolveScopeIngredientIds(scopeFilter),
        categories: resolveScopeCategories(scopeFilter),
      });

      if (scopeType === "cycle") {
        const fraction =
          typeof scopeFilter.cycleFraction === "number"
            ? scopeFilter.cycleFraction
            : 0.25;
        ingredientRows = pickCycleIngredients(ingredientRows, fraction);
      }

      if (ingredientRows.length === 0) {
        throw new StockCountsServiceError(
          "stock_counts.no_ingredients",
          "Add ingredients to this venue before starting a stock count",
        );
      }

      const { count: prevCount, entries: prevEntries } =
        await stockCountsRepo.getPreviousApprovedEntries(tx, {
          venueId: scope.venueId,
        });

      const prevByIngredient = new Map(
        prevEntries.map((e) => [e.ingredientId, Number(e.countedQty ?? 0)]),
      );

      const count = await stockCountsRepo.insertCount(tx, {
        organisationId: scope.organisationId,
        venueId: scope.venueId,
        templateId: args.input.templateId ?? null,
        name: args.input.name?.trim() || formatCountName(),
        status: "in_progress",
        scopeType,
        scopeFilter,
        assigneeUserId: args.input.assigneeUserId ?? ctx.userId,
        createdByUserId: ctx.userId,
        startedAt: now,
        isBaseline: !prevCount,
        scheduledAt: now,
      });

      await stockCountsRepo.bulkInsertEntries(
        tx,
        ingredientRows.map((ing) => ({
          countId: count.id,
          ingredientId: ing.id,
          previousCountQty:
            prevByIngredient.get(ing.id) !== undefined
              ? String(prevByIngredient.get(ing.id))
              : null,
          unitUsed: ing.unit,
        })),
      );

      await stockCountsRepo.insertAuditEvent(tx, {
        countId: count.id,
        actorUserId: ctx.userId,
        eventType: "created",
        payload: { scopeType, itemCount: ingredientRows.length },
      });

      return { countId: count.id };
    });

    trackStockCountsEvent("stock_counts.created", {
      venueId: scope.venueId,
      countId,
      scopeType,
    });

    return loadDetail(ctx, scope, countId);
  },

  async patch(
    ctx: RequestAuthContext,
    args: {
      organisationSlug: string;
      venueSlug: string;
      countId: string;
      input: PatchStockCountInput;
    },
  ): Promise<StockCountDetailDto> {
    const scope = await getContext(ctx, args.organisationSlug, args.venueSlug);

    const count = await ctx.appDb.rls((tx) =>
      stockCountsRepo.getCountById(tx, {
        venueId: scope.venueId,
        countId: args.countId,
      }),
    );
    if (!count) {
      throw new StockCountsServiceError("stock_counts.not_found", "Count not found");
    }
    if (count.status === "approved" || count.status === "archived") {
      throw new StockCountsServiceError("stock_counts.locked", "Count is locked");
    }

    if (
      !canRunStockCount(ctx.tenantRoles, scope.organisationId, {
        assigneeUserId: count.assigneeUserId,
        userId: ctx.userId,
      })
    ) {
      throw new StockCountsServiceError(
        "stock_counts.forbidden",
        "You cannot edit this count",
      );
    }

    await ctx.appDb.rls(async (tx) => {
      if (args.input.notes !== undefined) {
        await stockCountsRepo.updateCount(tx, args.countId, {
          notes: args.input.notes,
        });
      }

      for (const entry of args.input.entries ?? []) {
        const resolved = resolveEntryQuantities(entry);
        const countedQty = resolved.countedQty;

        if (countedQty !== null && countedQty !== undefined && countedQty < 0) {
          throw new StockCountsServiceError(
            "stock_counts.negative_quantity",
            "Quantity cannot be negative",
          );
        }

        await stockCountsRepo.upsertEntry(tx, {
          countId: args.countId,
          ingredientId: entry.ingredientId,
          patch: {
            countedQty:
              countedQty !== undefined && countedQty !== null
                ? String(countedQty)
                : undefined,
            unitUsed: entry.unitUsed,
            mixedUnitBreakdown: resolved.mixedUnitBreakdown,
            notes: entry.notes,
            needsVerification: entry.needsVerification,
            isRowComplete: entry.isRowComplete ?? true,
            isSkipped: entry.isSkipped ?? false,
            countedByUserId: ctx.userId,
            countedAt: new Date().toISOString(),
          },
        });

        trackStockCountsEvent("stock_counts.entry_saved", {
          venueId: scope.venueId,
          countId: args.countId,
          ingredientId: entry.ingredientId,
        });
      }
    });

    return loadDetail(ctx, scope, args.countId);
  },

  async action(
    ctx: RequestAuthContext,
    args: {
      organisationSlug: string;
      venueSlug: string;
      countId: string;
      action: string;
      input?: StockCountActionInput;
    },
  ): Promise<StockCountDetailDto> {
    const scope = await getContext(ctx, args.organisationSlug, args.venueSlug);
    const input = args.input ?? {};

    switch (args.action) {
      case "pause":
        return loadDetail(ctx, scope, args.countId);
      case "set-remaining-zero":
        return this.setRemainingZero(ctx, scope, args.countId, input);
      case "submit":
        return this.submit(ctx, scope, args.countId);
      case "approve":
        return this.approve(ctx, scope, args.countId);
      case "reject":
        return this.reject(ctx, scope, args.countId, input.rejectionReason);
      case "request-recount":
        return this.requestRecount(ctx, scope, args.countId, input.entryIdsForRecount);
      case "reopen":
        return this.reopen(ctx, scope, args.countId, input.reopenReason);
      default:
        throw new StockCountsServiceError(
          "stock_counts.invalid_status",
          `Unknown action: ${args.action}`,
        );
    }
  },

  async setRemainingZero(
    ctx: RequestAuthContext,
    scope: Awaited<ReturnType<typeof getContext>>,
    countId: string,
    input: StockCountActionInput,
  ): Promise<StockCountDetailDto> {
    if (!input.confirmBulkZero) {
      throw new StockCountsServiceError(
        "stock_counts.incomplete_submit",
        "Confirm bulk zero to continue",
      );
    }

    await ctx.appDb.rls(async (tx) => {
      const updated = await stockCountsRepo.setRemainingEntriesToZero(tx, countId);
      await stockCountsRepo.insertAuditEvent(tx, {
        countId,
        actorUserId: ctx.userId,
        eventType: "bulk_zero",
        payload: { rowsUpdated: updated },
      });
    });

    return loadDetail(ctx, scope, countId);
  },

  async submit(
    ctx: RequestAuthContext,
    scope: Awaited<ReturnType<typeof getContext>>,
    countId: string,
  ): Promise<StockCountDetailDto> {
    const count = await ctx.appDb.rls((tx) =>
      stockCountsRepo.getCountById(tx, { venueId: scope.venueId, countId }),
    );
    if (!count) {
      throw new StockCountsServiceError("stock_counts.not_found", "Count not found");
    }

    assertValidStatusTransition(count.status as StockCountStatus, "pending_approval");

    const entries = await ctx.appDb.rls((tx) =>
      stockCountsRepo.listEntriesForCount(tx, countId),
    );

    const incomplete = entries.filter(
      (e) => !e.isRowComplete && !e.isSkipped && e.countedQty === null,
    );
    if (incomplete.length > 0) {
      throw new StockCountsServiceError(
        "stock_counts.incomplete_submit",
        `${incomplete.length} ingredients still uncounted`,
      );
    }

    const submittedAt = new Date().toISOString();
    const { prevCount } = await ctx.appDb.rls(async (tx) => {
      const { count: previous } = await stockCountsRepo.getPreviousApprovedEntries(tx, {
        venueId: scope.venueId,
        excludeCountId: countId,
      });

      if (previous?.submittedAt) {
        await consumptionDailyService.refreshWindow(ctx.appDb, {
          venueId: scope.venueId,
          timezone: scope.timezone,
          fromDate: previous.submittedAt.slice(0, 10),
          toDate: submittedAt.slice(0, 10),
        });
      }

      let totalVarianceCents = 0;

      for (const entry of entries) {
        const countedQty = Number(entry.countedQty ?? 0);
        const previousQty =
          entry.previousCountQty !== null
            ? Number(entry.previousCountQty)
            : null;

        let receipts = 0;
        let consumption = 0;
        if (previous && previous.submittedAt) {
          receipts = await stockCountsRepo.sumReceiptsForIngredient(tx, {
            venueId: scope.venueId,
            ingredientId: entry.ingredientId,
            sinceIso: previous.submittedAt,
            untilIso: submittedAt,
          });
          consumption = await stockCountsRepo.sumConsumptionForIngredient(tx, {
            venueId: scope.venueId,
            ingredientId: entry.ingredientId,
            fromDate: previous.submittedAt.slice(0, 10),
            toDate: submittedAt.slice(0, 10),
          });
        }

        const variance = computeVariance({
          previousCountQty: previousQty,
          receiptsBaseUnits: receipts,
          consumptionBaseUnits: consumption,
          countedQty,
          costPerUnitCents: entry.costPerUnitCents,
          isBaseline: count.isBaseline,
          trackVariance: !isNonTrackedCategory(entry.category),
        });

        if (variance.varianceCents !== null) {
          totalVarianceCents += variance.varianceCents;
        }

        await stockCountsRepo.upsertEntry(tx, {
          countId,
          ingredientId: entry.ingredientId,
          patch: {
            expectedQty:
              variance.expectedQty !== null ? String(variance.expectedQty) : null,
            varianceQty:
              variance.varianceQty !== null ? String(variance.varianceQty) : null,
            varianceCents: variance.varianceCents,
          },
        });
      }

      const threshold = await stockCountsRepo.getLargeVarianceThresholdCents(
        tx,
        scope.organisationId,
      );
      const largeVarianceOwnerRequired =
        Math.abs(totalVarianceCents) >= threshold;

      await stockCountsRepo.updateCount(tx, countId, {
        status: "pending_approval",
        submittedAt,
        totalVarianceCents,
        largeVarianceOwnerRequired,
      });

      await stockCountsRepo.insertAuditEvent(tx, {
        countId,
        actorUserId: ctx.userId,
        eventType: "submitted",
        payload: { totalVarianceCents },
      });

      return { prevCount: previous };
    });

    void prevCount;

    trackStockCountsEvent("stock_counts.submitted", {
      venueId: scope.venueId,
      countId,
    });

    return loadDetail(ctx, scope, countId);
  },

  async approve(
    ctx: RequestAuthContext,
    scope: Awaited<ReturnType<typeof getContext>>,
    countId: string,
  ): Promise<StockCountDetailDto> {
    const count = await ctx.appDb.rls((tx) =>
      stockCountsRepo.getCountById(tx, { venueId: scope.venueId, countId }),
    );
    if (!count) {
      throw new StockCountsServiceError("stock_counts.not_found", "Count not found");
    }

    if (count.largeVarianceOwnerRequired) {
      if (!canApproveLargeVarianceStockCount(ctx.tenantRoles, scope.organisationId)) {
        throw new StockCountsServiceError(
          "stock_counts.large_variance_owner_required",
          "Owner approval required for large variance",
        );
      }
    } else if (!canApproveStockCount(ctx.tenantRoles, scope.organisationId)) {
      throw new StockCountsServiceError(
        "stock_counts.forbidden",
        "You cannot approve this count",
      );
    }

    assertValidStatusTransition(count.status as StockCountStatus, "approved");

    await ctx.appDb.rls(async (tx) => {
      const entries = await stockCountsRepo.listEntriesForCount(tx, countId);

      for (const entry of entries) {
        if (entry.countedQty === null) continue;
        await stockCountsRepo.updateIngredientStockLevel(tx, {
          ingredientId: entry.ingredientId,
          qty: Number(entry.countedQty),
        });

        if (entry.varianceQty !== null && entry.varianceCents !== null) {
          await stockCountsRepo.insertVarianceEvents(tx, [
            {
              countId,
              ingredientId: entry.ingredientId,
              varianceQty: String(entry.varianceQty),
              varianceCents: entry.varianceCents,
            },
          ]);
        }
      }

      await stockCountsRepo.updateCount(tx, countId, {
        status: "approved",
        approvedAt: new Date().toISOString(),
        approvedByUserId: ctx.userId,
      });

      await stockCountsRepo.insertAuditEvent(tx, {
        countId,
        actorUserId: ctx.userId,
        eventType: "approved",
      });
    });

    trackStockCountsEvent("stock_counts.approved", { venueId: scope.venueId, countId });

    return loadDetail(ctx, scope, countId);
  },

  async reject(
    ctx: RequestAuthContext,
    scope: Awaited<ReturnType<typeof getContext>>,
    countId: string,
    reason?: string,
  ): Promise<StockCountDetailDto> {
    if (!canApproveStockCount(ctx.tenantRoles, scope.organisationId)) {
      throw new StockCountsServiceError("stock_counts.forbidden", "Forbidden");
    }

    await ctx.appDb.rls(async (tx) => {
      await stockCountsRepo.updateCount(tx, countId, {
        status: "rejected",
        rejectedAt: new Date().toISOString(),
        rejectedByUserId: ctx.userId,
        rejectionReason: reason?.trim() || null,
      });
      await stockCountsRepo.insertAuditEvent(tx, {
        countId,
        actorUserId: ctx.userId,
        eventType: "rejected",
        payload: { reason },
      });
    });

    trackStockCountsEvent("stock_counts.rejected", { venueId: scope.venueId, countId });

    return loadDetail(ctx, scope, countId);
  },

  async requestRecount(
    ctx: RequestAuthContext,
    scope: Awaited<ReturnType<typeof getContext>>,
    countId: string,
    entryIds?: string[],
  ): Promise<StockCountDetailDto> {
    if (!canApproveStockCount(ctx.tenantRoles, scope.organisationId)) {
      throw new StockCountsServiceError("stock_counts.forbidden", "Forbidden");
    }

    await ctx.appDb.rls(async (tx) => {
      await stockCountsRepo.updateCount(tx, countId, {
        status: "in_progress",
      });

      const entries = await stockCountsRepo.listEntriesForCount(tx, countId);
      for (const entry of entries) {
        if (entryIds?.length && !entryIds.includes(entry.id)) continue;
        await stockCountsRepo.upsertEntry(tx, {
          countId,
          ingredientId: entry.ingredientId,
          patch: {
            isRecountRequired: true,
            isRowComplete: false,
          },
        });
      }

      await stockCountsRepo.insertAuditEvent(tx, {
        countId,
        actorUserId: ctx.userId,
        eventType: "recount_requested",
        payload: { entryIds },
      });
    });

    trackStockCountsEvent("stock_counts.recount_requested", {
      venueId: scope.venueId,
      countId,
    });

    return loadDetail(ctx, scope, countId);
  },

  async reopen(
    ctx: RequestAuthContext,
    scope: Awaited<ReturnType<typeof getContext>>,
    countId: string,
    reason?: string,
  ): Promise<StockCountDetailDto> {
    if (!canApproveStockCount(ctx.tenantRoles, scope.organisationId)) {
      throw new StockCountsServiceError("stock_counts.forbidden", "Forbidden");
    }

    await ctx.appDb.rls(async (tx) => {
      await stockCountsRepo.updateCount(tx, countId, {
        status: "in_progress",
        approvedAt: null,
        approvedByUserId: null,
      });
      await stockCountsRepo.insertAuditEvent(tx, {
        countId,
        actorUserId: ctx.userId,
        eventType: "reopened",
        payload: { reason },
      });
    });

    trackStockCountsEvent("stock_counts.reopened", { venueId: scope.venueId, countId });

    return loadDetail(ctx, scope, countId);
  },

  async exportCsv(
    ctx: RequestAuthContext,
    args: {
      organisationSlug: string;
      venueSlug: string;
      countId: string;
    },
  ): Promise<string> {
    const detail = await this.get(ctx, args);
    const header =
      "ingredient,location,previous_qty,counted_qty,expected_qty,variance_qty,variance_dollars,notes";
    const lines = detail.entries.map((e) => {
      const esc = (v: string | number | null) => {
        const s = v === null ? "" : String(v);
        return `"${s.replace(/"/g, '""')}"`;
      };
      return [
        esc(e.ingredientName),
        esc(""),
        esc(e.previousCountQty),
        esc(e.countedQty),
        esc(e.expectedQty),
        esc(e.varianceQty),
        esc(e.varianceCents !== null ? (e.varianceCents / 100).toFixed(2) : null),
        esc(e.notes),
      ].join(",");
    });
    trackStockCountsEvent("stock_counts.export_csv", {
      venueId: (await getContext(ctx, args.organisationSlug, args.venueSlug)).venueId,
      countId: args.countId,
    });
    return [header, ...lines].join("\n");
  },

  async uploadEntryPhoto(
    ctx: RequestAuthContext,
    args: {
      organisationSlug: string;
      venueSlug: string;
      countId: string;
      entryId: string;
      fileName: string;
      mimeType: string;
      bytes: Buffer;
    },
  ): Promise<StockCountDetailDto> {
    const scope = await getContext(ctx, args.organisationSlug, args.venueSlug);
    const count = await ctx.appDb.rls((tx) =>
      stockCountsRepo.getCountById(tx, { venueId: scope.venueId, countId: args.countId }),
    );
    if (!count || count.status === "approved" || count.status === "archived") {
      throw new StockCountsServiceError("stock_counts.locked", "Count is locked");
    }

    const { uploadStockCountPhoto } = await import(
      "@/server/stock-counts/stock-count-storage"
    );

    let publicUrl: string;
    try {
      ({ publicUrl } = await uploadStockCountPhoto({
        venueId: scope.venueId,
        countId: args.countId,
        entryId: args.entryId,
        fileName: args.fileName,
        mimeType: args.mimeType,
        bytes: args.bytes,
      }));
    } catch {
      throw new StockCountsServiceError(
        "stock_counts.photo_upload_failed",
        "Photo upload failed",
      );
    }

    const entries = await ctx.appDb.rls((tx) =>
      stockCountsRepo.listEntriesForCount(tx, args.countId),
    );
    const entry = entries.find((e) => e.id === args.entryId);
    if (!entry) {
      throw new StockCountsServiceError("stock_counts.not_found", "Entry not found");
    }

    const photoUrls = [...(entry.photoUrls?.filter(Boolean) ?? []), publicUrl];

    await ctx.appDb.rls((tx) =>
      stockCountsRepo.upsertEntry(tx, {
        countId: args.countId,
        ingredientId: entry.ingredientId,
        patch: { photoUrls },
      }),
    );

    return loadDetail(ctx, scope, args.countId);
  },
};
