"use client";

import * as React from "react";

import { cn } from "@workspace/ui/lib/utils";

import { useSandboxUrlState } from "@/lib/sandbox/use-sandbox-url-state";

export type SandboxScenarioOption = { id: string; label: string };
export type SandboxStepOption = { id: string; label: string };

export type SandboxShellProps = {
  title: string;
  /** When empty or omitted, `scenario` is omitted from the URL (`scenarioId` is `""`). */
  scenarios?: readonly SandboxScenarioOption[];
  defaultScenarioId?: string;
  steps: readonly SandboxStepOption[];
  presetIds?: readonly string[];
  defaultPresetId?: string;
  /** Called before J/K keyboard step changes (e.g. cancel sandbox automate). */
  onManualNavigate?: () => void;
  children: (api: {
    scenarioId: string;
    stepIndex: number;
    presetId: string;
    setScenarioId: (id: string) => void;
    setStepIndex: (index: number) => void;
    setPresetId: (id: string) => void;
    nextStep: () => void;
    prevStep: () => void;
  }) => React.ReactNode;
};

export function SandboxShell({
  title,
  scenarios,
  defaultScenarioId,
  steps,
  presetIds,
  defaultPresetId,
  onManualNavigate,
  children,
}: SandboxShellProps) {
  const scenarioList = scenarios ?? [];
  const scenarioIds = React.useMemo(
    () => scenarioList.map((s) => s.id),
    [scenarioList],
  );
  const resolvedDefaultScenarioId =
    scenarioList.length > 0 ? (defaultScenarioId ?? "") : "";

  const api = useSandboxUrlState({
    defaultScenarioId: resolvedDefaultScenarioId,
    scenarioIds,
    maxStepIndex: Math.max(0, steps.length - 1),
    presetIds,
    defaultPresetId,
  });

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }
      if (e.key === "j" || e.key === "J") {
        e.preventDefault();
        onManualNavigate?.();
        api.nextStep();
      }
      if (e.key === "k" || e.key === "K") {
        e.preventDefault();
        onManualNavigate?.();
        api.prevStep();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [api, onManualNavigate]);

  React.useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      // eslint-disable-next-line no-console -- sandbox dev aid only
      console.debug("[sandbox]", title, {
        ...(scenarioList.length > 0 ? { scenario: api.scenarioId } : {}),
        step: api.stepIndex,
        preset: api.presetId,
      });
    }
  }, [title, scenarioList.length, api.scenarioId, api.stepIndex, api.presetId]);

  const currentStepLabel = steps[api.stepIndex]?.label ?? "—";

  return (
    <div className="relative">
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        <p className="text-xs text-muted-foreground sm:text-right">
          Step {api.stepIndex + 1} / {steps.length}:{" "}
          <span className="font-medium text-foreground">{currentStepLabel}</span>
          <span className="hidden sm:inline"> · </span>
          <span className="hidden sm:inline">Shortcuts: J next · K prev</span>
        </p>
      </div>

      <div
        className={cn(
          "mb-4 rounded-lg border border-dashed px-3 py-2 text-xs",
          "border-amber-500/45 bg-amber-500/[0.06] text-amber-100/90",
        )}
        role="note"
      >
        Sandbox — no real matchmaking, OAuth, Discord bot, or database writes.
      </div>

      <div className="min-h-[320px]">{children(api)}</div>
    </div>
  );
}
