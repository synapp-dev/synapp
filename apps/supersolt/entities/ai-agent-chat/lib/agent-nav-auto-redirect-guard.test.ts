import { describe, expect, it } from "vitest";

import {
  AGENT_NAV_AUTO_REDIRECT_STORAGE_KEY,
  AGENT_NAV_AUTO_REDIRECT_TTL_MS,
  appNavPathsMatch,
  clearAgentNavAutoRedirectMarker,
  markAgentNavAutoRedirect,
  normalizeAppNavHref,
  readRecentAgentNavAutoRedirect,
} from "./agent-nav-auto-redirect-guard";

describe("normalizeAppNavHref", () => {
  it("trims trailing slashes", () => {
    expect(normalizeAppNavHref("/a/b/c/")).toBe("/a/b/c");
    expect(normalizeAppNavHref("/a/b/c///")).toBe("/a/b/c");
  });

  it("maps bare slash to root", () => {
    expect(normalizeAppNavHref("/")).toBe("/");
    expect(normalizeAppNavHref("///")).toBe("/");
  });
});

describe("appNavPathsMatch", () => {
  it("matches pathname to href with slash normalization", () => {
    expect(appNavPathsMatch("/org/venue/catalog/ingredients", "/org/venue/catalog/ingredients/")).toBe(
      true,
    );
  });
});

describe("session marker", () => {
  it("round-trips within TTL", () => {
    clearAgentNavAutoRedirectMarker();
    markAgentNavAutoRedirect("/org/venue/catalog/ingredients");
    expect(readRecentAgentNavAutoRedirect("/org/venue/catalog/ingredients/")).toBe(true);
    clearAgentNavAutoRedirectMarker();
  });

  it("returns false after TTL", () => {
    clearAgentNavAutoRedirectMarker();
    const raw = JSON.stringify({
      href: "/org/venue/catalog/ingredients",
      at: Date.now() - AGENT_NAV_AUTO_REDIRECT_TTL_MS - 1,
    });
    sessionStorage.setItem(AGENT_NAV_AUTO_REDIRECT_STORAGE_KEY, raw);
    expect(readRecentAgentNavAutoRedirect("/org/venue/catalog/ingredients")).toBe(false);
    clearAgentNavAutoRedirectMarker();
  });
});
