"use client";

import * as React from "react";

export type VetoSide = "north" | "south";

export type VetoMapDef = { id: string; label: string };

/** Seven-map pool — alternating bans until one map remains (mock UX). */
export const VETO_MAP_POOL: VetoMapDef[] = [
  { id: "ancient", label: "Ancient" },
  { id: "anubis", label: "Anubis" },
  { id: "dust2", label: "Dust II" },
  { id: "inferno", label: "Inferno" },
  { id: "mirage", label: "Mirage" },
  { id: "nuke", label: "Nuke" },
  { id: "vertigo", label: "Vertigo" },
];

type BanEntry = { mapId: string; by: VetoSide };

type VetoState = {
  remaining: VetoMapDef[];
  banned: BanEntry[];
  /** Which captain bans next (North opens). */
  turn: VetoSide;
};

function initialVetoState(): VetoState {
  return {
    remaining: [...VETO_MAP_POOL],
    banned: [],
    turn: "north",
  };
}

type VetoAction =
  | { type: "ban"; mapId: string; by: VetoSide }
  | { type: "reset" };

function vetoReducer(state: VetoState, action: VetoAction): VetoState {
  if (action.type === "reset") {
    return initialVetoState();
  }
  if (state.remaining.length <= 1) {
    return state;
  }
  if (state.turn !== action.by) {
    return state;
  }
  if (!state.remaining.some((m) => m.id === action.mapId)) {
    return state;
  }
  return {
    remaining: state.remaining.filter((m) => m.id !== action.mapId),
    banned: [...state.banned, { mapId: action.mapId, by: action.by }],
    turn: action.by === "north" ? "south" : "north",
  };
}

function mapLabel(mapId: string): string {
  return VETO_MAP_POOL.find((m) => m.id === mapId)?.label ?? mapId;
}

type MatchVetoMockContextValue = {
  remainingMaps: VetoMapDef[];
  banned: BanEntry[];
  bannedWithLabels: { mapId: string; label: string; by: VetoSide }[];
  currentBanTeam: VetoSide;
  isComplete: boolean;
  decider: VetoMapDef | null;
  banMap: (mapId: string, by: VetoSide) => void;
  resetVeto: () => void;
};

const MatchVetoMockContext =
  React.createContext<MatchVetoMockContextValue | null>(null);

export function MatchVetoMockProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [state, dispatch] = React.useReducer(vetoReducer, undefined, () =>
    initialVetoState(),
  );

  const banMap = React.useCallback((mapId: string, by: VetoSide) => {
    dispatch({ type: "ban", mapId, by });
  }, []);

  const resetVeto = React.useCallback(() => {
    dispatch({ type: "reset" });
  }, []);

  const value = React.useMemo((): MatchVetoMockContextValue => {
    const isComplete = state.remaining.length <= 1;
    const decider =
      state.remaining.length === 1 ? state.remaining[0] ?? null : null;
    const bannedWithLabels = state.banned.map((b) => ({
      ...b,
      label: mapLabel(b.mapId),
    }));
    return {
      remainingMaps: state.remaining,
      banned: state.banned,
      bannedWithLabels,
      currentBanTeam: state.turn,
      isComplete,
      decider,
      banMap,
      resetVeto,
    };
  }, [state, banMap, resetVeto]);

  return (
    <MatchVetoMockContext.Provider value={value}>
      {children}
    </MatchVetoMockContext.Provider>
  );
}

export function useMatchVetoMock(): MatchVetoMockContextValue {
  const ctx = React.useContext(MatchVetoMockContext);
  if (!ctx) {
    throw new Error(
      "useMatchVetoMock must be used within MatchVetoMockProvider",
    );
  }
  return ctx;
}
