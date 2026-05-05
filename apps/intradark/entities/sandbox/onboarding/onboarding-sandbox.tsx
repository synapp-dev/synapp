"use client";

import * as React from "react";

import { SandboxShell } from "@/entities/sandbox/shell/sandbox-shell";
import type { SandboxUrlApi } from "@/lib/sandbox/use-sandbox-url-state";

import {
  eligibilityFlags,
  profilesForEligibility,
  type EligibilityState,
} from "./fixtures";
import { OnboardingSandboxProvider } from "./onboarding-sandbox-context";
import { OnboardingSandboxRightSidebar } from "./onboarding-sandbox-right-sidebar";
import { DashboardStep } from "./steps/dashboard-step";
import { DiscordLinkStep } from "./steps/discord-link-step";
import { EligibleStep } from "./steps/eligible-step";
import { LandingStep } from "./steps/landing-step";
import { SteamConflictStep } from "./steps/steam-conflict-step";
import { SteamSigninStep } from "./steps/steam-signin-step";
import { UsernameEmailStep } from "./steps/username-email-step";

const ONBOARDING_SCENARIOS = [
  { id: "happy-onboarding", label: "Happy onboarding" },
  { id: "discord-declines-then-relinks", label: "Discord decline + retry" },
  { id: "steam-already-linked-conflict", label: "Steam already linked" },
] as const;

const ONBOARDING_STEPS = [
  { id: "landing", label: "Landing" },
  { id: "steam", label: "Steam sign-in" },
  { id: "username-email", label: "Username / email" },
  { id: "dashboard", label: "Dashboard" },
  { id: "discord", label: "Discord link" },
  { id: "eligible", label: "Eligible" },
] as const;

const ONBOARDING_PRESET_IDS = ["default"] as const;

function OnboardingStepBody({
  api,
  eligibility,
  setEligibility,
  steamConflict,
  setSteamConflict,
  discordAttempt,
  setDiscordAttempt,
}: {
  api: SandboxUrlApi;
  eligibility: EligibilityState;
  setEligibility: (e: EligibilityState) => void;
  steamConflict: boolean;
  setSteamConflict: (v: boolean) => void;
  discordAttempt: number;
  setDiscordAttempt: React.Dispatch<React.SetStateAction<number>>;
}) {
  const profiles = React.useMemo(
    () => profilesForEligibility(eligibility),
    [eligibility],
  );
  const flags = React.useMemo(
    () => eligibilityFlags(eligibility),
    [eligibility],
  );

  const ctxValue = React.useMemo(
    () => ({
      eligibility,
      setEligibility,
      profiles,
      flags,
      scenarioId: api.scenarioId,
      discordAttempt,
      setDiscordAttempt,
    }),
    [
      eligibility,
      setEligibility,
      profiles,
      flags,
      api.scenarioId,
      discordAttempt,
      setDiscordAttempt,
    ],
  );

  const { scenarioId, stepIndex, setStepIndex, nextStep } = api;

  if (stepIndex === 1 && steamConflict) {
    return (
      <OnboardingSandboxProvider value={ctxValue}>
        <SteamConflictStep
          onBack={() => {
            setSteamConflict(false);
            setStepIndex(0);
          }}
        />
      </OnboardingSandboxProvider>
    );
  }

  let body: React.ReactNode;
  switch (stepIndex) {
    case 0:
      body = <LandingStep onContinue={() => nextStep()} />;
      break;
    case 1:
      body = (
        <SteamSigninStep
          showConflictBranch={scenarioId === "steam-already-linked-conflict"}
          onSimulateSuccess={() => {
            setSteamConflict(false);
            nextStep();
          }}
          onSimulateConflict={() => setSteamConflict(true)}
        />
      );
      break;
    case 2:
      body = (
        <UsernameEmailStep
          onComplete={() => {
            setEligibility("steam-only");
            nextStep();
          }}
        />
      );
      break;
    case 3:
      body = <DashboardStep />;
      break;
    case 4:
      body = (
        <DiscordLinkStep
          scenarioId={scenarioId}
          discordAttempt={discordAttempt}
          onDecline={() => setDiscordAttempt((n) => n + 1)}
          onSuccess={() => {
            setEligibility("both-linked-not-banned");
            setDiscordAttempt(0);
            nextStep();
          }}
        />
      );
      break;
    case 5:
      body = <EligibleStep />;
      break;
    default:
      body = null;
  }

  return (
    <OnboardingSandboxProvider value={ctxValue}>{body}</OnboardingSandboxProvider>
  );
}

export function OnboardingSandbox() {
  const [eligibility, setEligibility] =
    React.useState<EligibilityState>("steam-only");
  const [steamConflict, setSteamConflict] = React.useState(false);
  const [discordAttempt, setDiscordAttempt] = React.useState(0);
  const beforeManualNavigate = React.useCallback(() => {
    /* reserved for future automate */
  }, []);

  return (
    <SandboxShell
      title="Onboarding"
      scenarios={ONBOARDING_SCENARIOS}
      defaultScenarioId="happy-onboarding"
      steps={ONBOARDING_STEPS}
      presetIds={ONBOARDING_PRESET_IDS}
      defaultPresetId="default"
      onManualNavigate={beforeManualNavigate}
    >
      {(api) => (
        <>
          <OnboardingSandboxRightSidebar
            api={api}
            scenarios={ONBOARDING_SCENARIOS}
            steps={ONBOARDING_STEPS}
            eligibility={eligibility}
            setEligibility={setEligibility}
            beforeManualNavigate={beforeManualNavigate}
          />
          <OnboardingStepBody
            api={api}
            eligibility={eligibility}
            setEligibility={setEligibility}
            steamConflict={steamConflict}
            setSteamConflict={setSteamConflict}
            discordAttempt={discordAttempt}
            setDiscordAttempt={setDiscordAttempt}
          />
        </>
      )}
    </SandboxShell>
  );
}
