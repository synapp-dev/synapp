import { and, desc, eq, gt, isNull, or } from "drizzle-orm";

import type { RequestAuthContext } from "@/server/auth/context";
import { AuthError } from "@/server/auth/errors";
import { resolveVenueScopeForService } from "@/server/access/require-venue-scope";
import type { AppDb } from "@/server/db/create-app-db";
import { insightsAlerts } from "@/server/db/schema";
import type { InsightsAlertModule, InsightsAlertRow } from "@/entities/insights/model/types";

/** @deprecated Use AuthError */
export class VenueAccessError extends AuthError {}

type InsightsAlertSelect = typeof insightsAlerts.$inferSelect;

function mapAlertRow(row: InsightsAlertSelect): InsightsAlertRow {
  return {
    id: row.id,
    organisationId: row.organisationId,
    venueId: row.venueId ?? "",
    module: row.module as InsightsAlertRow["module"],
    severity: row.severity as InsightsAlertRow["severity"],
    headline: row.headline,
    supportingMetric: row.supportingMetric,
    destinationKey: row.destinationKey,
    destinationPayload:
      row.destinationPayload &&
      typeof row.destinationPayload === "object" &&
      !Array.isArray(row.destinationPayload)
        ? (row.destinationPayload as Record<string, unknown>)
        : null,
    detectedAt: row.detectedAt,
    expiresAt: row.expiresAt,
  };
}

async function resolveVenueContext(
  ctx: RequestAuthContext,
  organisationSlug: string,
  venueSlug: string,
) {
  return resolveVenueScopeForService(ctx, organisationSlug, venueSlug, {
    notFound: (message) => new VenueAccessError(404, message),
    forbidden: (auth) => auth,
  });
}

export async function listInsightsAlertsForVenue(
  ctx: RequestAuthContext,
  args: {
    organisationSlug: string;
    venueSlug: string;
    module?: InsightsAlertModule;
  },
): Promise<{ alerts: InsightsAlertRow[] }> {
  const context = await resolveVenueContext(
    ctx,
    args.organisationSlug,
    args.venueSlug,
  );

  const nowIso = new Date().toISOString();

  const rows = await ctx.appDb.rls(async (tx) => {
    const conditions = [
      eq(insightsAlerts.organisationId, context.organisationId),
      eq(insightsAlerts.venueId, context.venueId),
      isNull(insightsAlerts.dismissedAt),
      or(
        isNull(insightsAlerts.expiresAt),
        gt(insightsAlerts.expiresAt, nowIso),
      ),
    ];

    if (args.module) {
      conditions.push(eq(insightsAlerts.module, args.module));
    }

    return tx
      .select()
      .from(insightsAlerts)
      .where(and(...conditions))
      .orderBy(desc(insightsAlerts.detectedAt));
  });

  return { alerts: rows.map(mapAlertRow) };
}

export async function dismissInsightsAlert(
  ctx: RequestAuthContext,
  args: {
    organisationSlug: string;
    venueSlug: string;
    alertId: string;
  },
): Promise<{ alert: InsightsAlertRow }> {
  const context = await resolveVenueContext(
    ctx,
    args.organisationSlug,
    args.venueSlug,
  );

  const dismissedAt = new Date().toISOString();

  const updated = await ctx.appDb.rls(async (tx) => {
    const rows = await tx
      .update(insightsAlerts)
      .set({
        dismissedAt,
        dismissedBy: ctx.userId,
      })
      .where(
        and(
          eq(insightsAlerts.id, args.alertId),
          eq(insightsAlerts.organisationId, context.organisationId),
          eq(insightsAlerts.venueId, context.venueId),
          isNull(insightsAlerts.dismissedAt),
        ),
      )
      .returning();

    return rows[0] ?? null;
  });

  if (!updated) {
    throw new VenueAccessError(404, "Alert not found");
  }

  return { alert: mapAlertRow(updated) };
}

/**
 * Skeleton writer for forecast anomaly / nightly jobs. Inserts are idempotent per source_run_id when provided.
 */
export async function upsertInsightsAlert(
  appDb: AppDb,
  input: {
    organisationId: string;
    venueId: string;
    module: InsightsAlertModule;
    severity: InsightsAlertRow["severity"];
    headline: string;
    supportingMetric?: string | null;
    destinationKey?: string | null;
    destinationPayload?: Record<string, unknown> | null;
    expiresAt?: string | null;
    sourceRunId?: string | null;
  },
): Promise<void> {
  if (input.sourceRunId) {
    const existing = await appDb.admin
      .select({ id: insightsAlerts.id })
      .from(insightsAlerts)
      .where(
        and(
          eq(insightsAlerts.venueId, input.venueId),
          eq(insightsAlerts.sourceRunId, input.sourceRunId),
        ),
      )
      .limit(1);

    if (existing.length > 0) {
      return;
    }
  }

  await appDb.admin.insert(insightsAlerts).values({
    organisationId: input.organisationId,
    venueId: input.venueId,
    module: input.module,
    severity: input.severity,
    headline: input.headline,
    supportingMetric: input.supportingMetric ?? null,
    destinationKey: input.destinationKey ?? null,
    destinationPayload: input.destinationPayload ?? null,
    expiresAt: input.expiresAt ?? null,
    sourceRunId: input.sourceRunId ?? null,
  });
}
