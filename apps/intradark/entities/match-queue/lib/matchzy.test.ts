import { describe, expect, it } from "vitest";

import {
  extractMatchId,
  isFinalizingEvent,
  parseMatchzyResult,
} from "./matchzy";

const seriesEnd = {
  event: "series_end",
  matchid: "abc-123",
  map_name: "de_mirage",
  team1: {
    name: "Alpha",
    score: 13,
    players: [
      { steamid64: "111", stats: { kills: 20, deaths: 10, assists: 5, headshot_kills: 9, damage: 2200, mvps: 3 } },
    ],
  },
  team2: {
    name: "Bravo",
    score: 8,
    players: [{ steamid: "222", stats: { kills: 12, deaths: 16, assists: 3 } }],
  },
  winner: { team: "team1" },
};

describe("matchzy parser", () => {
  it("recognises finalizing events", () => {
    expect(isFinalizingEvent(seriesEnd)).toBe(true);
    expect(isFinalizingEvent({ event: "round_end" })).toBe(false);
    expect(isFinalizingEvent({ event: "map_result" })).toBe(true);
  });

  it("extracts the match id from common shapes", () => {
    expect(extractMatchId(seriesEnd)).toBe("abc-123");
    expect(extractMatchId({ match_id: "x" })).toBe("x");
    expect(extractMatchId({})).toBeUndefined();
  });

  it("parses score, winner, and player stats", () => {
    const r = parseMatchzyResult(seriesEnd)!;
    expect(r.winnerTeam).toBe(1);
    expect(r.scoreTeam1).toBe(13);
    expect(r.scoreTeam2).toBe(8);
    expect(r.map).toBe("de_mirage");
    expect(r.playerStats).toHaveLength(2);
    const p1 = r.playerStats!.find((p) => p.steamid64 === "111")!;
    expect(p1.kills).toBe(20);
    expect(p1.headshotKills).toBe(9);
    // tolerant steamid field on team2
    expect(r.playerStats!.find((p) => p.steamid64 === "222")).toBeTruthy();
  });

  it("derives winner from score when winner field absent", () => {
    const r = parseMatchzyResult({
      event: "map_result",
      matchid: "m",
      team1: { score: 5 },
      team2: { score: 13 },
    })!;
    expect(r.winnerTeam).toBe(2);
  });

  it("returns null for non-finalizing events", () => {
    expect(parseMatchzyResult({ event: "round_end" })).toBeNull();
  });
});
