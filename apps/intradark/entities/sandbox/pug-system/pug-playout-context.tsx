"use client";

import * as React from "react";

import type { PugPresetId } from "./pug-preset-registry";
import { applyPugPresetToPlayout } from "./pug-preset-registry";

export type PugPlayoutState = {
  acceptOneDeclines: boolean;
  setAcceptOneDeclines: (v: boolean) => void;
  serverSimulateStall: boolean;
  setServerSimulateStall: (v: boolean) => void;
};

const PugPlayoutContext = React.createContext<PugPlayoutState | null>(null);

export function PugPlayoutProvider({
  presetId,
  children,
}: {
  presetId: PugPresetId;
  children: React.ReactNode;
}) {
  const [acceptOneDeclines, setAcceptOneDeclines] = React.useState(false);
  const [serverSimulateStall, setServerSimulateStall] = React.useState(false);

  React.useEffect(() => {
    applyPugPresetToPlayout(presetId, {
      setAcceptOneDeclines,
      setServerSimulateStall,
    });
  }, [presetId]);

  const value = React.useMemo(
    () => ({
      acceptOneDeclines,
      setAcceptOneDeclines,
      serverSimulateStall,
      setServerSimulateStall,
    }),
    [acceptOneDeclines, serverSimulateStall],
  );

  return (
    <PugPlayoutContext.Provider value={value}>
      {children}
    </PugPlayoutContext.Provider>
  );
}

export function usePugPlayout(): PugPlayoutState {
  const ctx = React.useContext(PugPlayoutContext);
  if (!ctx) {
    throw new Error("usePugPlayout must be used within PugPlayoutProvider");
  }
  return ctx;
}
