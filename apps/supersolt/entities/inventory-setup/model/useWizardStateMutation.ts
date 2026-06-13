"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { inventorySetupApi } from "@/entities/inventory-setup/api/endpoints";
import { inventorySetupKeys } from "@/entities/inventory-setup/model/keys";
import type {
  InventorySetupProgress,
  WizardStatePatchInput,
} from "@/entities/inventory-setup/model/types";

type ScopedInput = {
  organisationSlug: string;
  venueSlug: string;
};

/**
 * Optimistically reflects a wizard-state patch in the cached progress model,
 * then reconciles with the authoritative server model on settle. Rolls back
 * on error. Full lock/staleness recomputation is left to the server.
 */
function applyOptimistic(
  progress: InventorySetupProgress,
  patch: WizardStatePatchInput,
): InventorySetupProgress {
  if (patch.markWelcomeSeen !== undefined) {
    return {
      ...progress,
      wizard: { ...progress.wizard, welcomeSeen: patch.markWelcomeSeen },
    };
  }
  const stages = progress.wizard.stages.map((stage) => {
    let next = stage;
    if (patch.markIntroSeen && stage.id === patch.markIntroSeen) {
      next = { ...next, introSeen: true };
    }
    if (patch.setSubStepAck) {
      const subSteps = next.subSteps.map((s) =>
        s.key === patch.setSubStepAck!.key
          ? { ...s, complete: patch.setSubStepAck!.value }
          : s,
      );
      if (subSteps !== next.subSteps) {
        next = {
          ...next,
          subSteps,
          complete: subSteps.every((s) => s.complete),
        };
      }
    }
    return next;
  });
  return { ...progress, wizard: { ...progress.wizard, stages } };
}

export function useWizardStateMutation(scoped: ScopedInput) {
  const queryClient = useQueryClient();
  const progressKey = inventorySetupKeys.progress(
    scoped.organisationSlug,
    scoped.venueSlug,
  );

  return useMutation({
    mutationFn: async (patch: WizardStatePatchInput) => {
      const { data, error } = await inventorySetupApi.patch.wizardState({
        ...scoped,
        patch,
      });
      if (error) throw new Error(error.message);
      return data;
    },
    onMutate: async (patch) => {
      await queryClient.cancelQueries({ queryKey: progressKey });
      const previous =
        queryClient.getQueryData<InventorySetupProgress>(progressKey);
      if (previous) {
        queryClient.setQueryData<InventorySetupProgress>(
          progressKey,
          applyOptimistic(previous, patch),
        );
      }
      return { previous };
    },
    onError: (_error, _patch, context) => {
      if (context?.previous) {
        queryClient.setQueryData(progressKey, context.previous);
      }
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: progressKey });
    },
  });
}
