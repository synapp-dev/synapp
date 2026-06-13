import type { RequestAuthContext } from "@/server/auth/context";
import { AuthError } from "@/server/auth/errors";
import { resolveVenueScopeForService } from "@/server/access/require-venue-scope";
import { assertInventorySetupWriteAccess } from "@/server/inventory-setup/inventory-setup-auth";
import { inventorySetupWizardStateRepo } from "@/server/inventory-setup/inventory-setup-wizard-state.repo";
import {
  applyWizardStatePatch,
  type InventorySetupWizardState,
  type WizardStatePatch,
} from "@/server/inventory-setup/wizard-model";

export class WizardStateServiceError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function mapAuthError(error: unknown): never {
  if (error instanceof AuthError) {
    throw new WizardStateServiceError(error.status, error.message);
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
      notFound: (message) => new WizardStateServiceError(404, message),
      forbidden: (auth) => new WizardStateServiceError(auth.status, auth.message),
    });
  } catch (error) {
    mapAuthError(error);
  }
}

export const wizardStateService = {
  async patch(
    ctx: RequestAuthContext,
    args: {
      organisationSlug: string;
      venueSlug: string;
      patch: WizardStatePatch;
    },
  ): Promise<InventorySetupWizardState> {
    const scope = await resolveScope(
      ctx,
      args.organisationSlug,
      args.venueSlug,
    );

    assertInventorySetupWriteAccess(ctx.tenantRoles, {
      organisationId: scope.organisationId,
      venueId: scope.venueId,
    });

    const stamp = { at: new Date().toISOString(), by: ctx.userId };

    const next = await ctx.appDb.rls(async (tx) => {
      const current = await inventorySetupWizardStateRepo.getForVenue(
        tx,
        scope.venueId,
      );
      const updated = applyWizardStatePatch(current, args.patch, stamp);
      await inventorySetupWizardStateRepo.setForVenue(tx, scope.venueId, updated);
      return updated;
    });

    if (args.patch.markWelcomeSeen !== undefined) {
      console.info("[inventory-setup-wizard] welcome_seen", {
        venueId: scope.venueId,
        userId: ctx.userId,
        value: args.patch.markWelcomeSeen,
      });
    }
    if (args.patch.markIntroSeen) {
      console.info("[inventory-setup-wizard] intro_seen", {
        venueId: scope.venueId,
        userId: ctx.userId,
        stageId: args.patch.markIntroSeen,
      });
    }
    if (args.patch.setSubStepAck) {
      console.info("[inventory-setup-wizard] substep_acked", {
        venueId: scope.venueId,
        userId: ctx.userId,
        key: args.patch.setSubStepAck.key,
        value: args.patch.setSubStepAck.value,
      });
    }
    if (args.patch.setStageAck) {
      console.info("[inventory-setup-wizard] stage_confirmed", {
        venueId: scope.venueId,
        userId: ctx.userId,
        stage: args.patch.setStageAck.stage,
        value: args.patch.setStageAck.value,
      });
    }

    return next;
  },
};
