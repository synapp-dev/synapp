import { describe, expect, it } from "vitest";

import {
  listProfileSocialLinks,
  playerSocialLinksFromRow,
} from "@/entities/players/lib/social-links";

describe("playerSocialLinksFromRow", () => {
  it("trims and nulls empty strings", () => {
    expect(
      playerSocialLinksFromRow({
        twitch_url: " https://twitch.tv/foo ",
        x_url: "",
        instagram_url: null,
      }),
    ).toEqual({
      twitchUrl: "https://twitch.tv/foo",
      xUrl: null,
      instagramUrl: null,
    });
  });
});

describe("listProfileSocialLinks", () => {
  it("returns only links that are set", () => {
    expect(
      listProfileSocialLinks({
        twitchUrl: null,
        xUrl: "https://x.com/player",
        instagramUrl: "https://instagram.com/player",
      }),
    ).toEqual([
      { label: "X", href: "https://x.com/player", icon: "x" },
      {
        label: "Instagram",
        href: "https://instagram.com/player",
        icon: "instagram",
      },
    ]);
  });
});
