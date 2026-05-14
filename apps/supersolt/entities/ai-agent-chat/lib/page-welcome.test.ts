import { describe, expect, it } from "vitest";

import { buildPageWelcome } from "./page-welcome";

describe("buildPageWelcome", () => {
  it("returns dashboard headline and body for /dashboard", () => {
    const w = buildPageWelcome("/dashboard");
    expect(w).not.toBeNull();
    expect(w!.headline).toBe("Welcome to the Dashboard");
    expect(w!.body).toContain("high-level overview");
    expect(w!.suggestions.length).toBeGreaterThanOrEqual(2);
  });

  it("returns agent-specific welcome for /agent", () => {
    const w = buildPageWelcome("/agent");
    expect(w).not.toBeNull();
    expect(w!.headline).toBe("Welcome to Superbot");
  });

  it("uses catalog title for scoped catalog route", () => {
    const w = buildPageWelcome("/acme-cafe/richmond/catalog/items");
    expect(w).not.toBeNull();
    expect(w!.headline).toBe("Welcome to Items");
    expect(w!.body).toContain("Catalog items");
    expect(w!.suggestions).toHaveLength(3);
  });
});
