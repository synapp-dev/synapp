"use client";

import { createContext, useContext, useEffect, type ReactNode } from "react";

import { useScrimStore } from "@/stores/scrim-store";

import type { ScrimBootstrap, ScrimTeam } from "../types";

type ScrimDataContextValue = ScrimBootstrap & {
  /** The team the viewer is currently acting as (first team by default). */
  selectedTeam: ScrimTeam | null;
};

const ScrimDataContext = createContext<ScrimDataContextValue | null>(null);

export function ScrimDataProvider({
  bootstrap,
  children,
}: {
  bootstrap: ScrimBootstrap;
  children: ReactNode;
}) {
  const selectedTeamId = useScrimStore((s) => s.selectedTeamId);
  const setSelectedTeamId = useScrimStore((s) => s.setSelectedTeamId);

  // Default to the first team, or reset if the stored id is no longer ours.
  useEffect(() => {
    const exists = bootstrap.myTeams.some((t) => t.id === selectedTeamId);
    if (!exists) {
      setSelectedTeamId(bootstrap.myTeams[0]?.id ?? null);
    }
  }, [bootstrap.myTeams, selectedTeamId, setSelectedTeamId]);

  const selectedTeam =
    bootstrap.myTeams.find((t) => t.id === selectedTeamId) ??
    bootstrap.myTeams[0] ??
    null;

  return (
    <ScrimDataContext.Provider value={{ ...bootstrap, selectedTeam }}>
      {children}
    </ScrimDataContext.Provider>
  );
}

export function useScrimData(): ScrimDataContextValue {
  const ctx = useContext(ScrimDataContext);
  if (!ctx) {
    throw new Error("useScrimData must be used within a ScrimDataProvider");
  }
  return ctx;
}
