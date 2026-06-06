"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { useRegisterSandboxRightSidebar } from "@/components/organisms/sandbox-right-sidebar-provider";
import {
  MOCK_TEAM_NORTH,
  useMatchLobbyMock,
} from "@/entities/match-lobby";
import { createAutomateController } from "@/lib/sandbox/create-automate-controller";
import type { SandboxUrlApi } from "@/lib/sandbox/use-sandbox-url-state";
import { Button } from "@workspace/ui/components/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@workspace/ui/components/accordion";
import { Label } from "@workspace/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Switch } from "@workspace/ui/components/switch";
import { cn } from "@workspace/ui/lib/utils";

import { buildPugQuickTourSteps, presetSupportsAutomate } from "./pug-automate-sequence";
import { usePugPlayout } from "./pug-playout-context";
import {
  PUG_DEFAULT_PRESET_ID,
  PUG_PRESETS,
  type PugPresetId,
} from "./pug-preset-registry";
import type { SandboxStepOption } from "../shell/sandbox-shell";

type Props = {
  api: SandboxUrlApi;
  steps: readonly SandboxStepOption[];
  assignAutomateCancel: (fn: (() => void) | null) => void;
  beforeManualNavigate: () => void;
};

function PhaseLevers({ stepIndex }: { stepIndex: number }) {
  const lobby = useMatchLobbyMock();
  const playout = usePugPlayout();
  const firstNorthId = MOCK_TEAM_NORTH.players[0]?.id;

  if (stepIndex === 3) {
    return (
      <div className="space-y-3 text-xs">
        <div className="flex items-center justify-between gap-2">
          <Label htmlFor="pug-accept-one-declines" className="text-xs font-normal">
            One player declines
          </Label>
          <Switch
            id="pug-accept-one-declines"
            checked={playout.acceptOneDeclines}
            onCheckedChange={playout.setAcceptOneDeclines}
          />
        </div>
        <p className="text-[11px] text-muted-foreground">
          Drives the dodge / cancel card on the accept roster (replaces the old
          URL scenario switch).
        </p>
      </div>
    );
  }

  if (stepIndex === 4) {
    return (
      <div className="space-y-2 text-xs">
        <p className="text-muted-foreground">
          Voice assignment: {lobby.assignmentAssigned} / {lobby.assignmentTotal}
        </p>
        {firstNorthId ? (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="w-full text-xs"
            onClick={() => lobby.toggleDiscordJoined(firstNorthId)}
          >
            Toggle first North player (Discord)
          </Button>
        ) : null}
      </div>
    );
  }

  if (stepIndex === 5) {
    return (
      <div className="space-y-3 text-xs">
        <div className="flex items-center justify-between gap-2">
          <Label htmlFor="pug-server-stall" className="text-xs font-normal">
            Simulate server stall first
          </Label>
          <Switch
            id="pug-server-stall"
            checked={playout.serverSimulateStall}
            onCheckedChange={playout.setServerSimulateStall}
          />
        </div>
        <p className="text-muted-foreground">
          On server: {lobby.serverAssigned} / {lobby.serverTotal}
        </p>
        {firstNorthId ? (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="w-full text-xs"
            onClick={() => lobby.toggleServerJoined(firstNorthId)}
          >
            Toggle first North player (server)
          </Button>
        ) : null}
      </div>
    );
  }

  return (
    <p className="text-xs text-muted-foreground">
      No extra mock levers for this step.
    </p>
  );
}

export function PugSystemSandboxRightSidebar({
  api,
  steps,
  assignAutomateCancel,
  beforeManualNavigate,
}: Props) {
  const [autoState, setAutoState] = React.useState<"idle" | "running">("idle");

  const ctl = React.useMemo(
    () =>
      createAutomateController({
        steps: [],
        onState: setAutoState,
        onComplete: () => setAutoState("idle"),
      }),
    [],
  );

  React.useLayoutEffect(() => {
    assignAutomateCancel(() => {
      ctl.cancel();
    });
    return () => {
      assignAutomateCancel(null);
    };
  }, [assignAutomateCancel, ctl]);

  React.useEffect(() => () => ctl.dispose(), [ctl]);

  const atFirst = api.stepIndex <= 0;
  const atLast = api.stepIndex >= steps.length - 1;

  const resolvedPreset: PugPresetId = PUG_PRESETS.some((p) => p.id === api.presetId)
    ? (api.presetId as PugPresetId)
    : PUG_DEFAULT_PRESET_ID;
  const unknownPreset = !PUG_PRESETS.some((p) => p.id === api.presetId);

  const runQuickTour = React.useCallback(() => {
    ctl.start([...buildPugQuickTourSteps(api)]);
  }, [api, ctl]);

  return (
    useRegisterSandboxRightSidebar(
      () => (
        <div className="flex flex-col gap-3 px-2 py-2">
          <div>
            <h2 className="text-sm font-semibold tracking-tight">
              Scenario configurator
            </h2>
            <p className="font-mono text-[11px] text-muted-foreground">pug-system</p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Preset bundles shareable via URL; match branch is driven by phase
              levers.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Preset</Label>
            <Select
              value={resolvedPreset}
              onValueChange={(v) => {
                beforeManualNavigate();
                api.setPresetId(v);
              }}
            >
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Preset" />
              </SelectTrigger>
              <SelectContent>
                {PUG_PRESETS.map((p) => (
                  <SelectItem key={p.id} value={p.id} className="text-xs">
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {unknownPreset ? (
              <p className="text-[11px] text-muted-foreground">
                Unknown preset in URL — using{" "}
                <span className="font-medium text-foreground">Default</span>.
              </p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Step</Label>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="size-9 shrink-0"
                disabled={atFirst}
                onClick={() => {
                  beforeManualNavigate();
                  api.prevStep();
                }}
                aria-label="Previous step"
              >
                <ChevronLeft className="size-4" />
              </Button>
              <Select
                value={String(api.stepIndex)}
                onValueChange={(v) => {
                  beforeManualNavigate();
                  api.setStepIndex(Number.parseInt(v, 10));
                }}
              >
                <SelectTrigger className="h-9 flex-1 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {steps.map((st, idx) => (
                    <SelectItem key={st.id} value={String(idx)} className="text-xs">
                      {idx + 1}. {st.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="size-9 shrink-0"
                disabled={atLast}
                onClick={() => {
                  beforeManualNavigate();
                  api.nextStep();
                }}
                aria-label="Next step"
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>

          <div>
            <Label className="mb-1.5 block text-xs">Phases (this step)</Label>
            <Accordion
              key={api.stepIndex}
              type="single"
              collapsible
              defaultValue="phase-0"
              className="w-full"
            >
              <AccordionItem value="phase-0" className="border-border/60">
                <AccordionTrigger className="py-2 text-xs">
                  Mock levers
                </AccordionTrigger>
                <AccordionContent className="pb-2 pt-0">
                  <PhaseLevers stepIndex={api.stepIndex} />
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>

          {presetSupportsAutomate(resolvedPreset) ? (
            <div className="flex flex-col gap-2 rounded-md border border-border/60 bg-muted/20 p-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium">
                  Automate{" "}
                  <span
                    className={cn(
                      "font-normal text-muted-foreground",
                      autoState === "running" && "text-amber-200",
                    )}
                  >
                    {autoState === "running" ? "· Running" : "· Idle"}
                  </span>
                </span>
                {autoState === "running" ? (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => ctl.cancel()}
                  >
                    Cancel
                  </Button>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={runQuickTour}
                  >
                    Run
                  </Button>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground">
                Uses current sidebar levers; step or preset changes cancel the
                run.
              </p>
            </div>
          ) : null}
        </div>
      ),
      [
        api.stepIndex,
        api.presetId,
        api.setStepIndex,
        api.setPresetId,
        api.nextStep,
        api.prevStep,
        steps,
        atFirst,
        atLast,
        unknownPreset,
        resolvedPreset,
        autoState,
        ctl,
        runQuickTour,
        beforeManualNavigate,
      ],
    ) ?? null
  );
}
