"use client";

import * as React from "react";

import type { CurrentUserProfiles } from "@/lib/get-current-user-profiles";

import type {
  EligibilityState,
  OnboardingSandboxFlags,
} from "./fixtures";

export type OnboardingSandboxContextValue = {
  eligibility: EligibilityState;
  setEligibility: (s: EligibilityState) => void;
  profiles: CurrentUserProfiles | null;
  flags: OnboardingSandboxFlags;
  scenarioId: string;
  discordAttempt: number;
  setDiscordAttempt: React.Dispatch<React.SetStateAction<number>>;
};

const OnboardingSandboxContext =
  React.createContext<OnboardingSandboxContextValue | null>(null);

export function OnboardingSandboxProvider({
  value,
  children,
}: {
  value: OnboardingSandboxContextValue;
  children: React.ReactNode;
}) {
  return (
    <OnboardingSandboxContext.Provider value={value}>
      {children}
    </OnboardingSandboxContext.Provider>
  );
}

export function useOnboardingSandbox(): OnboardingSandboxContextValue {
  const ctx = React.useContext(OnboardingSandboxContext);
  if (!ctx) {
    throw new Error(
      "useOnboardingSandbox must be used within OnboardingSandboxProvider",
    );
  }
  return ctx;
}
