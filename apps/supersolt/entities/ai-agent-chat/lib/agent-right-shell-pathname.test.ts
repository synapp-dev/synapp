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

  it("is true for scoped agent routes", () => {
    expect(isAgentOnlyRoute("/acme/richmond/agent")).toBe(true);
    expect(isAgentOnlyRoute("/acme/richmond/agent/")).toBe(true);
  });

  it("is false for other routes", () => {
    expect(isAgentOnlyRoute("/agent/foo")).toBe(false);
    expect(isAgentOnlyRoute("/acme/venue/inventory")).toBe(false);
    expect(isAgentOnlyRoute("/dashboard")).toBe(false);
    expect(isAgentOnlyRoute("/acme/richmond/dashboard")).toBe(false);
  });
});

describe("shouldShowAgentRightShell", () => {
  it("is false on agent routes only", () => {
    expect(shouldShowAgentRightShell("/agent")).toBe(false);
    expect(shouldShowAgentRightShell("/acme/richmond/agent")).toBe(false);
  });

  it("is true elsewhere", () => {
    expect(shouldShowAgentRightShell("/acme/v/inventory")).toBe(true);
    expect(shouldShowAgentRightShell("/acme/v/dashboard")).toBe(true);
  });
});
