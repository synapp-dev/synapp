import { z } from "zod";

import { WIZARD_ACK_KEYS, WIZARD_STAGE_IDS } from "@/server/inventory-setup/wizard-model";

const stageIdSchema = z.enum(
  WIZARD_STAGE_IDS as unknown as [string, ...string[]],
);

const ackKeySchema = z.enum(
  Object.values(WIZARD_ACK_KEYS) as unknown as [string, ...string[]],
);

export const wizardStatePatchSchema = z
  .object({
    markWelcomeSeen: z.boolean().optional(),
    markIntroSeen: stageIdSchema.optional(),
    setStageAck: z
      .object({ stage: stageIdSchema, value: z.boolean() })
      .optional(),
    setSubStepAck: z
      .object({ key: ackKeySchema, value: z.boolean() })
      .optional(),
  })
  .refine(
    (body) =>
      body.markWelcomeSeen !== undefined ||
      body.markIntroSeen !== undefined ||
      body.setStageAck !== undefined ||
      body.setSubStepAck !== undefined,
    { message: "At least one wizard-state action is required" },
  );

export type WizardStatePatchInput = z.infer<typeof wizardStatePatchSchema>;
