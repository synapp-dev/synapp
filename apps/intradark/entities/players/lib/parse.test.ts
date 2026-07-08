import { describe, expect, it } from "vitest";

import { parseFaceit } from "./parse-faceit";
import { parseLeetify, normalizeLeetify } from "./parse-leetify";
import { parseLeetifySeasons, parseLeetifyProStatus } from "./parse-leetify-seasons";
import { parseGcProfile } from "./parse-gc";
import fixture from "../test/fixtures/leetify-profile-seasons.json";

describe("parseFaceit", () => {
  it("extracts cs2 elo/level/region", () => {
    const raw = {
      player_id: "abc",
      nickname: "niko",
      games: { cs2: { faceit_elo: 3200, skill_level: 10, region: "EU" } },
    };
    expect(parseFaceit(raw)).toEqual({
      faceit_player_id: "abc",
      nickname: "niko",
      country: null,
      faceit_elo: 3200,
      skill_level: 10,
      region: "EU",
    });
  });

  it("falls back to csgo when cs2 is missing", () => {
    const raw = { games: { csgo: { faceit_elo: 2000 } } };
    expect(parseFaceit(raw).faceit_elo).toBe(2000);
  });

  it("returns nulls for empty input", () => {
    expect(parseFaceit(null)).toEqual({
      faceit_player_id: null,
      nickname: null,
      country: null,
      faceit_elo: null,
      skill_level: null,
      region: null,
    });
  });
});

describe("parseLeetify", () => {
  it("stores flat recentGameRatings.leetify fraction, not CT+T sum", () => {
    const raw = {
      recentGameRatings: {
        leetify: 0.0102,
        ctLeetify: 0.01,
        tLeetify: 0.0105,
        aim: 85,
        positioning: 57,
        utility: 81,
        gamesPlayed: 30,
      },
    };
    expect(parseLeetify(raw).leetify_rating).toBe(0.0102);
  });

  it("normalizes API values already in percentage points", () => {
    const raw = {
      recentGameRatings: {
        leetify: 1.02,
        aim: 85,
      },
    };
    expect(parseLeetify(raw).leetify_rating).toBe(0.0102);
    expect(normalizeLeetify(raw).rating).toBe(1.02);
  });

  it("reads the v3 shape with rating block", () => {
    const raw = {
      name: "jourdain",
      winrate: 0.7241,
      total_matches: 5436,
      rating: {
        aim: 84.85,
        positioning: 56.36,
        utility: 80.96,
        ct_leetify: 0.0103,
        t_leetify: 0.0039,
        leetify: 0.0088,
      },
      ranks: { premier: 26715, faceit_elo: 2306 },
    };
    expect(parseLeetify(raw)).toMatchObject({
      leetify_rating: 0.0088,
      aim: 84.85,
      positioning: 56.36,
      utility: 80.96,
      games_played: 5436,
    });
  });

  it("falls back to the legacy recentGameRatings shape", () => {
    const raw = {
      recentGameRatings: {
        leetify: 1.2,
        aim: 60,
        positioning: 55,
        utility: 40,
        gamesPlayed: 30,
      },
    };
    expect(parseLeetify(raw)).toMatchObject({
      leetify_rating: 0.012,
      aim: 60,
      positioning: 55,
      utility: 40,
      games_played: 30,
    });
    expect(normalizeLeetify(raw).rating).toBe(1.2);
  });

  it("tolerates unknown shapes", () => {
    expect(parseLeetify({})).toEqual({
      leetify_rating: null,
      aim: null,
      positioning: null,
      utility: null,
      games_played: null,
      premier_rating: null,
      season_ranks: null,
    });
  });
});

describe("parseLeetifySeasons", () => {
  it("derives season summaries from fixture games", () => {
    const result = parseLeetifySeasons(fixture);
    expect(result).not.toBeNull();
    const s4 = result!.seasons.find((s) => s.id === "s4");
    expect(s4).toBeDefined();
    expect(s4!.matches).toBeGreaterThan(100);
    expect(s4!.winRate).toBeGreaterThan(0.5);
    expect(s4!.premier?.min).toBeGreaterThan(20000);
    expect(s4!.premier?.max).toBeGreaterThan(s4!.premier!.min);
  });

  it("sets currentPremier from the latest Premier game", () => {
    const result = parseLeetifySeasons(fixture);
    expect(result?.currentPremier).toBeGreaterThan(20000);
  });

  it("returns null for empty games", () => {
    expect(parseLeetifySeasons({ games: [] })).toBeNull();
    expect(parseLeetifySeasons({})).toBeNull();
  });
});

describe("parseLeetifyProStatus", () => {
  it("detects CS:GO pro from HLTV games with isCs2 false", () => {
    expect(
      parseLeetifyProStatus({
        games: [
          {
            dataSource: "faceit",
            isCs2: false,
            gameFinishedAt: "2021-07-14T12:55:43.000Z",
          },
          {
            dataSource: "hltv",
            isCs2: false,
            gameFinishedAt: "2021-07-13T08:00:00.000Z",
          },
        ],
      }),
    ).toEqual({ csgoPro: true, cs2Pro: false });
  });

  it("detects CS2 pro from HLTV games with isCs2 true", () => {
    expect(
      parseLeetifyProStatus({
        games: [
          {
            dataSource: "hltv",
            isCs2: true,
            gameFinishedAt: "2024-03-01T08:00:00.000Z",
          },
        ],
      }),
    ).toEqual({ csgoPro: false, cs2Pro: true });
  });

  it("can detect both CS:GO and CS2 pro status", () => {
    expect(
      parseLeetifyProStatus({
        games: [
          {
            dataSource: "hltv",
            isCs2: false,
            gameFinishedAt: "2021-07-13T08:00:00.000Z",
          },
          {
            dataSource: "hltv",
            isCs2: true,
            gameFinishedAt: "2024-03-01T08:00:00.000Z",
          },
        ],
      }),
    ).toEqual({ csgoPro: true, cs2Pro: true });
  });

  it("returns false when no HLTV games exist", () => {
    expect(parseLeetifyProStatus({ games: [] })).toEqual({
      csgoPro: false,
      cs2Pro: false,
    });
    expect(parseLeetifyProStatus({})).toEqual({
      csgoPro: false,
      cs2Pro: false,
    });
  });
});

describe("normalizeLeetify", () => {
  it("derives the client view with flat rating as percentage", () => {
    const raw = {
      name: "jourdain",
      winrate: 0.7241,
      total_matches: 5436,
      stats: { reaction_time_ms: 618.7476 },
      recentGameRatings: {
        leetify: 0.0102,
        ctLeetify: 0.0103,
        tLeetify: 0.0039,
        aim: 84.85,
        positioning: 56.36,
        utility: 80.96,
        opening: 0.0116,
        clutch: 0.0892,
        gamesPlayed: 5436,
      },
      ranks: { premier: 26715, faceit_elo: 2306 },
    };
    const view = normalizeLeetify(raw);
    expect(view.rating).toBe(1.02);
    expect(view.ctLeetify).toBe(1.03);
    expect(view.tLeetify).toBe(0.39);
    expect(view.premierRating).toBe(26715);
    expect(view.seasonRanks).toBeNull();
    expect(view.csgoPro).toBe(false);
    expect(view.cs2Pro).toBe(false);
  });

  it("uses stored snapshot columns when provided", () => {
    const raw = { recentGameRatings: { leetify: 0.01 } };
    const stored = {
      premier_rating: 25000,
      season_ranks: {
        currentPremier: 25000,
        seasons: [
          {
            id: "s4",
            label: "Season Four",
            start: "2026-01-21",
            end: "2026-07-20",
            matches: 10,
            winRate: 0.6,
            premier: { min: 24000, max: 26000 },
          },
        ],
      },
    };
    const view = normalizeLeetify(raw, stored);
    expect(view.premierRating).toBe(25000);
    expect(view.seasonRanks?.seasons).toHaveLength(1);
  });
});

describe("parseGcProfile", () => {
  it("extracts level, commendations and vac", () => {
    const raw = {
      player_level: 25,
      vac_banned: 0,
      commendation: { cmd_friendly: 5, cmd_teaching: 3, cmd_leader: 2 },
      medals: { display_items_defidx: [1, 2] },
      ranking: { rank_id: 11 },
    };
    expect(parseGcProfile(raw)).toEqual({
      player_level: 25,
      cmd_friendly: 5,
      cmd_teaching: 3,
      cmd_leader: 2,
      vac_banned: false,
      medals: { display_items_defidx: [1, 2] },
      rankings: { rank_id: 11 },
    });
  });

  it("returns nulls for empty input", () => {
    expect(parseGcProfile(undefined)).toEqual({
      player_level: null,
      cmd_friendly: null,
      cmd_teaching: null,
      cmd_leader: null,
      vac_banned: null,
      medals: null,
      rankings: null,
    });
  });
});
