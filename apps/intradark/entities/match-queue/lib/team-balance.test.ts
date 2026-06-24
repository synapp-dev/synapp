import { describe, expect, it } from "vitest";

import { balanceTeams, teamRatingTotal } from "./team-balance";

const players = (ratings: number[]) =>
  ratings.map((rating, i) => ({ steamid64: `7656${i}`, rating }));

describe("balanceTeams", () => {
  it("splits ten players into two teams of five", () => {
    const input = players([10, 20, 30, 40, 50, 60, 70, 80, 90, 100]);
    const { team1, team2 } = balanceTeams(input);
    expect(team1).toHaveLength(5);
    expect(team2).toHaveLength(5);
    // Every player assigned exactly once.
    expect(new Set([...team1, ...team2]).size).toBe(10);
  });

  it("keeps team rating totals close (snake-ish greedy)", () => {
    const input = players([10, 20, 30, 40, 50, 60, 70, 80, 90, 100]);
    const result = balanceTeams(input);
    const t1 = teamRatingTotal(input, result.team1);
    const t2 = teamRatingTotal(input, result.team2);
    // Perfect balance of this set is 275/275; greedy must land within a small gap.
    expect(Math.abs(t1 - t2)).toBeLessThanOrEqual(20);
  });

  it("is deterministic for the same input", () => {
    const input = players([1500, 1200, 900, 1800, 1000, 1100, 1300, 1400, 800, 1600]);
    expect(balanceTeams(input)).toEqual(balanceTeams(input));
  });

  it("gives the next strongest pick to the trailing team", () => {
    // Strongest two should be split across teams, not stacked together.
    const input = players([100, 99, 1, 2, 3, 4, 5, 6, 7, 8]);
    const { team1, team2 } = balanceTeams(input);
    const top = "7656" + input.findIndex((p) => p.rating === 100);
    const second = "7656" + input.findIndex((p) => p.rating === 99);
    const sameTeam =
      (team1.includes(top) && team1.includes(second)) ||
      (team2.includes(top) && team2.includes(second));
    expect(sameTeam).toBe(false);
  });

  it("caps each team at five even with lopsided ratings", () => {
    const input = players([100, 100, 100, 100, 100, 1, 1, 1, 1, 1]);
    const { team1, team2 } = balanceTeams(input);
    expect(team1).toHaveLength(5);
    expect(team2).toHaveLength(5);
  });
});
