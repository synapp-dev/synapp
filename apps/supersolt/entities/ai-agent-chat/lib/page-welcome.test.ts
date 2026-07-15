import { describe, expect, it } from "vitest";

import { buildPageWelcome } from "./page-welcome";

describe("buildPageWelcome", () => {
  it("returns dashboard welcome for scoped dashboard route", () => {
    const w = buildPageWelcome("/acme/richmond/dashboard");
    expect(w).not.toBeNull();
    expect(w!.headline).toBe("Welcome to Dashboard");
    expect(w!.body).toContain("KPIs");
    expect(w!.suggestions.length).toBeGreaterThanOrEqual(2);
  });

  it("returns agent-specific welcome for scoped agent route", () => {
    const w = buildPageWelcome("/acme/richmond/agent");
    expect(w).not.toBeNull();
    expect(w!.headline).toBe("Welcome to Superbot");
  });

  it("uses catalog title for scoped recipes route", () => {
    const w = buildPageWelcome(
      "/acme-cafe/richmond/settings/inventory-setup/products/recipes",
    );
    expect(w).not.toBeNull();
    expect(w!.headline).toBe("Welcome to Items");
    expect(w!.body).toContain("Catalog items");
    expect(w!.suggestions).toHaveLength(3);
  });
});
