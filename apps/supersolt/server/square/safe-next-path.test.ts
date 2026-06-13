import { describe, expect, it } from "vitest";
import { safeRelativeNextPath } from "./safe-next-path";

describe("safeRelativeNextPath", () => {
  it("returns null for null, undefined, or empty", () => {
    expect(safeRelativeNextPath(null)).toBeNull();
    expect(safeRelativeNextPath(undefined)).toBeNull();
    expect(safeRelativeNextPath("")).toBeNull();
    expect(safeRelativeNextPath("   ")).toBeNull();
  });

  it("accepts safe same-origin relative paths", () => {
    expect(safeRelativeNextPath("/dashboard")).toBe("/dashboard");
    expect(safeRelativeNextPath("/setup")).toBe("/setup");
    expect(safeRelativeNextPath("/auth/update-password")).toBe("/auth/update-password");
    expect(safeRelativeNextPath("/acme/venue-x/insights/sales")).toBe(
      "/acme/venue-x/insights/sales"
    );
  });

  it("trims whitespace", () => {
    expect(safeRelativeNextPath("  /dashboard  ")).toBe("/dashboard");
  });

  it("rejects protocol-relative and absolute URLs", () => {
    expect(safeRelativeNextPath("//evil.com")).toBeNull();
    expect(safeRelativeNextPath("/\\evil")).toBeNull();
  });

  it("rejects paths containing colon (scheme or port tricks)", () => {
    expect(safeRelativeNextPath("/foo:bar")).toBeNull();
    expect(safeRelativeNextPath("javascript:alert(1)")).toBeNull();
  });

  it("rejects paths without leading slash", () => {
    expect(safeRelativeNextPath("dashboard")).toBeNull();
  });

  it("rejects whitespace or newline in path", () => {
    expect(safeRelativeNextPath("/dash board")).toBeNull();
    expect(safeRelativeNextPath("/dash\nboard")).toBeNull();
  });

  it("accepts oauth bridge paths with query strings", () => {
    expect(
      safeRelativeNextPath("/setup/oauth-bridge?provider=square&step=3"),
    ).toBe("/setup/oauth-bridge?provider=square&step=3");
  });

  it("decodes once-encoded relative paths (legacy double-encoding)", () => {
    expect(
      safeRelativeNextPath(
        "%2Fsetup%2Foauth-bridge%3Fprovider%3Dsquare%26step%3D3",
      ),
    ).toBe("/setup/oauth-bridge?provider=square&step=3");
  });
});
