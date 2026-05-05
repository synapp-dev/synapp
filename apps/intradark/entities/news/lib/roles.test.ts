import { describe, expect, it } from "vitest";

import { hasNewsEditorRole } from "./roles";

describe("hasNewsEditorRole", () => {
  it("is true for news.editor", () => {
    expect(hasNewsEditorRole(["news.editor"])).toBe(true);
  });

  it("is true for developer (implies capability)", () => {
    expect(hasNewsEditorRole(["developer"])).toBe(true);
  });

  it("is false without matching slug", () => {
    expect(hasNewsEditorRole(["sandbox.access"])).toBe(false);
    expect(hasNewsEditorRole([])).toBe(false);
  });
});
