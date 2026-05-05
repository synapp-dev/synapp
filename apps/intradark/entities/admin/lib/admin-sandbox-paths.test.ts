import { describe, expect, it } from "vitest";

import { canonicalAdminSandboxPath } from "./admin-sandbox-paths";

describe("canonicalAdminSandboxPath", () => {
  it("maps /sandbox root", () => {
    expect(canonicalAdminSandboxPath("/sandbox")).toBe("/admin/sandbox");
  });

  it("maps nested paths", () => {
    expect(canonicalAdminSandboxPath("/sandbox/pug-system")).toBe(
      "/admin/sandbox/pug-system",
    );
  });

  it("leaves unrelated paths", () => {
    expect(canonicalAdminSandboxPath("/dashboard")).toBe("/dashboard");
  });
});
