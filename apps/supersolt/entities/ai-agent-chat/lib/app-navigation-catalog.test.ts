import { describe, expect, it } from "vitest";

import {
  APP_NAVIGATION_CATALOG,
  APP_NAVIGATION_DESTINATION_KEYS,
  isAppNavigationDestinationKey,
} from "./app-navigation-catalog";

describe("app-navigation-catalog", () => {
  it("keeps destination keys in sync with catalog entries", () => {
    for (const key of APP_NAVIGATION_DESTINATION_KEYS) {
      expect(APP_NAVIGATION_CATALOG[key].key).toBe(key);
    }
    expect(APP_NAVIGATION_DESTINATION_KEYS.length).toBe(
      Object.keys(APP_NAVIGATION_CATALOG).length,
    );
  });

  it("maps ingredients to the inventory-setup master list", () => {
    expect(APP_NAVIGATION_CATALOG.ingredients.pathSuffix).toBe(
      "/settings/inventory-setup/inventory/master-list",
    );
    expect(APP_NAVIGATION_CATALOG.ingredients.title.length).toBeGreaterThan(0);
  });

  it("narrows unknown strings via isAppNavigationDestinationKey", () => {
    expect(isAppNavigationDestinationKey("dashboard")).toBe(true);
    expect(isAppNavigationDestinationKey("ingredients")).toBe(true);
    expect(isAppNavigationDestinationKey("workforce_roster")).toBe(true);
    expect(isAppNavigationDestinationKey("recipes")).toBe(false);
  });
});
