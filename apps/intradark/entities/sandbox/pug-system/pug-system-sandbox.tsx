"use client";

import * as React from "react";

import { MatchLobbyMockProvider } from "@/components/organisms/match-lobby/match-lobby-mock-context";
import { MatchVetoMockProvider } from "@/components/organisms/match-lobby/match-veto-mock-context";
import { SandboxShell } from "@/entities/sandbox/shell/sandbox-shell";
import type { SandboxUrlApi } from "@/lib/sandbox/use-sandbox-url-state";

import { PugPlayoutProvider } from "./pug-playout-context";
import { PugSystemSandboxRightSidebar } from "./pug-sandbox-right-sidebar";
import {
  PUG_DEFAULT_PRESET_ID,
  PUG_PRESET_IDS,
  PUG_PRESETS,
  type PugPresetId,
} from "./pug-preset-registry";
import { AcceptPhaseStep } from "./steps/accept-phase-step";
import { LobbyStep } from "./steps/lobby-step";
import { MatchFoundStep } from "./steps/match-found-step";
import { PlayHubStep } from "./steps/play-hub-step";
import { ResultStep } from "./steps/result-step";
import { SearchingStep } from "./steps/searching-step";
import { ServerConnectStep } from "./steps/server-connect-step";

const PUG_STEPS = [
  { id: "play-hub", label: "Play hub" },
  { id: "searching", label: "Searching" },
  { id: "match-found", label: "Match found" },
  { id: "accept", label: "Accept" },
  { id: "lobby", label: "Lobby" },
  { id: "server", label: "Join server" },
  { id: "result", label: "Result" },
] as const;

function wrapSandboxApi(api: SandboxUrlApi, cancelAutomate: () => void) {
  return {
    ...api,
    setStepIndex: (i: number) => {
      cancelAutomate();
      api.setStepIndex(i);
    },
    setScenarioId: (id: string) => {
      cancelAutomate();
      api.setScenarioId(id);
    },
    setPresetId: (id: string) => {
      cancelAutomate();
      api.setPresetId(id);
    },
    nextStep: () => {
      cancelAutomate();
      api.nextStep();
    },
    prevStep: () => {
      cancelAutomate();
      api.prevStep();
    },
  };
}

function PugStepBody({ api }: { api: SandboxUrlApi }) {
  const { stepIndex, setStepIndex, nextStep } = api;

  switch (stepIndex) {
    case 0:
      return <PlayHubStep onSimulateQueue={() => nextStep()} />;
    case 1:
      return <SearchingStep onCancel={() => setStepIndex(0)} />;
    case 2:
      return <MatchFoundStep />;
    case 3:
      return <AcceptPhaseStep onBackToPlay={() => setStepIndex(0)} />;
    case 4:
      return <LobbyStep />;
    case 5:
      return <ServerConnectStep />;
    case 6:
      return <ResultStep />;
    default:
      return null;
  }
}

function resolvePresetId(api: SandboxUrlApi): PugPresetId {
  return PUG_PRESETS.some((p) => p.id === api.presetId)
    ? (api.presetId as PugPresetId)
    : PUG_DEFAULT_PRESET_ID;
}

export function PugSystemSandbox() {
  const cancelAutomateRef = React.useRef<(() => void) | null>(null);
  const assignAutomateCancel = React.useCallback(
    (fn: (() => void) | null) => {
      cancelAutomateRef.current = fn;
    },
    [],
  );
  const cancelAutomate = React.useCallback(() => {
    cancelAutomateRef.current?.();
  }, []);

  return (
    <MatchLobbyMockProvider>
      <MatchVetoMockProvider>
        <SandboxShell
          title="PUG system"
          steps={PUG_STEPS}
          presetIds={PUG_PRESET_IDS}
          defaultPresetId={PUG_DEFAULT_PRESET_ID}
          onManualNavigate={cancelAutomate}
        >
          {(api) => (
            <PugPlayoutProvider presetId={resolvePresetId(api)}>
              <PugSystemSandboxRightSidebar
                api={api}
                steps={PUG_STEPS}
                assignAutomateCancel={assignAutomateCancel}
                beforeManualNavigate={cancelAutomate}
              />
              <PugStepBody api={wrapSandboxApi(api, cancelAutomate)} />
            </PugPlayoutProvider>
          )}
        </SandboxShell>
      </MatchVetoMockProvider>
    </MatchLobbyMockProvider>
  );
}
