"use client";

import * as React from "react";

import {
  MOCK_TEAM_NORTH,
  MOCK_TEAM_SOUTH,
} from "@/lib/match-lobby-mock-data";

function buildInitialDiscordJoined(): Record<string, boolean> {
  const m: Record<string, boolean> = {};
  for (const p of MOCK_TEAM_NORTH.players) {
    m[p.id] = p.discordJoined;
  }
  for (const p of MOCK_TEAM_SOUTH.players) {
    m[p.id] = p.discordJoined;
  }
  return m;
}

function buildInitialServerJoined(): Record<string, boolean> {
  const m: Record<string, boolean> = {};
  for (const p of MOCK_TEAM_NORTH.players) {
    m[p.id] = false;
  }
  for (const p of MOCK_TEAM_SOUTH.players) {
    m[p.id] = false;
  }
  return m;
}

type MatchLobbyMockContextValue = {
  discordJoinedByPlayerId: Record<string, boolean>;
  toggleDiscordJoined: (playerId: string) => void;
  isDiscordJoined: (playerId: string) => boolean;
  assignmentAssigned: number;
  assignmentTotal: number;
  /** North roster: mock Discord voice connected count (same toggles as assignment ring). */
  northConnected: number;
  northTotal: number;
  /** South roster: mock Discord voice connected count. */
  southConnected: number;
  southTotal: number;
  /** Mock game server join — toggled via CS icon / row on server phase (UX). */
  serverJoinedByPlayerId: Record<string, boolean>;
  toggleServerJoined: (playerId: string) => void;
  isServerJoined: (playerId: string) => boolean;
  serverAssigned: number;
  serverTotal: number;
  northOnServer: number;
  southOnServer: number;
};

const MatchLobbyMockContext =
  React.createContext<MatchLobbyMockContextValue | null>(null);

export function MatchLobbyMockProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [discordJoinedByPlayerId, setDiscordJoinedByPlayerId] =
    React.useState<Record<string, boolean>>(buildInitialDiscordJoined);
  const [serverJoinedByPlayerId, setServerJoinedByPlayerId] =
    React.useState<Record<string, boolean>>(buildInitialServerJoined);

  const toggleDiscordJoined = React.useCallback((playerId: string) => {
    setDiscordJoinedByPlayerId((prev) => ({
      ...prev,
      [playerId]: !prev[playerId],
    }));
  }, []);

  const isDiscordJoined = React.useCallback(
    (playerId: string) => discordJoinedByPlayerId[playerId] ?? false,
    [discordJoinedByPlayerId],
  );

  const toggleServerJoined = React.useCallback((playerId: string) => {
    setServerJoinedByPlayerId((prev) => ({
      ...prev,
      [playerId]: !prev[playerId],
    }));
  }, []);

  const isServerJoined = React.useCallback(
    (playerId: string) => serverJoinedByPlayerId[playerId] ?? false,
    [serverJoinedByPlayerId],
  );

  const {
    assignmentAssigned,
    assignmentTotal,
    northConnected,
    northTotal,
    southConnected,
    southTotal,
    serverAssigned,
    serverTotal,
    northOnServer,
    southOnServer,
  } = React.useMemo(() => {
    const north = MOCK_TEAM_NORTH.players;
    const south = MOCK_TEAM_SOUTH.players;
    const players = [...north, ...south];
    const assigned = players.filter(
      (p) => discordJoinedByPlayerId[p.id],
    ).length;
    const nc = north.filter((p) => discordJoinedByPlayerId[p.id]).length;
    const sc = south.filter((p) => discordJoinedByPlayerId[p.id]).length;
    const srv = players.filter((p) => serverJoinedByPlayerId[p.id]).length;
    const nSrv = north.filter((p) => serverJoinedByPlayerId[p.id]).length;
    const sSrv = south.filter((p) => serverJoinedByPlayerId[p.id]).length;
    return {
      assignmentAssigned: assigned,
      assignmentTotal: players.length,
      northConnected: nc,
      northTotal: north.length,
      southConnected: sc,
      southTotal: south.length,
      serverAssigned: srv,
      serverTotal: players.length,
      northOnServer: nSrv,
      southOnServer: sSrv,
    };
  }, [discordJoinedByPlayerId, serverJoinedByPlayerId]);

  const value = React.useMemo(
    () => ({
      discordJoinedByPlayerId,
      toggleDiscordJoined,
      isDiscordJoined,
      assignmentAssigned,
      assignmentTotal,
      northConnected,
      northTotal,
      southConnected,
      southTotal,
      serverJoinedByPlayerId,
      toggleServerJoined,
      isServerJoined,
      serverAssigned,
      serverTotal,
      northOnServer,
      southOnServer,
    }),
    [
      discordJoinedByPlayerId,
      toggleDiscordJoined,
      isDiscordJoined,
      assignmentAssigned,
      assignmentTotal,
      northConnected,
      northTotal,
      southConnected,
      southTotal,
      serverJoinedByPlayerId,
      toggleServerJoined,
      isServerJoined,
      serverAssigned,
      serverTotal,
      northOnServer,
      southOnServer,
    ],
  );

  return (
    <MatchLobbyMockContext.Provider value={value}>
      {children}
    </MatchLobbyMockContext.Provider>
  );
}

export function useMatchLobbyMock(): MatchLobbyMockContextValue {
  const ctx = React.useContext(MatchLobbyMockContext);
  if (!ctx) {
    throw new Error(
      "useMatchLobbyMock must be used within MatchLobbyMockProvider",
    );
  }
  return ctx;
}
