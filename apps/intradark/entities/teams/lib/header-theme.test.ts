import { describe, expect, it } from "vitest";

import {
  INTRADARK_HEADER_THEME,
  resolveTeamHeaderTheme,
} from "./header-theme";

describe("resolveTeamHeaderTheme", () => {
  it("returns intradark defaults when team is null", () => {
    expect(resolveTeamHeaderTheme(null)).toEqual(INTRADARK_HEADER_THEME);
  });

  it("uses primary for glow and secondary for border/name when both set", () => {
    expect(
      resolveTeamHeaderTheme({
        primaryColor: "#111111",
        secondaryColor: "#222222",
      }),
    ).toEqual({
      primaryColor: "#111111",
      secondaryColor: "#222222",
    });
  });

  it("falls back secondary to primary when only primary is set", () => {
    expect(
      resolveTeamHeaderTheme({
        primaryColor: "#abcdef",
        secondaryColor: null,
      }),
    ).toEqual({
      primaryColor: "#abcdef",
      secondaryColor: "#abcdef",
    });
  });
});
