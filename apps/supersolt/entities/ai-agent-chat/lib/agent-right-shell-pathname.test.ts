import { describe, expect, it } from "vitest";

import {
  isAgentOnlyRoute,
  shouldShowAgentRightShell,
} from "./agent-right-shell-pathname";

describe("isAgentOnlyRoute", () => {
  it("is true for /agent and trailing slash", () => {
    expect(isAgentOnlyRoute("/agent")).toBe(true);
    expect(isAgentOnlyRoute("/agent/")).toBe(true);
  });

  it("is false for other routes", () => {
    expect(isAgentOnlyRoute("/agent/foo")).toBe(false);
    expect(isAgentOnlyRoute("/acme/venue/inventory")).toBe(false);
    expect(isAgentOnlyRoute("/dashboard")).toBe(false);
  });
});

describe("shouldShowAgentRightShell", () => {
  it("is false on /agent only", () => {
    expect(shouldShowAgentRightShell("/agent")).toBe(false);
  });

  it("is true elsewhere", () => {
    expect(shouldShowAgentRightShell("/acme/v/inventory")).toBe(true);
  });
});
