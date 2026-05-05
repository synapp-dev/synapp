"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { useRegisterSandboxRightSidebar } from "@/components/organisms/sandbox-right-sidebar-provider";
import type { SandboxUrlApi } from "@/lib/sandbox/use-sandbox-url-state";
import { Button } from "@workspace/ui/components/button";
import { Label } from "@workspace/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";

import { EligibilityDock } from "./eligibility-dock";
import type { EligibilityState } from "./fixtures";
import type { SandboxScenarioOption, SandboxStepOption } from "../shell/sandbox-shell";

const ONBOARDING_PRESET_IDS = ["default"] as const;

type Props = {
  api: SandboxUrlApi;
  scenarios: readonly SandboxScenarioOption[];
  steps: readonly SandboxStepOption[];
  eligibility: EligibilityState;
  setEligibility: (v: EligibilityState) => void;
  beforeManualNavigate: () => void;
};

export function OnboardingSandboxRightSidebar({
  api,
  scenarios,
  steps,
  eligibility,
  setEligibility,
  beforeManualNavigate,
}: Props) {
  const atFirst = api.stepIndex <= 0;
  const atLast = api.stepIndex >= steps.length - 1;

  return (
    useRegisterSandboxRightSidebar(
      () => (
      <div className="flex flex-col gap-3 px-2 py-2">
        <div>
          <h2 className="text-sm font-semibold tracking-tight">Onboarding</h2>
          <p className="text-[11px] text-muted-foreground">
            Scenario, step, and eligibility preview (former dock controls).
          </p>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Scenario</Label>
          <Select
            value={api.scenarioId}
            onValueChange={(v) => {
              beforeManualNavigate();
              api.setScenarioId(v);
            }}
          >
            <SelectTrigger className="h-9 text-xs">
              <SelectValue placeholder="Scenario" />
            </SelectTrigger>
            <SelectContent>
              {scenarios.map((s) => (
                <SelectItem key={s.id} value={s.id} className="text-xs">
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Preset</Label>
          <Select
            value={api.presetId}
            onValueChange={(v) => {
              beforeManualNavigate();
              api.setPresetId(v);
            }}
          >
            <SelectTrigger className="h-9 text-xs">
              <SelectValue placeholder="Preset" />
            </SelectTrigger>
            <SelectContent>
              {ONBOARDING_PRESET_IDS.map((id) => (
                <SelectItem key={id} value={id} className="text-xs">
                  Default
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <EligibilityDock
          value={eligibility}
          onChange={(v) => {
            beforeManualNavigate();
            setEligibility(v);
          }}
        />

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0 gap-1"
            disabled={atFirst}
            onClick={() => {
              beforeManualNavigate();
              api.prevStep();
            }}
            aria-label="Previous step"
          >
            <ChevronLeft className="size-4" />
            Prev
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0 gap-1"
            disabled={atLast}
            onClick={() => {
              beforeManualNavigate();
              api.nextStep();
            }}
            aria-label="Next step"
          >
            Next
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>
    ),
    [
      api.scenarioId,
      api.stepIndex,
      api.presetId,
      api.setScenarioId,
      api.setStepIndex,
      api.setPresetId,
      api.nextStep,
      api.prevStep,
      scenarios,
      steps,
      atFirst,
      atLast,
      eligibility,
      setEligibility,
      beforeManualNavigate,
    ],
    ) ?? null
  );
}
