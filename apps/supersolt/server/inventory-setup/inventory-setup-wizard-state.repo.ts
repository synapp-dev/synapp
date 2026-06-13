import { eq } from "drizzle-orm";

import type { RlsTx } from "@/server/db/drizzle";
import { venues } from "@/server/db/schema";
import {
  EMPTY_WIZARD_STATE,
  type InventorySetupWizardState,
} from "@/server/inventory-setup/wizard-model";

function normalise(value: unknown): InventorySetupWizardState {
  const raw = (value ?? {}) as Partial<InventorySetupWizardState>;
  return {
    welcomeSeen: raw.welcomeSeen === true,
    introSeen: Array.isArray(raw.introSeen) ? raw.introSeen : [],
    stageAcks:
      raw.stageAcks && typeof raw.stageAcks === "object" ? raw.stageAcks : {},
    subStepAcks:
      raw.subStepAcks && typeof raw.subStepAcks === "object"
        ? raw.subStepAcks
        : {},
  };
}

export const inventorySetupWizardStateRepo = {
  async getForVenue(
    tx: RlsTx,
    venueId: string,
  ): Promise<InventorySetupWizardState> {
    const rows = await tx
      .select({ state: venues.inventorySetupWizardState })
      .from(venues)
      .where(eq(venues.id, venueId))
      .limit(1);
    if (rows.length === 0) return { ...EMPTY_WIZARD_STATE };
    return normalise(rows[0]?.state);
  },

  async setForVenue(
    tx: RlsTx,
    venueId: string,
    state: InventorySetupWizardState,
  ): Promise<void> {
    await tx
      .update(venues)
      .set({ inventorySetupWizardState: state })
      .where(eq(venues.id, venueId));
  },
};
