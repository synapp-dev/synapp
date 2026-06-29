import { describe, expect, it } from "vitest";

import { stealPointsByTeam, stealPointsForScore } from "./steal-points";

describe("stealPointsForScore", () => {
  it("close loss steals points back (margin ≤2)", () => {
    expect(stealPointsForScore(13, 11)).toEqual({ winner: 6, loser: 2 });
    expect(stealPointsForScore(13, 12)).toEqual({ winner: 6, loser: 2 });
  });
  it("mid margins", () => {
    expect(stealPointsForScore(13, 9)).toEqual({ winner: 6, loser: 1 }); // 4
    expect(stealPointsForScore(13, 8)).toEqual({ winner: 6, loser: 0 }); // 5
  });
  it("blowouts demerit the loser and reward the winner", () => {
    expect(stealPointsForScore(13, 6)).toEqual({ winner: 8, loser: -2 }); // 7
    expect(stealPointsForScore(13, 3)).toEqual({ winner: 10, loser: -4 }); // 10
    expect(stealPointsForScore(13, 0)).toEqual({ winner: 12, loser: -6 }); // 13
  });
  it("draw is zero", () => {
    expect(stealPointsForScore(13, 13)).toEqual({ winner: 0, loser: 0 });
  });
});

describe("stealPointsByTeam", () => {
  it("maps winner/loser onto the right team", () => {
    expect(stealPointsByTeam(13, 6, 1)).toEqual({ team1: 8, team2: -2 });
    expect(stealPointsByTeam(6, 13, 2)).toEqual({ team1: -2, team2: 8 });
  });
  it("draw → both zero", () => {
    expect(stealPointsByTeam(13, 13, null)).toEqual({ team1: 0, team2: 0 });
  });
});
