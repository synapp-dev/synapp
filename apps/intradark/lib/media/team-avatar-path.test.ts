import { describe, expect, it } from "vitest";

import {
  assertTeamAvatarObjectPath,
  buildTeamAvatarObjectPath,
} from "./team-avatar-path";

const TEAM_ID = "11111111-1111-4111-8111-111111111111";

describe("buildTeamAvatarObjectPath", () => {
  it("builds avatars/teams/{teamId}/{fileName}", () => {
    expect(
      buildTeamAvatarObjectPath({
        teamId: TEAM_ID,
        fileName: "logo.png",
      }),
    ).toBe(`avatars/teams/${TEAM_ID}/logo.png`);
  });
});

describe("assertTeamAvatarObjectPath", () => {
  it("accepts a file in the team folder", () => {
    const path = `avatars/teams/${TEAM_ID}/abc.png`;
    expect(assertTeamAvatarObjectPath(path, TEAM_ID)).toEqual({
      ok: true,
      path,
    });
  });

  it("rejects another team folder", () => {
    const path = "avatars/teams/22222222-2222-4222-8222-222222222222/x.png";
    expect(assertTeamAvatarObjectPath(path, TEAM_ID).ok).toBe(false);
  });
});
