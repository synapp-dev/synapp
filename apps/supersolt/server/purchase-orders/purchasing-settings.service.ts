import { canManageIntegrations } from "@/server/auth/capabilities";
import type { RequestAuthContext } from "@/server/auth/context";
import { resolveOrganisationIdBySlug } from "@/server/auth/rbac";
import { organisationPurchasingSettings } from "@/server/db/schema";
import { PurchaseOrdersServiceError } from "./purchase-orders.service";
import { purchaseOrdersRepo } from "./purchase-orders.repo";

export type PurchasingSettingsDto = {
  defaultBufferPercent: number;
  poApprovalThresholdCents: number;
  gstTreatment: string;
  poEmailTemplate: string | null;
};

export type UpdatePurchasingSettingsInput = {
  poApprovalThresholdCents?: number;
  poEmailTemplate?: string | null;
};

function requireOrgAdmin(ctx: RequestAuthContext, organisationSlug: string): string {
  const organisationId = resolveOrganisationIdBySlug(ctx.tenantRoles, organisationSlug);
  if (!organisationId) {
    throw new PurchaseOrdersServiceError(404, "Organisation not found");
  }
  if (!canManageIntegrations(ctx.tenantRoles, organisationId)) {
    throw new PurchaseOrdersServiceError(
      403,
      "Only organisation admins can manage purchasing settings",
    );
  }
  return organisationId;
}

export const purchasingSettingsService = {
  async get(
    ctx: RequestAuthContext,
    args: { organisationSlug: string },
  ): Promise<PurchasingSettingsDto> {
    const organisationId = resolveOrganisationIdBySlug(
      ctx.tenantRoles,
      args.organisationSlug,
    );
    if (!organisationId) {
      throw new PurchaseOrdersServiceError(404, "Organisation not found");
    }
    return ctx.appDb.rls((tx) =>
      purchaseOrdersRepo.getPurchasingSettings(tx, organisationId),
    );
  },

  async update(
    ctx: RequestAuthContext,
    args: { organisationSlug: string; input: UpdatePurchasingSettingsInput },
  ): Promise<PurchasingSettingsDto> {
    const organisationId = requireOrgAdmin(ctx, args.organisationSlug);
    const { input } = args;

    if (
      input.poApprovalThresholdCents !== undefined &&
      (!Number.isInteger(input.poApprovalThresholdCents) ||
        input.poApprovalThresholdCents < 0)
    ) {
      throw new PurchaseOrdersServiceError(
        400,
        "Approval threshold must be a non-negative integer amount in cents",
      );
    }
    if (
      input.poEmailTemplate !== undefined &&
      input.poEmailTemplate !== null &&
      input.poEmailTemplate.length > 10000
    ) {
      throw new PurchaseOrdersServiceError(400, "Email template is too long");
    }

    // organisation_purchasing_settings has a select-only RLS policy; writes go
    // through the admin client behind the org-admin capability gate above.
    await ctx.appDb.admin
      .insert(organisationPurchasingSettings)
      .values({
        organisationId,
        ...(input.poApprovalThresholdCents !== undefined
          ? { poApprovalThresholdCents: input.poApprovalThresholdCents }
          : {}),
        ...(input.poEmailTemplate !== undefined
          ? { poEmailTemplate: input.poEmailTemplate }
          : {}),
        updatedAt: new Date().toISOString(),
      })
      .onConflictDoUpdate({
        target: organisationPurchasingSettings.organisationId,
        set: {
          ...(input.poApprovalThresholdCents !== undefined
            ? { poApprovalThresholdCents: input.poApprovalThresholdCents }
            : {}),
          ...(input.poEmailTemplate !== undefined
            ? { poEmailTemplate: input.poEmailTemplate }
            : {}),
          updatedAt: new Date().toISOString(),
        },
      });

    return this.get(ctx, { organisationSlug: args.organisationSlug });
  },
};
