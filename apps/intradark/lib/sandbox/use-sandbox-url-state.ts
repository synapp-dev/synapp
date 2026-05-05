"use client";

import { useCallback, useEffect, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import {
  SANDBOX_PRESET_QUERY_KEY,
  SANDBOX_SCENARIO_QUERY_KEY,
  SANDBOX_STEP_QUERY_KEY,
} from "@/lib/sandbox/scenario-url/constants";
import {
  normalizeSandboxScenarioQuery,
  normalizeStepPresetQuery,
} from "@/lib/sandbox/scenario-url/normalize-sandbox-scenario-query";

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

function clampStepIndex(raw: string | null, maxStepIndex: number): number {
  if (raw == null) return 0;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(maxStepIndex, Math.floor(n)));
}

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
  const validPresetIds = opts.presetIds ?? [];

  const scenarioFromUrl = searchParams.get(SANDBOX_SCENARIO_QUERY_KEY);
  const stepFromUrl = searchParams.get(SANDBOX_STEP_QUERY_KEY);
  const presetFromUrl = searchParams.get(SANDBOX_PRESET_QUERY_KEY);

  const scenarioId = useMemo(() => {
    if (!manageScenario) return "";
    if (scenarioFromUrl && opts.scenarioIds.includes(scenarioFromUrl)) {
      return scenarioFromUrl;
    }
    return opts.defaultScenarioId;
  }, [
    manageScenario,
    scenarioFromUrl,
    opts.defaultScenarioId,
    opts.scenarioIds,
  ]);

  const stepIndex = useMemo(() => {
    return clampStepIndex(stepFromUrl, opts.maxStepIndex);
  }, [stepFromUrl, opts.maxStepIndex]);

  const presetId = useMemo(() => {
    if (!managesPreset) return defaultPresetId;
    if (presetFromUrl && validPresetIds.includes(presetFromUrl)) {
      return presetFromUrl;
    }
    return defaultPresetId;
  }, [
    managesPreset,
    presetFromUrl,
    validPresetIds,
    defaultPresetId,
  ]);

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
    if (!managesPreset) {
      const sp = new URLSearchParams(searchParams.toString());
      let needsFix = false;
      const rawScenario = searchParams.get(SANDBOX_SCENARIO_QUERY_KEY);
      const rawStep = searchParams.get(SANDBOX_STEP_QUERY_KEY);
      if (manageScenario && rawScenario && !opts.scenarioIds.includes(rawScenario)) {
        sp.set(SANDBOX_SCENARIO_QUERY_KEY, opts.defaultScenarioId);
        sp.set(SANDBOX_STEP_QUERY_KEY, "0");
        needsFix = true;
      } else if (rawStep !== null) {
        const n = Number.parseInt(rawStep, 10);
        const clamped = Math.max(
          0,
          Math.min(opts.maxStepIndex, Number.isFinite(n) ? Math.floor(n) : 0),
        );
        if (!Number.isFinite(n) || clamped !== n) {
          sp.set(SANDBOX_STEP_QUERY_KEY, String(clamped));
          needsFix = true;
        }
      }
      if (needsFix) {
        router.replace(`${pathname}?${sp.toString()}`, { scroll: false });
      }
      return;
    }

    if (!manageScenario) {
      const normalized = normalizeStepPresetQuery({
        searchParams,
        maxStepIndex: opts.maxStepIndex,
        defaultPresetId,
        validPresetIds,
      });
      if (normalized.didNormalize) {
        router.replace(`${pathname}?${normalized.canonicalQuery}`, {
          scroll: false,
        });
      }
      return;
    }

    const normalized = normalizeSandboxScenarioQuery({
      searchParams,
      defaultScenarioId: opts.defaultScenarioId,
      scenarioIds: opts.scenarioIds,
      maxStepIndex: opts.maxStepIndex,
      defaultPresetId,
      validPresetIds,
    });
    if (normalized.didNormalize) {
      router.replace(`${pathname}?${normalized.canonicalQuery}`, {
        scroll: false,
      });
    }
  }, [
    managesPreset,
    manageScenario,
    searchParams,
    router,
    pathname,
    opts.scenarioIds,
    opts.defaultScenarioId,
    opts.maxStepIndex,
    defaultPresetId,
    validPresetIds,
  ]);

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
