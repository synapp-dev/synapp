"use client";

import { useCallback, useEffect, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import {
  SANDBOX_PRESET_QUERY_KEY,
  SANDBOX_SCENARIO_QUERY_KEY,
  SANDBOX_STEP_QUERY_KEY,
} from "@/lib/sandbox/scenario-url/constants";
import { readSandboxUrlState } from "@/lib/sandbox/scenario-url/normalize-sandbox-scenario-query";

export type UseSandboxUrlStateOptions = {
  /** When empty, `scenario` is omitted from the URL and `scenarioId` is always `""`. */
  scenarioIds: readonly string[];
  defaultScenarioId: string;
  /** Inclusive max step index (0-based). */
  maxStepIndex: number;
  /** When provided, `preset` query is managed and normalized. */
  presetIds?: readonly string[];
  defaultPresetId?: string;
};

export type SandboxUrlApi = {
  scenarioId: string;
  stepIndex: number;
  presetId: string;
  setScenarioId: (id: string) => void;
  setStepIndex: (index: number) => void;
  setPresetId: (id: string) => void;
  nextStep: () => void;
  prevStep: () => void;
};

export function useSandboxUrlState(
  opts: UseSandboxUrlStateOptions,
): SandboxUrlApi {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const manageScenario = opts.scenarioIds.length > 0;
  const managesPreset = Boolean(opts.presetIds?.length);
  const defaultPresetId =
    opts.defaultPresetId ?? opts.presetIds?.[0] ?? "default";
  const validPresetIds = useMemo(
    () => opts.presetIds ?? [],
    [opts.presetIds],
  );

  const readInput = useMemo(
    () => ({
      searchParams,
      scenarioIds: opts.scenarioIds,
      defaultScenarioId: opts.defaultScenarioId,
      maxStepIndex: opts.maxStepIndex,
      presetIds: opts.presetIds,
      defaultPresetId: opts.defaultPresetId,
    }),
    [
      searchParams,
      opts.scenarioIds,
      opts.defaultScenarioId,
      opts.maxStepIndex,
      opts.presetIds,
      opts.defaultPresetId,
    ],
  );

  const urlState = useMemo(
    () => readSandboxUrlState(readInput),
    [readInput],
  );

  const { scenarioId, stepIndex, presetId } = urlState;

  const replaceScenarioStepPreset = useCallback(
    (nextScenario: string, nextStep: number, nextPreset: string) => {
      const sp = new URLSearchParams(searchParams.toString());
      const sid = opts.scenarioIds.includes(nextScenario)
        ? nextScenario
        : opts.defaultScenarioId;
      sp.set(SANDBOX_SCENARIO_QUERY_KEY, sid);
      const clamped = Math.max(0, Math.min(opts.maxStepIndex, nextStep));
      sp.set(SANDBOX_STEP_QUERY_KEY, String(clamped));
      if (managesPreset) {
        const pid = validPresetIds.includes(nextPreset)
          ? nextPreset
          : defaultPresetId;
        sp.set(SANDBOX_PRESET_QUERY_KEY, pid);
      } else {
        sp.delete(SANDBOX_PRESET_QUERY_KEY);
      }
      router.replace(`${pathname}?${sp.toString()}`, { scroll: false });
    },
    [
      searchParams,
      router,
      pathname,
      opts.scenarioIds,
      opts.defaultScenarioId,
      opts.maxStepIndex,
      managesPreset,
      validPresetIds,
      defaultPresetId,
    ],
  );

  const replaceStepPreset = useCallback(
    (nextStep: number, nextPreset: string) => {
      const sp = new URLSearchParams(searchParams.toString());
      sp.delete(SANDBOX_SCENARIO_QUERY_KEY);
      const clamped = Math.max(0, Math.min(opts.maxStepIndex, nextStep));
      sp.set(SANDBOX_STEP_QUERY_KEY, String(clamped));
      if (managesPreset) {
        const pid = validPresetIds.includes(nextPreset)
          ? nextPreset
          : defaultPresetId;
        sp.set(SANDBOX_PRESET_QUERY_KEY, pid);
      } else {
        sp.delete(SANDBOX_PRESET_QUERY_KEY);
      }
      router.replace(`${pathname}?${sp.toString()}`, { scroll: false });
    },
    [
      searchParams,
      router,
      pathname,
      opts.maxStepIndex,
      managesPreset,
      validPresetIds,
      defaultPresetId,
    ],
  );

  useEffect(() => {
    const normalized = readSandboxUrlState(readInput);
    if (normalized.didNormalize) {
      router.replace(`${pathname}?${normalized.canonicalQuery}`, {
        scroll: false,
      });
    }
  }, [readInput, router, pathname]);

  const setScenarioId = useCallback(
    (id: string) => {
      if (!manageScenario) return;
      replaceScenarioStepPreset(id, 0, defaultPresetId);
    },
    [manageScenario, replaceScenarioStepPreset, defaultPresetId],
  );

  const setStepIndex = useCallback(
    (index: number) => {
      if (manageScenario) {
        replaceScenarioStepPreset(scenarioId, index, presetId);
      } else {
        replaceStepPreset(index, presetId);
      }
    },
    [
      manageScenario,
      scenarioId,
      presetId,
      replaceScenarioStepPreset,
      replaceStepPreset,
    ],
  );

  const setPresetId = useCallback(
    (id: string) => {
      if (manageScenario) {
        replaceScenarioStepPreset(scenarioId, stepIndex, id);
      } else {
        replaceStepPreset(stepIndex, id);
      }
    },
    [
      manageScenario,
      scenarioId,
      stepIndex,
      replaceScenarioStepPreset,
      replaceStepPreset,
    ],
  );

  const nextStep = useCallback(() => {
    if (manageScenario) {
      replaceScenarioStepPreset(scenarioId, stepIndex + 1, presetId);
    } else {
      replaceStepPreset(stepIndex + 1, presetId);
    }
  }, [
    manageScenario,
    scenarioId,
    stepIndex,
    presetId,
    replaceScenarioStepPreset,
    replaceStepPreset,
  ]);

  const prevStep = useCallback(() => {
    if (manageScenario) {
      replaceScenarioStepPreset(scenarioId, stepIndex - 1, presetId);
    } else {
      replaceStepPreset(stepIndex - 1, presetId);
    }
  }, [
    manageScenario,
    scenarioId,
    stepIndex,
    presetId,
    replaceScenarioStepPreset,
    replaceStepPreset,
  ]);

  return {
    scenarioId,
    stepIndex,
    presetId,
    setScenarioId,
    setStepIndex,
    setPresetId,
    nextStep,
    prevStep,
  };
}
